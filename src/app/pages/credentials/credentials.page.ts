import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule, ViewWillLeave } from '@ionic/angular';
import { StorageService } from 'src/app/services/storage.service';
import { BarcodeScannerComponent } from 'src/app/components/barcode-scanner/barcode-scanner.component';
import { QRCodeModule } from 'angularx-qrcode';
import { WalletService } from 'src/app/services/wallet.service';
import { VcViewComponent } from '../../components/vc-view/vc-view.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WebsocketService } from 'src/app/services/websocket.service';
import { VerifiableCredential } from 'src/app/interfaces/verifiable-credential';
import { VerifiableCredentialSubjectDataNormalizer } from 'src/app/interfaces/verifiable-credential-subject-data-normalizer';
import { CameraLogsService } from 'src/app/services/camera-logs.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ToastServiceHandler } from 'src/app/services/toast.service';
import { catchError, finalize, forkJoin, from, Observable, of, switchMap, tap } from 'rxjs';
import { ExtendedHttpErrorResponse } from 'src/app/interfaces/errors';
import { LoaderService } from 'src/app/services/loader.service';
import { getExtendedCredentialType, isValidCredentialType } from 'src/app/helpers/get-credential-type.helpers';


// TODO separate scan in another component/ page

@Component({
  selector: 'app-credentials',
  templateUrl: './credentials.page.html',
  styleUrls: ['./credentials.page.scss'],
  standalone: true,
  providers: [StorageService],
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    QRCodeModule,
    VcViewComponent,
    TranslateModule,
    BarcodeScannerComponent
  ]
})

// eslint-disable-next-line @angular-eslint/component-class-suffix
export class CredentialsPage implements OnInit, ViewWillLeave {
  public credList: Array<VerifiableCredential> = [];
  public showScannerView = false;
  public showScanner = false;
  public isFirstCredentialLoadCompleted = false;
  public credentialOfferUri = '';


  private readonly alertController = inject(AlertController);
  private readonly cameraLogsService = inject(CameraLogsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loader = inject(LoaderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastServiceHandler = inject(ToastServiceHandler);
  private readonly translate = inject(TranslateService);
  private readonly walletService = inject(WalletService);
  private readonly websocket = inject(WebsocketService);

  public constructor(){
    this.route.queryParams
      .pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.showScannerView = params['showScannerView'] === 'true';
        this.showScanner = params['showScanner']     === 'true';
        this.credentialOfferUri = params['credentialOfferUri'];
        this.cdr.detectChanges();
      });
  }

  public ngOnInit(): void {
    this.loadCredentials()
    .pipe(finalize(() => this.isFirstCredentialLoadCompleted = true))
    .subscribe();

    if (this.credentialOfferUri) {
      this.sameDeviceVcActivationFlow();
    }
  }

  public ionViewDidEnter(): void {
    this.requestPendingSignatures();
  }

  //this is needed to ensure the scanner is destroyed when leaving page. Ionic
  //caches the component (it isn't destroyed when leaving route), so ngOnDestroy won't work
  //here we don't use the navigation to update he view to avoid circularity
  public ionViewWillLeave(): void{
    this.showScannerView = false;
    this.showScanner = false;
    this.cdr.detectChanges();
  }

