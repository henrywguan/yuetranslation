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

const SAMPLES = [
  ['yue', 'zh-HK-HiuMaanNeural', 'zh-HK', '你好，歡迎使用粵譯。'],
  ['en', 'en-US-JennyNeural', 'en-US', 'Hello — this is your English voice.'],
  ['cmn', 'zh-CN-XiaoxiaoNeural', 'zh-CN', '你好，欢迎使用粤译。'],
  ['wuu', 'wuu-CN-XiaotongNeural', 'wuu-CN', '侬好，欢迎用沪语翻译。'],
  ['sichuan', 'zh-CN-sichuan-YunxiNeural', 'zh-CN-sichuan', '你好，欢迎用四川话。'],
  ['tl', 'fil-PH-BlessicaNeural', 'fil-PH', 'Kumusta — ito ang Tagalog voice mo.'],
  ['es', 'es-MX-DaliaNeural', 'es-MX', 'Hola — esta es tu voz en español mexicano.'],
  ['eses', 'es-ES-ElviraNeural', 'es-ES', 'Hola — esta es tu voz en español de España.'],
  ['vi', 'vi-VN-HoaiMyNeural', 'vi-VN', 'Xin chào — đây là giọng tiếng Việt của bạn.'],
  ['th', 'th-TH-PremwadeeNeural', 'th-TH', 'สวัสดี — นี่คือเสียงไทย'],
  ['lo', 'lo-LA-KeomanyNeural', 'lo-LA', 'ສະບາຍດີ — ນີ້ແມ່ນສຽງລາວ'],
  ['ko', 'ko-KR-SunHiNeural', 'ko-KR', '안녕하세요 — 한국어 음성입니다.'],
  ['ja', 'ja-JP-NanamiNeural', 'ja-JP', 'こんにちは — 日本語の音声です。'],
  ['id', 'id-ID-GadisNeural', 'id-ID', 'Halo — ini suara Bahasa Indonesia Anda.'],
  ['ms', 'ms-MY-YasminNeural', 'ms-MY', 'Halo — ini suara Bahasa Melayu anda.'],
  ['pt', 'pt-BR-FranciscaNeural', 'pt-BR', 'Olá — esta é a sua voz em português do Brasil.'],
  ['fr', 'fr-FR-DeniseNeural', 'fr-FR', 'Bonjour — voici votre voix en français.'],
  ['hi', 'hi-IN-AnanyaNeural', 'hi-IN', 'नमस्ते — यह आपकी हिंदी आवाज़ है।'],
  ['km', 'km-KH-SreymomNeural', 'km-KH', 'សួស្តី — នេះជាសំឡេងខ្មែររបស់អ្នក។'],
  ['my', 'my-MM-NilarNeural', 'my-MM', 'မင်္ဂလာပါ — ဤသည်မှာ သင့်မြန်မာအသံဖြစ်သည်။'],
  ['jv', 'jv-ID-SitiNeural', 'jv-ID', 'Halo — iki swara Basa Jawa sampeyan.'],
  ['it', 'it-IT-ElsaNeural', 'it-IT', 'Ciao — questa è la tua voce in italiano.'],
  ['de', 'de-DE-KatjaNeural', 'de-DE', 'Hallo — das ist Ihre deutsche Stimme.'],
  ['nl', 'nl-NL-FennaNeural', 'nl-NL', 'Hallo — dit is je Nederlandse stem.'],
  ['ar', 'ar-EG-SalmaNeural', 'ar-EG', 'أهلاً — ده صوتك بالعامية المصرية.'],
  ['arsa', 'ar-SA-ZariyahNeural', 'ar-SA', 'مرحباً — هذا صوتك باللغة العربية الفصحى.'],
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
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    },
    body: ssml,
  })
  if (!res.ok) throw new Error(`${voice} ${res.status} ${(await res.text()).slice(0, 120)}`)
  return Buffer.from(await res.arrayBuffer())
}

function gated(mp3, dir, tag) {
  const mp3Path = join(dir, `${tag}.mp3`)
  const wavPath = join(dir, `${tag}.wav`)
  writeFileSync(mp3Path, mp3)
  const conv = spawnSync(
    'ffmpeg',
    ['-y', '-i', mp3Path, '-ac', '1', '-ar', '16000', '-f', 'wav', wavPath],
    { encoding: 'utf8' },
  )
  if (conv.status !== 0) throw new Error(`ffmpeg ${tag}: ${conv.stderr?.slice(-160)}`)
  const wav = readFileSync(wavPath)
  const pcm = wav.subarray(44)
  const gate = 0.02
  let sum = 0
  let n = 0
  let peak = 0
  let all = 0
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    const s = pcm.readInt16LE(i) / 32768
    const a = Math.abs(s)
    if (a > peak) peak = a
    all += 1
    if (a >= gate) {
      sum += s * s
      n += 1
    }
  }
  const rms = n ? Math.sqrt(sum / n) : 0
  return {
    gatedRmsDb: rms > 0 ? 20 * Math.log10(rms) : -Infinity,
    peakDb: peak > 0 ? 20 * Math.log10(peak) : -Infinity,
    speechRatio: all ? n / all : 0,
  }
}

const dir = mkdtempSync(join(tmpdir(), 'tts-g-'))
const out = []
try {
  for (const [lang, voice, xml, text] of SAMPLES) {
    const buf = await synth(voice, xml, text)
    const m = gated(buf, dir, lang)
    out.push({ lang, voice, volume: 'default', ...m })
    console.log(
      `${lang.padEnd(8)} gatedRMS=${m.gatedRmsDb.toFixed(2)} peak=${m.peakDb.toFixed(2)} speech%=${(m.speechRatio * 100).toFixed(0)}`,
    )
    await new Promise((r) => setTimeout(r, 80))
  }
  for (const [lang, voice, xml, text, vol] of [
    ['tl', 'fil-PH-BlessicaNeural', 'fil-PH', 'Kumusta — ito ang Tagalog voice mo.', 'x-loud'],
    ['yue', 'zh-HK-HiuMaanNeural', 'zh-HK', '你好，歡迎使用粵譯。', 'x-loud'],
    ['en', 'en-US-JennyNeural', 'en-US', 'Hello — this is your English voice.', 'x-loud'],
    ['ko', 'ko-KR-SunHiNeural', 'ko-KR', '안녕하세요 — 한국어 음성입니다.', 'x-loud'],
  ]) {
    const buf = await synth(voice, xml, text, vol)
    const m = gated(buf, dir, `${lang}_${vol}`)
    out.push({ lang, voice, volume: vol, ...m })
    console.log(
      `${`${lang}/${vol}`.padEnd(14)} gatedRMS=${m.gatedRmsDb.toFixed(2)} peak=${m.peakDb.toFixed(2)}`,
    )
  }

  const yue = out.find((r) => r.lang === 'yue' && r.volume === 'default')
  console.log('\nΔ vs Yue default (positive => quieter than Yue, needs boost):')
  for (const r of out.filter((r) => r.volume === 'default')) {
    const d = yue.gatedRmsDb - r.gatedRmsDb
    const boost = d > 0.4 ? `+${d.toFixed(1)}dB` : '—'
    console.log(`${r.lang.padEnd(8)} Δ=${d.toFixed(2).padStart(6)}  boost ${boost}`)
  }
  writeFileSync(
    '/opt/cursor/artifacts/tts-loudness-gated.json',
    JSON.stringify({ yueGatedRmsDb: yue.gatedRmsDb, rows: out }, null, 2),
  )
} finally {
  rmSync(dir, { recursive: true, force: true })
}
