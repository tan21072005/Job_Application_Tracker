/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: string;
  readonly VITE_ENTERPRISE_MODULES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
