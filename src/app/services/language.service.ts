import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StorageService } from './storage.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  private readonly storageService = inject(StorageService);
  public readonly translate = inject(TranslateService);

  private readonly availableLanguages = ['en', 'es', 'ca'];
  private readonly defaultLang = 'en';

  public async setLanguages(){
    this.setAvailableLanguages();
    const storedLang = await this.setStoredLanguage();
    if(storedLang) return;

    const browserLang = this.setBrowserLanguage();
    if(browserLang) return;

    this.setDefaultLanguage();
  }

  private setAvailableLanguages(): void{
    this.translate.addLangs(this.availableLanguages);
  }

  private setDefaultLanguage(){
    const defaultLang = this.getDefaultLang();
    this.translate.setDefaultLang(defaultLang);
    this.translate.use(defaultLang);
  }

  private getDefaultLang(): string{
    const defaultLangFromEnv = environment.customizations.default_lang;
    if(this.availableLanguages.includes(defaultLangFromEnv)){
      return defaultLangFromEnv;
    }else{
      console.error('Language from env is not available: ' + defaultLangFromEnv);
      return this.defaultLang;
    }
  }

private setBrowserLanguage(): string | undefined {
  const availableLangs = this.translate.getLangs();
  
  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const lang of browserLanguages) {
    const shortLang = lang.split('-')[0];

    if (availableLangs.includes(shortLang)) {
      this.translate.use(shortLang);
      return shortLang;
    }
  }

  return undefined;
}


private async setStoredLanguage(): Promise<string | undefined> {
  const storedLang = await this.storageService.get('language');
  const availableLangs = this.translate.getLangs();

  if (storedLang && availableLangs.includes(storedLang)) {
    this.translate.use(storedLang);
    return storedLang;
  } else if (storedLang) {
    console.error('Stored language is not available.');
    this.storageService.remove('language');
  }

  return undefined;
}
}
