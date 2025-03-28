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
    // Get recent messages for context
    const recentMessages = roomMessages[roomId]
      ? roomMessages[roomId].slice(-3).map(m => `${m.sender}: ${m.message}`).join('\n')
      : '';

    // If this is the first message in the room, respond
    if (!recentMessages) return true;

    // Use LLM to determine if we should respond
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI response analyzer for a group chat assistant named Cogni.
          
                    Your task is to determine if a message requires Cogni to respond. Consider:
                    1. Is it a question or seeking information?
                    2. Is it asking for help or assistance?
                    3. Is it directed at an AI assistant (even implicitly)?
                    4. Would a response add value to the conversation?
                    5. Is it part of an ongoing conversation with Cogni?
                    6. Is the user directly addressing Cogni?

                    Respond with JSON only: {"respond": true} or {"respond": false}

                    Context from recent chat:
                    ${recentMessages}`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.3,
      max_tokens: 50,
      response_format: { type: "json_object" }
    });
    
    try {
      const response = JSON.parse(completion.choices[0].message.content);
      console.log(`LLM Response Decision for '${message}': ${JSON.stringify(response)}`);
      return response.respond === true;
    } catch (e) {
      console.error('Error parsing LLM response:', e);
      // Default to responding if there's a parsing error
      return true;
    }
  } catch (error) {
    console.error('Error in AI decision:', error);
    // Default to responding if there's an error
    return true;
  }
}

// Task Manager - Determine next steps
async function taskManager(message) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      max_results: 3,   //INCREASE THIS IF YOU WANT TO GET MORE SEARCH RESULTS
      search_depth: 'advanced',
      include_images: false,
      include_answer: true,
      include_raw_content: false
    });

    console.log('Tavily API response:', response.data); // Log the full response
    
    if (!response.data || !response.data.results) {
      console.error('No results in Tavily response:', response.data);
      throw new Error('No search results found');
    }
    
    return response.data
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
    console.log("IM FUCKING HERE")
    console.log(searchResults)
    // Ensure searchResults exist
    const searchAnswer = searchResults?.answer || '';
    const searchTextResults = searchResults?.results || [];
    // Get chat history for context
    const recentMessages = roomMessages[roomId]?.slice(-5)
      .map(m => `${m.sender}: ${m.message}`)
      .join('\n') || '';

    // Extract text-based content from search results safely
    const searchContext = searchTextResults.length
      ? searchTextResults.map(r => r.content || "No relevant content found.").join('\n\n')
      : "No relevant search context available.";

    // Prepare source links separately
    const sources = searchTextResults.length
      ? searchTextResults.map(r => `- [${r.title}](${r.url})`).join('\n')
      : "No sources available.";

      // Generate response with search context
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are Cogni, a helpful AI assistant in a group chat. Use the search context provided below to generate a high-quality response which encourages discussions. Make sure the response is formatted as follows:
          - **Answer** :- 
          {The Generated Answer}
          - **Sources** :- 
          {The Sources}
          
          - **PUT MORE EMPHASIS ON THE ANSWER GIVEN, AND ALSO INCLUDE BITS FROM THE SEARCH CONTEXT**
          - **Go through the entire search context very thoroughly before generating any responses and keep the factual information in mind**
          - **DO NOT mention that this information comes from a web search.**
          - **DO NOT explicitly state that you used external sources.**
          - **Use the provided text context naturally in your response.**
          - **The final response must include a "Sources" section listing relevant links.**

          Search Answer:
          ${searchAnswer}
          Search Context:
          ${searchContext}
          Sources:
          ${sources}`
        },
        {
          role: "user",
          content: `Chat history:\n${recentMessages}\n\nUser question: ${message}`
        }
      ],
      temperature: 1,
      max_tokens: 1500
    });

    // Get AI response
    let aiResponse = completion.choices[0].message.content;
    console.log(searchAnswer)
    console.log(searchContext)
    console.log(sources)
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
      model: "gpt-4o-mini",
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