import { fetchSnapshot, refreshRecent } from './api'
import { groupBooks } from './group'
import { loadPrefs, loadSnapshot, savePrefs, saveSnapshot } from './storage'
import { renderView, type ViewActions, type ViewState } from './ui/view'
import type { ShelfSnapshot } from './types'

const ORIGINAL_ROOT_ID = 'pc-hold-books-react-root'
const ACTIVE_CLASS = 'bws-active'
// 前回の取得からこれ以上経っていたら、ページを開いたときに差分更新する
const AUTO_REFRESH_AFTER_MS = 5 * 60 * 1000

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '不明なエラーが発生しました'
}

async function main(): Promise<void> {
  const original = document.getElementById(ORIGINAL_ROOT_ID)
  if (!original) return

  const root = document.createElement('div')
  root.id = 'bws-root'
  original.before(root)

  let state: ViewState = {
    snapshot: await loadSnapshot(),
    groups: [],
    prefs: await loadPrefs(),
    query: '',
    expanded: new Set(),
    busy: null,
    error: null,
  }

  const setState = (patch: Partial<ViewState>) => {
    const next = { ...state, ...patch }
    const groups = patch.snapshot !== undefined || state.groups.length === 0 ? (next.snapshot ? groupBooks(next.snapshot.books, next.snapshot.series) : []) : next.groups
    state = { ...next, groups }
    document.body.classList.toggle(ACTIVE_CLASS, state.prefs.enabled)
    renderView(root, state, actions)
  }

  const runFetch = async (label: string, task: (onProgress: (message: string) => void) => Promise<ShelfSnapshot>) => {
    if (state.busy) return
    setState({ busy: label, error: null })
    try {
      const snapshot = await task(message => setState({ busy: message }))
      await saveSnapshot(snapshot)
      setState({ snapshot, busy: null })
    } catch (error) {
      console.error('[bookwalker-shelf]', error)
      setState({ busy: null, error: errorMessage(error) })
    }
  }

  const updatePrefs = (patch: Partial<ViewState['prefs']>) => {
    const prefs = { ...state.prefs, ...patch }
    void savePrefs(prefs)
    setState({ prefs })
  }

  const actions: ViewActions = {
    toggleEnabled: () => updatePrefs({ enabled: !state.prefs.enabled }),
    toggleOnlyUnfinished: () => updatePrefs({ onlyUnfinished: !state.prefs.onlyUnfinished }),
    setQuery: query => setState({ query }),
    toggleGroup: key => {
      const expanded = new Set(state.expanded)
      if (expanded.has(key)) expanded.delete(key)
      else expanded.add(key)
      setState({ expanded })
    },
    refreshRecent: () => {
      const current = state.snapshot
      if (current) void runFetch('最新の状態を取得中…', () => refreshRecent(current))
    },
    fetchAll: () => void runFetch('取得を開始しています…', onProgress => fetchSnapshot(onProgress)),
  }

  setState({})

  const snapshot = state.snapshot
  if (state.prefs.enabled && snapshot && Date.now() - new Date(snapshot.fetchedAt).getTime() > AUTO_REFRESH_AFTER_MS) {
    actions.refreshRecent()
  }
}

main().catch(error => console.error('[bookwalker-shelf]', error))
