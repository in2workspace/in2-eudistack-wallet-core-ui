import { inject, Injectable } from '@angular/core';
import { AuthenticationService } from './authentication.service';
import { AlertController, AlertOptions } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { WEBSOCKET_NOTIFICATION_PATH, WEBSOCKET_PIN_PATH } from '../constants/api.constants';
import { LoaderService } from './loader.service';
import { ToastServiceHandler } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private pinSocket?: WebSocket;
  private notificationSocket?: WebSocket;

  private loadingTimeout: any;

  private readonly alertController = inject(AlertController);
  private readonly authenticationService = inject(AuthenticationService);
  public readonly loader = inject(LoaderService);
  public readonly translate = inject(TranslateService);
  private readonly toastServiceHandler = inject(ToastServiceHandler);

  private async routeMessage(data: any): Promise<void> {
    if (data?.tx_code) {
      await this.handlePinRequest(data);
      return;
    }

    if (data?.decision != null) {
      await this.handleNotificationDecisionRequest(data);
      return;
    }

    console.log('[WS] Ignoring unknown message:', data);
  }

  private connectSocket(
    path: string,
    assignSocket: (ws: WebSocket) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(environment.websocket_url + path);
      assignSocket(ws);

      ws.onopen = () => {
        console.log(`WebSocket connection opened: ${path}`);
        this.sendMessage(ws, JSON.stringify({ id: this.authenticationService.getToken() }));
        resolve();
      };

      ws.onerror = (ev: Event) => {
        console.error(`WebSocket failed to open: ${path}`, ev);
        reject(new Error('Websocket error.'));
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          await this.routeMessage(data);
        } catch (e) {
          console.error(`WebSocket message parse/handle error: ${path}`, e, event.data);
        }
      };

      ws.onclose = () => {
        clearTimeout(this.loadingTimeout);
        this.loader.removeLoadingProcess();
        console.log(`WebSocket connection closed: ${path}`);
      };
    });
  }

  public connectPinSocket(): Promise<void> {
    return this.connectSocket(WEBSOCKET_PIN_PATH, (ws) => (this.pinSocket = ws));
  }

  public connectNotificationSocket(): Promise<void> {
    return this.connectSocket(WEBSOCKET_NOTIFICATION_PATH, (ws) => (this.notificationSocket = ws));
  }

  
  public closePinConnection(): void {
    this.safeClose(this.pinSocket);
    this.pinSocket = undefined;
  }

  public closeNotificationConnection(): void {
    this.safeClose(this.notificationSocket);
    this.notificationSocket = undefined;
  }
  
  public sendPinMessage(message: string): void {
    this.sendMessage(this.pinSocket, message);
  }

  public sendNotificationMessage(message: string): void {
    this.sendMessage(this.notificationSocket, message);
  }

  private sendMessage(socket: WebSocket | undefined, payload: string): void {
    if (!socket) {
      console.error('WebSocket is not initialized.');
      return;
    }
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    } else {
      console.error('WebSocket connection is not open.');
    }
  }

  private safeClose(socket?: WebSocket): void {
    try {
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close();
      }
    } catch (e) {
      console.warn('Error closing websocket', e);
    }
  }

  private startCountdown(
    alert: any,
    description: string,
    initialCounter: number
  ): number {
    let counter = initialCounter;
  
    const interval = window.setInterval(() => {

      if (counter > 0) {
        counter--;
        const message = this.translate.instant('confirmation.messageHtml', {
        description,
        counter,
    });
        alert.message = message;
      } else {
        window.clearInterval(interval);
        alert.dismiss();
      }
    }, 1000);
  
    return interval;
  }

  private async handlePinRequest(data: any): Promise<void> {    
    if (!data?.tx_code) {
      console.log('[PIN] Ignoring non-tx_code message:', data);
      return;
    }

    const description = this.translate.instant('confirmation.description');
    const counter = data.timeout || 60;

    let interval: any;

    const cancel = this.translate.instant('confirmation.cancel');
    const send = this.translate.instant('confirmation.send');
    const header = this.translate.instant('confirmation.pin');

    const message = this.translate.instant('confirmation.messageHtml', { description, counter });

    const cancelHandler = () => {
      clearInterval(interval);
    };

    const loadingTimeOutSendHandler = () => {
      this.loader.addLoadingProcess();
    };

    const sendHandler = (alertData: any) => {
      clearInterval(interval);
      this.loadingTimeout = setTimeout(loadingTimeOutSendHandler, 1000);
      this.sendPinMessage(JSON.stringify({ pin: alertData.pin }));
    };

    const alertOptions: AlertOptions = {
      header,
      message,
      inputs: [
        {
          name: 'pin',
          type: 'text',
          placeholder: 'PIN',
          attributes: {
            inputmode: 'numeric',
            pattern: '[0-9]*',
          },
        },
      ],
      buttons: [
        { text: cancel, role: 'cancel', handler: cancelHandler },
        { text: send, handler: sendHandler },
      ],
      backdropDismiss: false,
    };

    const alert = await this.alertController.create(alertOptions);
    interval = this.startCountdown(alert, description, counter);
    await alert.present();
  }

  private async handleNotificationDecisionRequest(data: any): Promise<void> {
    if (!data?.decision) {
      console.log('[NOTIFICATION] Ignoring non-decision message:', data);
      return;
    }
    let closedByUser = false;

    const timeoutSeconds = data.timeout || 60;

    const preview = data.credentialPreview;
    const expiresAt =
    typeof data.expiresAt === 'number'
      ? data.expiresAt
      : Date.now() + timeoutSeconds * 1000;
    
    const initialCounter = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

    const previewHtml = preview
    ? `
      <div style="margin-top:10px">
        <ul role="list" style="padding:0; margin:0; display:flex; flex-direction:column; gap:10px;">
          ${preview.subjectName ? `
            <li role="listitem">
              <div><strong>Titular:</strong> ${this.escapeHtml(preview.subjectName)}</div>
            </li>
          ` : ''}

          ${preview.organization ? `
            <li role="listitem">
              <div><strong>Organización:</strong> ${this.escapeHtml(preview.organization)}</div>
            </li>
          ` : ''}

          ${preview.issuer ? `
            <li role="listitem">
              <div><strong>Emisor:</strong> ${this.escapeHtml(preview.issuer)}</div>
            </li>
          ` : ''}

          ${preview.expirationDate ? `
            <li role="listitem">
              <div><strong>Expira:</strong> ${this.formatDateHuman(preview.expirationDate)}</div>
            </li>
          ` : ''}
        </ul>
      </div>
    `
    : '';


    const header = this.translate.instant('confirmation.new-credential-title');
    const accept = this.translate.instant('confirmation.accept');
    const reject = this.translate.instant('confirmation.cancel');

    const baseDescription = this.translate.instant('confirmation.new-credential');

    const descriptionWithPreview = previewHtml
      ? `${baseDescription}<br/>${previewHtml}`
      : baseDescription;
    const message = this.translate.instant('confirmation.messageHtml', {
      description: descriptionWithPreview,
      counter: initialCounter,
    });

    let interval: any;

    const rejectHandler = async () => {
      closedByUser = true;
      clearInterval(interval);
      this.sendNotificationMessage(JSON.stringify({ decision: 'REJECTED' }));
      this.closeNotificationConnection();
      await this.showTempOkMessage('home.rejected-msg');
    };

    const acceptHandler = async () => {
      closedByUser = true;
      clearInterval(interval);
      this.sendNotificationMessage(JSON.stringify({ decision: 'ACCEPTED' }));
      this.closeNotificationConnection();
      await this.showTempOkMessage('home.ok-msg');
    };

    const alertOptions: AlertOptions = {
      header,
      message,
      buttons: [
        { text: reject, role: 'cancel', handler: rejectHandler },
        { text: accept, role: 'confirm', handler: acceptHandler },
      ],
      backdropDismiss: false,
    };

    const alert = await this.alertController.create(alertOptions);
    await alert.present();
    alert.onDidDismiss().then(() => {
      this.closeNotificationConnection();
      if(!closedByUser){
        this.toastServiceHandler
          .showErrorAlert("The QR session expired")
          .subscribe();
      }
      
    });
    const counterReal = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    interval = this.startCountdown(alert, descriptionWithPreview, counterReal);    
  }

  private async showTempOkMessage(message: string): Promise<void> {
    const alert = await this.alertController.create({
      message: `
        <div style="display: flex; align-items: center; gap: 50px;">
          <ion-icon name="checkmark-circle-outline" ></ion-icon>
          <span>${this.translate.instant(message)}</span>
        </div>
      `,
      cssClass: 'custom-alert-ok',
    });

    await alert.present();

    setTimeout(async () => {
      await alert.dismiss();

    }, 2000);
  }


  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatDateHuman(dateStr: string): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return this.escapeHtml(dateStr);
    }

    return date.toLocaleDateString(
      this.translate.currentLang || 'es-ES',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    );
  }

}
