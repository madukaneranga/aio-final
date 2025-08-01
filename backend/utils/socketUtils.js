let ioInstance = null;

export const setSocketInstance = (io) => {
  ioInstance = io;
};

export const emitNotification = (userId, notification) => {
  if (!ioInstance) {
    console.warn('Socket.IO instance not set');
    return;
  }
  
  const userSocketMap = ioInstance.userSocketMap || new Map();
  const socketId = userSocketMap.get(userId);
  if (socketId) {
    ioInstance.to(socketId).emit("new-notification", notification);
  }
};