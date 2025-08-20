import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import imageCompression from "browser-image-compression";
import {
  MessageCircle,
  Send,
  Paperclip,
  X,
  Minimize2,
  Star,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Image,
  Download,
  Loader2,
} from "lucide-react";
import userProfile from '../../assests/User/user.png'

const ChatPopup = ({
  storeId,
  productId = null,
  position = "bottom-left",
  user,
  onClose,
}) => {

  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineStatus, setOnlineStatus] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Refs
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatContainerRef = useRef(null);

  // API URL
  const API_URL = import.meta.env.VITE_API_URL;

  // Initialize socket connection
  useEffect(() => {
    if (!user || !isOpen) return;

    if (!socketRef.current) {
      socketRef.current = io(API_URL, {
        withCredentials: true,
        transports: ["websocket"],
      });

      socketRef.current.on("connect", () => {
        console.log("Connected to chat socket");
      });

      socketRef.current.on("disconnect", () => {
        console.log("Disconnected from chat socket");
      });

      // Chat event handlers
      socketRef.current.on("new-message", handleNewMessage);
      socketRef.current.on("user-typing", handleTypingStatus);
      socketRef.current.on("messages-read", handleMessagesRead);
      socketRef.current.on("user-online-status", handleOnlineStatus);
      socketRef.current.on("message-blocked", handleMessageBlocked);
      socketRef.current.on("error", handleSocketError);
      socketRef.current.on("chat-joined", handleChatJoined);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, isOpen, API_URL]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket event handlers
  const handleNewMessage = (message) => {
    setMessages((prev) => [...prev, message]);

    // Update unread count if chat is minimized
    if (isMinimized && message.senderId !== user.id) {
      setUnreadCount((prev) => prev + 1);
    }

    // Mark as read if chat is open and not minimized
    if (isOpen && !isMinimized && message.senderId !== user.id) {
      markMessagesAsRead();
    }
  };

  const handleTypingStatus = (data) => {
    if (data.userId !== user.id) {
      setOtherUserTyping(data.isTyping);
    }
  };

  const handleMessagesRead = (data) => {
    console.log("Messages read by:", data.readBy);
  };

  const handleOnlineStatus = (data) => {
    if (data.userId !== user.id) {
      setOnlineStatus(data.isOnline);
    }
  };

  const handleMessageBlocked = (data) => {
    setError({
      type: "moderation",
      message: data.userMessage,
      reason: data.reason,
    });
    setTimeout(() => setError(null), 5000);
  };

  const handleSocketError = (error) => {
    setError({
      type: "socket",
      message: error.message || "Connection error",
    });
    setTimeout(() => setError(null), 3000);
  };

  const handleChatJoined = (data) => {
    console.log("Successfully joined chat:", data.chatId);
  };

  // API functions
  const startChat = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/chat/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ storeId, productId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start chat");
      }

      setChat(data.chat);

      // Join the chat room via socket
      if (socketRef.current) {
        socketRef.current.emit("join-chat", { chatId: data.chat._id });
      }

      // Load messages
      await loadMessages(data.chat._id);
    } catch (error) {
      setError({
        type: "api",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const response = await fetch(`${API_URL}/api/chat/${chatId}`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load messages");
      }

      setMessages(data.chat.messages || []);
      setOnlineStatus(data.chat.otherParticipant?.isOnline || false);
    } catch (error) {
      setError({
        type: "api",
        message: error.message,
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chat || isLoading) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    stopTyping();

    try {
      // Only send via socket - backend handles database + broadcast
      if (socketRef.current) {
        socketRef.current.emit("send-message", {
          chatId: chat._id,
          content: messageContent,
          messageType: "text",
        });
      }
    } catch (error) {
      setError({
        type: "send",
        message: error.message,
      });
      setNewMessage(messageContent);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !chat) return;

    // Validate file type (only images)
    if (!file.type.startsWith("image/")) {
      setError({
        type: "upload",
        message: "Only image files are allowed",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError({
        type: "upload",
        message: "File size must be less than 10MB",
      });
      return;
    }

    try {
      setIsUploading(true);

      // Compress image
      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, compressionOptions);

      // Upload to Firebase
      const uploadedFile = await uploadToFirebase(compressedFile);

      // Send message via socket
      if (socketRef.current) {
        socketRef.current.emit("send-message", {
          chatId: chat._id,
          file: uploadedFile,
          messageType: "image",
        });
      }
    } catch (error) {
      setError({
        type: "upload",
        message: error.message || "Failed to upload file",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const uploadToFirebase = async (file) => {
    // Import Firebase modules
    const { storage } = await import("../../utils/firebase");
    const { ref, uploadBytes, getDownloadURL } = await import(
      "firebase/storage"
    );

    // Create unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}_${randomId}_${file.name}`;

    // Create storage reference
    const storageRef = ref(storage, `ChatFolder/${filename}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      url: downloadURL,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    };
  };

  const markMessagesAsRead = async () => {
    if (!chat) return;

    try {
      // Only use socket - backend handles database + broadcast
      if (socketRef.current) {
        socketRef.current.emit("mark-messages-read", { chatId: chat._id });
      }
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const startTyping = () => {
    if (!chat || isTyping) return;

    setIsTyping(true);

    if (socketRef.current) {
      socketRef.current.emit("typing-start", { chatId: chat._id });
    }

    // Auto-stop typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (!isTyping || !chat) return;

    setIsTyping(false);

    if (socketRef.current) {
      socketRef.current.emit("typing-stop", { chatId: chat._id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const submitRating = async (ratingValue) => {
    if (!chat || ratingValue < 1 || ratingValue > 5) return;

    try {
      if (socketRef.current) {
        socketRef.current.emit("rate-chat", {
          chatId: chat._id,
          rating: ratingValue,
        });
      }
      setShowRating(false);
      setRating(ratingValue);
    } catch (error) {
      console.error("Failed to submit rating:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  // Position classes
  const positionClasses = {
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  // Chat button component
  const ChatButton = () => (
    <button
      onClick={() => {
        setIsOpen(true);
        if (!chat && !isLoading) {
          startChat();
        }
      }}
      className="group relative bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-800 text-white p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl border border-gray-700"
    >
      <MessageCircle className="w-6 h-6 group-hover:animate-pulse" />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce border-2 border-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
      <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
    </button>
  );

  // Error component
  const ErrorMessage = ({ error }) => (
    <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-300 rounded-lg p-3 mb-3 shadow-sm">
      <div className="flex items-center">
        <AlertTriangle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
        <span className="text-red-800 text-sm font-medium">{error.message}</span>
      </div>
      {error.reason && (
        <p className="text-red-700 text-xs mt-1 ml-6">{error.reason}</p>
      )}
    </div>
  );

  // Message component
  const Message = ({ message }) => {
    const isOwn = message.senderId === user.id;
    const isSystem = message.messageType === "system";

    if (isSystem) {
      return (
        <div className="flex justify-center my-3">
          <span className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 text-xs px-4 py-2 rounded-full shadow-sm border">
            {message.content}
          </span>
        </div>
      );
    }

    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4 group`}>
        <div className={`max-w-xs lg:max-w-md ${isOwn ? "order-2" : "order-1"}`}>
          {!isOwn && (
            <div className="flex items-center mb-2 ml-1">
              <div className="relative">
                <img
                  src={userProfile}
                  alt={"Store Owner"}
                  className="w-7 h-7 rounded-full mr-3 border-2 border-gray-200 shadow-sm"
                />
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${onlineStatus ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              </div>
            </div>
          )}

          <div
            className={`rounded-xl px-4 py-3 shadow-sm transition-all duration-200 group-hover:shadow-md ${
              isOwn 
                ? "bg-gradient-to-r from-gray-900 to-black text-white ml-4" 
                : "bg-gradient-to-r from-white to-gray-50 text-gray-900 border border-gray-200 mr-4"
            }`}
          >
            {message.messageType === "image" && message.file ? (
              <div className="space-y-2">
                <div className="relative group/image">
                  <img
                    src={message.file.url}
                    alt="Shared image"
                    className="max-w-full h-auto rounded-lg cursor-pointer transition-transform duration-200 hover:scale-105"
                    onClick={() => window.open(message.file.url, "_blank")}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/image:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center">
                    <Image className="w-6 h-6 text-white opacity-0 group-hover/image:opacity-100 transition-opacity duration-200" />
                  </div>
                </div>
                {message.content && (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
              </div>
            ) : message.messageType === "receipt" ? (
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                  <span className="font-semibold">Receipt</span>
                </div>
                {message.receipt && (
                  <div className="text-sm space-y-1 bg-gray-50 p-2 rounded border-l-4 border-green-400">
                    <p><span className="font-medium">Amount:</span> ${message.receipt.amount}</p>
                    <p><span className="font-medium">Status:</span> <span className="capitalize">{message.receipt.status}</span></p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            )}
          </div>

          <div className="flex items-center justify-between mt-1 px-1">
            <span className="text-xs text-gray-500">
              {formatTime(message.createdAt)}
            </span>
            {isOwn && (
              <div className="flex items-center space-x-1">
                {message.readBy?.length > 0 && (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {!isOpen ? (
        <ChatButton />
      ) : (
        <div
          className={`bg-white rounded-2xl shadow-2xl border border-gray-200 ${
            isMinimized ? "w-80 h-16" : "w-80 h-[500px]"
          } transition-all duration-300 overflow-hidden`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-900 to-black text-white">
            <div className="flex items-center space-x-3">
              {chat?.storeId && (
                <div className="relative">
                  <img
                    src={chat.storeId.profileImage || userProfile}
                    alt={chat.storeId.name}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 shadow-sm"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${onlineStatus ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-sm">
                  {chat?.storeId?.name || "Loading..."}
                </h3>
                <div className="flex items-center space-x-2 text-xs text-gray-300">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      onlineStatus ? "bg-green-400 animate-pulse" : "bg-gray-400"
                    }`}
                  />
                  <span>{onlineStatus ? "Online" : "Offline"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors duration-200"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onClose) onClose();
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Tagged Product */}
              {chat?.taggedProduct?.productId && (
                <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <img
                      src={chat.taggedProduct.productImage}
                      alt={chat.taggedProduct.productName}
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200 shadow-sm"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {chat.taggedProduct.productName}
                      </p>
                      <p className="text-sm text-gray-600 font-medium">
                        ${chat.taggedProduct.productPrice}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3">
                  <ErrorMessage error={error} />
                </div>
              )}

              {/* Messages Container */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-gray-50 to-white"
                style={{ height: chat?.taggedProduct?.productId ? "calc(100% - 200px)" : "calc(100% - 140px)" }}
              >
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="text-center">
                      <Loader2 className="animate-spin h-8 w-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Loading conversation...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 rounded-full mb-4">
                      <MessageCircle className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-sm font-medium mb-1">Start a conversation</p>
                    <p className="text-xs text-center">Send a message to get started with this store</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <Message key={message._id} message={message} />
                  ))
                )}

                {/* Typing Indicator */}
                {otherUserTyping && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl px-4 py-3 border border-gray-300 shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4 bg-white">
                <div className="flex items-end space-x-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                    ) : (
                      <Paperclip className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200 text-sm"
                      rows="1"
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isLoading}
                    className="p-3 bg-gradient-to-r from-gray-900 to-black text-white rounded-xl hover:from-black hover:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Rating Modal */}
              {showRating && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-200 m-4">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">
                      Rate this conversation
                    </h3>
                    <div className="flex space-x-2 mb-6 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => submitRating(star)}
                          className="p-1 hover:scale-110 transition-transform duration-200"
                        >
                          <Star
                            className={`w-8 h-8 transition-colors duration-200 ${
                              star <= rating
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300 hover:text-yellow-200"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowRating(false)}
                        className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          )}

          {/* Minimized Unread Count */}
          {isMinimized && unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce border-2 border-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatPopup;