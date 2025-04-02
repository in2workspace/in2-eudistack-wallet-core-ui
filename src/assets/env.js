(function (window) {
  window["env"] = window["env"] || {};

  // Environment variables
  window["env"]["server_url"] = 'http://localhost:8082';
  window["env"]["websocket_url"] = 'ws://localhost:8082';
  window["env"]["iam_url"] ='http://localhost:7002/realms/wallet';
  window["env"]["logs_enabled"] = "false";
  window["env"]["primary"] = "#00ADD3";
  window["env"]["primary_contrast"] = "#ffffff";
  window["env"]["secondary"] = "#50c8ff";
  window["env"]["secondary_contrast"] = "#000000";
  window["env"]["logo_src"] =  ""
  window["env"]["favicon_src"] =  "assets/icons/dome-favicon.png"
})(this);
