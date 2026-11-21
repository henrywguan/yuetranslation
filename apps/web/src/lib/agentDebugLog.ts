/**
 * TEMP debug-mode NDJSON logger (session 13d1). Remove with instrumentation cleanup.
 * Posts to Vite middleware → /opt/cursor/logs/debug.log
 */
export function agentDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
) {
  const payload = {
    sessionId: '13d1',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  }
  try {
    void fetch('/__agent_debug_log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}
