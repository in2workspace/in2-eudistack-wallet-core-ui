import { computed, Injectable, signal, inject } from '@angular/core';
import { BehaviorSubject, take } from 'rxjs';
import { StorageService } from './storage.service';
import { ToastServiceHandler } from './toast.service';
import { CameraLogsService } from './camera-logs.service';
import { CameraLogType } from '../interfaces/camera-log';

@Injectable({
  providedIn: 'root',
})
export class CameraService {
  private readonly cameraLogsService = inject(CameraLogsService);
  private readonly storageService = inject(StorageService);
  private readonly toastService = inject(ToastServiceHandler);

  public selectedCamera$ = signal<MediaDeviceInfo|undefined>(undefined);
  public computedSelectedCameraLabel$ = computed(() => this.selectedCamera$()?.label);
  public availableDevices$ = signal<MediaDeviceInfo[]>([]);
  public isCameraError$ = signal<boolean|undefined>(undefined);
  public activatingScannersListSubj = new BehaviorSubject<string[]>([]);
  public activatingScannersList$ = this.activatingScannersListSubj.asObservable();

  public addActivatingScanner(scannerId: string){
    console.log('Adding scanner with id: ' + scannerId);
    const destroyingScanner = this.activatingScannersListSubj.getValue();
    this.activatingScannersListSubj.next([...destroyingScanner, scannerId]);
  }

  public removeActivatingScanner(scannerId: string){
    console.log('Removing scanner with id: ' + scannerId);
    const destroyingScanner = this.activatingScannersListSubj.getValue();
    const updatedList = destroyingScanner.filter(id => id !== scannerId);
    this.activatingScannersListSubj.next([...updatedList]);
  }

  public setCamera(camera: MediaDeviceInfo) {
    this.selectedCamera$.set(camera);
    const storedCamera = {
      deviceId: camera.deviceId,
      label: camera.label,
      kind: camera.kind,
    };
    this.storageService.set('camera', storedCamera);
  }

  public getAvailableCameraById(id: string){
    const devices = this.availableDevices$();
    return devices.filter(device  => device.deviceId === id )[0];
  }

  public async getCameraFlow(): Promise<MediaDeviceInfo|'PERMISSION_DENIED'|'NO_CAMERA_AVAILABLE'> {
    console.info('Starting flow to get camera.');
    this.isCameraError$.set(false);

    try{
      await this.getCameraPermissionAndStopTracks();
    }catch(e: any){
      console.error('getCameraFlow: Failed when trying to getCameraPermissionAnd...');
      this.handleCameraErrors(e, 'fetchError');
      return 'PERMISSION_DENIED';
    }

    let availableDevices = await this.updateAvailableCameras();
    if(availableDevices.length === 0){
      console.error('getCameraFlow: availableDevices is empty');
      this.handleCameraErrors({name: 'CustomNoAvailable'}, 'fetchError');
      return 'NO_CAMERA_AVAILABLE';
    }

    const selectedCamera = await this.getCameraFromAvailables();
    if(selectedCamera === 'NO_CAMERA_AVAILABLE'){
      console.error('getCameraFlow: availableDevices is empty');
      this.handleCameraErrors({name: 'CustomNoAvailable'}, 'fetchError');
    }
    return selectedCamera;
  }

  public async getCameraPermissionAndStopTracks(): Promise<true>{
    try{
      const stream = await navigator.mediaDevices.getUserMedia({video: true});
      this.stopMediaTracks(stream);
      return true;
    }catch(e: any){
      throw e;
  }
}

//should be called only after permission is granted
public async updateAvailableCameras(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoinputDevices = devices.filter((device) => device.kind === 'videoinput');
  this.availableDevices$.set(videoinputDevices);
  return videoinputDevices;
}

//3
//obtenir càmera seleccionada; si no, stored; si no, qualsevol de les available (ja obtingudes); si no, undefined...
public async getCameraFromAvailables(): Promise<MediaDeviceInfo|'NO_CAMERA_AVAILABLE'> {
  const selectedCamera = this.selectedCamera$();
  if(selectedCamera && this.isCameraAvailableById(selectedCamera.deviceId)) {
    console.info('Using selected camera with id: ' + this.selectedCamera$()?.deviceId);
    return selectedCamera;
  }

  const cameraFromStorage = await this.getCameraFromStorage();
  if(cameraFromStorage  && this.isCameraAvailableById(cameraFromStorage.deviceId)){
    this.selectedCamera$.set(cameraFromStorage);
    return cameraFromStorage;
  }

  const defaultCamera = await this.getDefaultAvailableCamera();
  if(defaultCamera && this.isCameraAvailableById(defaultCamera.deviceId)){
    this.setCamera(defaultCamera);
    return defaultCamera;
  }

  return 'NO_CAMERA_AVAILABLE';
}


