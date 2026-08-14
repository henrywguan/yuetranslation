import 'dotenv/config'

function trimUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

export const env = {
  port: Number(process.env.PORT || 8787),
  azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
  azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'eastasia',
  /** OpenAI or any OpenAI-compatible key (Ollama accepts any non-empty value, e.g. `ollama`). */
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  /**
   * Optional OpenAI-compatible base URL.
   * Examples:
   * - OpenAI default (omit): https://api.openai.com/v1
   * - Ollama: http://127.0.0.1:11434/v1
   * - OpenRouter: https://openrouter.ai/api/v1
   */
  openaiBaseUrl: trimUrl(process.env.OPENAI_BASE_URL || ''),
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  freeLiveMinutes: Number(process.env.YUE_FREE_LIVE_MINUTES || 20),
  freeTtsChars: Number(process.env.YUE_FREE_TTS_CHARS || 0),
  freeAllowLive: (process.env.YUE_FREE_ALLOW_LIVE || '1') === '1',
  freeAllowTts: (process.env.YUE_FREE_ALLOW_TTS || '0') === '1',
  openMode: (process.env.YUE_OPEN_MODE || '1') === '1',
}

/** True when a chat backend is configured (OpenAI cloud or compatible host like Ollama). */
export function openaiConfigured() {
  return Boolean(env.openaiApiKey || env.openaiBaseUrl)
}

export function cloudReady() {
  return Boolean(env.azureSpeechKey && openaiConfigured())
}
