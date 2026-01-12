// src/types/global.d.ts

interface Window {
    env: {
      server_url?: string;
      websocket_url?: string;
      iam_url?: string;
      logs_enabled?: string;
      primary: string;
      primary_contrast: string;
      secondary: string;
      secondary_contrast: string;
      images_base_url?: string;
      logo_path?: string;
      favicon_path?: string;
      default_lang: string;
    };
  }
  