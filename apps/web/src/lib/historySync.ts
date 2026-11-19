import type { ConversationTurn, Lang } from './types'
import { fetchAccountHistory, putAccountHistory } from './api'
import {
  MAX_TURNS,
  expireHistoryTurns,
  mergeHistory,
  shouldPushHydratedHistory,
} from './historyMerge'

export { expireHistoryTurns, mergeHistory, shouldPushHydratedHistory }

const LOCAL_KEY = 'yue-translation-history-v1'

function isLang(v: unknown): v is Lang {
  return (
    v === 'en' ||
    v === 'yue' ||
    v === 'cmn' ||
    v === 'wuu' ||
    v === 'sichuan' ||
    v === 'tl' ||
    v === 'es' ||
    v === 'eses' ||
    v === 'vi' ||
    v === 'th' ||
    v === 'lo' ||
    v === 'ko' ||
    v === 'ja' ||
    v === 'id' ||
    v === 'ms' ||
    v === 'pt' ||
    v === 'fr' ||
    v === 'hi' ||
    v === 'km' ||
    v === 'my' ||
    v === 'jv' ||
    v === 'it' ||
    v === 'de' ||
    v === 'nl' ||
    v === 'ar' ||
    v === 'arsa' ||
    v === 'ta' ||
    v === 'ptpt' ||
    v === 'tr' ||
    v === 'bn' ||
    v === 'te' ||
    v === 'gu' ||
    v === 'kn' ||
    v === 'pl' ||
    v === 'ro' ||
    v === 'cs' ||
    v === 'el' ||
    v === 'hu' ||
    v === 'sv' ||
    v === 'ru' ||
    v === 'uk' ||
    v === 'he' ||
    v === 'fa' ||
    v === 'ur' ||
    v === 'ml' ||
    v === 'mr' ||
    v === 'pa' ||
    v === 'or' ||
    v === 'si' ||
    v === 'ne' ||
    v === 'da' ||
    v === 'nb' ||
    v === 'fi' ||
    v === 'sk' ||
    v === 'hr' ||
    v === 'ca' ||
    v === 'az' ||
    v === 'kk' ||
    v === 'uz' ||
    v === 'bg' ||
    v === 'sr' ||
    v === 'sw' ||
    v === 'af' ||
    v === 'et' ||
    v === 'lv' ||
    v === 'lt' ||
    v === 'ga' ||
    v === 'cy' ||
    v === 'eu' ||
    v === 'gl' ||
    v === 'mt' ||
    v === 'is' ||
    v === 'bs' ||
    v === 'sq' ||
    v === 'zu' ||
    v === 'so' ||
    v === 'as' ||
    v === 'mk' ||
    v === 'mn' ||
    v === 'ps' ||
    v === 'hy' ||
    v === 'ka' ||
    v === 'am' ||
    v === 'ceb' ||
    v === 'ilo' ||
    v === 'bcl' ||
    v === 'hak' ||
    v === 'teo' ||
    v === 'nan'
  )
}

/** Best-effort sanitize of turns from localStorage / API. */
export function sanitizeTurns(raw: unknown): ConversationTurn[] {
  if (!Array.isArray(raw)) return []
  const out: ConversationTurn[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const t = item as Record<string, unknown>
    if (typeof t.id !== 'string' || !t.id) continue
    if (!isLang(t.from) || !isLang(t.to)) continue
    if (typeof t.source !== 'string' || typeof t.translation !== 'string') continue
    // Require a real timestamp so we never "refresh" stale turns to now.
    if (typeof t.at !== 'number' || !Number.isFinite(t.at)) continue
    const turn: ConversationTurn = {
      id: t.id,
      from: t.from,
      to: t.to,
      source: t.source,
      translation: t.translation,
      at: t.at,
    }
    if (typeof t.definition === 'string') turn.definition = t.definition
    if (Array.isArray(t.definitions)) {
      turn.definitions = t.definitions.filter((x): x is string => typeof x === 'string')
    }
    if (Array.isArray(t.alternatives)) {
      turn.alternatives = t.alternatives.filter((x): x is string => typeof x === 'string')
    }
    if (typeof t.romanization === 'string') turn.romanization = t.romanization
    if (typeof t.sandhiHint === 'string') turn.sandhiHint = t.sandhiHint
    if (typeof t.ipa === 'string') turn.ipa = t.ipa
    if (Array.isArray(t.alternativeRomanizations)) {
      turn.alternativeRomanizations = t.alternativeRomanizations.filter(
        (x): x is string => typeof x === 'string',
      )
    }
    out.push(turn)
  }
  return expireHistoryTurns(out).slice(0, MAX_TURNS)
}

export function readLocalHistory(): ConversationTurn[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return sanitizeTurns(JSON.parse(raw))
  } catch {
    return []
  }
}

let pendingLocalWrite: ConversationTurn[] | null = null
let localWriteHandle: number | null = null

function commitLocalHistory(turns: ConversationTurn[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(turns.slice(0, MAX_TURNS)))
  } catch {
    /* quota */
  }
}

/** Immediate local write (hydrate / tests). Prefer `persistHistory` for turn updates. */
export function writeLocalHistory(turns: ConversationTurn[]) {
  pendingLocalWrite = null
  if (localWriteHandle != null && typeof window !== 'undefined') {
    const ric = (
      window as Window & { cancelIdleCallback?: (id: number) => void }
    ).cancelIdleCallback
    if (typeof ric === 'function') ric(localWriteHandle)
    else window.clearTimeout(localWriteHandle)
    localWriteHandle = null
  }
  commitLocalHistory(turns)
}

function scheduleLocalHistoryWrite(turns: ConversationTurn[]) {
  pendingLocalWrite = turns
  if (typeof window === 'undefined') {
    commitLocalHistory(turns)
    pendingLocalWrite = null
    return
  }
  if (localWriteHandle != null) return
  const run = () => {
    localWriteHandle = null
    const payload = pendingLocalWrite
    pendingLocalWrite = null
    if (!payload) return
    commitLocalHistory(payload)
  }
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
  ).requestIdleCallback
  if (typeof ric === 'function') {
    localWriteHandle = ric(run, { timeout: 400 })
  } else {
    localWriteHandle = window.setTimeout(run, 0)
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
let persistLoggedIn = false

export function setHistoryPersistLoggedIn(loggedIn: boolean) {
  persistLoggedIn = loggedIn
}

/** Coalesce local disk writes; debounce account sync when signed in. */
export function persistHistory(turns: ConversationTurn[]) {
  const next = expireHistoryTurns(turns).slice(0, MAX_TURNS)
  scheduleLocalHistoryWrite(next)
  if (!persistLoggedIn) return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void putAccountHistory(next).catch(() => {
      /* offline / unsigned — local still kept */
    })
  }, 600)
}

/** Load local + account history after bootstrap / sign-in. */
export async function hydrateHistory(loggedIn: boolean): Promise<ConversationTurn[]> {
  const local = readLocalHistory()
  setHistoryPersistLoggedIn(loggedIn)
  if (!loggedIn) return local
  try {
    const remote = await fetchAccountHistory()
    if (!remote) return local
    const merged = mergeHistory(local, remote)
    writeLocalHistory(merged)
    if (shouldPushHydratedHistory(merged, remote)) {
      void putAccountHistory(merged).catch(() => {
        /* offline / unsigned — local still kept */
      })
    }
    return merged
  } catch {
    return local
  }
}
