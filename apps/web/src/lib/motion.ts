/** Shared motion tokens. Keep ink-settle short so copy never feels delayed. */
export const inkEase = [0.22, 1, 0.36, 1] as const
export const inkDuration = 0.2

export const tideY: number[] = [0, -2.5, 0]
export const tideTransition = {
  duration: 5.8,
  repeat: Infinity,
  ease: 'easeInOut' as const,
}
