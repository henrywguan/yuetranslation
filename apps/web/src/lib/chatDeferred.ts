/**
 * Tier 3 chat capabilities — intentionally deferred (not implemented).
 * Branching (alternates + thread fork) + continue shipped; keep RAG/personas/sandbox/cloud sync here.
 */
export const CHAT_DEFERRED_FEATURES = [
  'rag_collections',
  'personas_agent_presets',
  'code_interpreter_sandbox',
  'supabase_cloud_thread_sync',
] as const

export type ChatDeferredFeature = (typeof CHAT_DEFERRED_FEATURES)[number]
