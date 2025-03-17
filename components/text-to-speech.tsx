'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'
import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TextToSpeech({ text }: { text: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const speechSynthesis = useRef<SpeechSynthesis | null>(null)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.current = window.speechSynthesis
      setIsSpeechSupported(true)

      // Load available voices
      const loadVoices = () => {
        const availableVoices = speechSynthesis.current?.getVoices() || []
        setVoices(availableVoices)
        // Set Samantha as default voice, fallback to any English voice if not available
        const samanthaVoice = availableVoices.find(voice => voice.name.includes('Samantha'))
        const defaultVoice = samanthaVoice || availableVoices.find(voice => voice.lang.startsWith('en')) || availableVoices[0]
        setSelectedVoice(defaultVoice)
      }

      // Chrome loads voices asynchronously
      speechSynthesis.current.onvoiceschanged = loadVoices
      loadVoices()
    }
  }, [])

  useEffect(() => {
    if (speechSynthesis.current && text && selectedVoice) {
      utterance.current = new SpeechSynthesisUtterance(text)
      utterance.current.voice = selectedVoice
      utterance.current.rate = 1
      utterance.current.pitch = 1
      utterance.current.onend = () => setIsPlaying(false)
    }

    return () => {
      if (speechSynthesis.current) {
        speechSynthesis.current.cancel()
      }
    }
  }, [text, selectedVoice])

  const toggleSpeech = () => {
    if (!speechSynthesis.current || !utterance.current || !isSpeechSupported) return

    if (isPlaying) {
      speechSynthesis.current.cancel()
      setIsPlaying(false)
    } else {
      speechSynthesis.current.speak(utterance.current)
      setIsPlaying(true)
    }
  }

  const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const voice = voices.find(v => v.name === event.target.value)
    if (voice) setSelectedVoice(voice)
  }

  if (!isSpeechSupported) return null

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedVoice?.name}
        onChange={handleVoiceChange}
        className="text-sm rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
      >
        {voices.map(voice => (
          <option key={voice.name} value={voice.name}>
            {voice.name}
          </option>
        ))}
      </select>
      <Button
        onClick={toggleSpeech}
        variant="ghost"
        size="icon"
        className={cn(
          'rounded-full transition-colors',
          isPlaying && 'text-accent-foreground/80 bg-accent/50'
        )}
      >
        {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </Button>
    </div>
  )
}