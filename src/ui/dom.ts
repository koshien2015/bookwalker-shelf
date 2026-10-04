// innerHTML を使わずに要素を組み立てる（書名などは textContent で入れる）

type Child = Node | string | null | false | undefined

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { className?: string; dataset?: Record<string, string> } = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const { dataset, ...rest } = props
  const node = Object.assign(document.createElement(tag), rest)
  Object.entries(dataset ?? {}).forEach(([key, value]) => {
    node.dataset[key] = value
  })
  children.forEach(child => {
    if (child) node.append(child)
  })
  return node
}
