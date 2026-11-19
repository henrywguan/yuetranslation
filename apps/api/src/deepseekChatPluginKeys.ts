/**
 * Per-user BYOK secrets for #/chat generation plugins + inbox sandboxes/GitHub.
 * Stored AES-256-GCM encrypted (service-role only). GET never returns raw keys.
 *
 * Key IDs (Plugins → API keys UI):
 *   gemini, image, higgsfield, adobe, cursor
 *   fly, fly_app
 *   github_app_id, github_app_private_key, github_app_installation_id
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { env } from './env.js'
import { getAdmin } from './supabase.js'

export const CHAT_PLUGIN_KEY_IDS = [
  'gemini',
  'image',
  'higgsfield',
  'adobe',
  'cursor',
  'fly',
  'fly_app',
  'github_app_id',
  'github_app_private_key',
  'github_app_installation_id',
] as const
export type ChatPluginKeyId = (typeof CHAT_PLUGIN_KEY_IDS)[number]

export type ChatPluginCredentials = Partial<Record<ChatPluginKeyId, string>>

export type ChatPluginKeyHint = {
  set: boolean
  /** Last 4 chars when set (safe to show in UI). */
  hint?: string
}

const CredsSchema = z.object({
  gemini: z.string().trim().min(1).max(512).optional(),
  image: z.string().trim().min(1).max(512).optional(),
  higgsfield: z.string().trim().min(1).max(2048).optional(),
  adobe: z.string().trim().min(1).max(2048).optional(),
  cursor: z.string().trim().min(1).max(2048).optional(),
  /** Fly Machines API token (BYO). */
  fly: z.string().trim().min(1).max(512).optional(),
  /** Fly app name hosting Machines (BYO; paired with `fly`). */
  fly_app: z.string().trim().min(1).max(128).optional(),
  github_app_id: z.string().trim().min(1).max(64).optional(),
  /** PEM private key; newlines may be literal or `\n`. */
  github_app_private_key: z.string().trim().min(1).max(16_384).optional(),
  github_app_installation_id: z.string().trim().min(1).max(64).optional(),
})

/** In-memory fallback when Supabase is unavailable (openMode / local). */
const MEMORY = new Map<string, ChatPluginCredentials>()

function secretsKey(): Buffer {
  const raw = (
    env.chatSecretsKey ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'yue-dev-chat-secrets'
  ).trim()
  return createHash('sha256').update(raw).digest()
}

function encryptJson(payload: ChatPluginCredentials): { ciphertext: string; iv: string } {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', secretsKey(), iv)
  const plain = Buffer.from(JSON.stringify(payload), 'utf8')
  const enc = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    iv: iv.toString('base64'),
    ciphertext: Buffer.concat([enc, tag]).toString('base64'),
  }
}

