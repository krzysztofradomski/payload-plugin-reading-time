import { describe, expect, it } from 'vitest'

import { extractFieldText } from './extractFieldText.js'

const lexical = (text: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', text }],
      },
    ],
  },
})

describe('extractFieldText', () => {
  describe('richText', () => {
    it('walks Lexical state and returns plain text', () => {
      expect(extractFieldText(lexical('hello world'), 'richText')).toBe('hello world')
    })

    it('returns empty string for non-Lexical input', () => {
      expect(extractFieldText('not lexical', 'richText')).toBe('')
      expect(extractFieldText(null, 'richText')).toBe('')
      expect(extractFieldText(undefined, 'richText')).toBe('')
    })
  })

  describe('text / textarea / code', () => {
    it('returns the value verbatim when it is a string', () => {
      expect(extractFieldText('plain text', 'text')).toBe('plain text')
      expect(extractFieldText('line one\nline two', 'textarea')).toBe('line one\nline two')
      expect(extractFieldText('const x = 1', 'code')).toBe('const x = 1')
    })

    it('returns empty string for non-string values', () => {
      expect(extractFieldText(null, 'text')).toBe('')
      expect(extractFieldText(undefined, 'textarea')).toBe('')
      expect(extractFieldText({ foo: 'bar' }, 'code')).toBe('')
      expect(extractFieldText(42, 'text')).toBe('')
    })
  })

  describe('json', () => {
    it('collects all string values from a nested object', () => {
      const value = {
        count: 3,
        meta: { author: 'Alice', tags: ['intro', 'guide'] },
        title: 'Hello',
      }
      // Iteration order across nested objects is an implementation detail;
      // assert membership instead of a fixed sequence.
      const tokens = extractFieldText(value, 'json').split(' ').sort()
      expect(tokens).toEqual(['Alice', 'Hello', 'guide', 'intro'])
    })

    it('ignores keys, only collects string values', () => {
      expect(extractFieldText({ secret: 'cake' }, 'json')).toBe('cake')
    })

    it('returns the string itself when value is already a string', () => {
      expect(extractFieldText('inline json string', 'json')).toBe('inline json string')
    })

    it('returns empty string for null / undefined / non-string primitives', () => {
      expect(extractFieldText(null, 'json')).toBe('')
      expect(extractFieldText(undefined, 'json')).toBe('')
      expect(extractFieldText(123, 'json')).toBe('')
    })
  })
})
