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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CredentialSubject, EmployeeCredentialSubject, ExtendedCredentialType, MachineCredentialSubject, VerifiableCredential } from 'src/app/interfaces/verifiable-credential';
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
  private readonly translate = inject(TranslateService);
  private readonly walletService = inject(WalletService);
  private readonly toastService = inject(ToastServiceHandler);

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
      text: this.translate.instant("vc-view.delete-cancel"),
      role: 'cancel',
      handler: () => {
        this.isModalDeleteOpen = false;
      },
    },
    {
      text: this.translate.instant("vc-view.delete-confirm"),
      role: 'confirm',
      handler: () => {
        this.isModalDeleteOpen = true;
        this.vcEmit.emit(this.credentialInput$());
      },
    },
  ];

  public unsignedButtons = [{
    text: this.translate.instant("vc-view.delete-close"),
    role: 'close',
    handler: () => {
      this.isModalUnsignedOpen = false;
    },
  }];

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
  const vc = this.credentialInput$();
  const cs = vc.credentialSubject;

  const credentialInfo: EvaluatedSection = {
    section: 'vc-fields.title',
    fields: [
      { label: 'vc-fields.credentialInfo.context', value: Array.isArray(vc['@context']) ? vc['@context'].join(', ') : (vc['@context'] ?? '') },
      { label: 'vc-fields.credentialInfo.id', value: vc.id },
      { label: 'vc-fields.credentialInfo.type', value: Array.isArray(vc.type) ? vc.type.join(', ') : (vc.type ?? '') },
      { label: 'vc-fields.credentialInfo.name', value: vc.name ?? '' },
      { label: 'vc-fields.credentialInfo.description', value: vc.description ?? '' },
      { label: 'vc-fields.credentialInfo.issuerId', value: typeof vc.issuer === 'string' ? vc.issuer : (vc.issuer?.id ?? '') }, // issuer may be json or string
      { label: 'vc-fields.credentialInfo.issuerOrganization', value: vc.issuer?.organization ?? '' },
      { label: 'vc-fields.credentialInfo.issuerOrganizationIdentifier', value: vc.issuer?.organizationIdentifier ?? '' },
      { label: 'vc-fields.credentialInfo.issuerCountry', value: vc.issuer?.country ?? '' },
      { label: 'vc-fields.credentialInfo.issuerCommonName', value: vc.issuer?.commonName ?? '' },
      { label: 'vc-fields.credentialInfo.issuerSerialNumber', value: vc.issuer?.serialNumber ?? '' },
      { label: 'vc-fields.credentialInfo.validFrom', value: this.formatDate(vc.validFrom) },
      { label: 'vc-fields.credentialInfo.validUntil', value: this.formatDate(vc.validUntil) }
    ].filter(field => !!field.value && field.value !== ''),
  };

  const entry = isValidCredentialType(this.credentialType)
    ? CredentialDetailMap[this.credentialType]
    : undefined;

  const evaluatedDetailedSections: EvaluatedSection[] =
    typeof entry === 'function'
      ? entry(cs as any, vc as any).map(section => ({
          section: section.section,
          fields: section.fields
            .map(f => ({
              label: f.label,
              value: f.valueGetter(cs as any, vc as any),
            }))
            .filter(f => !!f.value && f.value !== ''),
        }))
      : (entry ?? []).map(section => ({
          section: section.section,
          fields: section.fields
            .map(f => ({
              label: f.label,
              value: f.valueGetter(cs as any, vc as any),
            }))
            .filter(f => !!f.value && f.value !== ''),
        }));

  // Optionally append encoded credential section
  if ((this.credentialType === 'LEARCredentialMachine' || this.credentialType === 'gx:LabelCredential') && vc.credentialEncoded) {
    evaluatedDetailedSections.push({
      section: 'vc-fields.credentialEncoded',
      fields: [{ label: 'vc-fields.credentialEncoded', value: vc.credentialEncoded ?? '' }]
    });
  }

  // Translate "powers" sections (function + action values)
  const translatedDetailedSections = this.translatePowerSections(evaluatedDetailedSections, cs);

  this.detailViewSections = [credentialInfo, ...translatedDetailedSections]
    .filter(section => section.fields.length > 0);
}

private translatePowerSections(
  sections: EvaluatedSection[],
  subject: import('src/app/interfaces/verifiable-credential').CredentialSubject
): EvaluatedSection[] {
  const csPowers = this.hasMandate(subject) && Array.isArray(subject.mandate.power)
    ? subject.mandate.power
    : [];

  return sections.map(section => {
    if (!section.section.endsWith('.powers')) return section;

    const translatedFields = section.fields.map((field, idx) => {
      const p = csPowers[idx];
      if (!p) return field;

      const translatedFunction = this.translate.instant(`vc-fields.power.${p.function}`);
      const actions = Array.isArray(p.action) ? p.action : [p.action];
      const translatedActions = actions
        .map((a: string) => this.translate.instant(`vc-fields.power.${a}`))
        .join(', ');

      return {
        label: `${translatedFunction} (${p.domain})`,
        value: translatedActions,
      };
    });

    return { ...section, fields: translatedFields.filter(f => !!f.value && f.value !== '') };
  });
}

/** Type guard: subject has a mandate (employee or machine) */
private hasMandate(
  subject: CredentialSubject
): subject is EmployeeCredentialSubject
   | MachineCredentialSubject {
  return typeof (subject as any)?.mandate !== 'undefined';
}


  private formatDate(date: string | undefined): string {
    if (!date) {
      return ''; 
    }
    return dayjs(date).format('DD/MM/YYYY');
  }


}