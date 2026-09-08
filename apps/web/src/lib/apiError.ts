/** Shown when Vercel (or similar) returns a bot-challenge HTML page instead of JSON. */
export const SECURITY_CHECKPOINT_MESSAGE =
  'Security check interrupted the request. Refresh the page and try again.'

const MAX_ERROR_CHARS = 220

export function isHtmlOrCheckpoint(body: string): boolean {
  const text = body.trim()
  if (!text) return false
  if (/Vercel Security Checkpoint/i.test(text)) return true
  if (/verifying your browser/i.test(text)) return true
  if (/Enable JavaScript to continue/i.test(text)) return true
  if (/<!DOCTYPE html/i.test(text)) return true
  if (/^<html[\s>]/i.test(text)) return true
  return false
}

export function messageFromApiBody(status: number, body: string, fallback = 'Request failed'): string {
  const text = body.trim()
  if (!text) return `${fallback} (${status})`
  if (isHtmlOrCheckpoint(text)) return SECURITY_CHECKPOINT_MESSAGE

  try {
    const data = JSON.parse(text) as { message?: unknown; error?: unknown; code?: unknown }
    if (typeof data.message === 'string' && data.message.trim()) {
      return clampError(data.message.trim())
    }
    if (typeof data.error === 'string' && data.error.trim()) {
      return clampError(data.error.trim())
    }
    if (typeof data.code === 'string' && data.code.trim()) {
      return clampError(data.code.trim())
    }
  } catch {
    /* not JSON */
  }

  if (text.startsWith('<')) return SECURITY_CHECKPOINT_MESSAGE
  return clampError(text)
}

export function humanizeThrownError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return sanitizeErrorMessage(raw)
}

export function sanitizeErrorMessage(raw: string): string {
  const text = raw.replace(/^Error:\s*/i, '').trim()
  if (!text) return 'Request failed'
  if (
    isHtmlOrCheckpoint(text) ||
    ((/Unexpected token/i.test(text) || /is not valid JSON/i.test(text)) && text.includes('<'))
  ) {
    return SECURITY_CHECKPOINT_MESSAGE
  }
  return clampError(text)
}

function clampError(text: string): string {
  if (text.length <= MAX_ERROR_CHARS) return text
  return `${text.slice(0, MAX_ERROR_CHARS).trimEnd()}…`
}
