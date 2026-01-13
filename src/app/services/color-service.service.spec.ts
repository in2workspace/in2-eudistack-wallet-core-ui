import { TestBed } from '@angular/core/testing';

import { ColorServiceService } from './color-service.service';

describe('ColorServiceService', () => {
  let service: ColorServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ColorServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
