import { describe, expect, it } from 'vitest'

import { walkLexical } from './lexicalWalker.js'

const textNode = (text: string) => ({ type: 'text', text })

const paragraph = (...children: unknown[]) => ({
  type: 'paragraph',
  children,
})

const heading = (tag: string, text: string) => ({
  type: 'heading',
  children: [textNode(text)],
  tag,
})

const lexical = (...children: unknown[]) => ({
  root: {
    type: 'root',
    children,
  },
})

describe('walkLexical', () => {
  it('returns empty result for non-Lexical input', () => {
    expect(walkLexical(null)).toEqual({ plainText: '' })
    expect(walkLexical({})).toEqual({ plainText: '' })
    expect(walkLexical({ root: 'oops' })).toEqual({ plainText: '' })
  })

  it('joins paragraph text with whitespace', () => {
    const value = lexical(
      paragraph(textNode('Hello'), textNode(' '), textNode('world')),
      paragraph(textNode('Second')),
    )

    expect(walkLexical(value).plainText).toBe('Hello world Second')
  })

  it('includes heading text in plain text output', () => {
    const value = lexical(
      heading('h1', 'Title'),
      paragraph(textNode('Lead-in.')),
      heading('h2', 'Getting Started'),
    )

    expect(walkLexical(value).plainText).toBe('Title Lead-in. Getting Started')
  })

  it('walks block-node fields including nested Lexical states', () => {
    const value = lexical(
      paragraph(textNode('Intro text.')),
      {
        type: 'block',
        fields: {
          blockType: 'callout',
          body: lexical(heading('h2', 'Aside heading'), paragraph(textNode('Aside body.'))),
          title: 'Aside Block',
        },
      },
      paragraph(textNode('Outro.')),
    )

    const result = walkLexical(value)

    expect(result.plainText).toContain('Intro text.')
    expect(result.plainText).toContain('Aside Block')
    expect(result.plainText).toContain('Aside heading')
    expect(result.plainText).toContain('Aside body.')
    expect(result.plainText).toContain('Outro.')
  })

  it('treats linebreak and tab nodes as whitespace separators', () => {
    const value = lexical(
      paragraph(textNode('Line one'), { type: 'linebreak' }, textNode('Line two')),
    )

    expect(walkLexical(value).plainText).toBe('Line one Line two')
  })

  it('collapses runs of whitespace into single spaces', () => {
    const value = lexical(paragraph(textNode('a    b'), { type: 'tab' }, textNode('c')))

    expect(walkLexical(value).plainText).toBe('a b c')
  })
})
