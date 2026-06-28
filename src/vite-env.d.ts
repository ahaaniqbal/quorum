/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string;
  readonly VITE_CONVEX_SITE_URL: string;
  readonly VITE_VAPI_PUBLIC_KEY: string;
  readonly VITE_VAPI_ASSISTANT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
