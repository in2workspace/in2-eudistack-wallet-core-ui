(function(window) {
    window["env"] = window["env"] || {};

    // Environment variables
    window["env"]["wcaUrl"] = "http://localhost:8081";
    window["env"]["dataUrl"] = "http://localhost:8086";
    window["env"]["loginUrl"] = "http://localhost:9099/realms/wallet";
    window["env"]["execContUri"] = "/api/v2/execute-content";
    window["env"]["vPUri"] = "/api/v2/verifiable-presentation";
    window["env"]["credUri"] = "/api/v2/credentials";
    window["env"]["credIdUri"] = "/api/v2/credentials?credentialId=";
    window["env"]["userUri"] = "/api/v2/users";
    window["env"]["debug"] = true;
    window["env"]["client_id"] = "auth-client";
    window["env"]["scope"] = "openid profile email offline_access";
    window["env"]["grant_type"] = "code";
    window["env"]["websocketUrl"] = "ws://localhost:8081";
    window["env"]["websocketUri"] = "/api/v2/pin";

  })(this);
