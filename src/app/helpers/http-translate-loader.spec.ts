import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { of } from 'rxjs';
import { httpTranslateLoader } from './http-translate-loader';

describe('httpTranslateLoader', () => {
  let httpClientMock: jest.Mocked<HttpClient>;

  beforeEach(() => {
    httpClientMock = {
      get: jest.fn().mockReturnValue(of({}))
    } as unknown as jest.Mocked<HttpClient>;
  });

  it('should create a TranslateHttpLoader instance', () => {
    const loader = httpTranslateLoader(httpClientMock);
    expect(loader).toBeInstanceOf(TranslateHttpLoader);
  });

  it('should use provided HttpClient to load translation files with default prefix and suffix', (done) => {
    const loader = httpTranslateLoader(httpClientMock);
    loader.getTranslation('en').subscribe(result => {
      expect(httpClientMock.get).toHaveBeenCalledWith('/assets/i18n/en.json');
      expect(result).toEqual({});
      done();
    });
  });
});
