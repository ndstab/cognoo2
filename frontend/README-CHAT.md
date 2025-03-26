# Real-Time Chat Functionality

This document explains how to use the real-time chat functionality in the collaboration feature.

## Overview

The collaboration feature now includes real-time chat functionality using Socket.io. Users can:

1. Create or join collaborations
2. Exchange messages in real-time
3. See when other users join or leave the chat
4. View chat history for the current session

## Running the Chat Server

To enable real-time messaging, you need to run both the Next.js application and the Socket.io server:

1. Start the Next.js application:
   ```
   npm run dev
   ```

2. In a separate terminal, start the Socket.io server:
   ```
   npm run socket
   ```

## How It Works

### Socket.io Server

- The Socket.io server runs on port 3001 by default
- It manages rooms based on collaboration IDs
- Each collaboration becomes a chat room
- The server handles message delivery and room management

### Front-End Integration

- When a user selects a collaboration, they automatically join the corresponding chat room
- Messages are sent and received in real-time
- The UI displays different styles for:
  - Your own messages (right-aligned, primary color)
  - Others' messages (left-aligned, muted color)
  - System messages (centered, italic)

## Troubleshooting

If you encounter issues with the chat functionality:

1. Make sure both the Next.js app and Socket.io server are running
2. Check the browser console for connection errors
3. Verify that the Socket.io server URL in `collaboration-screen.tsx` matches your setup
   - Current URL: `https://cogniwebsocket.centralindia.cloudapp.azure.com`
   - For local development, you might need to change this to `http://localhost:3001`

## Modifying the Socket.io Server

If you need to modify the Socket.io server:

1. Edit `socket-server.js` to change server behavior
2. Edit `collaboration-screen.tsx` to change client-side behavior
3. Restart the Socket.io server to apply changes

## Future Improvements

Planned improvements for the chat functionality:

1. Persistent message storage in the database
2. Message read receipts
3. Typing indicators
4. File sharing capabilities 