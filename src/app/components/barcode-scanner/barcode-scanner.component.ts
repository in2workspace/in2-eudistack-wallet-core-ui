import { CameraLogsService } from './../../services/camera-logs.service';
import { CommonModule } from '@angular/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  WritableSignal,
  effect
} from '@angular/core';
import { BarcodeFormat, Exception } from '@zxing/library';
import { ZXingScannerModule, ZXingScannerComponent } from '@zxing/ngx-scanner';
import {
  BehaviorSubject,
  Observable,
  Subject,
  debounceTime,
  distinctUntilChanged,
  filter,
  interval,
  map,
  shareReplay,
  switchMap,
  take,
  takeUntil
} from 'rxjs';
import { CameraLogType } from 'src/app/interfaces/camera-log';
import { CameraService } from 'src/app/services/camera.service';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule } from '@ionic/angular';

// ! Since console.error is intercepted (to capture the error already caught by zxing), be careful to avoid recursion
// ! (i.e., console.error should not be called within the execution flow of another console.error)

// When a scanner component is created, it waits until the "destroying scanner list" is empty.
// A scanner component (its id) is removed from such list not right after being destroyed, but after some delay.
// This delay is needed because the activation process requires some time to be completed, so that if the component is 
// destroyed during this process, the camera is not deactivated and the next activation might be blocked

@Component({
  selector: 'app-barcode-scanner',
  templateUrl: './barcode-scanner.component.html',
  styleUrl:'./barcode-scanner.component.scss' ,
  standalone: true,
  imports: [CommonModule, ZXingScannerModule, RouterModule, TranslateModule, IonicModule],
})
export class BarcodeScannerComponent implements OnInit {
  @Output() public qrCode: EventEmitter<string> = new EventEmitter();
  @ViewChild('scanner') public scanner!: ZXingScannerComponent;
  public allowedFormats = [BarcodeFormat.QR_CODE];
  firstActivationCompleted = false;
  private readonly scannerId = uuidv4();

  //COUNTDOWN
  public readonly isError$ = this.cameraService.isCameraError$;
  private readonly activationTimeoutInSeconds = 4;
  private readonly _activatedScanner$$ = new Subject<void>();
  readonly activatedScanner$$: Observable<void> = this._activatedScanner$$.pipe(
    takeUntilDestroyed()
  );
  private readonly activationCountdown$ = this.activatedScanner$$.pipe(
    switchMap(() => interval(1000)
      .pipe(
        take(this.activationTimeoutInSeconds + 1),
        takeUntil(this.destroy$),
        map(seconds => this.activationTimeoutInSeconds * 1000 - seconds * 1000),
      )
    ),
    shareReplay(1),
  );
  private readonly activationCountdownValue$ = toSignal(this.activationCountdown$, {initialValue:6000});

  public readonly selectedDevice$: WritableSignal<MediaDeviceInfo|undefined> = this.cameraService.selectedCamera$;
  private readonly updateScannerDeviceEffect = effect(async () => {
    const selectedDevice = this.selectedDevice$();
    if(this.firstActivationCompleted && this.scanner && selectedDevice && this.scanner.device !== selectedDevice){
      let hasPermission = undefined;
      // if there is already a device, sometimes the askForPemission causes error
      if(!this.scanner.device){
        console.log('Scanner has no device: ask for permission.');
        try{
          hasPermission = await this.scanner.askForPermission();
        }catch(err){
          console.error('Barcode-scanner: error when trying to get permission before settings new device.');
          console.error(err);
          hasPermission = false;
        }
      }
      if(hasPermission !== false){
        setTimeout(() => {
          this.scanner.device = selectedDevice;
          this._activatedScanner$$.next();
        }, 1000);
      }else{
        console.error('SCANNER: Permission denied');
      }
    }
  });
  private readonly isActivatingScanner$ = toSignal(this.cameraService.activatingScannersList$);
  private readonly scanFailureSubject = new Subject<Error>();
  private readonly scanFailureDebounceDelay = 3000;
  private originalConsoleError: undefined|((...data: any[]) => void);

  public scanSuccess$ = new BehaviorSubject<string>('');  
  public destroy$ = new Subject<void>();


