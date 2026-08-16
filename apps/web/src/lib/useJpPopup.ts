import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react'

/** Hover / focus / tap reveal for Jyutping tooltips. */
export function useJpPopup(enabled: boolean) {
  const tipId = useId()
  const wrapRef = useRef<HTMLSpanElement | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: globalThis.PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open])

  const show = enabled && open

  const bind = {
    ref: wrapRef as RefObject<HTMLSpanElement>,
    tabIndex: enabled ? (0 as const) : undefined,
    'aria-describedby': show ? tipId : undefined,
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && enabled) setOpen(true)
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setOpen(false)
    },
    onFocus: () => {
      if (enabled) setOpen(true)
    },
    onBlur: () => setOpen(false),
    onClick: (e: MouseEvent) => {
      if (!enabled) return
      const inControl = Boolean(
        (e.currentTarget as HTMLElement).closest('button, a, [role="button"]'),
      )
      // Inside controls: reveal Jyutping but don't block the control action.
      // Elsewhere: toggle and keep the click from bubbling to parents.
      if (inControl) {
        setOpen(true)
        return
      }
      e.stopPropagation()
      setOpen((v) => !v)
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (!enabled) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    },
  }

  return { tipId, show, bind, wrapRef }
}
