'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import io from "socket.io-client"
import { BackgroundAnimation } from '@/components/background-animation'
import { Card } from '@/components/ui/card'
import { Send } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import ReactMarkdown from 'react-markdown'

// Socket connection
const socket = io("http://localhost:3001", {
  withCredentials: false,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

export default function CollaboratePage() {
  const [roomId, setRoomId] = useState("")
  const [username, setUsername] = useState("")
  const [joined, setJoined] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Array<{ sender: string; message: string }>>([])
  const messageBoxRef = useRef<HTMLDivElement>(null)

  // Join a chat room
  const joinRoom = () => {
    if (!roomId || !username) {
      alert("Enter Room ID and Username!")
      return
    }
    socket.emit("joinRoom", roomId, username)
    setJoined(true)
  }

  // Send a message
  const sendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim()) return
    
    // Send to server
    socket.emit("sendMessage", { roomId, message: message.trim(), sender: username })
    setMessage("") // Clear input field
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight
    }
  }, [messages])

  // Listen for socket connection events
  useEffect(() => {
    // Debug connection
    socket.on('connect', () => {
      console.log('Connected to server!')
      setMessages(prev => [...prev, { sender: 'System', message: 'Connected to chat server' }])
    })
    
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setMessages(prev => [...prev, { sender: 'System', message: 'Connection error: ' + error.message }])
    })

    // Listen for incoming messages
    socket.on("receiveMessage", (data) => {
      console.log("Received message:", data)
      setMessages((prev) => [...prev, data])
    })

    socket.on("userJoined", (msg) => {
      setMessages((prev) => [...prev, { sender: "System", message: msg }])
    })

    socket.on("userLeft", (msg) => {
      setMessages((prev) => [...prev, { sender: "System", message: msg }])
    })

    return () => {
      socket.off("connect")
      socket.off("connect_error")
      socket.off("receiveMessage")
      socket.off("userJoined")
      socket.off("userLeft")
    }
  }, [])

  // Function to render message with markdown for AI responses
  const renderMessage = (msg: { sender: string; message: string }, index: number) => {
    const isAI = msg.sender === "Cogni";
    const isSystem = msg.sender === "System";
    
    return (
      <div 
        key={index} 
        className={`mb-4 ${isSystem ? 'text-center text-gray-500 text-sm' : 
          isAI ? 'flex flex-row' : 'flex flex-row-reverse'}`}
      >
        {!isSystem && (
          <div className={`flex flex-col max-w-[75%] ${isAI ? 'mr-auto' : 'ml-auto'}`}>
            <div className="flex items-center mb-1">
              <Avatar className={`h-6 w-6 ${isAI ? 'mr-2' : 'ml-2 order-2'}`}>
                <AvatarFallback>{isAI ? 'AI' : msg.sender[0]}</AvatarFallback>
              </Avatar>
              <span className={`text-sm ${isAI ? '' : 'order-1 mr-2'}`}>{msg.sender}</span>
            </div>
            <div className={`rounded-lg p-3 ${isAI ? 'bg-gray-700 text-white' : 'bg-muted'} overflow-hidden`}>
              {isAI ? (
                <ReactMarkdown 
                  className="prose prose-sm prose-invert max-w-none"
                  components={{
                    pre: ({node, ...props}) => (
                      <pre {...props} className="p-2 rounded-md bg-gray-800 overflow-x-auto" />
                    ),
                    img: ({node, ...props}) => (
                      <div className="my-4 flex justify-center">
                        <img
                          {...props}
                          className="max-w-full h-auto rounded-lg shadow-lg"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    ),
                    p: ({node, ...props}) => (
                      <p {...props} className="mb-2 last:mb-0" />
                    ),
                    // code: ({node, inline, ...props}) => (
                    //   inline ? 
                    //     <code {...props} className="px-1 py-0.5 rounded-sm bg-gray-800" /> :
                    //     <code {...props} className="block p-2 rounded-md bg-gray-800 overflow-x-auto" />
                    // )
                  }}
                >
                  {msg.message}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.message}</p>
              )}
            </div>
          </div>
        )}
        
        {isSystem && <div className="w-full text-gray-500 italic">{msg.message}</div>}
      </div>
    );
  };

  return (
    <>
      <BackgroundAnimation />
      <div className="flex flex-col items-center min-h-screen p-4 pt-16">
        <h1 className="text-2xl font-bold mb-6">Collaborative Chat</h1>
      
      {!joined ? (
        <Card className="w-full max-w-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-center">Join a Chat Room</h2>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full"
            />
            <Input
              type="text"
              placeholder="Your Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
            />
            <Button 
              onClick={joinRoom}
              className="w-full"
            >
              Join Room
            </Button>
          </div>
        </Card>
      ) : (
        <div className="w-full max-w-4xl flex flex-col h-[80vh]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Room: {roomId}</h2>
            <Button 
              variant="outline" 
              onClick={() => {
                socket.disconnect()
                setJoined(false)
                setMessages([])
              }}
            >
              Leave Room
            </Button>
          </div>
          
          <div 
            ref={messageBoxRef}
            className="flex-1 overflow-y-auto p-4 border rounded-lg mb-4"
          >
            {messages.map((msg, index) => renderMessage(msg, index))}
          </div>
          
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
      </div>
    </>
  )
}