import type { DevPost } from './types.js'

/**
 * Render a Lexical document into an array of structured nodes for the dev
 * frontend.
 */
export type RenderedNode =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }

export function renderRichText(value: unknown): RenderedNode[] {
  if (!value || typeof value !== 'object') {
    return []
  }

  const root = (value as { root?: { children?: unknown[] } }).root
  if (!root || !Array.isArray(root.children)) {
    return []
  }

  const nodes: RenderedNode[] = []

  for (const child of root.children) {
    if (!child || typeof child !== 'object') {
      continue
    }
    const node = child as { children?: unknown[]; tag?: string; type?: string }
    const text = collectChildText(node).trim()

    if (!text) {
      continue
    }

    if (node.type === 'heading' && typeof node.tag === 'string') {
      const level = Number(node.tag.replace(/^h/i, ''))
      nodes.push({ type: 'heading', level, text })
    } else {
      nodes.push({ type: 'paragraph', text })
    }
  }

  return nodes
}

function collectChildText(node: { children?: unknown[] }): string {
  if (!Array.isArray(node.children)) {
    return ''
  }
  return node.children
    .map((child) => {
      if (!child || typeof child !== 'object') return ''
      const typed = child as { text?: unknown }
      return typeof typed.text === 'string' ? typed.text : ''
    })
    .join('')
}

export function formatPostMeta(post: DevPost): string {
  const parts: string[] = []
  if (typeof post.readingTime === 'number' && post.readingTime > 0) {
    parts.push(`${post.readingTime} min read`)
  }
  if (typeof post.wordCount === 'number') {
    parts.push(`${post.wordCount} words`)
  }
  return parts.join(' · ')
}
