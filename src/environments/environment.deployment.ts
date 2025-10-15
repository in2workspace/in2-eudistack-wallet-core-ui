// this file is the used when deploying (see Dockerfile);
// its values will be overwriten by env variables (see env.js & env.template.js)
export const environment = {
  production: true,
  server_url: window["env"]["server_url"] || "", // REQUIRED --added empty string fallback to avoid error from Auth library when building
  websocket_url: window["env"]["websocket_url"], // REQUIRED
  iam_url: window["env"]["iam_url"] || "", // REQUIRED --added string fallback to avoid error from Auth library when building
  logs_enabled: window["env"]["logs_enabled"] === "true" || false, //OPTIONAL WITH fallback
  customizations:{  
    colors:{ 
      primary: window["env"]["primary"] || '#00ADD3', //OPTIONAL WITH fallback
      primary_contrast: window["env"]["primary_contrast"] ||'#ffffff', //OPTIONAL WITH fallback
      secondary: window["env"]["secondary"] || '#50c8ff', //OPTIONAL WITH fallback
      secondary_contrast: window["env"]["secondary_contrast"] || '#000000' //OPTIONAL WITH fallback
    },
    logo_src: window["env"]["logo_src"], // REQUIRED
    favicon_src: window["env"]["favicon_src"] || "assets/icons/dome-favicon.png" // OPTIONAL with fallback
    default_lang: window["env"]["default_lang"] || "en" // OPTIONAL with fallback
  }
};
