import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { WebsocketService } from './websocket.service';
import { AuthenticationService } from './authentication.service';
import { AlertController } from '@ionic/angular';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { WEBSOCKET_PIN_PATH } from '../constants/api.constants';
import { LoaderService } from './loader.service';


//todo mock broadcast channel

let alertControllerMock: any;
let mockWebSocketInstance: any;
let mockWebSocketConstructor: any;
let originalWebSocket: any;
let service: WebsocketService;

class MockAlertController {
  create() {
    return Promise.resolve({
      present: () => Promise.resolve(),
      onDidDismiss: () => Promise.resolve({ data: { values: { pin: '1234' } } }),
    });
  }
}

const translateMock = {
  instant: jest.fn((key: string, params?: any) => {
    switch (key) {
      case 'confirmation.pin':
        return 'confirmation.pin'; 
      case 'confirmation.cancel':
        return 'Cancel';
      case 'confirmation.send':
        return 'Send';
      case 'confirmation.description':
        return 'A PIN has been sent';
      case 'confirmation.messageHtml':
        return `${params?.description ?? ''}<br><small class="counter">Time remaining: ${params?.counter ?? 0} seconds</small>`;
      default:
        return key;
    }
  }),
};

describe('WebsocketService', () => {
  let mockAuthService: any;

  beforeEach(() => {
    mockAuthService = {
      getToken: jest.fn().mockReturnValue('fake-token')
    }

    alertControllerMock = {
      create: jest.fn().mockResolvedValue({
        present: jest.fn(),
        buttons: [
          {
            text: 'Send',
            handler: jest.fn(),
          },
        ],
      }),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        WebsocketService,
        LoaderService,
        { provide: AuthenticationService, useValue: mockAuthService },
        { provide: AlertController, useValue: alertControllerMock },
        { provide: TranslateService, useValue: translateMock }
      ],
    });

    service = TestBed.inject(WebsocketService);

    mockWebSocketInstance = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1,
      onmessage: jest.fn(),
      onclose: jest.fn(),
      onopen: jest.fn(),
    } as any;

    mockWebSocketConstructor = jest.fn(() => mockWebSocketInstance);
    mockWebSocketConstructor['OPEN'] = 1;
    window['WebSocket'] = mockWebSocketConstructor as any;

    originalWebSocket = window['WebSocket'];
    jest.spyOn(service, 'sendPinMessage');
  });

  afterEach(() => {
    service.closePinConnection();
    window['WebSocket'] = originalWebSocket;
    jest.clearAllMocks();
  });

  it('should create and open a WebSocket connection', fakeAsync(() => {
    service.connectPinSocket();
    expect(window.WebSocket).toHaveBeenCalledWith(`${environment.websocket_url}${WEBSOCKET_PIN_PATH}`);
    expect(service.sendPinMessage).not.toHaveBeenCalled();
  }));

  it('should send a message when WebSocket is open', fakeAsync(() => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const token = service['authenticationService'].getToken();
    service.connectPinSocket();
    
    mockWebSocketInstance.onopen('open');
    expect(service.sendPinMessage).toHaveBeenCalled();
    expect(service.sendPinMessage).toHaveBeenCalledWith(JSON.stringify({ id: token }));
    expect(logSpy).toHaveBeenCalledWith('WebSocket connection opened');
  }));

  it('should handle incoming messages', fakeAsync(() => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const createAlertSpy = jest.spyOn(service['alertController'], 'create');
    service.connectPinSocket();

    const messageEvent = new MessageEvent('message', { data: JSON.stringify({ tx_code: { description: 'Test description' } }) });
    
    mockWebSocketInstance.onmessage(messageEvent);
    expect(createAlertSpy).toHaveBeenCalled();
  }));

  it('rejects the connect promise when WebSocket errors', () => {
  const connectPromise = service.connectPinSocket();

  const err = new Error('WebSocket failed to open');
  mockWebSocketInstance.onerror(err);

  return expect(connectPromise).rejects.toEqual(new Error('Websocket error.'));
});


  it('should create and display an alert on receiving a message', fakeAsync(async () => {
    const createAlertSpy = jest.spyOn(service['alertController'], 'create');
    const timeout = 120;
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify({ tx_code: { }, timeout }),
    });

    service.connectPinSocket();

    mockWebSocketInstance.onmessage(messageEvent);
  
    tick();
    expect(createAlertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        header: service['translate'].instant('confirmation.pin'),
        message: `A PIN has been sent<br><small class="counter">Time remaining: ${timeout} seconds</small>`,
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
            handler: expect.any(Function),
          },
          {
            text: 'Send',
            handler: expect.any(Function),
          },
        ],
      })
    );
    tick();
  }));

  it('should log message on WebSocket close', fakeAsync(() => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    service.connectPinSocket();

    mockWebSocketInstance.onclose(new CloseEvent('close'));
    expect(logSpy).toHaveBeenCalledWith('WebSocket connection closed: /api/v1/pin');
  }));

  it('should send a message', fakeAsync(() => {
    (service as any)['pinSocket'] = mockWebSocketInstance;
    
    service.sendPinMessage('Test Message');

    expect((service as any)['pinSocket'].send).toHaveBeenCalledWith('Test Message');
    expect((service as any)['pinSocket'].send).toHaveBeenCalledTimes(1);

    const logErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (service as any)['pinSocket'] = { ...mockWebSocketInstance, readyState: 999 };

    service.sendPinMessage('Test Message 2');

    expect((service as any)['pinSocket'].send).toHaveBeenCalledTimes(1);
    expect(logErrorSpy).toHaveBeenCalledWith('WebSocket connection is not open.');

  }));

  it('should close WebSocket connection', () => {
    service.connectPinSocket();

    service.closePinConnection();

    expect((service as any)['pinSocket'].closePinConnection).toHaveBeenCalledTimes(1);
  });

  it('hauria de cridar setInterval', () => {
    (service as any)['pinSocket'] = mockWebSocketInstance;
    const alertMock = { message: '', dismiss: jest.fn() };
    const description = 'Test description';
    const initialCounter = 3;
  
    jest.useFakeTimers();
  
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
  
    service['startCountdown'](alertMock, description, initialCounter);
  
    expect(setIntervalSpy).toHaveBeenCalled();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
  
    setIntervalSpy.mockRestore();
  });
  
  it('should decrement counter and update counter in alert', () => {
    (service as any)['pinSocket'] = mockWebSocketInstance;
    const alertMock = { message: '', dismiss: jest.fn() };
    const description = 'Test description';
    const initialCounter = 3;
  

    jest.useFakeTimers();

    jest.spyOn(alertMock, 'dismiss');
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
  
    service['startCountdown'](alertMock, description, initialCounter);
  
    jest.advanceTimersByTime(1000); 
    expect(alertMock.message).toContain('Time remaining: 2 seconds');
  
    jest.advanceTimersByTime(1000);
    expect(alertMock.message).toContain('Time remaining: 1 seconds');
  
    jest.advanceTimersByTime(2000); 
    expect(alertMock.dismiss).toHaveBeenCalled();

    expect(clearIntervalSpy).toHaveBeenCalled();
  
    jest.clearAllTimers();
    clearIntervalSpy.mockRestore();
  });
  

});
