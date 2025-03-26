'use client'

import { SocketDebug } from '@/components/socket-debug'

export default function SocketDebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Socket Connection Debugger</h1>
      <p className="mb-6">Use this tool to test the socket connection to the server.</p>
      
      <SocketDebug />
    </div>
  )
} 