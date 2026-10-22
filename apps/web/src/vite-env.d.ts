/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Enables the component showcase in production builds. */
  readonly VITE_ENABLE_SHOWCASE?: string
  /** Turns on demo mode, which shows the palette picker. Off unless `true`. */
  readonly VITE_DEMO_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
