import assert from 'node:assert/strict'
import {
  assertSeedanceSuccess,
  chatVideoConfigured,
  clampChatVideoDuration,
  parseSeedanceAspectRatio,
  parseSeedanceResolution,
  SEEDANCE_TEXT_TO_VIDEO,
  videoMarkdown,
  type GeneratedChatVideo,
} from './deepseekChatVideo.js'
import type { V2Response } from '@higgsfield/client/v2'

assert.equal(SEEDANCE_TEXT_TO_VIDEO, 'bytedance/seedance-2.5/text-to-video')
assert.equal(clampChatVideoDuration(5), 5)
assert.equal(clampChatVideoDuration(3), 4)
assert.equal(clampChatVideoDuration(99), 15)
assert.equal(parseSeedanceResolution('1080p'), '1080p')
assert.equal(parseSeedanceResolution('bogus'), '720p')
assert.equal(parseSeedanceAspectRatio('9:16'), '9:16')
assert.equal(parseSeedanceAspectRatio('wide'), '16:9')

const md = videoMarkdown('sunset [clip]', 'https://cdn.example/out.mp4')
assert.match(md, /^!\[Video · sunset clip\]\(https:\/\/cdn\.example\/out\.mp4\)$/)

assert.equal(
  assertSeedanceSuccess({
    status: 'completed',
    request_id: 'r1',
    status_url: '',
    cancel_url: '',
    video: { url: 'https://cdn.example/ok.mp4' },
  } as V2Response),
  'https://cdn.example/ok.mp4',
)

assert.throws(
  () =>
    assertSeedanceSuccess({
      status: 'failed',
      request_id: 'r2',
      status_url: '',
      cancel_url: '',
    } as V2Response),
  /failed/i,
)

assert.throws(
  () =>
    assertSeedanceSuccess({
      status: 'nsfw',
      request_id: 'r3',
      status_url: '',
      cancel_url: '',
    } as V2Response),
  /moderation/i,
)

assert.throws(
  () =>
    assertSeedanceSuccess({
      status: 'canceled',
      request_id: 'r4',
      status_url: '',
      cancel_url: '',
    } as V2Response),
  /canceled/i,
)

// Configured flag reflects env without printing secrets.
void chatVideoConfigured
void (null as unknown as GeneratedChatVideo)

console.log('deepseekChatVideo.smoke: ok')