  public async getCameraFromStorage(): Promise<MediaDeviceInfo|undefined> {
    const storedCamera = await this.storageService.get('camera');
    console.info('Camera from storage:');
    console.info(storedCamera);
    const isValidMediaDeviceInfo = this.isValidMediaDeviceInfo(storedCamera);

    if (storedCamera !== null && isValidMediaDeviceInfo) {
      return storedCamera;
    }
    return undefined;
  }

  public async getDefaultAvailableCamera(){
    const defaultBackCamera = this.availableDevices$().find((device) => /back|rear|environment/gi.test(device.label));
    const defaultAvailableCamera = defaultBackCamera ?? this.availableDevices$()[0];
    console.info('Getting default camera: ');
    console.info(defaultAvailableCamera);

    return defaultAvailableCamera;
  }

  public isCameraAvailableById(cameraId: string): boolean {
    const availableCamera = this.availableDevices$().find(
      (device) => device.deviceId === cameraId && device.kind === 'videoinput'
    );
    return !!availableCamera;
  }

  public isValidMediaDeviceInfo(object: any): object is MediaDeviceInfo {
    return !!(
      object &&
      typeof object.deviceId === 'string' &&
      typeof object.label === 'string' &&
      typeof object.kind === 'string' &&
      object.kind === 'videoinput'
    );
  }
  
  public stopMediaTracks(stream: MediaStream): void {
    stream.getTracks().forEach((track) => {
      track.stop()});
  }

  public handleCameraErrors(e: Error | { name: string }, type?: CameraLogType) {
    console.error('handleCameraErrors. Error: ');
    console.error(e);
    this.isCameraError$.set(true);
    this.alertCameraErrorsByErrorName(e.name);
  
    const errorInstance: Error = e instanceof Error ? e : new Error(e.name);
    
    this.cameraLogsService.addCameraLog(errorInstance, type ?? 'undefinedError');
  }

  public alertCameraErrorsByErrorName(errMsg: string) {
    let errorLabel = 'errors.camera.default';
  
    if (errMsg.startsWith('NotReadableError')) {
      errorLabel = 'errors.camera.not-readable';
    } else if (errMsg.startsWith('NotAllowedError')) {
      errorLabel = 'errors.camera.not-allowed';
    } else if (errMsg.startsWith('NotFoundError') || errMsg.startsWith('CustomNoAvailable')) {
      errorLabel = 'errors.camera.not-found';
    } else if (errMsg.startsWith('OverconstrainedError')) {
      errorLabel = 'errors.camera.overconstrained';
    } else if (errMsg.startsWith('SecurityError')) {
      errorLabel = 'errors.camera.security';
    } else if (errMsg.startsWith('AbortError')) {
      errorLabel = 'errors.camera.abort';
    } else if (errMsg.startsWith('TypeError')) {
      errorLabel = 'errors.camera.type';
    } else if (errMsg.startsWith('NotSupportedError')) {
      errorLabel = 'errors.camera.not-supported';
    }
  
    this.toastService.showErrorAlertByTranslateLabel(errorLabel)
      .pipe(take(1))
      .subscribe();
  }
  
  public isIOSVersionLowerThan(version: number): boolean {
    const regex = /OS (\d+)_/;
    const match = regex.exec(navigator.userAgent);
    if (match) {
      const iosVersion = parseInt(match[1], 10);
      return iosVersion < version;
    }
    return false;
  }
  
  public isNotSafari(): boolean {
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    return !isSafari;
  }

}