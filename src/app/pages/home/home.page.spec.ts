import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HomePage } from './home.page';
import { BehaviorSubject, of } from 'rxjs';
import { ToastServiceHandler } from 'src/app/services/toast.service';
class MockRouter {
  public navigate = jest.fn();
}

let originalMediaDevices: any;

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let route: ActivatedRoute;
  let mockRouter: MockRouter;
  let mockToast: { showErrorAlertByTranslateLabel: jest.Mock };
   
  beforeEach(async () => {
    mockRouter = new MockRouter();
    mockToast = {
      showErrorAlertByTranslateLabel: jest.fn().mockReturnValue(of(null))
    };
    await TestBed.configureTestingModule({
      imports: [
        IonicModule.forRoot(),
        RouterTestingModule.withRoutes([]),
        TranslateModule.forRoot()
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: new BehaviorSubject({ credential_offer_uri: 'someUri' })
          }
        }, 
        { provide:Router, useValue:mockRouter },
        { provide: ToastServiceHandler, useValue: mockToast }
      ]
      }).compileComponents();
  
      fixture = TestBed.createComponent(HomePage);
      component = fixture.componentInstance;
      route = TestBed.inject(ActivatedRoute);
      fixture.detectChanges();
  
      originalMediaDevices = navigator.mediaDevices;
    });
  
    afterEach(() => {
      (navigator as any).mediaDevices = originalMediaDevices;
    });
  
    
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should call startScan when keydown event with key "Enter" and action "startScan"', fakeAsync(() => {
      jest.spyOn(component, 'startScan');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleButtonKeydown(event);
      tick();
      expect(component.startScan).toHaveBeenCalled();
    }));
  
    it('should navigate based on queryParams on init', async () => {
      const navigateSpy = jest.spyOn(mockRouter, 'navigate');

      (route.queryParams as BehaviorSubject<any>).next({ credential_offer_uri: 'newUri' });
  
      await fixture.whenStable();
      fixture.detectChanges();
      expect(navigateSpy).toHaveBeenCalledWith(['/tabs/credentials'], { queryParams: { credentialOfferUri: 'newUri' } });
    });
  
    it('startScan should navigate with specific queryParams', async () => {
      (navigator as any).mediaDevices = {
        getUserMedia: jest.fn()
      }
      const audioStream:any = { getTracks: ()=>[] }; 
      let promise = Promise.resolve(audioStream);
      jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockReturnValue(promise);
      const navigateSpy = jest.spyOn(mockRouter, 'navigate');
    await component.startScan();
    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/credentials/'], { queryParams: { showScannerView: true, showScanner: true } });
  });

    it('should call toastService.showErrorAlertByTranslateLabel when navigate throws', async () => {
    (mockRouter.navigate as jest.Mock).mockImplementation(() => { throw new Error('nav error'); });

    await component.startScan();

    expect(mockToast.showErrorAlertByTranslateLabel)
      .toHaveBeenCalledWith('errors.navigation');
  });



});