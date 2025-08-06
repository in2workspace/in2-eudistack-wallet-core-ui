import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { CameraService } from 'src/app/services/camera.service';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { BarcodeScannerComponent, formatLogMessage } from './barcode-scanner.component';
import { CameraLogsService } from 'src/app/services/camera-logs.service';
import { Storage } from '@ionic/storage-angular';
import { BarcodeFormat, Exception } from '@zxing/library';
import { CameraLogType } from 'src/app/interfaces/camera-log';
import { NavigationEnd, Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

class MockRouter {
  public events = new Subject<any>();
}

describe('BarcodeScannerComponent', () => {
  let component: BarcodeScannerComponent;
  let fixture: ComponentFixture<BarcodeScannerComponent>;
  let mockCameraService: {
    selectedCamera$: jest.Mock;
    isCameraError$: WritableSignal<boolean>;
    activatingScannersList$: Observable<[]>;
    getCameraFlow: jest.Mock;
    addActivatingScanner: jest.Mock;
    removeActivatingScanner: jest.Mock;
    handleCameraErrors: jest.Mock;
  };
  let mockCameraLogsService: CameraLogsService;
  let mockRouter: MockRouter;

  beforeEach(async () => {
    mockCameraService = {
      selectedCamera$: jest.fn().mockReturnValue({deviceid: 'devide-id'}),
      isCameraError$: signal(false),
      activatingScannersList$: of([]),
      getCameraFlow: jest.fn(),
      addActivatingScanner: jest.fn(),
      removeActivatingScanner: jest.fn(),
      handleCameraErrors: jest.fn()
    };
    mockCameraLogsService = {
      addCameraLog: jest.fn()
    } as any;
    mockRouter = new MockRouter();

    await TestBed.configureTestingModule({
      imports: [CommonModule, ZXingScannerModule, TranslateModule.forRoot()],
      providers: [
        { provide: CameraService, useValue: mockCameraService }, 
        { provide: CameraLogsService, useValue:mockCameraLogsService },
        { provide: Router, useValue: mockRouter },
        Storage
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BarcodeScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('BarcodeScannerComponent Initialization', () => {
    it('should initialize allowedFormats with QR_CODE', () => {
      expect(component.allowedFormats).toEqual([BarcodeFormat.QR_CODE]);
    });
  
    it('should initialize scannerId as a random string', () => {
      expect(typeof component['scannerId']).toBe('string');
      expect(component['scannerId'].length).toBeGreaterThan(0);
    });
  
    it('should initialize isError$ as CameraService.isCameraError$', () => {
      expect(component.isError$).toBe(mockCameraService.isCameraError$);
    });
  
    it('should initialize activationTimeoutInSeconds as 4', () => {
      expect(component['activationTimeoutInSeconds']).toBe(4);
    });
  
    it('should initialize activationCountdownValue$ with initial value 6000', () => {
      expect(component['activationCountdownValue$']()).toBe(6000);
    });
  
    it('should initialize selectedDevice$ as CameraService.selectedCamera$', () => {
      expect(component.selectedDevice$).toBe(mockCameraService.selectedCamera$);
    });

    it('should initialize scanFailureSubject as a Subject', () => {
      expect(component['scanFailureSubject']).toBeInstanceOf(Subject);
    });
  
    it('should initialize scanFailureDebounceDelay as 3000', () => {
      expect(component['scanFailureDebounceDelay']).toBe(3000);
    });

  
    it('should initialize scanSuccess$ as a BehaviorSubject with an empty string', () => {
      expect(component.scanSuccess$).toBeInstanceOf(BehaviorSubject);
      expect(component.scanSuccess$.getValue()).toBe('');
    });
  
    it('should initialize destroy$ as a Subject', () => {
      expect(component.destroy$).toBeInstanceOf(Subject);
    });
  });
  
  describe('BarcodeScannerComponent Lifecycle Hooks', () => {
    beforeEach(() => {
      jest.spyOn(component, 'modifyConsoleErrorToHandleScannerErrors').mockImplementation();
      jest.spyOn(component, 'initCameraIfNoActivateScanners').mockImplementation();
      jest.spyOn((component as any), 'setActivatingTimeout').mockImplementation();
      jest.spyOn(component, 'restoreOriginalConsoleError').mockImplementation();
      jest.spyOn(mockCameraService.isCameraError$, 'set').mockImplementation();
    });
  
    it('should call modifyConsoleErrorToHandleScannerErrors on ngOnInit', async () => {
      await component.ngOnInit();
      expect(component.modifyConsoleErrorToHandleScannerErrors).toHaveBeenCalled();
    });
  
    it('should call initCameraIfNoActivateScanners on ngAfterViewInit', async () => {
      await component.ngAfterViewInit();
      expect(component.initCameraIfNoActivateScanners).toHaveBeenCalled();
    });
  
    it('should call destroy$.next, setActivatingTimeout, restoreOriginalConsoleError and reset camera error on ngOnDestroy', () => {
      jest.spyOn(component.destroy$, 'next');
  
      component.ngOnDestroy();
  
      expect(component.destroy$.next).toHaveBeenCalled();
      expect((component as any).setActivatingTimeout).toHaveBeenCalled();
      expect(component.restoreOriginalConsoleError).toHaveBeenCalled();
      expect(mockCameraService.isCameraError$.set).toHaveBeenCalledWith(false);
    });
  });

  describe('Activate scanner methods', () => {
    beforeEach(() => {
      component['scanner'] = {
        enable: false,
        askForPermission: jest.fn().mockResolvedValue(true),
        device: undefined
      } as any;
  
      jest.spyOn(component['_activatedScanner$$'], 'next');
    });
  
    it('should enable scanner and set device if permission granted in activateScanner', async () => {
      jest.spyOn(component, 'selectedDevice$').mockReturnValue({ deviceId: 'device-123' } as any);
  
      await component.activateScanner();
  
      expect(component['scanner'].enable).toBe(true);
      expect(component['scanner'].askForPermission).toHaveBeenCalled();
      expect(component['scanner'].device).toEqual({ deviceId: 'device-123' });
      expect(component['_activatedScanner$$'].next).toHaveBeenCalled();
    });
  
    it('should not change scanner device if already set', async () => {
      component['scanner'].device = { deviceId: 'device-123', askForPemission: ()=>true } as any;
      jest.spyOn(component, 'selectedDevice$').mockReturnValue({ deviceId: 'device-123' } as any);
      
      await component.activateScanner();
      
      expect(component['_activatedScanner$$'].next).not.toHaveBeenCalled();
    });
  
    it('should not activate scanner if scanner is undefined', async () => {
      component['scanner'] = undefined as any;
  
      await component.activateScanner();
  
      expect(component['_activatedScanner$$'].next).not.toHaveBeenCalled();
    });
  
    it('should not set device if permission is denied', async () => {
      component['scanner'].askForPermission = jest.fn().mockResolvedValue(false);
  
      await component.activateScanner();
  
      expect(component['scanner'].device).toBeUndefined();
      expect(component['_activatedScanner$$'].next).not.toHaveBeenCalled();
    });
  
    it('should call activateScanner and set firstActivationCompleted in activateScannerInitially', async () => {
      jest.spyOn(component, 'activateScanner').mockImplementation();
  
      await component.activateScannerInitially();
  
      expect(component.activateScanner).toHaveBeenCalled();
      expect(component.firstActivationCompleted).toBe(true);
    });
  });

  describe('restoreOriginalConsoleError', () => {
    it('should restore console.error if originalConsoleError is defined', () => {
      const mockConsoleError = jest.fn();
      component['originalConsoleError'] = mockConsoleError;
  
      component.restoreOriginalConsoleError();
  
      expect(console.error).toBe(mockConsoleError);
    });
  
    it('should not change console.error if originalConsoleError is undefined', () => {
      const originalConsoleError = console.error;
      component['originalConsoleError'] = undefined;
  
      component.restoreOriginalConsoleError();
  
      expect(console.error).toBe(originalConsoleError);
    });
  });

  describe('modifyConsoleErrorToHandleScannerErrors', () => {
    let originalConsoleError: jest.Mock;
  
    beforeEach(() => {
      originalConsoleError = jest.fn();
      console.error = originalConsoleError;
      mockCameraService.handleCameraErrors = jest.fn(); // Assegurem que està net
    });
  
    afterEach(() => {
      console.error = originalConsoleError;
    });
  
    it('should redefine console.error and store the original one', () => {
      component.modifyConsoleErrorToHandleScannerErrors();
  
      expect(component['originalConsoleError']).toBe(originalConsoleError);
      expect(typeof console.error).toBe('function');
    });
  
    it('should call handleCameraErrors once with noMediaError when specific error occurs', () => {
      component.modifyConsoleErrorToHandleScannerErrors();
  
      console.error('@zxing/ngx-scanner', "Can't get user media, this is not supported.", 'extraData');
    
      expect(mockCameraService.handleCameraErrors).toHaveBeenCalledTimes(1);
      expect(mockCameraService.handleCameraErrors).toHaveBeenCalledWith({"name": "extraData"}, "noMediaError");
  
      expect(originalConsoleError).not.toHaveBeenCalled();
    });
  
    it('should call handleCameraErrors once with undefinedError for other @zxing/ngx-scanner errors', () => {
      component.modifyConsoleErrorToHandleScannerErrors();
  
      console.error('@zxing/ngx-scanner', 'Some other scanner error', 'extraData');
    
      expect(mockCameraService.handleCameraErrors).toHaveBeenCalledTimes(1);
      expect(mockCameraService.handleCameraErrors).toHaveBeenCalledWith({"name": "extraData"}, "undefinedError");
  
      expect(originalConsoleError).not.toHaveBeenCalled();
    });
  
    it('should delegate to original console.error if the message is not @zxing/ngx-scanner', () => {
      component.modifyConsoleErrorToHandleScannerErrors();
  
      mockCameraService.handleCameraErrors.mockClear();
      console.error('Some other message', 'extraData');
  
      expect(mockCameraService.handleCameraErrors).not.toHaveBeenCalled();
      expect(originalConsoleError).toHaveBeenCalledWith('Some other message', 'extraData');
    });
  
    it('should not throw error if originalConsoleError is undefined and non-scanner error occurs', () => {
      component['originalConsoleError'] = undefined;
      component.modifyConsoleErrorToHandleScannerErrors();
  
      expect(() => console.error('Some other message', 'extraData')).not.toThrow();
    });
  });
  
  
  

//   it('should redefine console.error and handle zxing errors correctly', () => {
//     const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
//     const saveErrorLogSpy = jest.spyOn(component, 'saveErrorLog');
//     const originalConsoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

//     component.ngOnInit();
//     const message = "@zxing/ngx-scanner";
//     const params = "Can't get user media, this is not supported.";
//     console.error(message, params);

//     expect(saveErrorLogSpy).toHaveBeenCalledWith(new Error(formatLogMessage(message, [params])), 'noMediaError');
//     expect(originalConsoleSpy).not.toHaveBeenCalled();

//     expect(alertMock).toHaveBeenCalledTimes(1);
//     expect(originalConsoleSpy).not.toHaveBeenCalled();
//     console.error("Another error");

//     expect(alertMock).toHaveBeenCalledTimes(1);
//     expect(originalConsoleSpy).toHaveBeenCalledWith("Another error");

//     alertMock.mockRestore();
//     originalConsoleSpy.mockRestore();
//   });

  it('should emit qrCode when onCodeResult is called', () => {
    const testString = 'test QR code';
    jest.spyOn(component.qrCode, 'emit');
    component.onCodeResult(testString);
    expect(component.qrCode.emit).toHaveBeenCalledWith(testString);
  });


  it('should save error log in saveErrorLog', () => {
    const testError = new Error('Test error');
    const testExceptionType: CameraLogType = 'undefinedError';
    component.saveErrorLog(testError, testExceptionType);
    expect(mockCameraLogsService.addCameraLog).toHaveBeenCalledWith(testError, testExceptionType);
  });

  it('should save error log when onScanError is called', () => {
    const testError = new Error('Test scan error');
    jest.spyOn(component, 'saveErrorLog');
    component.onScanError(testError);
    expect(component.saveErrorLog).toHaveBeenCalledWith(testError, 'scanError');
  });

  it('should save scan failure log when onScanFailure is called with an error', fakeAsync(() => {
      const testError = new Exception('Test scan failure');
      const saveErrorSpy = jest.spyOn(component, 'saveErrorLog');
      component.onScanFailure(testError);
      tick(3000);
      expect(saveErrorSpy).toHaveBeenCalledWith(testError, 'scanFailure');
    }));

  it('should save undefined scan failure log when onScanFailure is called without an error', fakeAsync(() => {
    const saveErrorSpy = jest.spyOn(component, 'saveErrorLog');
    component.onScanFailure(undefined);
    tick(3000);
    expect(saveErrorSpy).toHaveBeenCalledWith(expect.any(Error), 'scanFailure');
  }));


describe('formatLogMessage', () => {
  it('should format message with no optional params', () => {
    const message = 'Test message';
    const result = formatLogMessage(message, []);
    expect(result).toBe('Test message.  ');
  });

  it('should format message with one optional param', () => {
    const message = 'Test message';
    const optionalParams = ['Param1'];
    const result = formatLogMessage(message, optionalParams);
    expect(result).toBe('Test message. Param1 ');
  });

  it('should format message with two optional params', () => {
    const message = 'Test message';
    const optionalParams = ['Param1', 'Param2'];
    const result = formatLogMessage(message, optionalParams);
    expect(result).toBe('Test message. Param1 Param2');
  });

  it('should handle non-string message and params by converting them to strings', () => {
    const message = 12345;
    const optionalParams = [true, { key: 'value' }];
    const result = formatLogMessage(message, optionalParams);
    expect(result).toBe('12345. true [object Object]');
  });
});
});