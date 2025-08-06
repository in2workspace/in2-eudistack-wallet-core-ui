import { TestBed } from '@angular/core/testing';
import { AuthenticationService } from './authentication.service';
import { OidcSecurityService, PublicEventsService, EventTypes } from 'angular-auth-oidc-client';
import { of, throwError, Subject } from 'rxjs';

jest.mock('angular-auth-oidc-client');



describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let mockOidcSecurityService: jest.Mocked<any>;
  let mockPublicEventsService: jest.Mocked<any>;
  let events$: Subject<any>;
  let broadcastMessages: any[] = [];

  
  class BroadcastChannelMock {
    name: string;
    onmessage: ((this: BroadcastChannel, ev: MessageEvent) => any) | null = null;
    constructor(name: string) {
      this.name = name;
      broadcastMessages = [];
    }
    postMessage(message: any) {
      broadcastMessages.push(message);
    }
    close() {}
  }

    beforeAll(() => {
    // Global mock del BroadcastChannel
    (globalThis as any).BroadcastChannel = BroadcastChannelMock;
  });


  beforeEach(() => {
    events$ = new Subject();
    mockOidcSecurityService = {
            checkAuth: jest.fn().mockReturnValue(of()),
            logoff: jest.fn().mockReturnValue(of()),
            logoffAndRevokeTokens: jest.fn().mockReturnValue(of()),
            authorize: jest.fn()
          };

    mockPublicEventsService = {
      registerForEvents: jest.fn().mockReturnValue(of())
    }


    TestBed.configureTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: OidcSecurityService,
          useValue: mockOidcSecurityService
        },
        {
          provide: PublicEventsService,
          useValue: mockPublicEventsService
        }
      ]
    });

    jest.spyOn(AuthenticationService.prototype as any, 'subscribeToAuthEvents');
    jest.spyOn(AuthenticationService.prototype as any, 'checkAuth$');
    jest.spyOn(AuthenticationService.prototype as any, 'listenToCrossTabLogout');
    service = TestBed.inject(AuthenticationService);

  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    console.log(service['authEvents'])
    expect(service).toBeTruthy();
  });

  it('should call init functions', ()=> {
    expect(service.subscribeToAuthEvents).toHaveBeenCalled();
    expect(service.checkAuth$).toHaveBeenCalled();
    expect(service.listenToCrossTabLogout).toHaveBeenCalled();
  });

  describe('checkAuth$', () => {
    it('should update userData if authenticated', (done) => {
      const loginResponse = {
        isAuthenticated: true,
        userData: { name: 'Test User' },
        accessToken: 'fake-token'
      } as any;
      mockOidcSecurityService.checkAuth.mockReturnValue(of(loginResponse));

      service.checkAuth$().subscribe((res) => {
        expect(service.getToken()).toBe('fake-token');
        service.getName$().subscribe(name => {
          expect(name).toBe('Test User');
          done();
        });
      });
    });

    it('should not update userData if not authenticated', (done) => {
      const loginResponse = {
        isAuthenticated: false,
        userData: {},
        accessToken: ''
      } as any;
      mockOidcSecurityService.checkAuth.mockReturnValue(of(loginResponse));

      service.checkAuth$().subscribe((res) => {
        expect(service.getToken()).toBe('');
        done();
      });
    });

    it('should propagate error when checkAuth throws', (done) => {
      const error = new Error('checkAuth failed');
      mockOidcSecurityService.checkAuth.mockReturnValue(throwError(() => error));

      service.checkAuth$().subscribe({
        next: () => fail('An error was expected.'),
        error: (err) => {
          expect(err).toBe(error);
          done();
        }
      });
    });

  });

  describe('updateUserData', () => {
    it('should update user data', ()=>{ 
      const nextSpy = jest.spyOn(service['name'], 'next');
      
      service.updateUserData({name: 'user-name'}, 'token');
  
      expect(service['userData']).toEqual({name: 'user-name'});
      expect(service['token']).toBe('token');
      expect(nextSpy).toHaveBeenCalledWith('user-name');
    })
  });

  describe('subscribeToAuthEvents', () => {
  let eventSubject: Subject<any>;

  beforeEach(() => {
    eventSubject = new Subject();

    // Espiar mètodes utilitzats en els switch
    jest.spyOn(service, 'checkAuth$').mockReturnValue(of({ isAuthenticated: false } as any));
    jest.spyOn(service, 'logout$').mockReturnValue(of({}));
    jest.spyOn(service, 'authorizeAndForceCrossTabLogout').mockImplementation();

    // Mock de registerForEvents
    mockPublicEventsService.registerForEvents.mockReturnValue(eventSubject.asObservable());
  });

  it('should handle SilentRenewStarted', () => {
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

    service.subscribeToAuthEvents();

    eventSubject.next({ type: EventTypes.SilentRenewStarted });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Silent renew started/));

    consoleSpy.mockRestore();
  });

  it('should handle SilentRenewFailed when offline', () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    const consoleInfo = jest.spyOn(console, 'info').mockImplementation();

    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    service.subscribeToAuthEvents();

    eventSubject.next({ type: EventTypes.SilentRenewFailed });

    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('offline mode'), expect.anything());
    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));

    consoleWarn.mockRestore();
    consoleInfo.mockRestore();
  });

  it('should handle SilentRenewFailed when online', () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    service.subscribeToAuthEvents();

    eventSubject.next({ type: EventTypes.SilentRenewFailed });

    expect(consoleError).toHaveBeenCalledWith('Silent token refresh failed: online mode, proceeding to logout', expect.anything());
    expect(service.authorizeAndForceCrossTabLogout).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should handle IdTokenExpired', () => {
    const consoleError = jest.spyOn(console, 'warn').mockImplementation();

    service.subscribeToAuthEvents();

    eventSubject.next({ type: EventTypes.IdTokenExpired });

    expect(consoleError).toHaveBeenCalledWith('Session expired:', expect.anything());

    consoleError.mockRestore();
  });

  it('should handle TokenExpired', () => {
    const consoleError = jest.spyOn(console, 'warn').mockImplementation();

    service.subscribeToAuthEvents();

    eventSubject.next({ type: EventTypes.TokenExpired });

    expect(consoleError).toHaveBeenCalledWith('Session expired:', expect.anything());

    consoleError.mockRestore();
  });
});

