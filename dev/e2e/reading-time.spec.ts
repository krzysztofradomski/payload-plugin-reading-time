import type { APIRequestContext } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { devUser } from '../helpers/credentials.js'

const POST_TITLE = 'E2E reading-time post'

async function login(request: APIRequestContext): Promise<string> {
  const response = await request.post('/api/users/login', {
    data: { email: devUser.email, password: devUser.password },
  })
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as { token: string }
  return body.token
}

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

const text = (value: string) => ({
  type: 'text',
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text: value,
  version: 1,
})

const para = (value: string) => ({
  type: 'paragraph',
  children: [text(value)],
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})

const heading = (tag: string, value: string) => ({
  type: 'heading',
  children: [text(value)],
  direction: 'ltr',
  format: '',
  indent: 0,
  tag,
  version: 1,
})

test.describe('reading-time plugin', () => {
  test('computes readingTime and wordCount when creating a post via the REST API', async ({
    request,
  }) => {
    const token = await login(request)
    const slug = `e2e-reading-time-${Date.now()}`

    const created = await request.post('/api/posts', {
      data: {
        slug,
        content: lexicalDoc([
          heading('h2', 'Intro'),
          para(
            'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty',
          ),
          heading('h3', 'Subsection'),
          para('more body text body body body body body body body body body body'),
        ]),
        title: POST_TITLE,
      },
      headers: { Authorization: `JWT ${token}` },
    })

    expect(created.ok()).toBeTruthy()

    const body = (await created.json()) as {
      doc: {
        readingTime: number
        wordCount: number
      }
    }

    expect(body.doc.wordCount).toBeGreaterThan(20)
    expect(body.doc.readingTime).toBeGreaterThanOrEqual(1)
  })

  test('renders the post meta on the public post page', async ({ page }) => {
    await page.goto('/posts/hello-world')

    await expect(page.locator('article h1')).toContainText('Welcome to the reading-time demo')
    await expect(page.locator('.post-meta')).toContainText('min read')
  })
})
