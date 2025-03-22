'use client'

import { useEffect, useState } from 'react'
import { Chat } from '@/components/chat'
import { BackgroundAnimation } from '@/components/background-animation'
import { useRouter } from 'next/navigation'

export const runtime = 'edge'

export default function Page() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/auth')
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  // Show nothing while checking authentication
  if (isAuthenticated === null) {
    return null
  }

  return (
    <>
      <BackgroundAnimation />
      <Chat />
    </>
  )
}
