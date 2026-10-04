// hold-book-list API のレスポンスのうち、表示に使う項目だけを定義する

export interface ReadFlag {
  readPointUrl: string | null
  readFinishFlag: number | null
  readProgress: number | null
}

export interface BookEntity {
  type: 'normal'
  uuid: string
  productId: number
  seriesId: number | null
  title: string
  imageUrl: string
  categoryName: string
  readFlag: ReadFlag | null
  buyTime: string
  viewerUrl: string
  detailUrl: string
  isExpired: boolean
}

export interface SeriesEntity {
  type: 'series'
  seriesId: number
  seriesName: string
  imageUrl: string
  seriesBookCount: number
  detailUrl: string
  hasNonPurchasedSeries: boolean
  nonPurchasedSeriesListUrl: string
}

export interface HoldBookListResponse<T> {
  holdBookList: {
    entities: T[]
    total: number
    totalPage: number
  }
}

export type ReadStatus = 'unread' | 'reading' | 'read'

/** 配信日順の取得順序（releaseRank）を付けた書籍 */
export interface Book extends BookEntity {
  releaseRank: number
}

export interface SeriesInfo {
  seriesId: number
  seriesName: string
  hasNonPurchasedSeries: boolean
  nonPurchasedSeriesListUrl: string
}

export interface StatusCounts {
  unread: number
  reading: number
  read: number
}

export interface ShelfGroup {
  key: string
  name: string
  books: Book[]
  coverUrl: string
  latestBuyTime: string
  counts: StatusCounts
  hasNonPurchased: boolean
  nonPurchasedUrl: string | null
}

export interface ShelfSnapshot {
  fetchedAt: string
  books: Book[]
  series: SeriesInfo[]
}
