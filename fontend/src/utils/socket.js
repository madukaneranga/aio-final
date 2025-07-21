// src/socket.js
import { io } from "socket.io-client";

let socket = null;

export const initSocket = (token) => {
  if (!token) return null;

  socket = io(import.meta.env.VITE_API_URL, {
    auth: {
      token,
    },
    transports: ["websocket"], // force WebSocket for performance
    autoConnect: true,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
