import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const useSocket = (serverUrl = import.meta.env.VITE_API_URL) => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(serverUrl, {
      withCredentials: true
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [serverUrl]);

  return socketRef.current;
};

export { useSocket }