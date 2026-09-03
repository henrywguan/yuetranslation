#!/usr/bin/env node
/**
 * Assemble Drops-style Cam quiz stop-sign Reel (9:16 · ~20s).
 * Flat 2.0 stills → stagger/pop motion → optional Cam live insert → reveal + TTS + end.
 *
 *   node scripts/build-reel-cam-quiz-stop.mjs
 */
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const SRC = join(ROOT, 'docs/social/reel-cam-quiz-stop/source')
const OUT = join(ROOT, 'docs/social/reel-cam-quiz-stop/out')
const AUDIO = join(ROOT, 'docs/social/reel-cam-quiz-stop/audio')
const W = 1080
const H = 1920
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

const bed = join(AUDIO, 'bed-soft.wav')
if (!existsSync(bed)) {
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=98:sample_rate=44100:duration=30',
    '-f', 'lavfi', '-i', 'sine=frequency=146.83:sample_rate=44100:duration=30',
    '-f', 'lavfi', '-i', 'sine=frequency=196:sample_rate=44100:duration=30',
    '-f', 'lavfi', '-i', 'anoisesrc=color=pink:sample_rate=44100:amplitude=0.012:duration=30',
    '-filter_complex',
    '[0]volume=0.06[a];[1]volume=0.045[b];[2]volume=0.035[c];[3]lowpass=f=500,volume=0.3[d];[a][b][c][d]amix=inputs=4:duration=longest,alimiter=limit=0.22,afade=t=in:st=0:d=1.2,afade=t=out:st=26:d=3.5',
    bed,
  ])
}

const hook = join(SRC, '01-hook.jpg')
const hookType = join(SRC, '01-hook-type.png')
const quiz = join(SRC, '02-quiz.jpg')
const reveal = join(SRC, '03-reveal.jpg')
const endCard = join(SRC, '04-end.jpg')
const camLive = join(SRC, 'live/cam-upload-1080.mp4')
const tts = join(AUDIO, 'tts-ting4ce1.mp3')

for (const p of [hook, hookType, quiz, reveal, endCard]) {
  if (!existsSync(p)) throw new Error(`missing ${p} — run scripts/make-reel-cam-quiz-stills.py`)
}

const seg = {
  hook: join(OUT, '_seg-hook.mp4'),
  quiz: join(OUT, '_seg-quiz.mp4'),
  cam: join(OUT, '_seg-cam.mp4'),
  reveal: join(OUT, '_seg-reveal.mp4'),
  end: join(OUT, '_seg-end.mp4'),
}

// 0–3s Hook: spring settle zoom + kinetic type pop
{
  const frames = 3 * FPS
  run('ffmpeg', [
    '-y',
    '-loop', '1', '-i', hook,
    '-loop', '1', '-i', hookType,
    '-filter_complex',
    `[0:v]scale=1620:2880,zoompan=z='min(1.08\\,1+0.08*on/${frames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS}[base];` +
      `[1:v]format=rgba,scale=${W}:${H},fade=t=in:st=0.35:d=0.35:alpha=1[ty];` +
      `[base][ty]overlay=0:0:format=auto,format=yuv420p[v]`,
    '-map', '[v]', '-t', '3', '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', seg.hook,
  ])
  console.log('seg hook')
}

