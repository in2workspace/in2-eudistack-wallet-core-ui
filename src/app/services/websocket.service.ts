import { inject, Injectable } from '@angular/core';
import { AuthenticationService } from './authentication.service';
import { BehaviorSubject } from 'rxjs';
import { AlertController, AlertOptions } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { WEBSOCKET_PATH } from '../constants/api.constants';
import { LoaderService } from './loader.service';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private messageSubject = new BehaviorSubject<string>('');
  private socket!: WebSocket;

  private loadingTimeout: any;

  private readonly alertController = inject(AlertController);
  private readonly authenticationService = inject(AuthenticationService);
  public readonly loader = inject(LoaderService);
  public readonly translate = inject(TranslateService);


  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(
        environment.websocket_url + WEBSOCKET_PATH
      );
    
      // ON OPEN
      this.socket.onopen = () => {
        console.log('WebSocket connection opened');
        this.sendMessage(
          JSON.stringify({ id: this.authenticationService.getToken() })
        );
        resolve();
      };
      
      // ON ERROR
      this.socket.onerror = (ev: Event) => {
        console.error('WebSocket failed to open');
        console.error(ev);
        reject(new Error('Websocket error.'));
      };
    
      // ON MESSAGE
      this.socket.onmessage = async (event) => {
        console.log('Message received:', event.data);
        const data = JSON.parse(event.data);
    
        let description = data.tx_code?.description || '';
        let counter = data.timeout || 60;
    
        const cancelHandler = () => {
          clearInterval(interval);
        };
        const loadingTimeOutSendHandler = () => {
          this.loader.addLoadingProcess();
        };
        const sendHandler = (alertData: any) => {
          clearInterval(interval);
          this.loadingTimeout = setTimeout(loadingTimeOutSendHandler, 1000);
          this.sendMessage(JSON.stringify({ pin: alertData.pin }));
        }
        const alertOptions: AlertOptions = {
          header: this.translate.instant('confirmation.pin'),
          message: `${description}<br><small class="counter">Time remaining: ${counter} seconds</small>`,
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
            {
              text: 'Cancel',
              role: 'cancel',
              handler: cancelHandler,
            },
            {
              text: 'Send',
              handler: sendHandler,
            },
          ],
          backdropDismiss: false,
        };
        
        const alert = await this.alertController.create(alertOptions);
    
        const interval = this.startCountdown(alert, description, counter);
    
        await alert.present();
      };
    
      // ON CLOSE
      this.socket.onclose = () => {
        clearTimeout(this.loadingTimeout);
        this.loader.removeLoadingProcess();
        console.log('WebSocket connection closed');
      };
    });
  }
  
  public sendMessage(message: string): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      console.error('WebSocket connection is not open.');
    }
  }

  public closeConnection(): void {
    this.socket.close();
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
        alert.message = `${description}<br><small class="counter">Time remaining: ${counter} seconds</small>`;
      } else {
        window.clearInterval(interval);
        alert.dismiss();
      }
    }, 1000);
  
    return interval;
  }
  
}
