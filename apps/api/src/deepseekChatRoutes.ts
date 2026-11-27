/**
 * Family/Business DeepSeek general chat — POST /api/chat
 *
 * Unified Completions harness (thinking + client tools + native web tools).
 * DeepThink + Search streams often exceed 60s. vercel.json sets api maxDuration
 * to 300s; this route also emits SSE heartbeats so HTTP/1.1 proxies do not idle-close
 * while waiting on the first reasoning/search token.
 */
import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { generateDeepseekChatAgentReply, streamDeepseekChatAgent } from './deepseekChatAgent.js'
import {
  deepseekChatModel,
  DeepseekChatBodySchema,
  deepseekChatPayloadMessage,
  deepseekChatPayloadReason,
} from './deepseekChat.js'
import {
  allowChatCallerRate,
  enforceChatCallerQuota,
  recordChatCallerTurn,
  resolveChatCaller,
} from './chatGateUnlock.js'
import type { GuestRequest } from './guest.js'
import {
  generateDeepseekChatHarnessReply,
  streamDeepseekChatHarness,
} from './deepseekChatHarness.js'
import {
  isNoSummaryAgentStub,
  looksLikeBuildOrViewRequest,
  pathFromSandboxActivity,
  summarizeEmptyContinueRecovery,
  summarizeHarnessToolWork,
} from './deepseekChatWorkRecovery.js'
import { resolveChatCapabilities, type DeepseekChatPromptContext } from './deepseekChatPrompt.js'
import {
  deepseekChatSupportsSearch,
  streamDeepseekChatWithSearch,
} from './deepseekChatSearch.js'
import { loadChatPluginCredentials } from './deepseekChatPluginKeys.js'
import type { ChatPluginCredentials } from './deepseekChatPluginKeys.js'
import { env, openaiConfigured } from './env.js'

/** SSE comment cadence — keeps the function response active during long DeepSeek thinks. */
export const DEEPSEEK_CHAT_SSE_HEARTBEAT_MS = 12_000

function wantsStream(req: AuthedRequest): boolean {
  const q = String(req.query.stream || '').trim().toLowerCase()
  if (q === '1' || q === 'true') return true
  const accept = String(req.headers.accept || '')
  return /text\/event-stream/i.test(accept)
}

function writeSse(res: Response, payload: string) {
  if (res.writableEnded) return
  res.write(payload)
  const flushable = res as Response & { flush?: () => void }
  flushable.flush?.()
}

async function* chatStreamEvents(
  messages: Parameters<typeof streamDeepseekChatHarness>[0],
  thinkingEnabled: boolean,
  searchEnabled: boolean,
  prompt: DeepseekChatPromptContext,
  signal?: AbortSignal,
  fileIds?: string[],
  plugins?: string[],
  pluginCreds?: ChatPluginCredentials,
  continueReply = false,
  harnessEnabled = false,
  workspaceFiles?: import('./deepseekChatWorkspace.js').ChatWorkspaceFileWire[],
  userId?: string,
  sandboxSessionId?: string,
  projectId?: string,
  projectAgents?: import('./deepseekChatProject.js').ProjectAgentWire[],
  chatMode: 'agent' | 'ask' | 'plan' = 'agent',
): AsyncGenerator<
  | { kind: 'thinking' }
  | { kind: 'searching' }
  | { kind: 'reasoning'; text: string }
  | { kind: 'delta'; text: string }
  | { kind: 'content_replace'; text: string }
  | { kind: 'sources'; sources: { url: string; title: string }[] }
  | { kind: 'search_step'; step: unknown }
  | { kind: 'title'; title: string }
  | { kind: 'image'; url: string; prompt: string; id: string }
  | { kind: 'avatar'; action: 'list' | 'play' | 'react'; mood?: string }
  | { kind: 'workspace'; files: import('./deepseekChatWorkspace.js').ChatWorkspaceFileWire[] }
  | { kind: 'project'; actions: import('./deepseekChatProject.js').ProjectAction[] }
  | { kind: 'sandbox'; activity: Record<string, unknown> },
  void,
  unknown
