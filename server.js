const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { OpenAI } = require("openai");
const axios = require("axios");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store active rooms & users and their message history
const rooms = {};
const roomMessages = {};

// Function to check if AI should respond
async function shouldAIRespond(message, roomId) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are Cogni, a decision maker. Analyze the following message and respond with 'true' if it requires an AI response (like questions, requests for help, or direct queries) or 'false' if it's casual conversation between users. Only respond with 'true' or 'false'. If the user is directly addressing some other user (you can decide this, on the basis of if there are any names present in the query provided), respond with 'false'. If the user is directly addressing to you (as Cogni), YOU HAVE TO RESPOND AT ALL COSTS."
        },
        {
          role: "user",
          content: `Chat history:\n${roomMessages[roomId].slice(-5).map(m => `${m.sender}: ${m.message}`).join('\n')}\n\nCurrent message: ${message}`
        }
      ],
      max_tokens: 40
    });
    
    const decision = completion.choices[0].message.content.toLowerCase().includes('true');
    return decision;
  } catch (error) {
    console.error('Error in AI decision:', error);
    return false;
  }
}

// Task Manager - Determine next steps
async function taskManager(message, roomId) {
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
    // Make request to Tavily API
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        query: query,
        search_depth: "basic",
        include_domains: [],
        exclude_domains: [],
        max_results: 5
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
        }
      }
    );
    
    // Extract search results
    const results = response.data.results || [];
    const formattedResults = results.map(r => ({
      title: r.title,
      content: r.content,
      url: r.url
    }));
    
    return formattedResults;
  } catch (error) {
    console.error('Error searching web:', error);
    return [];
  }
}

// Format message for Cogni-style response
function formatCogniMessage(content, isSearching = false) {
  if (isSearching) {
    return {
      id: Date.now(),
      role: "assistant",
      content: "Searching for information...",
      createdAt: new Date().toISOString(),
      isLoading: true
    };
  }
  
  return {
    id: Date.now(),
    role: "assistant",
    content: content,
    createdAt: new Date().toISOString(),
    isLoading: false
  };
}

// Generate response with search results
async function generateWithSearch(message, roomId) {
  try {
    // Perform web search
    const searchResults = await searchWeb(message);
    
    // Get chat history for context
    const recentMessages = roomMessages[roomId].slice(-5).map(m => 
      `${m.sender}: ${m.message}`
    ).join('\n');
    
    // Format search results for the AI
    const searchContext = searchResults.length > 0 
      ? "Search results:\n" + searchResults.map(r => 
          `Title: ${r.title}\nContent: ${r.content}\nURL: ${r.url}\n`
        ).join('\n---\n')
      : "No relevant search results found.";
    
    // Generate response with search context
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Cogni, a helpful AI assistant. Use the search results to provide an accurate and helpful response. If the search results don't contain relevant information, use your knowledge to provide the best answer possible. Always cite sources when using information from search results. Format your response in markdown."
        },
        {
          role: "user",
          content: `Chat history:\n${recentMessages}\n\nUser question: ${message}\n\n${searchContext}`
        }
      ]
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating with search:', error);
    return "I encountered an error while searching for information. Let me answer based on what I know.";
  }
}

// Direct response without search
async function generateDirectResponse(message, roomId) {
  try {
    // Get last 10 messages for context
    const recentMessages = roomMessages[roomId].slice(-10).map(m => ({
      role: m.sender === "Cogni" ? "assistant" : "user",
      content: `${m.sender}: ${m.message}`
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are Cogni, a helpful AI assistant in a chat room. Provide concise and relevant responses. Use the chat history for context. Format your response in markdown."
        },
        ...recentMessages,
        {
          role: "user",
          content: message
        }
      ]
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error getting direct response:', error);
    return "Sorry, I couldn't process that request.";
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});