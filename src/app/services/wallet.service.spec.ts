import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { WalletService } from './wallet.service';
import { environment } from 'src/environments/environment';
import {
  CredentialStatus,
  LifeCycleStatus,
  VerifiableCredential,
} from '../interfaces/verifiable-credential';
import { SERVER_PATH } from '../constants/api.constants';

interface VCReply {
  selectedVcList: any[];
  state: string;
  redirectUri: string;
  nonce: string;
}

describe('WalletService', () => {
  let service: WalletService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WalletService],
    });
    service = TestBed.inject(WalletService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should execute content and return a JSON response', (done) => {
    const mockUrl = 'https://example.com/mock-content';
    const mockResponse = { success: true, message: 'Content executed successfully' };

    service.executeContent(mockUrl).subscribe((response) => {
      expect(response).toEqual(mockResponse);
      done();
    });

    const req = httpTestingController.expectOne(
      `${environment.server_url}${SERVER_PATH.EXECUTE_CONTENT}`
    );
    expect(req.request.method).toEqual('POST');
    expect(req.request.body).toEqual({ qr_content: mockUrl });
    expect(req.request.headers.get('Content-Type')).toBe('application/json'); // Opcional: comprovar headers si cal
    req.flush(mockResponse);
  });


  it('should fetch VC in CBOR format', (done) => {
    const mockCredential: VerifiableCredential = {
      '@context': ['https://www.w3.org/ns/credentials/v1'],
      id: 'test-credential-id',
      type: ['VerifiableCredential', 'LEARCredentialEmployee'],
      issuer: {
        id: 'did:web:provider.dome.fiware.dev',
      },
      validFrom: '2024-04-02T09:23:22.637345122Z',
      validUntil: '2025-01-01T00:00:00Z',
      credentialSubject: {
        mandate: {
          id: 'mandateId1',
          mandator: {
            commonName: 'Common Name',
            serialNumber: 'serialNumber1',
            organization: 'Organization Name',
            country: 'Country',
            organizationIdentifier: 'mandatorId1'
          },
          mandatee: {
            id: 'personId1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'test@example.com',
            employeeId: '',
            domain: '',
            ipAddress: ''
          },
          power: [
            {
              id: 'powerId1',
              type: 'Domain',
              domain: 'DOME',
              function: 'Onboarding',
              action: ['Execute'],
            },
          ]
        },
      },
      lifeCycleStatus: "ISSUED",
      credentialStatus: {} as CredentialStatus, 
    };
    const mockResponse = 'mock-cbor-data';

    service.getVCinCBOR(mockCredential).subscribe((response) => {
      expect(response).toEqual(mockResponse);
      done();
    });

    const req = httpTestingController.expectOne(
      `${environment.server_url}/api/v1/vp/cbor`
    );
    expect(req.request.method).toEqual('POST');
    req.flush(mockResponse);
  });

  it('should fetch VC in JWT format', (done) => {
    const mockCredentialId = 'test-credential-id';
    const mockResponse = 'mock-jwt-data';

    service
      .getVCinJWT({ id: mockCredentialId } as VerifiableCredential)
      .subscribe((response) => {
        expect(response).toEqual(mockResponse);
        done();
      });

    const req = httpTestingController.expectOne(
      `${environment.server_url}/api/credentials/id?credentialId=${mockCredentialId}&format=vc_jwt`
    );
    expect(req.request.method).toEqual('GET');
    req.flush(mockResponse);
  });

  it('should request a new credential', () => {
    const mockCredentialOfferUri = 'test-offer-uri';
    const expectedResponse = {
      message: 'Credential request successful',
    };

    service.requestOpenidCredentialOffer(mockCredentialOfferUri).subscribe((response) => {
      expect(response).toEqual(expectedResponse);
    });

    const req = httpTestingController.expectOne(
      `${environment.server_url}${SERVER_PATH.REQUEST_CREDENTIAL}?credentialOfferUri=${mockCredentialOfferUri}`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('credentialOfferUri')).toBe(mockCredentialOfferUri);
    req.flush(expectedResponse);
  });


  it('should execute Verifiable Credential and return response', (done) => {
    const mockVCReply: VCReply = {
      selectedVcList: [],
      state: 'test-state',
      redirectUri: 'test-redirect-uri',
      nonce: 'test-nonce',
    };
    const mockResponse = 'VC executed successfully';

    service.executeVC(mockVCReply).subscribe((response) => {
      expect(response).toEqual(mockResponse);
      done();
    });

    const req = httpTestingController.expectOne(
      `${
        environment.server_url +
        SERVER_PATH.VERIFIABLE_PRESENTATION
      }`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockVCReply);
    req.flush(mockResponse);
  });

  it('should fetch all Verifiable Credentials', (done) => {
    const mockResponse: VerifiableCredential[] = [
      {
        '@context': ['https://www.w3.org/ns/credentials/v1'],
        id: 'example-credential-id',
        type: ['VerifiableCredential', 'LEARCredentialEmployee'],
        issuer: {
          id: 'did:web:provider.dome.fiware.dev',
        },
        validFrom: '2024-04-02T09:23:22.637345122Z',
        validUntil: '2030-01-01T00:00:00Z',
        credentialSubject: {
          mandate: {
            id: 'mandateId1',
            mandator: {
              commonName: 'Example Unit',
              serialNumber: 'serialNumber1',
              organization: 'Organization Name',
              country: 'Country',
              organizationIdentifier: ''
            },
            mandatee: {
              id: 'personId1',
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'example@test.com',
              employeeId: '',
              domain: '',
              ipAddress: ''
            },
            power: [
              {
                id: 'powerId1',
                type: 'Domain',
                domain: 'SomeDomain',
                function: 'SomeFunction',
                action: ['SomeAction'],
              },
            ],
          },
        },
        lifeCycleStatus: "ISSUED",
        credentialStatus: {} as CredentialStatus
      },
    ];

    service.getAllVCs().subscribe((credentials) => {
      expect(credentials.length).toBeGreaterThan(0);
      expect(credentials).toEqual(mockResponse);
      done();
    });

    const req = httpTestingController.expectOne(
      `${environment.server_url + SERVER_PATH.CREDENTIALS}`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch a single Verifiable Credential by id', (done) => {
    const data = 'test-id';
    const mockResponse: VerifiableCredential = {
      '@context': ['https://www.w3.org/ns/credentials/v1'],
      id: 'single-test-credential-id',
      type: ['VerifiableCredential', 'LEARCredentialEmployee'],
      issuer: {
        id: 'did:web:provider.dome.fiware.dev',
      },
      validFrom: '2024-04-02T09:23:22.637345122Z',
      validUntil: '2030-01-01T00:00:00Z',
      credentialSubject: {
        mandate: {
          id: 'mandateId1',
          mandator: {
            commonName: 'Test Unit',
            serialNumber: 'serialNumber1',
            organization: 'Organization Name',
            country: 'Country',
            organizationIdentifier: ''
          },
          mandatee: {
            id: 'personId1',
            firstName: 'Single',
            lastName: 'Credential',
            email: 'single@test.com',
            employeeId: '',
            domain: '',
            ipAddress: ''
          },
          power: [
            {
              id: 'powerId1',
              type: 'Domain',
              domain: 'SomeDomain',
              function: 'SomeFunction',
              action: ['SomeAction'],
            },
          ]
        },
      },
      lifeCycleStatus: "ISSUED",
      credentialStatus: {} as CredentialStatus
    };

    service.getOne(data).subscribe((credential) => {
      expect(credential).toEqual(mockResponse);
      done();
    });

    const req = httpTestingController.expectOne(
      `${environment.server_url}/api/vc/1/${data}/format?format=vc_json`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should delete a Verifiable Credential by id', (done) => {
    const VC = 'test-vc-id';
    const mockResponse = 'VC deleted successfully';

    service.deleteVC(VC).subscribe((response) => {
      expect(response).toEqual(mockResponse);
      done();
    });

    const req = httpTestingController.expectOne(
      `${
        environment.server_url +
        SERVER_PATH.CREDENTIALS + '/' +
        VC
      }`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(mockResponse);
  });

  it('should request a signature for a given credential ID', (done) => {
    const credentialId = 'test-credential-id';
    const expectedResponse = 'Signed Credential';

    service.requestSignature(credentialId).subscribe((response) => {
      expect(response.body).toEqual(expectedResponse);
      done();
    });

    const req = httpTestingController.expectOne(
      `${
        environment.server_url +
        SERVER_PATH.CREDENTIALS_SIGNED_BY_ID
      }?credentialId=${credentialId}`
    );
    expect(req.request.method).toBe('GET');
    req.flush(expectedResponse);
  });
});