  public openScannerViewWithoutScanner(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        showScannerView: true
      },
      queryParamsHandling: 'merge'
    });
  }

  public closeScannerViewAndScanner(): void{
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        showScannerView: false,
        showScanner: false
      },
      queryParamsHandling: 'merge'
    });
  }

  public closeScanner(): void{
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        showScanner: false
      },
      queryParamsHandling: 'merge'
    });
  }

  public vcDelete(cred: VerifiableCredential): void {
    this.loader.addLoadingProcess();
    this.walletService.deleteVC(cred.id)
    .pipe(
      switchMap(() => this.loadCredentials()),
      finalize(() => this.loader.removeLoadingProcess())
    )
    .subscribe(() => {
      this.loader.removeLoadingProcess();
    });
  }

  public qrCodeEmit(qrCode: string): void {
    let executeContentSucessCallback: (arg: any) => Observable<any>;
    //todo don't accept qrs that are not to login or get VC
    if(qrCode.includes('credential_offer_uri')){
      //show VCs list
      this.closeScannerViewAndScanner();
      // CROSS-DEVICE CREDENTIAL OFFER FLOW
      executeContentSucessCallback = () => {   
        return this.handleActivationSuccess();
      }
    }else{
      // LOGIN / VERIFIABLE PRESENTATION
      // hide scanner but don't show VCs list
      this.closeScanner();
      this.loader.addLoadingProcess();
      executeContentSucessCallback = (executionResponse: JSON) => {
        return from(this.router.navigate(['/tabs/vc-selector/'], {
          queryParams: {
            executionResponse: JSON.stringify(executionResponse),
          },
        })).pipe(
          tap(() => { this.loader.removeLoadingProcess() })
        );
      }
    }
    this.websocket.connectPinSocket()
      .then(() => {
        this.loader.addLoadingProcess();
        this.walletService.executeContent(qrCode)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            switchMap((executionResponse) => {
                return executeContentSucessCallback(executionResponse);
              }),
            finalize(() => {
              this.loader.removeLoadingProcess();
              this.websocket.closePinConnection();
              if(qrCode.includes('credential_offer_uri')) this.websocket.closeNotificationConnection();
            }),
          ).subscribe({
              error: (error: ExtendedHttpErrorResponse) => {
                this.handleContentExecutionError(error);
              },
          });
      })
      .catch(err => {
        this.handleContentExecutionError(err)
      })
  }

  public sameDeviceVcActivationFlow(): void {
    this.websocket.connectPinSocket()
      .then(() => {
        console.info('Requesting Credential Offer via same-device flow.');
        this.walletService.requestOpenidCredentialOffer(this.credentialOfferUri).subscribe({
          next: () => {
            this.handleActivationSuccess().subscribe(() => {
              this.router.navigate(['/tabs/credentials']);
              this.websocket.closePinConnection();
            });
          },
          error: (err) => {
            console.error(err);
            this.websocket.closePinConnection();
          },
        });
      })
      .catch(err => {
          this.handleContentExecutionError(err)
      })
  }

  private async showTempOkMessage(): Promise<void> {
    const alert = await this.alertController.create({
      message: `
        <div style="display: flex; align-items: center; gap: 50px;">
          <ion-icon name="checkmark-circle-outline" ></ion-icon>
          <span>${this.translate.instant('home.ok-msg')}</span>
        </div>
      `,
      cssClass: 'custom-alert-ok',
    });

    await alert.present();

    setTimeout(async () => {
      await alert.dismiss();
    }, 2000);
  }

  private handleActivationSuccess(): Observable<VerifiableCredential[]> {
    this.loader.addLoadingProcess();

    return this.loadCredentials()
      .pipe(
        tap(() => {
          this.loader.removeLoadingProcess();
        })
      )
  }

  private loadCredentials(): Observable<VerifiableCredential[]> {
    // todo this conditional should be removed when scanner is moved to another page
    const isScannerOpen = this.isScannerOpen();
    if(!isScannerOpen){
      this.loader.addLoadingProcess();
    }

    const normalizer = new VerifiableCredentialSubjectDataNormalizer();
    return this.walletService.getAllVCs().pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((credentialListResponse: VerifiableCredential[]) => {
        // Iterate over the list and normalize each credentialSubject
        this.credList = credentialListResponse.slice().reverse().map(cred => {
          if (cred.credentialSubject && cred.type) {
            const credType = getExtendedCredentialType(cred);
            if(isValidCredentialType(credType)){
              cred.credentialSubject = normalizer.normalizeLearCredentialSubject(cred.credentialSubject, credType);
            }
          }
          return cred;
        });
        // todo avoid this
        this.cdr.detectChanges();
        if(!isScannerOpen){
          this.loader.removeLoadingProcess();
        }
      }),
      catchError((error: ExtendedHttpErrorResponse) => {
        if (error.status === 404) {
          this.credList = [];
          this.cdr.detectChanges();
        } else {
          console.error("Error fetching credentials:", error);
        }
        if(!isScannerOpen){
          this.loader.removeLoadingProcess();
        }
        return of([]);
      })
    )

  }

  private requestPendingSignatures(): void {
    if(this.credList.length === 0){
      return;
    }
    const pendingCredentials = this.credList.filter(
      (credential) => credential.lifeCycleStatus === 'ISSUED'
    );
    
    if (pendingCredentials.length === 0) {
      return;
    }
    
    console.log('Requesting signatures for pending credentials...');

    const requests = pendingCredentials.map((credential) =>
      this.walletService.requestSignature(credential.id).pipe(
        catchError((error) => {
          console.error(`Error signing credential ${credential.id}:`, error.message);
          return of({ status: 500 });
        })
      )
    );
  
    forkJoin(requests).subscribe({
      next: (responses: (HttpResponse<string> | { status: number })[]) => {
        const successfulResponses = responses.filter(response => response.status === 204);
    
        if (successfulResponses.length > 0) {
          console.log('Signed credentials:', successfulResponses.length);
          this.forcePageReload();
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Unexpected error in signature requests:', error.message);
        this.toastServiceHandler.showErrorAlert('ErrorUnsigned').subscribe();
      },
    });
  }

  private forcePageReload(): void {
    this.router.navigate(['/tabs/credentials']).then(() => {
      window.location.reload();
    });
  }

  private handleContentExecutionError(errorResponse: ExtendedHttpErrorResponse): void{
    const httpErr = errorResponse?.error;
    const message = httpErr?.message || errorResponse?.message || 'No error message';
    const title = httpErr?.title || errorResponse?.title || '(No title)';
    const path = httpErr?.path || errorResponse?.path || '(No path)';

    const error = title + ' . ' + message + ' . ' + path;
    this.cameraLogsService.addCameraLog(new Error(error), 'httpError');

    console.error(errorResponse);
    setTimeout(()=>{
      this.router.navigate(['/tabs/home'])
    }, 1000);
}

private isScannerOpen(): boolean{
  return this.showScanner === true && this.showScannerView === true;
}

}