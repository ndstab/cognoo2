'use client'

import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { MemoizedReactMarkdown } from './ui/markdown'

export function BotMessage({
  content
}: {
  content: string | StreamableValue<string>
}) {
  const [data, error, pending] = useStreamableValue(content)

  // Currently, sometimes error occurs after finishing the stream.
  if (error) return <div>Error</div>

  return (
    <div className="flex items-center gap-2 w-full">
      <MemoizedReactMarkdown className="prose-sm prose-neutral prose-a:text-accent-foreground/50 w-full">
        {data}
      </MemoizedReactMarkdown>
    </div>
  )
}
