import { cn } from '@/lib/utils'
import React from 'react'

type UserMessageProps = {
  message: string
  isFirstMessage?: boolean
}

export const UserMessage: React.FC<UserMessageProps> = ({
  message,
  isFirstMessage
}) => {
  return (
    <div className={cn('w-full', { 'pt-4': !isFirstMessage })}>
      <div className="text-xl w-full">{message}</div>
    </div>
  )
}
