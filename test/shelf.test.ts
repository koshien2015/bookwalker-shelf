import { describe, expect, it } from 'vitest'
import { readStatus, readProgress } from '../src/status'
import { parseVolume } from '../src/volume'
import { groupBooks } from '../src/group'
import type { Book, SeriesInfo } from '../src/types'

const book = (overrides: Partial<Book>): Book => ({
  type: 'normal',
  uuid: overrides.uuid ?? Math.random().toString(36).slice(2),
  productId: 1,
  seriesId: null,
  title: 'タイトル',
  imageUrl: 'https://c.bookwalker.jp/x.jpg',
  categoryName: 'マンガ',
  readFlag: { readPointUrl: null, readFinishFlag: null, readProgress: 0 },
  buyTime: '2026-01-01T00:00:00+09:00',
  viewerUrl: 'https://member.bookwalker.jp/viewer',
  detailUrl: 'https://bookwalker.jp/de1/',
  isExpired: false,
  releaseRank: 0,
  ...overrides,
})

describe('readStatus', () => {
  it('readFinishFlag=1 は既読', () => {
    expect(readStatus(book({ readFlag: { readPointUrl: 'x', readFinishFlag: 1, readProgress: 100 } }))).toBe('read')
  })
  it('進捗が 1〜99 なら読みかけ', () => {
    expect(readStatus(book({ readFlag: { readPointUrl: 'x', readFinishFlag: 0, readProgress: 94 } }))).toBe('reading')
  })
  it('進捗 0・フラグ null は未読', () => {
    expect(readStatus(book({}))).toBe('unread')
  })
  it('readFlag 自体が null でも未読', () => {
    expect(readStatus(book({ readFlag: null }))).toBe('unread')
  })
  it('readProgress は 0〜100 に丸めて返す', () => {
    expect(readProgress(book({ readFlag: { readPointUrl: null, readFinishFlag: 0, readProgress: 94 } }))).toBe(94)
    expect(readProgress(book({ readFlag: null }))).toBe(0)
  })
})

describe('parseVolume', () => {
  it.each([
    ['星屑の魔導書 9', 9],
    ['となりの竜は昼寝中！（３）', 3],
    ['作品名(12)', 12],
    ['作品名 第4巻', 4],
    ['作品名　１０', 10],
    ['作品名 上', 1],
    ['作品名 中', 2],
    ['作品名 下', 3],
    ['作品名 2.5', 2.5],
  ])('%s → %d', (title, expected) => {
    expect(parseVolume(title)).toBe(expected)
  })
  it('巻数がなければ null', () => {
    expect(parseVolume('単発の作品')).toBeNull()
  })
  it('巻数の後ろに付く【特典付き】などは無視する', () => {
    expect(parseVolume('作品名 5【電子特典付き】')).toBe(5)
  })
  it.each([
    ['辺境の錬金術師　～はじまりの村と銀の鍵～１０【電子書店共通特典イラスト付】', 10],
    ['森の喫茶店でスローライフ２', 2],
    ['【期間限定　無料お試し版】森の喫茶店でスローライフ１', 1],
    ['隣の部屋の騎士さん（コミック） ： 1', 1],
  ])('ストアでよく見る表記: %s → %d', (title, expected) => {
    expect(parseVolume(title)).toBe(expected)
  })
  it('4 桁以上の数字は巻数とみなさない', () => {
    expect(parseVolume('ロボット2001')).toBeNull()
  })
})

