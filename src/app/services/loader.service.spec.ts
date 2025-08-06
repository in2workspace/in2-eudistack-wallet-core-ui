import { TestBed } from '@angular/core/testing';

import { LoaderService } from './loader.service';

describe('LoaderService', () => {
  let service: LoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should compute isLoading from isLoadingCount', () => {
    expect((service as any).loadingCount$()).toBe(0);
    expect(service.isLoading$()).toBe(false);

    (service as any).loadingCount$.set(1);
    expect(service.isLoading$()).toBe(true);

    (service as any).loadingCount$.set(10);
    expect(service.isLoading$()).toBe(true);

    (service as any).loadingCount$.set(0);
    expect(service.isLoading$()).toBe(false);
  });

  it('should log an error when loading count is negative', () => {
    const errorSpy = jest.spyOn(console, 'error');

    (service as any).loadingCount$.set(-1);

    const isLoading = service.isLoading$();

    expect(isLoading).toBe(false);

    expect(errorSpy).toHaveBeenCalled();
  });


  it('should add loading process', () => {
    expect((service as any).loadingCount$()).toBe(0);

    service.addLoadingProcess();
    expect((service as any).loadingCount$()).toBe(1);

    service.addLoadingProcess();
    expect((service as any).loadingCount$()).toBe(2);
  });

  it('should remove loading process', () => {
    expect((service as any).loadingCount$()).toBe(0);

    (service as any).loadingCount$.set(10);
    service.removeLoadingProcess();

    expect((service as any).loadingCount$()).toBe(9);
  });

  it('should reset loading process', () => {
    expect((service as any).loadingCount$()).toBe(0);

    (service as any).loadingCount$.set(10);
    service.resetLoadingCount();

    expect((service as any).loadingCount$()).toBe(0);
  });


});
