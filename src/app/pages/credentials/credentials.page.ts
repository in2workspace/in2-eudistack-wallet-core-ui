import {ChangeDetectorRef, Component, DestroyRef, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {AlertController, IonicModule} from '@ionic/angular';
import {StorageService} from 'src/app/services/storage.service';
import {BarcodeScannerComponent} from 'src/app/components/barcode-scanner/barcode-scanner.component';
import {QRCodeModule} from 'angularx-qrcode';
import {WalletService} from 'src/app/services/wallet.service';
import {VcViewComponent} from '../../components/vc-view/vc-view.component';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {ActivatedRoute, Router} from '@angular/router';
import {WebsocketService} from 'src/app/services/websocket.service';
import {VerifiableCredential, CredentialStatus} from 'src/app/interfaces/verifiable-credential';
import {VerifiableCredentialSubjectDataNormalizer} from 'src/app/interfaces/verifiable-credential-subject-data-normalizer';
import {CameraLogsService} from 'src/app/services/camera-logs.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ToastServiceHandler } from 'src/app/services/toast.service';
import { catchError, forkJoin, of, tap } from 'rxjs';
import { ExtendedHttpErrorResponse } from 'src/app/interfaces/errors';


//todo avoid this constant
const TIME_IN_MS = 3000;

//TODO separate scan in another component

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
    BarcodeScannerComponent,
  ],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class CredentialsPage implements OnInit {
  public credList: Array<VerifiableCredential> = [];
  public showScannerView = false;
  public showScanner = false;
  public credentialOfferUri = '';

  private readonly alertController = inject(AlertController);
  private readonly cameraLogsService = inject(CameraLogsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastServiceHandler = inject(ToastServiceHandler);
  private readonly translate = inject(TranslateService);
  private readonly walletService = inject(WalletService);
  private readonly websocket = inject(WebsocketService);

  public constructor()
    {
    this.route.queryParams
      .pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.showScannerView = params['showScannerViewView'];
        this.showScanner = params['showScanner'];
        this.credentialOfferUri = params['credentialOfferUri'];
      });

  }

  public ngOnInit(): void {
    this.loadCredentials();

    if (this.credentialOfferUri) {
      this.sameDeviceVcActivationFlow();
    }
  }

  public ionViewDidEnter(): void {
    this.requestPendingSignatures();
  }

  public scan(): void {
    this.showScannerView = true;
    this.showScanner = true;
  }

  public vcDelete(cred: VerifiableCredential): void {
    this.walletService.deleteVC(cred.id).subscribe(() => {
      this.loadCredentials();
    });
  }

  public qrCodeEmit(qrCode: string): void {
    let executeContentSucessCallback;
    //todo don't accept qrs that are not to login or get VC
    if(qrCode.includes('credential_offer_uri')){
      //show VCs list
      this.showScannerView = false;
      // CROSS-DEVICE CREDENTIAL OFFER FLOW
      executeContentSucessCallback = () => {
        this.showScannerView = false;
        this.okMessage();
        this.successRefresh();
      }
    }else{
      // LOGIN / VERIFIABLE PRESENTATION
      // hide scanner but don't show VCs list
      this.showScanner = false;
      executeContentSucessCallback = (executionResponse: JSON) => {
        this.router.navigate(['/tabs/vc-selector/'], {
          queryParams: {
            executionResponse: JSON.stringify(executionResponse),
          },
        });
      }
    }
    this.websocket.connect()
      .then(() => {
          this.walletService.executeContent(qrCode)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            tap(() => { this.websocket.closeConnection(); })
          ).subscribe({
              next: (executionResponse) => {
                executeContentSucessCallback(executionResponse);
              },
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
    this.websocket.connect()
      .then(() => {
        console.info('Requesting Credential Offer via same-device flow.');
        this.walletService.requestOpenidCredentialOffer(this.credentialOfferUri).subscribe({
          next: () => {
            this.okMessage();
            this.successRefresh();
            this.websocket.closeConnection();
            this.router.navigate(['/tabs/credentials']);
          },
          error: (err) => {
            console.error(err);
            this.websocket.closeConnection();
          },
        });
      })
      .catch(err => {
          this.handleContentExecutionError(err)
      })
  }

  public handleScanButtonKeydown(event: KeyboardEvent, action: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      this.scan();
      event.preventDefault();
    }else{
      console.error('Unrecognized event');
    }
  }

  private async okMessage(): Promise<void> {
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
      this.loadCredentials();
    }, 2000);
  }

  private successRefresh(): void {
    setTimeout(() => {
      this.showScannerView = false;
    }, TIME_IN_MS);
    this.loadCredentials();
  }

    private loadCredentials(): void {
    const normalizer = new VerifiableCredentialSubjectDataNormalizer();
    this.walletService.getAllVCs().subscribe({
      next: (credentialListResponse: VerifiableCredential[]) => {
        // Iterate over the list and normalize each credentialSubject
        this.credList = credentialListResponse.slice().reverse().map(cred => {
          if (cred.credentialSubject) {
            cred.credentialSubject = normalizer.normalizeLearCredentialSubject(cred.credentialSubject);
          }
          return cred;
        });
        this.cdr.detectChanges()
      },
      error: (error) => {
        if (error.status === 404) {
          this.credList = [];
          this.cdr.detectChanges();
        } else {
          console.error("Error fetching credentials:", error);
        }
      }
    });
  }

    private requestPendingSignatures(): void {
    if(this.credList.length === 0){
      return;
    }
    console.log('Requesting signatures for pending credentials...');
    const pendingCredentials = this.credList.filter(
      (credential) => credential.status === CredentialStatus.ISSUED
    );
  
    if (pendingCredentials.length === 0) {
      return;
    }
  
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

}