const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const axios = require('axios');
const WebSocket = require('ws');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables - this should be at the top
dotenv.config();

// Initialize OpenAI after environment variables are loaded
const { OpenAI } = require('openai');
const openai = new OpenAI();

const app = express();
app.use(cors());

const server = http.createServer(app);

// Initialize Socket.IO with production-ready settings
const io = new Server(server, {
  cors: {
    origin: "*", // As requested, allowing all origins for now
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  transports: ['websocket', 'polling'], // Enable both WebSocket and polling
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 2048 // Only compress data above this size (in bytes)
  }
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

// Store active rooms & users and their message history
const rooms = {};
const roomMessages = {};

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Store socket info for disconnection handling
  const clientInfo = {};

  // Join collaboration room
  socket.on('join_room', (roomId, username, userId) => {
    console.log(`User ${username} (${userId}) joining room ${roomId}`);
    
    // Store client info for disconnection handling
    clientInfo.roomId = roomId;
    clientInfo.username = username;
    clientInfo.userId = userId;
    
    // Join the socket.io room
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = new Set();
      roomMessages[roomId] = [];
    }
    
    // Add user to room
    rooms[roomId].add(username);
    
    // Notify room about new user
    io.to(roomId).emit('user_joined', {
      username,
      users: Array.from(rooms[roomId])
    });
    
    console.log(`Room ${roomId} now has users:`, Array.from(rooms[roomId]));
  });

  // Leave collaboration room
  socket.on('leave_room', () => {
    if (!clientInfo.roomId) return;
    
    const { roomId, username, userId } = clientInfo;
    console.log(`User ${username} (${userId}) leaving room ${roomId}`);
    
    socket.leave(roomId);
    
    if (rooms[roomId]) {
      rooms[roomId].delete(username);
      
      // If room is empty, remove it
      if (rooms[roomId].size === 0) {
        delete rooms[roomId];
        delete roomMessages[roomId];
        console.log(`Room ${roomId} is now empty and removed`);
      } else {
        // Notify room that user left
        io.to(roomId).emit('user_left', {
          username,
          users: Array.from(rooms[roomId])
        });
        console.log(`Room ${roomId} now has users:`, Array.from(rooms[roomId]));
      }
    }
    
    // Clear client info
    delete clientInfo.roomId;
    delete clientInfo.username;
    delete clientInfo.userId;
  });

  // Send message to room
  socket.on('send_message', (data, callback) => {
    const { roomId, message, sender, userId, timestamp } = data;
    
    if (!roomId) {
      console.error("Missing roomId in send_message event");
      if (typeof callback === 'function') {
        callback({ received: false, error: "Missing roomId" });
      }
      return;
    }
    
    // Check if room exists
    if (!rooms[roomId]) {
      console.error(`Room ${roomId} does not exist for send_message`);
      if (typeof callback === 'function') {
        callback({ received: false, error: "Room not found" });
      }
      return;
    }
    
    console.log(`Message from ${sender} (${userId}) in room ${roomId}: ${message}`);
    
    // Store message in room history
    if (!roomMessages[roomId]) roomMessages[roomId] = [];
    
    const messageObj = {
      sender,
      userId,
      message,
      timestamp: timestamp || Date.now()
    };
    
    roomMessages[roomId].push(messageObj);
    
    // Broadcast message to all clients in room EXCEPT sender
    socket.to(roomId).emit('receive_message', messageObj);
    
    // Acknowledge receipt to the sender
    if (typeof callback === 'function') {
      callback({ 
        received: true, 
        timestamp: messageObj.timestamp,
        roomMembers: io.sockets.adapter.rooms.get(roomId).size
      });
    }
    
    // Check if AI should respond
    try {
      shouldAIRespond(message, roomId).then(shouldRespond => {
        if (shouldRespond) {
          io.to(roomId).emit('receive_message', {
            sender: 'Cogni',
            message: 'Typing...',
            timestamp: Date.now(),
            isAI: true
          });
          
          getAIResponse(message, roomId).then(aiResponse => {
            const aiMessageObj = {
              sender: 'Cogni',
              message: aiResponse,
              timestamp: Date.now(),
              isAI: true
            };
            
            roomMessages[roomId].push(aiMessageObj);
            io.to(roomId).emit('receive_message', aiMessageObj);
          }).catch(error => {
            console.error('Error getting AI response:', error);
            io.to(roomId).emit('receive_message', {
              sender: 'Cogni',
              message: 'Sorry, I had trouble processing that request.',
              timestamp: Date.now(),
              isAI: true
            });
          });
        }
      }).catch(error => {
        console.error('Error determining if AI should respond:', error);
      });
    } catch (error) {
      console.error('Error in message processing:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Handle leaving room on disconnect
    if (clientInfo.roomId) {
      const { roomId, username, userId } = clientInfo;
      console.log(`User ${username} disconnected from room ${roomId}`);
      
      if (rooms[roomId]) {
        rooms[roomId].delete(username);
        
        // If room is empty, remove it
        if (rooms[roomId].size === 0) {
          delete rooms[roomId];
          delete roomMessages[roomId];
          console.log(`Room ${roomId} is now empty and removed`);
        } else {
          // Notify room that user left
          io.to(roomId).emit('user_left', {
            username,
            users: Array.from(rooms[roomId])
          });
          console.log(`Room ${roomId} now has users:`, Array.from(rooms[roomId]));
        }
      }
    }
  });
});

// Function to check if AI should respond
async function shouldAIRespond(message, roomId) {
  try {
    // Basic checks first
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('cogni') ||
        /^(what|who|when|where|why|how|can|could|would|will|should|is|are|do|does|did)/i.test(lowerMessage)) {
      return true;
    }

    // Get recent chat history for context
    const recentMessages = roomMessages[roomId]
      ? roomMessages[roomId].slice(-3)
      : [];

    // If this is the first message in the room, respond
    if (recentMessages.length === 0) return true;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI response analyzer. Your task is to determine if a message requires an AI response. Respond ONLY with 'true' or 'false'. Respond with 'true' if the message is a question, request for help, mentions AI, or seeks information/advice. Respond with 'false' for casual conversation or statements."
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.3,
      max_tokens: 5
    });
    
    const response = completion.choices[0].message.content.toLowerCase().trim();
    console.log(`AI Response Decision for '${message}': ${response}`);
    return response === 'true';
  } catch (error) {
    console.error('Error in AI decision:', error);
    // Default to responding if there's an error
    return true;
  }
}

