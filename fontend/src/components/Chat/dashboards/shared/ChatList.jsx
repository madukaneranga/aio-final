import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Archive,
  Star,
  Send,
  Paperclip,
  MoreVertical,
  Settings,
  User,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Circle,
  MessageSquare,
  Phone,
  Mail,
} from "lucide-react";
import userProfile from '../../../../assests/User/user.png'

const ChatList = ({
  chats,
  selectedChat,
  onSelectChat,
  userRole,
  onSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  console.log("chats:", chats);
  const filteredChats = chats.filter(
    (chat) =>
      chat.otherParticipant?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      chat.lastMessage?.content
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  const formatLastMessage = (message) => {
    if (!message) return "No messages yet";

    switch (message.messageType) {
      case "image":
        return "📷 Photo";
      case "receipt":
        return "🧾 Receipt";
      case "system":
        return "⚙️ System message";
      default:
        return message.content?.length > 50
          ? message.content.substring(0, 50) + "..."
          : message.content;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {userRole === "customer" ? "Your Chats" : "Customer Messages"}
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
              selectedChat?._id === chat._id ? "bg-blue-50 border-blue-200" : ""
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={
                    chat.otherParticipant?.profileImage ||
                    userProfile
                  }
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
                {userRole === "store_owner" && chat.taggedProduct && (
                  <div className="flex items-center mt-1 text-xs text-blue-600">
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    <span className="truncate">
                      {chat.taggedProduct.productName}
                    </span>
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

export default ChatList;
