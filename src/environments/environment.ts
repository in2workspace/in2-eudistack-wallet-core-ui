// this environment is the one used in development mode ("ng serve")
export const environment = {
  production: false,
  server_url: 'http://localhost:8082',
  websocket_url: 'ws://localhost:8082',
  iam_url: 'http://localhost:7002/realms/wallet',
  logs_enabled: false,
  customizations:{
    colors:{ 
      primary:'#1b3891 ',
      primary_contrast:'#40a2d0',
      secondary:'#40a2d0',
      secondary_contrast:'#444444'
    },
    logo_src: "assets/logos/altia-logo.png",
    favicon_src: "assets/icons/altia-favicon.ico"
  }
};
