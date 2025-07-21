import { io } from "socket.io-client";

let socket = null;

export const initSocket = (token) => {
  if (!token) return null;

  if (!socket || !socket.connected) {
    socket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("✅ Connected to Socket.IO:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from Socket.IO:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
    });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
