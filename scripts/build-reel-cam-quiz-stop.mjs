#!/usr/bin/env node
/**
 * Assemble Drops-style Cam quiz stop-sign Reel (9:16 · ~24s).
 *
 * Beats: hook → stagger quiz + lively BG → jade wipe transition →
 * Cam demo with Recordly-style zoom-in on Translate → zoom-out on result →
 * reveal + TTS → end.
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

// Soft whoosh for quiz→cam transition
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

for (const p of [hook, hookType, quiz, reveal, endCard]) {
  if (!existsSync(p)) throw new Error(`missing ${p} — run scripts/make-reel-cam-quiz-stills.py`)
}

const seg = {
  hook: join(OUT, '_seg-hook.mp4'),
  quiz: join(OUT, '_seg-quiz.mp4'),
  wipe: join(OUT, '_seg-wipe.mp4'),
  cam: join(OUT, '_seg-cam.mp4'),
  reveal: join(OUT, '_seg-reveal.mp4'),
  end: join(OUT, '_seg-end.mp4'),
}

// 0–3s Hook
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

// 3–9s Quiz: stagger pills + lively floating orbs / dashed path sparkle
{
  const tmpDir = join(OUT, '_quiz_frames')
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

def lively(frame, i, total=180):
    """Floating jade orbs, petal drifts, dashed path — keeps motion after pills land."""
    overlay = Image.new('RGBA', frame.size, (0,0,0,0))
    od = ImageDraw.Draw(overlay)
    t = i / 30.0
    # soft ambient orbs
    for k, (cx0, cy0, amp, speed, r) in enumerate([
        (180, 420, 28, 1.1, 36),
        (900, 560, 34, 0.85, 48),
        (160, 1500, 22, 1.3, 28),
        (940, 1380, 30, 0.95, 40),
        (540, 1700, 18, 1.5, 22),
        (520, 380, 40, 0.7, 20),
    ]):
        cx = cx0 + amp * math.sin(t * speed + k)
        cy = cy0 + amp * 0.6 * math.cos(t * speed * 0.8 + k * 0.7)
        a = int(45 + 45 * (0.5 + 0.5 * math.sin(t * 2 + k)))
        od.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(61, 207, 182, a))
    # petal-like diamonds drifting across (lighthearted, not clutter)
    for k in range(7):
        px = (120 + k * 140 + t * (18 + k * 3)) % 1200 - 60
        py = 200 + (k * 97 + 40 * math.sin(t * 1.2 + k)) % 1500
        s = 7 + (k % 3) * 3
        a = int(90 + 50 * math.sin(t * 2.5 + k))
        od.polygon([(px, py-s), (px+s, py), (px, py+s), (px-s, py)], fill=(126, 240, 220, max(0, a)))
    # dashed path sparkle (left rail)
    for yy in range(480, 1400, 28):
        phase = (yy / 28 + i * 0.35) % 6
        if phase < 3:
            od.line([(70, yy), (70, yy + 14)], fill=(126, 240, 220, 220), width=4)
    # gentle pulse ring near option stack once pills are in
    if i >= 57:
        pulse = 0.5 + 0.5 * math.sin(t * 3.2)
        rr = int(210 + 18 * pulse)
        od.ellipse([540-rr, 900-rr, 540+rr, 900+rr], outline=(61, 207, 182, int(40 + 50 * pulse)), width=3)
    overlay = overlay.filter(ImageFilter.GaussianBlur(1))
    out_im = frame.copy()
    out_im.alpha_composite(overlay)
    return out_im

for i in range(12):
    lively(blank, i).convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
for i in range(12, 27):
    t=(i-12)/15
    frame = blank.copy()
    pill = base.crop((0,500,1080,760))
    oy = int(36*(1-t)**2) if t<1 else 0
    frame.paste(pill, (0,500-oy))
    lively(frame, i).convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
for i in range(27, 42):
    frame = blank.copy()
    frame.paste(base.crop((0,500,1080,760)), (0,500))
    t=(i-27)/15
    pill = base.crop((0,780,1080,1040))
    oy = int(36*(1-t)**2) if t<1 else 0
    frame.paste(pill, (0,780-oy))
    lively(frame, i).convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
for i in range(42, 57):
    frame = blank.copy()
    frame.paste(base.crop((0,500,1080,760)), (0,500))
    frame.paste(base.crop((0,780,1080,1040)), (0,780))
    t=(i-42)/15
    pill = base.crop((0,1060,1080,1320))
    oy = int(36*(1-t)**2) if t<1 else 0
    frame.paste(pill, (0,1060-oy))
    lively(frame, i).convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
for i in range(57, 180):
    lively(base, i).convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
print('quiz frames', len(list(out.glob('f*.jpg'))))
`,
  ])
  run('ffmpeg', [
    '-y', '-framerate', '30', '-i', join(tmpDir, 'f%04d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-t', '6', seg.quiz,
  ])
  console.log('seg quiz (stagger + lively BG)')
}

// 9–10.2s Jade iris wipe transition (quiz → cam peek)
{
  const wipeDir = join(OUT, '_wipe_frames')
  mkdirSync(wipeDir, { recursive: true })
  const camStill = join(OUT, '_cam-still.jpg')
  if (existsSync(camLive)) {
    run('ffmpeg', ['-y', '-ss', '1.5', '-i', camLive, '-frames:v', '1', '-q:v', '2', camStill])
  }
  run('python3', [
    '-c',
    `
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math
quiz = Image.open(${JSON.stringify(quiz)}).convert('RGB').resize((1080,1920))
cam_still = Path(${JSON.stringify(camStill)})
if cam_still.exists():
    nxt = Image.open(cam_still).convert('RGB').resize((1080,1920))
else:
    nxt = Image.new('RGB', (1080,1920), (7,19,31))
out = Path(${JSON.stringify(wipeDir)})
out.mkdir(parents=True, exist_ok=True)
n = 36  # 1.2s @ 30fps
for i in range(n):
    t = i / (n - 1)
    # expanding jade ring iris revealing Cam
    r = int(60 + t * 1500)
    mask = Image.new('L', (1080,1920), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([540-r, 960-r, 540+r, 960+r], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(14))
    # jade glow rim
    glow = Image.new('RGBA', (1080,1920), (0,0,0,0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([540-r-30, 960-r-30, 540+r+30, 960+r+30], outline=(61,207,182, int(180*(1-t*0.5))), width=18)
    glow = glow.filter(ImageFilter.GaussianBlur(8))
    frame = Image.composite(nxt, quiz, mask).convert('RGBA')
    frame.alpha_composite(glow)
    d = ImageDraw.Draw(frame)
    for k in range(18):
        a = k * (2*math.pi/18) + t * 3
        x = 540 + r * math.cos(a)
        y = 960 + r * math.sin(a)
        d.ellipse([x-7,y-7,x+7,y+7], fill=(126,240,220, int(220*(1-t*0.3))))
    frame.convert('RGB').save(out/f'f{i:04d}.jpg', quality=92)
print('wipe frames', n)
`,
  ])
  run('ffmpeg', [
    '-y', '-framerate', '30', '-i', join(wipeDir, 'f%04d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-t', '1.2', seg.wipe,
  ])
  console.log('seg wipe transition (iris → Cam)')
  try {
    if (existsSync(camStill)) rmSync(camStill)
  } catch {}
}

// Cam demo with Recordly-style zoom-in on Translate press, zoom-out on result
if (existsSync(camLive)) {
  let zoomInAt = 3.2
  let zoomPeakAt = 4.0
  let zoomOutAt = 5.2 // start easing out soon after press so overlay is visible
  let btnYNorm = 0.12 // toolbar row (Translate)
  if (existsSync(zoomCuesPath)) {
    try {
      const cues = JSON.parse(readFileSync(zoomCuesPath, 'utf8'))
      const zin = cues.find((c) => c.label === 'zoom_in_target' || c.label === 'pre_translate')
      const press = cues.find((c) => c.label === 'translate_press' || c.label === 'translate_release')
      const pre = cues.find((c) => c.label === 'pre_translate')
      if (zin) zoomInAt = Math.max(0.4, zin.sec - 0.25)
      if (press) {
        zoomPeakAt = Math.max(zoomInAt + 0.35, press.sec)
        zoomInAt = Math.min(zoomInAt, Math.max(0.4, press.sec - 0.7))
        // Punch in on the press, hold ~0.7s, then zoom out so the STOP overlay reads
        zoomOutAt = zoomPeakAt + 0.7
      }
      if (pre?.btn?.y != null) btnYNorm = Math.min(0.35, Math.max(0.06, pre.btn.y / H))
    } catch {}
  }
  const dur = 10
  const zinF = Math.round(zoomInAt * FPS)
  const peakF = Math.round(zoomPeakAt * FPS)
  const zoutF = Math.round(zoomOutAt * FPS)
  const easeIn = Math.max(1, peakF - zinF)
  const easeOut = Math.round(1.2 * FPS)
  // Punch in hard to ~1.9× on Translate press, brief hold, ease out to show full STOP overlay
  const zExpr =
    `if(lt(on\\,${zinF})\\,1+0.06*on/${Math.max(1, zinF)}\\,` +
    `if(lt(on\\,${peakF})\\,1.06+(1.9-1.06)*(on-${zinF})/${easeIn}\\,` +
    `if(lt(on\\,${zoutF})\\,1.9\\,` +
    `1.9-(1.9-1.0)*min(1\\,(on-${zoutF})/${easeOut}))))`
  // Bias toward toolbar during punch-in; return toward sign center on the way out
  const zy =
    `if(lt(on\\,${zoutF})\\,(ih*${btnYNorm.toFixed(3)})-(ih/zoom/2)\\,` +
    `(ih*0.42)-(ih/zoom/2))`
  run('ffmpeg', [
    '-y', '-i', camLive,
    '-vf',
    `fps=${FPS},scale=1620:2880:force_original_aspect_ratio=increase,crop=1620:2880,` +
      `zoompan=z='${zExpr}':x='iw/2-(iw/zoom/2)':y='${zy}':d=1:s=${W}x${H}:fps=${FPS},` +
      `tpad=stop_mode=clone:stop_duration=${dur},format=yuv420p`,
    '-t', String(dur), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', seg.cam,
  ])
  console.log(
    `seg cam LIVE (Recordly zoom in@${zoomInAt.toFixed(1)}s peak@${zoomPeakAt.toFixed(1)}s out@${zoomOutAt.toFixed(1)}s)`,
  )
} else {
  run('ffmpeg', [
    '-y', '-loop', '1', '-i', hook,
    '-vf', `scale=${W}:${H},zoompan=z='min(1.2\\,1+0.15*on/300)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=300:s=${W}x${H}:fps=${FPS},format=yuv420p`,
    '-t', '10', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', seg.cam,
  ])
  console.log('seg cam FALLBACK')
}

// Reveal 4s
{
  const frames = 4 * FPS
  run('ffmpeg', [
    '-y', '-loop', '1', '-i', reveal,
    '-vf', `scale=1200:2133,zoompan=z='1+0.03*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS},fade=t=in:st=0:d=0.25,format=yuv420p`,
    '-t', '4', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', seg.reveal,
  ])
  console.log('seg reveal')
}

// End 2s
{
  run('ffmpeg', [
    '-y', '-loop', '1', '-i', endCard,
    '-vf', `scale=${W}:${H},fade=t=in:st=0:d=0.3,format=yuv420p`,
    '-t', '2', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', seg.end,
  ])
  console.log('seg end')
}

const list = join(OUT, '_concat.txt')
writeFileSync(
  list,
  [seg.hook, seg.quiz, seg.wipe, seg.cam, seg.reveal, seg.end].map((p) => `file '${p}'`).join('\n'),
)
const silent = join(OUT, '_silent.mp4')
run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent])

const total = 3 + 6 + 1.2 + 10 + 4 + 2 // 26.2
const final = join(OUT, 'reel-cam-quiz-stop.mp4')
const wipeAt = 3 + 6 // whoosh at transition
const revealAt = 3 + 6 + 1.2 + 10 // Azure 停車 TTS
const voHook = join(AUDIO, 'higgsfield/vo-hook.mp3')
const voQuiz = join(AUDIO, 'higgsfield/vo-quiz.mp3')
const voReveal = join(AUDIO, 'higgsfield/vo-reveal.mp3')
const hasHfVo = existsSync(voHook) && existsSync(voQuiz) && existsSync(voReveal)

const args = ['-y', '-i', silent, '-stream_loop', '-1', '-i', bed, '-i', whoosh]
if (existsSync(tts)) args.push('-i', tts)
if (existsSync(pop)) args.push('-i', pop)
if (hasHfVo) args.push('-i', voHook, '-i', voQuiz, '-i', voReveal)

let filter
if (hasHfVo && existsSync(tts) && existsSync(pop)) {
  // 0 silent 1 bed 2 whoosh 3 tts 4 pop 5 voHook 6 voQuiz 7 voReveal
  filter =
    `[1:a]volume=0.16,atrim=0:${total},asetpts=PTS-STARTPTS[bed];` +
    `[2:a]volume=0.65,adelay=${Math.round(wipeAt * 1000)}|${Math.round(wipeAt * 1000)},apad=whole_dur=${total}[wh];` +
    `[3:a]volume=1.3,adelay=${Math.round(revealAt * 1000)}|${Math.round(revealAt * 1000)},apad=whole_dur=${total}[canto];` +
    `[4:a]volume=0.5,adelay=3400|3400,apad=whole_dur=${total}[p1];` +
    `[5:a]atempo=1.18,volume=1.15,adelay=200|200,apad=whole_dur=${total}[vh];` +
    `[6:a]atempo=1.18,volume=1.1,adelay=3600|3600,apad=whole_dur=${total}[vq];` +
    `[7:a]atempo=1.15,volume=1.05,adelay=${Math.round((revealAt + 1.6) * 1000)}|${Math.round((revealAt + 1.6) * 1000)},apad=whole_dur=${total}[vr];` +
    `[bed][wh][canto][p1][vh][vq][vr]amix=inputs=7:duration=first:dropout_transition=0.15,alimiter=limit=0.92,afade=t=in:st=0:d=0.35,afade=t=out:st=${total - 0.9}:d=0.8[a]`
} else if (existsSync(tts) && existsSync(pop)) {
  // 0 silent 1 bed 2 whoosh 3 tts 4 pop
  filter =
    `[1:a]volume=0.2,atrim=0:${total},asetpts=PTS-STARTPTS[bed];` +
    `[2:a]volume=0.7,adelay=${Math.round(wipeAt * 1000)}|${Math.round(wipeAt * 1000)},apad=whole_dur=${total}[wh];` +
    `[3:a]volume=1.25,adelay=${Math.round(revealAt * 1000)}|${Math.round(revealAt * 1000)},apad=whole_dur=${total}[voice];` +
    `[4:a]volume=0.55,adelay=3400|3400,apad=whole_dur=${total}[p1];` +
    `[bed][wh][voice][p1]amix=inputs=4:duration=first:dropout_transition=0.2,alimiter=limit=0.9,afade=t=in:st=0:d=0.4,afade=t=out:st=${total - 0.9}:d=0.8[a]`
} else if (existsSync(tts)) {
  filter =
    `[1:a]volume=0.22,atrim=0:${total},asetpts=PTS-STARTPTS[bed];` +
    `[2:a]volume=0.7,adelay=${Math.round(wipeAt * 1000)}|${Math.round(wipeAt * 1000)},apad=whole_dur=${total}[wh];` +
    `[3:a]volume=1.25,adelay=${Math.round(revealAt * 1000)}|${Math.round(revealAt * 1000)},apad=whole_dur=${total}[voice];` +
    `[bed][wh][voice]amix=inputs=3:duration=first:dropout_transition=0.2,alimiter=limit=0.9,afade=t=in:st=0:d=0.4,afade=t=out:st=${total - 0.9}:d=0.8[a]`
} else {
  filter =
    `[1:a]volume=0.28,atrim=0:${total},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.5,afade=t=out:st=${total - 0.8}:d=0.7[a]`
}
args.push('-filter_complex', filter, '-map', '0:v', '-map', '[a]')
args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(total), '-movflags', '+faststart', final)
run('ffmpeg', args)

writeFileSync(
  join(OUT, 'BUILD_NOTES.txt'),
  `Drops-style Cam quiz stop-sign Reel (v3)
Duration: ${total}s · 9:16
Photo: Henry stop-sign (stop-sign-photo.png)
Cam insert: ${existsSync(camLive) ? 'LIVE + Recordly-style zoom' : 'FALLBACK'}
TTS 停車: ${existsSync(tts) ? 'YES' : 'NO'}
Higgsfield VO (Juno / seed_audio): ${hasHfVo ? 'hook + quiz + reveal EN' : 'NO'}
Transition: jade iris wipe + whoosh
Liveliness: floating orbs + petals + pulse after pill stagger
Tofu: mixed Latin+CJK fonts for 粵
Note: Higgsfield standalone generate_audio is speech-only — bed/SFX stay local lavfi
`,
)

for (const p of [list, silent, seg.hook, seg.quiz, seg.wipe, seg.cam, seg.reveal, seg.end, join(OUT, '_quiz_frames'), join(OUT, '_wipe_frames')]) {
  try {
    if (existsSync(p)) rmSync(p, { recursive: true, force: true })
  } catch {}
}
console.log('done →', final)
