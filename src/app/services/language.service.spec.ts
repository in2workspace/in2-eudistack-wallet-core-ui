import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { StorageService } from './storage.service';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;
  let translateServiceMock: jest.Mocked<TranslateService>;
  let storageServiceMock: jest.Mocked<StorageService>;

  // Helpers
  const saveNavigator = () =>
    ({ languages: navigator.languages, language: navigator.language } as any);

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
    translateServiceMock = {
      addLangs: jest.fn(),
      getLangs: jest.fn().mockReturnValue(['en', 'es', 'ca']),
      setDefaultLang: jest.fn(),
      use: jest.fn(),
    } as unknown as jest.Mocked<TranslateService>;

    storageServiceMock = {
      get: jest.fn().mockResolvedValue('en'),
      set: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    await TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: TranslateService, useValue: translateServiceMock },
        { provide: StorageService, useValue: storageServiceMock },
      ],
    }).compileComponents();

    service = TestBed.inject(LanguageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should always add available languages when setting languages', async () => {
    translateServiceMock.addLangs.mockClear();

    await service.setLanguages();

    expect(translateServiceMock.addLangs).toHaveBeenCalledWith(['en', 'es', 'ca']);
  });

  it('should use stored language if it is supported', async () => {
    translateServiceMock.use.mockClear();
    storageServiceMock.get.mockResolvedValueOnce('ca');
    translateServiceMock.getLangs.mockReturnValue(['en', 'es', 'ca']);

    await service.setLanguages();

    expect(translateServiceMock.use).toHaveBeenCalledWith('ca');
    expect(translateServiceMock.setDefaultLang).not.toHaveBeenCalled();
  });

  it('should ignore invalid stored language, remove it, and use browser language if it matches', async () => {
    translateServiceMock.use.mockClear();
    storageServiceMock.get.mockResolvedValueOnce('fr');
    translateServiceMock.getLangs.mockReturnValue(['en', 'es', 'ca']);

    const snap = saveNavigator();
    mockNavigator(['es-ES', 'en-US'], 'es-ES');

    await service.setLanguages();

    expect(storageServiceMock.remove).toHaveBeenCalledWith('language');
    expect(translateServiceMock.use).toHaveBeenCalledWith('es');

    restoreNavigator(snap);
  });

  it('should ignore invalid stored language and fall back to default when browser has no match', async () => {
    translateServiceMock.use.mockClear();
    translateServiceMock.setDefaultLang.mockClear();

    storageServiceMock.get.mockResolvedValueOnce('fr');
    translateServiceMock.getLangs.mockReturnValue(['en', 'es', 'ca']);

    const snap = saveNavigator();
    mockNavigator(['it-IT'], 'it-IT');

    await service.setLanguages();

    expect(translateServiceMock.setDefaultLang).toHaveBeenCalledWith('en');
    expect(translateServiceMock.use).toHaveBeenCalledWith('en');

    restoreNavigator(snap);
  });

  it('should fall back to default when no stored language and no browser match', async () => {
    storageServiceMock.get.mockResolvedValueOnce('');

    const snap = saveNavigator();
    mockNavigator(['fr-FR'], 'fr-FR');

    translateServiceMock.setDefaultLang.mockClear();
    translateServiceMock.use.mockClear();

    await service.setLanguages();

    expect(translateServiceMock.setDefaultLang).toHaveBeenCalledWith('en');
    expect(translateServiceMock.use).toHaveBeenCalledWith('en');

    restoreNavigator(snap);
  });

  it('should pick the first matching browser language in order of preference', async () => {
    storageServiceMock.get.mockResolvedValueOnce('');

    const snap = saveNavigator();
    mockNavigator(['fr-FR', 'ca-ES', 'es-ES'], 'fr-FR');

    translateServiceMock.use.mockClear();

    await service.setLanguages();

    expect(translateServiceMock.use).toHaveBeenCalledWith('ca');

    restoreNavigator(snap);
  });
});
