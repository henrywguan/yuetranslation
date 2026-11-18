/**
 * One-off Seedance 2.5 text-to-video smoke using the official SDK.
 * Prints only the generated video URL (never credentials).
 *
 * Usage (from apps/api, with HF_CREDENTIALS in .env.local):
 *   npx tsx scripts/seedance-example.ts
 */
import '../src/env.js'
import {
  assertSeedanceSuccess,
  SEEDANCE_TEXT_TO_VIDEO,
} from '../src/deepseekChatVideo.js'
import { config, higgsfield } from '@higgsfield/client/v2'
import { env } from '../src/env.js'

async function main() {
  if (!env.hfCredentials || !env.hfCredentials.includes(':')) {
    console.error('FAIL: HF_CREDENTIALS missing or not KEY_ID:KEY_SECRET')
    process.exit(1)
  }

  config({ credentials: env.hfCredentials })

  const result = await higgsfield.subscribe(SEEDANCE_TEXT_TO_VIDEO, {
    input: {
      prompt: 'A cinematic scene at sunset',
      duration: 5,
      resolution: '720p',
      aspect_ratio: '16:9',
      output_format: 'mp4',
      generate_audio: true,
    },
    withPolling: true,
  })

  try {
    const url = assertSeedanceSuccess(result)
    console.log(url)
    process.exit(0)
  } catch (err) {
    const status = result?.status || 'unknown'
    console.error(`FAIL: status=${status} — ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
