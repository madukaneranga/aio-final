import React, { useState, useEffect, useRef } from 'react';
import { Search, Archive, Star, Send, Paperclip, MoreVertical, Settings, User, ShoppingBag, Clock, CheckCircle2, Circle, MessageSquare, Phone, Mail } from 'lucide-react';
import userProfile from '../../../../assests/User/user.png'

const ChatInterface = ({ 
  chat, 
  user, 
  onSendMessage, 
  onTyping, 
  messages = [], // Default to empty array
  typingUsers = [] // Default to empty array
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chat) return;

    try {
      await onSendMessage(chat._id, newMessage.trim());
      setNewMessage('');
      setIsTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (value) => {
    setNewMessage(value);
    
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      onTyping?.(chat._id, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping?.(chat._id, false);
    }, 1000);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Ensure typingUsers is always an array before filtering
  const currentTypingUsers = Array.isArray(typingUsers) 
    ? typingUsers.filter(u => u?.chatId === chat?._id)
    : [];

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Chat Selected</h3>
          <p className="text-gray-500">Choose a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  // Safety check for user prop
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading...</h3>
          <p className="text-gray-500">Please wait while we load your chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-gray-900 to-black text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={chat.otherParticipant?.profileImage || userProfile}
                alt={chat.otherParticipant?.name || 'User'}
                className="w-10 h-10 rounded-full object-cover"
              />
              {chat.otherParticipant?.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold">{chat.otherParticipant?.name || 'Unknown User'}</h3>
              <p className="text-sm text-gray-300">
                {chat.otherParticipant?.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {chat.taggedProduct && (
          <div className="mt-3 p-2 bg-white/10 rounded-lg">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-sm">Product: {chat.taggedProduct.productName}</span>
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          // CRITICAL FIX: Safe property access with fallbacks
          if (!message || !message._id) {
            console.warn('Invalid message object:', message);
            return null; // Skip invalid messages
          }

          // Safe access to sender properties
          const senderId = message.sender?._id || message.senderId || 'unknown';
          const userId = user?._id || user?.id;
          const isMine = senderId === userId;

          return (
            <div key={message._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isMine 
                  ? 'bg-gradient-to-r from-gray-900 to-black text-white' 
                  : 'bg-gradient-to-r from-white to-gray-50 border border-gray-200'
              }`}>
                {message.messageType === 'image' && message.file && (
                  <img
                    src={message.file.url}
                    alt="Uploaded"
                    className="max-w-full h-auto rounded mb-2"
                  />
                )}
                
                {message.messageType === 'receipt' && message.receipt && (
                  <div className="p-3 border rounded-lg mb-2 bg-green-50">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800">Order Receipt</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Order: {message.receipt.orderId}</p>
                      <p>Amount: ${message.receipt.amount}</p>
                      <p>Status: {message.receipt.status}</p>
                    </div>
                  </div>
                )}
                
                <p className="text-sm">{message.content || 'No content'}</p>
                <p className={`text-xs mt-1 ${isMine ? 'text-gray-300' : 'text-gray-500'}`}>
                  {message.createdAt ? formatTime(message.createdAt) : 'No timestamp'}
                </p>
              </div>
            </div>
          );
        }).filter(Boolean)} {/* Filter out null elements */}
        
        {/* Typing Indicator */}
        {currentTypingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  {currentTypingUsers[0]?.userName || 'Someone'} is typing...
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-2 bg-gradient-to-r from-gray-900 to-black text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;