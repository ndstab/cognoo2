'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BackgroundAnimation } from '@/components/background-animation'

export const runtime = 'edge'

export default function Page() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Check authentication status
    if (status === 'loading') {
      // Still checking
      return
    }
    
    if (!session) {
      router.push('/auth')
    } else {
      setIsAuthenticated(true)
    }
  }, [router, session, status])

  // Show nothing while checking authentication
  if (status === 'loading' || isAuthenticated === null) {
    return null
  }

  return (
    <>
      <BackgroundAnimation />
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold">Welcome to Cogni</h1>
      </div>
    </>
  )
}
