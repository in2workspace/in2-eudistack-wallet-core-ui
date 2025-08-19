import { VerifiableCredential, ExtendedCredentialType, CredentialType, CREDENTIAL_TYPES_ARRAY } from "../interfaces/verifiable-credential";

export function isValidCredentialType(credType: string): credType is CredentialType{
  return CREDENTIAL_TYPES_ARRAY.includes(credType as CredentialType);
}

export function getExtendedCredentialType(vc: VerifiableCredential): ExtendedCredentialType {
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