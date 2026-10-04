import { el } from './dom'
import { readProgress, readStatus } from '../status'
import type { Book, ReadStatus, ShelfGroup } from '../types'

const STATUS_LABEL: Record<ReadStatus, string> = { unread: '未読', reading: '読みかけ', read: '既読' }

function statusBadges(group: ShelfGroup): HTMLElement {
  const { unread, reading } = group.counts
  return el('div', { className: 'bws-badges' }, [
    unread > 0 && el('span', { className: 'bws-badge bws-badge--unread', textContent: `未読 ${unread}` }),
    reading > 0 && el('span', { className: 'bws-badge bws-badge--reading', textContent: `読みかけ ${reading}` }),
    unread === 0 && reading === 0 && el('span', { className: 'bws-badge bws-badge--done', textContent: '読了' }),
    group.hasNonPurchased && el('span', { className: 'bws-badge bws-badge--missing', textContent: '未購入の既刊あり' }),
  ])
}

export function seriesCard(group: ShelfGroup, expanded: boolean, onToggle: () => void): HTMLElement {
  const card = el(
    'button',
    {
      type: 'button',
      className: `bws-card${expanded ? ' bws-card--expanded' : ''}`,
      title: group.name,
      onclick: onToggle,
    },
    [
      el('div', { className: 'bws-card__cover' }, [
        el('img', { src: group.coverUrl, alt: '', loading: 'lazy' }),
        el('span', { className: 'bws-card__count', textContent: `${group.books.length}冊` }),
      ]),
      el('div', { className: 'bws-card__name', textContent: group.name }),
      statusBadges(group),
    ],
  )
  card.setAttribute('aria-expanded', String(expanded))
  return card
}

function progressBar(progress: number): HTMLElement {
  const fill = el('span')
  fill.style.width = `${progress}%`
  return el('span', { className: 'bws-volume__progress' }, [fill])
}

function volumeTile(book: Book): HTMLElement {
  const status = readStatus(book)
  const progress = readProgress(book)
  return el('div', { className: `bws-volume bws-volume--${status}` }, [
    el('a', { className: 'bws-volume__cover', href: book.viewerUrl, target: '_blank', rel: 'noopener', title: `${book.title} を読む` }, [
      el('img', { src: book.imageUrl, alt: '', loading: 'lazy' }),
      el('span', { className: `bws-volume__status bws-volume__status--${status}`, textContent: status === 'reading' ? `${progress}%` : STATUS_LABEL[status] }),
      status === 'reading' && progressBar(progress),
    ]),
    el('a', { className: 'bws-volume__title', href: book.detailUrl, textContent: book.title, title: '作品の詳細ページ' }),
  ])
}

export function volumePanel(group: ShelfGroup): HTMLElement {
  return el('div', { className: 'bws-panel' }, [
    el('div', { className: 'bws-panel__head' }, [
      el('span', { className: 'bws-panel__name', textContent: group.name }),
      group.nonPurchasedUrl &&
        el('a', { className: 'bws-panel__link', href: group.nonPurchasedUrl, target: '_blank', rel: 'noopener', textContent: '未購入の既刊を見る' }),
    ]),
    el('div', { className: 'bws-panel__volumes' }, group.books.map(volumeTile)),
  ])
}
