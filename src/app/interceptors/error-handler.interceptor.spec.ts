import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { ToastServiceHandler } from '../services/toast.service';
import { HttpErrorInterceptor } from './error-handler.interceptor';
import { SERVER_PATH } from '../constants/api.constants';
import { environment } from 'src/environments/environment';

class MockToastServiceHandler {
  showErrorAlert(message: string) {
  }
}

describe('HttpErrorInterceptor with HttpClient', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockToastServiceHandler: MockToastServiceHandler;

  beforeEach(() => {
    mockToastServiceHandler = new MockToastServiceHandler();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: HttpErrorInterceptor,
          multi: true,
        },
        {
          provide: ToastServiceHandler,
          useValue: mockToastServiceHandler
        }
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should log and show a toast on a 404 Not Found response', () => {
    const spy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');

    httpClient.get('/test404').subscribe({
      error: (error) => {
        expect(spy).toHaveBeenCalledWith('Resource not found message from backend');
      }
    });

    const req = httpMock.expectOne('/test404');
    req.flush({message: 'Resource not found message from backend'}, { status: 404, statusText: 'Not Found' });
  });

  it('should show error toast on 422 Unprocessable Entity response', () => {
    const expectedMessage = 'Unprocessable Entity';
    const spy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');

    httpClient.get('/test422').subscribe({
      error: (error) => {
        expect(spy).toHaveBeenCalledWith(expectedMessage);
      }
    });

    const req = httpMock.expectOne('/test422');
    req.flush({ message: expectedMessage }, { status: 422, statusText: 'Unprocessable Entity' });
  });

  it('should show error toast on 500 Internal Server Error response', () => {
    const expectedMessage = 'Internal Server Error';
    const spy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');

    httpClient.get('/test500').subscribe({
      error: (error) => {
        expect(spy).toHaveBeenCalledWith(expectedMessage);
      }
    });

    const req = httpMock.expectOne('/test500');
    req.flush({ message: expectedMessage }, { status: 500, statusText: 'Internal Server Error' });
  });

  it('should log and show a toast on a 401 Unauthorized response', () => {
    const spy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');

    httpClient.get('/test401').subscribe({
      error: (error) => {
        expect(spy).toHaveBeenCalledWith('Unauthorized error message from backend');
      }
    });

    const req = httpMock.expectOne('/test401');
    req.flush({message: 'Unauthorized error message from backend'}, { status: 401, statusText: 'Unauthorized' });
  });

  it('should log and show a toast on a generic HTTP error response', () => {
    const errorMessage = 'An error occurred';
    const spy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');

    httpClient.get('/testError').subscribe({
      error: (error) => {
        expect(spy).toHaveBeenCalledWith(errorMessage);
      }
    });

    const req = httpMock.expectOne('/testError');
    req.flush({message: errorMessage}, { status: 500, statusText: 'Internal Server Error' });
  });

