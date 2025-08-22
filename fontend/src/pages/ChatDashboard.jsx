import useChat from "../hooks/useChat";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect, useMemo, useCallback } from "react";
import ChatList from "../components/Chat/dashboards/shared/ChatList";
import CustomerInfo from "../components/Chat/dashboards/shared/CustomerInfo";
import ChatInterface from "../components/Chat/dashboards/shared/ChatInterface";
import QuickActions from "../components/Chat/dashboards/shared/QuickActions";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ChatDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const onNavigate = useNavigate();

  // Memoize user to prevent unnecessary re-renders - ALWAYS call this
  const memoizedUser = useMemo(() => {
    if (!user) return null;
    return {
      ...user,
      role:
        user.role === "store_owner" && user.storeId
          ? "store_owner"
          : "customer",
    };
  }, [user?.id, user?.role, user?.storeId]);

  // ALWAYS call useChat hook - NEVER conditionally
  const chatHook = useChat(memoizedUser);

  // ALWAYS call useState - NEVER conditionally
  const [selectedChat, setSelectedChat] = useState(null);

  // Calculate derived values AFTER all hooks
  const storeId = user?.storeId;
  const isStoreOwner = user?.role === "store_owner" && storeId;
  const isCustomer = user?.role === "customer";

  // Effects can be conditional based on dependencies - this is fine
  useEffect(() => {
    if (authLoading || !user) return;
  }, [user?.id, user?.role, storeId, onNavigate, authLoading]);

  // Event handlers - define after hooks
  const handleSelectChat = async (chat) => {
    try {
      setSelectedChat(chat);
      await chatHook.loadMessages(chat._id);
      await chatHook.markAsRead(chat._id);
    } catch (error) {
      console.error("Failed to load chat:", error);
    }
  };

  const handleInsertQuickReply = (text) => {
    if (chatHook.activeChat) {
      chatHook.sendMessage(chatHook.activeChat._id, text);
    }
  };

  const handleTyping = useCallback(
    (chatId, isTyping) => {
      if (isTyping) {
        chatHook.startTyping(chatId);
      } else {
        chatHook.stopTyping(chatId);
      }
    },
    [chatHook.startTyping, chatHook.stopTyping]
  );

  // NOW we can do conditional rendering - AFTER all hooks are called
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Not Authenticated
          </h2>
          <p className="text-gray-600 mb-4">
            Please log in to access your messages.
          </p>
          <button
            onClick={() => onNavigate("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (chatHook.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isStoreOwner ? "Loading customer chats..." : "Loading chats..."}
          </p>
        </div>
      </div>
    );
  }

  if (!isCustomer && !isStoreOwner) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to view this page.
          </p>
          <button
            onClick={() => onNavigate("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Render dashboards
  if (isStoreOwner) {
    return (
      <div className="h-screen flex bg-gray-100">
        <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onNavigate(`/store/${storeId}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                Customer Messages
              </h1>
              <span className="text-sm text-gray-500">Store ID: {storeId}</span>
            </div>
          </div>
        </div>

        <div className="flex w-full pt-16">
          <ChatList
            chats={chatHook.conversations}
            selectedChat={selectedChat}
            onSelectChat={handleSelectChat}
            userRole="store_owner"
          />
          <div className="flex-1 flex flex-col">
            {chatHook.activeChat && (
              <CustomerInfo
                customer={chatHook.activeChat.otherParticipant}
                chat={chatHook.activeChat}
              />
            )}
            <div className="flex-1 flex">
              <ChatInterface
                chat={chatHook.activeChat}
                user={memoizedUser}
                onSendMessage={chatHook.sendMessage}
                onTyping={handleTyping}
                messages={chatHook.messages}
                typingUsers={
                  chatHook.getTypingUsers
                    ? chatHook.getTypingUsers(chatHook.activeChat?._id)
                    : []
                }
              />
              <QuickActions onInsertText={handleInsertQuickReply} />
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="h-screen flex bg-gray-100">
        <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Your Messages</h1>
            <button
              onClick={() => onNavigate("/")}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to Home
            </button>
          </div>
        </div>
        <div className="flex w-full pt-16">
          <ChatList
            chats={chatHook.conversations}
            selectedChat={selectedChat}
            onSelectChat={handleSelectChat}
            userRole="customer"
          />
          <ChatInterface
            chat={chatHook.activeChat}
            user={memoizedUser}
            onSendMessage={chatHook.sendMessage}
            onTyping={handleTyping}
            messages={chatHook.messages}
            typingUsers={
              chatHook.getTypingUsers
                ? chatHook.getTypingUsers(chatHook.activeChat?._id)
                : []
            }
          />
        </div>
      </div>
    );
  }
};

export default ChatDashboard;
