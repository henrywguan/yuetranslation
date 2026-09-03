#!/usr/bin/env node
/**
 * Build 6 instructional carousel slides (1080×1350) from dark-mode 4K UI stills.
 * Ken Burns zooms + soft jade callout overlays + optional TTS / bed mux.
 *
 *   node scripts/build-carousel-solo-convo.mjs
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs'
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

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout)
    throw new Error(`${cmd} ${args[0]} failed (${r.status})`)
  }
  return r
}

function writeOverlay(name, svgBody) {
  const path = join(OVER, `${name}.svg`)
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.6"/>
    </filter>
  </defs>
  ${svgBody}
</svg>`
  writeFileSync(path, svg)
  const png = join(OVER, `${name}.png`)
  // Prefer rsvg or inkscape; fall back to ffmpeg svg→png via magick
  if (existsSync('/usr/bin/convert') || existsSync('/usr/bin/magick')) {
    const bin = existsSync('/usr/bin/magick') ? 'magick' : 'convert'
    run(bin, [path, '-resize', `${W}x${H}`, png])
  } else {
    // cairo via python pillow + cairosvg if available, else pure HTML screenshot later
    const py = spawnSync(
      'python3',
      [
        '-c',
        `import cairosvg; cairosvg.svg2png(url='${path}', write_to='${png}', output_width=${W}, output_height=${H})`,
      ],
      { encoding: 'utf8' },
    )
    if (py.status !== 0) {
      // last resort: write a transparent PNG via ffmpeg lavfi
      run('ffmpeg', [
        '-y',
        '-f',
        'lavfi',
        '-i',
        `color=c=0x00000000:s=${W}x${H}:d=1`,
        '-frames:v',
        '1',
        png,
      ])
      console.warn('overlay fallback empty for', name, py.stderr)
    }
  }
  return png
}

// Soft luxury ambient bed (~60s) — procedural, no third-party music license
const bedPath = join(AUDIO, 'bed-soft-luxury.wav')
if (!existsSync(bedPath)) {
  run('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=110:sample_rate=44100:duration=60',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=164.81:sample_rate=44100:duration=60',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=220:sample_rate=44100:duration=60',
    '-f',
    'lavfi',
    '-i',
    'anoisesrc=color=pink:sample_rate=44100:amplitude=0.015:duration=60',
    '-filter_complex',
    '[0]volume=0.07[a];[1]volume=0.05[b];[2]volume=0.04[c];[3]lowpass=f=600,volume=0.35[d];[a][b][c][d]amix=inputs=4:duration=longest,alimiter=limit=0.25,afade=t=in:st=0:d=1.5,afade=t=out:st=56:d=4',
    bedPath,
  ])
}

function kenBurns({ still, overlay, out, seconds = 8, zoomEnd = 1.18, x = 'iw/2-(iw/zoom/2)', y = 'ih/2-(ih/zoom/2)', label }) {
  const frames = Math.round(seconds * FPS)
  const zExpr = `min(1+${(zoomEnd - 1).toFixed(4)}*on/${frames},${zoomEnd})`
  const filters = [
    `scale=${W * 3}:${H * 3}:force_original_aspect_ratio=increase,crop=${W * 3}:${H * 3}`,
    `zoompan=z='${zExpr}':x='${x}':y='${y}':d=${frames}:s=${W}x${H}:fps=${FPS}`,
  ]
  const args = ['-y', '-loop', '1', '-i', still]
  if (overlay && existsSync(overlay)) {
    args.push('-i', overlay)
    filters.push(`[0:v]${filters.shift()},${filters.shift()}[base];[1:v]format=rgba,scale=${W}:${H}[ov];[base][ov]overlay=0:0:format=auto`)
  } else {
    // collapse to single chain
    const chain = filters.join(',')
    filters.length = 0
    filters.push(chain)
  }
  args.push('-filter_complex', filters.length === 1 ? filters[0] : filters.join(';'))
  if (filters.length === 1) {
    // already set filter_complex as single - better use -vf
    args.splice(args.indexOf('-filter_complex'), 2, '-vf', filters[0])
  }
  args.push('-t', String(seconds), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', out)
  console.log('render', label || out)
  run('ffmpeg', args)
}

// Fix kenBurns - the filter logic got messy. Rewrite cleaner helper.
function renderSlide({ still, overlay, out, seconds = 8, zoomEnd = 1.16, focus = 'center', label }) {
  const frames = Math.round(seconds * FPS)
  let x = 'iw/2-(iw/zoom/2)'
  let y = 'ih/2-(ih/zoom/2)'
  if (focus === 'top') y = `(ih*0.18)-(ih/zoom/2)`
  if (focus === 'bottom') y = `(ih*0.72)-(ih/zoom/2)`
  if (focus === 'tabs') y = `(ih*0.78)-(ih/zoom/2)`
  if (focus === 'yue') {
    x = 'iw/2-(iw/zoom/2)'
    y = `(ih*0.38)-(ih/zoom/2)`
  }
  if (focus === 'convo-split') y = 'ih/2-(ih/zoom/2)'

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
  let fc
  if (tts && existsSync(tts)) {
    args.push('-i', tts)
    if (duck) {
      fc = `[1:a]volume=0.22,atrim=0:${seconds},asetpts=PTS-STARTPTS[bed];[2:a]volume=1.15,adelay=1800|1800,apad=whole_dur=${seconds}[voice];[bed][voice]amix=inputs=2:duration=first:dropout_transition=0.3,alimiter=limit=0.9[a]`
    } else {
      fc = `[1:a]volume=0.28,atrim=0:${seconds},asetpts=PTS-STARTPTS[bed];[2:a]volume=1.0,adelay=1200|1200,apad=whole_dur=${seconds}[voice];[bed][voice]amix=inputs=2:duration=first[a]`
    }
    args.push('-filter_complex', fc, '-map', '0:v', '-map', '[a]')
  } else {
    args.push('-filter_complex', `[1:a]volume=0.32,atrim=0:${seconds},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.6,afade=t=out:st=${seconds - 0.8}:d=0.8[a]`, '-map', '0:v', '-map', '[a]')
  }
  args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(seconds), '-movflags', '+faststart', out)
  console.log('mux', out)
  run('ffmpeg', args)
}

// --- Overlays (jade instructional) ---
const jade = '#3dcfb6'
writeOverlay(
  'hook',
  `
  <rect x="0" y="0" width="${W}" height="${H}" fill="rgba(7,19,31,0.18)"/>
  <text x="540" y="160" text-anchor="middle" font-family="Syne, sans-serif" font-weight="800" font-size="54" fill="#e8f4ff">Two ways to talk</text>
  <text x="540" y="220" text-anchor="middle" font-family="Noto Sans, sans-serif" font-weight="500" font-size="26" fill="${jade}">Solo · Conversation</text>
  <circle cx="270" cy="1180" r="52" fill="none" stroke="${jade}" stroke-width="3" opacity="0.85"/>
  <circle cx="540" cy="1180" r="52" fill="none" stroke="${jade}" stroke-width="3" opacity="0.95"/>
  <text x="540" y="1285" text-anchor="middle" font-family="Noto Sans, sans-serif" font-size="20" fill="#e8f4ff" opacity="0.75">Pick a mode below</text>
`,
)

writeOverlay(
  'solo-anatomy',
  `
  <circle cx="540" cy="340" r="70" fill="none" stroke="${jade}" stroke-width="2.5" opacity="0.9"/>
  <text x="540" y="280" text-anchor="middle" font-family="Syne, sans-serif" font-weight="700" font-size="28" fill="${jade}">1 · Type English</text>
  <circle cx="540" cy="620" r="88" fill="none" stroke="${jade}" stroke-width="2.5" opacity="0.9"/>
  <text x="540" y="740" text-anchor="middle" font-family="Syne, sans-serif" font-weight="700" font-size="28" fill="${jade}">2 · Read 粵 + Jyutping</text>
  <text x="540" y="1260" text-anchor="middle" font-family="Noto Sans, sans-serif" font-size="22" fill="#e8f4ff" opacity="0.8">Auto-speak on · learn while you hear</text>
`,
)

writeOverlay(
  'solo-howto',
  `
  <text x="540" y="120" text-anchor="middle" font-family="Syne, sans-serif" font-weight="800" font-size="40" fill="#e8f4ff">Solo · how to</text>
  <text x="540" y="170" text-anchor="middle" font-family="Noto Sans, sans-serif" font-size="22" fill="${jade}">Type or speak → hear real 口語</text>
`,
)

writeOverlay(
  'convo-anatomy',
  `
  <text x="540" y="110" text-anchor="middle" font-family="Syne, sans-serif" font-weight="800" font-size="36" fill="#e8f4ff">Conversation</text>
  <text x="540" y="155" text-anchor="middle" font-family="Noto Sans, sans-serif" font-size="22" fill="${jade}">One phone · two people</text>
  <path d="M540 200 L540 260" stroke="${jade}" stroke-width="2.5" fill="none" opacity="0.9"/>
  <polygon points="540,275 532,255 548,255" fill="${jade}" opacity="0.9"/>
  <text x="540" y="320" text-anchor="middle" font-family="Noto Sans HK, sans-serif" font-size="22" fill="${jade}">粵 faces them (rotated)</text>
  <text x="540" y="980" text-anchor="middle" font-family="Noto Sans, sans-serif" font-size="22" fill="${jade}">English faces you</text>
`,
)

writeOverlay(
  'convo-howto',
  `
  <text x="540" y="115" text-anchor="middle" font-family="Syne, sans-serif" font-weight="800" font-size="36" fill="#e8f4ff">Talk face to face</text>
  <text x="540" y="165" text-anchor="middle" font-family="Noto Sans, sans-serif" font-size="22" fill="${jade}">Hold · translate · auto-speak replies</text>
`,
)

writeOverlay(
  'cta',
  `
  <rect x="0" y="0" width="${W}" height="${H}" fill="rgba(7,19,31,0.55)"/>
  <text x="540" y="560" text-anchor="middle" font-family="Syne, sans-serif" font-weight="800" font-size="56" fill="#e8f4ff">JyutTranslate</text>
  <text x="540" y="620" text-anchor="middle" font-family="Noto Sans, sans-serif" font-size="28" fill="${jade}">English ↔ Cantonese 粵語 app</text>
  <text x="540" y="700" text-anchor="middle" font-family="Noto Sans, sans-serif" font-size="24" fill="#e8f4ff" opacity="0.85">Free to try · Solo + Conversation</text>
  <text x="540" y="780" text-anchor="middle" font-family="Syne, sans-serif" font-weight="700" font-size="32" fill="${jade}">jyuttranslate.com</text>
`,
)

const stills = {
  soloReady: join(SRC, '01-solo-ready.png'),
  soloFilled: join(SRC, '02-solo-filled.png'),
  convoReady: join(SRC, '03-convo-ready.png'),
  convoFilled: join(SRC, '04-convo-filled.png'),
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
renderSlide({ still: stills.convoFilled, overlay: join(OVER, 'convo-anatomy.png'), out: silent[4], seconds: 8, zoomEnd: 1.12, focus: 'convo-split', label: '04 convo anatomy' })
renderSlide({ still: stills.convoFilled, overlay: join(OVER, 'convo-howto.png'), out: silent[5], seconds: 9, zoomEnd: 1.18, focus: 'center', label: '05 convo howto' })
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

console.log('carousel slides →', OUT)
