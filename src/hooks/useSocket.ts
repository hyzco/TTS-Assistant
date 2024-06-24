import React, { useEffect, useState, useRef, useMemo } from 'react';

export type WebSocketHook = {
  socket: WebSocket | null;
  isConnected: boolean;
  error: Event | null;
  sendMessage: (message: any) => void;
  receivedMessages: (string | Blob)[]; // Update receivedMessages type to handle string or Blob
  isConnecting: boolean;
};

const useWebSocket = (url: string): WebSocketHook => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<Event | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [receivedMessages, setReceivedMessages] = useState<(string | Blob)[]>([]); // State to handle messages of type string or Blob
  const reconnectTimeout = useRef<number | undefined>(undefined);
  const reconnectAttempts = useRef<number>(0);

  const socketRef = useRef<WebSocket | null>(null);

  const connectWebSocket = () => {
    setIsConnecting(true);
    socketRef.current = new WebSocket(url);

    socketRef.current.onopen = () => {
      console.log("Connected to WebSocket server");
      setIsConnected(true);
      setIsConnecting(false);
      clearTimeout(reconnectTimeout.current);
      reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
    };

    socketRef.current.onclose = (event) => {
      console.log("WebSocket closed:", event);
      setIsConnected(false);
      setSocket(null);
      if (event.code !== 1000) {
        const delay = Math.min(5000, Math.pow(2, reconnectAttempts.current) * 1000); // Exponential backoff
        console.log(`Reconnecting in ${delay}ms...`);
        reconnectTimeout.current = window.setTimeout(() => {
          reconnectAttempts.current++;
          connectWebSocket(); // Reconnect
        }, delay);
      }
    };

    socketRef.current.onerror = (err) => {
      setError(err);
      setIsConnecting(false);
    };

    socketRef.current.onmessage = (event) => {
      if (typeof event.data === 'string') {
        // Handle JSON or string messages
        try {
          const message = JSON.parse(event.data);
          setReceivedMessages(prevMessages => [...prevMessages, message]);
        } catch (error) {
          console.error('Error parsing JSON message:', error);
          // Handle non-JSON string message if needed
          setReceivedMessages(prevMessages => [...prevMessages, event.data]);
        }
      } else if (event.data instanceof Blob) {
        // Handle Blob messages
        console.log('Received Blob:', event.data);
        setReceivedMessages(prevMessages => [...prevMessages, event.data]);
      } else {
        console.error('Unsupported message type:', typeof event.data);
        // Handle unsupported message types if needed
      }
    };

    setSocket(socketRef.current);
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      clearTimeout(reconnectTimeout.current);
    };
  }, [url]);

  const sendMessage = useMemo(() => {
    return (message: any) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(message));
      } else {
        console.error("WebSocket is not open. Cannot send message.");
      }
    };
  }, []);

  return useMemo(() => {
    return { socket, isConnected, error, sendMessage, receivedMessages, isConnecting };
  }, [socket, isConnected, error, sendMessage, receivedMessages, isConnecting]);
};

export default useWebSocket;
