'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { Label } from './ui/label'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

export function UserProfile() {
  const router = useRouter()
  const [userDetails, setUserDetails] = useState({
    username: '',
    email: '',
  })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Fetch user data from the database
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        // Get token from localStorage
        const token = localStorage.getItem('token')
        
        if (!token) {
          // Check if there's a user object that might contain the token
          const userStr = localStorage.getItem('user')
          if (userStr) {
            try {
              const user = JSON.parse(userStr)
              if (user.token) {
                // Use the token from the user object
                fetchWithToken(user.token)
                return
              }
            } catch (e) {
              console.error('Error parsing user data:', e)
            }
          }
          
          setError('Not authenticated. Please log in.')
          setLoading(false)
          return
        }

        fetchWithToken(token)
      } catch (err) {
        console.error('Error fetching user data:', err)
        setError('Failed to load user profile')
        setLoading(false)
      }
    }

    const fetchWithToken = async (token: string) => {
      try {
        console.log('Fetching with token:', token)
        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
    
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to fetch user data')
        }
    
        const data = await response.json()
        setUserDetails({
          username: data.user.username,
          email: data.user.email,
        })
        setLoading(false)
      } catch (err) {
        console.error('Error in fetchWithToken:', err)
        setError((err as Error).message || 'Failed to load user profile')
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // Define the handleInputChange function
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
      
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Not authenticated. Please log in.')
        return
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userDetails)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update profile')
      }

      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Failed to save profile:', err)
      setError((err as Error).message || 'Failed to update profile')
    }
  }

  // Add a logout function
  const handleLogout = () => {
    signOut({ callbackUrl: '/auth' })
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h2 className="text-2xl font-bold mb-6">User Profile</h2>
      
      {loading ? (
        <p className="text-center">Loading profile...</p>
      ) : error ? (
        <div className="text-red-500 mb-4">{error}</div>
      ) : (
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
                disabled // Email should typically not be changed easily
              />
            </div>

            <Button 
              className="w-full" 
              type="button"
              onClick={handleSaveChanges}
            >
              Save Changes
            </Button>
            
            {message && <p className="text-green-500 mt-2">{message}</p>}
            
            <Button 
              onClick={handleLogout}
              className="w-full mt-4"
              variant="destructive"
            >
              Logout
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}