import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 8787),
  azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
  azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'eastasia',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  /** OpenAI-compatible base URL (e.g. https://api.deepseek.com/v1). Empty = official OpenAI. */
  openaiBaseUrl: process.env.OPENAI_BASE_URL || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  /**
   * Allow loading dictionaries under non-commercial licenses (words.hk).
   * Keep off for paid/ad-supported commercial deployments unless you have a separate license.
   */
  allowNoncommercialDicts: (process.env.YUE_ALLOW_NONCOMMERCIAL_DICTS || '0') === '1',
  /** Load words.hk gloss pack when present AND non-commercial gate is open. */
  enableWordshk: (process.env.YUE_ENABLE_WORDSHK || '0') === '1',
  freeLiveMinutes: Number(process.env.YUE_FREE_LIVE_MINUTES || 20),
  freeTtsChars: Number(process.env.YUE_FREE_TTS_CHARS || 0),
  freeAllowLive: (process.env.YUE_FREE_ALLOW_LIVE || '1') === '1',
  freeAllowTts: (process.env.YUE_FREE_ALLOW_TTS || '0') === '1',
  openMode: (process.env.YUE_OPEN_MODE || '1') === '1',
};

export function cloudReady() {
  return Boolean(env.azureSpeechKey && env.openaiApiKey);
}
