import { describe, expect, it } from 'vitest'
import { mergeRecent, mergeSeries, toBooks } from '../src/merge'
import type { BookEntity, SeriesInfo, ShelfSnapshot } from '../src/types'

const entity = (uuid: string, overrides: Partial<BookEntity> = {}): BookEntity => ({
  type: 'normal',
  uuid,
  productId: 1,
  seriesId: 1,
  title: uuid,
  imageUrl: '',
  categoryName: 'マンガ',
  readFlag: { readPointUrl: null, readFinishFlag: null, readProgress: 0 },
  buyTime: '2026-01-01T00:00:00+09:00',
  viewerUrl: '',
  detailUrl: '',
  isExpired: false,
  ...overrides,
})

describe('toBooks', () => {
  it('配信日の新しい順で受け取った一覧を、古いほど小さい releaseRank に変換する', () => {
    const books = toBooks([entity('new'), entity('mid'), entity('old')], 'newestFirst')
    expect(books.map(b => [b.uuid, b.releaseRank])).toEqual([['new', 2], ['mid', 1], ['old', 0]])
  })
  it('古い順で受け取った場合はそのままの順番', () => {
    const books = toBooks([entity('old'), entity('new')], 'oldestFirst')
    expect(books.map(b => [b.uuid, b.releaseRank])).toEqual([['old', 0], ['new', 1]])
  })
  it('表示に使わない項目は落とす', () => {
    const [b] = toBooks([{ ...entity('a'), extra: 'x' } as BookEntity], 'oldestFirst')
    expect(b).not.toHaveProperty('extra')
  })
})

describe('mergeRecent', () => {
  const snapshot: ShelfSnapshot = {
    fetchedAt: '2026-10-01T00:00:00.000Z',
    books: toBooks([entity('a'), entity('b')], 'oldestFirst'),
    series: [],
  }

  it('既存の本の読書状態を更新する', () => {
    const read = { readPointUrl: 'p', readFinishFlag: 1, readProgress: 100 }
    const merged = mergeRecent(snapshot, [entity('a', { readFlag: read })], '2026-10-04T00:00:00.000Z')
    expect(merged.books.find(b => b.uuid === 'a')?.readFlag).toEqual(read)
    expect(merged.books.find(b => b.uuid === 'a')?.releaseRank).toBe(0)
  })

  it('新しく買った本は最新の配信として末尾の releaseRank で追加する', () => {
    const merged = mergeRecent(snapshot, [entity('c')], '2026-10-04T00:00:00.000Z')
    expect(merged.books.find(b => b.uuid === 'c')?.releaseRank).toBe(2)
    expect(merged.books).toHaveLength(3)
  })

  it('同じ本が複数回含まれても 1 冊として扱う', () => {
    const merged = mergeRecent(snapshot, [entity('c'), entity('c')], '2026-10-04T00:00:00.000Z')
    expect(merged.books).toHaveLength(3)
  })

  it('fetchedAt を更新し、元のスナップショットは変更しない', () => {
    const merged = mergeRecent(snapshot, [entity('c')], '2026-10-04T00:00:00.000Z')
    expect(merged.fetchedAt).toBe('2026-10-04T00:00:00.000Z')
    expect(snapshot.books).toHaveLength(2)
  })
})

describe('mergeSeries', () => {
  const info = (seriesId: number, hasNonPurchasedSeries: boolean): SeriesInfo => ({
    seriesId,
    seriesName: `S${seriesId}`,
    hasNonPurchasedSeries,
    nonPurchasedSeriesListUrl: `https://bookwalker.jp/series/${seriesId}/list`,
  })

  it('同じシリーズは新しい情報で置き換える（既刊を買い足して未購入がなくなった場合など）', () => {
    const merged = mergeSeries([info(1, true), info(2, true)], [info(1, false)])
    expect(merged.find(s => s.seriesId === 1)?.hasNonPurchasedSeries).toBe(false)
    expect(merged.find(s => s.seriesId === 2)?.hasNonPurchasedSeries).toBe(true)
  })

  it('新しいシリーズは追加する', () => {
    expect(mergeSeries([info(1, true)], [info(3, false)]).map(s => s.seriesId)).toEqual([1, 3])
  })
})
