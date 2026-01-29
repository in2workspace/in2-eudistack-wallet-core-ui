import { TestBed, fakeAsync, tick, flush, flushMicrotasks } from '@angular/core/testing';
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
        present: jest.fn(() => Promise.resolve()),
        dismiss: jest.fn(() => Promise.resolve()),
        onDidDismiss: jest.fn(() => Promise.resolve()),
        buttons: [
          { text: 'Send', handler: jest.fn() },
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
    jest.useRealTimers();
    jest.clearAllTimers();
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


  it('hauria de cridar setInterval', fakeAsync(() => {
    const alertMock = { message: '', dismiss: jest.fn() };
    const description = 'Test description';

    const setIntervalSpy = jest.spyOn(window, 'setInterval');

    const intervalId = service['startCountdown'](alertMock, description, 3);

    expect(setIntervalSpy).toHaveBeenCalled();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    clearInterval(intervalId);

    setIntervalSpy.mockRestore();
  }));
  
  it('should decrement counter and update counter in alert', fakeAsync(() => {
    const alertMock = { message: '', dismiss: jest.fn() };
    const description = 'Test description';

    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

    service['startCountdown'](alertMock, description, 3);

    tick(1000);
    expect(alertMock.message).toContain('Time remaining: 2 seconds');

    tick(1000);
    expect(alertMock.message).toContain('Time remaining: 1 seconds');

    tick(2000);
    expect(alertMock.dismiss).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  }));


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

  it('should format date in human readable format', () => {
    const dateStr = '2025-12-31';
    const result = service['formatDateHuman'](dateStr);
    
    expect(result).toBeTruthy();
    expect(result).toMatch(/\d{1,2}/);
  });

  it('should handle WebSocket message parsing error gracefully', fakeAsync(() => {
    const logErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    service.connectPinSocket();

    const invalidMessageEvent = new MessageEvent('message', {
      data: 'invalid json {',
    });

    mockPinWebSocketInstance.onmessage(invalidMessageEvent);
    tick();

    expect(logErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('WebSocket message parse/handle error'),
      expect.any(Error),
      'invalid json {'
    );
  }));

  it('should safely close WebSocket even if error occurs', () => {
    const mockSocketWithError = {
      readyState: 1,
      close: jest.fn(() => {
        throw new Error('Close error');
      }),
    };

    const logWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    service['safeClose'](mockSocketWithError as any);

    expect(logWarnSpy).toHaveBeenCalledWith('Error closing websocket', expect.any(Error));
  });

  it('should not attempt to close already closed WebSocket', () => {
    const mockClosedSocket = {
      readyState: 3,
      close: jest.fn(),
    };

    service['safeClose'](mockClosedSocket as any);

    expect(mockClosedSocket.close).not.toHaveBeenCalled();
  });

  it('should clear countdown interval when cancel button handler is executed', fakeAsync(() => {
    // Arrange
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

    alertControllerMock.create.mockResolvedValue({
      present: jest.fn(() => Promise.resolve()),
      dismiss: jest.fn(() => Promise.resolve()),
      onDidDismiss: jest.fn(() => Promise.resolve()),
    });

    service.connectPinSocket();

    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify({ tx_code: {}, timeout: 3 }),
    });

    mockPinWebSocketInstance.onmessage(messageEvent);

    flushMicrotasks();
    flushMicrotasks();

    const alertOptions = alertControllerMock.create.mock.calls[0][0];
    const cancelBtn = alertOptions.buttons.find((b: any) => b.role === 'cancel');

    cancelBtn.handler();

    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  }));

  it('should send pin, clear interval, and add loading process after 1s when send handler is executed', fakeAsync(() => {

    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

    const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
    const addLoadingSpy = jest.spyOn(service.loader, 'addLoadingProcess');

    const sendPinSpy = jest.spyOn(service, 'sendPinMessage');

    alertControllerMock.create.mockResolvedValue({
      present: jest.fn(() => Promise.resolve()),
      dismiss: jest.fn(() => Promise.resolve()),
      onDidDismiss: jest.fn(() => Promise.resolve()),
    });

    service.connectPinSocket();

    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify({ tx_code: {}, timeout: 3 }),
    });

    mockPinWebSocketInstance.onmessage(messageEvent);

    flushMicrotasks();
    flushMicrotasks();

    const alertOptions = alertControllerMock.create.mock.calls[0][0];
    const sendBtn = alertOptions.buttons.find((b: any) => b.text === 'Send');

    sendBtn.handler({ pin: '1234' });

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(sendPinSpy).toHaveBeenCalledWith(JSON.stringify({ pin: '1234' }));

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    expect(addLoadingSpy).not.toHaveBeenCalled();

    tick(1000);
    expect(addLoadingSpy).toHaveBeenCalledTimes(1);

    clearIntervalSpy.mockRestore();
    setTimeoutSpy.mockRestore();
  }));

  it('should REJECT notification: clear interval, send message, close socket and show rejected ok message', fakeAsync(() => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

    const sendNotifSpy = jest.spyOn(service, 'sendNotificationMessage');
    const closeNotifSpy = jest.spyOn(service, 'closeNotificationConnection');
    const showTempSpy = jest
      .spyOn(service as any, 'showTempOkMessage')
      .mockResolvedValue(undefined);

    const mockAlert = {
      present: jest.fn(() => Promise.resolve()),
      onDidDismiss: jest.fn(() => Promise.resolve()),
      dismiss: jest.fn(() => Promise.resolve()),
    };
    alertControllerMock.create.mockResolvedValue(mockAlert);

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

    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify({ decision: 'ANY', timeout: 60 }),
    });
    notificationSocket.onmessage(messageEvent);

    flushMicrotasks();
    flushMicrotasks();

    const alertOptions = alertControllerMock.create.mock.calls[0][0];
    const rejectBtn = alertOptions.buttons.find((b: any) => b.role === 'cancel');

    rejectBtn.handler();
  
    flushMicrotasks();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(sendNotifSpy).toHaveBeenCalledWith(JSON.stringify({ decision: 'REJECTED' }));
    expect(closeNotifSpy).toHaveBeenCalledTimes(1);
    expect(showTempSpy).toHaveBeenCalledWith('home.rejected-msg');

    clearIntervalSpy.mockRestore();
  }));

  it('should ACCEPT notification: clear interval, send message, close socket and show ok message', fakeAsync(() => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

    const sendNotifSpy = jest.spyOn(service, 'sendNotificationMessage');
    const closeNotifSpy = jest.spyOn(service, 'closeNotificationConnection');
    const showTempSpy = jest
      .spyOn(service as any, 'showTempOkMessage')
      .mockResolvedValue(undefined);

    const mockAlert = {
      present: jest.fn(() => Promise.resolve()),
      onDidDismiss: jest.fn(() => Promise.resolve()),
      dismiss: jest.fn(() => Promise.resolve()),
    };
    alertControllerMock.create.mockResolvedValue(mockAlert);

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

    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify({ decision: 'ANY', timeout: 60 }),
    });
    notificationSocket.onmessage(messageEvent);

    flushMicrotasks();
    flushMicrotasks();

    const alertOptions = alertControllerMock.create.mock.calls[0][0];
    const acceptBtn = alertOptions.buttons.find((b: any) => b.role === 'confirm');

    acceptBtn.handler();
    flushMicrotasks();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(sendNotifSpy).toHaveBeenCalledWith(JSON.stringify({ decision: 'ACCEPTED' }));
    expect(closeNotifSpy).toHaveBeenCalledTimes(1);
    expect(showTempSpy).toHaveBeenCalledWith('home.ok-msg');

    clearIntervalSpy.mockRestore();
  }));

});
