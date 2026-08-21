/** Shared Han script detection for translate / breakdown / attestation. */
const HAN_RE = /[\u3400-\u9fff\uf900-\ufaff]/

export function isHanChar(ch: string) {
  return HAN_RE.test(ch)
}

export function hasHan(text: string) {
  return HAN_RE.test(text)
}
