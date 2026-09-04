/**
 * Live camera track controls — zoom / focus when the browser exposes them.
 * Capability-gated: many desktop + iOS builds report nothing; callers must hide UI.
 */

export type ZoomRange = { min: number; max: number; step: number }

export type CameraTrackFeatures = {
  zoom: ZoomRange | null
  /** Current zoom from track settings (or min). */
  zoomValue: number
  focusModes: string[]
  canTapFocus: boolean
  canContinuousFocus: boolean
}

type Caps = MediaTrackCapabilities & {
  zoom?: number | { min?: number; max?: number; step?: number }
  focusMode?: string[]
  focusDistance?: { min?: number; max?: number; step?: number }
  pointsOfInterest?: boolean
}

type Settings = MediaTrackSettings & {
  zoom?: number
  focusMode?: string
}

function asZoomRange(raw: Caps['zoom']): ZoomRange | null {
  if (raw == null) return null
  if (typeof raw === 'number') {
    // Some engines only advertise a max zoom factor.
    if (!(raw > 1)) return null
    return { min: 1, max: raw, step: 0.1 }
  }
  const min = typeof raw.min === 'number' ? raw.min : 1
  const max = typeof raw.max === 'number' ? raw.max : min
  if (!(max > min)) return null
  const step = typeof raw.step === 'number' && raw.step > 0 ? raw.step : 0.1
  return { min, max, step }
}

/** Read zoom / focus capabilities from the first video track. */
export function probeCameraTrack(stream: MediaStream | null | undefined): CameraTrackFeatures {
  const empty: CameraTrackFeatures = {
    zoom: null,
    zoomValue: 1,
    focusModes: [],
    canTapFocus: false,
    canContinuousFocus: false,
  }
  const track = stream?.getVideoTracks?.()[0]
  if (!track || typeof track.getCapabilities !== 'function') return empty

  let caps: Caps
  try {
    caps = track.getCapabilities() as Caps
  } catch {
    return empty
  }

  const zoom = asZoomRange(caps.zoom)
  let zoomValue = zoom?.min ?? 1
  try {
    const settings = track.getSettings() as Settings
    if (typeof settings.zoom === 'number') zoomValue = settings.zoom
  } catch {
    /* ignore */
  }
  if (zoom) {
    zoomValue = Math.min(zoom.max, Math.max(zoom.min, zoomValue))
  }

  const focusModes = Array.isArray(caps.focusMode) ? caps.focusMode.filter(Boolean) : []
  const canContinuousFocus = focusModes.includes('continuous')
  const canTapFocus =
    Boolean(caps.pointsOfInterest) ||
    focusModes.includes('manual') ||
    focusModes.includes('single-shot')

  return { zoom, zoomValue, focusModes, canTapFocus, canContinuousFocus }
}

async function applyAdvanced(
  track: MediaStreamTrack,
  constraint: Record<string, unknown>,
): Promise<boolean> {
  try {
    await track.applyConstraints({ advanced: [constraint] as MediaTrackConstraintSet[] })
    return true
  } catch {
    try {
      await track.applyConstraints(constraint as MediaTrackConstraints)
      return true
    } catch {
      return false
    }
  }
}

/** Prefer continuous autofocus when the device supports it. */
export async function preferContinuousFocus(stream: MediaStream | null | undefined): Promise<void> {
  const track = stream?.getVideoTracks?.()[0]
  if (!track) return
  const features = probeCameraTrack(stream)
  if (!features.canContinuousFocus) return
  await applyAdvanced(track, { focusMode: 'continuous' })
}

/** Hardware zoom — no-op when unsupported. Returns the applied value (or null). */
export async function setTrackZoom(
  stream: MediaStream | null | undefined,
  value: number,
): Promise<number | null> {
  const track = stream?.getVideoTracks?.()[0]
  if (!track) return null
  const features = probeCameraTrack(stream)
  if (!features.zoom) return null
  const next = Math.min(features.zoom.max, Math.max(features.zoom.min, value))
  const ok = await applyAdvanced(track, { zoom: next })
  return ok ? next : null
}

/**
 * Tap-to-focus at normalized media coordinates (0–1 in the full video frame).
 * Falls back to single-shot / continuous when points-of-interest are unavailable.
 */
export async function focusTrackAt(
  stream: MediaStream | null | undefined,
  nx: number,
  ny: number,
): Promise<boolean> {
  const track = stream?.getVideoTracks?.()[0]
  if (!track) return false
  const features = probeCameraTrack(stream)
  if (!features.canTapFocus && !features.canContinuousFocus) return false

  const x = Math.min(1, Math.max(0, nx))
  const y = Math.min(1, Math.max(0, ny))

  if (features.canTapFocus) {
    const mode = features.focusModes.includes('manual')
      ? 'manual'
      : features.focusModes.includes('single-shot')
        ? 'single-shot'
        : null
    const poiConstraint: Record<string, unknown> = {
      pointsOfInterest: [{ x, y }],
    }
    if (mode) poiConstraint.focusMode = mode
    if (await applyAdvanced(track, poiConstraint)) return true

    if (features.focusModes.includes('single-shot')) {
      if (await applyAdvanced(track, { focusMode: 'single-shot' })) return true
    }
    if (features.focusModes.includes('manual')) {
      if (await applyAdvanced(track, { focusMode: 'manual' })) return true
    }
  }

  if (features.canContinuousFocus) {
    return applyAdvanced(track, { focusMode: 'continuous' })
  }
  return false
}

/**
 * Map a pointer inside an object-fit:cover frame to normalized video coordinates.
 * Returns null when the point lands in letterbox (shouldn't happen with cover) or media is unknown.
 */
export function framePointToMediaNorm(
  frameW: number,
  frameH: number,
  mediaW: number,
  mediaH: number,
  localX: number,
  localY: number,
): { x: number; y: number } | null {
  if (!frameW || !frameH || !mediaW || !mediaH) return null
  const scale = Math.max(frameW / mediaW, frameH / mediaH)
  const dispW = mediaW * scale
  const dispH = mediaH * scale
  const offsetX = (frameW - dispW) / 2
  const offsetY = (frameH - dispH) / 2
  const mx = (localX - offsetX) / dispW
  const my = (localY - offsetY) / dispH
  if (mx < 0 || mx > 1 || my < 0 || my > 1) return null
  return { x: mx, y: my }
}
