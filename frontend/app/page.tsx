'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BackgroundAnimation } from '@/components/background-animation'
import { Chat } from '@/components/chat'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

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
      <div className="container mx-auto">
        <div className="flex justify-between items-start">
          <div className="flex-1" /> {/* Spacer */}
          <div className="flex flex-col items-center">
            <a href="/">
              <Image 
                src="/cogni-logo.png" 
                alt="Cogni Logo"
                width={80}
                height={80}
                className="h-16 md:h-20 w-auto"
                priority
              />
            </a>
          </div>
          <div className="flex-1 flex justify-end mt-8">
            <Button 
              variant="outline" 
              onClick={() => router.push('/collaborate')}
              className="rounded-full w-10 h-10 p-0 flex items-center justify-center 
                         sm:w-auto sm:h-auto sm:rounded-md sm:px-4 sm:py-2 
                         bg-gradient-to-r from-green-300 to-teal-400 border-none 
                         hover:from-green-400 hover:to-teal-500 transition-all duration-300 
                         text-zinc-900 font-medium hover:text-white"
            >
              <span className="sm:hidden text-lg font-bold">C</span> {/* Show 'C' on small screens */}
              <span className="hidden sm:block">Collaborate</span> {/* Show 'Collaborate' on larger screens */}
            </Button>
          </div>
        </div>
        <Chat />
      </div>
    </>
  )
}
