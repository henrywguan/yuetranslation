/**
 * Tier 3 chat capabilities — intentionally deferred (not implemented).
 * MCP + image generation shipped separately; do not add branching/RAG without Henry’s go-ahead.
 */
export const CHAT_DEFERRED_FEATURES = [
  'conversation_branching',
  'rag_collections',
  'personas_agent_presets',
  'code_interpreter_sandbox',
  'supabase_cloud_thread_sync',
] as const

export type ChatDeferredFeature = (typeof CHAT_DEFERRED_FEATURES)[number]
