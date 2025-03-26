'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from './ui/input'
import { Search, Plus, MessageSquare, X, Send } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { jwtDecode } from 'jwt-decode'
import io, { Socket } from 'socket.io-client'
import { Avatar, AvatarFallback } from './ui/avatar'
import ReactMarkdown from 'react-markdown'
import { useRouter } from 'next/router'

interface Collaboration {
  _id: string
  name: string
  creator: {
    _id: string
    username: string
    email: string
  }
  members: Array<{
    _id: string
    username: string
    email: string
  }>
  lastMessage?: {
    content: string
    sender: {
      _id: string
      username: string
    }
    timestamp: string
  }
  updatedAt: string
}

interface User {
  id: string
  username: string
  email: string
}

interface Message {
  sender: string;
  userId?: string;
  message: string;
  timestamp?: string;
  isAI?: boolean;
}

interface DecodedToken {
  userId: string
  username: string
  email: string
  iat: number
  exp: number
}

// Socket server URL - pointing to backend socket server
const SOCKET_SERVER_URL = "http://localhost:3001";

// Initialize socket connection outside component to match page.tsx pattern
const socket = io(SOCKET_SERVER_URL, {
  withCredentials: false,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

export function CollaborationScreen() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [showCreateCollab, setShowCreateCollab] = useState(false)
  const [collabName, setCollabName] = useState('')
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCollab, setSelectedCollab] = useState<Collaboration | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [username, setUsername] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [connectedUsers, setConnectedUsers] = useState<Array<{userId: string, username: string}>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize socket connection if not already set
  useEffect(() => {
    if (socket) return; // Already have a socket
    
    // Check for token and set username/userId first
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        setUsername(decoded.username);
        setCurrentUserId(decoded.userId);
        console.log('Setting user information from token:', decoded.username, decoded.userId);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
    
    console.log("Socket initialized with ID:", socket.id);
    
    socket.on('disconnect', (reason) => {
      console.error(`Socket disconnected: ${reason}`);
      setMessages(prev => [...prev, { 
        sender: 'System', 
        message: `Disconnected: ${reason}. Attempting to reconnect...` 
      }]);
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      setMessages(prev => [...prev, { 
        sender: 'System', 
        message: `Reconnected to chat server` 
      }]);
      
      // Rejoin the room after reconnecting
      if (selectedCollab) {
        console.log(`Rejoining room ${selectedCollab._id} after reconnection`);
        socket.emit('join_room', selectedCollab._id, username, currentUserId);
      }
    });
    
    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      setMessages(prev => [...prev, { 
        sender: 'System', 
        message: 'Failed to reconnect. Please refresh the page.' 
      }]);
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    // Debug connection
    socket.on('connect', () => {
      console.log('Connected to socket server!', socket.id);
      setMessages(prev => [...prev, { 
        sender: 'System', 
        message: 'Connected to chat server' 
      }]);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setMessages(prev => [...prev, { 
        sender: 'System', 
        message: 'Connection error: ' + error.message 
      }]);
    });

    // Listen for incoming messages - backend uses receive_message
    socket.on("receive_message", (data) => {
      console.log("⭐ Received message:", data);
      
      if (!data || !data.message) {
        console.error("Invalid message data received:", data);
        return;
      }
      
      // Make sure we have the format we expect
      const messageToAdd = {
        sender: data.sender || 'Unknown',
        userId: data.userId || '',
        message: data.message || '',
        timestamp: data.timestamp || new Date().toISOString(),
      };
      
      // Update messages list
      setMessages((prev) => {
        console.log("Adding received message to chat:", messageToAdd);
        return [...prev, messageToAdd];
      });
    });

    // Events for user joined/left - backend uses user_joined and user_left
    socket.on("user_joined", (data) => {
      if (typeof data === 'string') {
        setMessages((prev) => [...prev, { sender: "System", message: data }]);
      } else if (data && data.username) {
        setMessages((prev) => [...prev, { 
          sender: "System", 
          message: `${data.username} has joined the room` 
        }]);

        // Update users list if provided
        if (data.users) {
          setConnectedUsers(data.users.map((user: any) => ({
            userId: typeof user === 'string' ? user : user.id || user._id || '',
            username: typeof user === 'string' ? user : user.username || 'Unknown'
          })));
        }
      }
    });

    socket.on("user_left", (data) => {
      if (typeof data === 'string') {
        setMessages((prev) => [...prev, { sender: "System", message: data }]);
      } else if (data && data.username) {
        setMessages((prev) => [...prev, { 
          sender: "System", 
          message: `${data.username} has left the room` 
        }]);
        
        // Update users list if provided
        if (data.users) {
          setConnectedUsers(data.users.map((user: any) => ({
            userId: typeof user === 'string' ? user : user.id || user._id || '',
            username: typeof user === 'string' ? user : user.username || 'Unknown'
          })));
        }
      }
    });

    return () => {
      if (socket) {
        socket.off("connect");
        socket.off("connect_error");
        socket.off("receive_message");
        socket.off("user_joined");
        socket.off("user_left");
      }
    };
  }, [socket]);

  // Debug user information
  useEffect(() => {
    console.log('Current user information updated:', { username, userId: currentUserId });
  }, [username, currentUserId]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join collaboration room when selecting a collaboration
  useEffect(() => {
    if (!selectedCollab || !socket) return;
    if (!username || !currentUserId) {
      console.warn('User info not loaded yet, will try again when available');
      return;
    }
    
    // Using collaboration ID as room ID
    const roomId = selectedCollab._id;
    console.log('Joining room with ID:', roomId, 'as user:', username);
    
    // Join the room - simplified to match page.tsx approach
    socket.emit("join_room", roomId, username, currentUserId);
    
    // Clear previous messages and add system message
    setMessages([{ 
      sender: 'System', 
      message: `Joined collaboration: ${selectedCollab.name}` 
    }]);
    
    // Leave room when component unmounts or selection changes
    return () => {
      console.log('Leaving room:', roomId);
      socket.emit('leave_room');
    };
  }, [selectedCollab, socket, username, currentUserId]);

  // Fetch collaborations on component mount
  useEffect(() => {
    fetchCollaborations();
  }, []);

  // Fetch user data from profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // First try to extract from token
        try {
          const decoded = jwtDecode<DecodedToken>(token);
          setUsername(decoded.username || '');
          setCurrentUserId(decoded.userId || '');
          console.log('Extracted from token:', decoded.username, decoded.userId);
        } catch (error) {
          console.error('Error decoding token:', error);
        }
        
        // Also fetch from profile API to ensure we have the latest data
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('User profile data:', userData);
          
          if (userData.username && !username) {
            setUsername(userData.username);
          }
          
          if (userData._id && !currentUserId) {
            setCurrentUserId(userData._id);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchCollaborations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view collaborations');
        return;
      }

      const response = await fetch('/api/collaborations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch collaborations');
      }

      const data = await response.json();
      setCollaborations(data);
    } catch (err: any) {
      console.error('Error fetching collaborations:', err);
      setError(err.message || 'Failed to load collaborations');
    }
  };

  const sendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedCollab || !socket) {
      console.error("Cannot send message: missing message, collaboration, or socket");
      return;
    }
    
    // Simply get the roomId from selected collaboration
    const roomId = selectedCollab._id;
    
    // Create message data matching the format in page.tsx
    const messageData = { 
      roomId, 
      message: messageText.trim(), 
      sender: username, 
      userId: currentUserId 
    };
    
    console.log('Sending message with data:', messageData);
    
    // Send to server - using same pattern as page.tsx
    socket.emit('send_message', messageData);
    
    // Clear input field
    setMessageText('');
  };

  const searchUsers = async () => {
    if (!userSearchTerm.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to search users');
        return;
      }

      const response = await fetch(`/api/users/search?username=${encodeURIComponent(userSearchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to search users');
      }
      
      const data = await response.json();
      
      // Filter out the current user from search results
      const decoded = jwtDecode<DecodedToken>(token);
      const filteredUsers = data.users.filter((user: User) => 
        user.id !== decoded.userId
      );
      
      setSearchResults(filteredUsers);
    } catch (err: any) {
      console.error('Error searching users:', err);
      setError(err.message || 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      if (prev.find(u => u.id === user.id)) {
        return prev.filter(u => u.id !== user.id);
      }
      // Clear search field and results when adding a user
      setUserSearchTerm('');
      setSearchResults([]);
      return [...prev, user];
    });
  };

  const createCollaboration = async () => {
    if (!collabName.trim() || selectedUsers.length === 0) return;
    
    try {
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to create a collaboration');
        return;
      }

      const response = await fetch('/api/collaborations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: collabName,
          members: selectedUsers.map(user => user.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create collaboration');
      }

      setCollaborations(prev => [data, ...prev]);
      
      // Reset the form
      setCollabName('');
      setSelectedUsers([]);
      setShowCreateCollab(false);
      
      // Select the newly created collaboration
      setSelectedCollab(data);
    } catch (err: any) {
      console.error('Error creating collaboration:', err);
      setError(err.message || 'Failed to create collaboration');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  const handleCollabSelect = (collab: Collaboration) => {
    setSelectedCollab(collab);
    setShowCreateCollab(false);
  };

  // Function to render message with markdown for certain messages
  const renderMessage = (msg: Message, index: number) => {
    const isSystem = msg.sender === "System";
    
    // Improve the check for current user's messages
    const isCurrentUser = msg.userId === currentUserId || 
                         (!msg.userId && msg.sender === username);
    
    console.log('Message render info:', {
      msgSender: msg.sender,
      msgUserId: msg.userId,
      currentUserId,
      username,
      isCurrentUser
    });
    
    const isAI = msg.isAI || msg.sender === "Cogni";
    
    return (
      <div 
        key={index} 
        className={`mb-4 ${isSystem ? 'text-center text-gray-500 text-sm' : 
          isCurrentUser ? 'flex flex-row-reverse' : 'flex flex-row'}`}
      >
        {!isSystem && (
          <div className={`flex flex-col max-w-[75%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-center mb-1 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <Avatar className={`h-6 w-6 ${isCurrentUser ? 'ml-2' : 'mr-2'}`}>
                <AvatarFallback>{msg.sender && typeof msg.sender === 'string' ? msg.sender[0] : '?'}</AvatarFallback>
              </Avatar>
              <span className={`text-sm ${isCurrentUser ? 'mr-2' : 'ml-2'}`}>{msg.sender || 'Unknown'}</span>
            </div>
            <div className={`rounded-lg p-3 ${
              isCurrentUser 
                ? 'bg-primary text-primary-foreground' 
                : isAI ? 'bg-gray-700 text-white' : 'bg-muted'
            }`}>
              {isAI ? (
                <ReactMarkdown className="prose prose-sm prose-invert max-w-none">
                  {msg.message || ''}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.message || ''}</p>
              )}
            </div>
            {msg.timestamp && (
              <span className="text-xs text-muted-foreground mt-1">
                {formatTimestamp(msg.timestamp)}
              </span>
            )}
          </div>
        )}
        
        {isSystem && <div className="w-full text-muted-foreground italic">{msg.message || ''}</div>}
      </div>
    );
  };

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
          {error && (
            <div className="p-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg mx-4">
              {error}
            </div>
          )}
          
          {collaborations.length === 0 && !error && (
            <div className="p-4 text-sm text-muted-foreground">
              No collaborations yet. Create one to get started!
            </div>
          )}
          
          {collaborations.map((collab) => (
            <div
              key={collab._id}
              className={`flex items-center p-4 hover:bg-muted cursor-pointer ${
                selectedCollab?._id === collab._id ? 'bg-muted' : ''
              }`}
              onClick={() => handleCollabSelect(collab)}
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-3">
                <MessageSquare size={20} className="text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h3 className="font-medium">{collab.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(collab.updatedAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {collab.lastMessage ? (
                    <span>
                      <span className="font-medium">
                        {collab.lastMessage.sender?.username || 'Unknown'}:{' '}
                      </span>
                      {collab.lastMessage.content}
                    </span>
                  ) : (
                    `${collab.members.length} members`
                  )}
                </p>
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
                          onClick={(e) => { e.preventDefault(); toggleUserSelection(user); }}
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
        ) : selectedCollab ? (
          <div className="flex-1 flex flex-col h-full">
            {/* Chat header */}
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">{selectedCollab.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedCollab.members.map(member => member.username).join(', ')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedCollab(null)}>
                  Close
                </Button>
              </div>
            </div>
            
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => renderMessage(message, index))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            {/* Message input */}
            <div className="p-4 border-t">
              <form 
                onSubmit={sendMessage}
                className="flex items-center gap-2"
              >
                <Input
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!messageText.trim()}>
                  <Send size={16} className="mr-2" />
                  Send
                </Button>
              </form>
              {error && (
                <div className="mt-2 text-sm text-red-500">
                  {error}
                </div>
              )}
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