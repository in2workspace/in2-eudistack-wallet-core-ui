import {HttpClient, HttpHeaders, HttpParams, HttpResponse} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { VerifiableCredential } from '../interfaces/verifiable-credential';
import { VCReply } from '../interfaces/verifiable-credential-reply';
import { SERVER_PATH } from '../constants/api.constants';

const headers = new HttpHeaders({
  'Content-Type': 'application/json',
  'Allow-Control-Allow-Origin': '*',
});
const options = {
  headers: headers,
  redirect: 'follow',
};
@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private http = inject(HttpClient);

  //this sends the URL contained by the QR, which can be a verifiable presentation URl or either a Credential offer URL (cross device)
  public executeContent(url: string): Observable<JSON> {
    return this.http.post<JSON>(
      environment.server_url + SERVER_PATH.EXECUTE_CONTENT,
      { qr_content: url },
      options
    );
  }
  
  public getVCinCBOR(credential: VerifiableCredential): Observable<string> {
    const options = {
      headers: headers,
      redirect: 'follow',
      responseType: 'text' as const,
    };
    return this.http.post(
      environment.server_url + SERVER_PATH.CBOR,
      credential,
      options
    );
  }
  public getVCinJWT(credential: VerifiableCredential): Observable<string> {
    const options = {
      headers: headers,
      redirect: 'follow',
      responseType: 'text' as const,
    };
    return this.http.get(
      environment.server_url +
        '/api/credentials/id?credentialId=' +
        credential.id +
        '&format=vc_jwt',
      options
    );
  }

  public requestOpenidCredentialOffer(credentialOfferUri: string): Observable<JSON> {
    const params = new HttpParams().set('credentialOfferUri', credentialOfferUri);
    return this.http.get<JSON>(
      environment.server_url + SERVER_PATH.REQUEST_CREDENTIAL,
      {
        params,
        headers: options.headers
      }
    );
  }

  // Send the Selected VC List to the WCA to create the Verifiable Presentation
  public executeVC(_VCReply: VCReply): Observable<string> {
    return this.http.post<string>(
      environment.server_url +
      SERVER_PATH.VERIFIABLE_PRESENTATION,
      _VCReply,
      {
        headers: headers,
      }
    );
  }

  // Request all Verifiable Credentials of a user from the Wallet Data
  public getAllVCs(): Observable<VerifiableCredential[]> {
    return this.http.get<VerifiableCredential[]>(
      environment.server_url + SERVER_PATH.CREDENTIALS,
      options
    );
  }

  // Request one Verifiable Credential of a user from the Wallet Data
  public getOne(data: string) {
    return this.http.get<VerifiableCredential>(
      environment.server_url + '/api/vc/1/' + data + '/format?format=vc_json',
      options
    );
  }

  // Delete the selected Verifiable Credential from the Wallet Data
  public deleteVC(VC: string) {
    return this.http.delete<string>(
      environment.server_url +
      SERVER_PATH.CREDENTIALS + '/' +
        VC,
      options
    );
  }
  
  public requestSignature(credentialId: string): Observable<HttpResponse<string>> {
    const options = {
      observe: 'response' as const,
    };

    return this.http.get<string>(
      `${environment.server_url + SERVER_PATH.CREDENTIALS_SIGNED_BY_ID}?credentialId=${credentialId}`,
      options
    );
  }

}
