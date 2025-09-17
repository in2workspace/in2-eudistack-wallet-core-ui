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
      section: 'vc-fields.learCredentialEmployee.mandatee.title',
      fields: [
        { label: 'vc-fields.learCredentialEmployee.mandatee.id', valueGetter: () => s.mandate?.mandatee?.id ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandatee.employeeId', valueGetter: () => s.mandate?.mandatee?.employeeId ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandatee.firstName', valueGetter: () => s.mandate?.mandatee?.firstName ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandatee.lastName', valueGetter: () => s.mandate?.mandatee?.lastName ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandatee.email', valueGetter: () => s.mandate?.mandatee?.email ?? '' }
      ],
    },
    {
      section: 'vc-fields.learCredentialEmployee.mandator.title',
      fields: [
        { label: 'vc-fields.learCredentialEmployee.mandator.id', valueGetter: () => s.mandate?.mandator?.id ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandator.commonName', valueGetter: () => s.mandate?.mandator?.commonName ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandator.email', valueGetter: () => s.mandate?.mandator?.email ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandator.serialNumber', valueGetter: () => s.mandate?.mandator?.serialNumber ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandator.organizationIdentifier', valueGetter: () => s.mandate?.mandator?.organizationIdentifier ?? '' },
        { label: 'vc-fields.learCredentialEmployee.mandator.organization', valueGetter: () => s.mandate?.mandator?.organization ?? '' },
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
      section: 'vc-fields.lear-credential-machine.mandatee.title',
      fields: [
        { label: 'vc-fields.lear-credential-machine.mandatee.id', valueGetter: () => s.mandate?.mandatee?.id ?? '' },
        { label: 'vc-fields.lear-credential-machine.mandatee.domain', valueGetter: () => s.mandate?.mandatee?.domain ?? '' },
        { label: 'vc-fields.lear-credential-machine.mandatee.ipAddress', valueGetter: () => s.mandate?.mandatee?.ipAddress ?? '' },
      ],
    },
    {
      section: 'vc-fields.lear-credential-machine.mandator.title',
      fields: [
        { label: 'vc-fields.lear-credential-machine.mandator.id', valueGetter: () => s.mandate?.mandator?.id ?? '' },
        { label: 'vc-fields.lear-credential-machine.mandator.commonName', valueGetter: () => s.mandate?.mandator?.commonName ?? '' },
        { label: 'vc-fields.lear-credential-machine.mandator.email', valueGetter: () => s.mandate?.mandator?.email ?? '' },
        { label: 'vc-fields.lear-credential-machine.mandator.serialNumber', valueGetter: () => s.mandate?.mandator?.serialNumber ?? '' },
        { label: 'vc-fields.lear-credential-machine.mandator.organization', valueGetter: () => s.mandate?.mandator?.organization ?? '' },
        { label: 'vc-fields.lear-credential-machine.mandator.organizationIdentifier', valueGetter: () => s.mandate?.mandator?.organizationIdentifier ?? '' },
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
        { label: 'vc-fields.gaia-x-label-credential.label-info.labelLevel', valueGetter: (s) => { 
          const level = s['gx:labelLevel'];
          return level === 'BL' ? 'Base Line' : level;
        }},
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
