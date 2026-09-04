#!/usr/bin/env node
/**
 * Assemble Instagram Story — Studio feature tour (cinematic motion + loud SFX).
 *
 *   python3 scripts/render-story-feature-tour-motion.py
 *   node scripts/build-story-feature-tour.mjs
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const BASE = join(ROOT, 'docs/social/story-feature-tour')
const AUDIO = join(BASE, 'audio')
const OUT = join(BASE, 'out')
const STUDIO = join(OUT, '_studio')
const TMP = join(OUT, '_tmp')
const SFX = join(AUDIO, 'sfx')

mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })
mkdirSync(SFX, { recursive: true })

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout)
    throw new Error(`${cmd} failed (${r.status})`)
  }
  return r
}

function durOf(path) {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
    { encoding: 'utf8' },
  )
  return Number(r.stdout.trim()) || 0
}

function ensureSfx() {
  // Simple sine sweeps (not noise whooshes) — clean Apple-style transition accents.
  const sweep = join(SFX, 'sweep-soft.wav')
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', "aevalsrc=exprs='0.38*sin(2*PI*(1100*exp(-2.8*t))*t)':s=48000:d=0.55",
    '-af',
    'afade=t=in:st=0:d=0.02,afade=t=out:st=0.38:d=0.17,highpass=f=180,lowpass=f=6000,volume=1.0,alimiter=limit=0.88',
    sweep,
  ])

  const sweepDeep = join(SFX, 'sweep-deep.wav')
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', "aevalsrc=exprs='0.42*sin(2*PI*(720*exp(-2.2*t))*t)':s=48000:d=0.65",
    '-af',
    'afade=t=in:st=0:d=0.03,afade=t=out:st=0.42:d=0.22,highpass=f=80,lowpass=f=3500,volume=1.05,alimiter=limit=0.88',
    sweepDeep,
  ])

  const hit = join(SFX, 'hit-soft.wav')
  if (!existsSync(hit)) {
    run('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=92:sample_rate=48000:duration=0.55',
      '-f', 'lavfi', '-i', 'anoisesrc=color=brown:sample_rate=48000:amplitude=0.45:duration=0.55',
      '-filter_complex',
      [
        '[0]afade=t=in:st=0:d=0.005,afade=t=out:st=0.08:d=0.4,volume=1.1[s]',
        '[1]lowpass=f=600,afade=t=in:st=0:d=0.002,afade=t=out:st=0.05:d=0.35,volume=0.9[n]',
        '[s][n]amix=inputs=2:normalize=0,alimiter=limit=0.95',
      ].join(';'),
      hit,
    ])
  }

  const click = join(SFX, 'click-ui.wav')
  if (!existsSync(click)) {
    run('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=1480:sample_rate=48000:duration=0.09',
      '-f', 'lavfi', '-i', 'sine=frequency=2200:sample_rate=48000:duration=0.06',
      '-filter_complex',
      [
        '[0]afade=t=out:st=0.02:d=0.07,volume=0.55[a]',
        '[1]afade=t=out:st=0.01:d=0.05,volume=0.35[b]',
        '[a][b]amix=inputs=2:normalize=0,alimiter=limit=0.9',
      ].join(';'),
      click,
    ])
  }

  const bed = join(AUDIO, 'bed-cinematic.wav')
  if (!existsSync(bed)) {
    run('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=65:sample_rate=48000:duration=40',
      '-f', 'lavfi', '-i', 'sine=frequency=98:sample_rate=48000:duration=40',
      '-f', 'lavfi', '-i', 'sine=frequency=146.83:sample_rate=48000:duration=40',
      '-f', 'lavfi', '-i', 'sine=frequency=196:sample_rate=48000:duration=40',
      '-f', 'lavfi', '-i', 'anoisesrc=color=pink:sample_rate=48000:amplitude=0.02:duration=40',
      '-filter_complex',
      [
        '[0]volume=0.22[a]',
        '[1]volume=0.16[b]',
        '[2]volume=0.11[c]',
        '[3]volume=0.07[d]',
        '[4]lowpass=f=500,volume=0.55[e]',
        '[a][b][c][d][e]amix=inputs=5:normalize=0,alimiter=limit=0.35',
      ].join(';'),
      bed,
    ])
  }

  return { sweep, sweepDeep, hit, click, bed }
}

// 1) Motion frames
console.log('render cinematic motion…')
run('python3', [join(ROOT, 'scripts/render-story-feature-tour-motion.py')])

const meta = Object.fromEntries(
  readFileSync(join(STUDIO, 'meta.txt'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => {
      const [k, v] = l.split('=')
      return [k, Number(v)]
    }),
)

const xf = meta.xf || 0.32
const order = ['open', 'solo', 'convo', 'cam', 'end']
const segs = order.map((k) => join(STUDIO, `${k}.mp4`))
for (const p of segs) {
  if (!existsSync(p)) throw new Error(`missing ${p}`)
}
const durs = order.map((k) => meta[k])

// 2) Video xfade (keep soft fades Henry liked)
let filter = ''
const inputs = []
segs.forEach((p) => inputs.push('-i', p))
let off = durs[0] - xf
filter += `[0][1]xfade=transition=fade:duration=${xf}:offset=${off.toFixed(3)}[v1];`
off += durs[1] - xf
filter += `[v1][2]xfade=transition=fade:duration=${xf}:offset=${off.toFixed(3)}[v2];`
off += durs[2] - xf
filter += `[v2][3]xfade=transition=fade:duration=${xf}:offset=${off.toFixed(3)}[v3];`
off += durs[3] - xf
filter += `[v3][4]xfade=transition=fadeblack:duration=${xf}:offset=${off.toFixed(3)},format=yuv420p[vout]`

const silent = join(TMP, 'silent.mp4')
run('ffmpeg', [
  '-y',
  ...inputs,
  '-filter_complex',
  filter,
  '-map',
  '[vout]',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-crf',
  '16',
  '-an',
  silent,
])
const videoDur = durOf(silent)
console.log('video', videoDur.toFixed(2), 's')

const sfx = ensureSfx()
// Prefer ElevenLabs Maeve hook; fall back to vo-meet.mp3
const voHook = existsSync(join(AUDIO, 'higgsfield/vo-hook-maeve.mp3'))
  ? join(AUDIO, 'higgsfield/vo-hook-maeve.mp3')
  : join(AUDIO, 'higgsfield/vo-meet.mp3')
const voFeatures = join(AUDIO, 'higgsfield/vo-features.mp3')

function capVo(src, dest, maxSec) {
  const d = durOf(src)
  const t = Math.min(d, maxSec)
  run('ffmpeg', [
    '-y',
    '-i',
    src,
    '-t',
    String(t),
    '-af',
    `loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${Math.max(0, t - 0.12).toFixed(2)}:d=0.12`,
    '-ar',
    '48000',
    '-ac',
    '2',
    '-c:a',
    'pcm_s16le',
    dest,
  ])
  return t
}

const vo1 = join(TMP, 'vo1.wav')
const vo3 = join(TMP, 'vo3.wav')
const hookDur = capVo(voHook, vo1, 5.0)
capVo(voFeatures, vo3, 2.6)

// Cue map aligned to xfade offsets
const tSolo = durs[0] - xf
const tConvo = tSolo + durs[1] - xf
const tCam = tConvo + durs[2] - xf
const tEnd = tCam + durs[3] - xf

const tHook = 0.2
const tVoCam = tCam + 0.2
const tHitOpen = 0.7
const tSweep1 = tSolo - 0.04
const tSweep2 = tConvo - 0.04
const tSweep3 = tCam - 0.04
const tSweep4 = tEnd - 0.06
const tClick1 = tSolo + 0.4
const tClick2 = tConvo + 0.4
const tClick3 = tCam + 0.45

const ms = (t) => Math.max(0, Math.round(t * 1000))

const mixed = join(TMP, 'mixed.wav')
// CRITICAL: amix normalize=0 — default normalize made the prior cut nearly inaudible on phones.
run('ffmpeg', [
  '-y',
  '-i', sfx.bed,
  '-i', vo1,
  '-i', vo3,
  '-i', sfx.sweep,
  '-i', sfx.sweepDeep,
  '-i', sfx.hit,
  '-i', sfx.click,
  '-filter_complex',
  [
    `[0]atrim=0:${videoDur.toFixed(3)},afade=t=in:st=0:d=0.6,afade=t=out:st=${(videoDur - 1.4).toFixed(2)}:d=1.4,volume=0.42[bed]`,
    `[1]adelay=${ms(tHook)}|${ms(tHook)},volume=1.45[v1]`,
    `[2]adelay=${ms(tVoCam)}|${ms(tVoCam)},volume=1.4[v3]`,
    `[3]adelay=${ms(tSweep1)}|${ms(tSweep1)},volume=0.85[s1]`,
    `[3]adelay=${ms(tSweep2)}|${ms(tSweep2)},volume=0.8[s2]`,
    `[4]adelay=${ms(tSweep3)}|${ms(tSweep3)},volume=0.9[s3]`,
    `[4]adelay=${ms(tSweep4)}|${ms(tSweep4)},volume=0.85[s4]`,
    `[5]adelay=${ms(tHitOpen)}|${ms(tHitOpen)},volume=0.95[h1]`,
    `[5]adelay=${ms(tEnd + 0.12)}|${ms(tEnd + 0.12)},volume=0.8[h2]`,
    `[6]adelay=${ms(tClick1)}|${ms(tClick1)},volume=0.7[c1]`,
    `[6]adelay=${ms(tClick2)}|${ms(tClick2)},volume=0.7[c2]`,
    `[6]adelay=${ms(tClick3)}|${ms(tClick3)},volume=0.75[c3]`,
    `[bed][v1][v3][s1][s2][s3][s4][h1][h2][c1][c2][c3]amix=inputs=12:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95,loudnorm=I=-12:TP=-1.0:LRA=9[aout]`,
  ].join(';'),
  '-map', '[aout]',
  '-ar', '48000',
  '-ac', '2',
  mixed,
])

const final = join(OUT, 'story-feature-tour.mp4')
run('ffmpeg', [
  '-y',
  '-i', silent,
  '-i', mixed,
  '-c:v', 'copy',
  '-c:a', 'aac',
  '-b:a', '256k',
  '-ar', '48000',
  '-ac', '2',
  '-shortest',
  '-movflags', '+faststart',
  final,
])

// Loudness report
const vol = run('ffmpeg', ['-i', final, '-af', 'volumedetect', '-f', 'null', '-'])
const mean = (vol.stderr.match(/mean_volume:\s*([-\d.]+)/) || [])[1]
const maxv = (vol.stderr.match(/max_volume:\s*([-\d.]+)/) || [])[1]

writeFileSync(
  join(OUT, 'BUILD_NOTES.txt'),
  [
    `story-feature-tour.mp4`,
    `duration≈${durOf(final).toFixed(2)}s`,
    `mean_volume=${mean}dB max_volume=${maxv}dB`,
    `palette: Harbor #07131f · Jade #3dcfb6 · Ink #e8f4ff`,
    `motion: LANCZOS eased zoom/punch; transition pulses`,
    `VO: ElevenLabs Maeve — "Other apps translate written Chinese. We give you Cantonese." (${hookDur.toFixed(2)}s @${tHook}s)`,
    `VO: ElevenLabs Maeve — "Speak it. Read it. Cam it." @${tVoCam}s`,
    `SFX: simple sine sweeps (not whooshes) + soft hit/click`,
    `cues: hook@${tHook} sweeps@${tSweep1}/${tSweep2}/${tSweep3}/${tSweep4} camVO@${tVoCam} end@${tEnd}`,
  ].join('\n') + '\n',
)

console.log('wrote', final, durOf(final).toFixed(2), 's', `mean=${mean} max=${maxv}`)
rmSync(TMP, { recursive: true, force: true })
