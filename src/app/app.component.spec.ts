import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { TranslateService } from '@ngx-translate/core';
import { PopoverController, IonicModule, NavController } from '@ionic/angular';
import { Router, ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthenticationService } from './services/authentication.service';
import { StorageService } from './services/storage.service';
import { RouterTestingModule } from '@angular/router/testing';
import { environment } from '../environments/environment';
import { LoaderService } from './services/loader.service';
import { MenuComponent } from './components/menu/menu.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let translateServiceMock: jest.Mocked<TranslateService>;
  let popoverControllerMock: jest.Mocked<PopoverController>;
  let routerMock: jest.Mocked<Router>;
  let authenticationServiceMock: jest.Mocked<AuthenticationService>;
  let storageServiceMock: jest.Mocked<StorageService>;
  let routerEventsSubject: Subject<Event>;
  let isLoadingSubject: Subject<boolean>;

  const activatedRouteMock: Partial<ActivatedRoute> = {
    snapshot: {
      queryParams: { nocache: 'true' },
      url: [],
      params: {},
      fragment: null,
      data: {},
      outlet: '',
      component: null,
      routeConfig: null,
      root: null,
      parent: null,
      firstChild: null,
      children: [],
      pathFromRoot: [],
      paramMap: {
        keys: [],
        get: jest.fn(),
        has: jest.fn(),
        getAll: jest.fn(),
      },
      queryParamMap: {
        keys: ['nocache'],
        get: jest.fn((key) => (key === 'nocache' ? 'true' : null)),
        has: jest.fn((key) => key === 'nocache'),
        getAll: jest.fn(),
      },
    } as unknown as ActivatedRouteSnapshot,
  };

  const navControllerMock = {
    navigateForward: jest.fn(),
    navigateBack: jest.fn(),
    setDirection: jest.fn(),
  } as unknown as jest.Mocked<NavController>;

  const saveNavigator = () => ({ languages: navigator.languages, language: navigator.language } as any);
  const mockNavigator = (langs: string[], lang: string) => {
    Object.defineProperty(window.navigator, 'languages', { value: langs, configurable: true });
    Object.defineProperty(window.navigator, 'language', { value: lang, configurable: true });
  };
  const restoreNavigator = (snapshot: any) => {
    Object.defineProperty(window.navigator, 'languages', { value: snapshot.languages, configurable: true });
    Object.defineProperty(window.navigator, 'language', { value: snapshot.language, configurable: true });
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    routerEventsSubject = new Subject<Event>();

    translateServiceMock = {
      addLangs: jest.fn(),
      getLangs: jest.fn().mockReturnValue(['en', 'es', 'ca']),
      setDefaultLang: jest.fn(),
      use: jest.fn()
    } as unknown as jest.Mocked<TranslateService>;

    popoverControllerMock = {
      create: jest.fn().mockResolvedValue({
        present: jest.fn(),
      }),
    } as unknown as jest.Mocked<PopoverController>;

    routerMock = {
      navigate: jest.fn(),
      events: routerEventsSubject as any,
      url: '/callback?test=true',
    } as unknown as jest.Mocked<Router>;

    authenticationServiceMock = {
      getName$: jest.fn().mockReturnValue(of('John Doe')),
    } as unknown as jest.Mocked<AuthenticationService>;

    storageServiceMock = {
      get: jest.fn().mockResolvedValue('en'),
      set: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
      ],
      providers: [
        LoaderService,
        { provide: TranslateService, useValue: translateServiceMock },
        { provide: PopoverController, useValue: popoverControllerMock },
        { provide: Router, useValue: routerMock },
        { provide: AuthenticationService, useValue: authenticationServiceMock },
        { provide: StorageService, useValue: storageServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: NavController, useValue: navControllerMock },
      ],
    })
      .overrideComponent(AppComponent, {
        add: {
          providers: [{ provide: PopoverController, useValue: popoverControllerMock }]
        }
      })
      .compileComponents();

    jest.spyOn(AppComponent.prototype as any, 'setLanguages');
    jest.spyOn(AppComponent.prototype as any, 'setStoredLanguage');
    jest.spyOn(AppComponent.prototype as any, 'setCustomStyles');

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app component', () => {
    expect(component).toBeTruthy();
  });

  it('should call setLanguages, setCustomStyles and alert on ngOnInit', async () => {
    const alertSpy = jest.spyOn(component as any, 'alertIncompatibleDevice');

    await component.ngOnInit();

    expect((component as any).setLanguages).toHaveBeenCalled();
    expect((component as any).setCustomStyles).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
  });

  it('should always add available languages on init', async () => {
    translateServiceMock.addLangs.mockClear();

    await component.ngOnInit();

    expect(translateServiceMock.addLangs).toHaveBeenCalledWith(['en', 'es', 'ca']);
  });

  it('should fall back to default when no stored and no browser match', async () => {
    // no stored
    storageServiceMock.get.mockResolvedValueOnce('');
    // navegador sense match
    const snap = saveNavigator();
    mockNavigator(['fr-FR'], 'fr-FR');

    translateServiceMock.setDefaultLang.mockClear();
    translateServiceMock.use.mockClear();

    await component.ngOnInit();

    expect(translateServiceMock.setDefaultLang).toHaveBeenCalledWith('en');
    expect(translateServiceMock.use).toHaveBeenCalledWith('en');

    restoreNavigator(snap);
  });

  it('should use stored language if supported', async () => {
    translateServiceMock.use.mockClear();
    storageServiceMock.get.mockResolvedValueOnce('ca');
    translateServiceMock.getLangs.mockReturnValue(['en', 'es', 'ca']);

    await component.ngOnInit();

    expect(translateServiceMock.use).toHaveBeenCalledWith('ca');
  });

  it('should ignore invalid stored language, remove it, and use browser language if it matches', async () => {
    translateServiceMock.use.mockClear();
    storageServiceMock.get.mockResolvedValueOnce('fr'); // invàlid
    translateServiceMock.getLangs.mockReturnValue(['en', 'es', 'ca']);

    const snap = saveNavigator();
    mockNavigator(['es-ES', 'en-US'], 'es-ES');

    await component.ngOnInit();

    // si vols verificar que es neteja:
    expect(storageServiceMock.remove).toHaveBeenCalledWith('language');

    expect(translateServiceMock.use).toHaveBeenCalledWith('es');

    restoreNavigator(snap);
  });

  it('should ignore invalid stored language and fall back to default when browser has no match', async () => {
    translateServiceMock.use.mockClear();
    translateServiceMock.setDefaultLang.mockClear();
    storageServiceMock.get.mockResolvedValueOnce('fr'); // invàlid
    translateServiceMock.getLangs.mockReturnValue(['en', 'es', 'ca']);

    const snap = saveNavigator();
    mockNavigator(['it-IT'], 'it-IT');

    await component.ngOnInit();

    expect(translateServiceMock.setDefaultLang).toHaveBeenCalledWith('en');
    expect(translateServiceMock.use).toHaveBeenCalledWith('en');

    restoreNavigator(snap);
  });

  it('should set CSS variables from environment', () => {
    component.setCustomStyles();

    const cssVarMap = {
      '--primary-custom-color': environment.customizations.colors.primary,
      '--primary-contrast-custom-color': environment.customizations.colors.primary_contrast,
      '--secondary-custom-color': environment.customizations.colors.secondary,
      '--secondary-contrast-custom-color': environment.customizations.colors.secondary_contrast,
    };

    Object.entries(cssVarMap).forEach(([cssVariable, expectedValue]) => {
      const actualValue = document.documentElement.style.getPropertyValue(cssVariable);
      expect(actualValue).toBe(expectedValue);
    });
  });

  it('should show an alert if the device is iOS < 14.3 and not Safari', () => {
    const isIOSVersionLowerThanSpy = jest
      .spyOn(component['cameraService'], 'isIOSVersionLowerThan')
      .mockReturnValue(true);
    const isNotSafariSpy = jest
      .spyOn(component['cameraService'], 'isNotSafari')
      .mockReturnValue(true);
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    (component as any).alertIncompatibleDevice();

    expect(isIOSVersionLowerThanSpy).toHaveBeenCalledWith(14.3);
    expect(isNotSafariSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'This application scanner is probably not supported on this device with this browser. If you have issues, use Safari browser.'
    );

    jest.restoreAllMocks();
  });

  it('should NOT show an alert if iOS version is >= 14.3', () => {
    jest.spyOn(component['cameraService'], 'isIOSVersionLowerThan').mockReturnValue(false);
    jest.spyOn(component['cameraService'], 'isNotSafari').mockReturnValue(true);
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    (component as any).alertIncompatibleDevice();

    expect(alertSpy).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('should NOT show an alert if browser is Safari', () => {
    jest.spyOn(component['cameraService'], 'isIOSVersionLowerThan').mockReturnValue(true);
    jest.spyOn(component['cameraService'], 'isNotSafari').mockReturnValue(false);
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    (component as any).alertIncompatibleDevice();

    expect(alertSpy).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('should open a popover on Enter or Space keydown', () => {
    const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    jest.spyOn(component, 'openPopover').mockImplementation();

    component.openPopoverByKeydown(mockEvent);
    expect(component.openPopover).toHaveBeenCalledWith(mockEvent);
  });

  it('should NOT open popover on /callback route', async () => {
    const event = new MouseEvent('click');

    (routerMock as any).url = '/callback';
    routerEventsSubject.next(new NavigationEnd(1, '/callback', '/callback') as any);

    await component.openPopover(event);

    expect(popoverControllerMock.create).not.toHaveBeenCalled();
  });

  it('should open popover on non-callback route', async () => {
    (component as any).isCallbackRoute$ = () => false;

    popoverControllerMock.create.mockResolvedValue({
      present: jest.fn(),
    } as any);

    const event = new MouseEvent('click');
    await component.openPopover(event);

    expect(popoverControllerMock.create).toHaveBeenCalledWith({
      component: MenuComponent,
      event,
      translucent: true,
      cssClass: 'custom-popover',
    });
  });

  it('should emit and complete destroy subject', () => {
    const nextSpy = jest.spyOn(component['destroy$'], 'next');
    const completeSpy = jest.spyOn(component['destroy$'], 'complete');

    component['ngOnDestroy']();

    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(completeSpy).toHaveBeenCalledTimes(1);
  });

  describe('isCallbackRoute$', () => {
    it('should return true initially for /callback route', fakeAsync(() => {
      (routerMock as any).url = '/callback';
      routerEventsSubject.next(new NavigationEnd(1, '/callback', '/callback') as any);
      tick();
      expect(component.isCallbackRoute$()).toBe(true);
    }));

    it('should return false for non-callback route', fakeAsync(() => {
      (routerMock as any).url = '/home';
      routerEventsSubject.next(new NavigationEnd(1, '/home', '/home') as any);
      tick();
      expect(component.isCallbackRoute$()).toBe(false);
    }));

    it('should return true for routes starting with /callback even with segments', fakeAsync(() => {
      (routerMock as any).url = '/callback/step2?foo=bar';
      routerEventsSubject.next(new NavigationEnd(1, '/callback/step2?foo=bar', '/callback/step2?foo=bar') as any);
      tick();
      expect(component.isCallbackRoute$()).toBe(true);
    }));
  });

  it('should synchronize isLoading$ with loader service', () => {
    const loaderService = TestBed.inject(LoaderService);
    expect(component.isLoading$()).toBe(loaderService.isLoading$());
    loaderService.addLoadingProcess();
    expect(component.isLoading$()).toBe(loaderService.isLoading$());
    expect(component.isLoading$()).toBeTruthy();
  });
});
