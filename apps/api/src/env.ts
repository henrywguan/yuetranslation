import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 8787),
  azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
  azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'eastasia',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  freeLiveMinutes: Number(process.env.YUE_FREE_LIVE_MINUTES || 20),
  freeTtsChars: Number(process.env.YUE_FREE_TTS_CHARS || 0),
  freeAllowLive: (process.env.YUE_FREE_ALLOW_LIVE || '1') === '1',
  freeAllowTts: (process.env.YUE_FREE_ALLOW_TTS || '0') === '1',
  openMode: (process.env.YUE_OPEN_MODE || '1') === '1',
};

export function cloudReady() {
  return Boolean(env.azureSpeechKey && env.openaiApiKey);
}
