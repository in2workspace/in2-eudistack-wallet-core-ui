// this environment is the one used in development mode ("ng serve")
export const environment = {
  production: false,
  server_url: 'http://localhost:8082',
  websocket_url: 'ws://localhost:8082',
  iam_url: 'http://localhost:7002/realms/wallet',
  logs_enabled: false,
  customizations:{
    colors:{ 
      primary:'#00ADD3',
      primary_contrast:'#ffffff',
      secondary:'#50c8ff',
      secondary_contrast:'#000000'
    },
    logo_src: "assets/logos/dome-logo.png",
    favicon_src: "assets/icons/dome-favicon.png",
    default_lang: "en"
  }
};
