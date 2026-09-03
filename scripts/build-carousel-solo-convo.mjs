#!/usr/bin/env node
/**
 * Build Solo/Conversation instructional video carousel (1080×1350).
 * Night/dark Harbor instructional vibe · Ken Burns on real 4K UI · soft bed · Azure TTS when present.
 *
 *   node scripts/build-carousel-solo-convo.mjs
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const SRC = join(ROOT, 'docs/social/carousel-solo-convo/source')
const OVER = join(ROOT, 'docs/social/carousel-solo-convo/overlays')
const OUT = join(ROOT, 'docs/social/carousel-solo-convo/out')
const AUDIO = join(ROOT, 'docs/social/carousel-solo-convo/audio')
const W = 1080
const H = 1350
const FPS = 30

mkdirSync(OVER, { recursive: true })
mkdirSync(OUT, { recursive: true })
mkdirSync(AUDIO, { recursive: true })

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout)
    throw new Error(`${cmd} failed (${r.status})`)
  }
  return r
}

run('python3', [join(ROOT, 'scripts/make-carousel-overlays.py')])

const bedPath = join(AUDIO, 'bed-soft-luxury.wav')
if (!existsSync(bedPath)) {
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=110:sample_rate=44100:duration=60',
    '-f', 'lavfi', '-i', 'sine=frequency=164.81:sample_rate=44100:duration=60',
    '-f', 'lavfi', '-i', 'sine=frequency=220:sample_rate=44100:duration=60',
    '-f', 'lavfi', '-i', 'anoisesrc=color=pink:sample_rate=44100:amplitude=0.015:duration=60',
    '-filter_complex',
    '[0]volume=0.07[a];[1]volume=0.05[b];[2]volume=0.04[c];[3]lowpass=f=600,volume=0.35[d];[a][b][c][d]amix=inputs=4:duration=longest,alimiter=limit=0.25,afade=t=in:st=0:d=1.5,afade=t=out:st=56:d=4',
    bedPath,
  ])
}

function renderSlide({ still, overlay, out, seconds = 8, zoomEnd = 1.14, focus = 'center', label }) {
  const frames = Math.round(seconds * FPS)
  let x = 'iw/2-(iw/zoom/2)'
  let y = 'ih/2-(ih/zoom/2)'
  if (focus === 'tabs') y = `(ih*0.78)-(ih/zoom/2)`
  if (focus === 'yue') y = `(ih*0.38)-(ih/zoom/2)`
  const zExpr = `1+${(zoomEnd - 1).toFixed(5)}*on/${frames}`
  const zp = `scale=3240:4050:force_original_aspect_ratio=increase,crop=3240:4050,zoompan=z='${zExpr}':x='${x}':y='${y}':d=${frames}:s=${W}x${H}:fps=${FPS}`
  const args = ['-y', '-loop', '1', '-i', still]
  if (overlay && existsSync(overlay)) {
    args.push('-loop', '1', '-i', overlay)
    args.push(
      '-filter_complex',
      `[0:v]${zp}[base];[1:v]format=rgba,scale=${W}:${H}[ov];[base][ov]overlay=0:0:format=auto,format=yuv420p`,
    )
  } else {
    args.push('-vf', `${zp},format=yuv420p`)
  }
  args.push('-t', String(seconds), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', out)
  console.log('render', label)
  run('ffmpeg', args)
}

function validAudio(path) {
  if (!existsSync(path)) return false
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], {
    encoding: 'utf8',
  })
  return r.status === 0 && Number(r.stdout.trim()) > 0.2
}

function mux({ video, bed, tts, out, seconds, duck = false }) {
  const args = ['-y', '-i', video, '-stream_loop', '-1', '-i', bed]
  if (tts && validAudio(tts)) {
    args.push('-i', tts)
    const vol = duck ? '0.18' : '0.28'
    args.push(
      '-filter_complex',
      `[1:a]volume=${vol},atrim=0:${seconds},asetpts=PTS-STARTPTS[bed];[2:a]volume=1.2,adelay=1600|1600,apad=whole_dur=${seconds}[voice];[bed][voice]amix=inputs=2:duration=first:dropout_transition=0.25,alimiter=limit=0.9,afade=t=in:st=0:d=0.4,afade=t=out:st=${seconds - 0.7}:d=0.7[a]`,
      '-map', '0:v', '-map', '[a]',
    )
  } else {
    if (tts) console.warn('skipping invalid/missing TTS', tts)
    args.push(
      '-filter_complex',
      `[1:a]volume=0.3,atrim=0:${seconds},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.5,afade=t=out:st=${seconds - 0.8}:d=0.8[a]`,
      '-map', '0:v', '-map', '[a]',
    )
  }
  args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(seconds), '-movflags', '+faststart', out)
  console.log('mux', out)
  run('ffmpeg', args)
}

const stills = {
  soloReady: join(SRC, '01-solo-ready.png'),
  soloFilled: join(SRC, '02-solo-filled.png'),
  convoFilled: join(SRC, '04-convo-filled.png'),
}
for (const p of Object.values(stills)) {
  if (!existsSync(p)) throw new Error(`missing still ${p}`)
}

const silent = {
  1: join(OUT, '_silent-01.mp4'),
  2: join(OUT, '_silent-02.mp4'),
  3: join(OUT, '_silent-03.mp4'),
  4: join(OUT, '_silent-04.mp4'),
  5: join(OUT, '_silent-05.mp4'),
  6: join(OUT, '_silent-06.mp4'),
}

renderSlide({ still: stills.soloReady, overlay: join(OVER, 'hook.png'), out: silent[1], seconds: 7, zoomEnd: 1.1, focus: 'tabs', label: '01 hook' })
renderSlide({ still: stills.soloFilled, overlay: join(OVER, 'solo-anatomy.png'), out: silent[2], seconds: 8, zoomEnd: 1.14, focus: 'yue', label: '02 solo anatomy' })
renderSlide({ still: stills.soloFilled, overlay: join(OVER, 'solo-howto.png'), out: silent[3], seconds: 9, zoomEnd: 1.2, focus: 'yue', label: '03 solo howto' })
renderSlide({ still: stills.convoFilled, overlay: join(OVER, 'convo-anatomy.png'), out: silent[4], seconds: 8, zoomEnd: 1.12, focus: 'center', label: '04 convo anatomy' })
renderSlide({ still: stills.convoFilled, overlay: join(OVER, 'convo-howto.png'), out: silent[5], seconds: 9, zoomEnd: 1.16, focus: 'center', label: '05 convo howto' })
renderSlide({ still: stills.soloFilled, overlay: join(OVER, 'cta.png'), out: silent[6], seconds: 7, zoomEnd: 1.08, focus: 'center', label: '06 cta' })

const ttsSolo = join(AUDIO, 'tts-solo-yue.mp3')
const ttsConvo = join(AUDIO, 'tts-convo-yue.mp3')

const finals = [
  { n: 1, file: 'slide-01-hook.mp4', sec: 7, tts: null, duck: false },
  { n: 2, file: 'slide-02-solo-anatomy.mp4', sec: 8, tts: null, duck: false },
  { n: 3, file: 'slide-03-solo-howto.mp4', sec: 9, tts: ttsSolo, duck: true },
  { n: 4, file: 'slide-04-convo-anatomy.mp4', sec: 8, tts: null, duck: false },
  { n: 5, file: 'slide-05-convo-howto.mp4', sec: 9, tts: ttsConvo, duck: true },
  { n: 6, file: 'slide-06-cta.mp4', sec: 7, tts: null, duck: false },
]

for (const s of finals) {
  mux({ video: silent[s.n], bed: bedPath, tts: s.tts, out: join(OUT, s.file), seconds: s.sec, duck: s.duck })
}

const hasTts = validAudio(ttsSolo) && validAudio(ttsConvo)
writeFileSync(
  join(OUT, 'BUILD_NOTES.txt'),
  `Instructional night/dark Harbor carousel on real dark-mode UI (4K source).
Azure TTS muxed on slides 3 & 5: ${hasTts ? 'YES' : 'NO — re-run after the Speech subscription key is a real portal key (not a placeholder)'}
Template: docs/social/ig-posts/INSTRUCTIONAL-NIGHT-MODE.md
`,
)

console.log('done →', OUT, 'tts=', hasTts)
