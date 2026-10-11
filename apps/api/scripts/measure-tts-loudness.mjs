/**
 * Measure Azure Neural TTS loudness per language (default voice) vs Cantonese.
 * Writes /tmp/tts-loudness.json with RMS dB and suggested SSML volume offsets.
 *
 * Usage (from apps/api, with AZURE_SPEECH_* in env):
 *   node scripts/measure-tts-loudness.mjs
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const key = process.env.AZURE_SPEECH_KEY
const region = process.env.AZURE_SPEECH_REGION || 'eastus'
if (!key) {
  console.error('AZURE_SPEECH_KEY missing')
  process.exit(1)
}

/** @type {Array<{ lang: string; voice: string; xmlLang: string; text: string }>} */
const SAMPLES = [
  { lang: 'yue', voice: 'zh-HK-HiuMaanNeural', xmlLang: 'zh-HK', text: '你好，歡迎使用粵譯。' },
  { lang: 'en', voice: 'en-US-JennyNeural', xmlLang: 'en-US', text: 'Hello — this is your English voice.' },
  { lang: 'cmn', voice: 'zh-CN-XiaoxiaoNeural', xmlLang: 'zh-CN', text: '你好，欢迎使用粤译。' },
  { lang: 'wuu', voice: 'wuu-CN-XiaotongNeural', xmlLang: 'wuu-CN', text: '侬好，欢迎用沪语翻译。' },
  { lang: 'sichuan', voice: 'zh-CN-sichuan-YunxiNeural', xmlLang: 'zh-CN-sichuan', text: '你好，欢迎用四川话。' },
  { lang: 'tl', voice: 'fil-PH-BlessicaNeural', xmlLang: 'fil-PH', text: 'Kumusta — ito ang Tagalog voice mo.' },
  { lang: 'es', voice: 'es-MX-DaliaNeural', xmlLang: 'es-MX', text: 'Hola — esta es tu voz en español mexicano.' },
  { lang: 'eses', voice: 'es-ES-ElviraNeural', xmlLang: 'es-ES', text: 'Hola — esta es tu voz en español de España.' },
  { lang: 'vi', voice: 'vi-VN-HoaiMyNeural', xmlLang: 'vi-VN', text: 'Xin chào — đây là giọng tiếng Việt của bạn.' },
  { lang: 'th', voice: 'th-TH-PremwadeeNeural', xmlLang: 'th-TH', text: 'สวัสดี — นี่คือเสียงไทย' },
  { lang: 'lo', voice: 'lo-LA-KeomanyNeural', xmlLang: 'lo-LA', text: 'ສະບາຍດີ — ນີ້ແມ່ນສຽງລາວ' },
  { lang: 'ko', voice: 'ko-KR-SunHiNeural', xmlLang: 'ko-KR', text: '안녕하세요 — 한국어 음성입니다.' },
  { lang: 'ja', voice: 'ja-JP-NanamiNeural', xmlLang: 'ja-JP', text: 'こんにちは — 日本語の音声です。' },
  { lang: 'id', voice: 'id-ID-GadisNeural', xmlLang: 'id-ID', text: 'Halo — ini suara Bahasa Indonesia Anda.' },
  { lang: 'ms', voice: 'ms-MY-YasminNeural', xmlLang: 'ms-MY', text: 'Halo — ini suara Bahasa Melayu anda.' },
  { lang: 'pt', voice: 'pt-BR-FranciscaNeural', xmlLang: 'pt-BR', text: 'Olá — esta é a sua voz em português do Brasil.' },
  { lang: 'fr', voice: 'fr-FR-DeniseNeural', xmlLang: 'fr-FR', text: 'Bonjour — voici votre voix en français.' },
  { lang: 'hi', voice: 'hi-IN-AnanyaNeural', xmlLang: 'hi-IN', text: 'नमस्ते — यह आपकी हिंदी आवाज़ है।' },
  { lang: 'km', voice: 'km-KH-SreymomNeural', xmlLang: 'km-KH', text: 'សួស្តី — នេះជាសំឡេងខ្មែររបស់អ្នក។' },
  { lang: 'my', voice: 'my-MM-NilarNeural', xmlLang: 'my-MM', text: 'မင်္ဂလာပါ — ဤသည်မှာ သင့်မြန်မာအသံဖြစ်သည်။' },
  { lang: 'jv', voice: 'jv-ID-SitiNeural', xmlLang: 'jv-ID', text: 'Halo — iki swara Basa Jawa sampeyan.' },
  { lang: 'it', voice: 'it-IT-ElsaNeural', xmlLang: 'it-IT', text: 'Ciao — questa è la tua voce in italiano.' },
  { lang: 'de', voice: 'de-DE-KatjaNeural', xmlLang: 'de-DE', text: 'Hallo — das ist Ihre deutsche Stimme.' },
  { lang: 'nl', voice: 'nl-NL-FennaNeural', xmlLang: 'nl-NL', text: 'Hallo — dit is je Nederlandse stem.' },
  { lang: 'ar', voice: 'ar-EG-SalmaNeural', xmlLang: 'ar-EG', text: 'أهلاً — ده صوتك بالعامية المصرية.' },
  { lang: 'arsa', voice: 'ar-SA-ZariyahNeural', xmlLang: 'ar-SA', text: 'مرحباً — هذا صوتك باللغة العربية الفصحى.' },
]

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function synth(voice, xmlLang, text, volumeAttr = null) {
  const inner = volumeAttr
    ? `<prosody volume="${volumeAttr}">${escapeXml(text)}</prosody>`
    : escapeXml(text)
  const ssml = `<speak version="1.0" xml:lang="${xmlLang}"><voice name="${voice}">${inner}</voice></speak>`
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    },
    body: ssml,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${voice} TTS ${res.status}: ${body.slice(0, 160)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

function measureRmsDb(mp3Buf, dir, tag) {
  const mp3Path = join(dir, `${tag}.mp3`)
  const wavPath = join(dir, `${tag}.wav`)
  writeFileSync(mp3Path, mp3Buf)
  const conv = spawnSync(
    'ffmpeg',
    ['-y', '-i', mp3Path, '-ac', '1', '-ar', '16000', '-f', 'wav', wavPath],
    { encoding: 'utf8' },
  )
  if (conv.status !== 0) {
    throw new Error(`ffmpeg failed for ${tag}: ${conv.stderr?.slice(-200)}`)
  }
  const wav = readFileSync(wavPath)
  // Skip 44-byte WAV header (standard PCM from ffmpeg).
  const pcm = wav.subarray(44)
  const samples = pcm.length / 2
  if (samples < 16) return { rmsDb: -Infinity, peakDb: -Infinity, samples: 0 }
  let sumSq = 0
  let peak = 0
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    const s = pcm.readInt16LE(i) / 32768
    sumSq += s * s
    const a = Math.abs(s)
    if (a > peak) peak = a
  }
  const rms = Math.sqrt(sumSq / samples)
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity
  return { rmsDb, peakDb, samples }
}

