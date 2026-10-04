import type { BookEntity, ReadStatus } from './types'

export function readProgress(book: BookEntity): number {
  const progress = book.readFlag?.readProgress ?? 0
  return Math.min(100, Math.max(0, progress))
}

export function readStatus(book: BookEntity): ReadStatus {
  if (book.readFlag?.readFinishFlag === 1) return 'read'
  const progress = readProgress(book)
  if (progress >= 100) return 'read'
  return progress > 0 ? 'reading' : 'unread'
}
