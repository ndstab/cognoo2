'use client'

import { ChatPanel } from './chat-panel'
import { ChatMessages } from './chat-messages'
import { ChatSidebar } from './chat-sidebar'

export function Chat() {
  return (
    <div className="relative">
      <ChatSidebar />
      <div className="pl-4 md:pl-32">
        <div className="px-8 md:px-12 md:pt-4 pb-14 md:pb-24 w-full flex flex-col space-y-3 md:space-y-4">
          <ChatMessages />
          <ChatPanel />
        </div>
      </div>
    </div>
  )
}
