#!/usr/bin/env node
/**
 * Assemble Instagram Story — Studio feature tour (~11s, 9:16).
 * Brand: Harbor/Jade from apps/web tokens. Real UI clips + local atmosphere.
 *
 *   node scripts/build-story-feature-tour.mjs
 */
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const BASE = join(ROOT, 'docs/social/story-feature-tour')
const SRC = join(BASE, 'source')
const LIVE = join(SRC, 'live')
const AUDIO = join(BASE, 'audio')
const OUT = join(BASE, 'out')
const TMP = join(OUT, '_tmp')
const W = 1080
const H = 1920
const FPS = 30

mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

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

const openCard = join(SRC, 'open-card.png')
const endCard = join(SRC, 'end-card.png')
const atmos = existsSync(join(SRC, 'atmosphere/harbor-jade-local.png'))
  ? join(SRC, 'atmosphere/harbor-jade-local.png')
  : join(SRC, 'atmosphere/harbor-jade.png')
const solo = join(LIVE, 'solo-1080.mp4')
const convo = join(LIVE, 'conversation-1080.mp4')
const cam = join(LIVE, 'cam-1080.mp4')
const bed = join(AUDIO, 'bed-soft.wav')
const whoosh = join(AUDIO, 'whoosh.wav')
const pop = join(AUDIO, 'pop.wav')
const voMeet = join(AUDIO, 'higgsfield/vo-meet.mp3')
const voCantonese = join(AUDIO, 'higgsfield/vo-cantonese.mp3')
const voFeatures = join(AUDIO, 'higgsfield/vo-features.mp3')

for (const p of [openCard, endCard, atmos, solo, convo, cam, bed, whoosh, pop, voMeet, voCantonese, voFeatures]) {
  if (!existsSync(p)) throw new Error(`missing ${p}`)
}

// Timing (Apple-demo pacing)
const T = {
  open: 1.5,
  solo: 2.5,
  convo: 2.5,
  cam: 2.8,
  end: 2.2,
}
const total = T.open + T.solo + T.convo + T.cam + T.end

function stillToClip(still, out, dur, zoom = 1.06) {
  // Slow Ken Burns punch-in on still
  const frames = Math.round(dur * FPS)
  run('ffmpeg', [
    '-y',
    '-loop',
    '1',
    '-i',
    still,
    '-vf',
    `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},zoompan=z='min(1+${(zoom - 1).toFixed(4)}*on/${frames}, ${zoom})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS},setsar=1`,
    '-t',
    String(dur),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '17',
    '-an',
    out,
  ])
}

function trimClip(src, out, dur, zoomIn = false) {
  const z = zoomIn
    ? `,zoompan=z='min(1+0.04*on/${Math.round(dur * FPS)},1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS}`
    : ''
  // For live clips prefer scale+crop; skip zoompan on video (jumpy). Use simple scale.
  run('ffmpeg', [
    '-y',
    '-i',
    src,
    '-t',
    String(dur),
    '-vf',
    `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS}`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '17',
    '-an',
    out,
  ])
}

console.log('segments…')
const seg = {
  open: join(TMP, 'open.mp4'),
  solo: join(TMP, 'solo.mp4'),
  convo: join(TMP, 'convo.mp4'),
  cam: join(TMP, 'cam.mp4'),
  end: join(TMP, 'end.mp4'),
}

stillToClip(openCard, seg.open, T.open, 1.05)
trimClip(solo, seg.solo, T.solo)
trimClip(convo, seg.convo, T.convo)
trimClip(cam, seg.cam, T.cam)
stillToClip(endCard, seg.end, T.end, 1.04)

// Soft xfade chain
const xf = 0.28
const order = [seg.open, seg.solo, seg.convo, seg.cam, seg.end]
const durs = [T.open, T.solo, T.convo, T.cam, T.end]

// Build filter for xfade
let filter = ''
const inputs = []
order.forEach((p, i) => {
  inputs.push('-i', p)
})
// offset cumulative
let off = durs[0] - xf
filter += `[0][1]xfade=transition=fade:duration=${xf}:offset=${off.toFixed(3)}[v1];`
off += durs[1] - xf
filter += `[v1][2]xfade=transition=fade:duration=${xf}:offset=${off.toFixed(3)}[v2];`
off += durs[2] - xf
filter += `[v2][3]xfade=transition=fade:duration=${xf}:offset=${off.toFixed(3)}[v3];`
off += durs[3] - xf
filter += `[v3][4]xfade=transition=fadeblack:duration=${xf}:offset=${off.toFixed(3)}[vout]`

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
  '17',
  '-an',
  silent,
])

