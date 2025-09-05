import { CredentialType } from "./verifiable-credential";

export interface DetailField {
  label: string;
  valueGetter: (subject: any, vc: any) => string;
}

export interface DetailSection {
  section: string;
  fields: DetailField[];
}

export interface EvaluatedField {
  label: string;
  value: string;
}

export interface EvaluatedSection {
  section: string;
  fields: EvaluatedField[];
}

export type CredentialDetailMapEntry =
  | DetailSection[]
  | ((subject: any, vc: any) => DetailSection[]);


export const CredentialDetailMap: Record<CredentialType, CredentialDetailMapEntry> = {
  LEARCredentialEmployee: (s) => [
    {
      section: 'vc-fields.learCredentialEmployee.mantadatee.title',
      fields: [
        { label: 'vc-fields.learCredentialEmployee.mantadatee.id', valueGetter: () => s.mandate?.mandatee?.id ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mantadatee.firstName', valueGetter: () => s.mandate?.mandatee?.firstName ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mantadatee.lastName', valueGetter: () => s.mandate?.mandatee?.lastName ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mantadatee.email', valueGetter: () => s.mandate?.mandatee?.email ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mantadatee.nationality', valueGetter: () => s.mandate?.mandatee?.nationality ?? '' },
      ],
    },
    {
      section: 'vc-fields.learCredentialEmployee.mandator.title',
      fields: [
        { label: 'vc-fields.learCredentialEmployee.mandator.id', valueGetter: () => s.mandate?.mandator?.id ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandator.organizationIdentifier', valueGetter: () => s.mandate?.mandator?.organizationIdentifier ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandator.organization', valueGetter: () => s.mandate?.mandator?.organization ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandator.commonName', valueGetter: () => s.mandate?.mandator?.commonName ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandator.serialNumber', valueGetter: () => s.mandate?.mandator?.serialNumber ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandator.country', valueGetter: () => s.mandate?.mandator?.country ?? '' }
      ],
    },
    {
    section: 'vc-fields.learCredentialEmployee.powers',
      fields: (s.mandate?.power ?? []).map((p: any, i: number) => ({
        label: `${p.function} (${p.domain})`,
        valueGetter: () =>
          `${Array.isArray(p.action) ? p.action.join(', ') : p.action}`,
      })),
    },
  ],

  LEARCredentialMachine: (s) => [
    {
      section: 'vc-fields.lear-credential-machine.mantadatee.title',
      fields: [
        { label: 'vc-fields.lear-credential-machine.mantadatee.domain', valueGetter: () => s.mandate?.mandatee?.domain ?? '' },
        { label: 'vc-fields.lear-credential-machine.mantadatee.ipAddress', valueGetter: () => s.mandate?.mandatee?.ipAddress ?? '' },
      ],
    },
    {
      section: 'vc-fields.lear-credential-machine.mandator.title',
      fields: [
        { label: 'vc-fields.lear-credential-machine.mandator.organizationIdentifier', valueGetter: () => s.mandate?.mandator?.organizationIdentifier ?? '' },
        { label: 'vc-fields.lear-credential-machine.mandator.organization', valueGetter: () => s.mandate?.mandator?.organization ?? '' },
        { label: 'vc-fields.lear-credential-machine.mandator.commonName', valueGetter: () => s.mandate?.mandator?.commonName ?? '' },
        { label: 'vc-fields.lear-credential-machine.mandator.serialNumber', valueGetter: () => s.mandate?.mandator?.serialNumber ?? '' },
        { label: 'vc-fields.lear-credential-machine.mandator.country', valueGetter: () => s.mandate?.mandator?.country ?? '' },
      ],
    },
    {
      section: 'vc-fields.lear-credential-machine.powers',
      fields: (s.mandate?.power ?? []).map((p: any, i: number) => ({
        label: `${p.function} (${p.domain})`,
        valueGetter: () =>
          `${Array.isArray(p.action) ? p.action.join(', ') : p.action}`,
      })),
    }
  ],

  'gx:LabelCredential': (s) => [
    {
      section: 'vc-fields.gaia-x-label-credential.label-info.title',
      fields: [
        { label: 'vc-fields.gaia-x-label-credential.label-info.id', valueGetter: (s) => s.id },
        { label: 'vc-fields.gaia-x-label-credential.label-info.lableLevel', valueGetter: (s) => s['gx:labelLevel'] },
        { label: 'vc-fields.gaia-x-label-credential.label-info.engineVersion', valueGetter: (s) => s['gx:engineVersion'] },
        { label: 'vc-fields.gaia-x-label-credential.label-info.rulesVersion', valueGetter: (s) => s['gx:rulesVersion'] },
      ],
    },
    {
      section: 'vc-fields.gaia-x-label-credential.compliantCredentials',
      fields: (s['gx:compliantCredentials'] ?? []).map((c: any, i: number) => ({
        label: `${c.type} (${c.id})`,
       valueGetter: () =>
        `${c['gx:digestSRI']}`,
      })),
    },
    {
      section: 'vc-fields.gaia-x-label-credential.validatedCriteria',
      fields: [
        {
          label: 'gx:validatedCriteria',
          valueGetter: (s) =>
            `${Array.isArray(s['gx:validatedCriteria']) ?s['gx:validatedCriteria'].join(', ') : s['gx:validatedCriteria']}`,
        },
      ],
    },
  ],
};
