import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  input
} from '@angular/core';
import { QRCodeModule } from 'angularx-qrcode';
import { WalletService } from 'src/app/services/wallet.service';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ExtendedCredentialType, VerifiableCredential } from 'src/app/interfaces/verifiable-credential';
import { IonicModule } from '@ionic/angular';
import { CredentialMapConfig, CredentialTypeMap } from 'src/app/interfaces/credential-type-map';
import { CredentialDetailMap, EvaluatedField, EvaluatedSection } from 'src/app/interfaces/credential-detail-map';
import * as dayjs from 'dayjs';
import { ToastServiceHandler } from 'src/app/services/toast.service';
import { getExtendedCredentialType, isValidCredentialType } from 'src/app/helpers/get-credential-type.helpers';



/**
 * This component displays two types of "details VC view":
 * 1. cardViewFields: the summary data displayed in the VC card.
 * 2. detailViewSections: the comprehensive details shown in the modal that opens
 * when clicking on the VC card.
 */
@Component({
  selector: 'app-vc-view',
  templateUrl: './vc-view.component.html',
  styleUrls: ['./vc-view.component.scss'],
  standalone: true,
  imports: [IonicModule, QRCodeModule, TranslateModule, CommonModule],
})
export class VcViewComponent implements OnInit {
  public credentialInput$ = input.required<VerifiableCredential>();
  public cardViewFields$ = computed<EvaluatedField[]>(() => {
    const subject = this.credentialInput$().credentialSubject;
    const evaluatedFields: EvaluatedField[] = this.cardViewConfigByCredentialType?.fields.map(f => {
      return {
      label: f.label,
      value: f.valueGetter(subject),
    }
    }) ?? [];
    return evaluatedFields;
  });

  @Input() public isDetailViewActive = false;
  @Output() public vcEmit: EventEmitter<VerifiableCredential> =
    new EventEmitter();

  credentialType!: ExtendedCredentialType;

  public cred_cbor = '';
  public isAlertOpenNotFound = false;
  public isAlertExpirationOpenNotFound = false;
  public isAlertOpenDeleteNotFound = false;
  public isModalOpen = false;
  public isModalDeleteOpen = false;
  public isModalUnsignedOpen = false;
  public showChip = false;
  public handlerMessage = '';
  public alertButtons = [
    {
      text: 'OK',
      role: 'confirm',
      handler: () => {
        this.handlerMessage = 'Alert confirmed';
        this.isModalOpen = true;
      },
    },
  ];

