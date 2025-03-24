'use client'

import { useState, useEffect } from 'react'
import { useUIState, useAIState } from 'ai/rsc'
import type { AI } from '@/app/action'
import { Button } from './ui/button'
import { Search, History, User, Settings, MessageSquare, Users, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserProfile } from './user-profile'
import { UserSearch } from './user-search'
import { CollaborationScreen } from './collaboration-screen'

export function ChatSidebar() {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [userProfileOpen, setUserProfileOpen] = useState(false)
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [collaborationOpen, setCollaborationOpen] = useState(false)
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

  // Handle sidebar button clicks
  const handleUsersClick = () => {
    setCollaborationOpen(!collaborationOpen)
    setUserProfileOpen(false)
    setHistoryOpen(false)
    setUserSearchOpen(false)
  }

  const handleHistoryClick = () => {
    setHistoryOpen(!historyOpen)
    setUserProfileOpen(false)
    setUserSearchOpen(false)
    setCollaborationOpen(false)
  }

  const handleProfileClick = () => {
    setUserProfileOpen(!userProfileOpen)
    setHistoryOpen(false)
    setUserSearchOpen(false)
    setCollaborationOpen(false)
  }

  return (
    <div className="fixed left-0 top-0 h-full bg-background border-r z-20 w-16">
      <div className="flex flex-col items-center p-2 space-y-4 h-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleHistoryClick}
        >
          <History size={20} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleProfileClick}
        >
          <User size={20} />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleUsersClick}
        >
          <Users size={20} />
        </Button>
        <Button variant="ghost" size="icon">
          <Globe size={20} />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings size={20} />
        </Button>
      </div>

      <div
        className={cn(
          'fixed left-16 top-0 h-full bg-background border-r transition-all duration-300 z-20',
          historyOpen || userProfileOpen || userSearchOpen ? 'w-80' : 
          collaborationOpen ? 'w-full' : 'w-0 border-0'
        )}
      >
        {userProfileOpen && <UserProfile />}
        {userSearchOpen && <UserSearch />}
        {collaborationOpen && <CollaborationScreen />}
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
                <div className="flex-1 truncate text-sm">
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