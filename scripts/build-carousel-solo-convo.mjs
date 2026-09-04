#!/usr/bin/env node
/**
 * Build Solo/Conversation instructional carousel (1080×1350).
 *
 * Animated Harbor overlays:
 *  - Captions pop in/out (fade + slide) so they don't cover UI all the time
 *  - Jade rings pulse; on Ken Burns slides they are composited *before* zoom
 *    so they keep circling the UI targets as the camera moves
 *
 *   node scripts/build-carousel-solo-convo.mjs
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const SRC = join(ROOT, 'docs/social/carousel-solo-convo/source')
const OVER = join(ROOT, 'docs/social/carousel-solo-convo/overlays')
const LAYERS = join(OVER, 'layers')
const OUT = join(ROOT, 'docs/social/carousel-solo-convo/out')
const AUDIO = join(ROOT, 'docs/social/carousel-solo-convo/audio')
const W = 1080
const H = 1350
const FPS = 30

mkdirSync(OUT, { recursive: true })
mkdirSync(AUDIO, { recursive: true })

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
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

const manifest = JSON.parse(readFileSync(join(LAYERS, 'manifest.json'), 'utf8'))

function validAudio(path) {
  if (!existsSync(path)) return false
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], {
    encoding: 'utf8',
  })
  return r.status === 0 && Number(r.stdout.trim()) > 0.2
}

function probeDuration(path) {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
    { encoding: 'utf8' },
  )
  const d = Number(String(r.stdout || '').trim())
  return Number.isFinite(d) && d > 0.2 ? d : null
}

function mux({ video, bed, tts, out, seconds, duck = false }) {
  const args = ['-y', '-i', video, '-stream_loop', '-1', '-i', bed]
  if (tts && validAudio(tts)) {
    args.push('-i', tts)
    const vol = duck ? '0.18' : '0.28'
    args.push(
      '-filter_complex',
      `[1:a]volume=${vol},atrim=0:${seconds},asetpts=PTS-STARTPTS[bed];[2:a]volume=1.2,adelay=1600|1600,apad=whole_dur=${seconds}[voice];[bed][voice]amix=inputs=2:duration=first:dropout_transition=0.25,alimiter=limit=0.9,afade=t=in:st=0:d=0.4,afade=t=out:st=${seconds - 0.7}:d=0.7[a]`,
      '-map', '0:v',
      '-map', '[a]',
    )
  } else {
    if (tts) console.warn('skipping invalid/missing TTS', tts)
    args.push(
      '-filter_complex',
      `[1:a]volume=0.3,atrim=0:${seconds},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.5,afade=t=out:st=${seconds - 0.8}:d=0.8[a]`,
      '-map', '0:v',
      '-map', '[a]',
    )
  }
  args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(seconds), '-movflags', '+faststart', out)
  console.log('mux', out)
  run('ffmpeg', args)
}

function styleOffset(style, tin, fadeIn) {
  // Returns {xExpr, yExpr} for overlay during pop-in
  const t1 = tin + fadeIn
  if (style === 'pop-down') {
    return { x: '0', y: `if(lt(t\\,${t1})\\,-36*(1-(t-${tin})/${fadeIn})\\,0)` }
  }
  if (style === 'pop-up') {
    return { x: '0', y: `if(lt(t\\,${t1})\\,36*(1-(t-${tin})/${fadeIn})\\,0)` }
  }
  if (style === 'pop-left') {
    return { x: `if(lt(t\\,${t1})\\,-48*(1-(t-${tin})/${fadeIn})\\,0)`, y: '0' }
  }
  if (style === 'pop-right') {
    return { x: `if(lt(t\\,${t1})\\,48*(1-(t-${tin})/${fadeIn})\\,0)`, y: '0' }
  }
  return { x: '0', y: '0' }
}

/**
 * Ken Burns still. Track rings flatten onto still *before* zoompan.
 * Captions animate in screen space after zoom.
 */
