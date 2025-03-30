import { useEffect, useState, useRef } from 'react'
import type { AI } from '@/app/action'
import { useUIState, useActions, useAIState } from 'ai/rsc'
import { cn } from '@/lib/utils'
import { UserMessage } from './user-message'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Plus, Square, Mic, ArrowRight } from 'lucide-react'

// Define SpeechRecognition interface
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  addEventListener(type: string, callback: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, callback: EventListenerOrEventListenerObject): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: { error: string }) => void;
}

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionResultItem;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResult[];
  resultIndex: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
import { MiniNetworkButton } from './mini-network-button'
import { EmptyScreen } from './empty-screen'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useUIState<typeof AI>()
  const [aiMessages, setAiMessages] = useAIState<typeof AI>()
  const { submit } = useActions<typeof AI>()
  const [isButtonPressed, setIsButtonPressed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const recognition = useRef<SpeechRecognition | null>(null)
  // Focus on input when button is pressed
  useEffect(() => {
    if (isButtonPressed) {
      inputRef.current?.focus()
      setIsButtonPressed(false)
    }
  }, [isButtonPressed])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Clear messages if button is pressed
    if (isButtonPressed) {
      handleClear()
      setIsButtonPressed(false)
    }

    // Add user message to UI state
    setMessages(currentMessages => [
      ...currentMessages,
      {
        id: Date.now(),
        isGenerating: false,
        component: <UserMessage message={input} />
      }
    ])

    // Submit and get response message
    const formData = new FormData(e.currentTarget)
    const responseMessage = await submit(formData)
    setMessages(currentMessages => [...currentMessages, responseMessage as any])

    setInput('')
  }

  // Store current messages in history and clear current conversation
  const handleClear = () => {
    // Store current messages in localStorage before clearing
    const existingHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]')
    if (messages.length > 0) {
      const newConversation = {
        id: Date.now(),
        messages: messages,
        timestamp: new Date().toLocaleString()
      }
      localStorage.setItem('chatHistory', JSON.stringify([newConversation, ...existingHistory]))
    }

    setIsButtonPressed(true)
    setMessages([])
    setAiMessages([])
    setInput('')
    setShowEmptyScreen(false)
  }

  useEffect(() => {
    // focus on input when the page loads
    inputRef.current?.focus()

    // Initialize speech recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognition.current = new SpeechRecognition()
      recognition.current.continuous = true
      recognition.current.interimResults = true

      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('')
        setInput(transcript)
      }

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
      }
    }

    return () => {
      recognition.current?.stop()
    }
  }, [])

  // If there are messages and the new button has not been pressed, display the new Button
  if (messages.length > 0 && !isButtonPressed) {
    return (
      <div className="fixed bottom-0 left-0 right-0 flex flex-col justify-center items-center mx-auto space-y-2 z-50 p-2">
        <form onSubmit={handleSubmit} className="max-w-2xl w-full px-6">
          <div className="relative flex items-center w-full">
            <Input
              ref={inputRef}
              type="text"
              name="input"
              placeholder="Ask a follow-up question..."
              value={input}
              className="pl-4 pr-24 h-12 rounded-full bg-muted text-sm sm:text-base"
              onChange={e => {
                setInput(e.target.value)
                setShowEmptyScreen(e.target.value.length === 0)
              }}
              onFocus={() => setShowEmptyScreen(true)}
              onBlur={() => setShowEmptyScreen(false)}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 sm:space-x-2">
              <Button
                type="button"
                variant={"ghost"}
                size={"icon"}
                className={cn(
                  "rounded-full h-8 w-8 sm:h-10 sm:w-10",
                  isRecording && "text-red-500"
                )}
                onClick={() => {
                  if (!recognition.current) {
                    alert('Speech recognition is not supported in your browser')
                    return
                  }
                  if (isRecording) {
                    recognition.current.stop()
                  } else {
                    recognition.current.start()
                  }
                  setIsRecording(!isRecording)
                }}
              >
                <Mic size={18} className="sm:w-5 sm:h-5" />
              </Button>
              <MiniNetworkButton
                disabled={input.length === 0}
              />
            </div>
          </div>
        </form>
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant={"secondary"}
            className="rounded-full bg-secondary/80 group transition-all hover:scale-105"
            onClick={() => handleClear()}
          >
            <span className="text-sm mr-2 group-hover:block hidden animate-in fade-in duration-300">
              New
            </span>
            <Plus size={18} className="group-hover:rotate-90 transition-all" />
          </Button>
          <Button
            type="button"
            variant={"secondary"}
            className={cn(
              "rounded-full bg-secondary/80 group transition-all hover:scale-105",
              isRecording && "animate-pulse bg-red-500/80"
            )}
            onClick={() => {
              if (!recognition.current) {
                alert('Speech recognition is not supported in your browser')
                return
              }
              if (isRecording) {
                recognition.current.stop()
              } else {
                recognition.current.start()
              }
              setIsRecording(!isRecording)
            }}
          >
            <Mic size={18} className={cn("transition-all", isRecording && "text-white")} />
          </Button>
        </div>
      </div>
    )
  }

  // Condition 1 and 3: If there are no messages or the button is pressed, display the form
  const formPositionClass = messages.length === 0
    ? 'fixed bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-4 mx-auto'
    : 'fixed bottom-4 left-4 right-4 md:left-6 md:right-6'

  return (
    <div className={`${formPositionClass} z-50`}>
      <form onSubmit={handleSubmit} className="w-full max-w-2xl px-4 sm:px-6">
        <div className="relative flex items-center w-full">
          <Input
            ref={inputRef}
            type="text"
            name="input"
            placeholder="Ask Cogni anything..."
            value={input}
            className="pl-4 pr-24 h-12 rounded-full bg-muted text-sm sm:text-base"
            onChange={e => {
              setInput(e.target.value)
              setShowEmptyScreen(e.target.value.length === 0)
            }}
            onFocus={() => setShowEmptyScreen(true)}
            onBlur={() => setShowEmptyScreen(false)}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 sm:space-x-2">
            <Button
              type="button"
              variant={"ghost"}
              size={"icon"}
              className={cn(
                "rounded-full h-8 w-8 sm:h-10 sm:w-10",
                isRecording && "text-red-500"
              )}
              onClick={() => {
                if (!recognition.current) {
                  alert('Speech recognition is not supported in your browser')
                  return
                }
                if (isRecording) {
                  recognition.current.stop()
                } else {
                  recognition.current.start()
                }
                setIsRecording(!isRecording)
              }}
            >
              <Mic size={18} className="sm:w-5 sm:h-5" />
            </Button>
            <Button
              type="submit"
              size={"icon"}
              variant={"ghost"}
              disabled={input.length === 0}
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <ArrowRight size={18} className="sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
        <EmptyScreen
          submitMessage={message => {
            setInput(message)
          }}
          className={cn(showEmptyScreen ? 'visible' : 'invisible')}
        />
      </form>
    </div>
  )
}