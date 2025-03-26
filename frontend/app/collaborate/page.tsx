'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import io from "socket.io-client"
import { BackgroundAnimation } from '@/components/background-animation'
import { Card } from '@/components/ui/card'
import { Send } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ReactMarkdown from 'react-markdown'
import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage } from 'ai'
import { collaborativeAgent } from '@/lib/agents/collaborative'
import { shouldAIRespondLLM } from '@/lib/agents/response-decider'

// Socket connection
const socket = io("https://cogniwebsocket.centralindia.cloudapp.azure.com", {
// const socket = io("https://localhost:3001", {
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
  const [messages, setMessages] = useState<Array<{ sender: string; message: string }>>([])
  const messageBoxRef = useRef<HTMLDivElement>(null)
  
  // Add agent state
  const [isProcessing, setIsProcessing] = useState(false)
  const [agentMessages, setAgentMessages] = useState<CoreMessage[]>([])

  // Join a chat room
  const joinRoom = () => {
    if (!roomId || !username) {
      alert("Enter Room ID and Username!")
      return
    }
    socket.emit("joinRoom", roomId, username)
    setJoined(true)
  }

  // Process message with AI
  const processWithAgent = async (userMessage: string) => {
    setIsProcessing(true)
    
    try {
      // Add user message to agent history
      const newMessage: CoreMessage = {
        role: 'user',
        content: userMessage
      }
      
      const updatedMessages = [...agentMessages, newMessage]
      setAgentMessages(updatedMessages)
      
      // Create streamable components for the agent
      const uiStream = createStreamableUI()
      const textStream = createStreamableValue('')
      
      // Process with collaborative agent
      const result = await collaborativeAgent(uiStream, textStream, updatedMessages, roomId)
      
      // Send AI response to the chat
      if (result.fullResponse) {
        // Format the response to clearly distinguish answer and sources
        const response = formatResponse(result.fullResponse);
        socket.emit("sendMessage", { roomId, message: response, sender: "Cogni" })
      }
      
      // If we need inquiry, send that message
      if (result.needsInquiry && result.inquiry) {
        const inquiryMessage = "I need more information to help effectively. Could you please provide more details?"
        socket.emit("sendMessage", { roomId, message: inquiryMessage, sender: "Cogni" })
      }
      
    } catch (error) {
      console.error("Agent error:", error)
      socket.emit("sendMessage", { 
        roomId, 
        message: "I encountered an error processing your request. Let's try again.", 
        sender: "Cogni" 
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Helper function to format the response
  const formatResponse = (text: string): string => {
    // Step 1: Remove any sections related to images
    const imageSectionPatterns = [
      /Images:[\s\S]*?(?:\n\n|$)/g,                  // Standard Images: section
      /Image[s]?:[\s\S]*?(?:\n\n|$)/g,               // With or without 's'
      /No images[\s\S]*?(?:provided\.|\n\n|$)/g,     // "No images provided" variations
      /\b(?:Image|Images)(?:\s+are)?\s+not\s+(?:available|provided)[\s\S]*?(?:\.|$)/g, // "Images are not available"
      /\bImages?\b[^.]*?\./g,                        // Any sentence containing "Image" or "Images"
      /\n[^\n]*\bimages?\b[^\n]*\n/gi                // Any line containing image/images
    ];
    
    // Apply section-level patterns
    for (const pattern of imageSectionPatterns) {
      text = text.replace(pattern, '');
    }
    
    // Step 2: Remove individual instances of image-related words
    const imageWordPatterns = [
      /\bImage\b/g,
      /\bImages\b/g,
      /\bimage\b/g,
      /\bimages\b/g,
      /\bIMAGE\b/g,
      /\bIMAGES\b/g,
      /\bpicture\b/gi,
      /\bpictures\b/gi,
      /\bphoto\b/gi,
      /\bphotos\b/gi,
      /\billustration\b/gi,
      /\billustrations\b/gi,
      /\bvisual\b/gi,
      /\bvisuals\b/gi
    ];
    
    // Replace individual image words
    for (const word of imageWordPatterns) {
      text = text.replace(word, '');
    }
    
    // Step 3: Clean up artifacts
    text = text.replace(/\s{2,}/g, ' '); // Replace multiple spaces with a single space
    text = text.replace(/\n{3,}/g, '\n\n'); // Replace multiple newlines with double newlines
    text = text.replace(/\:\s*\n/g, '\n'); // Remove hanging colons at end of lines
    text = text.replace(/\.\s*\.\s*\./g, '...'); // Fix ellipsis that might have been broken
    text = text.replace(/\s+\./g, '.'); // Fix spaces before periods
    text = text.replace(/\s+\,/g, ','); // Fix spaces before commas
    
    // Step 4: Handle source formatting
    // Check if the response begins with "Sources:" or similar headers
    const sourceHeaderRegex = /^(Sources:|Source:|References:|Reference:)[\s\S]*?\n\n/i;
    
    // If text starts with a sources header, move it to the end
    if (sourceHeaderRegex.test(text)) {
      // Extract the source section from the beginning
      const sourceMatch = text.match(sourceHeaderRegex);
      if (sourceMatch && sourceMatch[0]) {
        // Remove the source section from the beginning and add it to the end
        const sourceSection = sourceMatch[0];
        text = text.replace(sourceHeaderRegex, '');
        
        // Add the source section to the end with proper formatting
        text = `${text}\n\n---\n\n**Sources**\n\n${sourceSection.trim()}`;
      }
    }
    
    // For any remaining source indicators within the text
    const sourceIndicators = [
      "Source:",
      "Sources:",
      "Reference:",
      "References:",
      "http://",
      "https://"
    ];
    
    // Check if any source indicators are present in the middle of the text
    let hasSourceIndicator = false;
    let sourceIndex = -1;
    
    sourceIndicators.forEach(indicator => {
      const index = text.indexOf(indicator);
      if (index > 0 && (sourceIndex === -1 || index < sourceIndex)) {
        hasSourceIndicator = true;
        sourceIndex = index;
      }
    });
    
    if (hasSourceIndicator && sourceIndex > 0) {
      // Split the text at the source indicator
      const answerPart = text.substring(0, sourceIndex).trim();
      const sourcesPart = text.substring(sourceIndex).trim();
      
      // Recombine with proper formatting
      return `${answerPart}\n\n---\n\n**Sources**\n\n${sourcesPart}`;
    }
    
    return text.trim();
  }

  // Send a message
  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim()) return
    
    // Get the message text
    const messageText = message.trim()
    
    // Clear input field immediately for better UX
    setMessage("")
    
    // Send user message to chat
    socket.emit("sendMessage", { roomId, message: messageText, sender: username })
    
    // Get recent messages for context (last 5 messages)
    const recentMessages = messages.slice(-10)
    
    // Decide if AI should respond using LLM
    try {
      // Show a subtle indicator that we're evaluating 
      // (optional, only if you want users to know it's evaluating)
      setIsProcessing(true)
      
      const decisionResult = await shouldAIRespondLLM(messageText, recentMessages)
      
      // Log the decision for debugging
      console.log('AI response decision:', decisionResult)
      
      // Process with agent if LLM decides the AI should respond
      if (decisionResult.shouldRespond) {
        // If confidence is high, proceed immediately
        if (decisionResult.confidence > 70) {
          processWithAgent(messageText)
        } 
        // If medium confidence, add a small delay to appear more natural
        else {
          setTimeout(() => {
            processWithAgent(messageText)
          }, 1500)
        }
      } else {
        // Not responding, just reset processing state
        setIsProcessing(false)
      }
    } catch (error) {
      console.error("Error determining if AI should respond:", error)
      setIsProcessing(false)
    }
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
      
      // Add welcome message explaining how Cogni works
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          sender: 'System', 
          message: 'Cogni AI is actively monitoring this chat and will respond when help is needed.'
        }])
      }, 1000)
    })
    
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setMessages(prev => [...prev, { sender: 'System', message: 'Connection error: ' + error.message }])
    })

    // Listen for incoming messages and filter them if needed
    socket.on("receiveMessage", (data) => {
      console.log("Received message:", data)
      
      // Apply image filtering for Cogni messages immediately when received
      if (data.sender === "Cogni") {
        let filteredMessage = data.message;
        
        // Filter out image references
        const imageTerms = ['image', 'images', 'picture', 'pictures', 'photo', 'photos', 'illustration'];
        imageTerms.forEach(term => {
          const regex = new RegExp(`\\b${term}\\b`, 'gi');
          filteredMessage = filteredMessage.replace(regex, '');
        });
        
        // Clean up
        filteredMessage = filteredMessage.replace(/\s{2,}/g, ' ').trim();
        
        // Add the filtered message
        setMessages((prev) => [...prev, { ...data, message: filteredMessage }]);
      } else {
        // Non-Cogni messages don't need filtering
        setMessages((prev) => [...prev, data]);
      }
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
    
    // Apply final scrubbing to AI messages to ensure no image references
    let messageContent = msg.message;
    if (isAI) {
      // Last chance to remove any image references
      const imageTerms = ['image', 'images', 'picture', 'pictures', 'photo', 'photos', 'illustration'];
      
      // Case insensitive replacement of any image terms
      imageTerms.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        messageContent = messageContent.replace(regex, '');
      });
      
      // Clean up any artifacts from filtering
      messageContent = messageContent.replace(/\s{2,}/g, ' ').trim(); // Multiple spaces
      messageContent = messageContent.replace(/\s+\./g, '.'); // Space before period
      messageContent = messageContent.replace(/\s+\,/g, ','); // Space before comma
      messageContent = messageContent.replace(/\:\s*$/gm, ''); // Colon at end of line
    }
    
    return (
      <div 
        key={index} 
        className={`mb-4 ${isSystem ? 'text-center text-gray-500 text-sm' : 
          isAI ? 'flex flex-col w-full' : 'flex flex-row-reverse'}`}
      >
        {!isSystem && (
          <div className={`flex flex-col ${isAI ? 'w-full' : 'max-w-[75%] ml-auto'}`}>
            <div className="flex items-center mb-1">
              <Avatar className={`h-6 w-6 ${isAI ? 'mr-2' : 'ml-2 order-2'}`}>
                <AvatarFallback>{isAI ? 'C' : msg.sender[0]}</AvatarFallback>
              </Avatar>
              <span className={`text-sm ${isAI ? '' : 'order-1 mr-2'}`}>{msg.sender}</span>
            </div>
            <div className={`rounded-lg p-3 ${isAI ? 'bg-gray-700 text-white w-full' : 'bg-muted'} overflow-hidden`}>
              {isAI ? (
                <ReactMarkdown 
                  className="prose prose-sm prose-invert max-w-none"
                  components={{
                    pre: ({node, ...props}) => (
                      <pre {...props} className="p-2 rounded-md bg-gray-800 overflow-x-auto" />
                    ),
                    // Explicitly ignore images
                    img: () => null,
                    p: ({node, children, ...props}) => (
                      <p {...props} className="mb-2 last:mb-0">{children}</p>
                    ),
                    hr: ({node, ...props}) => (
                      <hr {...props} className="my-4 border-gray-600" />
                    ),
                    h3: ({node, children, ...props}) => (
                      <h3 {...props} className="text-lg font-semibold mb-2 mt-4 text-gray-300">{children}</h3>
                    ),
                    strong: ({node, children, ...props}) => (
                      <strong {...props} className="font-semibold text-gray-300">{children}</strong>
                    ),
                    code: ({node, inline, ...props}: {node?: any, inline?: boolean, [key: string]: any}) => (
                      inline ? 
                        <code {...props} className="px-1 py-0.5 rounded-sm bg-gray-800" /> :
                        <code {...props} className="block p-2 rounded-md bg-gray-800 overflow-x-auto" />
                    ),
                    a: ({node, ...props}) => (
                      <a 
                        {...props} 
                        className="text-blue-400 hover:text-blue-300 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    )
                  }}
                >
                  {messageContent}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap break-words">{messageContent}</p>
              )}
            </div>
          </div>
        )}
        
        {isSystem && <div className="w-full text-gray-500 italic">{messageContent}</div>}
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
          <h2 className="text-xl font-semibold text-center">Join a Chat Group</h2>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Collaboration Group ID"
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
              Join Chat
            </Button>
          </div>
        </Card>
      ) : (
        <div className="w-full max-w-4xl flex flex-col h-[80vh]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Group: {roomId}</h2>
            <Button 
              variant="outline" 
              onClick={() => {
                socket.disconnect()
                setJoined(false)
                setMessages([])
              }}
            >
              Leave Chat
            </Button>
          </div>
          
          <div 
            ref={messageBoxRef}
            className="flex-1 overflow-y-auto p-4 border rounded-lg mb-4"
          >
            {messages.map((msg, index) => renderMessage(msg, index))}
            {isProcessing && (
              <div className="flex items-center justify-center p-2">
                <div className="animate-pulse text-center">Cogni is thinking...</div>
              </div>
            )}
          </div>
          
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
              disabled={isProcessing}
            />
            <Button type="submit" disabled={isProcessing}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
      </div>
    </>
  )
}