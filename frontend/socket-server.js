const http = require('http');
const { Server } = require('socket.io');

// Create HTTP server
const server = http.createServer();

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // In production, specify your frontend domain
    methods: ['GET', 'POST']
  }
});

// Store active users in rooms with their connection counts
const usersInRoom = new Map(); // Map of roomId -> Map of userId -> {username, connections}
const socketRooms = new Map(); // Map of socketId -> {roomId, userId}

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle joining a room
  socket.on('joinRoom', (roomId, username, userId) => {
    // Store connection info
    const connectionInfo = { roomId, userId, username };
    socketRooms.set(socket.id, connectionInfo);
    
    // Leave previous room if any
    leaveCurrentRoom(socket);
    
    // Join new room
    socket.join(roomId);
    
    // Update users in room tracking
    if (!usersInRoom.has(roomId)) {
      usersInRoom.set(roomId, new Map());
    }
    
    const roomUsers = usersInRoom.get(roomId);
    
    if (!roomUsers.has(userId)) {
      // New user in this room
      roomUsers.set(userId, { username, connections: 1 });
      // Notify others that user has joined (only for first connection)
      socket.to(roomId).emit('userJoined', `${username} has joined the room`);
    } else {
      // Existing user opening another tab/connection
      const userInfo = roomUsers.get(userId);
      userInfo.connections += 1;
      roomUsers.set(userId, userInfo);
      // Don't send join notification for subsequent connections
    }
    
    console.log(`${username} (${userId}) joined room: ${roomId} - Connection count: ${roomUsers.get(userId).connections}`);
    
    // Send current user list to all clients in room
    const userList = Array.from(roomUsers.entries()).map(([id, info]) => ({
      userId: id,
      username: info.username
    }));
    
    io.to(roomId).emit('roomUsers', userList);
  });

  // Handle sending messages
  socket.on('sendMessage', ({ roomId, message, sender, userId }, callback) => {
    if (roomId) {
      const timestamp = new Date().toISOString();
      
      // Get connection info from socket
      const connectionInfo = socketRooms.get(socket.id);
      
      // Use connection info if available, otherwise use provided sender
      const safeSender = connectionInfo ? connectionInfo.username : (sender || 'Unknown');
      const safeUserId = connectionInfo ? connectionInfo.userId : (userId || 'unknown');
      
      console.log(`Message from ${safeSender} (${safeUserId}) in room ${roomId}: ${message}`);
      
      // Get room information
      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      console.log(`Broadcasting to ${roomSize} clients in room ${roomId}`);
      
      // Create the message object
      const messageObj = {
        sender: safeSender,
        userId: safeUserId,
        message: message || '',
        timestamp,
        roomId
      };
      
      // IMPORTANT: Use socket.to() to broadcast to others in the room (excluding sender)
      // This prevents duplicate messages on the sender's client
      socket.to(roomId).emit('receiveMessage', messageObj);
      
      // Acknowledge receipt to the sender
      if (typeof callback === 'function') {
        callback({ 
          received: true, 
          timestamp,
          roomMembers: roomSize
        });
      }
      
      console.log(`Message broadcast completed to ${roomSize-1} other clients in room ${roomId}`);
    } else {
      console.error("Missing roomId in sendMessage event");
      if (typeof callback === 'function') {
        callback({ received: false, error: "Missing roomId" });
      }
    }
  });

  // Handle leaving a room
  socket.on('leaveRoom', () => {
    leaveCurrentRoom(socket);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    leaveCurrentRoom(socket);
    console.log('User disconnected:', socket.id);
  });
  
  // Helper function to leave current room
  function leaveCurrentRoom(socket) {
    const connectionInfo = socketRooms.get(socket.id);
    if (!connectionInfo) return;
    
    const { roomId, userId, username } = connectionInfo;
    
    if (roomId && usersInRoom.has(roomId)) {
      const roomUsers = usersInRoom.get(roomId);
      
      if (roomUsers.has(userId)) {
        const userInfo = roomUsers.get(userId);
        userInfo.connections -= 1;
        
        if (userInfo.connections <= 0) {
          // User has no more active connections to this room
          roomUsers.delete(userId);
          // Notify others that user has left
          socket.to(roomId).emit('userLeft', `${username} has left the room`);
          console.log(`${username} (${userId}) left room ${roomId} completely`);
          
          // If room is empty, remove it
          if (roomUsers.size === 0) {
            usersInRoom.delete(roomId);
            console.log(`Room ${roomId} is now empty and removed`);
          }
        } else {
          // User still has other tabs/connections open
          roomUsers.set(userId, userInfo);
          console.log(`${username} (${userId}) connection closed, but still has ${userInfo.connections} active connections to room ${roomId}`);
        }
        
        // Send updated user list to all clients in room
        const userList = Array.from(roomUsers.entries()).map(([id, info]) => ({
          userId: id,
          username: info.username
        }));
        
        io.to(roomId).emit('roomUsers', userList);
      }
    }
    
    // Leave the socket room
    if (roomId) {
      socket.leave(roomId);
    }
    
    // Clean up socket tracking
    socketRooms.delete(socket.id);
  }
});

// Start server on port 3001 (or any preferred port)
const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🔌 Socket.io server running on port ${PORT}`);
  console.log(`📱 Connect to your socket server at: http://localhost:${PORT}`);
  console.log(`💬 Real-time chat is now available!\n`);
});

// Track connection statistics
setInterval(() => {
  const totalConnections = io.engine.clientsCount;
  const rooms = io.sockets.adapter.rooms;
  const roomCount = Math.max(0, rooms.size - totalConnections); // Subtract socket IDs (private rooms)
  
  console.log(`\n📊 Socket Statistics:`);
  console.log(`   - Total connections: ${totalConnections}`);
  console.log(`   - Active rooms: ${roomCount}`);
  
  if (roomCount > 0) {
    console.log(`\n📋 Room Details:`);
    
    rooms.forEach((sockets, roomId) => {
      // Skip private rooms (socket IDs)
      if (roomId.includes('#') || roomId.length > 25) return;
      
      console.log(`   - Room ${roomId}: ${sockets.size} connections`);
      
      // Show users in the room if we have that data
      if (usersInRoom.has(roomId)) {
        const users = usersInRoom.get(roomId);
        console.log(`     Users: ${Array.from(users.entries())
          .map(([userId, info]) => `${info.username} (${info.connections} connections)`)
          .join(', ')}`);
      }
    });
  }
  console.log(''); // Empty line for spacing
}, 30000); // Every 30 seconds

// Export server for potential programmatic usage
module.exports = { io, server }; 