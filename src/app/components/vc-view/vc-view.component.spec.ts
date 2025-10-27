import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { VcViewComponent } from './vc-view.component';
import { WalletService } from 'src/app/services/wallet.service';
import { LifeCycleStatus, VerifiableCredential } from 'src/app/interfaces/verifiable-credential';
import { Observable, of, throwError } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import * as detailMapModule from 'src/app/interfaces/credential-detail-map';
import { RouterTestingModule } from '@angular/router/testing';
import { CallbackPage } from 'src/app/pages/callback/callback.page';
import { ComponentRef } from '@angular/core';

class WalletServiceMock {
  getVCinCBOR(credential: VerifiableCredential) {
    return of('mock_cbor_string');
  }
  requestSignature(credentialId: string): Observable<any> {
    return of({ success: true });
  }
}

describe('VcViewComponent', () => {
  let component: VcViewComponent;
  let componentRef: ComponentRef<VcViewComponent>;
  let fixture: ComponentFixture<VcViewComponent>;
  let walletService: WalletService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([{path:'tabs/credentials', component:CallbackPage}]),
        TranslateModule.forRoot(),
        VcViewComponent,
      ],
      providers: [{ provide: WalletService, useClass: WalletServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(VcViewComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    walletService = TestBed.inject(WalletService);

    componentRef.setInput('credentialInput$', {
      '@context': [],
      id: 'testId',
      type: ['LEARCredentialEmployee'],
      issuer: { id: 'issuerId' },
      validFrom: '',
      validUntil: new Date(Date.now() + 86400000).toISOString(),
      credentialSubject: {
        mandate: {
          id: 'mandateId',
          mandator: {
            commonName: '',
            serialNumber: '',
            organization: '',
            country: '',
            organizationIdentifier: ''
          },
          mandatee: {
            id: 'mandateeId',
            firstName: '',
            lastName: '',
            email: '',
            employeeId: '',
            domain: '',
            ipAddress: ''
          },
          power: [
            {
              id: '',
              type: '',
              domain: '',
              function: '',
              action: [''],
            },
          ]
        },
      },
      lifeCycleStatus: "ISSUED",
      credentialStatus: {} as any,
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('qrView should handle credential correctly if not expired', () => {
    const mockCBOR = 'mock_cbor_string';
    jest.spyOn(walletService, 'getVCinCBOR').mockReturnValue(of(mockCBOR));

    component.qrView();

    expect(walletService.getVCinCBOR).toHaveBeenCalledWith(component.credentialInput$());
    expect(component.cred_cbor).toEqual(mockCBOR);
    expect(component.isAlertOpenNotFound).toBeFalsy();
  });

  it('setOpen should correctly set isModalOpen', () => {
    component.setOpen(true);
    expect(component.isModalOpen).toBeTruthy();

    component.setOpen(false);
    expect(component.isModalOpen).toBeFalsy();
  });

  it('setOpenNotFound should correctly set isAlertOpenNotFound', () => {
    component.setOpenNotFound(true);
    expect(component.isAlertOpenNotFound).toBeTruthy();

    component.setOpenNotFound(false);
    expect(component.isAlertOpenNotFound).toBeFalsy();
  });

  it('setOpenDeleteNotFound should correctly set isAlertOpenDeleteNotFound', () => {
    component.setOpenDeleteNotFound(true);
    expect(component.isAlertOpenDeleteNotFound).toBeTruthy();

    component.setOpenDeleteNotFound(false);
    expect(component.isAlertOpenDeleteNotFound).toBeFalsy();
  });

  it('setOpenExpirationNotFound should correctly set isAlertExpirationOpenNotFound', () => {
    component.setOpenExpirationNotFound(true);
    expect(component.isAlertExpirationOpenNotFound).toBeTruthy();

    component.setOpenExpirationNotFound(false);
    expect(component.isAlertExpirationOpenNotFound).toBeFalsy();
  });

  it('deleteVC should set isModalDeleteOpen to true', () => {
    component.deleteVC();
    expect(component.isModalDeleteOpen).toBeTruthy();
  });

  it('unsignedInfo should set isModalUnsignedOpen to true', () => {
    const mockEvent = new Event('click');
    component.unsignedInfo(mockEvent);
    expect(component.isModalUnsignedOpen).toBeTruthy();
  });

  it('setOpen should correctly set isModalOpen based on the input', () => {
    component.setOpen(true);
    expect(component.isModalOpen).toBeTruthy();

    component.setOpen(false);
    expect(component.isModalOpen).toBeFalsy();
  });

  it('clicking on delete button in deleteButtons should change isModalDeleteOpen accordingly', () => {
    jest.spyOn(component.vcEmit, 'emit');

    component.deleteButtons[0].handler();
    expect(component.isModalDeleteOpen).toBeFalsy();

    component.isModalDeleteOpen = false;

    component.deleteButtons[1].handler();
    expect(component.isModalDeleteOpen).toBeTruthy();
    expect(component.vcEmit.emit).toHaveBeenCalledWith(
      component.credentialInput$()
    );
  });

  it('clicking on OK button in alertButtons should set handlerMessage and isModalOpen correctly', () => {
    jest.spyOn(component, 'setOpen');

    component.setOpen(true);

    expect(component.setOpen).toHaveBeenCalledWith(true);
  });

  it('clicking on close button in unsignedButtons  should change isModalUnsignedOpen  accordingly', () => {
    jest.spyOn(component.vcEmit, 'emit');

    component.unsignedButtons [0].handler();
    expect(component.isModalUnsignedOpen).toBeFalsy();
  });

  // it('qrView should set isAlertExpirationOpenNotFound when credential is expired', () => {
  //   component.credentialInput$().lifeCycleStatus = "EXPIRED";
  //   component.qrView();
  //   expect(component.isAlertExpirationOpenNotFound).toBeTruthy();
  // });
  
  it('qrView should handle HTTP errors correctly', () => {
    const mockError = new Error('Network issue');
    jest.spyOn(walletService, 'getVCinCBOR').mockReturnValue(throwError(() => mockError));

    component.qrView();

    expect(component.isAlertOpenNotFound).toBeTruthy();
  })

  /*it('should call deleteVC on Enter key press on delete button', fakeAsync(() => {
    jest.spyOn(component, 'deleteVC');
    fixture.detectChanges();
    const deleteButton = fixture.debugElement.query(By.css('.vc-view-button'));
    expect(deleteButton).toBeTruthy();
    deleteButton.triggerEventHandler('keydown', { key: 'Enter', preventDefault: () => {} });
    tick();
    expect(component.deleteVC).toHaveBeenCalled();
  }));*/

  it('should call deleteVC when keydown event with key "Enter" and action "delete"', fakeAsync(() => {
    jest.spyOn(component, 'deleteVC');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.handleButtonKeydown(event, 'delete');
    tick();
    expect(component.deleteVC).toHaveBeenCalled();
  }));
  it('should call setOpen when keydown event with key " " and action "close"', fakeAsync(() => {
    jest.spyOn(component, 'setOpen');
    const event = new KeyboardEvent('keydown', { key: ' ' });
    component.handleButtonKeydown(event, 'close');
    tick();
    expect(component.setOpen).toHaveBeenCalledWith(false);
  }));
  it('should call unsignedInfo when keydown event with key "Enter" and action "info"', fakeAsync(() => {
    jest.spyOn(component, 'unsignedInfo');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.handleButtonKeydown(event, 'info');
    tick();
    expect(component.unsignedInfo).toHaveBeenCalled();
  }));
  it('should prevent default behavior for button keydown event', fakeAsync(() => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    jest.spyOn(event, 'preventDefault');
    component.handleButtonKeydown(event, 'delete');
    tick();
    expect(event.preventDefault).toHaveBeenCalled();
  }));

  it('openDetailModal should set isDetailModalOpen to true and call getStructuredFields', () => {
    jest.spyOn(component, 'getStructuredFields');
    component.isDetailModalOpen = false;

    component.isDetailViewActive = true;
    component.openDetailModal();

    expect(component.isDetailModalOpen).toBeTruthy();
    expect(component.getStructuredFields).toHaveBeenCalled();
  });

  it('closeDetailModal should set isDetailModalOpen to false', () => {
    component.isDetailModalOpen = true;

    component.closeDetailModal();

    expect(component.isDetailModalOpen).toBeFalsy();
  }); 

  // describe('getStructuredFields', () => {   
  //   it('should not fail if credentialType is not in CredentialDetailMap', () => {
  //     component.credentialType = 'UnknownType';
  //     expect(() => component.getStructuredFields()).not.toThrow();
  //     expect(component.evaluatedSections.length).toBeGreaterThan(0);
  //   });

  //   it('should handle CredentialDetailMap entry as a function', () => {
  //     const mockSection = {
  //     section: 'Mock Section',
  //     fields: [
  //       {
  //       label: 'Mock Label',
  //       valueGetter: jest.fn().mockReturnValue('Mock Value'),
  //       },
  //       {
  //       label: 'Empty Label',
  //       valueGetter: jest.fn().mockReturnValue(''),
  //       },
  //     ],
  //     };
  //     const mockDetailMapFn = jest.fn().mockReturnValue([mockSection]);
  //     const originalCredentialType = component.credentialType;
  //     component.credentialType = 'MockType';

  //     const originalDetailMap = detailMapModule.CredentialDetailMap[component.credentialType];
  //     detailMapModule.CredentialDetailMap[component.credentialType] = mockDetailMapFn as any;

  //     component.getStructuredFields();

  //     expect(mockDetailMapFn).toHaveBeenCalled();
  //     const foundSection = component.evaluatedSections.find(s => s.section === 'Mock Section');
  //     expect(foundSection).toBeTruthy();
  //     expect(foundSection?.fields.length).toBe(1);
  //     expect(foundSection?.fields[0].label).toBe('Mock Label');
  //     expect(foundSection?.fields[0].value).toBe('Mock Value');

  //     if (originalDetailMap) {
  //     detailMapModule.CredentialDetailMap[component.credentialType] = originalDetailMap;
  //     } else {
  //     delete detailMapModule.CredentialDetailMap[component.credentialType];
  //     }
  //     component.credentialType = originalCredentialType;
  //   });

  //   it('mappedFields should return mapped fields from typeConfig', () => {
  //     const mockTypeConfig = {
  //     fields: [
  //       { label: 'Test Label', valueGetter: jest.fn().mockReturnValue('Test Value') },
  //     ],
  //     };
  //     Object.defineProperty(component, 'typeConfig', { get: () => mockTypeConfig });
  //     component.credentialInput.credentialSubject = {
  //       mandate: {
  //         id: '',
  //         mandator: {
  //           commonName: '',
  //           serialNumber: '',
  //           organization: '',
  //           country: '',
  //           id: ''
  //         },
  //         mandatee: {
  //           id: '',
  //           firstName: '',
  //           lastName: '',
  //           email: '',
  //           employeeId: '',
  //           domain: '',
  //           ipAddress: ''
  //         },
  //         power: [
  //           {
  //             id: '',
  //             type: '',
  //             domain: '',
  //             function: '',
  //             action: [''],
  //           },
  //         ]
  //       }
  //     };
  //     const fields = component.mappedFields;
  //     expect(fields.length).toBe(1);
  //     expect(fields[0].label).toBe('Test Label');
  //     expect(fields[0].value).toBe('Test Value');
  //   });

  //   it('mappedFields should return empty array if typeConfig is undefined', () => {
  //     Object.defineProperty(component, 'typeConfig', { get: () => undefined });
  //     const fields = component.mappedFields;
  //     expect(fields).toEqual([]);
  //   });

  //   it('iconUrl should return icon from typeConfig', () => {
  //     Object.defineProperty(component, 'typeConfig', { get: () => ({ icon: 'icon-url' }) });
  //     expect(component.iconUrl).toBe('icon-url');
  //   });

  //   it('iconUrl should return undefined if typeConfig is undefined', () => {
  //     Object.defineProperty(component, 'typeConfig', { get: () => undefined });
  //     expect(component.iconUrl).toBeUndefined();
  //   });

  //   it('handleKeydown should call qrView if action is "qr" and key is Enter', () => {
  //     jest.spyOn(component, 'qrView');
  //     const event = new KeyboardEvent('keydown', { key: 'Enter' });
  //     component.handleKeydown(event, 'qr');
  //     expect(component.qrView).toHaveBeenCalled();
  //   });

  //   it('handleKeydown should call qrView if action is "qr" and key is Space', () => {
  //     jest.spyOn(component, 'qrView');
  //     const event = new KeyboardEvent('keydown', { key: ' ' });
  //     component.handleKeydown(event, 'qr');
  //     expect(component.qrView).toHaveBeenCalled();
  //   });

  //   it('handleKeydown should prevent default for Enter or Space', () => {
  //     const event = new KeyboardEvent('keydown', { key: 'Enter' });
  //     jest.spyOn(event, 'preventDefault');
  //     component.handleKeydown(event, 'qr');
  //     expect(event.preventDefault).toHaveBeenCalled();
  //   });

  //   it('handleKeydown should not call qrView if action is not "qr"', () => {
  //     jest.spyOn(component, 'qrView');
  //     const event = new KeyboardEvent('keydown', { key: 'Enter' });
  //     component.handleKeydown(event, 'other');
  //     expect(component.qrView).not.toHaveBeenCalled();
  //   });

  //   it('handleButtonKeydown should call openDetailModal when action is "detail"', () => {
  //     jest.spyOn(component, 'openDetailModal');
  //     const event = new KeyboardEvent('keydown', { key: 'Enter' });
  //     component.handleButtonKeydown(event, 'detail');
  //     expect(component.openDetailModal).toHaveBeenCalled();
  //   });

  //   it('handleButtonKeydown should not call any action if key is not Enter or Space', () => {
  //     jest.spyOn(component, 'deleteVC');
  //     jest.spyOn(component, 'setOpen');
  //     jest.spyOn(component, 'unsignedInfo');
  //     jest.spyOn(component, 'openDetailModal');
  //     const event = new KeyboardEvent('keydown', { key: 'Tab' });
  //     component.handleButtonKeydown(event, 'delete');
  //     expect(component.deleteVC).not.toHaveBeenCalled();
  //     expect(component.setOpen).not.toHaveBeenCalled();
  //     expect(component.unsignedInfo).not.toHaveBeenCalled();
  //     expect(component.openDetailModal).not.toHaveBeenCalled();
  //   });

  //   it('checkAvailableFormats should not throw', () => {
  //     expect(() => component.checkAvailableFormats()).not.toThrow();
  //   });
    
  // });

  describe('copyToClipboard', () => {
    let originalClipboard: typeof navigator.clipboard;
    let showToastSpy: jest.SpyInstance;

    beforeEach(() => {
      originalClipboard = navigator.clipboard;
      (navigator as any).clipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      };
      showToastSpy = jest.spyOn((component as any).toastService, 'showToast').mockImplementation(() => {});
    });

    afterEach(() => {
      (navigator as any).clipboard = originalClipboard;
      showToastSpy.mockRestore();
    });

    it('should copy text to clipboard and show toast on success', async () => {
      const text = 'test text';
      await component.copyToClipboard(text);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text);
      expect(showToastSpy).toHaveBeenCalledWith('vc-fields.copy-success');
    });
  });

  it('getStructuredFields should add credentialEncoded section for LEARCredentialMachine type', () => {
    component.credentialType = 'LEARCredentialMachine';
    component.credentialInput$().credentialEncoded = 'encoded_value';
    const originalDetailMap = detailMapModule.CredentialDetailMap[component.credentialType];
    detailMapModule.CredentialDetailMap[component.credentialType] = [];
    component.getStructuredFields();
    const encodedSection = component.detailViewSections.find(
      s => s.section === 'vc-fields.credentialEncoded'
    );
    expect(encodedSection).toBeTruthy();
    expect(encodedSection?.fields.length).toBe(1);
    expect(encodedSection?.fields[0].label).toBe('vc-fields.credentialEncoded');
    expect(encodedSection?.fields[0].value).toBe('encoded_value');
    if (originalDetailMap) {
      detailMapModule.CredentialDetailMap[component.credentialType] = originalDetailMap;
    } else {
      detailMapModule.CredentialDetailMap[component.credentialType] = undefined as any;;
    }
  });

  it('getStructuredFields should use issuer string when issuer is a plain string', () => {
    const current = component.credentialInput$();
    componentRef.setInput('credentialInput$', {
      ...current,
      issuer: 'did:example:issuer'
    });
    fixture.detectChanges();

    component.getStructuredFields();

    const credentialInfoSection = component.detailViewSections.find(
      s => s.section === 'vc-fields.title'
    );
    expect(credentialInfoSection).toBeTruthy();

    const issuerIdField = credentialInfoSection!.fields.find(
      f => f.label === 'vc-fields.credentialInfo.issuerId'
    );
    expect(issuerIdField).toBeTruthy();
    expect(issuerIdField!.value).toBe('did:example:issuer');
  });

  it('translatePowerSections should translate function and all actions in powers section', () => {
  component.credentialType = 'LEARCredentialEmployee';

  const current = component.credentialInput$() as any;
  componentRef.setInput('credentialInput$', {
    ...current,
    type: ['LEARCredentialEmployee'],
    credentialSubject: {
      mandate: {
        ...current.credentialSubject.mandate,
        power: [
          {
            id: '',
            type: '',
            domain: 'user',
            function: 'ADMIN',
            action: ['CREATE', 'DELETE'],
          },
        ],
        mandator: current.credentialSubject.mandate.mandator,
        mandatee: current.credentialSubject.mandate.mandatee,
        id: current.credentialSubject.mandate.id,
      },
    },
  } as any);

  fixture.detectChanges();

  component.getStructuredFields();

  const powersSection = component.detailViewSections.find(s => s.section.endsWith('.powers'));
  expect(powersSection).toBeTruthy();

  const field = powersSection!.fields[0];
  // TranslateModule.forRoot() sense loader retorna la clau tal qual
  expect(field.label).toBe('vc-fields.power.ADMIN (user)');
  expect(field.value).toBe('vc-fields.power.CREATE, vc-fields.power.DELETE');
});

it('translatePowerSections should be a no-op when subject has no mandate', () => {
  component.credentialType = 'gx:LabelCredential';

  const current = component.credentialInput$();
  componentRef.setInput('credentialInput$', {
    ...current,
    type: ['gx:LabelCredential'],
    credentialSubject: {
      id: 'label-1',
      'gx:labelLevel': 'BL',
      'gx:engineVersion': '1.0.0',
      'gx:rulesVersion': '1.0.0',
      'gx:compliantCredentials': [],
      'gx:validatedCriteria': [],
    } as any,
  });

  fixture.detectChanges();

  expect(() => component.getStructuredFields()).not.toThrow();
  // I no ha d'existir cap secció que acabi amb ".powers"
  const anyPowers = component.detailViewSections.some(s => s.section.endsWith('.powers'));
  expect(anyPowers).toBeFalsy();
});

});