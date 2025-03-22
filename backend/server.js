const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const axios = require('axios');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables - this should be at the top
dotenv.config();

// Initialize OpenAI after environment variables are loaded
const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Store active rooms & users and their message history
const rooms = {};
const roomMessages = {};

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join_room', (roomId, username) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = new Set();
      roomMessages[roomId] = [];
    }
    rooms[roomId].add(username);
    
    // Notify room about new user
    io.to(roomId).emit('user_joined', {
      username,
      users: Array.from(rooms[roomId])
    });
  });

  socket.on('leave_room', (roomId, username) => {
    socket.leave(roomId);
    if (rooms[roomId]) {
      rooms[roomId].delete(username);
      if (rooms[roomId].size === 0) {
        delete rooms[roomId];
        delete roomMessages[roomId];
      } else {
        io.to(roomId).emit('user_left', {
          username,
          users: Array.from(rooms[roomId])
        });
      }
    }
  });

  socket.on('send_message', async (data) => {
    const { roomId, message, sender } = data;
    
    // Store message in room history
    if (!roomMessages[roomId]) roomMessages[roomId] = [];
    roomMessages[roomId].push({ sender, message, timestamp: Date.now() });
    
    // Broadcast message to room
    io.to(roomId).emit('receive_message', {
      sender,
      message,
      timestamp: Date.now()
    });

    // Check if AI should respond
    try {
      if (await shouldAIRespond(message, roomId)) {
        io.to(roomId).emit('ai_typing', true);
        
        try {
          const taskDecision = await taskManager(message, roomId);
          let aiResponse;
          
          if (taskDecision.object.next === 'search') {
            aiResponse = await generateWithSearch(message, roomId);
          } else {
            // Get recent chat history for context
            const recentMessages = roomMessages[roomId]
              ? roomMessages[roomId].slice(-3).map(m => `${m.sender}: ${m.message}`).join('\n')
              : '';
            
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You are Cogni, a helpful AI assistant in a group chat. Provide engaging and informative responses that encourage discussion. Consider the chat history and group context in your responses.'
                },
                {
                  role: 'user',
                  content: `Chat history:\n${recentMessages}\n\nCurrent message: ${message}`
                }
              ],
              temperature: 0.7,
              max_tokens: 500
            });
            aiResponse = completion.choices[0].message.content;
          }
          
          io.to(roomId).emit('receive_message', {
            sender: 'Cogni',
            message: aiResponse,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Error generating AI response:', error);
          io.to(roomId).emit('receive_message', {
            sender: 'Cogni',
            message: 'I apologize, but I encountered an error while processing your message. Could you please try again?',
            timestamp: Date.now()
          });
        }
        
        io.to(roomId).emit('ai_typing', false);
      }
    } catch (error) {
      console.error('Error in message processing:', error);
      io.to(roomId).emit('ai_typing', false);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
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

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("joinRoom", (roomId, username) => {
    socket.join(roomId);
    rooms[socket.id] = { roomId, username };
    
    // Initialize room message history if it doesn't exist
    if (!roomMessages[roomId]) {
      roomMessages[roomId] = [];
    }
    
    console.log(`${username} joined room: ${roomId}`);
    const joinMessage = `${username} joined the chat`;
    roomMessages[roomId].push({ sender: "System", message: joinMessage });
    io.to(roomId).emit("userJoined", joinMessage);
  });

  // Modified message handling with Cogni AI integration
  socket.on("sendMessage", async ({ roomId, message, sender }) => {
    // Add message to room history
    roomMessages[roomId].push({ sender, message });
    
    // Emit the user's message to everyone
    io.to(roomId).emit("receiveMessage", { sender, message });
    
    // Check if AI should respond
    const shouldRespond = await shouldAIRespond(message, roomId);
    
    if (shouldRespond) {
      // First, send a "thinking" message
      io.to(roomId).emit("receiveMessage", { 
        sender: "Cogni", 
        message: "Thinking...",
        isLoading: true
      });
      
      // Determine if we need to search
      const taskDecision = await taskManager(message, roomId);
      
      if (taskDecision.object.next === "search") {
        // Send a "searching" message
        io.to(roomId).emit("receiveMessage", { 
          sender: "Cogni", 
          message: "Searching for information...",
          isLoading: true
        });
      }
      
      // Get the final response
      const aiResponse = await getAIResponse(message, roomId);
      
      // Add AI response to room history
      roomMessages[roomId].push({ sender: "Cogni", message: aiResponse });
      
      // Send to all users in the room
      io.to(roomId).emit("receiveMessage", { 
        sender: "Cogni", 
        message: aiResponse,
        isLoading: false
      });
    }
  });

  socket.on("disconnect", () => {
    const user = rooms[socket.id];
    if (user) {
      const leaveMessage = `${user.username} left the chat`;
      if (roomMessages[user.roomId]) {
        roomMessages[user.roomId].push({ sender: "System", message: leaveMessage });
      }
      io.to(user.roomId).emit("userLeft", leaveMessage);
      delete rooms[socket.id];
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});