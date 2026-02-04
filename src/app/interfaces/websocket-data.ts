interface PinRequestData {
  tx_code: any;
  timeout?: number;
}

export interface Power {
  function: string;
  action: string[];
}

export interface CredentialPreview {
  power: Power[];
  subjectName: string;
  organization: string;
  expirationDate: string;
}


export interface NotificationData {
  decision: boolean;
  credentialPreview?: CredentialPreview;
  timeout?: number;
  expiresAt?: number;
}

export function isPinRequest(data: any): data is PinRequestData {
  return data && typeof data.tx_code !== 'undefined';
}

export function isNotificationRequest(data: any): data is NotificationData {
  return data && typeof data.decision !== 'undefined';
}