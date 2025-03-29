'use client'

import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { MemoizedReactMarkdown } from './ui/markdown'
import { cn } from '@/lib/utils'

export function BotMessage({
  content
}: {
  content: string | StreamableValue<string>
}) {
  const [data, error, pending] = useStreamableValue(content)

  if (error) {
    console.error('Streaming error:', error)
    return (
      <div className="flex items-start gap-2 w-full text-red-500 min-h-[3rem]">
        <p>An error occurred while streaming the response. Please try again.</p>
      </div>
    )
  }

  if (pending && !data) {
    return (
      <div className="flex items-start gap-2 w-full min-h-[3rem]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex items-start gap-2 w-full",
      pending && data ? "min-h-[3rem]" : ""
    )}>
      <MemoizedReactMarkdown className="prose-sm prose-neutral prose-a:text-accent-foreground/50 w-full">
        {data || ''}
      </MemoizedReactMarkdown>
    </div>
  )
}
