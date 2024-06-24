// WebSocketContext.tsx
import React, { createContext, useContext } from 'react';
import useWebSocket, { WebSocketHook } from '../hooks/useSocket';

type WebSocketContextType = WebSocketHook;

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

type WebSocketProviderProps = {
  children: React.ReactNode;
  url: string;
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children, url }) => {
  const webSocketHook = useWebSocket(url);

  return (
    <WebSocketContext.Provider value={webSocketHook}>
      {children}
    </WebSocketContext.Provider>
  );
};
