const apiV1Path = '/api/v1';

  export const WEBSOCKET_PIN_PATH = `${apiV1Path}/pin`;
  export const WEBSOCKET_NOTIFICATION_PATH = `${apiV1Path}/notification`;


export const SERVER_PATH = Object.freeze({
  CBOR : `${apiV1Path}/vp/cbor`,
  CREDENTIALS: `${apiV1Path}/credentials`,
  CREDENTIALS_SIGNED_BY_ID: `${apiV1Path}/request-signed-credential`,
  EXECUTE_CONTENT: `${apiV1Path}/execute-content`,
  REQUEST_CREDENTIAL: `${apiV1Path}/openid-credential-offer`,
  VERIFIABLE_PRESENTATION: `${apiV1Path}/vp`
});