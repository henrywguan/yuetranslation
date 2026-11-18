import type { Entitlement } from './types'

/**
 * Ensure `entitlement.allowed` always exists.
 *
 * Family unlock / health races (and any partial client-side setState) can leave
 * `entitlement` without `allowed`. Reading `.live` / `.tts` / `.autoSpeak` then
 * throws and blanks `#root` (no error boundary).
 */
export function normalizeEntitlement(ent: Entitlement): Entitlement {
  const allowed = ent.allowed
  if (allowed && typeof allowed === 'object') {
    return {
      ...ent,
      allowed: {
        live: Boolean(allowed.live),
        autoSpeak: Boolean(allowed.autoSpeak),
        textTranslate: Boolean(allowed.textTranslate),
        tts: Boolean(allowed.tts),
        camera: allowed.camera,
        docs: allowed.docs,
        aiVision: allowed.aiVision,
        chat: allowed.chat,
      },
    }
  }

  const plan = ent.plan
  const chat =
    Boolean(ent.isAdmin) || plan === 'family' || plan === 'business'
  return {
    ...ent,
    allowed: {
      live: Boolean(ent.limits?.can_live),
      autoSpeak: Boolean(ent.limits?.auto_speak),
      textTranslate: Boolean(ent.limits?.text_translate ?? true),
      tts: Boolean(ent.ttsUnlimited || plan === 'family' || plan === 'business' || ent.limits?.auto_speak),
      camera: ent.limits?.can_camera,
      docs: ent.limits?.can_docs,
      aiVision: undefined,
      chat,
    },
  }
}