it('it should print the correct message if a request to process the QR is made', ()=>{
  const errorMessage = 'There was a problem processing the QR. It might be invalid or already have been used';
  const spy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');

  httpClient.get('/' + SERVER_PATH.EXECUTE_CONTENT).subscribe({
    error: () => {
      expect(spy).toHaveBeenCalledWith(errorMessage);
    }
  });

  const req = httpMock.expectOne('/' + SERVER_PATH.EXECUTE_CONTENT);
  req.flush({message: 'Random error message'}, { status: 500, statusText: 'AnyText' });
});

  it('should handle errors silently for verifiable presentation URI', () => {
    const testUrl = SERVER_PATH.VERIFIABLE_PRESENTATION;
    const spy = jest.spyOn(console, 'error');

    httpClient.get(testUrl).subscribe({
      error: (error) => {
        expect(spy).toHaveBeenCalledWith('Handled silently:', 'Test error message');
        expect(error).toBeTruthy();
      },
    });

    const req = httpMock.expectOne(testUrl);
    req.flush(
      { message: 'Test error message' },
      { status: 400, statusText: 'Bad Request' }
    );
  });

    it('should handle errors silently for request signature URI', () => {
    const testUrl = SERVER_PATH.CREDENTIALS_SIGNED_BY_ID;
    const spy = jest.spyOn(console, 'error');

    httpClient.get(testUrl).subscribe({
      error: (error) => {
        expect(spy).toHaveBeenCalledWith('Handled silently:', 'Test error message');
        expect(error).toBeTruthy();
      },
    });

    const req = httpMock.expectOne(testUrl);
    req.flush(
      { message: 'Test error message' },
      { status: 400, statusText: 'Bad Request' }
    );
  });

  it('should handle errors silently for IAM URI', () => {
    const testUrl = environment.iam_url;
    const spy = jest.spyOn(console, 'error');

    httpClient.get(testUrl).subscribe({
      error: (error) => {
        expect(spy).toHaveBeenCalledWith('Handled silently:', 'Test error message');
        expect(error).toBeTruthy();
      },
    });

    const req = httpMock.expectOne(testUrl);
    req.flush(
      { message: 'Test error message' },
      { status: 400, statusText: 'Bad Request' }
    );
  });

  it('should show a toast with "PIN expired" on a 408 Request Timeout response', () => {
    const expectedMessage = 'PIN expired';
    const spy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');
  
    httpClient.get('/' + SERVER_PATH.REQUEST_CREDENTIAL).subscribe({
      error: (error) => {
        expect(spy).toHaveBeenCalledWith(expectedMessage);
      },
    });
  
    const req = httpMock.expectOne('/' + SERVER_PATH.REQUEST_CREDENTIAL);
    req.flush({ message: 'Request Timeout' }, { status: 408, statusText: 'Request Timeout' });
  });
  
  it('should show a toast with "PIN expired" on a 504 Gateway Timeout response', () => {
    const expectedMessage = 'PIN expired';
    const spy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');
  
    httpClient.get('/' + SERVER_PATH.REQUEST_CREDENTIAL).subscribe({
      error: (error) => {
        expect(spy).toHaveBeenCalledWith(expectedMessage);
      },
    });
  
    const req = httpMock.expectOne('/' + SERVER_PATH.REQUEST_CREDENTIAL);
    req.flush({ message: 'Gateway Timeout' }, { status: 504, statusText: 'Gateway Timeout' });
  });

  it('should show a toast with "PIN expired" on a 408 Request Timeout response for execute_content_uri', () => {
    const expectedMessage = 'PIN expired';
    const spy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');
  
    httpClient.get('/' + SERVER_PATH.EXECUTE_CONTENT).subscribe({
      error: (error) => {
        expect(spy).toHaveBeenCalledWith(expectedMessage);
      },
    });
  
    const req = httpMock.expectOne('/' + SERVER_PATH.EXECUTE_CONTENT);
    req.flush({ message: 'Request Timeout' }, { status: 408, statusText: 'Request Timeout' });
  });
  
  it('should show a toast with "PIN expired" on a 504 Gateway Timeout response for execute_content_uri', () => {
    const expectedMessage = 'PIN expired';
    const spy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');
  
    httpClient.get('/' + SERVER_PATH.EXECUTE_CONTENT).subscribe({
      error: (error) => {
        expect(spy).toHaveBeenCalledWith(expectedMessage);
      },
    });
  
    const req = httpMock.expectOne('/' + SERVER_PATH.EXECUTE_CONTENT);
    req.flush({ message: 'Gateway Timeout' }, { status: 504, statusText: 'Gateway Timeout' });
  });

  it('should handle silently when CREDENTIALS returns empty list message (no toast)', () => {
  const toastSpy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');
  const logSpy = jest.spyOn(console, 'error');

  const url = '/' + SERVER_PATH.CREDENTIALS + '?page=1&size=10';
  httpClient.get(url).subscribe({
    error: (err) => {
      expect(err).toBeTruthy();
      expect(logSpy).toHaveBeenCalledWith('Handled silently:', 'The credentials list is empty');
      expect(toastSpy).not.toHaveBeenCalled();
    }
  });

  const req = httpMock.expectOne(url);
  req.flush({ message: 'The credentials list is empty' }, { status: 400, statusText: 'Bad Request' });
});

