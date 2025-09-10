import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule } from '@ionic/angular';
import { QRCodeModule } from 'angularx-qrcode';
import { WalletService } from 'src/app/services/wallet.service';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { VcViewComponent } from '../../components/vc-view/vc-view.component';
import { VCReply } from 'src/app/interfaces/verifiable-credential-reply';
import { VerifiableCredential } from 'src/app/interfaces/verifiable-credential';
import { VerifiableCredentialSubjectDataNormalizer } from 'src/app/interfaces/verifiable-credential-subject-data-normalizer';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderService } from 'src/app/services/loader.service';
import { ToastServiceHandler } from 'src/app/services/toast.service';
import { getExtendedCredentialType, isValidCredentialType } from 'src/app/helpers/get-credential-type.helpers';

// todo: show only VCs with powers to login
// todo: if user has only one VC, use this directly
@Component({
  selector: 'app-vc-selector',
  templateUrl: './vc-selector.page.html',
  styleUrls: ['./vc-selector.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    QRCodeModule,
    TranslateModule,
    VcViewComponent,
  ],
})
export class VcSelectorPage {
  public isClick: boolean[] = [];
  public selCredList: VerifiableCredential[] = [];
  public credList: VerifiableCredential[] = [];
  public credDataList: VerifiableCredential[] = [];
  public size = 300;
  public executionResponse: any;
  public userName = '';
  public isAlertOpen = false;
  public errorAlertOpen = false;
  public sendCredentialAlert = false;

  public _VCReply: VCReply = {
    selectedVcList: [],
    state: '',
    nonce: '',
    redirectUri: '',
  };

  private readonly alertController = inject(AlertController);
  private readonly loader = inject(LoaderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastServiceHandler);
  private readonly translate = inject(TranslateService);
  private readonly walletService = inject(WalletService);


  public constructor() {
      this.route.queryParams.pipe(takeUntilDestroyed()).subscribe((params) => {
        this.getExecutionParamsFromQueryParams(params);
        this.formatCredList();
        this.resetIsClickList();
    });
  }

  public getExecutionParamsFromQueryParams(params: Params){
      console.log('updating params in vc-selector');
      this.executionResponse = JSON.parse(params['executionResponse']);
      this._VCReply.redirectUri = this.executionResponse['redirectUri'];
      this._VCReply.state = this.executionResponse['state'];
      this._VCReply.nonce = this.executionResponse['nonce'];
  }

  // Normalize each credential, updating its credentialSubject property
  public formatCredList(){
    this.loader.addLoadingProcess();

    console.log('[VC-selector: Formatting credentials list...');
    const unNormalizedCredList: VerifiableCredential[] = this.executionResponse['selectableVcList'];
    const normalizer = new VerifiableCredentialSubjectDataNormalizer();
    try{
      this.credList = [...unNormalizedCredList]
        .reverse()
        .filter(cred => cred.lifeCycleStatus === 'VALID')
        .map(cred => {
          if (cred.credentialSubject) {
            const credType = getExtendedCredentialType(cred);
            if(isValidCredentialType(credType)){
              cred.credentialSubject = normalizer.normalizeLearCredentialSubject(cred.credentialSubject, credType);
            }
          }
          return cred;
        });
    }catch(err){
      console.error('Error normalizing credential list.');
      console.error(err);
      this.toastService.showErrorAlertByTranslateLabel("errors.loading-VCs");
    }finally{
      this.loader.removeLoadingProcess();
    }
  }

  public resetIsClickList(){
    this.isClick = this.credList.map(() => false);
  }

  public isClicked(index: number) {
    return this.isClick[index];
  }

  public selectCred(cred: VerifiableCredential, index: number) {
    this.selCredList.push(cred);
    this.isClick[index] = !this.isClick[index];
  }

  public async sendCred(cred: VerifiableCredential) {

    const alert = await this.alertController.create({
      header: this.translate.instant('confirmation.header'),
      buttons: [
        {
          text: this.translate.instant('confirmation.cancel'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('confirmation.ok'),
          role: 'ok',
        },
      ],
    });

    await alert.present();
    const result = await alert.onDidDismiss();
    console.log(result);

    if (result.role === 'ok') {
      this.selCredList.push(cred);
      this._VCReply.selectedVcList = this.selCredList;
      this.loader.addLoadingProcess();
      this.walletService.executeVC(this._VCReply).subscribe({
        next: () => {
          this.loader.removeLoadingProcess();
          this.router.navigate(['/tabs/home']);
          this.okMessage();
        },
        error: err => {
          this.loader.removeLoadingProcess();
          this.handleError(err);
        },
        complete: () => {
          this.selCredList = [];
        },
      });
    }
  }

private async handleError(err: any) {
  console.error(err);
  await this.errorMessage(err.status);
  this.router.navigate(['/tabs/home']);
  this.selCredList = [];
}


  public async errorMessage(statusCode: number) {
    let messageText = '';

    if (statusCode >= 500) {
      // Handle server errors (50x)
      messageText = 'vc-selector.server-error-message';
    } else if (statusCode === 401) {
      // Handle unauthorized errors (401)
      messageText = 'vc-selector.unauthorized-message';
    } else if (statusCode === 403) {
      // Handle client errors (403x)
      messageText = 'vc-selector.credential-revoke-message';
    } else if (statusCode >= 400) {
      // Handle client errors (40x)
      messageText = 'vc-selector.bad-request-error-message';
    } else {
      // Handle other types of errors
      messageText = 'vc-selector.generic-error-message';
    }
    const translatedMessage = this.translate.instant(messageText);

    const alert = await this.alertController.create({
      message: `
        <div style="display: flex; align-items: center; gap: 50px;">
          <ion-icon name="alert-circle-outline"></ion-icon>
          <span>${translatedMessage}</span>
        </div>
      `,
      buttons: [
        {
          text: this.translate.instant('vc-selector.close'),
          role: 'ok',
          cssClass: 'centered-button',
        },
      ],
      cssClass: 'custom-alert-error',
    });

    await alert.present();
    await alert.onDidDismiss();
  }

  public async okMessage() {
    const alert = await this.alertController.create({
      message: `
        <div style="display: flex; align-items: center; gap: 50px;">
          <ion-icon name="checkmark-circle-outline" ></ion-icon>
          <span>${this.translate.instant('vc-selector.ok-header')}</span>
        </div>
      `,
      cssClass: 'custom-alert-ok-info',
    });

    await alert.present();

    setTimeout(async () => {
      await alert.dismiss();
    }, 2000);
  }

}
