import type { Payload } from 'payload'

import { devUser } from './helpers/credentials.js'

/**
 * Minimal Lexical helper for seeding: paragraphs and headings only. The
 * plugin's walker handles arbitrarily nested structures, but for seeds we
 * keep the JSON readable.
 */
const text = (value: string) => ({
  type: 'text',
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text: value,
  version: 1,
})

const paragraph = (value: string) => ({
  type: 'paragraph',
  children: [text(value)],
  direction: 'ltr',
  format: '',
  indent: 0,
  textFormat: 0,
  version: 1,
})

const heading = (tag: string, value: string) => ({
  type: 'heading',
  tag,
  children: [text(value)],
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})

const lexicalDoc = (children: unknown[]) => ({
  root: {
    type: 'root',
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})

const samplePosts = [
  {
    title: 'Welcome to the reading-time demo',
    slug: 'hello-world',
    excerpt: 'A walk-through of computed reading time and word count.',
    content: lexicalDoc([
      paragraph(
        'This article demonstrates the payload-plugin-reading-time plugin. Save the post in admin and watch the sidebar values update.',
      ),
      heading('h2', 'Getting started'),
      paragraph(
        'Reading time and word count are computed on every save via a beforeChange hook.',
      ),
      heading('h2', 'Why a custom walker'),
      paragraph(
        'The naive getTextContent shortcut misses text held inside Lexical block nodes. This plugin walks block fields explicitly.',
      ),
    ]),
  },
]

export const seed = async (payload: Payload) => {
  const { totalDocs: userCount } = await payload.count({
    collection: 'users',
    where: {
      email: {
        equals: devUser.email,
      },
    },
  })

  if (!userCount) {
    await payload.create({
      collection: 'users',
      data: devUser,
    })
  }

  for (const post of samplePosts) {
    const { totalDocs } = await payload.count({
      collection: 'posts',
      where: {
        slug: {
          equals: post.slug,
        },
      },
    })

    if (!totalDocs) {
      await payload.create({
        collection: 'posts',
        data: post,
      })
    }
  }
}
