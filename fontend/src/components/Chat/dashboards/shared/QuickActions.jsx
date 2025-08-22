import React, { useState, useEffect, useRef } from 'react';
import { Search, Archive, Star, Send, Paperclip, MoreVertical, Settings, User, ShoppingBag, Clock, CheckCircle2, Circle, MessageSquare, Phone, Mail } from 'lucide-react';

const QuickActions = ({ onInsertText }) => {
  const quickReplies = [
    { text: "Thanks for your inquiry!", icon: "👋" },
    { text: "Let me check that for you", icon: "🔍" },
    { text: "This is available", icon: "✅" },
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

    </div>
  );
};

export default QuickActions;