> {
  let harnessEmitted = false
  try {
    for await (const event of streamDeepseekChatHarness(messages, {
      thinkingEnabled,
      searchEnabled,
      harnessEnabled,
      chatMode,
      prompt: { ...prompt, searchEnabled, harnessEnabled, sandboxSessionId, chatMode },
      signal,
      fileIds,
      plugins,
      pluginCreds,
      continueReply,
      workspaceFiles,
      userId,
      sandboxSessionId,
      projectId,
      projectAgents,
    })) {
      harnessEmitted = true
      yield event
    }
    return
  } catch (err) {
    if (signal?.aborted) throw err
    const message = err instanceof Error ? err.message : String(err)
    const hasFiles =
      Boolean(fileIds?.length) || messages.some((m) => Array.isArray(m.fileIds) && m.fileIds.length > 0)
    // Attachments are harness-only; do not silently drop them on fallback.
    if (hasFiles) throw err
    // Partial SSE already went to the client — never concatenate a second model.
    if (harnessEmitted) throw err
    console.warn('[deepseek-chat] harness failed before first event, falling back:', message)
  }

  if (searchEnabled && deepseekChatSupportsSearch()) {
    try {
      yield* streamDeepseekChatWithSearch(messages, thinkingEnabled, signal, {
        ...prompt,
        mode: 'search',
        searchEnabled: true,
      })
      return
    } catch (err) {
      if (signal?.aborted) throw err
      console.warn(
        '[deepseek-chat] Anthropic search stream failed, falling back to tool agent:',
        err instanceof Error ? err.message : err,
      )
    }
  }

  yield* streamDeepseekChatAgent(messages, {
    thinkingEnabled,
    prompt: { ...prompt, mode: 'tools', searchEnabled: false },
    signal,
  })
}