  public deleteButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => {
        this.isModalDeleteOpen = false;
      },
    },
    {
      text: 'Yes, delete it',
      role: 'confirm',
      handler: () => {
        this.isModalDeleteOpen = true;
        this.vcEmit.emit(this.credentialInput$());
      },
    },
  ];

  public unsignedButtons = [{
    text: 'Close',
    role: 'close',
    handler: () => {
      this.isModalUnsignedOpen = false;
    },
  },
  ];
  private readonly walletService = inject(WalletService);
  private readonly toastService = inject(ToastServiceHandler);

  public isDetailModalOpen = false;
  public detailViewSections!: EvaluatedSection[];

  public openDetailModal(): void {
    if(this.isDetailViewActive){
      this.isDetailModalOpen = true;
      this.getStructuredFields();
    }
  }

  public closeDetailModal(): void {
    this.isDetailModalOpen = false;
  }

  public ngOnInit(): void {
    this.credentialType = getExtendedCredentialType(this.credentialInput$());
  }


  public async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toastService.showToast('vc-fields.copy-success');
    } catch (err) {
      console.error('Error al copiar', err);
    }
  }


  public qrView(): void {
    if (this.credentialInput$().lifeCycleStatus !== "EXPIRED") {
      this.walletService.getVCinCBOR(this.credentialInput$()).subscribe({
        next: (value: string) => {
          this.cred_cbor = value;
          this.isAlertOpenNotFound = false;
        },
        error: (error: unknown) => {
          console.error('Error fetching VC in CBOR format:', error);
          this.isAlertOpenNotFound = true;
        },
      });
    } else {
      this.isAlertExpirationOpenNotFound = true;
    }
  }

  public deleteVC(): void {
    this.isModalDeleteOpen = true;
    this.isDetailModalOpen = false;
  }

  public unsignedInfo(event: Event): void {
    event.stopPropagation();
    this.isModalUnsignedOpen = true;
  }

  public setOpen(isOpen: boolean): void {
    this.isModalOpen = isOpen;
  }

  public setOpenNotFound(isOpen: boolean): void {
    this.isAlertOpenNotFound = isOpen;
  }

  public setOpenDeleteNotFound(isOpen: boolean): void {
    this.isAlertOpenDeleteNotFound = isOpen;
  }

  public setOpenExpirationNotFound(isOpen: boolean): void {
    this.isAlertExpirationOpenNotFound = isOpen;
  }

  public handleKeydown(event: KeyboardEvent, action = 'request') {
    if (event.key === 'Enter' || event.key === ' ') {
      if (action === 'qr') {
        this.qrView();
      } 
      event.preventDefault();
    }
  }

  public handleButtonKeydown(event: KeyboardEvent, action: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      if (action === 'delete') {
        this.deleteVC();
      } else if (action === 'close') {
        this.setOpen(false);
      } else if (action === 'info') {
        this.unsignedInfo(event);
      } else if (action === 'detail') {
        this.openDetailModal();
      }
      event.preventDefault();
    }
  }

  get cardViewConfigByCredentialType(): CredentialMapConfig | undefined {
    const credType = this.credentialType;
    return isValidCredentialType(credType) ? CredentialTypeMap[credType] : undefined;
  }

  get iconUrl(): string | undefined {
    return this.cardViewConfigByCredentialType?.icon;
  }

  public getStructuredFields(): void {
    const cs = this.credentialInput$().credentialSubject;
    const vc = this.credentialInput$();

    const credentialInfo: EvaluatedSection = {
      section: 'vc-fields.title',
      fields: [
        { label: 'vc-fields.credentialInfo.context', value: Array.isArray(vc['@context']) ? vc['@context'].join(', ') : (vc['@context'] ?? '') },
        { label: 'vc-fields.credentialInfo.id', value: vc.id },
        { label: 'vc-fields.credentialInfo.type', value: Array.isArray(vc.type) ? vc.type.join(', ') : (vc.type ?? '') },
        { label: 'vc-fields.credentialInfo.name', value: vc.name ?? '' },
        { label: 'vc-fields.credentialInfo.description', value: vc.description ?? '' },
        { label: 'vc-fields.credentialInfo.issuerId', value: vc.issuer.id },
        { label: 'vc-fields.credentialInfo.issuerOrganization', value: vc.issuer.organization ?? '' },
        { label: 'vc-fields.credentialInfo.issuerCountry', value: vc.issuer.country ?? '' },
        { label: 'vc-fields.credentialInfo.issuerCommonName', value: vc.issuer.commonName ?? '' },
        { label: 'vc-fields.credentialInfo.issuerSerialNumber', value: vc.issuer?.serialNumber ?? '' },
        { label: 'vc-fields.credentialInfo.validFrom', value: this.formatDate(vc.validFrom) },
        { label: 'vc-fields.credentialInfo.validUntil', value: this.formatDate(vc.validUntil) }
      ].filter(field => !!field.value && field.value !== ''),
    };

    const entry = isValidCredentialType(this.credentialType) ? CredentialDetailMap[this.credentialType] : undefined;
    const evaluatedDetailedSections: EvaluatedSection[] = typeof entry === 'function'
      ? entry(cs, vc).map(section => ({
          section: section.section,
          fields: section.fields
            .map(f => ({
              label: f.label,
              value: f.valueGetter(cs, vc),
            }))
            .filter(f => !!f.value && f.value !== ''),
        }))
      : (entry ?? []).map(section => ({
          section: section.section,
          fields: section.fields
            .map(f => ({
              label: f.label,
              value: f.valueGetter(cs, vc),
            }))
            .filter(f => !!f.value && f.value !== ''),
        }));

    if((this.credentialType == 'LEARCredentialMachine' || this.credentialType == 'gx:LabelCredential') && vc.credentialEncoded) {
      evaluatedDetailedSections.push({
        section: 'vc-fields.credentialEncoded',
        fields: [
          { label: 'vc-fields.credentialEncoded', value: vc.credentialEncoded ?? '' }
        ]
      });

    }
    
    this.detailViewSections = [credentialInfo, ...evaluatedDetailedSections].filter(section => section.fields.length > 0);
  }

  private formatDate(date: string | undefined): string {
    if (!date) {
      return ''; 
    }
    return dayjs(date).format('DD/MM/YYYY');
  }


}