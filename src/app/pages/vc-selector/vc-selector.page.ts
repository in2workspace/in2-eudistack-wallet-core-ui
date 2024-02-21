import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, PopoverController } from '@ionic/angular';
import { StorageService } from 'src/app/services/storage.service';
import { QRCodeModule } from 'angular2-qrcode';
import { VCReply, WalletService } from 'src/app/services/wallet.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { VcViewComponent } from '../../components/vc-view/vc-view.component';
import { LogoutPage } from '../logout/logout.page';

@Component({
  selector: 'app-vc-selector',
  templateUrl: './vc-selector.page.html',
  styleUrls: ['./vc-selector.page.scss'],
  standalone: true,
  providers: [StorageService],
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    QRCodeModule,
    TranslateModule,
    VcViewComponent,
  ],
})
export class VcSelectorPage implements OnInit {
  isClick: boolean[] = [];
  selCredList: any[] = [];
  credList: any[] = [];
  credDataList: any[] = [];
  size: number = 300;
  executionResponse: any;
  userName: string = '';

  _VCReply: VCReply = {
    selectedVcList: [],
    state: '',
    redirectUri: '',
  };
  test: any = `<img src="../assets/icon/Tick/checkmark-verd.png" alt="g-maps" style="border-radius: 2px">`;
  constructor(
    private router: Router,
    private walletService: WalletService,
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private popoverController: PopoverController,
    public translate: TranslateService
  ) {
    this.route.queryParams.subscribe((params) => {
      this.executionResponse = JSON.parse(params['executionResponse']);
      this._VCReply.redirectUri = this.executionResponse['redirectUri'];
      this._VCReply.state = this.executionResponse['state'];
    });
  }

  ngOnInit() {
    this.userName = this.authenticationService.getName();

    this.credList = this.executionResponse['selectableVcList'];
    this.credList.forEach((credential) => {
      this.isClick.push(false);
    });
  }

  isClicked(index: number) {
    return this.isClick[index];
  }

  async openPopover(ev: any) {
    const popover = await this.popoverController.create({
      component: LogoutPage,
      event: ev,
      translucent: true,
    });

    await popover.present();
  }

  selectCred(cred: any, index: number) {
    this.selCredList.push(cred);
    this.isClick[index] = !this.isClick[index];
  }
  sendCred(cred: any) {
    this.selCredList.push(cred);
    this._VCReply.selectedVcList = this.selCredList;
    this.walletService.executeVC(this._VCReply).subscribe({
      next: (authenticationResponse) => {
        this.isAlertOpen = true;
        this.isAlertOpen = true;
      },
      error: (err) => {
        let TIME_IN_MS = 1500;
        setTimeout(() => {
          this.isAlertOpenFail = false;
        }, TIME_IN_MS);
        this.isAlertOpenFail = true;
      },
    });
  }

  public closeButton = [
    {
      text: this.translate.instant('vc-selector.close'),
      role: 'confirm',
      handler: () => {
        this.isAlertOpen = false;
        this.router.navigate(['/tabs/home']);
      },
    },
  ];

  isAlertOpenFail = false;

  isAlertOpen = false;
  public alertButtons = ['OK'];

  setOpen(isOpen: boolean) {
    this.isAlertOpen = isOpen;
  }
}
