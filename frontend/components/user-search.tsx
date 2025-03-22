'use client'

import { useState, useEffect } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface User {
  id: string
  username: string
  email: string
}

export function UserSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const searchUsers = async () => {
    if (!searchTerm.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/users/search?username=${encodeURIComponent(searchTerm)}`)
      
      if (!response.ok) {
        throw new Error('Failed to search users')
      }
      
      const data = await response.json()
      setUsers(data.users)
    } catch (err) {
      console.error('Error searching users:', err)
      setError('Failed to search users. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const sendCollaborationRequest = async (userId: string) => {
    try {
      // This would be implemented in a future feature
      console.log('Sending collaboration request to user:', userId)
      // Here you would make an API call to send the request
    } catch (err) {
      console.error('Error sending collaboration request:', err)
    }
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Find Collaborators</h2>
      
      <div className="flex space-x-2 mb-4">
        <Input
          placeholder="Search by username"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
          className="flex-1"
        />
        <Button onClick={searchUsers} disabled={loading}>
          <Search size={16} className="mr-2" />
          Search
        </Button>
      </div>
      
      {loading && <p className="text-sm text-muted-foreground">Searching...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <div className="space-y-2 mt-4">
        {users.length === 0 && !loading && searchTerm && (
          <p className="text-sm text-muted-foreground">No users found</p>
        )}
        
        {users.map((user) => (
          <div 
            key={user.id} 
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted"
          >
            <div>
              <p className="font-medium">{user.username}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => sendCollaborationRequest(user.id)}
              title="Send collaboration request"
            >
              <UserPlus size={16} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}