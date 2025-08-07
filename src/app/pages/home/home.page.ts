import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastServiceHandler } from 'src/app/services/toast.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
  ],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class HomePage implements OnInit {
  @Input() public availableDevices: MediaDeviceInfo[] = [];
  public userName = '';
  public desactivar = true;

  public constructor(private readonly router: Router, private readonly route: ActivatedRoute, 
    private readonly toastService: ToastServiceHandler) { }

  public async startScan(): Promise<void> {
    const scanRoute = '/tabs/credentials/';
    try{
      await this.router.navigate([scanRoute], {
        queryParams: { showScannerView: true, showScanner: true },
      });
    }catch(err){
      console.error('Error when trying to navigate to ' + scanRoute);
      this.toastService.showErrorAlertByTranslateLabel("errors.navigation").subscribe();
    }
  }
  public handleButtonKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {

      this.startScan();
      event.preventDefault();
    }
  }
  public ngOnInit(): void {    
    this.route.queryParams.subscribe((params) => {
      const credentialOfferUri = params['credential_offer_uri'];
      if (credentialOfferUri) {
        this.router.navigate(['/tabs/credentials'], {
          queryParams: { credentialOfferUri: credentialOfferUri },
        });
      }
    });
  }
}
