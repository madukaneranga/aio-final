import { getWalletBalance } from '../models/WalletTransaction';

const handleWalletEvents = (io, socket) => {
  // Join wallet room for real-time updates
  socket.on('join-wallet-room', (storeId) => {
    socket.join(`wallet-${storeId}`);
    console.log(`Store ${storeId} joined wallet room`);
  });

  // Leave wallet room
  socket.on('leave-wallet-room', (storeId) => {
    socket.leave(`wallet-${storeId}`);
    console.log(`Store ${storeId} left wallet room`);
  });

  // Admin joins withdrawal management room
  socket.on('join-admin-room', () => {
    socket.join('admin-room');
    console.log('Admin joined admin room');
  });

  // Real-time wallet balance updates
  socket.on('get-wallet-balance', async (storeId) => {
    try {
      const balance = await getWalletBalance(storeId);
      socket.emit('wallet-balance-update', balance);
    } catch (error) {
      socket.emit('wallet-error', { message: 'Failed to fetch balance' });
    }
  });
};

export default handleWalletEvents;