it('should show toast for CREDENTIALS when message is not the empty list one', () => {
  const toastSpy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');
  const url = '/' + SERVER_PATH.CREDENTIALS;

  httpClient.get(url).subscribe({
    error: () => {
      expect(toastSpy).toHaveBeenCalledWith('Something went wrong');
    }
  });

  const req = httpMock.expectOne(url);
  req.flush({ message: 'Something went wrong' }, { status: 500, statusText: 'Internal Server Error' });
});

it('should map EXECUTE_CONTENT "No credentials found for" to friendly login message', () => {
  const toastSpy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');
  const url = '/' + SERVER_PATH.EXECUTE_CONTENT;

  httpClient.get(url).subscribe({
    error: () => {
      expect(toastSpy).toHaveBeenCalledWith('There are no credentials available to login');
    }
  });

  const req = httpMock.expectOne(url);
  req.flush({ message: 'No credentials found for user X' }, { status: 400, statusText: 'Bad Request' });
});

it('should map EXECUTE_CONTENT "The credentials list is empty" to friendly login message', () => {
  const toastSpy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');
  const url = '/' + SERVER_PATH.EXECUTE_CONTENT;

  httpClient.get(url).subscribe({
    error: () => {
      expect(toastSpy).toHaveBeenCalledWith('There are no credentials available to login');
    }
  });

  const req = httpMock.expectOne(url);
  req.flush({ message: 'The credentials list is empty' }, { status: 400, statusText: 'Bad Request' });
});

it('should keep backend message for EXECUTE_CONTENT when message starts with "Incorrect PIN"', () => {
  const toastSpy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');
  const backendMsg = 'Incorrect PIN: please try again';
  const url = '/' + SERVER_PATH.EXECUTE_CONTENT;

  httpClient.get(url).subscribe({
    error: () => {
      expect(toastSpy).toHaveBeenCalledWith(backendMsg);
    }
  });

  const req = httpMock.expectOne(url);
  req.flush({ message: backendMsg }, { status: 400, statusText: 'Bad Request' });
});

it('should map EXECUTE_CONTENT timeout (with query params) to "PIN expired"', () => {
  const toastSpy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');
  const url = '/' + SERVER_PATH.EXECUTE_CONTENT + '?foo=bar&baz=1';

  httpClient.get(url).subscribe({
    error: () => {
      expect(toastSpy).toHaveBeenCalledWith('PIN expired');
    }
  });

  const req = httpMock.expectOne(url);
  req.flush({ message: 'Gateway Timeout' }, { status: 504, statusText: 'Gateway Timeout' });
});

it('should keep backend "The received QR content cannot be processed..." message for EXECUTE_CONTENT', () => {
  const toastSpy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');
  const backendMsg = 'The received QR content cannot be processed: malformed payload';
  const url = '/' + SERVER_PATH.EXECUTE_CONTENT;

  httpClient.get(url).subscribe({
    error: () => {
      expect(toastSpy).toHaveBeenCalledWith(backendMsg);
    }
  });

  const req = httpMock.expectOne(url);
  req.flush({ message: backendMsg }, { status: 400, statusText: 'Bad Request' });
});

it('should keep backend message for REQUEST_CREDENTIAL when not a timeout', () => {
  const toastSpy = jest.spyOn(mockToastServiceHandler, 'showErrorAlert');
  const url = '/' + SERVER_PATH.REQUEST_CREDENTIAL;

  httpClient.get(url).subscribe({
    error: () => {
      expect(toastSpy).toHaveBeenCalledWith('Bad pin format');
    }
  });

  const req = httpMock.expectOne(url);
  req.flush({ message: 'Bad pin format' }, { status: 400, statusText: 'Bad Request' });
});
  
  
});
