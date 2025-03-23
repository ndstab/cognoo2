import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  joinRoom: (roomId: string, username: string) => void;
  leaveRoom: (roomId: string, username: string) => void;
  sendMessage: (roomId: string, message: string, sender: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  joinRoom: () => {},
  leaveRoom: () => {},
  sendMessage: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = () => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://cogniwebsocket.centralindia.cloudapp.azure.com';
    const newSocket = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const joinRoom = (roomId: string, username: string) => {
    if (socket) {
      socket.emit('join_room', roomId, username);
    }
  };

  const leaveRoom = (roomId: string, username: string) => {
    if (socket) {
      socket.emit('leave_room', roomId, username);
    }
  };

  const sendMessage = (roomId: string, message: string, sender: string) => {
    if (socket) {
      socket.emit('send_message', { roomId, message, sender });
    }
  };

  // Auto cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connect,
        disconnect,
        joinRoom,
        leaveRoom,
        sendMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}; 