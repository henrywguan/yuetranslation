import { analyzeThai } from './thaiTones'
import { analyzeLao } from './laoTones'

function expectThai(script: string, tones: string, readingIncludes?: string) {
  const got = analyzeThai(script)
  if (!got) throw new Error(`Thai parse failed: ${script}`)
  const actual = got.syllables.map((s) => s.tone).join(',')
  if (actual !== tones) {
    throw new Error(`Thai ${script}: expected ${tones} got ${actual} (${got.reading})`)
  }
  if (readingIncludes && !got.reading.includes(readingIncludes)) {
    throw new Error(`Thai ${script}: reading ${got.reading} missing ${readingIncludes}`)
  }
}

function expectLao(script: string, tones: string) {
  const got = analyzeLao(script)
  if (!got) throw new Error(`Lao parse failed: ${script}`)
  const actual = got.syllables.map((s) => s.tone).join(',')
  if (actual !== tones) {
    throw new Error(`Lao ${script}: expected ${tones} got ${actual} (${got.reading})`)
  }
}

expectThai('กา', 'mid')
expectThai('ขา', 'rising')
expectThai('คา', 'mid')
expectThai('ข่า', 'low')
expectThai('ค่า', 'falling')
expectThai('ป้า', 'falling')
expectThai('จ๋า', 'rising')
expectThai('น้ำ', 'high')
expectThai('รัก', 'high')
expectThai('ใหม่', 'low')
expectThai('สวัสดี', 'low,high,mid')
expectThai('ขอโทษ', 'rising,falling')
expectThai('ช่วยด้วย', 'falling,falling')
expectThai('อร่อย', 'low,falling')
expectThai('อย่า', 'low')
expectLao('ຂອບໃຈ', 'lowFalling,lowRising')
expectThai('ขอบคุณ', 'low,mid')
expectThai('ขอ', 'rising')

expectLao('ປາ', 'lowRising')
expectLao('ຄູ', 'highRising')
expectLao('ນ້ຳ', 'highFalling')
expectLao('ໝາ', 'lowRising')
expectLao('ໄກ່', 'mid')
expectLao('ນົກ', 'mid')
expectLao('ສະບາຍດີ', 'highRising,lowRising,lowRising')

console.log('thai/lao tone smoke ok')
console.log('สวัสดี', analyzeThai('สวัสดี'))
console.log('ສະບາຍດີ', analyzeLao('ສະບາຍດີ'))
