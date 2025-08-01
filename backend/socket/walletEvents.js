import { getWalletBalance } from '../models/WalletTransaction';

const handleWalletEvents = (io, socket) => {
  // Join wallet room for real-time updates
  socket.on('join-wallet-room', (userId) => {
    socket.join(`wallet-${userId}`);
    console.log(`Store ${userId} joined wallet room`);
  });

  // Leave wallet room
  socket.on('leave-wallet-room', (userId) => {
    socket.leave(`wallet-${userId}`);
    console.log(`Store ${userId} left wallet room`);
  });

  // Admin joins withdrawal management room
  socket.on('join-admin-room', () => {
    socket.join('admin-room');
    console.log('Admin joined admin room');
  });

  // Real-time wallet balance updates
  socket.on('get-wallet-balance', async (userId) => {
    try {
      const balance = await getWalletBalance(userId);
      socket.emit('wallet-balance-update', balance);
    } catch (error) {
      socket.emit('wallet-error', { message: 'Failed to fetch balance' });
    }
  });
};

export default handleWalletEvents;