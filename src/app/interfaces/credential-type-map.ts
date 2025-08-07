export interface FieldConfig {
  label: string;
  valueGetter: (subject: any) => string;
}

export interface CredentialMapConfig {
  icon: string;
  fields: FieldConfig[];
}

export const CredentialTypeMap: Record<string, CredentialMapConfig> = {
  LEARCredentialEmployee: {
    icon: 'assets/icons/LearCredentialEmployee.png',
    fields: [
      { label: 'First Name', valueGetter: (s) => s.mandate.mandatee.firstName },
      { label: 'Last Name', valueGetter: (s) => s.mandate.mandatee.lastName },
      { label: 'Organization', valueGetter: (s) => s.mandate.mandator.organization }
    ],
  },
  LEARCredentialMachine: {
    icon: 'assets/icons/LearCredentialMachine.png',
    fields: [
      { label: 'IP Address', valueGetter: (s) => s.mandate.mandatee.ipAddress ?? '' },
      { label: 'Domain', valueGetter: (s) => s.mandate.mandatee.domain ?? '' },
      { label: 'Organization', valueGetter: (s) => s.mandate.mandator.organization }
    ],
  },
  'gx:LabelCredential': {
    icon: 'assets/icons/LabelCredential.png',
    fields: [
      { label: 'Label ID', valueGetter: (s) => {
        const id = s.id
        if (id) {
          const match = id.match(/^urn:ngsi-ld:([^:]+):/);
          return match ? match[1] : id;
        }
        return '';
      }}, 
      {
        label: 'Label Level',
        valueGetter: (s) => {
          const level = s['gx:labelLevel'];
          return level === 'BL' ? 'Base Line' : level;
        }
      }
    ],
  },
};
