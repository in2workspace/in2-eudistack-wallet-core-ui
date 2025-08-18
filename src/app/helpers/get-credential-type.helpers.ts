import { VerifiableCredential, ExtendedCredentialType, CredentialType, CREDENTIAL_TYPES_ARRAY } from "../interfaces/verifiable-credential";

export function getCredentialTypeAndAssignDefaultIfNeeded(vc: VerifiableCredential): CredentialType {
  const specificType: ExtendedCredentialType = getExtendedType(vc);
  return assignDefaultCredentialTypeIfNeeded(specificType);
}

export function getExtendedType(vc: VerifiableCredential): ExtendedCredentialType {
    const [a, b] = vc.type ?? [];
    if(CREDENTIAL_TYPES_ARRAY.includes(a as CredentialType)){
      return a;
    }else if (CREDENTIAL_TYPES_ARRAY.includes(b as CredentialType)) {
      return b;
    } else {
      console.error("Invalid credential type.");
      console.error(vc.type);
      console.warn("Using 'VerifiableCredential' as default.");
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