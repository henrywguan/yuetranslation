/** Dev-only NDJSON debug sink for cloud-agent hang investigations. */

export type AgentDebugPayload = {
  hypothesisId: string
  location: string
  message: string
  data?: Record<string, unknown>
  timestamp?: number
  runId?: string
}

declare global {
  interface Window {
    __YUE_AGENT_LOGS__?: AgentDebugPayload[]
  }
}

/** Lightweight browser → Vite `/__agent-debug-log` → `/opt/cursor/logs/debug.log`. */
export function agentDebugLog(payload: AgentDebugPayload): void {
  // #region agent log
  const entry: AgentDebugPayload = {
    ...payload,
    timestamp: payload.timestamp ?? Date.now(),
  }
  try {
    if (typeof window !== 'undefined') {
      window.__YUE_AGENT_LOGS__ = window.__YUE_AGENT_LOGS__ || []
      window.__YUE_AGENT_LOGS__.push(entry)
      if (window.__YUE_AGENT_LOGS__.length > 400) window.__YUE_AGENT_LOGS__.shift()
    }
  } catch {
    /* ignore */
  }
  try {
    const body = JSON.stringify(entry)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const ok = navigator.sendBeacon(
        '/__agent-debug-log',
        new Blob([body], { type: 'application/json' }),
      )
      if (ok) return
    }
    void fetch('/__agent-debug-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
  // #endregion
}
