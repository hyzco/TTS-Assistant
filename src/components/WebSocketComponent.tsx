import React, { useEffect, useRef, useState } from "react";
import { useWebSocketContext } from "../context/WebSocketProvider";

const WebSocketComponent: React.FC = () => {
  const {
    isConnected,
    error,
    sendMessage,
    isConnecting,
    receivedMessages,
  } = useWebSocketContext();
  const divRef = useRef<HTMLDivElement>(null);

  const [formattedMessages, setFormattedMessages] = useState<(string | undefined)[]>([]);

  useEffect(() => {
    if (receivedMessages.length > 0) {
      console.log("Received message:", receivedMessages[receivedMessages.length - 1]);
      formatMessages(receivedMessages);
    }
  }, [receivedMessages]);

  const formatMessages = async (messages: (any)[]) => {
    const formatted: (string | undefined)[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (Array.isArray(msg) || typeof msg === 'object') {
        try {
          const jsonText = JSON.stringify(msg);
          formatted.push(jsonText);
        } catch (error) {
          console.error("Error converting array/object to JSON:", error);
          formatted.push(undefined);
        }
      } else if (msg instanceof Blob) {
        try {
          const text = await blobToString(msg);
          formatted.push(text);
        } catch (error) {
          console.error("Error converting Blob to string:", error);
          formatted.push(undefined);
        }
      } else {
        formatted.push(msg as string);
      }
    }
    setFormattedMessages(formatted);
  };

  const blobToString = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        resolve(text);
      };
      reader.onerror = () => {
        reject(reader.error);
      };
      reader.readAsText(blob);
    });
  };

  const handleSendMessage = () => {
    console.log("test");
    sendMessage({ type: "ping" });
  };

  return (
    <div ref={divRef} className='w-full flex flex-col my-2 p-4 max-h-[20rem] overflow-y-auto'>
      <p>Status: {isConnected ? "CONNECTED" : "DISCONNECTED"}</p>
      {formattedMessages.map((msg, index) => (
        <div
          key={`${index}-${msg}`}
          className='w-full flex flex-row mb-2 bg-white rounded-lg p-4 shadow-xl shadow-black/5 ring-1 ring-slate-700/10'
          style={{ whiteSpace: 'pre-wrap' }}
        >
          <div className='mr-5'></div>
          {msg}
        </div>
      ))}
    </div>
  );
};

export default WebSocketComponent;
