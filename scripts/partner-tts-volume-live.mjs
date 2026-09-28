#!/usr/bin/env node
/**
 * Live Practice Partner TTS volume check (Azure).
 * Fetches the same loud clip four times (opening + three post-mic-style turns)
 * and asserts mean volume stays within a tight band — so 3rd/4th are not soft.
 *
 * Usage: node scripts/partner-tts-volume-live.mjs
 * Requires local API on :8787 with Azure Speech configured.
 */
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const API = process.env.YUE_API_BASE || 'http://localhost:8787/api'
const TEXT = '唔該，凍檸茶少甜。'
const TURNS = 4

async function fetchLoudMp3(label) {
  const res = await fetch(`${API}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: TEXT, lang: 'yue', loud: true }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${label}: TTS ${res.status} ${body.slice(0, 200)}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 800) throw new Error(`${label}: TTS blob too small (${buf.length})`)
  return buf
}

function meanVolumeDb(mp3Path) {
  const ff = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-i', mp3Path, '-af', 'volumedetect', '-f', 'null', '-'],
    { encoding: 'utf8' },
  )
  const log = `${ff.stderr || ''}\n${ff.stdout || ''}`
  const m = log.match(/mean_volume:\s*(-?[\d.]+)\s*dB/)
  if (!m) throw new Error(`volumedetect failed for ${mp3Path}\n${log.slice(-400)}`)
  return Number(m[1])
}

const dir = join(tmpdir(), `partner-tts-vol-${Date.now()}`)
mkdirSync(dir, { recursive: true })

const levels = []
try {
  for (let i = 1; i <= TURNS; i++) {
    const buf = await fetchLoudMp3(`turn-${i}`)
    const path = join(dir, `turn-${i}.mp3`)
    writeFileSync(path, buf)
    const mean = meanVolumeDb(path)
    levels.push({ turn: i, bytes: buf.length, meanDb: mean })
    console.log(`turn ${i}: ${buf.length} bytes, mean_volume ${mean.toFixed(2)} dB`)
  }

  const means = levels.map((l) => l.meanDb)
  const max = Math.max(...means)
  const min = Math.min(...means)
  const spread = max - min
  console.log(JSON.stringify({ levels, spreadDb: spread }, null, 2))

  // Same SSML x-loud line should be within ~1.5 dB across fetches (encoder noise).
  if (spread > 1.5) {
    console.error(`FAIL: loud TTS mean volume spread ${spread.toFixed(2)} dB > 1.5`)
    process.exit(1)
  }
  // Absolute floor — soft/receiver-ish clips were much quieter.
  if (min < -25) {
    console.error(`FAIL: quietest loud clip ${min.toFixed(2)} dB is too soft`)
    process.exit(1)
  }
  console.log('partner-tts-volume-live: ok (Azure loud clips level-matched across 4 turns)')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
