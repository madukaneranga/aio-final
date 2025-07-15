import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Star } from "lucide-react";
import { formatLKR } from "../utils/currency";

const ServiceCard = ({ service }) => {
  return (
    <Link to={`/service/${service._id}`} className="block">
      <div className="booking-card bg-white rounded-lg shadow-md overflow-hidden">
        {/* === Start Service Image Hover Logic Modification === */}
        <div className="relative w-full h-48 overflow-hidden group">
          {/* First Image */}
          <img
            src={
              service.images?.[0]
                ? service.images[0].startsWith("http")
                  ? service.images[0]
                  : `${import.meta.env.VITE_API_URL}${service.images[0]}`
                : "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=300&fit=crop"
            }
            alt={service.title}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
              service.images?.[1]
                ? "group-hover:opacity-0" // fade out if second image exists
                : "group-hover:opacity-50" // blink same image
            }`}
          />

          {/* Second Image (if available) */}
          {service.images?.[1] && (
            <img
              src={
                service.images[1].startsWith("http")
                  ? service.images[1]
                  : `${import.meta.env.VITE_API_URL}${service.images[1]}`
              }
              alt={`${service.title} hover`}
              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            />
          )}

          {/* Price Type Tag */}
          <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-sm z-10">
            {service.priceType}
          </div>
        </div>
        {/* === End Service Image Hover Logic Modification === */}

        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {service.title}
          </h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {service.description}
          </p>

          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl font-bold">
              {formatLKR(service.price)}
              <span className="text-sm text-gray-500 ml-1">
                {service.priceType === "hourly" ? "/hour" : ""}
              </span>
            </span>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-gray-600">4.5</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{service.duration} min</span>
            </div>
            <span className="text-sm text-gray-500 capitalize">
              {service.category}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ServiceCard;
