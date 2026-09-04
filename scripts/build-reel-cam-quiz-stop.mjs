#!/usr/bin/env node
/**
 * Assemble studio-grade Cam quiz stop-sign Reel (Apple-demo motion language).
 *
 * Still beats rendered by scripts/render-reel-cam-quiz-studio.py
 * (parallax, light sweeps, blur dissolves, luminous iris, breathing reveal).
 * Cam: live Translate-all capture with eased Recordly zoom.
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
const STUDIO = join(OUT, '_studio')
const W = 1080
const H = 1920
const FPS = 30

mkdirSync(OUT, { recursive: true })
mkdirSync(AUDIO, { recursive: true })

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout)
    throw new Error(`${cmd} failed (${r.status})`)
  }
  return r
}

function encodeSeq(dir, outMp4, durHint) {
  const args = [
    '-y', '-framerate', String(FPS), '-i', join(dir, 'f%04d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium',
  ]
  if (durHint) args.push('-t', String(durHint))
  args.push(outMp4)
  run('ffmpeg', args)
}

const bed = join(AUDIO, 'bed-soft.wav')
if (!existsSync(bed)) {
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=98:sample_rate=44100:duration=45',
    '-f', 'lavfi', '-i', 'sine=frequency=146.83:sample_rate=44100:duration=45',
    '-f', 'lavfi', '-i', 'sine=frequency=196:sample_rate=44100:duration=45',
    '-f', 'lavfi', '-i', 'anoisesrc=color=pink:sample_rate=44100:amplitude=0.01:duration=45',
    '-filter_complex',
    '[0]volume=0.055[a];[1]volume=0.04[b];[2]volume=0.03[c];[3]lowpass=f=450,volume=0.28[d];[a][b][c][d]amix=inputs=4:duration=longest,alimiter=limit=0.2,afade=t=in:st=0:d=1.4,afade=t=out:st=38:d=5',
    bed,
  ])
}
const whoosh = join(AUDIO, 'whoosh.wav')
if (!existsSync(whoosh)) {
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', 'anoisesrc=color=white:sample_rate=44100:amplitude=0.35:duration=1.3',
    '-af', 'highpass=f=350,lowpass=f=2400,afade=t=in:st=0:d=0.2,afade=t=out:st=0.55:d=0.7,volume=0.32',
    whoosh,
  ])
}
const pop = join(AUDIO, 'pop.wav')
if (!existsSync(pop)) {
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=44100:duration=0.12',
    '-af', 'afade=t=in:st=0:d=0.01,afade=t=out:st=0.05:d=0.07,volume=0.35',
    pop,
  ])
}

const camLive = join(SRC, 'live/cam-upload-1080.mp4')
const zoomCuesPath = join(SRC, 'live/zoom-cues.json')
const tts = join(AUDIO, 'tts-ting4ce1.mp3')
const voHook = join(AUDIO, 'higgsfield/vo-hook.mp3')
const voQuiz = join(AUDIO, 'higgsfield/vo-quiz.mp3')
const voReveal = join(AUDIO, 'higgsfield/vo-reveal.mp3')
if (!existsSync(camLive)) throw new Error('missing cam live — run record-reel-cam-quiz-stop.mjs')

// Last Cam frame feeds studio cam→reveal blur dissolve
const camLast = join(SRC, 'live/_cam-last.jpg')
run('ffmpeg', ['-y', '-sseof', '-0.15', '-i', camLive, '-frames:v', '1', '-q:v', '2', camLast])

console.log('render studio frames…')
run('python3', [join(ROOT, 'scripts/render-reel-cam-quiz-studio.py')])

const meta = Object.fromEntries(
  readFileSync(join(STUDIO, 'meta.txt'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => {
      const [k, v] = l.split('=')
      return [k, Number(v)]
    }),
)

const seg = {
  hook: join(OUT, '_seg-hook.mp4'),
  txHq: join(OUT, '_seg-tx-hq.mp4'),
  quiz: join(OUT, '_seg-quiz.mp4'),
  txQc: join(OUT, '_seg-tx-qc.mp4'),
  cam: join(OUT, '_seg-cam.mp4'),
  txCr: join(OUT, '_seg-tx-cr.mp4'),
  reveal: join(OUT, '_seg-reveal.mp4'),
  txRe: join(OUT, '_seg-tx-re.mp4'),
  end: join(OUT, '_seg-end.mp4'),
}

encodeSeq(join(STUDIO, 'hook'), seg.hook, meta.hook)
encodeSeq(join(STUDIO, 'tx_hq'), seg.txHq, meta.tx_hq)
encodeSeq(join(STUDIO, 'quiz'), seg.quiz, meta.quiz)
encodeSeq(join(STUDIO, 'tx_qc'), seg.txQc, meta.tx_qc)
console.log('seg stills + transitions')

// Cam — cubic ease Recordly zoom (Translate all)
{
  const CAM_DUR = 11.5
  let zoomInAt = 2.8
  let zoomPeakAt = 3.6
  let zoomOutAt = 4.5
  let btnYNorm = 0.12
  if (existsSync(zoomCuesPath)) {
    try {
      const cues = JSON.parse(readFileSync(zoomCuesPath, 'utf8'))
      const zin = cues.find((c) => c.label === 'zoom_in_target' || c.label === 'pre_translate')
      const press = cues.find((c) => c.label === 'translate_press' || c.label === 'translate_release')
      const pre = cues.find((c) => c.label === 'pre_translate')
      if (zin) zoomInAt = Math.max(0.4, zin.sec - 0.2)
      if (press) {
        zoomPeakAt = Math.max(zoomInAt + 0.35, press.sec)
        zoomInAt = Math.min(zoomInAt, Math.max(0.4, press.sec - 0.7))
        zoomOutAt = zoomPeakAt + 0.7
      }
      if (pre?.btn?.y != null) btnYNorm = Math.min(0.32, Math.max(0.06, pre.btn.y / H))
    } catch {}
  }
  const zinF = Math.round(zoomInAt * FPS)
  const peakF = Math.round(zoomPeakAt * FPS)
  const zoutF = Math.round(zoomOutAt * FPS)
  const easeIn = Math.max(1, peakF - zinF)
  const easeOut = Math.round(1.35 * FPS)
  // smootherstep-ish via nested mins for organic ease (not linear KB)
  const zExpr =
    `if(lt(on\\,${zinF})\\,1+0.04*on/${Math.max(1, zinF)}\\,` +
    `if(lt(on\\,${peakF})\\,1.04+(1.92-1.04)*pow((on-${zinF})/${easeIn}\\,2)*(3-2*(on-${zinF})/${easeIn})\\,` +
    `if(lt(on\\,${zoutF})\\,1.92\\,` +
    `1.92-(1.92-1.0)*min(1\\,pow((on-${zoutF})/${easeOut}\\,2)*(3-2*min(1\\,(on-${zoutF})/${easeOut}))))))`
  const zy =
    `if(lt(on\\,${zoutF})\\,(ih*${btnYNorm.toFixed(3)})-(ih/zoom/2)\\,` +
    `(ih*0.40)-(ih/zoom/2))`
  run('ffmpeg', [
    '-y', '-i', camLive,
    '-vf',
    `fps=${FPS},scale=1680:2987:force_original_aspect_ratio=increase,crop=1680:2987,` +
      `zoompan=z='${zExpr}':x='iw/2-(iw/zoom/2)':y='${zy}':d=1:s=${W}x${H}:fps=${FPS},` +
      `tpad=stop_mode=clone:stop_duration=${CAM_DUR},format=yuv420p`,
    '-t', String(CAM_DUR), '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-an', seg.cam,
  ])
  console.log(`seg cam (ease zoom in@${zoomInAt.toFixed(1)}s peak@${zoomPeakAt.toFixed(1)}s out@${zoomOutAt.toFixed(1)}s)`)
  meta.cam = CAM_DUR
}

encodeSeq(join(STUDIO, 'tx_cr'), seg.txCr, meta.tx_cr)
encodeSeq(join(STUDIO, 'reveal'), seg.reveal, meta.reveal)
encodeSeq(join(STUDIO, 'tx_re'), seg.txRe, meta.tx_re)
encodeSeq(join(STUDIO, 'end'), seg.end, meta.end)

const order = [seg.hook, seg.txHq, seg.quiz, seg.txQc, seg.cam, seg.txCr, seg.reveal, seg.txRe, seg.end]
const durs = [meta.hook, meta.tx_hq, meta.quiz, meta.tx_qc, meta.cam, meta.tx_cr, meta.reveal, meta.tx_re, meta.end]
const list = join(OUT, '_concat.txt')
writeFileSync(list, order.map((p) => `file '${p}'`).join('\n'))
const silent = join(OUT, '_silent.mp4')
run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent])

const total = durs.reduce((a, b) => a + b, 0)
const final = join(OUT, 'reel-cam-quiz-stop.mp4')

// Audio cue times
let tAcc = 0
const at = {}
const names = ['hook', 'tx_hq', 'quiz', 'tx_qc', 'cam', 'tx_cr', 'reveal', 'tx_re', 'end']
names.forEach((name, i) => {
  at[name] = tAcc
  tAcc += durs[i]
})

const hasHfVo = existsSync(voHook) && existsSync(voQuiz) && existsSync(voReveal)
const args = ['-y', '-i', silent, '-stream_loop', '-1', '-i', bed, '-i', whoosh]
if (existsSync(tts)) args.push('-i', tts)
if (existsSync(pop)) args.push('-i', pop)
if (hasHfVo) args.push('-i', voHook, '-i', voQuiz, '-i', voReveal)

let filter
if (hasHfVo && existsSync(tts) && existsSync(pop)) {
  filter =
    `[1:a]volume=0.14,atrim=0:${total},asetpts=PTS-STARTPTS[bed];` +
    `[2:a]volume=0.5,adelay=${Math.round(at.tx_qc * 1000)}|${Math.round(at.tx_qc * 1000)},apad=whole_dur=${total}[wh];` +
    `[3:a]volume=1.28,adelay=${Math.round(at.reveal * 1000)}|${Math.round(at.reveal * 1000)},apad=whole_dur=${total}[canto];` +
    `[4:a]volume=0.4,adelay=${Math.round((at.quiz + 0.45) * 1000)}|${Math.round((at.quiz + 0.45) * 1000)},apad=whole_dur=${total}[p1];` +
    `[5:a]atempo=1.18,volume=1.08,adelay=280|280,apad=whole_dur=${total}[vh];` +
    `[6:a]atempo=1.18,volume=1.02,adelay=${Math.round((at.quiz + 0.3) * 1000)}|${Math.round((at.quiz + 0.3) * 1000)},apad=whole_dur=${total}[vq];` +
    `[7:a]atempo=1.15,volume=0.98,adelay=${Math.round((at.reveal + 1.45) * 1000)}|${Math.round((at.reveal + 1.45) * 1000)},apad=whole_dur=${total}[vr];` +
    `[bed][wh][canto][p1][vh][vq][vr]amix=inputs=7:duration=first:dropout_transition=0.25,alimiter=limit=0.9,afade=t=in:st=0:d=0.5,afade=t=out:st=${total - 1.0}:d=0.9[a]`
} else if (existsSync(tts)) {
  filter =
    `[1:a]volume=0.18,atrim=0:${total},asetpts=PTS-STARTPTS[bed];` +
    `[2:a]volume=0.55,adelay=${Math.round(at.tx_qc * 1000)}|${Math.round(at.tx_qc * 1000)},apad=whole_dur=${total}[wh];` +
    `[3:a]volume=1.25,adelay=${Math.round(at.reveal * 1000)}|${Math.round(at.reveal * 1000)},apad=whole_dur=${total}[voice];` +
    `[bed][wh][voice]amix=inputs=3:duration=first:dropout_transition=0.2,alimiter=limit=0.9,afade=t=in:st=0:d=0.5,afade=t=out:st=${total - 0.9}:d=0.8[a]`
} else {
  filter = `[1:a]volume=0.22,atrim=0:${total},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.6,afade=t=out:st=${total - 0.9}:d=0.8[a]`
}
args.push('-filter_complex', filter, '-map', '0:v', '-map', '[a]')
args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(total), '-movflags', '+faststart', final)
run('ffmpeg', args)

writeFileSync(
  join(OUT, 'BUILD_NOTES.txt'),
  `Cam quiz stop-sign Reel — STUDIO / Apple-demo motion
Duration: ${total.toFixed(2)}s · 9:16
Motion: parallax hook, spring pills, light sweeps, mote fields
Transitions: blur-dissolve + luminous iris (not Ken Burns / hard cuts)
Cam: Translate all + cubic-ease Recordly zoom
Reveal: focus-rack wrong pills + breathing correct + specular edge
CTA: soft logo settle
Audio: bed + whoosh + Azure 停車 + Higgsfield VO (${hasHfVo ? 'yes' : 'no'})
`,
)

for (const p of [...Object.values(seg), list, silent, STUDIO, camLast]) {
  try {
    if (existsSync(p)) rmSync(p, { recursive: true, force: true })
  } catch {}
}
console.log('done →', final, `(${total.toFixed(2)}s)`)
