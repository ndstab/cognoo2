'use client'

import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { MemoizedReactMarkdown } from './ui/markdown'
import { TextToSpeech } from './text-to-speech'

export function BotMessage({
  content
}: {
  content: string | StreamableValue<string>
}) {
  const [data, error, pending] = useStreamableValue(content)

  // Currently, sometimes error occurs after finishing the stream.
  if (error) return <div>Error</div>

  return (
    <div className="flex items-center gap-2">
      <MemoizedReactMarkdown className="prose-sm prose-neutral prose-a:text-accent-foreground/50">
        {data}
      </MemoizedReactMarkdown>
      <TextToSpeech text={data || ''} />
    </div>
  )
}
