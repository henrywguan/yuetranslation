import assert from 'node:assert/strict'
import {
  addScheduleJob,
  claimDueScheduleJobs,
  normalizeScheduleJobs,
  parseScheduleIntent,
  readScheduleJobs,
  writeScheduleJobs,
} from './chatSchedule.js'

// Isolate from any real localStorage pollution in Node (jsdom-less).
const mem = new Map<string, string>()
;(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k, v) => {
    mem.set(k, String(v))
  },
  removeItem: (k) => {
    mem.delete(k)
  },
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
}

writeScheduleJobs([])
assert.equal(readScheduleJobs().length, 0)

const job = addScheduleJob({
  threadId: 't1',
  prompt: 'Summarize workspace notes',
  cadence: 'once',
  delayMs: 1,
})
assert.equal(job.threadId, 't1')
assert.ok(readScheduleJobs().some((j) => j.id === job.id))

const due = claimDueScheduleJobs(Date.now() + 10_000)
assert.ok(due.some((j) => j.id === job.id))
const after = readScheduleJobs().find((j) => j.id === job.id)!
assert.equal(after.enabled, false)

const parsed = parseScheduleIntent('every Friday summarize notes in the workspace')
assert.ok(parsed)
assert.equal(parsed!.cadence, 'weekly')

const norm = normalizeScheduleJobs([
  { id: 'x', threadId: 't', prompt: 'ok enough text', cadence: 'daily', nextAt: 1, createdAt: 1, enabled: true },
  { prompt: '', threadId: 't' },
])
assert.equal(norm.length, 1)

console.log('chatSchedule.smoke: ok')
