'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from './ui/input'
import { Search, Plus, MessageSquare, X, Send } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { jwtDecode } from 'jwt-decode'
import { io, Socket } from 'socket.io-client'
import { Avatar, AvatarFallback } from './ui/avatar'
import ReactMarkdown from 'react-markdown'

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
// const SOCKET_SERVER_URL = "https://cogniwebsocket.centralindia.cloudapp.azure.com";
const SOCKET_SERVER_URL = "https://localhost:3001";

// Create a single socket instance outside the component
let socketInstance: Socket | null = null;

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
  const socketRef = useRef<Socket | null>(null)
  const [socketConnected, setSocketConnected] = useState(false)

  // Initialize socket connection on component mount
  useEffect(() => {
    // Create socket connection if it doesn't exist
    if (!socketInstance) {
      console.log("Creating new socket connection to:", SOCKET_SERVER_URL);
      socketInstance = io(SOCKET_SERVER_URL, {
        withCredentials: false,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
    }
    
    socketRef.current = socketInstance;
    console.log("Socket reference set:", socketInstance.id);
    
    return () => {
      // Don't disconnect the socket on component unmount
      // This prevents losing connection when navigating between pages
      console.log("Component unmounting, keeping socket alive");
    };
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socketRef.current) {
      console.error("No socket reference available");
      return;
    }
    
    const socket = socketRef.current;
    
    // Debug connection
    socket.on('connect', () => {
      console.log('Connected to socket server:', socket.id);
      setSocketConnected(true);
      setMessages(prev => [...prev, { 
        sender: 'System', 
        message: 'Connected to chat server' 
      }]);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setSocketConnected(false);
      setMessages(prev => [...prev, { 
        sender: 'System', 
        message: 'Connection error: ' + error.message 
      }]);
    });
    
    socket.on('disconnect', (reason: string) => {
      console.error(`Socket disconnected: ${reason}`);
      setSocketConnected(false);
      setMessages(prev => [...prev, { 
        sender: 'System', 
        message: `Disconnected: ${reason}. Attempting to reconnect...` 
      }]);
    });
    
    socket.on('reconnect', (attemptNumber: number) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      setSocketConnected(true);
      setMessages(prev => [...prev, { 
        sender: 'System', 
        message: `Reconnected to chat server` 
      }]);
      
      // Rejoin the room after reconnecting
      if (selectedCollab) {
        console.log(`Rejoining room ${selectedCollab._id} after reconnection`);
        socket.emit('joinRoom', selectedCollab._id, username);
      }
    });
    
    // Clear existing event listeners to prevent duplicates
    socket.off('receiveMessage');
    socket.off('userJoined');
    socket.off('userLeft');
    
    // Listen for incoming messages with better error handling
    socket.on("receiveMessage", (data) => {
      console.log("⭐ Received message:", data);
      
      try {
        // Log more info for debugging
        console.log("Current messages state:", messages);
        
        if (!data) {
          console.error("Received null or undefined message data");
          return;
        }
        
        if (typeof data.message === 'undefined') {
          console.error("Invalid message data received - missing message content:", data);
          return;
        }
        
        // Ensure we have a consistent message format
        const messageToAdd = {
          sender: data.sender || 'Unknown',
          userId: data.userId || '',
          message: data.message || '',
          timestamp: data.timestamp || new Date().toISOString(),
          isAI: data.isAI || data.sender === 'Cogni'
        };
        
        console.log("Adding formatted message to chat:", messageToAdd);
        
        // Update messages list with immutable pattern to ensure React sees the change
        setMessages(prevMessages => {
          const newMessages = [...prevMessages, messageToAdd];
          console.log("New messages state:", newMessages);
          return newMessages;
        });
      } catch (err) {
        console.error("Error processing received message:", err);
      }
    });

    // Events for user joined/left
    socket.on("userJoined", (msg) => {
      console.log("User joined event:", msg);
      setMessages(prevMessages => [...prevMessages, { 
        sender: "System", 
        message: msg 
      }]);
    });

    socket.on("userLeft", (msg) => {
      console.log("User left event:", msg);
      setMessages(prevMessages => [...prevMessages, { 
        sender: "System", 
        message: msg 
      }]);
    });

    // Check connection status - if not connected, try to connect
    if (!socket.connected) {
      console.log("Socket not connected, attempting to connect...");
      socket.connect();
    } else {
      console.log("Socket already connected:", socket.id);
      setSocketConnected(true);
    }

    return () => {
      // Clean up event listeners to prevent duplicates on re-render
      socket.off("receiveMessage");
      socket.off("userJoined");
      socket.off("userLeft");
    };
  }, [selectedCollab]); // Re-initialize listeners when selected collaboration changes

  // Join collaboration room when selecting a collaboration
  useEffect(() => {
    if (!selectedCollab || !socketRef.current) return;
    
    if (!socketConnected) {
      console.warn("Socket not connected, can't join room yet");
      return;
    }
    
    // Reset messages when switching collaborations
    setMessages([]);
    
    // Create a function to join the room that can be retried
    const joinRoom = () => {
      if (!username) {
        console.warn('Username not loaded yet, will retry in 1 second');
        
        // Add system message indicating we're waiting for user info
        setMessages([{ 
          sender: 'System', 
          message: `Attempting to join collaboration: ${selectedCollab.name}. Waiting for user information...` 
        }]);
        
        // Retry after 1 second
        setTimeout(joinRoom, 1000);
        return;
      }
      
      const socket = socketRef.current;
      if (!socket) return;
      
      // User info is now available, proceed with joining
      console.log('User info ready, joining room:', { username });
      
      // Using collaboration ID as room ID
      const roomId = selectedCollab._id;
      console.log('Joining room with ID:', roomId, 'as user:', username);
      
      // Join the room using the format from page.tsx - with explicit event name
      socket.emit("joinRoom", roomId, username);
      console.log(`Emitted joinRoom event with roomId: ${roomId}, username: ${username}`);
      
      // Start with a welcome message
      setMessages([{ 
        sender: 'System', 
        message: `Joined collaboration: ${selectedCollab.name}` 
      }]);
    };
    
    // Start the join process
    joinRoom();
    
    // Leave room when component unmounts or selection changes
    return () => {
      if (socketRef.current) {
        const roomId = selectedCollab._id;
        console.log(`Leaving room: ${roomId}`);
        socketRef.current.emit('leaveRoom'); // Make sure this matches server's expected event
      }
    };
  }, [selectedCollab, username, socketConnected]);

  // Debug user information
  useEffect(() => {
    console.log('Current user information updated:', { username, userId: currentUserId });
  }, [username, currentUserId]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
    console.log("Messages updated, scrolling to bottom. Current messages:", messages);
  }, [messages]);

  // Fetch collaborations on component mount
  useEffect(() => {
    fetchCollaborations();
  }, []);

  // Fetch user data from profile as soon as component mounts
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          setMessages(prev => [...prev, { 
            sender: 'System', 
            message: 'Error: Missing authentication token. Please log in again.'
          }]);
          return;
        }
        
        // First try to extract from token
        try {
          const decoded = jwtDecode<DecodedToken>(token);
          console.log('Token decoded successfully:', decoded);
          
          if (decoded.username) {
            setUsername(decoded.username);
            console.log('Username set from token:', decoded.username);
          }
          
          if (decoded.userId) {
            setCurrentUserId(decoded.userId);
            console.log('User ID set from token:', decoded.userId);
          }
        } catch (error) {
          console.error('Error decoding token:', error);
        }
        
        // Also fetch from profile API to ensure we have the latest data
        console.log('Fetching user profile from API...');
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('User profile data received:', userData);
          
          if (userData.username) {
            setUsername(userData.username);
            console.log('Username updated from API:', userData.username);
          }
          
          if (userData._id) {
            setCurrentUserId(userData._id);
            console.log('User ID updated from API:', userData._id);
          }
        } else {
          console.error('Failed to fetch user profile, status:', response.status);
          const errorData = await response.text();
          console.error('Error response:', errorData);
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
    if (!messageText.trim() || !selectedCollab || !socketRef.current) {
      console.error("Cannot send message: missing message, collaboration, or socket");
      return;
    }
    
    const socket = socketRef.current;
    
    // Simply get the roomId from selected collaboration
    const roomId = selectedCollab._id;
    
    // Create message data matching the format in page.tsx
    const messageData = { 
      roomId, 
      message: messageText.trim(), 
      sender: username 
    };
    
    console.log('Sending message with data:', messageData);
    
    // Send to server - with explicit event name
    socket.emit('sendMessage', messageData);
    console.log('Emitted sendMessage event with data:', messageData);
    
    // Add the message locally unless we're receiving all sent messages back
    // In some cases, servers broadcast to all clients including sender, in which case we DON'T need this
    // Uncomment if messages are not showing up from the server broadcast
    /*
    const localMessage = {
      sender: username,
      message: messageText.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, localMessage]);
    */
    
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
    console.log(`Rendering message ${index}:`, msg);
    
    const isSystem = msg.sender === "System";
    const isAI = msg.sender === "Cogni";
    
    return (
      <div 
        key={index} 
        className={`mb-4 ${isSystem ? 'text-center text-gray-500 text-sm' : 
          isAI ? 'flex flex-row' : 'flex flex-row-reverse'}`}
      >
        {!isSystem && (
          <div className={`flex flex-col max-w-[75%] ${isAI ? 'mr-auto' : 'ml-auto'}`}>
            <div className="flex items-center mb-1">
              <Avatar className={`h-6 w-6 ${isAI ? 'mr-2' : 'ml-2 order-2'}`}>
                <AvatarFallback>{isAI ? 'AI' : msg.sender[0]}</AvatarFallback>
              </Avatar>
              <span className={`text-sm ${isAI ? '' : 'order-1 mr-2'}`}>{msg.sender}</span>
            </div>
            <div className={`rounded-lg p-3 ${isAI ? 'bg-gray-700 text-white' : 'bg-muted'} overflow-hidden`}>
              {isAI ? (
                <ReactMarkdown 
                  className="prose prose-sm prose-invert max-w-none"
                  components={{
                    pre: ({node, ...props}) => (
                      <pre {...props} className="p-2 rounded-md bg-gray-800 overflow-x-auto" />
                    ),
                    img: ({node, ...props}) => (
                      <div className="my-4 flex justify-center">
                        <img
                          {...props}
                          className="max-w-full h-auto rounded-lg shadow-lg"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                    ),
                    p: ({node, ...props}) => (
                      <p {...props} className="mb-2 last:mb-0" />
                    ),
                    code: ({node, inline, ...props}: {node?: any, inline?: boolean, [key: string]: any}) => (
                      inline ? 
                        <code {...props} className="px-1 py-0.5 rounded-sm bg-gray-800" /> :
                        <code {...props} className="block p-2 rounded-md bg-gray-800 overflow-x-auto" />
                    )
                  }}
                >
                  {msg.message}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.message}</p>
              )}
            </div>
          </div>
        )}
        
        {isSystem && <div className="w-full text-gray-500 italic">{msg.message}</div>}
      </div>
    );
  };

  // Add a debug message about current state
  console.log('Current rendering state:', {
    socketConnected,
    selectedCollab: selectedCollab ? selectedCollab._id : null,
    username,
    messageCount: messages.length,
    messages
  });

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