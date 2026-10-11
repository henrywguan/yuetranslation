/** Re-measure gated RMS after applying TTS_EQUALIZE_VOLUME; expect ~Yue. */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TTS_EQUALIZE_VOLUME } from '../../../packages/yue-shared/dist/ttsVolumeEqualize.js'

const key = process.env.AZURE_SPEECH_KEY
const region = process.env.AZURE_SPEECH_REGION || 'eastus'

const SAMPLES = {
  yue: ['zh-HK-HiuMaanNeural', 'zh-HK', '你好，歡迎使用粵譯。'],
  en: ['en-US-JennyNeural', 'en-US', 'Hello — this is your English voice.'],
  cmn: ['zh-CN-XiaoxiaoNeural', 'zh-CN', '你好，欢迎使用粤译。'],
  wuu: ['wuu-CN-XiaotongNeural', 'wuu-CN', '侬好，欢迎用沪语翻译。'],
  sichuan: ['zh-CN-sichuan-YunxiNeural', 'zh-CN-sichuan', '你好，欢迎用四川话。'],
  tl: ['fil-PH-BlessicaNeural', 'fil-PH', 'Kumusta — ito ang Tagalog voice mo.'],
  es: ['es-MX-DaliaNeural', 'es-MX', 'Hola — esta es tu voz en español mexicano.'],
  eses: ['es-ES-ElviraNeural', 'es-ES', 'Hola — esta es tu voz en español de España.'],
  vi: ['vi-VN-HoaiMyNeural', 'vi-VN', 'Xin chào — đây là giọng tiếng Việt của bạn.'],
  th: ['th-TH-PremwadeeNeural', 'th-TH', 'สวัสดี — นี่คือเสียงไทย'],
  lo: ['lo-LA-KeomanyNeural', 'lo-LA', 'ສະບາຍດີ — ນີ້ແມ່ນສຽງລາວ'],
  ko: ['ko-KR-SunHiNeural', 'ko-KR', '안녕하세요 — 한국어 음성입니다.'],
  ja: ['ja-JP-NanamiNeural', 'ja-JP', 'こんにちは — 日本語の音声です。'],
  id: ['id-ID-GadisNeural', 'id-ID', 'Halo — ini suara Bahasa Indonesia Anda.'],
  ms: ['ms-MY-YasminNeural', 'ms-MY', 'Halo — ini suara Bahasa Melayu anda.'],
  pt: ['pt-BR-FranciscaNeural', 'pt-BR', 'Olá — esta é a sua voz em português do Brasil.'],
  fr: ['fr-FR-DeniseNeural', 'fr-FR', 'Bonjour — voici votre voix en français.'],
  hi: ['hi-IN-AnanyaNeural', 'hi-IN', 'नमस्ते — यह आपकी हिंदी आवाज़ है।'],
  km: ['km-KH-SreymomNeural', 'km-KH', 'សួស្តី — នេះជាសំឡេងខ្មែររបស់អ្នក។'],
  my: ['my-MM-NilarNeural', 'my-MM', 'မင်္ဂလာပါ — ဤသည်မှာ သင့်မြန်မာအသံဖြစ်သည်။'],
  jv: ['jv-ID-SitiNeural', 'jv-ID', 'Halo — iki swara Basa Jawa sampeyan.'],
  it: ['it-IT-ElsaNeural', 'it-IT', 'Ciao — questa è la tua voce in italiano.'],
  de: ['de-DE-KatjaNeural', 'de-DE', 'Hallo — das ist Ihre deutsche Stimme.'],
  nl: ['nl-NL-FennaNeural', 'nl-NL', 'Hallo — dit is je Nederlandse stem.'],
  ar: ['ar-EG-SalmaNeural', 'ar-EG', 'أهلاً — ده صوتك بالعامية المصرية.'],
  arsa: ['ar-SA-ZariyahNeural', 'ar-SA', 'مرحباً — هذا صوتك باللغة العربية الفصحى.'],
}

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

const dir = mkdtempSync(join(tmpdir(), 'tts-eq-'))
const rows = []
try {
  for (const [lang, [voice, xml, text]] of Object.entries(SAMPLES)) {
    const vol = TTS_EQUALIZE_VOLUME[lang] ?? null
    const buf = await synth(voice, xml, text, vol)
    const rms = gated(buf, dir, lang)
    rows.push({ lang, vol, rms })
    console.log(`${lang.padEnd(8)} vol=${String(vol || '—').padEnd(6)} gatedRMS=${rms.toFixed(2)}`)
    await new Promise((r) => setTimeout(r, 80))
  }
  const yue = rows.find((r) => r.lang === 'yue').rms
  let maxAbs = 0
  console.log(`\nYue reference ${yue.toFixed(2)} dB — |Δ| after equalize:`)
  for (const r of rows) {
    const d = r.rms - yue
    maxAbs = Math.max(maxAbs, Math.abs(d))
    console.log(`${r.lang.padEnd(8)} Δ=${d.toFixed(2).padStart(6)}`)
  }
  writeFileSync(
    '/opt/cursor/artifacts/tts-loudness-equalized.json',
    JSON.stringify({ yue, maxAbsDeltaDb: maxAbs, rows }, null, 2),
  )
  console.log(`\nmax |Δ| = ${maxAbs.toFixed(2)} dB`)
  if (maxAbs > 2.5) {
    console.error('FAIL: equalize left more than 2.5 dB spread vs Yue')
    process.exit(1)
  }
  console.log('verify-tts-equalize: ok')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
