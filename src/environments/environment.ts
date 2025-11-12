// this environment is the one used in development mode ("ng serve")
export const environment = {
  production: false,
  server_url: 'http://localhost:8082',
  websocket_url: 'ws://localhost:8082',
  iam_url: 'http://localhost:7002/realms/wallet',
  logs_enabled: false,
  customizations:{
    colors:{ 
      primary:'#B88EFF',
      primary_contrast:'#000000',
      secondary:'#76F276',
      secondary_contrast:'#F9F3E7'
    },
    logo_src: "assets/logos/isbe-logo.svg",
    favicon_src: "assets/icons/isbe-favicon.svg",
    default_lang: "en"
  }
};