function renderStillAnimated({ still, slideKey, out, label }) {
  const spec = manifest.slides[slideKey]
  if (!spec) throw new Error(`missing manifest slide ${slideKey}`)
  const seconds = spec.seconds
  const frames = Math.round(seconds * FPS)
  const zoomEnd = spec.zoomEnd || 1.1
  const focus = spec.focus || 'center'
  let zx = 'iw/2-(iw/zoom/2)'
  let zy = 'ih/2-(ih/zoom/2)'
  if (focus === 'tabs') {
    zx = `(iw*0.45)-(iw/zoom/2)`
    zy = `(ih*0.78)-(ih/zoom/2)`
  }
  if (focus === 'yue') zy = `(ih*0.38)-(ih/zoom/2)`
  const zExpr = `1+${(zoomEnd - 1).toFixed(5)}*on/${frames}`
  const zp = `scale=3240:4050:force_original_aspect_ratio=increase,crop=3240:4050,zoompan=z='${zExpr}':x='${zx}':y='${zy}':d=${frames}:s=${W}x${H}:fps=${FPS}`

  const layerDir = join(LAYERS, slideKey)
  const trackRings = (spec.rings || []).filter((r) => r.track)
  const captions = spec.captions || []

  const args = ['-y', '-loop', '1', '-i', still]
  for (const r of trackRings) args.push('-loop', '1', '-i', join(layerDir, `${r.file}.png`))
  for (const c of captions) args.push('-loop', '1', '-i', join(layerDir, `${c.file}.png`))

  // Same Ken Burns on still + each ring → rings stay locked on UI targets, with timed fade/pulse
  const parts = [`[0:v]${zp}[base]`]
  let idx = 1
  let v = '[base]'
  let chain = 0

  for (const r of trackRings) {
    const tag = `r${chain}`
    const fadeIn = 0.25
    const fadeOut = 0.3
    const holdOut = Math.max(r.in + fadeIn + 0.05, r.out - fadeOut)
    // Zoom ring with identical zoompan, then pulse alpha
    parts.push(`[${idx}]format=rgba,${zp},fade=t=in:st=${r.in}:d=${fadeIn}:alpha=1,fade=t=out:st=${holdOut}:d=${fadeOut}:alpha=1,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*(0.70+0.30*sin(2*PI*T*1.15))'[${tag}]`)
    const next = `v${chain}`
    parts.push(`${v}[${tag}]overlay=0:0:format=auto:enable='between(t\\,${r.in}\\,${r.out})'[${next}]`)
    v = `[${next}]`
    idx++
    chain++
  }

  for (const c of captions) {
    const tag = `c${chain}`
    const fadeIn = 0.28
    const fadeOut = 0.35
    const holdOut = Math.max(c.in + fadeIn + 0.05, c.out - fadeOut)
    const { x, y } = styleOffset(c.style || 'fade', c.in, fadeIn)
    parts.push(
      `[${idx}]format=rgba,scale=${W}:${H},fade=t=in:st=${c.in}:d=${fadeIn}:alpha=1,fade=t=out:st=${holdOut}:d=${fadeOut}:alpha=1[${tag}]`,
    )
    const next = `v${chain}`
    parts.push(
      `${v}[${tag}]overlay=x='${x}':y='${y}':format=auto:enable='between(t\\,${c.in}\\,${c.out})'[${next}]`,
    )
    v = `[${next}]`
    idx++
    chain++
  }

  parts.push(`${v}format=yuv420p[vout]`)
  args.push(
    '-filter_complex',
    parts.join(';'),
    '-map',
    '[vout]',
    '-t',
    String(seconds),
    '-r',
    String(FPS),
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-an',
    out,
  )
  console.log('render', label)
  run('ffmpeg', args)
}

