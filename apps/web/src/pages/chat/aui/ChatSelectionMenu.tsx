/**
 * Floating Copy | Reply | Include on message-log text selection.
 * Uses assistant-ui SelectionToolbarPrimitive for position / dismiss-on-scroll.
 */
import { SelectionToolbarPrimitive, useAui } from '@assistant-ui/react'
import { useEffect } from 'react'
import { applySelectionInclude, applySelectionReply } from '../../../lib/chatSelectionChrome'

function focusComposerInput() {
  const el = document.querySelector<HTMLTextAreaElement>('.aui-composer-input')
  if (!el) return
  el.focus()
  const len = el.value.length
  try {
    el.setSelectionRange(len, len)
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
        aui.composer.setText(applySelectionReply(draft, text))
        clearSelection()
        // Focus after React paints the new draft.
        requestAnimationFrame(() => focusComposerInput())
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
    >
      <SelectionCopyBtn />
      <SelectionReplyBtn />
      <SelectionIncludeBtn />
    </SelectionToolbarPrimitive.Root>
  )
}
