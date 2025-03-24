'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Search, Plus, MessageSquare, X } from 'lucide-react'

interface Collaboration {
  id: string
  username: string
  lastMessage: string
  timestamp: string
}

interface User {
  id: string
  username: string
  email: string
}

export function CollaborationScreen() {
  const [searchTerm, setSearchTerm] = useState('')
  const [collaborations, setCollaborations] = useState<Collaboration[]>([
    // Dummy data for now
    {
      id: '1',
      username: 'John Doe',
      lastMessage: 'Hey, how are you?',
      timestamp: '2:30 PM'
    },
    {
      id: '2',
      username: 'Jane Smith',
      lastMessage: 'Great idea!',
      timestamp: '1:45 PM'
    }
  ])
  const [showCreateCollab, setShowCreateCollab] = useState(false)
  const [collabName, setCollabName] = useState('')
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const searchUsers = async () => {
    if (!userSearchTerm.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/users/search?username=${encodeURIComponent(userSearchTerm)}`)
      
      if (!response.ok) {
        throw new Error('Failed to search users')
      }
      
      const data = await response.json()
      setSearchResults(data.users)
    } catch (err) {
      console.error('Error searching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      if (prev.find(u => u.id === user.id)) {
        return prev.filter(u => u.id !== user.id)
      }
      // Clear search field and results when adding a user
      setUserSearchTerm('')
      setSearchResults([])
      return [...prev, user]
    })
  }

  const createCollaboration = () => {
    if (!collabName.trim() || selectedUsers.length === 0) return
    
    // Here you would make an API call to create the collaboration
    console.log('Creating collaboration:', {
      name: collabName,
      users: selectedUsers
    })
    
    // Reset the form
    setCollabName('')
    setSelectedUsers([])
    setShowCreateCollab(false)
  }

  return (
    <div className="fixed left-16 right-0 top-0 bottom-0 flex">
      {/* Left Sidebar - Collaborations List */}
      <div className="w-1/3 border-r bg-background">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold">Collaborate</h1>
        </div>
        
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search collaborations"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-8rem)]">
          {collaborations.map((collab) => (
            <div
              key={collab.id}
              className="flex items-center p-4 hover:bg-muted cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-3">
                <MessageSquare size={20} className="text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h3 className="font-medium">{collab.username}</h3>
                  <span className="text-xs text-muted-foreground">{collab.timestamp}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{collab.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Chat Interface or Create Collaboration */}
      <div className="flex-1 flex flex-col">
        {showCreateCollab ? (
          <div className="flex-1 flex flex-col p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Create New Collaboration</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateCollab(false)}>
                <X size={20} />
              </Button>
            </div>

            <div className="mb-4">
              <Input
                placeholder="Enter collaboration name"
                value={collabName}
                onChange={(e) => setCollabName(e.target.value)}
                className="mb-4"
              />
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Search users to add"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                  className="pl-9"
                />
              </div>

              {loading && <p className="text-sm text-muted-foreground mt-2">Searching...</p>}
              
              <div className="mt-4 space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                      selectedUsers.find(u => u.id === user.id)
                        ? 'bg-primary/10'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleUserSelection(user)}
                  >
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    {selectedUsers.find(u => u.id === user.id) && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <X size={12} className="text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedUsers.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Selected Users:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-sm"
                      >
                        <span>{user.username}</span>
                        <button
                          onClick={() => toggleUserSelection(user)}
                          className="hover:text-destructive"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto flex justify-end">
              <Button
                onClick={createCollaboration}
                disabled={!collabName.trim() || selectedUsers.length === 0}
              >
                Create Collaboration
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Select a collaboration</h2>
              <Button onClick={() => setShowCreateCollab(true)}>
                <Plus size={16} className="mr-2" />
                Add Collaboration
              </Button>
            </div>

            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a collaboration from the list to start chatting
            </div>
          </>
        )}
      </div>
    </div>
  )
} 