/**
 * Plan→Build Deep-finish latch for the chat companion.
 * Kept free of TTS/auth imports so offline smoke can exercise it directly.
 *
 * Armed on Build click; not consumed on intermediate Overseer turns while the
 * worker flush chain is busy; settled when the chain idles so Deep/eureka/
 * fullscreen wait for real completion.
 */

let planBuildArmed = false
let planBuildChainBusy = false
let planBuildSettleEpoch = 0

const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

export function subscribeChatDeepAvatarPlanBuild(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function markChatDeepAvatarPlanBuild() {
  planBuildArmed = true
  emit()
}

/** True while project worker messages are queued or flushing. */
export function setChatDeepAvatarPlanBuildChainBusy(busy: boolean) {
  if (planBuildChainBusy === busy) return
  planBuildChainBusy = busy
  emit()
}

export function peekChatDeepAvatarPlanBuild(): boolean {
  return planBuildArmed
}

export function isChatDeepAvatarPlanBuildChainBusy(): boolean {
  return planBuildChainBusy
}

/**
 * Claim Deep/eureka credit on run end. Returns false (and keeps armed) while
 * the Overseer→worker chain is still busy so intermediate turns do not steal it.
 */
export function consumeChatDeepAvatarPlanBuild(): boolean {
  if (!planBuildArmed || planBuildChainBusy) return false
  planBuildArmed = false
  emit()
  return true
}

/**
 * After the last worker finishes, chainBusy clears but no new run starts.
 * Call when chain is idle: if still armed, claim credit and bump settle epoch
 * so the mood hook can fire a deferred deep outro.
 */
export function settleChatDeepAvatarPlanBuild(): boolean {
  if (!planBuildArmed || planBuildChainBusy) return false
  planBuildArmed = false
  planBuildSettleEpoch += 1
  emit()
  return true
}

/** Drop an armed latch without celebrating (e.g. session error). */
export function abortChatDeepAvatarPlanBuild() {
  if (!planBuildArmed && !planBuildChainBusy) return
  planBuildArmed = false
  planBuildChainBusy = false
  emit()
}

export function getChatDeepAvatarPlanBuildSettleEpoch(): number {
  return planBuildSettleEpoch
}

/** Test helper — reset latch between smoke runs. */
export function __resetChatDeepAvatarPlanBuildForTests() {
  planBuildArmed = false
  planBuildChainBusy = false
  planBuildSettleEpoch = 0
  emit()
}
