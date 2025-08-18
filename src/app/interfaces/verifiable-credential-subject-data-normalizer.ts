import { Mandatee, Power, CredentialSubject, CredentialType } from './verifiable-credential';

// Interfaces for the raw JSON of Mandatee and Power
interface RawMandatee {
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  email?: string;
  nationality?: string;
}

interface RawPower {
  action?: string | string[];
  tmf_action?: string | string[];
  domain?: string;
  tmf_domain?: string;
  function?: string;
  tmf_function?: string;
  type?: string;
  tmf_type?: string;
}

export class VerifiableCredentialSubjectDataNormalizer {

  /**
   * Normalizes the complete LearCredentialEmployeeDataDetail object.
   * It applies normalization to the mandatee object and each element of the power array.
   */
  public normalizeLearCredentialSubject(data: CredentialSubject, type: CredentialType): CredentialSubject {
    return this.normalizerMapByCredentialType[type](data);
  }

  private normalizerMapByCredentialType: Record<CredentialType, (s: CredentialSubject) => CredentialSubject> = {
    'LEARCredentialEmployee': (s: CredentialSubject) => this.normalizeLearCredentialEmployeeSubject(s),
    'LEARCredentialMachine': (s: CredentialSubject) => s,
    'gx:LabelCredential': (s: CredentialSubject) => s
  } as const;

    private normalizeLearCredentialEmployeeSubject(data: CredentialSubject): CredentialSubject {
    console.log('Received subject');
    console.log(structuredClone(data));
    // Create a copy to avoid modifying the original object
    const normalizedData = { ...data };

    if ('mandate' in normalizedData && normalizedData.mandate) {

      const mandate = normalizedData.mandate;

      if (mandate.mandatee) {
        // Apply normalization on the mandatee object
        mandate.mandatee = this.normalizeMandatee(mandate.mandatee);
      }

      if (mandate.power && Array.isArray(mandate.power)) {
        // Normalize each power object in the array
        mandate.power = mandate.power.map((p: RawPower) => this.normalizePower(p));
      }
    }
    console.log('returned subject normalized')
    console.log(normalizedData)
    return normalizedData;
  }

  /**
 * Normalizes the mandatee object by unifying "firstName"/"first_name" and "lastName"/"last_name" keys.
 */
private normalizeMandatee(data: RawMandatee): Mandatee {
  return <Mandatee>{
    firstName: data.firstName ?? data.first_name,
    lastName: data.lastName ?? data.last_name,
    email: data.email
  };
}

/**
 * Normalizes a power object by unifying keys like "action"/"tmf_action", "domain"/"tmf_domain", etc.
 */
private normalizePower(data: RawPower): Power {
  return <Power>{
    action: data.action ?? data.tmf_action,
    domain: data.domain ?? data.tmf_domain,
    function: data.function ?? data.tmf_function,
    type: data.type ?? data.tmf_type
  };
}
}
