// タイトル末尾の巻数表記を解釈する。全角数字・全角括弧は NFKC で半角にそろえてから判定する

// 巻数は 3 桁まで（4 桁は年号などの作品名の一部とみなす）
const NUMBER = '(\\d{1,3}(?:\\.\\d+)?)'
const LEADING_NOTE = /^\s*[【[][^】\]]*[】\]]\s*/
const TRAILING_NOTE = /\s*[【[][^】\]]*[】\]]\s*$/
const KANJI_ORDER: Record<string, number> = { 上: 1, 中: 2, 下: 3 }

const VOLUME_PATTERNS: Array<{ re: RegExp; toVolume: (m: RegExpMatchArray) => number }> = [
  { re: new RegExp(`\\s*第\\s*${NUMBER}\\s*巻$`), toVolume: m => Number(m[1]) },
  { re: new RegExp(`\\s*\\(\\s*${NUMBER}\\s*\\)$`), toVolume: m => Number(m[1]) },
  { re: new RegExp(`\\s*[:：]?\\s*(?<![\\d.])${NUMBER}\\s*巻?$`), toVolume: m => Number(m[1]) },
  { re: /\s*\(?\s*([上中下])\s*\)?$/, toVolume: m => KANJI_ORDER[m[1]] },
]

function stripRepeatedly(text: string, re: RegExp): string {
  let current = text
  for (let next = current.replace(re, ''); next !== current; next = current.replace(re, '')) {
    current = next
  }
  return current
}

function stripNotes(title: string): string {
  const normalized = title.normalize('NFKC').trim()
  return stripRepeatedly(stripRepeatedly(normalized, TRAILING_NOTE), LEADING_NOTE).trim()
}

function matchVolume(title: string): { volume: number; rest: string } | null {
  const normalized = stripNotes(title)
  for (const { re, toVolume } of VOLUME_PATTERNS) {
    const m = normalized.match(re)
    if (m && m.index !== undefined && m.index > 0) {
      return { volume: toVolume(m), rest: normalized.slice(0, m.index).trim() }
    }
  }
  return null
}

export function parseVolume(title: string): number | null {
  return matchVolume(title)?.volume ?? null
}

/** シリーズ情報が取れないときの表示名として、巻数表記を除いたタイトルを返す */
export function stripVolume(title: string): string {
  return matchVolume(title)?.rest ?? stripNotes(title)
}
