#!/usr/bin/env node
/**
 * Package A — branded Instagram Reel compositor
 * Harbor #07131f · Jade #3dcfb6 · Ink #e8f4ff
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '/opt/cursor/artifacts/social/v2'
const FONT = '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc'
const W = 1080
const H = 1920
const FPS = 30
const OUT = join(DIR, 'real-cantonese-01-dinner-branded.mp4')

const shots = [
  join(DIR, 'shot1-dinner.mp4'),
  join(DIR, 'shot2-phone.mp4'),
  join(DIR, 'shot3-insert.mp4'),
]
for (const s of shots) {
  if (!existsSync(s)) {
    console.error('Missing', s)
    process.exit(1)
  }
}

const mark = join(DIR, 'logo-mark.png')
const lockup = join(DIR, 'logo-lockup.png')
mkdirSync(DIR, { recursive: true })

function run(cmd) {
  console.log('\n>', cmd.slice(0, 140), '…')
  execSync(cmd, { stdio: 'inherit' })
}

function hasAudio(path) {
  try {
    return execSync(
      `ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 '${path}'`,
    )
      .toString()
      .trim()
      .includes('audio')
  } catch {
    return false
  }
}

// Normalize segments: 7s / 5s / 5s — stereo AAC on all
const segs = [
  { in: shots[0], dur: 7, out: join(DIR, 'seg1.mp4') },
  { in: shots[1], dur: 5, out: join(DIR, 'seg2.mp4') },
  { in: shots[2], dur: 5, out: join(DIR, 'seg3.mp4') },
]

for (const s of segs) {
  if (hasAudio(s.in)) {
    run(
      `ffmpeg -y -i '${s.in}' -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS}" -t ${s.dur} -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 160k -ar 44100 -ac 2 '${s.out}'`,
    )
  } else {
    run(
      `ffmpeg -y -i '${s.in}' -f lavfi -i anullsrc=r=44100:cl=stereo -map 0:v -map 1:a -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS}" -t ${s.dur} -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest '${s.out}'`,
    )
  }
}

// End card 5s
const endCard = join(DIR, 'endcard.mp4')
run(
  `ffmpeg -y -f lavfi -i color=c=0x07131f:s=${W}x${H}:d=5:r=${FPS} -f lavfi -i anullsrc=r=44100:cl=stereo -i '${lockup}' -i '${mark}' -filter_complex "\
[0:v]drawbox=x=0:y=0:w=10:h=${H}:color=0x3dcfb6@1:t=fill[bar];\
[2:v]scale=700:-1[logo];\
[3:v]scale=160:-1[mk];\
[bar][mk]overlay=(W-w)/2:480[m];\
[m][logo]overlay=(W-w)/2:700[l];\
[l]drawtext=fontfile='${FONT}':text='Real Cantonese. Not just Chinese.':fontsize=36:fontcolor=0xe8f4ff:x=(w-text_w)/2:y=900,\
drawtext=fontfile='${FONT}':text='jyuttranslate.com':fontsize=44:fontcolor=0x3dcfb6:x=(w-text_w)/2:y=980,\
drawtext=fontfile='${FONT}':text='Try Conversation mode':fontsize=32:fontcolor=0xe8f4ff@0.9:x=(w-text_w)/2:y=1080[vout]\
" -map '[vout]' -map 1:a -t 5 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest '${endCard}'`,
)

// Xfade video + acrossfade audio + brand overlays
// offsets: seg1=7, fade 0.5 → start2 at 6.5; +5 → 11.5 fade → start3 at 11; +5 → 16 fade to end at 15.5; +5 → ~20.5
run(
  `ffmpeg -y \
-i '${segs[0].out}' -i '${segs[1].out}' -i '${segs[2].out}' -i '${endCard}' -i '${mark}' \
-filter_complex "\
[0:v][1:v]xfade=transition=fade:duration=0.5:offset=6.5[v01];\
[v01][2:v]xfade=transition=fade:duration=0.5:offset=11.0[v012];\
[v012][3:v]xfade=transition=fade:duration=0.5:offset=15.5[vbase];\
[4:v]scale=80:-1,format=rgba,colorchannelmixer=aa=0.92[wm];\
[vbase][wm]overlay=40:52[wmapped];\
[wmapped]drawbox=x=0:y=0:w=10:h=${H}:color=0x3dcfb6@0.95:t=fill[bar];\
[bar]drawtext=fontfile='${FONT}':text='Most apps translate Chinese.':fontsize=44:fontcolor=0xe8f4ff:x=(w-text_w)/2:y=h*0.73:borderw=3:bordercolor=0x07131f@0.75:enable='between(t\\,0.5\\,2.6)',\
drawtext=fontfile='${FONT}':text='Not Cantonese.':fontsize=52:fontcolor=0x3dcfb6:x=(w-text_w)/2:y=h*0.73:borderw=3:bordercolor=0x07131f@0.75:enable='between(t\\,2.6\\,4.8)',\
drawtext=fontfile='${FONT}':text='你回家吃晚飯嗎？':fontsize=46:fontcolor=0x929294:x=(w-text_w)/2:y=h*0.73:borderw=3:bordercolor=0x07131f@0.75:enable='between(t\\,4.8\\,7.2)',\
drawtext=fontfile='${FONT}':text='你返屋企食飯未呀？':fontsize=50:fontcolor=0xe8f4ff:x=(w-text_w)/2:y=h*0.70:borderw=3:bordercolor=0x07131f@0.75:enable='between(t\\,7.2\\,11.5)',\
drawtext=fontfile='${FONT}':text='nei5 faan1 uk1 kei2 sik6 faan6 mei6 aa3?':fontsize=32:fontcolor=0x3dcfb6:x=(w-text_w)/2:y=h*0.77:borderw=2:bordercolor=0x07131f@0.75:enable='between(t\\,7.8\\,11.5)',\
drawtext=fontfile='${FONT}':text='One phone. Two languages.':fontsize=42:fontcolor=0xe8f4ff:x=(w-text_w)/2:y=h*0.73:borderw=3:bordercolor=0x07131f@0.75:enable='between(t\\,11.5\\,15.5)'[vout];\
[0:a][1:a]acrossfade=d=0.5[a01];\
[a01][2:a]acrossfade=d=0.5[a012];\
[a012][3:a]acrossfade=d=0.5[aout]\
" -map '[vout]' -map '[aout]' -t 20.5 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 160k '${OUT}'`,
)

console.log('\nWrote', OUT)
run(`ffprobe -v error -show_entries format=duration,size -show_streams -of default=noprint_wrappers=1 '${OUT}'`)
