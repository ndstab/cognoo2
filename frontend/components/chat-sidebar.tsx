'use client'

import { useState, useEffect } from 'react'
import { useUIState, useAIState } from 'ai/rsc'
import type { AI } from '@/app/action'
import { Button } from './ui/button'
import { Search, History, User, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserProfile } from './user-profile'

export function ChatSidebar() {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [userProfileOpen, setUserProfileOpen] = useState(false)
  const [messages] = useUIState<typeof AI>()
  
  interface Conversation {
    id: number
    messages: any[]
    type: 'search' | 'chat'
    timestamp: string
  }

  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    const storedHistory: Conversation[] = JSON.parse(localStorage.getItem('chatHistory') || '[]')
    const allMessages = [...messages].sort((a, b) => a.id - b.id)
    
    const groupedConversations = allMessages.reduce((acc: Conversation[], message: any) => {
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
    }, [] as Conversation[])

    setConversations([...groupedConversations, ...storedHistory].sort((a, b) => b.id - a.id) as Conversation[])
  }, [messages])

  const handleHistoryClick = () => {
    setHistoryOpen(!historyOpen)
    setUserProfileOpen(false)
  }

  const handleProfileClick = () => {
    setUserProfileOpen(!userProfileOpen)
    setHistoryOpen(false)
  }

  return (
    <div className="fixed left-0 top-0 h-full z-40">
      <div className="flex flex-col items-center p-2 space-y-4 h-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleHistoryClick}
          className="h-10 w-10 sm:h-12 sm:w-12"
        >
          <History size={20} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleProfileClick}
          className="h-10 w-10 sm:h-12 sm:w-12"
        >
          <User size={20} />
        </Button>
      </div>

      <div
        className={cn(
          'fixed left-16 top-0 h-full bg-background transition-all duration-300 z-40',
          historyOpen || userProfileOpen ? 'w-[280px] sm:w-80' : 'w-0'
        )}
      >
        {userProfileOpen && <UserProfile />}
        {historyOpen && (
          <div className="p-4 overflow-y-auto h-full">
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
                <div className="flex-1 truncate text-lg">
                  {conv.messages[0].component?.props?.message ||
                    'Conversation ' + conv.timestamp}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}