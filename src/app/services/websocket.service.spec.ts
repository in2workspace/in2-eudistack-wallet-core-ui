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
let mockPinWebSocketInstance: any;
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
    originalWebSocket = window['WebSocket'];
    
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

    mockPinWebSocketInstance = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1,
      onmessage: jest.fn(),
      onclose: jest.fn(),
      onopen: jest.fn(),
    } as any;

     mockWebSocketConstructor = jest.fn(() => mockPinWebSocketInstance);
    (mockWebSocketConstructor as any).OPEN = 1;
    (mockWebSocketConstructor as any).CLOSED = 3;

    window['WebSocket'] = mockWebSocketConstructor as any;

    service = TestBed.inject(WebsocketService);
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
    mockPinWebSocketInstance.onopen();

    expect(mockPinWebSocketInstance.send).toHaveBeenCalledTimes(1);
    expect(mockPinWebSocketInstance.send).toHaveBeenCalledWith(
      JSON.stringify({ id: token })
    );

    expect(logSpy).toHaveBeenCalledWith('WebSocket connection opened: /api/v1/pin');
  }));


  it('should handle incoming messages', fakeAsync(() => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const createAlertSpy = jest.spyOn(service['alertController'], 'create');
    service.connectPinSocket();

    const messageEvent = new MessageEvent('message', { data: JSON.stringify({ tx_code: { description: 'Test description' } }) });
    
    mockPinWebSocketInstance.onmessage(messageEvent);
    expect(createAlertSpy).toHaveBeenCalled();
  }));

  it('rejects the connect promise when WebSocket errors', () => {
  const connectPromise = service.connectPinSocket();

  const err = new Error('WebSocket failed to open');
  mockPinWebSocketInstance.onerror(err);

  return expect(connectPromise).rejects.toEqual(new Error('Websocket error.'));
});


  it('should create and display an alert on receiving a message', fakeAsync(async () => {
    const createAlertSpy = jest.spyOn(service['alertController'], 'create');
    const timeout = 120;
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify({ tx_code: { }, timeout }),
    });

    service.connectPinSocket();

    mockPinWebSocketInstance.onmessage(messageEvent);
  
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

    mockPinWebSocketInstance.onclose(new CloseEvent('close'));
    expect(logSpy).toHaveBeenCalledWith('WebSocket connection closed: /api/v1/pin');
  }));

  it('should send a message', fakeAsync(() => {
    (service as any)['pinSocket'] = mockPinWebSocketInstance;
    
    service.sendPinMessage('Test Message');

    expect((service as any)['pinSocket'].send).toHaveBeenCalledWith('Test Message');
    expect((service as any)['pinSocket'].send).toHaveBeenCalledTimes(1);

    const logErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (service as any)['pinSocket'] = { ...mockPinWebSocketInstance, readyState: 999 };

    service.sendPinMessage('Test Message 2');

    expect((service as any)['pinSocket'].send).toHaveBeenCalledTimes(1);
    expect(logErrorSpy).toHaveBeenCalledWith('WebSocket connection is not open.');

  }));

  it('should close WebSocket connection', () => {
    service.connectPinSocket();

    const ws = (service as any)['pinSocket']; // guarda referencia antes de que se ponga undefined
    service.closePinConnection();

    expect(ws.close).toHaveBeenCalledTimes(1);
    expect((service as any)['pinSocket']).toBeUndefined();
  });


  it('hauria de cridar setInterval', () => {
    (service as any)['pinSocket'] = mockPinWebSocketInstance;
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
    (service as any)['pinSocket'] = mockPinWebSocketInstance;
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

  it('should create and open a notification WebSocket connection', fakeAsync(() => {
    service.connectNotificationSocket();
    expect(window.WebSocket).toHaveBeenCalledWith(`${environment.websocket_url}/api/v1/notification`);
  }));

  it('should send a message when notification WebSocket is open', fakeAsync(() => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const token = service['authenticationService'].getToken();

    let notificationSocket: any;

    mockWebSocketConstructor = jest.fn(() => {
      notificationSocket = {
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
        onopen: undefined,
        onmessage: undefined,
        onclose: undefined,
        onerror: undefined,
      };
      return notificationSocket;
    });

    (mockWebSocketConstructor as any).OPEN = 1;
    (mockWebSocketConstructor as any).CLOSED = 3;

    window['WebSocket'] = mockWebSocketConstructor as any;

    service.connectNotificationSocket();
    notificationSocket.onopen();

    expect(notificationSocket.send).toHaveBeenCalledTimes(1);
    expect(notificationSocket.send).toHaveBeenCalledWith(JSON.stringify({ id: token }));
    expect(logSpy).toHaveBeenCalledWith('WebSocket connection opened: /api/v1/notification');
  }));

  it('should not send message when notification socket is undefined', fakeAsync(() => {
    const logErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    service.sendNotificationMessage('Test');
    
    expect(logErrorSpy).toHaveBeenCalledWith('WebSocket is not initialized.');
  }));

  it('should send authentication token on notification socket open', fakeAsync(() => {
    let notificationSocket: any;
    const token = 'fake-token';

    mockWebSocketConstructor = jest.fn(() => {
      notificationSocket = {
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
        onopen: undefined,
        onmessage: undefined,
        onclose: undefined,
        onerror: undefined,
      };
      return notificationSocket;
    });

    (mockWebSocketConstructor as any).OPEN = 1;
    (mockWebSocketConstructor as any).CLOSED = 3;

    window['WebSocket'] = mockWebSocketConstructor as any;

    service.connectNotificationSocket();
    notificationSocket.onopen();

    expect(notificationSocket.send).toHaveBeenCalledTimes(1);
    expect(notificationSocket.send).toHaveBeenCalledWith(JSON.stringify({ id: token }));
  }));


  it('should handle pin socket connection with proper token', fakeAsync(() => {
    const token = service['authenticationService'].getToken();
    
    service.connectPinSocket();
    mockPinWebSocketInstance.onopen();

    expect(mockPinWebSocketInstance.send).toHaveBeenCalledWith(JSON.stringify({ id: token }));
    expect(mockPinWebSocketInstance.send).toHaveBeenCalledTimes(1);
  }));

  it('should handle notification decision messages', fakeAsync(() => {
    const createAlertSpy = jest.spyOn(service['alertController'], 'create');
    service.connectNotificationSocket();

    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify({ decision: 'ACCEPT', timeout: 60 }),
    });

    mockPinWebSocketInstance.onmessage(messageEvent);
    tick();
    expect(createAlertSpy).toHaveBeenCalled();
  }));

  it('should send notification message', fakeAsync(() => {
    (service as any)['notificationSocket'] = mockPinWebSocketInstance;
    jest.spyOn(service, 'sendNotificationMessage');

    service.sendNotificationMessage('Test Notification');

    expect((service as any)['notificationSocket'].send).toHaveBeenCalledWith('Test Notification');
  }));

  it('should close notification connection', () => {
    service.connectNotificationSocket();

    const ws = (service as any)['notificationSocket'];
    service.closeNotificationConnection();

    expect(ws.close).toHaveBeenCalledTimes(1);
    expect((service as any)['notificationSocket']).toBeUndefined();
  });

  it('should display notification alert with credential preview', fakeAsync(() => {
    const createAlertSpy = jest.spyOn(service['alertController'], 'create');
    const translateMockExtended = {
      ...translateMock,
      instant: jest.fn((key: string, params?: any) => {
        if (key === 'confirmation.new-credential-title') return 'New Credential';
        if (key === 'confirmation.accept') return 'Accept';
        if (key === 'confirmation.new-credential') return 'A new credential has been received';
        return translateMock.instant(key, params);
      }),
      currentLang: 'en',
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        WebsocketService,
        LoaderService,
        { provide: AuthenticationService, useValue: mockAuthService },
        { provide: AlertController, useValue: alertControllerMock },
        { provide: TranslateService, useValue: translateMockExtended },
      ],
    });

    service = TestBed.inject(WebsocketService);
    service.connectNotificationSocket();

    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify({
        decision: 'ACCEPT',
        timeout: 60,
        credentialPreview: {
          subjectName: 'John Doe',
          organization: 'Test Org',
          issuer: 'Test Issuer',
          expirationDate: '2025-12-31',
        },
      }),
    });

    mockPinWebSocketInstance.onmessage(messageEvent);
    tick();
    expect(createAlertSpy).toHaveBeenCalled();
  }));
  

});
