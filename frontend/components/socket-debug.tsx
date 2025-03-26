import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from './ui/button';
import { Input } from './ui/input';

const SOCKET_SERVER_URL = "https://cogniwebsocket.centralindia.cloudapp.azure.com";

export function SocketDebug() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [roomId, setRoomId] = useState('test-room');
  const [username, setUsername] = useState('tester');
  const [messageText, setMessageText] = useState('');
  
  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      withCredentials: false,
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);
    
    // Connection events
    newSocket.on('connect', () => {
      console.log('Debug socket connected:', newSocket.id);
      setConnected(true);
      addMessage(`Connected to server with ID: ${newSocket.id}`);
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Debug socket connection error:', error);
      setConnected(false);
      addMessage(`Connection error: ${error.message}`);
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('Debug socket disconnected:', reason);
      setConnected(false);
      addMessage(`Disconnected: ${reason}`);
    });
    
    // Message events
    newSocket.on('receiveMessage', (data) => {
      console.log('Debug received message:', data);
      addMessage(`Received message: ${JSON.stringify(data)}`);
    });
    
    newSocket.on('userJoined', (msg) => {
      console.log('Debug user joined:', msg);
      addMessage(`User joined: ${msg}`);
    });
    
    newSocket.on('userLeft', (msg) => {
      console.log('Debug user left:', msg);
      addMessage(`User left: ${msg}`);
    });
    
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  const addMessage = (msg: string) => {
    setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };
  
  const handleJoinRoom = () => {
    if (!socket || !roomId || !username) return;
    
    socket.emit('joinRoom', roomId, username);
    addMessage(`Joined room: ${roomId} as ${username}`);
  };
  
  const handleLeaveRoom = () => {
    if (!socket) return;
    
    socket.emit('leaveRoom');
    addMessage(`Left room`);
  };
  
  const handleSendMessage = () => {
    if (!socket || !messageText || !roomId || !username) return;
    
    const messageData = {
      roomId,
      message: messageText,
      sender: username
    };
    
    socket.emit('sendMessage', messageData);
    addMessage(`Sent message: ${messageText}`);
    setMessageText('');
  };
  
  return (
    <div className="p-4 border rounded-lg max-w-2xl mx-auto mt-4">
      <h2 className="text-xl font-bold mb-4">Socket Debug Tool</h2>
      
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <div className={`w-3 h-3 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm mb-1">Room ID</label>
          <Input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room ID"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Username</label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <Button onClick={handleJoinRoom} disabled={!connected || !roomId || !username}>
          Join Room
        </Button>
        <Button onClick={handleLeaveRoom} disabled={!connected} variant="outline">
          Leave Room
        </Button>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm mb-1">Message</label>
        <div className="flex gap-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type message..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage} disabled={!connected || !messageText}>
            Send
          </Button>
        </div>
      </div>
      
      <div className="border rounded-lg p-2 bg-gray-50 h-60 overflow-y-auto">
        <h3 className="font-semibold mb-2">Debug Log:</h3>
        {messages.length === 0 ? (
          <p className="text-gray-400 text-sm">No messages yet</p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="text-sm mb-1">
              {msg}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 