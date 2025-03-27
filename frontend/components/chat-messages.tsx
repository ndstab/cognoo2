'use client'

import { useUIState } from 'ai/rsc'
import type { AI } from '@/app/action'
import { useEffect, useRef, useState } from 'react'

export function ChatMessages() {
  const [messages, setMessages] = useUIState<typeof AI>()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [userScrolled, setUserScrolled] = useState(false)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: isGenerating ? 'auto' : 'smooth', block: 'end' })
    }
  }

  useEffect(() => {
    const latestMessage = messages[messages.length - 1]
    const nextIsGenerating = latestMessage?.isGenerating || false
    
    // Only update state if it's different to avoid unnecessary re-renders
    if (nextIsGenerating !== isGenerating) {
      setIsGenerating(nextIsGenerating)
      // Reset user scroll only when starting generation
      if (nextIsGenerating) {
        setUserScrolled(false)
      }
    }

    // Force scroll during generation or if user hasn't scrolled
    if (nextIsGenerating || !userScrolled) {
      requestAnimationFrame(() => {
        scrollToBottom()
      })
    }
  }, [messages, isGenerating])

  return (
    <div 
      ref={messageContainerRef} 
      className="flex flex-col space-y-4 overflow-y-auto"
      onScroll={(e) => {
        const target = e.target as HTMLDivElement
        const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100
        setUserScrolled(!isAtBottom)
      }}
    >
      {messages.map((message: { id: number; component: React.ReactNode }) => (
        <div key={message.id}>{message.component}</div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}