// Task Manager - Determine next steps
async function taskManager(message, roomId) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are Cogni's task manager. Determine if this query needs web search or if it can be answered directly. Respond with JSON: {\"next\": \"search\"} for web search or {\"next\": \"proceed\"} for direct answer."
        },
        {
          role: "user",
          content: message
        }
      ]
    });
    
    try {
      const response = JSON.parse(completion.choices[0].message.content);
      return { object: response };
    } catch (e) {
      return { object: { next: "proceed" } };
    }
  } catch (error) {
    console.error('Error in task manager:', error);
    return { object: { next: "proceed" } };
  }
}

// Web Search using Tavily
async function searchWeb(query) {
  try {
    console.log('Searching with Tavily API for:', query);
    
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: process.env.TAVILY_API_KEY,
      query: query,
      max_results: 5,
      search_depth: 'advanced',
      include_images: true,
      include_answer: true,
      include_raw_content: false
    });

    console.log('Tavily API response:', response.data); // Log the full response
    
    if (!response.data || !response.data.results) {
      console.error('No results in Tavily response:', response.data);
      throw new Error('No search results found');
    }
    
    return response.data.results.map(result => ({
      title: result.title || 'No title',
      content: result.content || 'No content',
      url: result.url || '#',
      image: result.image || 'No image available' // Fallback for missing images
    }));
  } catch (error) {
    console.error('Error in web search:', error);
    console.error('Error details:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Generate response with search results
async function generateWithSearch(message, roomId) {
  try {
    // Perform web search
    const searchResults = await searchWeb(message);
    
    // Get chat history for context
    const recentMessages = roomMessages[roomId]
      ? roomMessages[roomId].slice(-5).map(m => `${m.sender}: ${m.message}`).join('\n')
      : '';
    
    // Format search results for the AI - include explicit instructions to format response
    const sources = searchResults.map(r => `- [${r.title}](${r.url})`).join('\n');
    const images = searchResults
      .filter(r => r.image && r.image !== 'No image available' && r.image.startsWith('http'))
      .map(r => `![${r.title}](${r.image})`)
      .join('\n');
    
    // Generate response with search context
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are Cogni, a helpful AI assistant in a group chat. Format your response in this exact order: 1) Sources section with links, 2) Images section with markdown image tags, 3) Your detailed answer. Always include all images provided in your response using markdown image syntax. Always cite sources when using information from search results."
        },
        {
          role: "user",
          content: `Chat history:\n${recentMessages}\n\nUser question: ${message}\n\nSources:\n${sources}\n\nImages:\n${images}`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    
    // Ensure images are included in the response
    let aiResponse = completion.choices[0].message.content;
    
    // If the AI didn't include the images, add them manually
    if (images && !aiResponse.includes('![')) {
      aiResponse = `${images}\n\n${aiResponse}`;
    }
    
    return aiResponse;
  } catch (error) {
    console.error('Error generating with search:', error);
    return "I encountered an error while searching for information. Let me try to answer based on what I know, or could you please rephrase your question?";
  }
}

// Direct response without search
async function generateDirectResponse(message, roomId) {
  try {
    // Get recent messages for context, ensuring we have the latest conversation flow
    const recentMessages = roomMessages[roomId]
      ? roomMessages[roomId].slice(-5).map(m => ({
          role: m.sender.toLowerCase() === 'cogni' ? 'assistant' : 'user',
          content: m.message
        }))
      : [];

    // Create the completion request with enhanced context
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are Cogni, a helpful and engaging AI assistant. Provide clear, informative responses while maintaining a natural conversational flow. Format responses in markdown when appropriate."
        },
        ...recentMessages,
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating direct response:', error);
    return "I apologize, but I'm having trouble processing your request right now. Could you please try again?";
  }
}

// Main AI response function
async function getAIResponse(message, roomId) {
  try {
    // First determine if we need to search or can answer directly
    const taskDecision = await taskManager(message, roomId);
    
    if (taskDecision.object.next === "search") {
      // Use web search to generate response
      return await generateWithSearch(message, roomId);
    } else {
      // Generate direct response
      return await generateDirectResponse(message, roomId);
    }
  } catch (error) {
    console.error('Error in AI response process:', error);
    return "I'm having trouble processing your request right now. Please try again later.";
  }
}

// Basic health check route
app.get('/', (req, res) => {
  res.send('Server is running');
});