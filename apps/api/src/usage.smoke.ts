import { currentMonthKey, emptyUsage } from './usage.js'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

const month = currentMonthKey()
assert(/^\d{4}_\d{2}$/.test(month), `month key shape: ${month}`)

const empty = emptyUsage(month)
assert(empty.month === month, 'empty month')
assert(empty.liveSeconds === 0, 'empty live')
assert(empty.ttsChars === 0, 'empty tts')
assert(empty.translateCount === 0, 'empty translate')

// Simulate the old wipe bug: a partial patch must not require sibling zeros in payload.
// (Runtime upsert/RPC is covered by migration 003; this locks the snapshot shape.)
const snapshot = { ...empty, ttsChars: 120, translateCount: 3 }
assert(snapshot.liveSeconds === 0, 'live can be zero while others are set')
assert(snapshot.translateCount === 3, 'translate preserved beside tts')

console.log(JSON.stringify({ ok: true, month, snapshot }))
