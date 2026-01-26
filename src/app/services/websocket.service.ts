import { inject, Injectable } from '@angular/core';
import { AuthenticationService } from './authentication.service';
import { AlertController, AlertOptions } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { WEBSOCKET_NOTIFICATION_PATH, WEBSOCKET_PIN_PATH } from '../constants/api.constants';
import { LoaderService } from './loader.service';
import { filter, Observable, of, Subject, switchMap, take, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private pinSocket?: WebSocket;
  private notificationSocket?: WebSocket;

  private loadingTimeout: any;

  pinMessages$ = new Subject<any>();

  public waitForPinApproved$(): Observable<void> {
    return this.pinMessages$.pipe(
      filter((msg: any) => typeof msg?.decision === 'boolean'),
      take(1),
      switchMap((msg: any) => {
        if (msg.decision === true) return of(void 0);
        return throwError(() => new Error('[PIN] Rejected by user'));
      })
    );
  }


  private readonly alertController = inject(AlertController);
  private readonly authenticationService = inject(AuthenticationService);
  public readonly loader = inject(LoaderService);
  public readonly translate = inject(TranslateService);

  public connectPinSocket(): Promise<void> {
    return this.connectSocket(
      WEBSOCKET_PIN_PATH,
      (data) => this.handlePinRequest(data),
      (ws) => (this.pinSocket = ws)
    );
  }

  public connectNotificationSocket(): Promise<void> {
    console.log("Xivato 1");
    return this.connectSocket(
      WEBSOCKET_NOTIFICATION_PATH,
      (data) => this.handleNotificationDecisionRequest(data),
      (ws) => (this.notificationSocket = ws)
    );
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

  private connectSocket(
    path: string,
    onParsedMessage: (data: any) => Promise<void>,
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
        console.log('Message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          await onParsedMessage(data);
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

  private sendMessage(socket: WebSocket | undefined, payload: string): void {
    console.log("Xivato 3");
    if (!socket) {
      console.error('WebSocket is not initialized.');
      return;
    }
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
      console.log("Xivato 4");
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

    const cancelHandler = () => clearInterval(interval);

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
    const counter = data.timeout || 60;

    const header = this.translate.instant('confirmation.new-credential-title');
    const accept = this.translate.instant('confirmation.accept');
    const reject = this.translate.instant('confirmation.cancel');

    const description = this.translate.instant('confirmation.new-credential');
    const message =
      this.translate.instant('credentials.acceptMessageHtml', { description, counter }) ||
      `${description}<br/><br/><b>${counter}</b>`;

    let interval: any;

    const rejectHandler = () => {
      clearInterval(interval);
      this.sendNotificationMessage(JSON.stringify({ decision: 'REJECTED' }));
    };

    const acceptHandler = () => {
      clearInterval(interval);
      this.sendNotificationMessage(JSON.stringify({ decision: 'ACCEPTED' }));
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
    interval = this.startCountdown(alert, description, counter);    
    await alert.present();
  }

}
