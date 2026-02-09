(function (window) {
  window.env = window.env || {};

  // Environment variables
  window["env"]["server_url"] = "${WALLET_API_EXTERNAL_URL}";
  window["env"]["websocket_url"] = "${WALLET_API_WEBSOCKET_EXTERNAL_URL}";
  window["env"]["iam_url"] = "${IAM_EXTERNAL_URL}";
  window["env"]["logs_enabled"] = "${LOGS_ENABLED}";
  window["env"]["primary"] = "${PRIMARY}";
  window["env"]["primary_contrast"] = "${PRIMARY_CONTRAST}";
  window["env"]["secondary"] = "${SECONDARY}";
  window["env"]["secondary_contrast"] = "${SECONDARY_CONTRAST}";
  window["env"]["assets_base_url"]= "${ASSETS_BASE_URL}";
  window["env"]["logo_path"]= "${LOGO_PATH}";
  window["env"]["favicon_path"]= "${FAVICON_PATH}";
  window["env"]["default_lang"] =  "${DEFAULT_LANG}";
})(this);
