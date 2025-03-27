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
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'auto',  // Always use auto during generation for smoother streaming
        block: 'end'
      })
    }
  }

  useEffect(() => {
    const latestMessage = messages[messages.length - 1]
    const nextIsGenerating = latestMessage?.isGenerating || false
    
    // Only update state if it's different to avoid unnecessary re-renders
    if (nextIsGenerating !== isGenerating) {
      setIsGenerating(Boolean(nextIsGenerating))
      // Reset user scroll and force scroll to bottom when generation starts
      if (nextIsGenerating) {
        setUserScrolled(false)
        scrollToBottom()
      }
    }

    // Always scroll during generation, or if user hasn't manually scrolled
    if (nextIsGenerating || !userScrolled) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        scrollToBottom()
      })
    }
  }, [messages, isGenerating])

  // Add a mutation observer to watch for content changes
  useEffect(() => {
    if (!messageContainerRef.current) return;

    const observer = new MutationObserver((mutations) => {
      if (isGenerating) {
        scrollToBottom();
      }
    });

    observer.observe(messageContainerRef.current, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => observer.disconnect();
  }, [isGenerating]);

  return (
    <div 
      ref={messageContainerRef} 
      className="flex flex-col space-y-4 overflow-y-auto scroll-smooth"
      onScroll={(e) => {
        const target = e.target as HTMLDivElement
        // Increase threshold for better scroll detection
        const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 200
        setUserScrolled(!isAtBottom)
      }}
    >
      {messages.map((message: { id: number; component: React.ReactNode }) => (
        <div key={message.id}>{message.component}</div>
      ))}
      <div ref={messagesEndRef} className="h-4" />
    </div>
  )
}