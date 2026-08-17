import { create } from 'zustand'

export type DockItem = {
  id: string
  /** Primary tab title shown on the left taskbar. */
  title: string
  /** Optional secondary line (e.g. 粵 phrase or 紀錄). */
  subtitle?: string
  /** Visual accent for the tab mark. */
  kind?: 'history' | 'details' | 'other'
}

type DockState = {
  items: DockItem[]
  upsert: (item: DockItem) => void
  remove: (id: string) => void
}

/** Minimized floating panels collect on the left vertical taskbar. */
export const usePanelDock = create<DockState>((set, get) => ({
  items: [],
  upsert: (item) => {
    const rest = get().items.filter((x) => x.id !== item.id)
    set({ items: [...rest, item] })
  },
  remove: (id) => set({ items: get().items.filter((x) => x.id !== id) }),
}))

/** Left taskbar width — keep floating panels clear of this strip. */
export const PANEL_TASKBAR_W = 88