  public constructor(
    private readonly cameraService: CameraService,
    private readonly cameraLogsService: CameraLogsService
  ) {

      // Requires debounce since this type of error is emitted constantly
      this.scanFailureSubject.pipe(
        distinctUntilChanged((
          previous, current) => 
            JSON.stringify(previous) === JSON.stringify(current)),
        debounceTime(this.scanFailureDebounceDelay)
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe(err=>{
        this.saveErrorLog(err, 'scanFailure');
      });

    }
  
    public async ngOnInit(): Promise<void> {
      this.modifyConsoleErrorToHandleScannerErrors();
    }
  
    public async ngAfterViewInit(): Promise<void> {
      this.initCameraIfNoActivateScanners();
    }

    public ngOnDestroy(): void {
      this.destroy$.next();
      this.setActivatingTimeout();
      this.restoreOriginalConsoleError();
      this.cameraService.isCameraError$.set(false);
      this.destroy$.complete();
    }

    public async initCameraIfNoActivateScanners(): Promise<void>{
       //activate scanner once there are no other scanner in deactivation process
       const activatingScannersList = this.isActivatingScanner$();
       if (activatingScannersList?.length === 0) {
         const cameraFlowResult = await this.cameraService.getCameraFlow(); 
         if(cameraFlowResult === 'NO_CAMERA_AVAILABLE' || cameraFlowResult === 'PERMISSION_DENIED'){
          console.warn('SCANNER: camera flow not completed; scanner will not be activated.');
          return;
        }
         this.activateScannerInitially();
       } else {
         console.warn('SCANNER: there is at least one active scanner, waiting before starting next camera flow.')
         this.cameraService.activatingScannersList$
           .pipe(
             filter(value => value.length === 0),
             takeUntil(this.destroy$),
             take(1),
           )
           .subscribe(async () => {
             const cameraFlowResult = await this.cameraService.getCameraFlow(); 
             if(cameraFlowResult === 'NO_CAMERA_AVAILABLE' || cameraFlowResult === 'PERMISSION_DENIED'){
              return;
            }
             this.activateScannerInitially();
           });
       }
    }

  public async activateScanner(): Promise<void>{
    if(this.scanner){
      this.scanner.enable = true;
      const hasPermission = await this.scanner.askForPermission();
      if(this.scanner.device?.deviceId !== this.selectedDevice$()?.deviceId && hasPermission){
        this.scanner.device = this.selectedDevice$();
        this._activatedScanner$$.next();
      }
    }
  }

  public async activateScannerInitially(): Promise<void>{
    await this.activateScanner();
    this.firstActivationCompleted = true;  
  }

  public onCodeResult(resultString: string): void {
    this.qrCode.emit(resultString);
  }

  public onScanError(error: Error): void{
    this.saveErrorLog(error, 'scanError');
  }

  public onScanFailure(error: Exception|undefined): void{
    const exception: Error = error ?? new Error('Undefined scan failure');
    this.scanFailureSubject.next(exception);
  }

  public saveErrorLog(error: Error|undefined, exceptionType: CameraLogType): void {
    this.cameraLogsService.addCameraLog(error, exceptionType);
  }

  private setActivatingTimeout(): void{
    this.cameraService.addActivatingScanner(this.scannerId);
    const activationCountDownValue = this.activationCountdownValue$();
    console.warn('Scanner activation countdown value: ' + activationCountDownValue + ' ms');

    setTimeout(() => {
        console.warn('Scanner destroyed after' + activationCountDownValue);
        this.scanner.enable = false;
        this.cameraService.removeActivatingScanner(this.scannerId);
      }, activationCountDownValue );
  }


  public modifyConsoleErrorToHandleScannerErrors(): void{
    //Redefine console.error to capture the errors that were previously captured by zxing-scanner
    this.originalConsoleError = console.error;
    console.error = (message?: string, ...optionalParams: any[]) => {
      if(message === "@zxing/ngx-scanner"){
        console.warn('Logging library error');
        const logMessage = formatLogMessage(message, optionalParams);
        const err = {...new Error(logMessage), name: optionalParams[1]};
        const errorType = optionalParams[0] === 
          "Can't get user media, this is not supported." ?
          'noMediaError' :
          'undefinedError';
        this.cameraService.handleCameraErrors(err, errorType);
        return;
      }

      if (this.originalConsoleError) {
        this.originalConsoleError(message, ...optionalParams);
      }
      
     };
  }

  public restoreOriginalConsoleError(): void{
    if(this.originalConsoleError){
      console.error = this.originalConsoleError;
    }
  }

}

export function formatLogMessage(message: any, optionalParams: any[]): string {
  const optionalParam1 = optionalParams.length > 0 ? optionalParams[0] : '';
  const optionalParam2 = optionalParams.length > 1 ? optionalParams[1] : '';
  return `${String(message)}. ${String(optionalParam1)} ${String(optionalParam2)}`;
}