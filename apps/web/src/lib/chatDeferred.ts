/**
 * Tier 3 chat capabilities — intentionally deferred (not implemented).
 * See the DeepSeek Chat UX roadmap; do not add branching/RAG/MCP without Henry’s go-ahead.
 */
export const CHAT_DEFERRED_FEATURES = [
  'conversation_branching',
  'rag_collections',
  'personas_agent_presets',
  'code_interpreter_sandbox',
  'mcp_plugin_marketplace',
  'image_generation',
  'supabase_cloud_thread_sync',
] as const

export type ChatDeferredFeature = (typeof CHAT_DEFERRED_FEATURES)[number]
