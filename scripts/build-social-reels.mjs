#!/usr/bin/env node
/**
 * Build 22s Instagram Reels from B-roll stills + UI screenshots + text overlays.
 * Usage: node scripts/build-social-reels.mjs
 */
import { execSync } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/opt/cursor/artifacts/social'
const FONT = '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc'
const W = 1080
const H = 1920
const FPS = 30
const DUR = 22

const clips = [
  {
    id: '01-dinner',
    broll: join(OUT, 'broll-01-dinner.png'),
    ui: join(OUT, 'clip-01-ui.png'),
    out: join(OUT, 'real-cantonese-01-dinner-final.mp4'),
    lines: [
      { start: 0, end: 2, text: 'Most apps translate Chinese.', size: 52 },
      { start: 2, end: 5, text: 'Not Cantonese.', size: 56 },
      { start: 5, end: 9, text: '你回家吃晚飯嗎？', size: 48, color: '0x929294' },
      { start: 9, end: 14, text: '你返屋企食飯未呀？', size: 52, color: '0xe8f4ff' },
      { start: 14, end: 17, text: 'nei5 faan1 uk1 kei2 sik6 faan6 mei6 aa3?', size: 36, color: '0x3dcfb6' },
      { start: 17, end: 20, text: 'One phone. Two languages.', size: 44 },
      { start: 20, end: 22, text: 'JyutTranslate.com', size: 40, color: '0x3dcfb6' },
    ],
  },
  {
    id: '02-miss-you',
    broll: join(OUT, 'broll-02-bedroom.png'),
    ui: join(OUT, 'clip-02-ui.png'),
    out: join(OUT, 'real-cantonese-02-miss-you-final.mp4'),
    lines: [
      { start: 0, end: 2, text: 'Three words.', size: 56 },
      { start: 2, end: 5, text: 'Most apps: 我想你', size: 44, color: '0x929294' },
      { start: 5, end: 10, text: 'Real Cantonese: 我掛住你', size: 48, color: '0xe8f4ff' },
      { start: 10, end: 13, text: 'ngo5 gwaa3 zyu6 nei5', size: 36, color: '0x3dcfb6' },
      { start: 13, end: 17, text: 'Distance is hard. Words matter.', size: 40 },
      { start: 17, end: 20, text: 'Tap any word to learn', size: 44 },
      { start: 20, end: 22, text: 'JyutTranslate · For my ABCs', size: 38, color: '0x3dcfb6' },
    ],
  },
  {
    id: '03-dont-worry',
    broll: join(OUT, 'broll-03-kitchen.png'),
    ui: join(OUT, 'clip-03-ui.png'),
    out: join(OUT, 'real-cantonese-03-dont-worry-final.mp4'),
    lines: [
      { start: 0, end: 2, text: 'Calm down, they said…', size: 48 },
      { start: 2, end: 5, text: '不要擔心', size: 48, color: '0x929294' },
      { start: 5, end: 9, text: '唔使擔心', size: 56, color: '0xe8f4ff' },
      { start: 9, end: 12, text: 'm4 sai2 daam1 sam1', size: 36, color: '0x3dcfb6' },
      { start: 12, end: 17, text: 'One phone. Two languages.', size: 44 },
      { start: 17, end: 20, text: 'Family plan · 4 seats', size: 42, color: '0x3dcfb6' },
      { start: 20, end: 22, text: 'jyuttranslate.com', size: 40, color: '0x3dcfb6' },
    ],
  },
]

function esc(t) {
  return t.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "'\\''")
}

function buildDrawtext(lines) {
  return lines
    .map((l) => {
      const col = l.color || '0xe8f4ff'
      const enable = `between(t\\,${l.start}\\,${l.end})`
      return `drawtext=fontfile='${FONT}':text='${esc(l.text)}':fontsize=${l.size}:fontcolor=${col}:x=(w-text_w)/2:y=h*0.72:borderw=3:bordercolor=0x07131f@0.6:enable='${enable}'`
    })
    .join(',')
}

mkdirSync(OUT, { recursive: true })

for (const clip of clips) {
  if (!existsSync(clip.broll)) {
    console.error('Missing broll:', clip.broll)
    process.exit(1)
  }
  const tmpBroll = join(OUT, `tmp-${clip.id}-broll.mp4`)
  const tmpUi = join(OUT, `tmp-${clip.id}-ui.mp4`)
  const draw = buildDrawtext(clip.lines)

  // Ken-burns B-roll 0-14s
  execSync(
    `ffmpeg -y -loop 1 -i '${clip.broll}' -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},zoompan=z='min(zoom+0.0004,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${14 * FPS}:s=${W}x${H}:fps=${FPS}" -t 14 -pix_fmt yuv420p '${tmpBroll}'`,
    { stdio: 'inherit' },
  )

  // UI insert 14-20s (scale screenshot to phone frame)
  const uiIn = existsSync(clip.ui) ? clip.ui : clip.broll
  execSync(
    `ffmpeg -y -loop 1 -i '${uiIn}' -vf "scale=920:-1,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x07131f" -t 6 -r ${FPS} -pix_fmt yuv420p '${tmpUi}'`,
    { stdio: 'inherit' },
  )

  // Concat + text overlays + end hold
  execSync(
    `ffmpeg -y -i '${tmpBroll}' -i '${tmpUi}' -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0,${draw},tpad=stop_mode=clone:stop_duration=2" -t ${DUR} -pix_fmt yuv420p '${clip.out}'`,
    { stdio: 'inherit' },
  )
  console.log('Wrote', clip.out)
}
