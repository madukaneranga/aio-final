import React, { useState, useEffect, useRef } from 'react';
import { Search, Archive, Star, Send, Paperclip, MoreVertical, Settings, User, ShoppingBag, Clock, CheckCircle2, Circle, MessageSquare, Phone, Mail } from 'lucide-react';
import useChat from '../hooks/useChat'; // Your existing hook

// Mock user data - replace with your auth context
const mockUser = {
  _id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'customer', // or 'store_owner'
  profileImage: null
};

// Extract ChatInterface from your existing ChatPopup
const ChatInterface = ({ chat, user, onSendMessage, onTyping, messages, typingUsers }) => {
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

  const currentTypingUsers = typingUsers?.filter(u => u.chatId === chat?._id) || [];

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

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-gray-900 to-black text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={chat.otherParticipant?.profileImage || '/api/placeholder/40/40'}
                alt={chat.otherParticipant?.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              {chat.otherParticipant?.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold">{chat.otherParticipant?.name}</h3>
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
          const isMine = message.sender._id === user._id;
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
                
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${isMine ? 'text-gray-300' : 'text-gray-500'}`}>
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        
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
                  {currentTypingUsers[0].userName} is typing...
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

// Chat List Component
const ChatList = ({ chats, selectedChat, onSelectChat, userRole, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter(chat =>
    chat.otherParticipant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastMessage = (message) => {
    if (!message) return 'No messages yet';
    
    switch (message.messageType) {
      case 'image':
        return '📷 Photo';
      case 'receipt':
        return '🧾 Receipt';
      case 'system':
        return '⚙️ System message';
      default:
        return message.content?.length > 50 
          ? message.content.substring(0, 50) + '...'
          : message.content;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {userRole === 'customer' ? 'Your Chats' : 'Customer Messages'}
        </h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.map((chat) => (
          <div
            key={chat._id}
            onClick={() => onSelectChat(chat)}
            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedChat?._id === chat._id ? 'bg-blue-50 border-blue-200' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={chat.otherParticipant?.profileImage || '/api/placeholder/48/48'}
                  alt={chat.otherParticipant?.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {chat.otherParticipant?.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 truncate">
                    {chat.otherParticipant?.name}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {formatTime(chat.lastMessage?.timestamp || chat.updatedAt)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-600 truncate">
                    {formatLastMessage(chat.lastMessage)}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
                
                {/* Product Tag for Store Owners */}
                {userRole === 'store_owner' && chat.taggedProduct && (
                  <div className="flex items-center mt-1 text-xs text-blue-600">
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    <span className="truncate">{chat.taggedProduct.productName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {filteredChats.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>No conversations found</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Quick Actions for Store Owners
const QuickActions = ({ onInsertText }) => {
  const quickReplies = [
    { text: "Thanks for your inquiry!", icon: "👋" },
    { text: "Let me check that for you", icon: "🔍" },
    { text: "Product is available", icon: "✅" },
    { text: "Here's the pricing information", icon: "💰" },
    { text: "Would you like to place an order?", icon: "🛒" },
    { text: "I'll get back to you shortly", icon: "⏱️" },
  ];

  return (
    <div className="w-64 border-l border-gray-200 bg-gray-50 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
      
      <div className="space-y-2">
        {quickReplies.map((reply, index) => (
          <button
            key={index}
            onClick={() => onInsertText(reply.text)}
            className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">{reply.icon}</span>
              <span className="text-sm text-gray-700">{reply.text}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2">Customer Info</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Previous orders: 5</span>
          </div>
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4" />
            <span>Total spent: $299</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Customer since: Jan 2024</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Customer Info Panel for Store Owners
const CustomerInfo = ({ customer, chat }) => {
  if (!customer) return null;

  return (
    <div className="p-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <img
          src={customer.profileImage || '/api/placeholder/60/60'}
          alt={customer.name}
          className="w-15 h-15 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{customer.name}</h3>
          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Mail className="w-4 h-4" />
              <span>{customer.email}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Circle className={`w-2 h-2 rounded-full ${customer.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>{customer.isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        
        {chat?.analytics?.customerSatisfaction && (
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium">{chat.analytics.customerSatisfaction}</span>
            </div>
            <span className="text-xs text-gray-500">Rating</span>
          </div>
        )}
      </div>
      
      {chat?.taggedProduct && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Inquiring about: {chat.taggedProduct.productName}
            </span>
          </div>
          {chat.taggedProduct.productId && (
            <button className="mt-2 text-xs text-blue-600 hover:text-blue-800">
              View Product Details →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Main Dashboard Components
const CustomerChatDashboard = ({ user }) => {
  const {
    conversations,
    activeChat,
    messages,
    loadMessages,
    sendMessage,
    markAsRead,
    joinChatRoom,
    startTyping,
    stopTyping,
    typingUsers,
    isLoading
  } = useChat(user);

  const [selectedChat, setSelectedChat] = useState(null);

  const handleSelectChat = async (chat) => {
    try {
      setSelectedChat(chat);
      await loadMessages(chat._id);
      await markAsRead(chat._id);
      joinChatRoom(chat._id);
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100">
      <ChatList
        chats={conversations}
        selectedChat={selectedChat}
        onSelectChat={handleSelectChat}
        userRole="customer"
      />
      <ChatInterface
        chat={activeChat}
        user={user}
        onSendMessage={sendMessage}
        onTyping={startTyping}
        messages={messages}
        typingUsers={typingUsers}
      />
    </div>
  );
};

const StoreOwnerChatDashboard = ({ user, storeId }) => {
  const {
    conversations,
    activeChat,
    messages,
    loadMessages,
    sendMessage,
    markAsRead,
    joinChatRoom,
    startTyping,
    stopTyping,
    typingUsers,
    isLoading
  } = useChat(user);

  const [selectedChat, setSelectedChat] = useState(null);

  const handleSelectChat = async (chat) => {
    try {
      setSelectedChat(chat);
      await loadMessages(chat._id);
      await markAsRead(chat._id);
      joinChatRoom(chat._id);
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  const handleInsertQuickReply = (text) => {
    // This would normally update the message input in ChatInterface
    // For demo purposes, we'll just send it directly
    if (activeChat) {
      sendMessage(activeChat._id, text);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100">
      <ChatList
        chats={conversations}
        selectedChat={selectedChat}
        onSelectChat={handleSelectChat}
        userRole="store_owner"
      />
      
      <div className="flex-1 flex flex-col">
        {activeChat && (
          <CustomerInfo
            customer={activeChat.otherParticipant}
            chat={activeChat}
          />
        )}
        
        <div className="flex-1 flex">
          <ChatInterface
            chat={activeChat}
            user={user}
            onSendMessage={sendMessage}
            onTyping={startTyping}
            messages={messages}
            typingUsers={typingUsers}
          />
          
          <QuickActions onInsertText={handleInsertQuickReply} />
        </div>
      </div>
    </div>
  );
};

// Demo Component - Switch between user roles
const ChatDashboardDemo = () => {
  const [userRole, setUserRole] = useState('customer');
  
  const user = {
    ...mockUser,
    role: userRole
  };

  return (
    <div className="h-screen">
      {/* Role Switcher for Demo */}
      <div className="bg-gray-800 text-white p-2 flex items-center justify-between">
        <h1 className="font-bold">Chat Dashboard - {userRole === 'customer' ? 'Customer View' : 'Store Owner View'}</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setUserRole('customer')}
            className={`px-3 py-1 rounded text-sm ${
              userRole === 'customer' ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            Customer View
          </button>
          <button
            onClick={() => setUserRole('store_owner')}
            className={`px-3 py-1 rounded text-sm ${
              userRole === 'store_owner' ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            Store Owner View
          </button>
        </div>
      </div>

      {/* Dashboard */}
      {userRole === 'customer' ? (
        <CustomerChatDashboard user={user} />
      ) : (
        <StoreOwnerChatDashboard user={user} storeId="store123" />
      )}
    </div>
  );
};

export default ChatDashboardDemo;