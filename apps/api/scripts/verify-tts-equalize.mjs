/**
 * Verify SSML boost direction (Azure max +50%) and client gain map.
 * Phone loudness is SSML × Web Audio gain — file RMS alone is not the target
 * (Yue ranks quietest on RMS but loudest on phone speakers).
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  TTS_EQUALIZE_VOLUME,
  TTS_EQUALIZE_PLAYBACK_GAIN,
} from '../../../packages/yue-shared/dist/ttsVolumeEqualize.js'

const key = process.env.AZURE_SPEECH_KEY
const region = process.env.AZURE_SPEECH_REGION || 'eastus'
if (!key) {
  console.error('AZURE_SPEECH_KEY missing')
  process.exit(1)
}

const PROBES = [
  ['yue', 'zh-HK-HiuMaanNeural', 'zh-HK', '你好，歡迎使用粵譯。'],
  ['en', 'en-US-JennyNeural', 'en-US', 'Hello — this is your English voice.'],
  ['nl', 'nl-NL-FennaNeural', 'nl-NL', 'Hallo — dit is je Nederlandse stem.'],
]

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function synth(voice, xmlLang, text, volumeAttr) {
  const inner = volumeAttr
    ? `<prosody volume="${volumeAttr}">${escapeXml(text)}</prosody>`
    : escapeXml(text)
  const ssml = `<speak version="1.0" xml:lang="${xmlLang}"><voice name="${voice}">${inner}</voice></speak>`
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    },
    body: ssml,
  })
  if (!res.ok) throw new Error(`${voice} ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

function gated(mp3, dir, tag) {
  const mp3Path = join(dir, `${tag}.mp3`)
  const wavPath = join(dir, `${tag}.wav`)
  writeFileSync(mp3Path, mp3)
  spawnSync('ffmpeg', ['-y', '-i', mp3Path, '-ac', '1', '-ar', '16000', '-f', 'wav', wavPath])
  const pcm = readFileSync(wavPath).subarray(44)
  let sum = 0
  let n = 0
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    const s = pcm.readInt16LE(i) / 32768
    if (Math.abs(s) >= 0.02) {
      sum += s * s
      n += 1
    }
  }
  return n ? 20 * Math.log10(Math.sqrt(sum / n)) : -99
}

// Map sanity (no Azure)
for (const [lang, vol] of Object.entries(TTS_EQUALIZE_VOLUME)) {
  if (lang === 'yue') {
    if (vol !== null) throw new Error('yue SSML must be null')
    if (TTS_EQUALIZE_PLAYBACK_GAIN.yue !== 1) throw new Error('yue gain must be 1')
  } else if (vol !== '+50%') {
    throw new Error(`${lang} SSML must be +50% (got ${vol})`)
  }
}
if (!(TTS_EQUALIZE_PLAYBACK_GAIN.en > 1)) throw new Error('en client gain must be > 1')
if (!(TTS_EQUALIZE_PLAYBACK_GAIN.nl > TTS_EQUALIZE_PLAYBACK_GAIN.en)) {
  throw new Error('nl client gain must exceed en')
}

const dir = mkdtempSync(join(tmpdir(), 'tts-eq-'))
const rows = []
try {
  for (const [lang, voice, xml, text] of PROBES) {
    const vol = TTS_EQUALIZE_VOLUME[lang] ?? null
    const defRms = gated(await synth(voice, xml, text, null), dir, `${lang}_def`)
    const eqRms = gated(await synth(voice, xml, text, vol), dir, `${lang}_eq`)
    const clientGain = TTS_EQUALIZE_PLAYBACK_GAIN[lang] ?? 1
    const effectiveDb = eqRms + 20 * Math.log10(clientGain)
    rows.push({ lang, vol, defRms, eqRms, clientGain, effectiveDb })
    console.log(
      `${lang.padEnd(6)} def=${defRms.toFixed(2)} ssml=${eqRms.toFixed(2)} gain=${clientGain} effective=${effectiveDb.toFixed(2)}`,
    )
    await new Promise((r) => setTimeout(r, 80))
  }
  const en = rows.find((r) => r.lang === 'en')
  const nl = rows.find((r) => r.lang === 'nl')
  if (en.eqRms < en.defRms + 1.5) {
    console.error('FAIL: English +50% SSML did not raise gated RMS by ≥1.5 dB')
    process.exit(1)
  }
  if (nl.eqRms < nl.defRms + 1.5) {
    console.error('FAIL: Dutch +50% SSML did not raise gated RMS by ≥1.5 dB')
    process.exit(1)
  }
  // Effective (SSML × client) should put En/Nl above bare Yue file level.
  const yue = rows.find((r) => r.lang === 'yue')
  if (en.effectiveDb < yue.effectiveDb) {
    console.error('FAIL: English effective loudness still below Yue')
    process.exit(1)
  }
  if (nl.effectiveDb < yue.effectiveDb) {
    console.error('FAIL: Dutch effective loudness still below Yue')
    process.exit(1)
  }
  writeFileSync(
    '/opt/cursor/artifacts/tts-loudness-equalized.json',
    JSON.stringify({ rows, note: 'effectiveDb = ssml gated RMS + 20*log10(clientGain)' }, null, 2),
  )
  console.log('verify-tts-equalize: ok (boost toward Yue on phone)')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
