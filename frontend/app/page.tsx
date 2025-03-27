'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BackgroundAnimation } from '@/components/background-animation'
import { Chat } from '@/components/chat'

export default function Page() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      console.log('Auth check - Session status:', status)
      
      // Check authentication status
      if (status === 'loading') {
        // Still checking session status
        console.log('Session still loading...')
        return
      }
      
      // First check if we have an active session
      if (session) {
        console.log('Active session found:', session)
        setIsAuthenticated(true)
        return
      }
      
      console.log('No active session, checking localStorage...')
      
      // If no session, check localStorage for token as fallback
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      
      console.log('localStorage token exists:', !!token)
      console.log('localStorage user exists:', !!userStr)
      
      if (token && userStr) {
        // We have saved authentication data
        console.log('Using localStorage auth data')
        setIsAuthenticated(true)
        return
      }
      
      // No valid authentication found, redirect to auth page
      console.log('No authentication found, redirecting to auth page')
      router.replace('/auth')
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
      <div className="container mx-auto py-6">
        <Chat />
      </div>
    </>
  )
}
