import type { Book, BookEntity, SeriesInfo, ShelfSnapshot } from './types'

export type ReleaseOrder = 'newestFirst' | 'oldestFirst'

function pickBook(entity: BookEntity, releaseRank: number): Book {
  const { type, uuid, productId, seriesId, title, imageUrl, categoryName, readFlag, buyTime, viewerUrl, detailUrl, isExpired } = entity
  return { type, uuid, productId, seriesId, title, imageUrl, categoryName, readFlag, buyTime, viewerUrl, detailUrl, isExpired, releaseRank }
}

/** 配信日順で取得した一覧に、古いものほど小さい releaseRank を振る */
export function toBooks(entities: readonly BookEntity[], order: ReleaseOrder): Book[] {
  const last = entities.length - 1
  return entities.map((entity, i) => pickBook(entity, order === 'newestFirst' ? last - i : i))
}

/** 最近読んだ本・最近買った本の一覧をスナップショットに反映する */
export function mergeRecent(snapshot: ShelfSnapshot, recent: readonly BookEntity[], fetchedAt: string): ShelfSnapshot {
  const latestByUuid = new Map(recent.map(e => [e.uuid, e]))
  const known = new Set(snapshot.books.map(b => b.uuid))
  const updated = snapshot.books.map(b => {
    const latest = latestByUuid.get(b.uuid)
    return latest ? pickBook(latest, b.releaseRank) : b
  })
  const nextRank = snapshot.books.reduce((max, b) => Math.max(max, b.releaseRank), -1) + 1
  const added = [...latestByUuid.values()]
    .filter(e => !known.has(e.uuid))
    .map((e, i) => pickBook(e, nextRank + i))
  return { ...snapshot, fetchedAt, books: [...updated, ...added] }
}

/** シリーズ情報を新しいもので置き換え、未知のシリーズは追加する */
export function mergeSeries(current: readonly SeriesInfo[], recent: readonly SeriesInfo[]): SeriesInfo[] {
  const recentById = new Map(recent.map(s => [s.seriesId, s]))
  const known = new Set(current.map(s => s.seriesId))
  return [...current.map(s => recentById.get(s.seriesId) ?? s), ...recent.filter(s => !known.has(s.seriesId))]
}
