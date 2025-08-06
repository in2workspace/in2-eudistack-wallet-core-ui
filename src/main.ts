import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { IonicStorageModule } from '@ionic/storage-angular';
import {
  AuthModule,
  AuthInterceptor
} from 'angular-auth-oidc-client';
import { HttpErrorInterceptor } from './app/interceptors/error-handler.interceptor';
import { IAM_PARAMS, IAM_POST_LOGIN_ROUTE, IAM_POST_LOGOUT_URI, IAM_REDIRECT_URI } from './app/constants/iam.constants';
import { disableTouchScrollOnPaths } from './app/helpers/disable-touch-scroll-on-paths';
import { httpTranslateLoader } from './app/helpers/http-translate-loader';


disableTouchScrollOnPaths(
  ['/tabs/settings', '/tabs/home']
);

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    importProvidersFrom(
      IonicModule.forRoot({ innerHTMLTemplatesEnabled: true })
    ),
    //todo: Prefer withInterceptors and functional interceptors instead, as support for DI-provided interceptors may be phased out in a later release. 
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: httpTranslateLoader,
          deps: [HttpClient],
        },
      })
    ),
    importProvidersFrom(IonicStorageModule.forRoot()),
    importProvidersFrom(AuthModule.forRoot({
      config: {
        // You can add "logLevel: 1" to see library logs
        postLoginRoute: IAM_POST_LOGIN_ROUTE,
        authority: environment.iam_url,
        redirectUrl: IAM_REDIRECT_URI,
        postLogoutRedirectUri: IAM_POST_LOGOUT_URI,
        clientId: IAM_PARAMS.CLIENT_ID,
        scope: IAM_PARAMS.SCOPE,
        responseType: IAM_PARAMS.GRANT_TYPE,
        silentRenew: true,
        useRefreshToken: true,
        ignoreNonceAfterRefresh: true,
        triggerRefreshWhenIdTokenExpired: false,
        autoUserInfo: false,
        secureRoutes:[environment.server_url]
      }
    })
    ),
    provideRouter(routes)
  ],
});

