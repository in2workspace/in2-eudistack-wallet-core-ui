import { VerifiableCredential, ExtendedCredentialType, CredentialType } from "../interfaces/verifiable-credential";

export function getCredentialTypeAndAssignDefaultIfNeeded(vc: VerifiableCredential): CredentialType{
  const specificType: ExtendedCredentialType = getSpecificType(vc);
  return assignDefaultCredentialTypeIfNeeded(specificType);
}

export function getSpecificType(vc: VerifiableCredential): ExtendedCredentialType {
    const [a, b] = vc.type ?? [];
    if (a === 'VerifiableCredential') {
      return b;
    } else if (b === 'VerifiableCredential') {
      return a;
    } else {
      console.error('Invalid credential type: ');
      console.error(vc.type);
      return 'VerifiableCredential';
    }
}

export function assignDefaultCredentialTypeIfNeeded(actualType: ExtendedCredentialType): CredentialType {
    let credType = actualType;
    if(actualType === 'VerifiableCredential'){
      credType = 'LEARCredentialEmployee';
      console.warn('Using LEARCredentialEmployee as default');
    }
    return credType as CredentialType;
}