/** POST /api/chat — Family/Business/admin, or owner-fallback gate token (Family-equivalent). */
export async function postDeepseekChat(req: AuthedRequest, res: Response) {
  const caller = await resolveChatCaller(req as GuestRequest, res)
  if (!caller) return

  if (!allowChatCallerRate(res, caller, 'deepseekChat', env.chatRlPerMin)) return

  if (!openaiConfigured()) {
    res.status(503).json({ message: 'Chat model is not configured.' })
    return
  }

  const parsed = DeepseekChatBodySchema.safeParse(req.body)
  if (!parsed.success) {
    const reason = deepseekChatPayloadReason(parsed.error)
    console.warn('[deepseek-chat] invalid payload', reason, parsed.error.flatten())
    res.status(400).json({
      message: deepseekChatPayloadMessage(reason),
      code: 'chat_payload_invalid',
      reason,
    })
    return
  }

  const continueReply = parsed.data.continue === true
  const last = parsed.data.messages[parsed.data.messages.length - 1]
  if (continueReply) {
    if (!last || last.role !== 'assistant' || !last.content.trim()) {
      res.status(400).json({ message: 'Continue requires a non-empty assistant reply.' })
      return
    }
  } else if (!last || last.role !== 'user') {
    res.status(400).json({ message: 'Last message must be from the user.' })
    return
  }

  if (!(await enforceChatCallerQuota(res, caller))) return

  const stream = wantsStream(req)
  const lastUser =
    [...parsed.data.messages].reverse().find((m) => m.role === 'user') || last
  // Prefix continue must not declare native web tools (wrong wire shape on /beta).
  const {
    thinkingEnabled,
    searchEnabled,
    thinkingAuto,
    searchAuto,
  } = resolveChatCapabilities({
    thinking: parsed.data.thinking,
    search: parsed.data.search,
    userText: lastUser.content,
    continueReply,
    supportsSearch: deepseekChatSupportsSearch(),
  })

  const harnessEnabled = parsed.data.harness === true
  const chatMode =
    parsed.data.chatMode === 'ask' || parsed.data.chatMode === 'plan'
      ? parsed.data.chatMode
      : 'agent'
  const workspaceFiles = harnessEnabled
    ? (parsed.data.workspace?.files || []).map((f) => ({
        id: f.id || `ws_${f.path}`,
        path: f.path,
        mime: f.mime,
        text: f.text,
        updatedAt: f.updatedAt || Date.now(),
      }))
    : undefined
  const sandboxSessionId = parsed.data.sandboxSessionId
  const projectId = parsed.data.projectId
  const projectAgents = parsed.data.projectAgents
  const promptBase: DeepseekChatPromptContext = {
    timeZone: parsed.data.timeZone,
    locale: parsed.data.locale,
    primaryLang: parsed.data.primaryLang,
    avatarCharacter: parsed.data.avatarCharacter,
    avatarName: parsed.data.avatarName,
    avatarTrait: parsed.data.avatarTrait,
    avatarNotes: parsed.data.avatarNotes,
    plan: caller.isAdmin ? `admin (${caller.plan})` : caller.plan,
    searchEnabled,
    harnessEnabled,
    chatMode,
    inboxRole: parsed.data.inboxRole,
    projectMemory: parsed.data.projectMemory,
    sandboxSessionId,
  }
  const fileIds = parsed.data.fileIds
  const plugins = parsed.data.plugins
  const pluginCreds = caller.userId.startsWith('gate:')
    ? ({} as ChatPluginCredentials)
    : await loadChatPluginCredentials(caller.userId)

  try {
    if (!stream) {
      try {
        const { reply, model, reasoning, title } = await generateDeepseekChatHarnessReply(
          parsed.data.messages,
          {
            thinkingEnabled,
            searchEnabled,
            harnessEnabled,
            chatMode,
            prompt: promptBase,
            fileIds,
            plugins,
            pluginCreds,
            continueReply,
            workspaceFiles,
            userId: caller.userId,
            sandboxSessionId,
            projectId,
            projectAgents,
          },
        )
        recordChatCallerTurn(caller)
        res.json({ ok: true, reply, model, reasoning: reasoning || undefined, title })
        return
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Chat failed.'
        // Attachments only exist on the harness path — do not retry without them.
        const hasFiles =
          Boolean(fileIds?.length) ||
          parsed.data.messages.some((m) => Array.isArray(m.fileIds) && m.fileIds.length > 0)
        if (hasFiles || continueReply) {
          // Continue is beta-prefix only — do not fall back to a normal agent turn.
          res.status(502).json({ message })
          return
        }
        const { reply, model, reasoning } = await generateDeepseekChatAgentReply(parsed.data.messages, {
          thinkingEnabled,
          prompt: { ...promptBase, mode: 'tools', searchEnabled: false },
        })
        recordChatCallerTurn(caller)
        res.json({ ok: true, reply, model, reasoning: reasoning || undefined })
        return
      }
    }

    const upstream = new AbortController()
    const onClientClose = () => {
      if (!upstream.signal.aborted) upstream.abort()
    }
    req.on('close', onClientClose)
    res.on('close', onClientClose)

    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    writeSse(res, `: open\n\n`)
    writeSse(res, `data: ${JSON.stringify({ status: 'started' })}\n\n`)
    if (thinkingAuto) {
      writeSse(res, `data: ${JSON.stringify({ status: 'thinking', auto: true })}\n\n`)
    }
    if (searchAuto) {
      writeSse(res, `data: ${JSON.stringify({ status: 'searching', auto: true })}\n\n`)
    }

    const heartbeat = setInterval(() => {
      writeSse(res, `: ping ${Date.now()}\n\n`)
    }, DEEPSEEK_CHAT_SSE_HEARTBEAT_MS)
    if (typeof heartbeat.unref === 'function') heartbeat.unref()

    let full = ''
    const workspacePathsSeen: string[] = []
    let imagesSeen = 0
    let projectActionsSeen = 0
    let toolsSideEffects = false
    try {
      for await (const event of chatStreamEvents(
        parsed.data.messages,
        thinkingEnabled,
        searchEnabled,
        promptBase,
        upstream.signal,
        fileIds,
        plugins,
        pluginCreds,
        continueReply,
        harnessEnabled,
        workspaceFiles,
        caller.userId,
        sandboxSessionId,
        projectId,
        projectAgents,
        chatMode,
      )) {
        if (upstream.signal.aborted || res.writableEnded) break
        if (event.kind === 'thinking') {
          writeSse(res, `data: ${JSON.stringify({ status: 'thinking' })}\n\n`)
          continue
        }
        if (event.kind === 'searching') {
          writeSse(res, `data: ${JSON.stringify({ status: 'searching' })}\n\n`)
          continue
        }
        if (event.kind === 'reasoning') {
          writeSse(res, `data: ${JSON.stringify({ reasoning: event.text })}\n\n`)
          continue
        }
        if (event.kind === 'sources') {
          writeSse(res, `data: ${JSON.stringify({ sources: event.sources })}\n\n`)
          continue
        }
        if (event.kind === 'search_step') {
          writeSse(res, `data: ${JSON.stringify({ searchStep: event.step })}\n\n`)
          continue
        }
        if (event.kind === 'title') {
          writeSse(res, `data: ${JSON.stringify({ title: event.title })}\n\n`)
          continue
        }
        if (event.kind === 'workspace') {
          for (const f of event.files || []) {
            if (f?.path) workspacePathsSeen.push(f.path)
          }
          toolsSideEffects = true
          writeSse(res, `data: ${JSON.stringify({ workspace: { files: event.files } })}\n\n`)
          continue
        }
        if (event.kind === 'project') {
          projectActionsSeen += event.actions?.length || 0
          toolsSideEffects = true
          writeSse(res, `data: ${JSON.stringify({ project: { actions: event.actions } })}\n\n`)
          continue
        }
        if (event.kind === 'sandbox') {
          toolsSideEffects = true
          const sandPath = pathFromSandboxActivity(
            event.activity as Record<string, unknown> | undefined,
          )
          if (sandPath) workspacePathsSeen.push(sandPath)
          writeSse(res, `data: ${JSON.stringify({ sandbox: event.activity })}\n\n`)
          continue
        }
        if (event.kind === 'image') {
          imagesSeen += 1
          toolsSideEffects = true
          writeSse(
            res,
            `data: ${JSON.stringify({ image: { url: event.url, prompt: event.prompt, id: event.id } })}\n\n`,
          )
          continue
        }
        if (event.kind === 'avatar') {
          writeSse(
            res,
            `data: ${JSON.stringify({
              avatar: { action: event.action, ...(event.mood ? { mood: event.mood } : null) },
            })}\n\n`,
          )
          continue
        }
        if (event.kind === 'content_replace') {
          full = event.text
          writeSse(res, `data: ${JSON.stringify({ contentReplace: event.text })}\n\n`)
          continue
        }
        if (event.kind === 'delta') {
          full += event.text
          writeSse(res, `data: ${JSON.stringify({ delta: event.text })}\n\n`)
        }
      }

      if (upstream.signal.aborted || res.writableEnded) {
        return
      }

      if (!full.trim()) {
        // Defense in depth: harness should already recover, but if the stream ended
        // empty after workspace/image/project/sandbox side-effects — or after a
        // Continue / build-view ask following a no-summary stub — never hard-fail.
        let lastUserText = ''
        let priorStub = false
        for (let i = parsed.data.messages.length - 1; i >= 0; i -= 1) {
          const m = parsed.data.messages[i]
          if (!m) continue
          if (!lastUserText && m.role === 'user' && String(m.content || '').trim()) {
            lastUserText = String(m.content || '')
            continue
          }
          if (lastUserText && m.role === 'assistant') {
            priorStub = isNoSummaryAgentStub(String(m.content || ''))
            break
          }
        }
        const recovery =
          summarizeHarnessToolWork({
            workspacePaths: workspacePathsSeen,
            imageCount: imagesSeen,
            projectActions: projectActionsSeen,
            toolsUsed: toolsSideEffects,
          }) ||
          summarizeEmptyContinueRecovery({
            priorWasNoSummaryStub: priorStub,
            userAskedBuildOrView: looksLikeBuildOrViewRequest(lastUserText),
          })
        if (recovery) {
          full = recovery
          writeSse(res, `data: ${JSON.stringify({ contentReplace: recovery })}\n\n`)
        } else {
          writeSse(res, `data: ${JSON.stringify({ error: 'Empty model reply.' })}\n\n`)
          writeSse(res, 'data: [DONE]\n\n')
          res.end()
          return
        }
      }
      recordChatCallerTurn(caller)
      writeSse(res, `data: ${JSON.stringify({ done: true, model: deepseekChatModel() })}\n\n`)
      writeSse(res, 'data: [DONE]\n\n')
      res.end()
    } finally {
      clearInterval(heartbeat)
      req.off('close', onClientClose)
      res.off('close', onClientClose)
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      if (!res.writableEnded) res.end()
      return
    }
    const message = err instanceof Error ? err.message : 'Chat failed.'
    if (stream && res.headersSent) {
      writeSse(res, `data: ${JSON.stringify({ error: message })}\n\n`)
      writeSse(res, 'data: [DONE]\n\n')
      res.end()
      return
    }
    res.status(502).json({ message })
  }
}