const videoDur = durOf(silent)
console.log('video', videoDur.toFixed(2), 's (target ~', total.toFixed(2), ')')

// VO lengths — duck if overlong
function capVo(src, dest, maxSec) {
  const d = durOf(src)
  if (d <= maxSec + 0.05) {
    run('ffmpeg', ['-y', '-i', src, '-c:a', 'aac', '-b:a', '192k', dest])
    return Math.min(d, maxSec)
  }
  run('ffmpeg', [
    '-y',
    '-i',
    src,
    '-t',
    String(maxSec),
    '-af',
    `afade=t=out:st=${(maxSec - 0.15).toFixed(2)}:d=0.15`,
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    dest,
  ])
  return maxSec
}

const vo1 = join(TMP, 'vo1.aac')
const vo2 = join(TMP, 'vo2.aac')
const vo3 = join(TMP, 'vo3.aac')
capVo(voMeet, vo1, 1.6)
capVo(voCantonese, vo2, 2.2)
capVo(voFeatures, vo3, 2.4)

// Cue times after fades
const tMeet = 0.15
const tSolo = T.open - xf * 0.5
const tConvo = tSolo + T.solo - xf
const tCam = tConvo + T.convo - xf
const tFeatures = tCam + 0.15
const tEnd = tCam + T.cam - xf

const mixed = join(TMP, 'mixed.m4a')
run('ffmpeg', [
  '-y',
  '-i',
  bed,
  '-i',
  vo1,
  '-i',
  vo2,
  '-i',
  vo3,
  '-i',
  whoosh,
  '-i',
  pop,
  '-filter_complex',
  [
    `[0]atrim=0:${videoDur.toFixed(3)},afade=t=in:st=0:d=0.8,afade=t=out:st=${(videoDur - 1.2).toFixed(2)}:d=1.2,volume=0.22[bed]`,
    `[1]adelay=${Math.round(tMeet * 1000)}|${Math.round(tMeet * 1000)},volume=1.05[v1]`,
    `[2]adelay=${Math.round(tSolo * 1000)}|${Math.round(tSolo * 1000)},volume=1.05[v2]`,
    `[3]adelay=${Math.round(tFeatures * 1000)}|${Math.round(tFeatures * 1000)},volume=1.05[v3]`,
    `[4]adelay=${Math.round(tConvo * 1000)}|${Math.round(tConvo * 1000)},volume=0.35[w1]`,
    `[4]adelay=${Math.round(tCam * 1000)}|${Math.round(tCam * 1000)},volume=0.3[w2]`,
    `[5]adelay=${Math.round(tCam * 1000)}|${Math.round(tCam * 1000)},volume=0.28[p1]`,
    `[bed][v1][v2][v3][w1][w2][p1]amix=inputs=7:duration=longest:dropout_transition=0,alimiter=limit=0.92[aout]`,
  ].join(';'),
  '-map',
  '[aout]',
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  mixed,
])

const final = join(OUT, 'story-feature-tour.mp4')
run('ffmpeg', [
  '-y',
  '-i',
  silent,
  '-i',
  mixed,
  '-c:v',
  'copy',
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  '-shortest',
  '-movflags',
  '+faststart',
  final,
])

writeFileSync(
  join(OUT, 'BUILD_NOTES.txt'),
  [
    `story-feature-tour.mp4`,
    `duration≈${durOf(final).toFixed(2)}s`,
    `palette: Harbor #07131f · Jade #3dcfb6 · Ink #e8f4ff`,
    `atmosphere: ${atmos}`,
    `VO: Seed Audio Juno (meet / cantonese / features)`,
    `UI: real Solo + Conversation captures; Cam trim from prior live Recordly`,
    `cues: meet@${tMeet} soloVO@${tSolo} whooshConvo@${tConvo} cam@${tCam} features@${tFeatures}`,
  ].join('\n') + '\n',
)

console.log('wrote', final, durOf(final).toFixed(2), 's')
rmSync(TMP, { recursive: true, force: true })
