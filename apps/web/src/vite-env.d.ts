/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Enables the component showcase in production builds. */
  readonly VITE_ENABLE_SHOWCASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
