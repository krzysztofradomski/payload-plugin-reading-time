import type { LexicalWalkResult } from '../types.js'

import { isPlainObject } from '../types.js'

type LexicalNode = {
  children?: unknown
  fields?: unknown
  tag?: string
  text?: unknown
  type?: string
}

/**
 * Walks a Lexical editor state and returns its plain text.
 *
 * Block nodes attach their inner content to `fields` (Payload's block config)
 * rather than `children`, so a naive children-only traversal misses block
 * text and is rejected by this implementation.
 */
export function walkLexical(value: unknown): LexicalWalkResult {
  const result: LexicalWalkResult = { plainText: '' }

  if (!isPlainObject(value)) {
    return result
  }

  const root = (value as { root?: unknown }).root

  if (!isPlainObject(root)) {
    return result
  }

  const textBuffer: string[] = []

  const collectFromBlockFields = (fields: unknown): string[] => {
    const parts: string[] = []

    const visit = (node: unknown): void => {
      if (typeof node === 'string') {
        if (node.trim()) {
          parts.push(node)
        }
        return
      }

      if (Array.isArray(node)) {
        for (const item of node) {
          visit(item)
        }
        return
      }

      if (!isPlainObject(node)) {
        return
      }

      if ('root' in node && isPlainObject((node as { root?: unknown }).root)) {
        const nested = walkLexical(node)
        if (nested.plainText) {
          parts.push(nested.plainText)
        }
        return
      }

      for (const value of Object.values(node)) {
        visit(value)
      }
    }

    visit(fields)
    return parts
  }

  const walk = (node: unknown): void => {
    if (!isPlainObject(node)) {
      return
    }

    const typed = node as LexicalNode

    if (typed.type === 'text' && typeof typed.text === 'string') {
      textBuffer.push(typed.text)
      return
    }

    if (typed.type === 'linebreak' || typed.type === 'tab') {
      textBuffer.push(' ')
      return
    }

    if (typed.type === 'block') {
      const blockText = collectFromBlockFields(typed.fields).join(' ')
      if (blockText) {
        textBuffer.push(blockText)
      }
    }

    if (Array.isArray(typed.children)) {
      for (const child of typed.children) {
        walk(child)
      }
    }
  }

  walk(root)

  result.plainText = textBuffer
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return result
}
