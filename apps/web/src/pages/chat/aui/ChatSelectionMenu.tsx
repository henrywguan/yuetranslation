/**
 * Floating Copy | Reply | Include on message-log text selection.
 * Uses assistant-ui SelectionToolbarPrimitive for position / dismiss-on-scroll.
 */
import { SelectionToolbarPrimitive, useAui } from '@assistant-ui/react'
import { useEffect } from 'react'
import { applySelectionInclude, applySelectionReply } from '../../../lib/chatSelectionChrome'

/** Focus composer; optional caret offset (Reply lands after the quote block). */
function focusComposerInput(caretAt?: number) {
  const el = document.querySelector<HTMLTextAreaElement>('.aui-composer-input')
  if (!el) return
  el.focus()
  const pos = caretAt == null ? el.value.length : Math.max(0, Math.min(el.value.length, caretAt))
  try {
    el.setSelectionRange(pos, pos)
  } catch {
    /* ignore */
  }
}

function clearSelection() {
  window.getSelection()?.removeAllRanges()
}

function selectedText(): string {
  return window.getSelection()?.toString().trim() ?? ''
}

function SelectionCopyBtn() {
  return (
    <button
      type="button"
      className="aui-selection-btn"
      onClick={() => {
        const text = selectedText()
        if (!text) return
        void navigator.clipboard?.writeText(text).catch(() => {
          /* clipboard may be denied */
        })
        clearSelection()
      }}
    >
      Copy
    </button>
  )
}

function SelectionReplyBtn() {
  const aui = useAui()
  return (
    <button
      type="button"
      className="aui-selection-btn"
      onClick={() => {
        const text = selectedText()
        if (!text) return
        const draft = aui.composer.getState().text ?? ''
        const next = applySelectionReply(draft, text)
        // Caret after quote + blank line (before any preserved prior draft).
        const quoteEnd = next.indexOf('\n\n')
        const caret = quoteEnd >= 0 ? quoteEnd + 2 : next.length
        aui.composer.setText(next)
        clearSelection()
        requestAnimationFrame(() => focusComposerInput(caret))
      }}
    >
      Reply
    </button>
  )
}

function SelectionIncludeBtn() {
  const aui = useAui()
  return (
    <button
      type="button"
      className="aui-selection-btn"
      onClick={() => {
        const text = selectedText()
        if (!text) return
        const draft = aui.composer.getState().text ?? ''
        aui.composer.setText(applySelectionInclude(draft, text))
        clearSelection()
        requestAnimationFrame(() => focusComposerInput())
      }}
    >
      Include
    </button>
  )
}

/**
 * SelectionToolbarPrimitive portals to document.body with a default z-index of 50.
 * `.ds-chat` is position:fixed; z-index:120 — without an override the toolbar paints
 * under the opaque shell (same class of bug as celebrate FX needing z≥130).
 * Stay above chat shell / celebrate / intro; below mood picker (160).
 */
export const SELECTION_MENU_Z_INDEX = 150

/** Portal menu near selection — Copy | Reply | Include. */
export function ChatSelectionMenu() {
  // Escape clears selection (toolbar dismisses when collapsed).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return
      clearSelection()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  return (
    <SelectionToolbarPrimitive.Root
      className="aui-selection-menu"
      role="toolbar"
      aria-label="Selection actions"
      style={{ zIndex: SELECTION_MENU_Z_INDEX }}
    >
      <SelectionCopyBtn />
      <SelectionReplyBtn />
      <SelectionIncludeBtn />
    </SelectionToolbarPrimitive.Root>
  )
}