// 3–8s Quiz: stagger-pop pills (image sequence)
{
  const tmpDir = join(OUT, '_quiz_frames')
  mkdirSync(tmpDir, { recursive: true })
  run('python3', [
    '-c',
    `
from PIL import Image, ImageDraw
from pathlib import Path
import shutil
src = Path(${JSON.stringify(quiz)})
out = Path(${JSON.stringify(tmpDir)})
shutil.rmtree(out, ignore_errors=True)
out.mkdir()
base = Image.open(src).convert('RGBA').resize((1080,1920))
blank = base.copy()
d = ImageDraw.Draw(blank)
for y in (510, 790, 1070):
    d.rounded_rectangle([110,y,970,y+230], radius=32, fill=(7,19,31,255))
for i in range(12):
    blank.convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
for i in range(12, 27):
    t=(i-12)/15
    frame = blank.copy()
    pill = base.crop((0,500,1080,760))
    oy = int(28*(1-t)**2) if t<1 else 0
    frame.paste(pill, (0,500-oy))
    frame.convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
for i in range(27, 42):
    frame = blank.copy()
    frame.paste(base.crop((0,500,1080,760)), (0,500))
    t=(i-27)/15
    pill = base.crop((0,780,1080,1040))
    oy = int(28*(1-t)**2) if t<1 else 0
    frame.paste(pill, (0,780-oy))
    frame.convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
for i in range(42, 57):
    frame = blank.copy()
    frame.paste(base.crop((0,500,1080,760)), (0,500))
    frame.paste(base.crop((0,780,1080,1040)), (0,780))
    t=(i-42)/15
    pill = base.crop((0,1060,1080,1320))
    oy = int(28*(1-t)**2) if t<1 else 0
    frame.paste(pill, (0,1060-oy))
    frame.convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
for i in range(57, 150):
    base.convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
print('quiz frames', len(list(out.glob('f*.jpg'))))
`,
  ])
  run('ffmpeg', [
    '-y', '-framerate', '30', '-i', join(tmpDir, 'f%04d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-t', '5', seg.quiz,
  ])
  console.log('seg quiz (stagger)')
}

// 8–16s Cam demo — keep choice→upload AND OCR result (source often ~11s; first 8s alone cuts before overlay)
if (existsSync(camLive)) {
  const dur = 8
  // Probe duration
  const probe = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', camLive],
    { encoding: 'utf8' },
  )
  const srcDur = Math.max(1, Number.parseFloat(probe.stdout || '11') || 11)
  // Pack full capture into 8s so modal + Translate all + overlay all land
  const pts = (dur / srcDur).toFixed(6)
  run('ffmpeg', [
    '-y', '-i', camLive,
    '-vf', `setpts=PTS*${pts},fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,tpad=stop_mode=clone:stop_duration=${dur}`,
    '-t', String(dur), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', seg.cam,
  ])
  console.log(`seg cam LIVE (packed ${srcDur.toFixed(1)}s → ${dur}s)`)
} else {
  // Fallback: hook still with tip text baked via quiz field + stop sign push-in
  run('ffmpeg', [
    '-y', '-loop', '1', '-i', hook,
    '-vf', `scale=${W}:${H},zoompan=z='min(1.2\\,1+0.15*on/240)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=240:s=${W}x${H}:fps=${FPS},format=yuv420p`,
    '-t', '8', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', seg.cam,
  ])
  console.log('seg cam FALLBACK (no live capture yet)')
}

// 16–20s Reveal
{
  const frames = 4 * FPS
  run('ffmpeg', [
    '-y', '-loop', '1', '-i', reveal,
    '-vf', `scale=1200:2133,zoompan=z='1+0.03*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS},fade=t=in:st=0:d=0.25,format=yuv420p`,
    '-t', '4', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', seg.reveal,
  ])
  console.log('seg reveal')
}

// 20–22s End
{
  run('ffmpeg', [
    '-y', '-loop', '1', '-i', endCard,
    '-vf', `scale=${W}:${H},fade=t=in:st=0:d=0.3,format=yuv420p`,
    '-t', '2', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', seg.end,
  ])
  console.log('seg end')
}

// Concat
const list = join(OUT, '_concat.txt')
writeFileSync(
  list,
  [seg.hook, seg.quiz, seg.cam, seg.reveal, seg.end].map((p) => `file '${p}'`).join('\n'),
)
const silent = join(OUT, '_silent.mp4')
run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent])

const total = 3 + 5 + 8 + 4 + 2
const final = join(OUT, 'reel-cam-quiz-stop.mp4')
const args = ['-y', '-i', silent, '-stream_loop', '-1', '-i', bed]
if (existsSync(tts)) {
  args.push('-i', tts)
  // TTS lands at reveal (~16s)
  args.push(
    '-filter_complex',
    `[1:a]volume=0.22,atrim=0:${total},asetpts=PTS-STARTPTS[bed];[2:a]volume=1.25,adelay=16200|16200,apad=whole_dur=${total}[voice];[bed][voice]amix=inputs=2:duration=first:dropout_transition=0.2,alimiter=limit=0.9,afade=t=in:st=0:d=0.4,afade=t=out:st=${total - 0.8}:d=0.7[a]`,
    '-map', '0:v', '-map', '[a]',
  )
} else {
  args.push(
    '-filter_complex',
    `[1:a]volume=0.28,atrim=0:${total},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.5,afade=t=out:st=${total - 0.8}:d=0.7[a]`,
    '-map', '0:v', '-map', '[a]',
  )
}
args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(total), '-movflags', '+faststart', final)
run('ffmpeg', args)

writeFileSync(
  join(OUT, 'BUILD_NOTES.txt'),
  `Drops-style Cam quiz stop-sign Reel
Duration: ${total}s · 9:16
Cam insert: ${existsSync(camLive) ? 'LIVE screen capture' : 'FALLBACK (hook zoom) — run record script'}
TTS 停車: ${existsSync(tts) ? 'YES' : 'NO'}
Higgsfield: skipped in cloud (MCP session expired — reconnect in Cursor desktop)
`,
)

// Drop bulky intermediates (keep final mp4 + notes)
for (const p of [list, silent, seg.hook, seg.quiz, seg.cam, seg.reveal, seg.end, join(OUT, '_quiz_frames')]) {
  try {
    if (existsSync(p)) rmSync(p, { recursive: true, force: true })
  } catch {}
}

console.log('done →', final)
