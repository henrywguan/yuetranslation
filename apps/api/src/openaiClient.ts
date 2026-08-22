import OpenAI from 'openai'
import { env, openaiConfigured } from './env.js'

/** Shared OpenAI client for translate and breakdown routes. */
export function openaiClient() {
  if (!openaiConfigured()) return null
  return new OpenAI({
    apiKey: env.openaiApiKey || 'ollama',
    ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {}),
  })
}

/** OpenAI client when the route already verified a key is present. */
export function openaiClientWithKey() {
  return new OpenAI({
    apiKey: env.openaiApiKey!,
    ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {}),
  })
}