const dir = mkdtempSync(join(tmpdir(), 'tts-loud-'))
const rows = []

try {
  for (const sample of SAMPLES) {
    process.stdout.write(`measuring ${sample.lang}… `)
    const buf = await synth(sample.voice, sample.xmlLang, sample.text)
    const m = measureRmsDb(buf, dir, sample.lang)
    rows.push({ ...sample, ...m, bytes: buf.length })
    console.log(`rms=${m.rmsDb.toFixed(2)} dB peak=${m.peakDb.toFixed(2)} dB`)
    // Gentle pacing for Azure.
    await new Promise((r) => setTimeout(r, 120))
  }

  const yue = rows.find((r) => r.lang === 'yue')
  if (!yue || !Number.isFinite(yue.rmsDb)) throw new Error('yue baseline missing')

  const report = rows.map((r) => {
    const deltaDb = yue.rmsDb - r.rmsDb
    // Round to 0.5 dB; clamp Azure-safe relative boost (avoid absurd +40dB).
    let boostDb = Math.round(deltaDb * 2) / 2
    if (boostDb < 0.5) boostDb = 0
    if (boostDb > 12) boostDb = 12
    return {
      lang: r.lang,
      voice: r.voice,
      rmsDb: Number(r.rmsDb.toFixed(2)),
      peakDb: Number(r.peakDb.toFixed(2)),
      deltaVsYueDb: Number(deltaDb.toFixed(2)),
      suggestedBoostDb: boostDb,
      ssmlVolume: boostDb > 0 ? `+${boostDb.toFixed(1)}dB` : null,
    }
  })

  const out = {
    measuredAt: new Date().toISOString(),
    region,
    yueRmsDb: Number(yue.rmsDb.toFixed(2)),
    voices: report,
  }
  const outPath = '/opt/cursor/artifacts/tts-loudness.json'
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  writeFileSync('/tmp/tts-loudness.json', JSON.stringify(out, null, 2))
  console.log('\n=== summary (boost toward Yue) ===')
  for (const v of report) {
    console.log(
      `${v.lang.padEnd(8)} rms ${String(v.rmsDb).padStart(7)}  Δ ${String(v.deltaVsYueDb).padStart(6)}  boost ${v.ssmlVolume || '—'}`,
    )
  }
  console.log(`\nwrote ${outPath}`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
