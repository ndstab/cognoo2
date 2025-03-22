'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BackgroundAnimation } from '@/components/background-animation'

export default function Page() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
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
    } catch (err) {
      console.error("Authentication error:", err)
      setError("Failed to verify authentication")
    }
  }, [router, session, status])

  // Show error if there is one
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  // Show loading state while checking authentication
  if (status === 'loading' || isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    )
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