/** Live footage + screen-space pulsing rings + pop captions. */
function renderLiveAnimated({ video, slideKey, out, label }) {
  const spec = manifest.slides[slideKey]
  if (!spec) throw new Error(`missing manifest slide ${slideKey}`)
  const seconds = spec.seconds
  const dur = probeDuration(video) || seconds
  const pts = (seconds / dur).toFixed(6)
  const layerDir = join(LAYERS, slideKey)
  const rings = spec.rings || []
  const captions = spec.captions || []

  const args = ['-y', '-i', video]
  for (const r of rings) args.push('-loop', '1', '-i', join(layerDir, `${r.file}.png`))
  for (const c of captions) args.push('-loop', '1', '-i', join(layerDir, `${c.file}.png`))

  const parts = []
  parts.push(
    `[0:v]setpts=PTS*${pts},fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,tpad=stop_mode=clone:stop_duration=${seconds}[base]`,
  )

  let v = '[base]'
  let idx = 1
  let chain = 0

  for (const r of rings) {
    const tag = `r${chain}`
    const fadeIn = 0.25
    const fadeOut = 0.3
    const holdOut = Math.max(r.in + fadeIn + 0.05, r.out - fadeOut)
    // Pulse alpha with a sine so the circle "breathes"
    parts.push(
      `[${idx}]format=rgba,scale=${W}:${H},fade=t=in:st=${r.in}:d=${fadeIn}:alpha=1,fade=t=out:st=${holdOut}:d=${fadeOut}:alpha=1,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*(0.70+0.30*sin(2*PI*T*1.2))'[${tag}]`,
    )
    const next = `v${chain}`
    parts.push(`${v}[${tag}]overlay=0:0:format=auto:enable='between(t\\,${r.in}\\,${r.out})'[${next}]`)
    v = `[${next}]`
    idx++
    chain++
  }

  for (const c of captions) {
    const tag = `c${chain}`
    const fadeIn = 0.28
    const fadeOut = 0.35
    const holdOut = Math.max(c.in + fadeIn + 0.05, c.out - fadeOut)
    const { x, y } = styleOffset(c.style || 'fade', c.in, fadeIn)
    parts.push(
      `[${idx}]format=rgba,scale=${W}:${H},fade=t=in:st=${c.in}:d=${fadeIn}:alpha=1,fade=t=out:st=${holdOut}:d=${fadeOut}:alpha=1[${tag}]`,
    )
    const next = `v${chain}`
    parts.push(
      `${v}[${tag}]overlay=x='${x}':y='${y}':format=auto:enable='between(t\\,${c.in}\\,${c.out})'[${next}]`,
    )
    v = `[${next}]`
    idx++
    chain++
  }

  parts.push(`${v}format=yuv420p[vout]`)
  args.push(
    '-filter_complex',
    parts.join(';'),
    '-map',
    '[vout]',
    '-t',
    String(seconds),
    '-r',
    String(FPS),
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-an',
    out,
  )
  console.log('render-live', label, `compress ${dur.toFixed(1)}s → ${seconds}s`)
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

const liveSolo = join(SRC, 'live/solo-live-1080.mp4')
const liveConvo = join(SRC, 'live/convo-live-1080.mp4')
const hasLive = existsSync(liveSolo) && existsSync(liveConvo)

renderStillAnimated({ still: stills.soloReady, slideKey: 'hook', out: silent[1], label: '01 hook' })
renderStillAnimated({ still: stills.soloFilled, slideKey: 'solo-anatomy', out: silent[2], label: '02 solo anatomy' })
if (hasLive) {
  renderLiveAnimated({ video: liveSolo, slideKey: 'solo-howto', out: silent[3], label: '03 solo howto LIVE' })
} else {
  renderStillAnimated({ still: stills.soloFilled, slideKey: 'solo-howto', out: silent[3], label: '03 solo howto (still)' })
}
renderStillAnimated({ still: stills.convoFilled, slideKey: 'convo-anatomy', out: silent[4], label: '04 convo anatomy' })
if (hasLive) {
  renderLiveAnimated({ video: liveConvo, slideKey: 'convo-howto', out: silent[5], label: '05 convo howto LIVE' })
} else {
  renderStillAnimated({ still: stills.convoFilled, slideKey: 'convo-howto', out: silent[5], label: '05 convo howto (still)' })
}
renderStillAnimated({ still: stills.soloFilled, slideKey: 'cta', out: silent[6], label: '06 cta' })

const ttsSolo = join(AUDIO, 'tts-solo-yue.mp3')
const ttsConvo = join(AUDIO, 'tts-convo-yue.mp3')

const finals = [
  { n: 1, file: 'slide-01-hook.mp4', sec: manifest.slides.hook.seconds, tts: null, duck: false },
  { n: 2, file: 'slide-02-solo-anatomy.mp4', sec: manifest.slides['solo-anatomy'].seconds, tts: null, duck: false },
  { n: 3, file: 'slide-03-solo-howto.mp4', sec: manifest.slides['solo-howto'].seconds, tts: ttsSolo, duck: true },
  { n: 4, file: 'slide-04-convo-anatomy.mp4', sec: manifest.slides['convo-anatomy'].seconds, tts: null, duck: false },
  { n: 5, file: 'slide-05-convo-howto.mp4', sec: manifest.slides['convo-howto'].seconds, tts: ttsConvo, duck: true },
  { n: 6, file: 'slide-06-cta.mp4', sec: manifest.slides.cta.seconds, tts: null, duck: false },
]

for (const s of finals) {
  mux({ video: silent[s.n], bed: bedPath, tts: s.tts, out: join(OUT, s.file), seconds: s.sec, duck: s.duck })
}

for (const p of Object.values(silent)) {
  try {
    rmSync(p, { force: true })
  } catch {}
}

const hasTts = validAudio(ttsSolo) && validAudio(ttsConvo)
writeFileSync(
  join(OUT, 'BUILD_NOTES.txt'),
  `Instructional night/dark Harbor carousel — animated overlays.
Captions pop in/out (fade + slide) so UI isn't covered the whole beat.
Rings pulse; on Ken Burns slides they ride the zoom (pre-zoom composite) to keep circling targets.
Slides 3 & 5 source: ${hasLive ? 'LIVE typing/STT capture' : 'Ken Burns stills'}
Azure TTS on 3 & 5: ${hasTts ? 'YES' : 'NO'}
`,
)

console.log('done →', OUT, 'tts=', hasTts, 'live=', hasLive)