describe('listenToCrossTabLogout', () => {
  let logoutSpy: jest.SpyInstance;

  beforeEach(() => {
    logoutSpy = jest.spyOn(service, 'localLogout$' as any).mockReturnValue(of(undefined));

    service.listenToCrossTabLogout();
  });

  afterEach(() => {
    logoutSpy.mockRestore();
  });

  it('should call localLogout$ when forceWalletLogout message is received', () => {
    const event = new MessageEvent('message', { data: 'forceWalletLogout' });

    // Simulem que el canal rep un missatge
    if (service['broadcastChannel'].onmessage) {
      service['broadcastChannel'].onmessage(event);
    }

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('should NOT call localLogout$ when message is not forceWalletLogout', () => {
    const event = new MessageEvent('message', { data: 'somethingElse' });

    if (service['broadcastChannel'].onmessage) {
      service['broadcastChannel'].onmessage(event);
    }

    expect(logoutSpy).not.toHaveBeenCalled();
  });
});

describe('localLogout$', () => {
  it('should call oidcSecurityService.logoff and complete', () => {
    const logoffSpy = jest.spyOn(service['oidcSecurityService'], 'logoff').mockReturnValue(of(undefined));

    service['localLogout$']().subscribe({
      next: (res) => {
        expect(res).toBeUndefined();
        expect(logoffSpy).toHaveBeenCalled();
      },
      error: () => {
        fail('Should not error');
      }
    });
  });

  it('should propagate error from oidcSecurityService.logoff', () => {
    const error = new Error('logoff failed');
    jest.spyOn(service['oidcSecurityService'], 'logoff').mockReturnValue(throwError(() => error));

    service['localLogout$']().subscribe({
      next: () => {
        fail('Should not succeed');
      },
      error: (err) => {
        expect(err).toBe(error);
      }
    });
  });
});




  describe('logout$', () => {
    it('should call logoffAndRevokeTokens and postMessage', (done) => {
      const postMessageSpy = jest.spyOn(BroadcastChannel.prototype, 'postMessage').mockImplementation();
      mockOidcSecurityService.logoffAndRevokeTokens.mockReturnValue(of(null));

      service.logout$().subscribe(() => {
        expect(mockOidcSecurityService.logoffAndRevokeTokens).toHaveBeenCalled();
        expect(postMessageSpy).toHaveBeenCalledWith('forceWalletLogout');
        postMessageSpy.mockRestore();
        done();
      });
    });

    it('should handle error in logout$', (done) => {
      const error = new Error('logout failed');
      mockOidcSecurityService.logoffAndRevokeTokens.mockReturnValue(throwError(() => error));

      service.logout$().subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        }
      });
    });
  });

  describe('authorizeAndForceCrossTabLogout', () => {
    it('should call authorize and post message', () => {
      const logSpy = jest.spyOn(console, 'info');
      const postMessageSpy = jest.spyOn(BroadcastChannel.prototype, 'postMessage').mockImplementation();

      service.authorizeAndForceCrossTabLogout();

      expect(logSpy).toHaveBeenCalled();
      expect(mockOidcSecurityService.authorize).toHaveBeenCalled();
      expect(postMessageSpy).toHaveBeenCalledWith('forceWalletLogout');

      postMessageSpy.mockRestore();
    });
  });

  it('should close the broadcast channel on destroy', () => {
    const closeSpy = jest.spyOn(service['broadcastChannel'], 'close');
    service.ngOnDestroy();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should get token', () => {
    const mockToken = 'mock-token';
    service['token'] = mockToken;

    const resultGetToken = service.getToken();

    expect(resultGetToken).toBe(mockToken);
  });

  it('should get name$', () => {
    const mockName = 'mockName';
    service['name$'] = of(mockName);

    service.getName$().subscribe(name => {
      expect(name).toBe(mockName);
    });
  });

    describe('constructor error handling', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let authorizeSpy: jest.SpyInstance;
    let checkAuthSpy: jest.SpyInstance;

    beforeEach(() => {
      checkAuthSpy = jest
        .spyOn(AuthenticationService.prototype as any, 'checkAuth$')
        .mockReturnValue(throwError(() => new Error('initial checkAuth error')));

      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      authorizeSpy = jest.spyOn(mockOidcSecurityService, 'authorize').mockImplementation();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthenticationService,
          { provide: OidcSecurityService, useValue: mockOidcSecurityService },
          { provide: PublicEventsService, useValue: mockPublicEventsService }
        ]
      });
      service = TestBed.inject(AuthenticationService);
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      authorizeSpy.mockRestore();
      checkAuthSpy.mockRestore();
    });

    it('should log error and call authorize() when initial checkAuth errors', () => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Checking authentication: error in initial authentication.'
      );
      expect(authorizeSpy).toHaveBeenCalled();
    });
  });

});
