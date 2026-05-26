'use client'

import { subscribe, unsubscribe } from '@payloadcms/live-preview'
import { useEffect, useState } from 'react'

import { formatPostMeta, renderRichText } from '../lib/renderPost.js'
import type { DevPost } from '../lib/types.js'

type Props = {
  initialPost: DevPost
  serverURL: string
}

export function PostPreview({ initialPost, serverURL }: Props) {
  const [post, setPost] = useState(initialPost)

  useEffect(() => {
    setPost(initialPost)
  }, [initialPost])

  useEffect(() => {
    const listener = subscribe<DevPost>({
      callback: (data) => setPost(data),
      initialData: initialPost,
      serverURL,
    })

    return () => {
      unsubscribe(listener)
    }
  }, [initialPost, serverURL])

  const nodes = renderRichText(post.content)
  const meta = formatPostMeta(post)

  return (
    <article className="post-article">
      <h1>{post.title}</h1>
      {meta ? <p className="post-meta">{meta}</p> : null}
      {post.excerpt ? <p className="post-excerpt">{post.excerpt}</p> : null}
      <div className="post-content">
        {nodes.map((node, index) => {
          if (node.type === 'heading') {
            const Tag = `h${Math.min(6, Math.max(1, node.level))}` as 'h1'
            return <Tag key={`h-${index}`}>{node.text}</Tag>
          }
          return <p key={`p-${index}`}>{node.text}</p>
        })}
      </div>
    </article>
  )
}
