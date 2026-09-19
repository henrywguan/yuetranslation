/**
 * DEV-only agent debug sink → POST /api/_agent_debug_log → /opt/cursor/logs/debug.log
 * Remove with other #region agent log instrumentation after the investigation.
 */
export function agentDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
) {
  // #region agent log
  const payload = {
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  }
  try {
    console.info('[agent-debug]', payload)
  } catch {
    /* ignore */
  }
  try {
    void fetch('/api/_agent_debug_log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
  // #endregion
}
