import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  createWorkspaceAwareStorage,
  registerForWorkspaceRehydration,
} from '../platform/workspace-storage'
import { defaultStorage } from '../platform/storage'

/**
 * Per-surface tab state for the redesigned shell's tabbable surfaces
 * (Chats, Tasks). Replaces the retired global FlexLayout dock persistence:
 * each surface owns a small ordered list of open entity tabs, persisted per
 * workspace so a reload restores the strip. Surfaces subscribe with
 * `useSurfaceTabsStore((s) => s.bySurface[surface])` and navigate the router
 * on select/close — the store intentionally holds no routing logic.
 */
export interface SurfaceTabEntry {
  id: string
  title: string
}

interface SurfaceTabsState {
  bySurface: Record<string, SurfaceTabEntry[]>
  /** Adds the tab if absent, otherwise moves it to the end and refreshes its title. */
  upsertTab: (surface: string, tab: SurfaceTabEntry) => void
  renameTab: (surface: string, id: string, title: string) => void
  closeTab: (surface: string, id: string) => void
  clearSurface: (surface: string) => void
}

const MAX_TABS_PER_SURFACE = 12

export const useSurfaceTabsStore = create<SurfaceTabsState>()(
  persist(
    (set) => ({
      bySurface: {},
      upsertTab: (surface, tab) =>
        set((state) => {
          const current = state.bySurface[surface] ?? []
          const rest = current.filter((t) => t.id !== tab.id)
          return {
            bySurface: {
              ...state.bySurface,
              [surface]: [...rest, tab].slice(-MAX_TABS_PER_SURFACE),
            },
          }
        }),
      renameTab: (surface, id, title) =>
        set((state) => {
          const current = state.bySurface[surface]
          if (!current) return state
          return {
            bySurface: {
              ...state.bySurface,
              [surface]: current.map((t) =>
                t.id === id ? { ...t, title } : t,
              ),
            },
          }
        }),
      closeTab: (surface, id) =>
        set((state) => {
          const current = state.bySurface[surface]
          if (!current) return state
          return {
            bySurface: {
              ...state.bySurface,
              [surface]: current.filter((t) => t.id !== id),
            },
          }
        }),
      clearSurface: (surface) =>
        set((state) => {
          if (!(surface in state.bySurface)) return state
          const next = { ...state.bySurface }
          delete next[surface]
          return { bySurface: next }
        }),
    }),
    {
      name: 'garden_surface_tabs',
      storage: createJSONStorage(() =>
        createWorkspaceAwareStorage(defaultStorage),
      ),
      partialize: (state) => ({ bySurface: state.bySurface }),
    },
  ),
)

registerForWorkspaceRehydration(() => useSurfaceTabsStore.persist.rehydrate())