describe('groupBooks', () => {
  const series: SeriesInfo[] = [
    { seriesId: 100, seriesName: 'シリーズA', hasNonPurchasedSeries: true, nonPurchasedSeriesListUrl: 'https://bookwalker.jp/series/100/list' },
  ]

  it('seriesId ごとにまとめ、シリーズ名を付ける', () => {
    const groups = groupBooks(
      [book({ seriesId: 100, title: 'A 1' }), book({ seriesId: 100, title: 'A 2' }), book({ seriesId: null, title: '単発' })],
      series,
    )
    expect(groups).toHaveLength(2)
    const a = groups.find(g => g.key === 'series:100')!
    expect(a.name).toBe('シリーズA')
    expect(a.books).toHaveLength(2)
    expect(a.hasNonPurchased).toBe(true)
    expect(a.nonPurchasedUrl).toBe('https://bookwalker.jp/series/100/list')
  })

  it('シリーズ情報がない場合は先頭巻のタイトルから巻数を除いて名前にする', () => {
    const groups = groupBooks([book({ seriesId: 200, title: '新シリーズ（２）', releaseRank: 1 }), book({ seriesId: 200, title: '新シリーズ（１）', releaseRank: 0 })], [])
    expect(groups[0].name).toBe('新シリーズ')
  })

  it('シリーズ名の推測では先頭の【無料お試し版】なども除く', () => {
    const groups = groupBooks([book({ seriesId: 300, title: '【期間限定　無料お試し版】作品（１）' })], [])
    expect(groups[0].name).toBe('作品')
  })

  it('グループ内は巻数順（全巻に巻数があるとき）', () => {
    const groups = groupBooks(
      [
        book({ seriesId: 100, title: 'A 10', releaseRank: 0 }),
        book({ seriesId: 100, title: 'A 2', releaseRank: 1 }),
        book({ seriesId: 100, title: 'A 1', releaseRank: 2 }),
      ],
      series,
    )
    expect(groups[0].books.map(b => b.title)).toEqual(['A 1', 'A 2', 'A 10'])
  })

  it('巻数が取れない巻があれば配信日順（releaseRank）', () => {
    const groups = groupBooks(
      [
        book({ seriesId: 100, title: 'A 外伝', releaseRank: 2 }),
        book({ seriesId: 100, title: 'A 1', releaseRank: 0 }),
        book({ seriesId: 100, title: 'A 2', releaseRank: 1 }),
      ],
      series,
    )
    expect(groups[0].books.map(b => b.title)).toEqual(['A 1', 'A 2', 'A 外伝'])
  })

  it('巻数が重複するときも配信日順にする', () => {
    const groups = groupBooks(
      [
        book({ seriesId: 100, title: 'A 1 特装版', releaseRank: 1 }),
        book({ seriesId: 100, title: 'A 1', releaseRank: 0 }),
      ],
      series,
    )
    expect(groups[0].books.map(b => b.releaseRank)).toEqual([0, 1])
  })

  it('状態の件数を数え、表紙は最新巻を使う', () => {
    const groups = groupBooks(
      [
        book({ seriesId: 100, title: 'A 1', imageUrl: 'v1', readFlag: { readPointUrl: 'x', readFinishFlag: 1, readProgress: 100 } }),
        book({ seriesId: 100, title: 'A 2', imageUrl: 'v2', readFlag: { readPointUrl: 'x', readFinishFlag: 0, readProgress: 30 } }),
        book({ seriesId: 100, title: 'A 3', imageUrl: 'v3' }),
      ],
      series,
    )
    expect(groups[0].counts).toEqual({ unread: 1, reading: 1, read: 1 })
    expect(groups[0].coverUrl).toBe('v3')
  })

  it('グループは最新の購入日時が新しい順', () => {
    const groups = groupBooks(
      [
        book({ seriesId: 100, buyTime: '2025-01-01T00:00:00+09:00' }),
        book({ seriesId: null, title: '単発', buyTime: '2026-05-01T00:00:00+09:00' }),
        book({ seriesId: 100, buyTime: '2026-03-01T00:00:00+09:00' }),
      ],
      series,
    )
    expect(groups.map(g => g.latestBuyTime)).toEqual(['2026-05-01T00:00:00+09:00', '2026-03-01T00:00:00+09:00'])
  })

  it('入力の配列を変更しない', () => {
    const input = [book({ seriesId: 100, title: 'A 2' }), book({ seriesId: 100, title: 'A 1' })]
    const before = input.map(b => b.title)
    groupBooks(input, series)
    expect(input.map(b => b.title)).toEqual(before)
  })
})
