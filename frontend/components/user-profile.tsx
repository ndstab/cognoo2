'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { Label } from './ui/label'
import { signOut, useSession } from 'next-auth/react'

export function UserProfile() {
  const { data: session, status } = useSession()

  const [userDetails, setUserDetails] = useState({
    username: '',
    email: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setUserDetails({
        username: session.user.name ?? '',
        email: session.user.email ?? '',
      })
      setError('')
    } else if (status === 'unauthenticated') {
      setError('Not authenticated. Please log in.')
    }
    setMessage('')
  }, [session, status])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUserDetails(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSaveChanges = async () => {
    try {
      setMessage('')
      setError('')
      
      if (status !== 'authenticated' || !session?.user?.id) {
        setError('Not authenticated. Please log in.')
        return
      }

      const payload = {
        username: userDetails.username
      }

      console.warn("Attempting to save profile. Ensure the '/api/users/profile' PUT endpoint uses NextAuth session for authentication.")

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update profile and parse error response.' }))
        throw new Error(errorData.message || 'Failed to update profile')
      }

      setMessage('Profile update attempted. Verify backend implementation.')
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      console.error('Failed to save profile:', err)
      setError((err as Error).message || 'Failed to update profile')
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/auth' })
  }

  if (status === 'loading') {
    return <div className="p-6 text-center"><p>Loading session...</p></div>
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h2 className="text-2xl font-bold mb-6">User Profile</h2>
      
      {status === 'unauthenticated' || error ? (
        <div className="text-red-500 mb-4">{error || 'Please log in to view your profile.'}</div>
      ) : status === 'authenticated' ? (
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value={userDetails.username}
                onChange={handleInputChange}
                placeholder="Enter your username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={userDetails.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                disabled
              />
            </div>

            <Button 
              className="w-full" 
              type="button"
              onClick={handleSaveChanges}
              disabled={status !== 'authenticated'}
            >
              Save Changes
            </Button>
            
            {message && <p className="text-green-500 mt-2">{message}</p>}
            
            <Button 
              onClick={handleLogout}
              className="w-full mt-4"
              variant="destructive"
              disabled={status !== 'authenticated'}
            >
              Logout
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  )
}