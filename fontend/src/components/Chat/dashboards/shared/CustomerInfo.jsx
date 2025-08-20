import React, { useState, useEffect, useRef } from 'react';
import { Search, Archive, Star, Send, Paperclip, MoreVertical, Settings, User, ShoppingBag, Clock, CheckCircle2, Circle, MessageSquare, Phone, Mail } from 'lucide-react';
import userProfile from '../../../../assests/User/user.png'


const CustomerInfo = ({ customer, chat }) => {
  if (!customer) return null;

  return (
    <div className="p-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <img
          src={customer.profileImage || userProfile}
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

export default CustomerInfo;