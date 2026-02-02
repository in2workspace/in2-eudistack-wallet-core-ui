import { inject, Injectable } from '@angular/core';
import { AuthenticationService } from './authentication.service';
import { AlertController, AlertOptions } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { WEBSOCKET_NOTIFICATION_PATH, WEBSOCKET_PIN_PATH } from '../constants/api.constants';
import { LoaderService } from './loader.service';
import { ToastServiceHandler } from './toast.service';
import { isPinRequest, isNotificationRequest } from '../interfaces/websocket-data';

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
    if (isPinRequest(data)) {
      await this.handlePinRequest(data);
      return;
    }
    if (isNotificationRequest(data)) {
      await this.handleNotificationDecisionRequest(data);
    }
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
    let closedByUser = false;

    const counter = data.timeout || 80;

    const preview = data.credentialPreview;
    const subjectLabel = this.translate.instant('confirmation.holder');
    const organizationLabel = this.translate.instant('confirmation.organization');
    const powersLabel = this.translate.instant('confirmation.powers');
    const expirationLabel = this.translate.instant('confirmation.expiration');

    console.log('Credential Preview:', preview);


    let previewHtml = '';

    if (preview) {
      previewHtml = `
        <div class="cred-preview">
          <div class="cred-row">
            <span class="cred-label"><strong>${subjectLabel}</strong>${this.escapeHtml(preview.subjectName)}</span>
          </div>

          <div class="cred-row">
            <span class="cred-label"><strong>${organizationLabel}</strong>${this.escapeHtml(preview.organization)}</span>
          </div>

          <div class="cred-row">
            <span class="cred-label"><strong>${powersLabel}</strong>${this.mapPowersToHumanReadable(preview.power)}</span>
          </div>

          <div class="cred-row">
            <span class="cred-label"><strong>${expirationLabel}</strong>${this.formatDateHuman(preview.expirationDate)}</span>
          </div>
        </div>
      `;
    }

    const header = this.translate.instant('confirmation.new-credential-title');
    const accept = this.translate.instant('confirmation.accept');
    const reject = this.translate.instant('confirmation.cancel');

    const baseDescription = this.translate.instant('confirmation.new-credential');

    const descriptionWithPreview = previewHtml
      ? `${baseDescription}<br/>${previewHtml}`
      : baseDescription;
    const message = this.translate.instant('confirmation.messageHtml', {
      description: descriptionWithPreview,
      counter: counter,
    });

    let interval: any;

    const rejectHandler = async () => {
      closedByUser = true;
      clearInterval(interval);
      this.sendNotificationMessage(JSON.stringify({ decision: 'REJECTED' }));
      Promise.resolve().then(() => this.closeNotificationConnection());
      await this.showTempOkMessage('home.rejected-msg');      
      window.location.reload();
    };

    const acceptHandler = async () => {
      closedByUser = true;
      clearInterval(interval);
      this.sendNotificationMessage(JSON.stringify({ decision: 'ACCEPTED' }));
      Promise.resolve().then(() => this.closeNotificationConnection());
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
      clearInterval(interval);
      this.closeNotificationConnection();
      if(!closedByUser){
        this.toastServiceHandler
          .showErrorAlert("The QR session expired")
          .subscribe();        
        window.location.reload();
      }
      
    });
    interval = this.startCountdown(alert, descriptionWithPreview, counter);    
  }

  public mapPowersToHumanReadable(powers: Array<any>): string {
    console.log('Mapping powers:', powers);
    if (!Array.isArray(powers) || powers.length === 0) return '';

    const lines = powers
      .map((p) => {
        const fnKey = this.normalizeKey(p?.function);
        const actionKeys = this.normalizeActionKeys(p?.action);

        const functionLabel = this.translate.instant(`powers.function.${fnKey}`) || p?.function || '';
        const actionLabels = actionKeys
          .map((a) => this.translate.instant(`powers.action.${a}`) || a)
          .join(', ');

        const line = this.translate.instant('powers.format.line', {
          function: functionLabel,
          actions: actionLabels,
        });
        console.log('Mapped line:', line);

        return line?.trim();
      })
      .filter(Boolean);

    return lines.join('\n');
  }

  private normalizeKey(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private normalizeActionKeys(actions: unknown): string[] {
    if (!Array.isArray(actions)) return [];
    return actions
      .map((a) => this.normalizeKey(a))
      .filter(Boolean);
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

    }, 3000);
  }


  private formatDateHuman(dateStr: string): string {
    dateStr = this.escapeHtml(dateStr);
    const date = new Date(dateStr);

    return date.toLocaleDateString(
      this.translate.currentLang || 'es-ES',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    );
  }

  private escapeHtml(value: string): string {
    let s = String(value ?? '');

    if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
      s = s.slice(1, -1);
    }

    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
