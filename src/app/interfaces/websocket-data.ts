interface PinRequestData {
  tx_code: any;
  timeout?: number;
}

interface NotificationData {
  decision: boolean;
  credentialPreview?: {
    subjectName?: string;
    organization?: string;
    issuer?: string;
    expirationDate?: string;
  };
  timeout?: number;
  expiresAt?: number;
}

export function isPinRequest(data: any): data is PinRequestData {
  return data && typeof data.tx_code !== 'undefined';
}

export function isNotificationRequest(data: any): data is NotificationData {
  return data && typeof data.decision !== 'undefined';
}