import { mergeRecent, mergeSeries, toBooks } from './merge'
import type { BookEntity, HoldBookListResponse, SeriesEntity, SeriesInfo, ShelfSnapshot } from './types'

const ENDPOINT = '/prx/holdBooks-api/hold-book-list/'
const REQUEST_INTERVAL_MS = 1000

// 本棚の並び順コード（本棚ページの並び替えリンクと同じ値）。orderBy=1 はどれも新しい順
const ORDER = {
  purchased: { order: '0', orderBy: '1' },
  recentlyRead: { order: '7', orderBy: '1' },
  released: { order: '4', orderBy: '1' },
} as const

export type Progress = (message: string) => void

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function csrfToken(): string {
  const token = document.getElementById('bw-csrf-token')?.getAttribute('data-token')
  if (!token) throw new Error('CSRF トークンが見つかりません。ページを再読み込みしてください')
  return token
}

async function postList<T>(params: Record<string, string>): Promise<HoldBookListResponse<T>> {
  const body = new FormData()
  Object.entries(params).forEach(([key, value]) => body.set(key, value))
  body.set('backUrl', location.href)
  body.set('csrfToken', csrfToken())
  const res = await fetch(ENDPOINT, { method: 'POST', body, credentials: 'include' })
  if (!res.ok) throw new Error(`本棚の取得に失敗しました（HTTP ${res.status}）`)
  const json = (await res.json()) as HoldBookListResponse<T>
  if (!json?.holdBookList?.entities) throw new Error('本棚の応答形式が想定と違います')
  return json
}

/** 全ページを順に取得する。1 ページ目で総ページ数を知り、以降は間隔を空けて取りに行く */
async function fetchAllPages<T>(params: Record<string, string>, onPage: (page: number, pages: number) => void): Promise<T[]> {
  const first = await postList<T>({ ...params, page: '1' })
  const pages = first.holdBookList.totalPage
  onPage(1, pages)
  let entities = [...first.holdBookList.entities]
  for (let page = 2; page <= pages; page++) {
    await sleep(REQUEST_INTERVAL_MS)
    const next = await postList<T>({ ...params, page: String(page) })
    entities = [...entities, ...next.holdBookList.entities]
    onPage(page, pages)
  }
  return entities
}

function toSeriesInfo(entity: SeriesEntity): SeriesInfo {
  const { seriesId, seriesName, hasNonPurchasedSeries, nonPurchasedSeriesListUrl } = entity
  return { seriesId, seriesName, hasNonPurchasedSeries, nonPurchasedSeriesListUrl }
}

export async function fetchSnapshot(onProgress: Progress): Promise<ShelfSnapshot> {
  const books = await fetchAllPages<BookEntity>({ ...ORDER.released, 'holdBook-series': '0' }, (page, pages) =>
    onProgress(`書籍を取得中… ${page} / ${pages} ページ`),
  )
  await sleep(REQUEST_INTERVAL_MS)
  const series = await fetchAllPages<SeriesEntity>({ ...ORDER.purchased, 'holdBook-series': '1' }, (page, pages) =>
    onProgress(`シリーズ情報を取得中… ${page} / ${pages} ページ`),
  )
  return {
    fetchedAt: new Date().toISOString(),
    books: toBooks(books.filter(e => e.type === 'normal'), 'newestFirst'),
    series: series.filter(e => e.type === 'series').map(toSeriesInfo),
  }
}

/**
 * 最近読んだ本・最近買った本・最近買ったシリーズの 1 ページ目だけを取り直して反映する（3 リクエスト）。
 * シリーズ側は、既刊を買い足したときに「未購入の既刊あり」を更新するために取る
 */
export async function refreshRecent(snapshot: ShelfSnapshot): Promise<ShelfSnapshot> {
  const read = await postList<BookEntity>({ ...ORDER.recentlyRead, 'holdBook-series': '0', page: '1' })
  await sleep(REQUEST_INTERVAL_MS)
  const bought = await postList<BookEntity>({ ...ORDER.purchased, 'holdBook-series': '0', page: '1' })
  await sleep(REQUEST_INTERVAL_MS)
  const series = await postList<SeriesEntity>({ ...ORDER.purchased, 'holdBook-series': '1', page: '1' })
  const recent = [...bought.holdBookList.entities, ...read.holdBookList.entities].filter(e => e.type === 'normal')
  const merged = mergeRecent(snapshot, recent, new Date().toISOString())
  const recentSeries = series.holdBookList.entities.filter(e => e.type === 'series').map(toSeriesInfo)
  return { ...merged, series: mergeSeries(merged.series, recentSeries) }
}
