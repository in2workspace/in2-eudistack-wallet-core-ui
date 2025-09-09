import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';
import { AlertController, ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class ToastServiceHandler {
  public constructor(
    private readonly translate: TranslateService,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController
  ) {}

  //todo use title instead of message
 public showErrorAlert(message: string): Observable<unknown> {
    let messageBody = "errors.default"
    if (message.startsWith("The received QR content cannot be processed")) {
      messageBody = "errors.invalid-qr";
    }
    if (message.startsWith("There are no credentials available to login")) {
      messageBody = "errors.no-credentials-available";
    }
    else if(message.startsWith('There was a problem processing the QR. It might be invalid or already have been used')){
      messageBody = "errors.failed-qr-process";
    }
    else if (message.startsWith("Error while fetching credentialOffer from the issuer")) {
      messageBody = "errors.expired-credentialOffer";
    }
    else if (message.startsWith("Error while deserializing CredentialOffer")) {
      messageBody = "errors.invalid-credentialOffer";
    }
    else if (message.startsWith("Error while processing Credential Issuer Metadata from the Issuer")) {
      messageBody = "errors.invalid-issuerMetadata";
    }
    else if (message.startsWith("Error while fetching  Credential from Issuer")) {
      messageBody = "errors.cannot-get-VC";
    }
    else if (message.startsWith("Error processing Verifiable Credential")) {
      messageBody = "errors.cannot-save-VC";
    }
    else if (message.startsWith("Incorrect PIN")) {
      messageBody = "errors.incorrect-pin";
    }else if (message.startsWith("Unsigned")) {
      messageBody = "errors.unsigned";
    }else if (message.startsWith("ErrorUnsigned")) {
      messageBody = "errors.Errunsigned";
    }else if(message.startsWith("PIN expired")){
      messageBody = "errors.pin-expired"
    }

    return this.showErrorAlertByTranslateLabel(messageBody);
  }

  public showErrorAlertByTranslateLabel(message: string){
    return this.translate.get(message).pipe(
      map(async (translatedMessage) => {
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
      })
    );
  }

  public showToast(messageKey: string, duration: number = 2000): void {
    this.alertController.create({
      message: `
        <div style="display: flex; align-items: center; gap: 50px;">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
          <span>${this.translate.instant(messageKey)}</span>
        </div>
      `,
      cssClass: 'custom-alert-ok',
    }).then(alert => {
      alert.present().then(() => {
        setTimeout(() => {
          alert.dismiss();
        }, duration);
      });
    });
  }



}