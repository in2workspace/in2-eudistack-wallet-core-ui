import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, Signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, PopoverController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthenticationService } from './services/authentication.service';
import { MenuComponent } from './components/menu/menu.component';
import { StorageService } from './services/storage.service';
import { Subject, map } from 'rxjs';
import { CameraService } from './services/camera.service';
import { environment } from 'src/environments/environment';
import { LoaderService } from './services/loader.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    TranslateModule,
  ],
})

export class AppComponent implements OnInit, OnDestroy {
  private readonly authenticationService = inject(AuthenticationService);
  private readonly document = inject(DOCUMENT);
  private readonly loader = inject(LoaderService);
  private readonly router = inject(Router)

  public userName = this.authenticationService.getName$();
  public routerEvents$ = this.router.events;
  // if the route is "/", don't allow menu popover
  public isBaseRoute$ = toSignal<boolean>(this.routerEvents$.pipe(map(ev => this.router.url === '/')));
  // if the route is "/callback" blurs the toolbar to give a "transitional effect"
  public isCallbackRoute$ = toSignal<boolean>(this.routerEvents$.pipe(map(ev => {
      const currentUrl = this.router.url.split('?')[0];
      return currentUrl.startsWith('/callback');
  })));
  public readonly logoSrc = environment.customizations.logo_src;
  private readonly destroy$ = new Subject<void>();
  public isLoading$: Signal<boolean>;

  private readonly cameraService = inject(CameraService);
  private readonly popoverController = inject(PopoverController);
  private readonly storageService = inject(StorageService);
  public readonly translate = inject(TranslateService);

  private readonly availableLanguages = ['en', 'es', 'ca'];
  private readonly defaultLang = 'en';

  public constructor() {
    this.isLoading$ = this.loader.isLoading$;
  }

  public async ngOnInit() {
    this.setCustomStyles();
    this.setFavicon();
    await this.setLanguages();
    this.alertIncompatibleDevice();
  }

  public ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }


  public setCustomStyles(): void{
    const root = document.documentElement;

    const cssVarMap = {
      '--primary-custom-color': environment.customizations.colors.primary,
      '--primary-contrast-custom-color': environment.customizations.colors.primary_contrast,
      '--secondary-custom-color': environment.customizations.colors.secondary,
      '--secondary-contrast-custom-color': environment.customizations.colors.secondary_contrast,
    };
  
    Object.entries(cssVarMap).forEach(([cssVariable, colorValue]) => {
      root.style.setProperty(cssVariable, colorValue);
    });
  }

  private setFavicon(): void {
    const faviconUrl = environment.customizations.favicon_src;

    // load favicon from environment
    let faviconLink: HTMLLinkElement = this.document.querySelector("link[rel='icon']") || this.document.createElement('link');
    faviconLink.type = 'image/x-icon';
    faviconLink.rel = 'icon';
    faviconLink.href = faviconUrl;
    
    this.document.head.appendChild(faviconLink);

    // load apple-touch icon from environment
    let appleFaviconLink: HTMLLinkElement = this.document.querySelector("link[rel='apple-touch-icon']") || this.document.createElement('link');
    appleFaviconLink.type = 'image/x-icon';
    appleFaviconLink.rel = 'apple-touch-icon';
    appleFaviconLink.href = faviconUrl;
    
    this.document.head.appendChild(appleFaviconLink);
  }

  private async setLanguages(){
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

  //alert for IOs below 14.3
  private alertIncompatibleDevice(): void{
    const problematicIosVersion = this.cameraService.isIOSVersionLowerThan(14.3);
    const isNotSafari = this.cameraService.isNotSafari();
    if (problematicIosVersion && isNotSafari) {
      alert('This application scanner is probably not supported on this device with this browser. If you have issues, use Safari browser.');
    }
  }


  public openPopoverByKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
        this.openPopover(event);
        event.preventDefault();
    }
  }

  public async openPopover(ev: Event): Promise<void> {
    if (this.isCallbackRoute$()) {
      return; 
    }
    const popover = await this.popoverController.create({
      component: MenuComponent,
      event: ev,
      translucent: true,
      cssClass: 'custom-popover',
    });

    await popover.present();
  }

}