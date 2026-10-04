import type { ShelfSnapshot } from './types'

const SNAPSHOT_KEY = 'shelf-snapshot'
const VIEW_KEY = 'shelf-view'

export interface ViewPrefs {
  enabled: boolean
  onlyUnfinished: boolean
}

const DEFAULT_PREFS: ViewPrefs = { enabled: true, onlyUnfinished: false }

export async function loadSnapshot(): Promise<ShelfSnapshot | null> {
  const stored = await chrome.storage.local.get(SNAPSHOT_KEY)
  return (stored[SNAPSHOT_KEY] as ShelfSnapshot | undefined) ?? null
}

export async function saveSnapshot(snapshot: ShelfSnapshot): Promise<void> {
  await chrome.storage.local.set({ [SNAPSHOT_KEY]: snapshot })
}

export async function loadPrefs(): Promise<ViewPrefs> {
  const stored = await chrome.storage.local.get(VIEW_KEY)
  return { ...DEFAULT_PREFS, ...(stored[VIEW_KEY] as Partial<ViewPrefs> | undefined) }
}

export async function savePrefs(prefs: ViewPrefs): Promise<void> {
  await chrome.storage.local.set({ [VIEW_KEY]: prefs })
}
