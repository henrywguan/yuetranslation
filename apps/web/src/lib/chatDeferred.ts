/**
 * Tier 3 chat capabilities — intentionally deferred (not implemented).
 * Branching + continue shipped; Inbox “Move project to cloud” lands project-scoped
 * thread sync (`chatCloudSync.ts`). Full account-wide loose-thread sync stays deferred.
 */
export const CHAT_DEFERRED_FEATURES = [
  'rag_collections',
  'personas_agent_presets',
  'code_interpreter_sandbox',
  /** Full loose-thread Supabase sync (all chats). Project-scoped cloud move/sync shipped. */
  'supabase_cloud_thread_sync',
] as const

export type ChatDeferredFeature = (typeof CHAT_DEFERRED_FEATURES)[number]