function decryptJson(ciphertextB64: string, ivB64: string): ChatPluginCredentials {
  const buf = Buffer.from(ciphertextB64, 'base64')
  if (buf.length < 17) throw new Error('Invalid ciphertext')
  const data = buf.subarray(0, buf.length - 16)
  const tag = buf.subarray(buf.length - 16)
  const iv = Buffer.from(ivB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', secretsKey(), iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  const parsed = CredsSchema.safeParse(JSON.parse(plain))
  if (!parsed.success) return {}
  return scrubCreds(parsed.data)
}

function scrubCreds(raw: ChatPluginCredentials): ChatPluginCredentials {
  const out: ChatPluginCredentials = {}
  for (const id of CHAT_PLUGIN_KEY_IDS) {
    const v = raw[id]?.trim()
    if (v) out[id] = v
  }
  return out
}

export function parseChatPluginCredentialsBody(body: unknown): {
  ok: true
  creds: ChatPluginCredentials
  clear: ChatPluginKeyId[]
} | { ok: false; message: string } {
  if (!body || typeof body !== 'object') return { ok: false, message: 'Invalid body.' }
  const clearRaw = (body as { clear?: unknown }).clear
  const clear: ChatPluginKeyId[] = []
  if (Array.isArray(clearRaw)) {
    for (const id of clearRaw) {
      if (CHAT_PLUGIN_KEY_IDS.includes(id as ChatPluginKeyId)) clear.push(id as ChatPluginKeyId)
    }
  }
  const keysRaw = (body as { keys?: unknown }).keys
  if (keysRaw === undefined && !clear.length) {
    return { ok: false, message: 'Provide keys and/or clear.' }
  }
  if (keysRaw !== undefined) {
    const parsed = CredsSchema.safeParse(keysRaw)
    if (!parsed.success) return { ok: false, message: 'Invalid key fields.' }
    return { ok: true, creds: scrubCreds(parsed.data), clear }
  }
  return { ok: true, creds: {}, clear }
}

export function hintForSecret(secret: string | undefined): ChatPluginKeyHint {
  if (!secret) return { set: false }
  const trimmed = secret.trim()
  if (!trimmed) return { set: false }
  const hint = trimmed.length <= 4 ? trimmed : trimmed.slice(-4)
  return { set: true, hint }
}

export function emptyChatPluginKeyHints(): Record<ChatPluginKeyId, ChatPluginKeyHint> {
  const out = {} as Record<ChatPluginKeyId, ChatPluginKeyHint>
  for (const id of CHAT_PLUGIN_KEY_IDS) out[id] = { set: false }
  return out
}

export function credentialsToHints(creds: ChatPluginCredentials): Record<ChatPluginKeyId, ChatPluginKeyHint> {
  const out = emptyChatPluginKeyHints()
  for (const id of CHAT_PLUGIN_KEY_IDS) {
    out[id] = hintForSecret(creds[id])
  }
  return out
}

/** Resolve Fly Machines auth: per-user plugin keys first, then server env. */
export function resolveFlyCreds(creds?: ChatPluginCredentials | null): {
  token: string
  app: string
  source: 'byo' | 'env'
} | null {
  const byoToken = creds?.fly?.trim() || ''
  const byoApp = creds?.fly_app?.trim() || ''
  if (byoToken && byoApp) return { token: byoToken, app: byoApp, source: 'byo' }
  const envToken = env.flyApiToken.trim()
  const envApp = env.flyApp.trim()
  if (envToken && envApp) return { token: envToken, app: envApp, source: 'env' }
  // Allow mixing BYO token with env app name (or vice versa) for convenience.
  const token = byoToken || envToken
  const app = byoApp || envApp
  if (token && app) return { token, app, source: byoToken || byoApp ? 'byo' : 'env' }
  return null
}

/** Resolve GitHub App auth: per-user plugin keys first, then server env (field-wise fill). */
export function resolveGithubAppCreds(creds?: ChatPluginCredentials | null): {
  appId: string
  privateKey: string
  installationId: string
  source: 'byo' | 'env' | 'mixed'
} | null {
  const byoId = creds?.github_app_id?.trim() || ''
  const byoKey = creds?.github_app_private_key?.trim() || ''
  const byoInst = creds?.github_app_installation_id?.trim() || ''
  const appId = byoId || env.githubAppId.trim()
  const privateKey = byoKey || env.githubAppPrivateKey.trim()
  const installationId = byoInst || env.githubAppInstallationId.trim()
  if (!appId || !privateKey || !installationId) return null
  const byoCount = [byoId, byoKey, byoInst].filter(Boolean).length
  const source = byoCount === 3 ? 'byo' : byoCount === 0 ? 'env' : 'mixed'
  return { appId, privateKey, installationId, source }
}

export async function loadChatPluginCredentials(userId: string): Promise<ChatPluginCredentials> {
  const mem = MEMORY.get(userId)
  const client = getAdmin()
  if (!client) return mem ? { ...mem } : {}

  const { data, error } = await client
    .from('chat_plugin_keys')
    .select('ciphertext, iv')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data?.ciphertext || !data?.iv) {
    return mem ? { ...mem } : {}
  }
  try {
    const creds = decryptJson(String(data.ciphertext), String(data.iv))
    MEMORY.set(userId, creds)
    return creds
  } catch {
    return mem ? { ...mem } : {}
  }
}

export async function saveChatPluginCredentials(
  userId: string,
  patch: ChatPluginCredentials,
  clear: ChatPluginKeyId[] = [],
): Promise<ChatPluginCredentials> {
  const current = await loadChatPluginCredentials(userId)
  const next: ChatPluginCredentials = { ...current }
  for (const id of clear) delete next[id]
  for (const id of CHAT_PLUGIN_KEY_IDS) {
    const v = patch[id]?.trim()
    if (v) next[id] = v
  }
  const scrubbed = scrubCreds(next)
  MEMORY.set(userId, scrubbed)

  const client = getAdmin()
  if (!client) return scrubbed

  if (!Object.keys(scrubbed).length) {
    await client.from('chat_plugin_keys').delete().eq('user_id', userId)
    return {}
  }

  const { ciphertext, iv } = encryptJson(scrubbed)
  const { error } = await client.from('chat_plugin_keys').upsert(
    {
      user_id: userId,
      ciphertext,
      iv,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) {
    // Table may not be migrated yet — memory still works for this process.
    console.warn('[deepseek-chat] chat_plugin_keys upsert failed', error.message)
  }
  return scrubbed
}
