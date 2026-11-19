/**
 * Mirror collected local files into an internal sandbox so sandbox_* tools can see them.
 */
import { createChatSandbox, writeChatSandboxFile } from './api'
import type { MirroredFile } from './chatLocalFolder'

export async function mirrorFilesToNewSandbox(opts: {
  files: MirroredFile[]
  title?: string
  projectId?: string
  onProgress?: (done: number, total: number) => void
}): Promise<{ sessionId: string; written: number; note?: string }> {
  const { session, note, fallbackFromFly } = await createChatSandbox({
    title: opts.title || 'Local folder mirror',
    projectId: opts.projectId,
    driver: 'stub',
  })
  let written = 0
  for (const file of opts.files) {
    await writeChatSandboxFile(session.id, file.path, file.text)
    written += 1
    opts.onProgress?.(written, opts.files.length)
  }
  return {
    sessionId: session.id,
    written,
    note:
      note ||
      (fallbackFromFly
        ? 'Mirrored into stub sandbox (Fly not configured).'
        : `Mirrored ${written} files into ${session.driver} sandbox.`),
  }
}
