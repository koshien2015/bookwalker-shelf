import { el } from './dom'
import { seriesCard, volumePanel } from './cards'
import type { ShelfGroup, ShelfSnapshot } from '../types'
import type { ViewPrefs } from '../storage'

export interface ViewState {
  snapshot: ShelfSnapshot | null
  groups: ShelfGroup[]
  prefs: ViewPrefs
  query: string
  expanded: ReadonlySet<string>
  busy: string | null
  error: string | null
}

export interface ViewActions {
  toggleEnabled: () => void
  toggleOnlyUnfinished: () => void
  setQuery: (query: string) => void
  toggleGroup: (key: string) => void
  refreshRecent: () => void
  fetchAll: () => void
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

function visibleGroups(state: ViewState): ShelfGroup[] {
  const query = state.query.trim().normalize('NFKC').toLowerCase()
  return state.groups.filter(group => {
    if (state.prefs.onlyUnfinished && group.counts.unread + group.counts.reading === 0) return false
    if (!query) return true
    return [group.name, ...group.books.map(b => b.title)].some(text => text.normalize('NFKC').toLowerCase().includes(query))
  })
}

function toolbar(state: ViewState, actions: ViewActions, shownCount: number): HTMLElement {
  const { snapshot, prefs, busy } = state
  const search = el('input', {
    type: 'search',
    className: 'bws-search',
    placeholder: 'シリーズ名・書名で絞り込み',
    value: state.query,
    oninput: e => actions.setQuery((e.target as HTMLInputElement).value),
  })
  const onlyUnfinished = el('input', { type: 'checkbox', checked: prefs.onlyUnfinished, onchange: actions.toggleOnlyUnfinished })
  return el('div', { className: 'bws-toolbar' }, [
    el('button', { type: 'button', className: 'bws-btn bws-btn--primary', textContent: prefs.enabled ? '元の表示に戻す' : 'カード表示にする', onclick: actions.toggleEnabled }),
    prefs.enabled && search,
    prefs.enabled && el('label', { className: 'bws-check' }, [onlyUnfinished, '未読・読みかけのあるシリーズのみ']),
    prefs.enabled && snapshot && el('span', { className: 'bws-meta', textContent: `${shownCount} / ${state.groups.length} シリーズ・${snapshot.books.length} 冊（${formatTime(snapshot.fetchedAt)} 時点）` }),
    prefs.enabled && snapshot && el('button', { type: 'button', className: 'bws-btn', textContent: '最新に更新', disabled: !!busy, onclick: actions.refreshRecent, title: '最近読んだ本・買った本だけを取り直します' }),
    prefs.enabled && snapshot && el('button', { type: 'button', className: 'bws-btn', textContent: '全件取り直す', disabled: !!busy, onclick: actions.fetchAll }),
    busy && el('span', { className: 'bws-busy', textContent: busy }),
    state.error && el('span', { className: 'bws-error', textContent: state.error }),
  ])
}

function emptyState(state: ViewState, actions: ViewActions): HTMLElement {
  return el('div', { className: 'bws-empty' }, [
    el('p', { textContent: '本棚をシリーズごとに表示するため、購入済みの書籍をすべて取得します。' }),
    el('p', { className: 'bws-empty__note', textContent: '1 秒おきに 1 ページずつ読み込むため、1000 冊ほどで 30 秒前後かかります。取得した内容はこのブラウザに保存されます。' }),
    el('button', { type: 'button', className: 'bws-btn bws-btn--primary', textContent: '本棚を取得する', disabled: !!state.busy, onclick: actions.fetchAll }),
  ])
}

function grid(groups: ShelfGroup[], state: ViewState, actions: ViewActions): HTMLElement {
  const items = groups.flatMap(group => {
    const expanded = state.expanded.has(group.key)
    const card = seriesCard(group, expanded, () => actions.toggleGroup(group.key))
    return expanded ? [card, volumePanel(group)] : [card]
  })
  return el('div', { className: 'bws-grid' }, items)
}

export function renderView(root: HTMLElement, state: ViewState, actions: ViewActions): void {
  const groups = visibleGroups(state)
  const focused = document.activeElement
  const hadSearchFocus = focused instanceof HTMLInputElement && focused.classList.contains('bws-search')
  const selection = hadSearchFocus ? focused.selectionStart : null

  const body = !state.prefs.enabled ? null : state.snapshot ? grid(groups, state, actions) : emptyState(state, actions)
  root.replaceChildren(...[toolbar(state, actions, groups.length), body].filter((n): n is HTMLElement => n !== null))

  // 検索欄の入力中に再描画しても、フォーカスとカーソル位置を保つ
  if (hadSearchFocus) {
    const search = root.querySelector<HTMLInputElement>('.bws-search')
    search?.focus()
    if (search && selection !== null) search.setSelectionRange(selection, selection)
  }
}
