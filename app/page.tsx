'use client'

import { Chat } from '@/components/chat'
import { BackgroundAnimation } from '@/components/background-animation'

export const runtime = 'edge'

export default function Page() {
  return (
    <>
      <BackgroundAnimation />
      <Chat />
    </>
  )
}
