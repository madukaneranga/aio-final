import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  ExternalLink,
  Wrench,
} from "lucide-react";
import userProfile from "../../../../assests/User/user.png";

const CustomerInfo = ({ customer, chat, onCallCustomer, onEmailCustomer }) => {
  const navigate = useNavigate();

  if (!customer) return null;

  const handleViewItem = (type, item) => {
    console.log(type, item);
    if (type === "product") {
      if (item._id) {
        navigate(`/product/${item._id}`);
      } else if (item.productUrl) {
        window.open(item.productUrl, "_blank");
      }
    } else if (type === "service") {
      if (item._id) {
        navigate(`/services/${item._id}`);
      } else if (item.serviceUrl) {
        window.open(item.serviceUrl, "_blank");
      }
    }
  };

  return (
    <div className="p-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <img
            src={customer.profileImage || userProfile}
            alt={customer.name}
            className="w-15 h-15 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
          />
          {customer.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">
              {customer.name}
            </h3>
            {customer.isVIP && (
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
            )}
          </div>

          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Mail className="w-4 h-4" />
              <span className="cursor-pointer hover:text-blue-600 transition-colors">
                {customer.email}
              </span>
            </div>

            {customer.phone && (
              <div className="flex items-center space-x-1">
                <Phone className="w-4 h-4" />
                <span className="cursor-pointer hover:text-blue-600 transition-colors">
                  {customer.phone}
                </span>
              </div>
            )}

            <div className="flex items-center space-x-1">
              <Circle
                className={`w-2 h-2 rounded-full ${
                  customer.isOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              <span>{customer.isOnline ? "Online" : "Offline"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tagged Product Section */}
      {chat?.taggedProduct && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Inquiring about: {chat.taggedProduct.productName}
              </span>
            </div>

            {chat.taggedProduct.productId && (
              <button
                onClick={() =>
                  handleViewItem("product", chat.taggedProduct.productId)
                }
                className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                <span>View Product Details</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Additional product info */}
          <div className="mt-2 space-y-1">
            {chat.taggedProduct.price && (
              <div className="text-sm text-gray-600">
                Price:{" "}
                <span className="font-medium text-blue-700">
                  {chat.taggedProduct.price}
                </span>
              </div>
            )}

            {chat.taggedProduct.category && (
              <div className="text-xs text-gray-500">
                Category: {chat.taggedProduct.category}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tagged Service Section */}
      {chat?.taggedService && (
        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                Inquiring about:{" "}
                {chat.taggedService.serviceName ||
                  chat.taggedService.productName}
              </span>
            </div>

            {chat.taggedService.serviceId && (
              <button
                onClick={() =>
                  handleViewItem("service", chat.taggedService.serviceId)
                }
                className="flex items-center space-x-1 text-xs text-purple-600 hover:text-purple-800 transition-colors"
              >
                <span>View Service Details</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Additional service info */}
          <div className="mt-2 space-y-1">
            {chat.taggedService.price && (
              <div className="text-sm text-gray-600">
                Price:{" "}
                <span className="font-medium text-purple-700">
                  {chat.taggedService.price}
                </span>
              </div>
            )}

            {chat.taggedService.category && (
              <div className="text-xs text-gray-500">
                Category: {chat.taggedService.category}
              </div>
            )}

            {chat.taggedService.duration && (
              <div className="text-xs text-gray-500">
                Duration: {chat.taggedService.duration}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Priority/Tags */}
      {customer.tags && customer.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {customer.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerInfo;
