#!/usr/bin/env node
/**
 * Build 6 instructional carousel slides (1080×1350) from dark-mode 4K UI stills.
 * Ken Burns zooms + soft jade callout overlays + bed / Azure TTS mux.
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

// Pillow overlays (reliable; no cairo dependency)
run('python3', [
  '-c',
  `
from PIL import Image, ImageDraw, ImageFont
import os
W,H=${W},${H}
OVER=${JSON.stringify(OVER)}
os.makedirs(OVER, exist_ok=True)
JADE=(61,207,182,235)
INK=(232,244,255,255)
MUTE=(232,244,255,190)
SCRIM=(7,19,31,50)
SCRIM_HEAVY=(7,19,31,140)

def font(size, bold=False):
  paths=[
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
    '/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf',
  ]
  for p in paths:
    if os.path.exists(p):
      try: return ImageFont.truetype(p, size)
      except Exception: pass
  return ImageFont.load_default()

def save(name, draw_fn):
  im=Image.new('RGBA',(W,H),(0,0,0,0))
  d=ImageDraw.Draw(im)
  draw_fn(d, im)
  path=os.path.join(OVER, name+'.png')
  im.save(path)
  print('overlay', path)

def circle(d, xy, r, fill=None, outline=JADE, width=3):
  x,y=xy
  d.ellipse((x-r,y-r,x+r,y+r), outline=outline, width=width, fill=fill)

def text_c(d, y, text, f, fill=INK):
  bbox=d.textbbox((0,0), text, font=f)
  tw=bbox[2]-bbox[0]
  d.text(((W-tw)/2, y), text, font=f, fill=fill)

Ftitle=font(48, True); Fsub=font(26, True); Fbody=font(22); Fsmall=font(20)

def hook(d, im):
  d.rectangle((0,0,W,H), fill=SCRIM)
  text_c(d, 130, 'Two ways to talk', Ftitle)
  text_c(d, 195, 'Solo · Conversation', Fsub, JADE)
  circle(d, (270,1180), 54)
  circle(d, (540,1180), 54)
  text_c(d, 1265, 'Pick a mode below', Fsmall, MUTE)

def solo_anatomy(d, im):
  circle(d, (540, 300), 78)
  text_c(d, 220, '1 · Type English', Fsub, JADE)
  circle(d, (540, 560), 96)
  text_c(d, 690, '2 · Read 粵 + Jyutping', Fsub, JADE)
  text_c(d, 1260, 'Auto-speak on · learn while you hear', Fbody, MUTE)

def solo_howto(d, im):
  d.rectangle((0,0,W,210), fill=SCRIM_HEAVY)
  text_c(d, 70, 'Solo · how to', Ftitle)
  text_c(d, 135, 'Type or speak → hear real 口語', Fbody, JADE)

def convo_anatomy(d, im):
  d.rectangle((0,0,W,190), fill=SCRIM_HEAVY)
  text_c(d, 55, 'Conversation', Ftitle)
  text_c(d, 120, 'One phone · two people', Fbody, JADE)
  # arrow down toward 粵 pane
  d.line((540, 210, 540, 280), fill=JADE, width=3)
  d.polygon([(540,295),(528,270),(552,270)], fill=JADE)
  text_c(d, 320, '粵 faces them (rotated)', Fbody, JADE)
  text_c(d, 980, 'English faces you', Fbody, JADE)

def convo_howto(d, im):
  d.rectangle((0,0,W,190), fill=SCRIM_HEAVY)
  text_c(d, 55, 'Talk face to face', Ftitle)
  text_c(d, 120, 'Hold · translate · auto-speak replies', Fbody, JADE)

def cta(d, im):
  d.rectangle((0,0,W,H), fill=(7,19,31,160))
  text_c(d, 520, 'JyutTranslate', Ftitle)
  text_c(d, 590, 'English ↔ Cantonese 粵語 app', Fsub, JADE)
  text_c(d, 670, 'Free to try · Solo + Conversation', Fbody, MUTE)
  text_c(d, 760, 'jyuttranslate.com', font(34, True), JADE)

for name, fn in [
  ('hook', hook),
  ('solo-anatomy', solo_anatomy),
  ('solo-howto', solo_howto),
  ('convo-anatomy', convo_anatomy),
  ('convo-howto', convo_howto),
  ('cta', cta),
]:
  save(name, fn)
`,
])

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
  if (focus === 'yue') y = `(ih*0.40)-(ih/zoom/2)`
  if (focus === 'top') y = `(ih*0.22)-(ih/zoom/2)`
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
  console.log('render', label || out)
  run('ffmpeg', args)
}

function mux({ video, bed, tts, out, seconds, duck = false }) {
  const args = ['-y', '-i', video, '-stream_loop', '-1', '-i', bed]
  if (tts && existsSync(tts)) {
    args.push('-i', tts)
    const fc = duck
      ? `[1:a]volume=0.20,atrim=0:${seconds},asetpts=PTS-STARTPTS[bed];[2:a]volume=1.2,adelay=1600|1600,apad=whole_dur=${seconds}[voice];[bed][voice]amix=inputs=2:duration=first:dropout_transition=0.25,alimiter=limit=0.92[a]`
      : `[1:a]volume=0.28,atrim=0:${seconds},asetpts=PTS-STARTPTS[bed];[2:a]volume=1.0,adelay=1000|1000,apad=whole_dur=${seconds}[voice];[bed][voice]amix=inputs=2:duration=first[a]`
    args.push('-filter_complex', fc, '-map', '0:v', '-map', '[a]')
  } else {
    args.push(
      '-filter_complex',
      `[1:a]volume=0.32,atrim=0:${seconds},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.5,afade=t=out:st=${Math.max(0.5, seconds - 0.8)}:d=0.8[a]`,
      '-map', '0:v', '-map', '[a]',
    )
  }
  args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(seconds), '-movflags', '+faststart', out)
  console.log('mux', out, tts ? '+tts' : 'bed-only')
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
  { n: 3, file: 'slide-03-solo-howto.mp4', sec: 9, tts: existsSync(ttsSolo) ? ttsSolo : null, duck: true },
  { n: 4, file: 'slide-04-convo-anatomy.mp4', sec: 8, tts: null, duck: false },
  { n: 5, file: 'slide-05-convo-howto.mp4', sec: 9, tts: existsSync(ttsConvo) ? ttsConvo : null, duck: true },
  { n: 6, file: 'slide-06-cta.mp4', sec: 7, tts: null, duck: false },
]

for (const s of finals) {
  mux({
    video: silent[s.n],
    bed: bedPath,
    tts: s.tts,
    out: join(OUT, s.file),
    seconds: s.sec,
    duck: s.duck,
  })
}

writeFileSync(
  join(OUT, 'build-status.json'),
  JSON.stringify(
    {
      theme: 'dark',
      ttsSolo: existsSync(ttsSolo),
      ttsConvo: existsSync(ttsConvo),
      slides: finals.map((s) => ({ file: s.file, hasTts: Boolean(s.tts) })),
    },
    null,
    2,
  ),
)
console.log('carousel slides →', OUT)
