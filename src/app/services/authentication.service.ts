import { DestroyRef, inject, Injectable, OnDestroy } from '@angular/core';
import { EventTypes, LoginResponse, OidcSecurityService, PublicEventsService } from 'angular-auth-oidc-client';
import { BehaviorSubject, Observable, filter, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';


@Injectable({
  providedIn: 'root'
})
export class AuthenticationService implements OnDestroy {
  public name: BehaviorSubject<string> = new BehaviorSubject<string>('');
  public name$: Observable<string> = this.name.asObservable();
  private token: string = "";
  private userData: { name:string } | undefined;
  private readonly broadcastChannel = new BroadcastChannel('auth');
  private static readonly BROADCAST_FORCE_LOGOUT = 'forceWalletLogout'; 

  private readonly authEvents = inject(PublicEventsService);
  private readonly destroy$ = inject(DestroyRef);
  private readonly oidcSecurityService = inject(OidcSecurityService);

  public constructor() {
    // handle silent renew errors and log when certain events occur
    this.subscribeToAuthEvents();
    // checks if the user is authenticated and gets related data; doesn't redirect to login page; this is done by the auto login guards
    this.checkAuth$().subscribe({
      error: () => { 
        console.error('Checking authentication: error in initial authentication.');
        this.oidcSecurityService.authorize();
       }
    });
    // synchronize tabs when logging out
    this.listenToCrossTabLogout();
  }

  public subscribeToAuthEvents(): void {
    this.authEvents.registerForEvents()
      .pipe(
        takeUntilDestroyed(this.destroy$),
        filter((e) =>
          [
            EventTypes.SilentRenewStarted, 
            EventTypes.SilentRenewFailed, 
            EventTypes.IdTokenExpired, 
            EventTypes.TokenExpired
          ].includes(e.type)
        )
      )
      .subscribe((event) => {
        const isOffline = !navigator.onLine;

        switch (event.type) {
          case EventTypes.SilentRenewStarted:
            console.info('Silent renew started' + Date.now());
            break;

          // before this happens, the library cleans up the local auth data
          case EventTypes.SilentRenewFailed:
            
            if (isOffline) {
              console.warn('Silent token refresh failed: offline mode', event);

              const onlineHandler = () => {
                console.info('Connection restored. Retrying to authenticate...');
                this.checkAuth$().subscribe(
                  {
                    next: ({ isAuthenticated }) => {
                      if (!isAuthenticated) {
                        console.warn('User still not authenticated after reconnect, logging out');
                        this.authorizeAndForceCrossTabLogout();
                      } else {
                        console.info('User reauthenticated successfully after reconnect');
                      }
                    },
                    error: (err) => {
                      console.error('Error while reauthenticating after reconnect:', err);
                      this.authorizeAndForceCrossTabLogout();
                    },
                    complete: () => {
                      window.removeEventListener('online', onlineHandler);
                    }
                  });
                
              };

              window.addEventListener('online', onlineHandler);

            } else {
              console.error('Silent token refresh failed: online mode, proceeding to logout', event);
              this.authorizeAndForceCrossTabLogout();
            }
            break;

          case EventTypes.IdTokenExpired:
          case EventTypes.TokenExpired:
            console.warn('Session expired:', event);
            console.warn('At: ' + Date.now());
            break;
        }
      });
  }

  public checkAuth$(): Observable<LoginResponse> {
    console.info('Checking authentication.');
    return this.oidcSecurityService.checkAuth().pipe(
      tap(({ isAuthenticated, userData, accessToken }) => {
        if (isAuthenticated) {
          this.updateUserData(userData, accessToken);
        } else {
          console.warn('Checking authentication: not authenticated.');
        }
      }),
      catchError((err:Error)=>{
        return throwError(()=>err);
      })
    );
  }
  public updateUserData(userData:any, accessToken:string): void{
    this.userData = userData;
    this.name.next(this.userData?.name ?? '');
    this.token = accessToken;
  }

  public listenToCrossTabLogout(): void{
    this.broadcastChannel.onmessage = (event) => {
      console.info('Received Broadcast message: ', event);
      if (event.data === AuthenticationService.BROADCAST_FORCE_LOGOUT) {
          console.warn('Detected logout with revoke, logging out locally');
          this.localLogout$().subscribe();
      }
    };
  }

  private localLogout$(): Observable<unknown> {
    console.info('Local logout.');
    return this.oidcSecurityService.logoff();
  }

  public logout$(): Observable<{}> {
    console.info('Logout: revoking tokens.')

    return this.oidcSecurityService.logoffAndRevokeTokens().pipe(
      tap(() => {
        console.info('Logout with revoke completed.');
        this.broadcastChannel.postMessage(AuthenticationService.BROADCAST_FORCE_LOGOUT);
      }),
      catchError((err:Error)=>{
        console.error('Error when logging out with revoke.');
        console.error(err);
        return throwError(()=>err);
      })
    );
  }

  public authorizeAndForceCrossTabLogout(){
    console.info('Authorize and broadcast logout.');
    this.oidcSecurityService.authorize();
    this.broadcastChannel.postMessage(AuthenticationService.BROADCAST_FORCE_LOGOUT);
  }

  public getToken(): string {
    return this.token;
  }
  public getName$(): Observable<string> {
    return this.name$;
  }

  ngOnDestroy(){
    this.broadcastChannel.close();
  }
}
