import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let payload: Awaited<ReturnType<typeof getPayload>>

describe('payload-plugin-reading-time', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.db.destroy()
  })

  it('adds readingTime and wordCount fields to enabled collections', () => {
    const postsConfig = payload.collections.posts.config
    const fieldNames = postsConfig.fields.flatMap((field) =>
      'name' in field ? [field.name] : [],
    )

    expect(fieldNames).toContain('readingTime')
    expect(fieldNames).toContain('wordCount')
    expect(fieldNames).not.toContain('toc')
  })

  it('computes readingTime and wordCount on save', async () => {
    const lexical = (children: unknown[]) => ({
      root: {
        type: 'root',
        children,
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    })

    const para = (text: string) => ({
      type: 'paragraph',
      children: [
        { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    })

    const head = (tag: string, text: string) => ({
      type: 'heading',
      tag,
      children: [
        { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    })

    const content = lexical([
      head('h2', 'Intro'),
      para(
        'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty',
      ),
      head('h3', 'Subsection'),
      para('more body text body body body body body body body'),
    ])

    const created = await payload.create({
      collection: 'posts',
      data: {
        title: 'Int spec post',
        slug: `int-spec-${Date.now()}`,
        content,
      },
    })

    expect(typeof created.wordCount).toBe('number')
    expect(created.wordCount).toBeGreaterThan(20)
    expect(created.readingTime).toBeGreaterThanOrEqual(1)
    expect(created).not.toHaveProperty('toc')

    const updated = await payload.update({
      collection: 'posts',
      id: created.id,
      data: {
        content: lexical([head('h2', 'New heading'), para('short body')]),
      },
    })

    expect(updated.wordCount).toBe(4)
  })
})
