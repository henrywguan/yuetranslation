import { useEffect } from 'react'
import {
  JYUTPING_SELECT_COPY_TRAP,
  planAllowsJyutpingCopy,
} from './jyutping'
import { useYueStore } from './store'
import { biPlain, ui } from './uiCopy'

const JYUT_UI_SEL =
  '.jyut-ruby, .jyut-syllable, .jp-pop-ruby, .jyut-syl-ui, .jyut-ruby-syl, .jp-pop-syl'

function selectionTouchesJyutpingUi(): boolean {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false

  for (let i = 0; i < sel.rangeCount; i++) {
    const range = sel.getRangeAt(i)
    const nodes: (Node | null)[] = [
      range.commonAncestorContainer,
      range.startContainer,
      range.endContainer,
    ]
    for (const node of nodes) {
      if (!node) continue
      const el = node instanceof Element ? node : node.parentElement
      if (el?.closest(JYUT_UI_SEL)) return true
    }
  }
  return false
}

/**
 * Freeloader easter egg: Ctrl/Cmd+C on Jyutping ruby pastes the gotcha line
 * instead of syllables. Disable with `JYUTPING_SELECT_COPY_TRAP = false`.
 */
export function useJyutpingSelectCopyTrap() {
  const entitlement = useYueStore((s) => s.entitlement)

  useEffect(() => {
    if (!JYUTPING_SELECT_COPY_TRAP) return
    if (planAllowsJyutpingCopy(entitlement?.plan, Boolean(entitlement))) return

    const onCopy = (e: ClipboardEvent) => {
      if (!selectionTouchesJyutpingUi()) return
      const msg = biPlain(ui.jyutpingSelectCopyTrap)
      if (!msg.trim()) return
      e.preventDefault()
      e.clipboardData?.setData('text/plain', msg)
    }

    document.addEventListener('copy', onCopy, true)
    return () => document.removeEventListener('copy', onCopy, true)
  }, [entitlement])
}
