#!/usr/bin/env node
/**
 * Assemble Cam quiz stop-sign Reel (9:16) with luxurious soft transitions.
 *
 * Beats: hook → quiz (lively) → soft dissolve → Cam (zoom → Translate all →
 * overlay) → soft dissolve → reveal (breathing correct pill) → soft dissolve → CTA.
 *
 *   node scripts/build-reel-cam-quiz-stop.mjs
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const SRC = join(ROOT, 'docs/social/reel-cam-quiz-stop/source')
const OUT = join(ROOT, 'docs/social/reel-cam-quiz-stop/out')
const AUDIO = join(ROOT, 'docs/social/reel-cam-quiz-stop/audio')
const W = 1080
const H = 1920
const FPS = 30
const XFADE = 0.85 // soft luxurious dissolve between scenes

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
    '-f', 'lavfi', '-i', 'sine=frequency=98:sample_rate=44100:duration=40',
    '-f', 'lavfi', '-i', 'sine=frequency=146.83:sample_rate=44100:duration=40',
    '-f', 'lavfi', '-i', 'sine=frequency=196:sample_rate=44100:duration=40',
    '-f', 'lavfi', '-i', 'anoisesrc=color=pink:sample_rate=44100:amplitude=0.012:duration=40',
    '-filter_complex',
    '[0]volume=0.06[a];[1]volume=0.045[b];[2]volume=0.035[c];[3]lowpass=f=500,volume=0.3[d];[a][b][c][d]amix=inputs=4:duration=longest,alimiter=limit=0.22,afade=t=in:st=0:d=1.2,afade=t=out:st=34:d=4',
    bed,
  ])
}

const whoosh = join(AUDIO, 'whoosh.wav')
if (!existsSync(whoosh)) {
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', 'anoisesrc=color=white:sample_rate=44100:amplitude=0.4:duration=1.2',
    '-af', 'highpass=f=400,lowpass=f=2800,afade=t=in:st=0:d=0.15,afade=t=out:st=0.5:d=0.65,volume=0.35',
    whoosh,
  ])
}

const pop = join(AUDIO, 'pop.wav')
if (!existsSync(pop)) {
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=44100:duration=0.12',
    '-af', 'afade=t=in:st=0:d=0.01,afade=t=out:st=0.05:d=0.07,volume=0.4',
    pop,
  ])
}

const hook = join(SRC, '01-hook.jpg')
const hookType = join(SRC, '01-hook-type.png')
const quiz = join(SRC, '02-quiz.jpg')
const reveal = join(SRC, '03-reveal.jpg')
const endCard = join(SRC, '04-end.jpg')
const camLive = join(SRC, 'live/cam-upload-1080.mp4')
const zoomCuesPath = join(SRC, 'live/zoom-cues.json')
const tts = join(AUDIO, 'tts-ting4ce1.mp3')
const voHook = join(AUDIO, 'higgsfield/vo-hook.mp3')
const voQuiz = join(AUDIO, 'higgsfield/vo-quiz.mp3')
const voReveal = join(AUDIO, 'higgsfield/vo-reveal.mp3')

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

const DUR = { hook: 3.0, quiz: 5.5, cam: 11.5, reveal: 5.0, end: 2.4 }

// ── Hook ────────────────────────────────────────────────────────────
{
  const frames = Math.round(DUR.hook * FPS)
  run('ffmpeg', [
    '-y',
    '-loop', '1', '-i', hook,
    '-loop', '1', '-i', hookType,
    '-filter_complex',
    `[0:v]scale=1620:2880,zoompan=z='min(1.06\\,1+0.06*on/${frames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS}[base];` +
      `[1:v]format=rgba,scale=${W}:${H},fade=t=in:st=0.4:d=0.45:alpha=1[ty];` +
      `[base][ty]overlay=0:0:format=auto,format=yuv420p[v]`,
    '-map', '[v]', '-t', String(DUR.hook), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', seg.hook,
  ])
  console.log('seg hook')
}

// ── Quiz (stagger + liveliness) ─────────────────────────────────────
{
  const tmpDir = join(OUT, '_quiz_frames')
  const nFrames = Math.round(DUR.quiz * FPS)
  mkdirSync(tmpDir, { recursive: true })
  run('python3', [
    '-c',
    `
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math, shutil
src = Path(${JSON.stringify(quiz)})
out = Path(${JSON.stringify(tmpDir)})
shutil.rmtree(out, ignore_errors=True)
out.mkdir()
base = Image.open(src).convert('RGBA').resize((1080,1920))
blank = base.copy()
d = ImageDraw.Draw(blank)
for y in (510, 790, 1070):
    d.rounded_rectangle([110,y,970,y+230], radius=32, fill=(7,19,31,255))
n = ${nFrames}

def lively(frame, i):
    overlay = Image.new('RGBA', frame.size, (0,0,0,0))
    od = ImageDraw.Draw(overlay)
    t = i / 30.0
    for k, (cx0, cy0, amp, speed, r) in enumerate([
        (180, 420, 28, 1.1, 36), (900, 560, 34, 0.85, 48),
        (160, 1500, 22, 1.3, 28), (940, 1380, 30, 0.95, 40),
        (540, 1700, 18, 1.5, 22), (520, 380, 40, 0.7, 20),
    ]):
        cx = cx0 + amp * math.sin(t * speed + k)
        cy = cy0 + amp * 0.6 * math.cos(t * speed * 0.8 + k * 0.7)
        a = int(45 + 45 * (0.5 + 0.5 * math.sin(t * 2 + k)))
        od.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(61, 207, 182, a))
    for k in range(7):
        px = (120 + k * 140 + t * (18 + k * 3)) % 1200 - 60
        py = 200 + (k * 97 + 40 * math.sin(t * 1.2 + k)) % 1500
        s = 7 + (k % 3) * 3
        a = int(90 + 50 * math.sin(t * 2.5 + k))
        od.polygon([(px, py-s), (px+s, py), (px, py+s), (px-s, py)], fill=(126, 240, 220, max(0, a)))
    for yy in range(480, 1400, 28):
        phase = (yy / 28 + i * 0.35) % 6
        if phase < 3:
            od.line([(70, yy), (70, yy + 14)], fill=(126, 240, 220, 220), width=4)
    if i >= 50:
        pulse = 0.5 + 0.5 * math.sin(t * 3.2)
        rr = int(210 + 18 * pulse)
        od.ellipse([540-rr, 900-rr, 540+rr, 900+rr], outline=(61, 207, 182, int(40 + 50 * pulse)), width=3)
    overlay = overlay.filter(ImageFilter.GaussianBlur(1))
    out_im = frame.copy()
    out_im.alpha_composite(overlay)
    return out_im

for i in range(min(10, n)):
    lively(blank, i).convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
for i in range(10, min(24, n)):
    t=(i-10)/14
    frame = blank.copy()
    pill = base.crop((0,500,1080,760))
    oy = int(40*(1-t)**2) if t<1 else 0
    frame.paste(pill, (0,500-oy))
    lively(frame, i).convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
for i in range(24, min(38, n)):
    frame = blank.copy()
    frame.paste(base.crop((0,500,1080,760)), (0,500))
    t=(i-24)/14
    pill = base.crop((0,780,1080,1040))
    oy = int(40*(1-t)**2) if t<1 else 0
    frame.paste(pill, (0,780-oy))
    lively(frame, i).convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
for i in range(38, min(52, n)):
    frame = blank.copy()
    frame.paste(base.crop((0,500,1080,760)), (0,500))
    frame.paste(base.crop((0,780,1080,1040)), (0,780))
    t=(i-38)/14
    pill = base.crop((0,1060,1080,1320))
    oy = int(40*(1-t)**2) if t<1 else 0
    frame.paste(pill, (0,1060-oy))
    lively(frame, i).convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
for i in range(52, n):
    lively(base, i).convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
print('quiz frames', n)
`,
  ])
  run('ffmpeg', [
    '-y', '-framerate', String(FPS), '-i', join(tmpDir, 'f%04d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-t', String(DUR.quiz), seg.quiz,
  ])
  console.log('seg quiz')
}

// ── Cam: zoom in → Translate all press → zoom out to overlay ────────
if (existsSync(camLive)) {
  let zoomInAt = 2.8
  let zoomPeakAt = 3.6
  let zoomOutAt = 4.4
  let btnYNorm = 0.12
  if (existsSync(zoomCuesPath)) {
    try {
      const cues = JSON.parse(readFileSync(zoomCuesPath, 'utf8'))
      const zin = cues.find((c) => c.label === 'zoom_in_target' || c.label === 'pre_translate')
      const press = cues.find((c) => c.label === 'translate_press' || c.label === 'translate_release')
      const pre = cues.find((c) => c.label === 'pre_translate')
      if (zin) zoomInAt = Math.max(0.4, zin.sec - 0.25)
      if (press) {
        zoomPeakAt = Math.max(zoomInAt + 0.3, press.sec)
        zoomInAt = Math.min(zoomInAt, Math.max(0.4, press.sec - 0.65))
        zoomOutAt = zoomPeakAt + 0.65
      }
      if (pre?.btn?.y != null) btnYNorm = Math.min(0.35, Math.max(0.06, pre.btn.y / H))
    } catch {}
  }
  const zinF = Math.round(zoomInAt * FPS)
  const peakF = Math.round(zoomPeakAt * FPS)
  const zoutF = Math.round(zoomOutAt * FPS)
  const easeIn = Math.max(1, peakF - zinF)
  const easeOut = Math.round(1.15 * FPS)
  const zExpr =
    `if(lt(on\\,${zinF})\\,1+0.05*on/${Math.max(1, zinF)}\\,` +
    `if(lt(on\\,${peakF})\\,1.05+(1.85-1.05)*(on-${zinF})/${easeIn}\\,` +
    `if(lt(on\\,${zoutF})\\,1.85\\,` +
    `1.85-(1.85-1.0)*min(1\\,(on-${zoutF})/${easeOut}))))`
  const zy =
    `if(lt(on\\,${zoutF})\\,(ih*${btnYNorm.toFixed(3)})-(ih/zoom/2)\\,` +
    `(ih*0.40)-(ih/zoom/2))`
  run('ffmpeg', [
    '-y', '-i', camLive,
    '-vf',
    `fps=${FPS},scale=1620:2880:force_original_aspect_ratio=increase,crop=1620:2880,` +
      `zoompan=z='${zExpr}':x='iw/2-(iw/zoom/2)':y='${zy}':d=1:s=${W}x${H}:fps=${FPS},` +
      `tpad=stop_mode=clone:stop_duration=${DUR.cam},format=yuv420p`,
    '-t', String(DUR.cam), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', seg.cam,
  ])
  console.log(`seg cam (Translate all · zoom in@${zoomInAt.toFixed(1)}s peak@${zoomPeakAt.toFixed(1)}s out@${zoomOutAt.toFixed(1)}s)`)
} else {
  throw new Error('missing cam live — run scripts/record-reel-cam-quiz-stop.mjs')
}

// ── Reveal: breathing correct pill + ambient BG (no plain Ken Burns) ─
{
  const tmpDir = join(OUT, '_reveal_frames')
  const nFrames = Math.round(DUR.reveal * FPS)
  mkdirSync(tmpDir, { recursive: true })
  run('python3', [
    '-c',
    `
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from pathlib import Path
import math, shutil
src = Path(${JSON.stringify(reveal)})
out = Path(${JSON.stringify(tmpDir)})
shutil.rmtree(out, ignore_errors=True)
out.mkdir()
base = Image.open(src).convert('RGBA').resize((1080,1920))
n = ${nFrames}
# Correct pill is the top option band ~ y 500–760 on still
PILL = (90, 480, 990, 780)

def frame_at(i):
    t = i / 30.0
    breath = 0.5 + 0.5 * math.sin(t * 2.4)  # ~0.4 Hz gentle breathe
    # subtle ambient BG wash
    bg = base.copy()
    glow = Image.new('RGBA', bg.size, (0,0,0,0))
    gd = ImageDraw.Draw(glow)
    for k, (cx, cy, r0) in enumerate([(200, 360, 120), (880, 500, 160), (540, 1600, 200), (140, 1400, 90)]):
        rr = int(r0 + 18 * math.sin(t * 1.3 + k))
        a = int(28 + 22 * (0.5 + 0.5 * math.sin(t * 1.8 + k)))
        gd.ellipse([cx-rr, cy-rr, cx+rr, cy+rr], fill=(61, 207, 182, a))
    # drifting motes
    for k in range(10):
        px = (80 + k * 110 + t * (12 + k * 2)) % 1180 - 50
        py = 160 + (k * 160 + 30 * math.sin(t * 1.1 + k)) % 1700
        s = 5 + k % 4
        gd.ellipse([px-s, py-s, px+s, py+s], fill=(126, 240, 220, int(70 + 40 * math.sin(t * 2 + k))))
    glow = glow.filter(ImageFilter.GaussianBlur(2))
    bg.alpha_composite(glow)

    # Extract correct pill, scale with breath, composite back
    x0,y0,x1,y1 = PILL
    pill = base.crop((x0,y0,x1,y1))
    # scale 1.0 → 1.045 with soft ease
    sc = 1.0 + 0.045 * breath
    nw, nh = int(pill.width * sc), int(pill.height * sc)
    pill_s = pill.resize((nw, nh), Image.Resampling.LANCZOS)
    # jade aura behind pill
    aura = Image.new('RGBA', bg.size, (0,0,0,0))
    ad = ImageDraw.Draw(aura)
    pad = int(18 + 14 * breath)
    ad.rounded_rectangle(
        [x0 - pad, y0 - pad, x1 + pad, y1 + pad],
        radius=40,
        fill=(61, 207, 182, int(35 + 45 * breath)),
    )
    aura = aura.filter(ImageFilter.GaussianBlur(18))
    bg.alpha_composite(aura)
    # center scaled pill on original pill center
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    px = cx - nw // 2
    py = cy - nh // 2
    # dim the still's original pill area slightly so scaled version reads clean
    dim = Image.new('RGBA', (x1-x0, y1-y0), (7, 19, 31, 180))
    bg.paste(Image.alpha_composite(base.crop((x0,y0,x1,y1)), dim), (x0, y0))
    bg.alpha_composite(pill_s, (px, py))
    # soft outer ring pulse
    ring = Image.new('RGBA', bg.size, (0,0,0,0))
    rd = ImageDraw.Draw(ring)
    rr = int(200 + 22 * breath)
    rd.ellipse([cx-rr, cy-rr, cx+rr, cy+rr], outline=(126, 240, 220, int(50 + 70 * breath)), width=3)
    ring = ring.filter(ImageFilter.GaussianBlur(1))
    bg.alpha_composite(ring)
    return bg.convert('RGB')

for i in range(n):
    frame_at(i).save(out/f'f{i:04d}.jpg', quality=92)
print('reveal frames', n)
`,
  ])
  run('ffmpeg', [
    '-y', '-framerate', String(FPS), '-i', join(tmpDir, 'f%04d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-t', String(DUR.reveal), seg.reveal,
  ])
  console.log('seg reveal (breathing correct pill)')
}

// ── End CTA ─────────────────────────────────────────────────────────
{
  const frames = Math.round(DUR.end * FPS)
  run('ffmpeg', [
    '-y', '-loop', '1', '-i', endCard,
    '-vf', `scale=1180:2098,zoompan=z='1+0.02*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS},fade=t=in:st=0:d=0.5,format=yuv420p`,
    '-t', String(DUR.end), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', seg.end,
  ])
  console.log('seg end')
}

// ── Soft xfade chain (no hard cuts) ─────────────────────────────────
const parts = [seg.hook, seg.quiz, seg.cam, seg.reveal, seg.end]
const durs = [DUR.hook, DUR.quiz, DUR.cam, DUR.reveal, DUR.end]
const silent = join(OUT, '_silent.mp4')
{
  const inputs = []
  parts.forEach((p) => inputs.push('-i', p))
  // offset[i] = start time of clip i in the output timeline (accounting for overlaps)
  let offset = durs[0]
  const filters = []
  let prev = '[0:v]'
  for (let i = 1; i < parts.length; i++) {
    const outLabel = i === parts.length - 1 ? '[vout]' : `[v${i}]`
    const off = offset - XFADE
    filters.push(
      `${prev}[${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${off.toFixed(3)}${outLabel}`,
    )
    prev = outLabel
    offset = offset + durs[i] - XFADE
  }
  const totalSilent = offset
  run('ffmpeg', [
    '-y',
    ...inputs,
    '-filter_complex',
    filters.join(';'),
    '-map', '[vout]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-t', String(totalSilent),
    '-an',
    silent,
  ])
  console.log(`xfade chain → ${totalSilent.toFixed(2)}s (fade ${XFADE}s)`)
  writeFileSync(join(OUT, '_total.txt'), String(totalSilent))
}

const total = Number(readFileSync(join(OUT, '_total.txt'), 'utf8'))
const final = join(OUT, 'reel-cam-quiz-stop.mp4')

// Audio timeline mirrors visual offsets
const quizAt = DUR.hook - XFADE
const camAt = quizAt + DUR.quiz - XFADE
const revealAt = camAt + DUR.cam - XFADE
const wipeAt = camAt // soft whoosh as Cam arrives
const hasHfVo = existsSync(voHook) && existsSync(voQuiz) && existsSync(voReveal)

const args = ['-y', '-i', silent, '-stream_loop', '-1', '-i', bed, '-i', whoosh]
if (existsSync(tts)) args.push('-i', tts)
if (existsSync(pop)) args.push('-i', pop)
if (hasHfVo) args.push('-i', voHook, '-i', voQuiz, '-i', voReveal)

let filter
if (hasHfVo && existsSync(tts) && existsSync(pop)) {
  filter =
    `[1:a]volume=0.15,atrim=0:${total},asetpts=PTS-STARTPTS[bed];` +
    `[2:a]volume=0.55,adelay=${Math.round(wipeAt * 1000)}|${Math.round(wipeAt * 1000)},apad=whole_dur=${total}[wh];` +
    `[3:a]volume=1.3,adelay=${Math.round(revealAt * 1000)}|${Math.round(revealAt * 1000)},apad=whole_dur=${total}[canto];` +
    `[4:a]volume=0.45,adelay=${Math.round((quizAt + 0.4) * 1000)}|${Math.round((quizAt + 0.4) * 1000)},apad=whole_dur=${total}[p1];` +
    `[5:a]atempo=1.18,volume=1.1,adelay=250|250,apad=whole_dur=${total}[vh];` +
    `[6:a]atempo=1.18,volume=1.05,adelay=${Math.round((quizAt + 0.35) * 1000)}|${Math.round((quizAt + 0.35) * 1000)},apad=whole_dur=${total}[vq];` +
    `[7:a]atempo=1.15,volume=1.0,adelay=${Math.round((revealAt + 1.5) * 1000)}|${Math.round((revealAt + 1.5) * 1000)},apad=whole_dur=${total}[vr];` +
    `[bed][wh][canto][p1][vh][vq][vr]amix=inputs=7:duration=first:dropout_transition=0.2,alimiter=limit=0.92,afade=t=in:st=0:d=0.4,afade=t=out:st=${total - 0.9}:d=0.8[a]`
} else if (existsSync(tts) && existsSync(pop)) {
  filter =
    `[1:a]volume=0.2,atrim=0:${total},asetpts=PTS-STARTPTS[bed];` +
    `[2:a]volume=0.65,adelay=${Math.round(wipeAt * 1000)}|${Math.round(wipeAt * 1000)},apad=whole_dur=${total}[wh];` +
    `[3:a]volume=1.25,adelay=${Math.round(revealAt * 1000)}|${Math.round(revealAt * 1000)},apad=whole_dur=${total}[voice];` +
    `[4:a]volume=0.5,adelay=${Math.round((quizAt + 0.4) * 1000)}|${Math.round((quizAt + 0.4) * 1000)},apad=whole_dur=${total}[p1];` +
    `[bed][wh][voice][p1]amix=inputs=4:duration=first:dropout_transition=0.2,alimiter=limit=0.9,afade=t=in:st=0:d=0.4,afade=t=out:st=${total - 0.9}:d=0.8[a]`
} else {
  filter =
    `[1:a]volume=0.25,atrim=0:${total},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.5,afade=t=out:st=${total - 0.8}:d=0.7[a]`
}
args.push('-filter_complex', filter, '-map', '0:v', '-map', '[a]')
args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(total), '-movflags', '+faststart', final)
run('ffmpeg', args)

writeFileSync(
  join(OUT, 'BUILD_NOTES.txt'),
  `Cam quiz stop-sign Reel (v4 — luxurious)
Duration: ${total.toFixed(2)}s · 9:16 · xfade ${XFADE}s between scenes
Cam: Translate all only (no draw box) + Recordly zoom in/out
Reveal: breathing correct pill + ambient jade motes (not plain Ken Burns)
Overlay: DEV expand to full STOP after OCR
Higgsfield VO: ${hasHfVo ? 'YES' : 'NO'} · Azure 停車 TTS: ${existsSync(tts) ? 'YES' : 'NO'}
`,
)

for (const p of [
  silent,
  seg.hook,
  seg.quiz,
  seg.cam,
  seg.reveal,
  seg.end,
  join(OUT, '_quiz_frames'),
  join(OUT, '_reveal_frames'),
  join(OUT, '_total.txt'),
]) {
  try {
    if (existsSync(p)) rmSync(p, { recursive: true, force: true })
  } catch {}
}
console.log('done →', final, `(${total.toFixed(2)}s)`)
