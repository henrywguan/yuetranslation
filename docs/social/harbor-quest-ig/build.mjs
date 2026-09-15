#!/usr/bin/env node
/**
 * Build Harbor Quest IG Story (10s) + carousel video slides (ffmpeg only — $0 credits).
 *
 *   node docs/social/ig-posts/render.mjs --only harbor-quest
 *   node docs/social/harbor-quest-ig/build.mjs
 */
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { spawnSync as runSync } from 'node:child_process'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../../..')
const SRC = join(__dirname, 'source')
const FRAMES = join(SRC, 'frames')
const OUT = join(__dirname, 'out')
const IG_OUT = join(ROOT, 'docs/social/ig-posts/out')
mkdirSync(OUT, { recursive: true })

function run(cmd, args) {
  const r = runSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout)
    throw new Error(`${cmd} failed`)
  }
  return r
}

function softBed(path, seconds) {
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', `sine=frequency=72:sample_rate=48000:duration=${seconds}`,
    '-f', 'lavfi', '-i', `sine=frequency=108:sample_rate=48000:duration=${seconds}`,
    '-f', 'lavfi', '-i', `sine=frequency=162:sample_rate=48000:duration=${seconds}`,
    '-f', 'lavfi', '-i', `anoisesrc=color=pink:sample_rate=48000:amplitude=0.015:duration=${seconds}`,
    '-filter_complex',
    '[0]volume=0.18[a];[1]volume=0.12[b];[2]volume=0.08[c];[3]lowpass=f=600,volume=0.4[d];[a][b][c][d]amix=inputs=4:normalize=0,alimiter=limit=0.32',
    path,
  ])
}

function clickSfx(path) {
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=1320:sample_rate=48000:duration=0.08',
    '-af', 'afade=t=out:st=0.02:d=0.06,volume=0.45',
    path,
  ])
}

// 1) Explore pan clip for carousel (≈6s @ 12fps from frames)
const frame0 = join(FRAMES, 'explore-00.jpg')
if (existsSync(frame0)) {
  const explore = join(OUT, 'carousel-02-voyage.mp4')
  run('ffmpeg', [
    '-y',
    '-framerate', '12',
    '-i', join(FRAMES, 'explore-%02d.jpg'),
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x07131f,fps=30',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '6', '-an',
    explore,
  ])
  console.log('wrote', explore)
}

// 2) Ken Burns arena clip for carousel (≈5s)
const arenaStill = join(SRC, '03-arena.jpg')
const arenaVid = join(OUT, 'carousel-04-arena.mp4')
run('ffmpeg', [
  '-y',
  '-loop', '1', '-i', arenaStill,
  '-vf',
  "scale=1200:2600,zoompan=z='min(1.12,1+0.0015*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=150:s=1080x1920:fps=30,format=yuv420p",
  '-t', '5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an',
  arenaVid,
])
console.log('wrote', arenaVid)

// 3) 10s Story reveal — stitch title/voyage/arena/end PNGs if present, else stills
const storyBeats = [
  { img: join(IG_OUT, 'ig-story-harbor-quest-title.png'), dur: 2.2 },
  { img: join(IG_OUT, 'ig-story-harbor-quest-voyage.png'), dur: 3.0 },
  { img: join(IG_OUT, 'ig-story-harbor-quest-arena.png'), dur: 2.6 },
  { img: join(IG_OUT, 'ig-story-harbor-quest-end.png'), dur: 2.2 },
]

const missing = storyBeats.filter((b) => !existsSync(b.img))
if (missing.length) {
  console.warn('Story PNGs missing — run render.mjs --only harbor-quest first:', missing.map((m) => m.img))
} else {
  const list = join(OUT, 'story-list.txt')
  writeFileSync(
    list,
    storyBeats.map((b) => `file '${b.img}'\nduration ${b.dur}`).join('\n') + `\nfile '${storyBeats.at(-1).img}'\n`,
  )
  const bed = join(OUT, 'bed.wav')
  const click = join(OUT, 'click.wav')
  softBed(bed, 12)
  clickSfx(click)

  const storySilent = join(OUT, 'story-silent.mp4')
  run('ffmpeg', [
    '-y',
    '-f', 'concat', '-safe', '0', '-i', list,
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x07131f,fps=30,format=yuv420p',
    '-r', '30', '-t', '10', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    storySilent,
  ])

  const story = join(OUT, 'ig-story-harbor-quest-10s.mp4')
  run('ffmpeg', [
    '-y',
    '-i', storySilent,
    '-i', bed,
    '-i', click,
    '-filter_complex',
    [
      '[1]volume=0.55,afade=t=in:st=0:d=0.4,afade=t=out:st=9.2:d=0.8[bed]',
      '[2]adelay=2100|2100,volume=0.7[c1]',
      '[2]adelay=5200|5200,volume=0.65[c2]',
      '[2]adelay=7800|7800,volume=0.65[c3]',
      '[bed][c1][c2][c3]amix=inputs=4:normalize=0,alimiter=limit=0.9,loudnorm=I=-14:TP=-1.5:LRA=11[a]',
    ].join(';'),
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-t', '10',
    story,
  ])
  copyFileSync(story, join(IG_OUT, 'ig-story-harbor-quest-10s.mp4'))
  console.log('wrote', story)

  // Also copy carousel videos into ig-posts/out for publishing
  for (const name of ['carousel-02-voyage.mp4', 'carousel-04-arena.mp4']) {
    const src = join(OUT, name)
    if (existsSync(src)) copyFileSync(src, join(IG_OUT, `ig-post-harbor-quest-${name}`))
  }
}

console.log('done →', OUT)
