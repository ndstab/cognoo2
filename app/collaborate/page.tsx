'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import io from "socket.io-client"
import { Card } from '@/components/ui/card'
import { ArrowRight, Send } from 'lucide-react'

// Socket connection
const socket = io("http://localhost:3001", {
  withCredentials: false,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

export default function CollaboratePage() {
  const router = useRouter()
  const [roomId, setRoomId] = useState("")
  const [username, setUsername] = useState("")
  const [joined, setJoined] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([])
  const messageBoxRef = useRef(null)

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
  const sendMessage = (e) => {
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

    socket.on("chat message", (data) => {
      console.log("Chat message received:", data)
      setMessages((prev) => [...prev, { 
        sender: data.sender || 'AI', 
        message: data.message || data.content || 'No message content'
      }])
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
      socket.off("chat message")
      socket.off("userJoined")
      socket.off("userLeft")
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
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
              disabled={!roomId || !username}
            >
              Join Room
            </Button>
          </div>
        </Card>
      ) : (
        <div className="w-full max-w-4xl h-[70vh] border rounded-lg flex flex-col">
          <div className="p-3 border-b flex justify-between items-center">
            <h2 className="font-medium">Room: {roomId}</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/')}
            >
              Exit
            </Button>
          </div>
          
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-3"
            ref={messageBoxRef}
          >
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg max-w-[80%] ${
                    msg.sender === username 
                      ? 'ml-auto bg-primary text-primary-foreground' 
                      : msg.sender === 'System'
                        ? 'mx-auto bg-muted text-muted-foreground text-sm italic'
                        : 'bg-secondary'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1">{msg.sender}</div>
                  <div>{msg.message}</div>
                </div>
              ))
            )}
          </div>
          
          <form onSubmit={sendMessage} className="border-t p-3 flex gap-2">
            <Input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!message.trim()}>
              <Send size={18} className="mr-2" />
              Send
            </Button>
          </form>
        </div>
      )}
      
      {joined && (
        <Button 
          variant="outline"
          className="mt-4"
          onClick={() => setJoined(false)}
        >
          Leave Room
        </Button>
      )}
      
      {!joined && (
        <Button 
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/')}
        >
          Back to Home
        </Button>
      )}
    </div>
  )
}