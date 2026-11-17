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

/**
 * DeepSeek Chat Prefix Completion needs the `/beta` base.
 * https://api-docs.deepseek.com/guides/chat_prefix_completion/
 */
export function openaiBetaClient() {
  if (!openaiConfigured()) return null
  const raw = (env.openaiBaseUrl || 'https://api.deepseek.com').trim().replace(/\/+$/, '')
  const root = raw.replace(/\/v1$/i, '').replace(/\/beta$/i, '')
  return new OpenAI({
    apiKey: env.openaiApiKey || 'ollama',
    baseURL: `${root || 'https://api.deepseek.com'}/beta`,
  })
}
