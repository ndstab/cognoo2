'use client'

import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { MemoizedReactMarkdown } from './ui/markdown'

export function BotMessage({
  content
}: {
  content: string | StreamableValue<string>
}) {
  const [data, error, pending] = useStreamableValue(content)

  if (error) {
    console.error('Streaming error:', error)
    return (
      <div className="flex items-center gap-2 w-full text-red-500">
        <p>An error occurred while streaming the response. Please try again.</p>
      </div>
    )
  }

  if (pending && !data) {
    return (
      <div className="flex items-center gap-2 w-full">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <MemoizedReactMarkdown className="prose-sm prose-neutral prose-a:text-accent-foreground/50 w-full">
        {data || ''}
      </MemoizedReactMarkdown>
    </div>
  )
}
