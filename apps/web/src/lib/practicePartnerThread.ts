/**
 * The sitting as a thread: 港灣’s line, what you said, then a better line.
 */

export type PartnerThreadTurn = {
  partnerZh: string
  partnerEn: string
  you: string
  betterZh: string
}

const MAX_TURNS = 24

function trim(raw: string, max: number) {
  return raw.replace(/\s+/g, ' ').trim().slice(0, max)
}

export function notePartnerLine(
  thread: readonly PartnerThreadTurn[],
  line: { zh: string; en: string },
): PartnerThreadTurn[] {
  const partnerZh = trim(line.zh, 200)
  if (!partnerZh) return thread.slice()
  return [
    ...thread,
    { partnerZh, partnerEn: trim(line.en, 200), you: '', betterZh: '' },
  ].slice(-MAX_TURNS)
}

export function noteYouSaid(thread: readonly PartnerThreadTurn[], said: string): PartnerThreadTurn[] {
  const you = trim(said, 400)
  if (!you) return thread.slice()
  if (!thread.length) return [{ partnerZh: '', partnerEn: '', you, betterZh: '' }]
  const next = thread.slice()
  const last = next[next.length - 1]
  next[next.length - 1] = { ...last, you }
  return next
}

export function noteBetterLine(thread: readonly PartnerThreadTurn[], zh: string): PartnerThreadTurn[] {
  const betterZh = trim(zh, 200)
  if (!betterZh || !thread.length) return thread.slice()
  const next = thread.slice()
  const last = next[next.length - 1]
  next[next.length - 1] = { ...last, betterZh }
  return next
}
