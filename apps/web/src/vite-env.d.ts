/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_BASE_PATH?: string
  readonly VITE_TRANSLATOR_URL?: string
  readonly VITE_PRICING_URL?: string
  readonly VITE_MARKETING_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
