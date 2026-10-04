import { readStatus } from './status'
import { parseVolume, stripVolume } from './volume'
import type { Book, SeriesInfo, ShelfGroup, StatusCounts } from './types'

function groupKey(book: Book): string {
  return book.seriesId === null ? `book:${book.uuid}` : `series:${book.seriesId}`
}

/** 全巻に重複のない巻数があれば巻数順、そうでなければ配信日順 */
function sortVolumes(books: readonly Book[]): Book[] {
  const volumes = books.map(b => parseVolume(b.title))
  const usable = volumes.every(v => v !== null) && new Set(volumes).size === volumes.length
  if (!usable) return [...books].sort((a, b) => a.releaseRank - b.releaseRank)
  return books
    .map((book, i) => ({ book, volume: volumes[i] as number }))
    .sort((a, b) => a.volume - b.volume)
    .map(({ book }) => book)
}

function countStatuses(books: readonly Book[]): StatusCounts {
  return books.reduce<StatusCounts>(
    (acc, book) => ({ ...acc, [readStatus(book)]: acc[readStatus(book)] + 1 }),
    { unread: 0, reading: 0, read: 0 },
  )
}

function toGroup(key: string, members: readonly Book[], info: SeriesInfo | undefined): ShelfGroup {
  const books = sortVolumes(members)
  const latest = books[books.length - 1]
  const latestBuyTime = books.reduce((max, b) => (b.buyTime > max ? b.buyTime : max), books[0].buyTime)
  return {
    key,
    name: info?.seriesName ?? (books[0].seriesId === null ? books[0].title : stripVolume(books[0].title)),
    books,
    coverUrl: latest.imageUrl,
    latestBuyTime,
    counts: countStatuses(books),
    hasNonPurchased: info?.hasNonPurchasedSeries ?? false,
    nonPurchasedUrl: info?.hasNonPurchasedSeries ? info.nonPurchasedSeriesListUrl : null,
  }
}

export function groupBooks(books: readonly Book[], series: readonly SeriesInfo[]): ShelfGroup[] {
  const seriesById = new Map(series.map(s => [s.seriesId, s]))
  const buckets = books.reduce((map, book) => {
    const key = groupKey(book)
    return map.set(key, [...(map.get(key) ?? []), book])
  }, new Map<string, Book[]>())

  return [...buckets.entries()]
    .map(([key, members]) => toGroup(key, members, members[0].seriesId === null ? undefined : seriesById.get(members[0].seriesId)))
    .sort((a, b) => (a.latestBuyTime < b.latestBuyTime ? 1 : a.latestBuyTime > b.latestBuyTime ? -1 : 0))
}
