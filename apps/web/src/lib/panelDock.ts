import { create } from 'zustand'

export type DockItem = {
  id: string
  title: string
  subtitle?: string
}

type DockState = {
  items: DockItem[]
  upsert: (item: DockItem) => void
  remove: (id: string) => void
  clear: () => void
}

/** Minimized floating panels collect here (virtual-desktop style). */
export const usePanelDock = create<DockState>((set, get) => ({
  items: [],
  upsert: (item) => {
    const rest = get().items.filter((x) => x.id !== item.id)
    set({ items: [...rest, item] })
  },
  remove: (id) => set({ items: get().items.filter((x) => x.id !== id) }),
  clear: () => set({ items: [] }),
}))
