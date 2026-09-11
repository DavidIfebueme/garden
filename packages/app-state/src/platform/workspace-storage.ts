import type { StateStorage } from 'zustand/middleware'
import type { StorageAdapter } from '@garden/core/types/storage'

let _currentWsId: string | null = null
const _rehydrateFns: Array<() => void> = []

export function setCurrentWorkspaceId(wsId: string | null) {
  _currentWsId = wsId
}

/** Register a persist store's rehydrate function to be called on workspace switch. */
export function registerForWorkspaceRehydration(fn: () => void) {
  _rehydrateFns.push(fn)
}

/** Rehydrate all registered workspace-scoped persist stores from the new namespace. */
export function rehydrateAllWorkspaceStores() {
  for (const fn of _rehydrateFns) {
    fn()
  }
}

export function getCurrentWorkspaceId(): string | null {
  return _currentWsId
}

/**
 * Storage that automatically namespaces keys with the current workspace ID.
 * Reads _currentWsId at call time, so it follows workspace switches dynamically.
 */
export function createWorkspaceAwareStorage(
  adapter: StorageAdapter,
): StateStorage {
  const resolve = (key: string) =>
    _currentWsId ? `${key}:${_currentWsId}` : key

  return {
    getItem: (key) => adapter.getItem(resolve(key)),
    setItem: (key, value) => adapter.setItem(resolve(key), value),
    removeItem: (key) => adapter.removeItem(resolve(key)),
  }
}

/**
 * Merge for workspace-scoped persist stores. Zustand's default merge is
 * `{...current, ...persisted}`; when the workspace being switched to has no
 * stored key, persisted is undefined and the spread is a silent no-op, so the
 * PREVIOUS workspace's data survives rehydration and is written into the new
 * workspace's namespace on the next mutation (observed 2026-09 as
 * cross-workspace chat/task tab bleed; verified against zustand
 * middleware.js hydrate). Pass the store's initial data slice: it is applied
 * first, then any persisted data overrides it; actions ride along untouched
 * via the current-state spread.
 */
export function workspaceScopedMerge<S extends object>(
  initialData: Partial<S>,
): (persistedState: unknown, currentState: S) => S {
  return (persistedState, currentState) => ({
    ...currentState,
    ...initialData,
    ...((persistedState ?? {}) as Partial<S>),
  })
}
