'use client'

import { useState, useEffect } from 'react'
import { useUIState, useAIState } from 'ai/rsc'
import type { AI } from '@/app/action'
import { Button } from './ui/button'
import { ChevronRight, ChevronLeft, Search, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChatSidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const [messages] = useUIState<typeof AI>()
  const [aiMessages] = useAIState<typeof AI>()
  const [conversations, setConversations] = useState<any[]>([])

  useEffect(() => {
    // Load chat history from localStorage
    const storedHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]')
    
    // Process current messages
    const allMessages = [...messages].sort((a, b) => a.id - b.id)
    const groupedConversations = allMessages.reduce((acc: any[], message: any) => {
      const lastConv = acc[acc.length - 1]
      const isNewConversation = !acc.length || 
        (lastConv && message.id - lastConv.messages[lastConv.messages.length - 1].id > 300000)

      if (isNewConversation) {
        acc.push({
          id: message.id,
          messages: [message],
          type: message.component?.props?.isFirstMessage ? 'search' : 'chat',
          timestamp: new Date(message.id).toLocaleString()
        })
      } else {
        lastConv.messages.push(message)
      }
      return acc
    }, [])

    // Combine stored history with current messages
    const combinedConversations = [...groupedConversations, ...storedHistory]
    setConversations(combinedConversations.sort((a, b) => b.id - a.id))
  }, [messages])

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-full bg-background border-r transition-all duration-300 z-20',
        isOpen ? 'w-64' : 'w-16'
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-background border rounded-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </Button>

      <div className="p-4 space-y-4 overflow-y-auto h-full">
        {conversations.map((conv: any) => (
          <div
            key={conv.id}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted cursor-pointer"
          >
            {conv.type === 'search' ? (
              <Search size={16} className="text-muted-foreground" />
            ) : (
              <MessageSquare size={16} className="text-muted-foreground" />
            )}
            {isOpen && (
              <div className="flex-1 truncate text-sm">
                {conv.messages[0].component?.props?.message ||
                  'Conversation ' + conv.timestamp}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}