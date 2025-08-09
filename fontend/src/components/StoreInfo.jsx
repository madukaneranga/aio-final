import React, { useState } from "react";
import {
  Star,
  Mail,
  Phone,
  MapPin,
  Shield,
  Award,
  ExternalLink,
  MessageCircle,
  Instagram,
  Twitter,
  Facebook,
  Crown,
  CheckCircle,
  Clock,
  Truck,
  Calendar,
  TrendingUp,
  Heart,
  Share2,
  MessageSquare,
  Youtube,
  Camera,
  Music,
} from "lucide-react";

const StoreInfo = ({ store = {}, user = {}, reviews = [] }) => {
  const [hoveredContact, setHoveredContact] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);

  // Default store data with all features
  const defaultStore = {
    _id: "default_id",
    name: "default_name",
    rating: 0,
    type: "product",
    themeColor: "#000000ff",
    description:
      "default_description_default_description_default_description_default_description_default",
    profileImage: "/api/placeholder/120/120",
    totalSales: 2450000,
    isPremium: false,
    isVerified: false,
    isFeatured: false,
    storeLevel: "Gold",
    createdAt: "2020-03-15",
    responseTime: "2 hours",
    completionRate: 98,
    badges: ["Top Seller", "Fast Shipping", "Excellent Service"],
    operatingHours: {
      weekdays: "9:00 AM - 8:00 PM",
      weekends: "10:00 AM - 6:00 PM",
    },
    shippingInfo: {
      freeShipping: true,
      deliveryTime: "1-3 business days",
      areas: ["default1", "defaultr2", "default3"],
    },
    ownerId: {
      name: "default_owner_name",
      email: "default_owner_email",
      phone: "default_owner_phone",
      verified: true,
    },
    contactInfo: {
      email: "default_email",
      phone: "default_phone",
      whatsapp: "default_whatsapp",
      address: "default_address",
    },
    socialLinks: ["www.intergram.com", , "www.x.com", "www.facebook.com"],
    stats: {
      totalOrders: 300,
      repeatCustomers: 78,
      avgOrderValue: 15500,
    },
  };

  // Default user data
  const defaultUser = {
    id: "user_456",
    subscriptionLevel: "Premium",
    favoriteStores: ["store_123"],
  };

  const storeData = { ...defaultStore, ...store };
  const userData = { ...defaultUser, ...user };
  const reviewsData = reviews.length > 0 ? reviews : Array(127).fill({});

  const isColorLight = (color) => {
    const getRGB = (color) => {
      if (color.startsWith("#")) {
        const hex = color.slice(1);
        return [
          parseInt(hex.substr(0, 2), 16),
          parseInt(hex.substr(2, 2), 16),
          parseInt(hex.substr(4, 2), 16),
        ];
      }
      if (color.startsWith("rgb")) {
        return color.match(/\d+/g).map(Number);
      }
      const div = document.createElement("div");
      div.style.color = color;
      document.body.appendChild(div);
      const rgb = getComputedStyle(div).color.match(/\d+/g).map(Number);
      document.body.removeChild(div);
      return rgb;
    };

    const [r, g, b] = getRGB(color);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
  };

  // Theme detection
  const isLightTheme = isColorLight(storeData.themeColor);

  // Dynamic color generation based on theme color
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  // Share function
  const handleShare = async () => {
    const shareData = {
      title: storeData.name || "Check out this store",
      text: `Check out ${storeData.name || "this store"} - ${
        storeData.description || ""
      }`,
      url: window.location.href,
    };

    try {
      // Check if native sharing is supported
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
        // Or use a toast notification instead of alert
      }
    } catch (error) {
      console.error("Error sharing:", error);
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      } catch (clipboardError) {
        console.error("Clipboard error:", clipboardError);
      }
    }
  };

  const generateColorVariants = (color) => {
    const rgb = hexToRgb(color);
    if (!rgb)
      return {
        primary: color,
        light: color + "20",
        lighter: color + "10",
        dark: color,
      };

    return {
      primary: color,
      light: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
      lighter: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`,
      dark: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`,
      medium: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`,
    };
  };

  const colors = generateColorVariants(storeData.themeColor);

  const themeStyles = {
    color: isLightTheme ? "#ffffffff" : "#000000ff",
    backgroundColor: isLightTheme ? "#000000ff" : "#ffffffff",
  };

  const formatLKR = (amount) => {
    return `LKR ${(amount / 1000).toFixed(0)}K`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).getFullYear();
  };

  const getStoreLevel = () => {
    const levels = {
      Bronze: { color: "#cd7f32", icon: Award },
      Silver: { color: "#c0c0c0", icon: Award },
      Gold: { color: "#ffd700", icon: Crown },
      Premium: { color: storeData.themeColor, icon: Crown },
    };
    return levels[storeData.storeLevel] || levels.Bronze;
  };

  const levelInfo = getStoreLevel();

  const contactItems = [
    {
      icon: Mail,
      label: storeData.contactInfo?.email,
      type: "email",
      action: `mailto:${storeData.contactInfo?.email}`,
      available: !!storeData.contactInfo?.email,
    },
    {
      icon: Phone,
      label: storeData.contactInfo?.phone,
      type: "phone",
      action: `tel:${storeData.contactInfo?.phone}`,
      available: !!storeData.contactInfo?.phone,
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      type: "whatsapp",
      action: `https://wa.me/${storeData.contactInfo?.whatsapp?.replace(
        /[^0-9]/g,
        ""
      )}`,
      available: !!storeData.contactInfo?.whatsapp,
    },
    {
      icon: MapPin,
      label: storeData.contactInfo?.address,
      type: "address",
      action: "#",
      available: !!storeData.contactInfo?.address,
    },
  ].filter((item) => item.available);

  // Simple helper to get platform from URL
  const getPlatform = (url) => {
    console.log("URL:", url);
    if (url.includes("instagram")) return "instagram";
    if (url.includes("twitter") || url.includes("x.com")) return "twitter";
    if (url.includes("facebook")) return "facebook";
    if (url.includes("youtube")) return "youtube";
    if (url.includes("tiktok")) return "tiktok";
    if (url.includes("wa.me")) return "whatsapp";
    if (url.includes("snapchat")) return "snapchat";
    return null;
  };

  // Get icon for platform
  const getIcon = (platform) => {
    const icons = {
      instagram: Instagram,
      twitter: Twitter,
      facebook: Facebook,
      youtube: Youtube,
      tiktok: Music,
      whatsapp: MessageCircle,
      snapchat: Camera,
    };
    return icons[platform];
  };

  // Get label for platform
  const getLabel = (platform) => {
    const labels = {
      instagram: "Instagram",
      twitter: "Twitter/X",
      facebook: "Facebook",
      youtube: "YouTube",
      tiktok: "TikTok",
      whatsapp: "WhatsApp",
      snapchat: "Snapchat",
    };
    return labels[platform];
  };

  // Create social links from your array
  const socialLinks = Array.isArray(storeData.socialLinks)
    ? storeData.socialLinks
        .map((url) => {
          const platform = getPlatform(url);
          if (!platform) return null;

          return {
            icon: getIcon(platform),
            label: getLabel(platform),
            url: url,
            available: true,
          };
        })
        .filter(Boolean)
    : [];

  const toggleFavorite = () => {
    setIsFavorited(!isFavorited);
  };
  return (
    <div className="py-8" style={themeStyles}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Main Store Content */}
          <div className="lg:col-span-3">
            <div className="flex items-start space-x-8">
              {/* Enhanced Store Image with Premium Features */}
              <div className="relative group">
                {/* Premium glow effect */}
                {storeData.isPremium && (
                  <div
                    className="absolute -inset-2 rounded-full opacity-30 group-hover:opacity-50 transition-opacity duration-300 blur-sm"
                    style={{
                      background: `linear-gradient(45deg, ${colors.primary}, ${colors.medium})`,
                    }}
                  ></div>
                )}

                <div className="relative">
                  {storeData.profileImage && (
                    <img
                      src={storeData.profileImage}
                      alt={storeData.name}
                      className={`w-20 h-20 rounded-full object-cover shadow-lg ${
                        storeData.isPremium
                          ? `border-3`
                          : "border-2 border-gray-200"
                      }`}
                      style={
                        storeData.isPremium
                          ? { borderColor: colors.primary }
                          : {}
                      }
                    />
                  )}

                  {/* Verification and Premium badges */}
                  <div className="absolute -bottom-1 -right-1 flex space-x-1">
                    {storeData.isVerified && (
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {storeData.isPremium && (
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                        style={{ backgroundColor: levelInfo.color }}
                      >
                        <Crown className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {/* Enhanced Store Header */}
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h1
                      className="text-2xl font-light tracking-wide"
                      style={{ color: themeStyles.color }}
                    >
                      {storeData.name}
                    </h1>

                    {/* Store badges */}
                    <div className="flex items-center space-x-2">
                      {storeData.isVerified && (
                        <CheckCircle
                          className="w-5 h-5"
                          style={{ color: colors.primary }}
                        />
                      )}
                      {storeData.isPremium && (
                        <Crown
                          className="w-5 h-5"
                          style={{ color: levelInfo.color }}
                        />
                      )}
                      {storeData.isFeatured && (
                        <Award className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 ml-auto">
                      <button
                        onClick={toggleFavorite}
                        className={`p-2 rounded-full transition-all duration-300 ${
                          isFavorited
                            ? "text-red-500 bg-red-50"
                            : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isFavorited ? "fill-current" : ""
                          }`}
                        />
                      </button>
                      <button
                        onClick={handleShare}
                        className="p-2 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all duration-300"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span
                        className="font-medium"
                        style={{ color: isLightTheme ? "#666" : "#ccc" }}
                      >
                        {storeData.rating || 0}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: isLightTheme ? "#999" : "#666" }}
                      >
                        ({reviewsData.length} reviews)
                      </span>
                    </div>

                    <div className="h-3 w-px bg-gray-300"></div>

                    <span
                      className="capitalize text-xs font-medium tracking-wider px-2 py-1 rounded-full"
                      style={{
                        color: colors.primary,
                        backgroundColor: colors.light,
                      }}
                    >
                      {storeData.type} Collection
                    </span>

                    <span
                      className="text-xs font-medium tracking-wider px-2 py-1 rounded-full"
                      style={{
                        color: levelInfo.color,
                        backgroundColor: `${levelInfo.color}20`,
                      }}
                    >
                      {storeData.storeLevel} Seller
                    </span>

                    <span className="text-xs text-gray-500">
                      Member since{" "}
                      {storeData.createdAt
                        ? new Date(storeData.createdAt).getFullYear()
                        : "Unknown"}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p
                  className="text-sm leading-relaxed max-w-lg"
                  style={{ color: isLightTheme ? "#555" : "#bbb" }}
                >
                  {storeData.description}
                </p>

                {/* Store badges */}
                {storeData.badges && storeData.badges.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {storeData.badges.map((badge, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: colors.light,
                          color: colors.primary,
                        }}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                {/* Enhanced Owner Info */}
                <div
                  className="border-l-2 pl-4 py-2"
                  style={{ borderColor: colors.light }}
                >
                  <div className="flex items-center space-x-2">
                    <p
                      className="text-sm font-medium"
                      style={{ color: themeStyles.color }}
                    >
                      {storeData.ownerId?.name || "Store Owner"}
                    </p>
                    {storeData.ownerId?.verified && (
                      <CheckCircle
                        className="w-4 h-4"
                        style={{ color: colors.primary }}
                      />
                    )}
                  </div>
                  <p
                    className="text-xs"
                    style={{ color: isLightTheme ? "#777" : "#999" }}
                  >
                    Owner & Founder
                  </p>
                </div>

                {/* Sales Display & Quick Stats */}
                <div className="grid grid-cols-4 gap-4 pt-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <TrendingUp
                        className="w-3 h-3"
                        style={{ color: colors.primary }}
                      />
                      {storeData.isPremium && (
                        <Crown
                          className="w-3 h-3"
                          style={{ color: levelInfo.color }}
                        />
                      )}
                    </div>
                    <p
                      className="text-lg font-light tracking-wider"
                      style={{ color: themeStyles.color }}
                    >
                      {formatLKR(storeData.totalSales || 0)}
                    </p>
                    <p
                      className="text-xs font-medium tracking-wide"
                      style={{ color: colors.primary }}
                    >
                      SALES
                    </p>
                  </div>
                  <div className="text-center">
                    <p
                      className="text-lg font-semibold"
                      style={{ color: themeStyles.color }}
                    >
                      {storeData.stats.totalOrders.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {storeData.type === "product" ? "Orders" : "Bookings"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p
                      className="text-lg font-semibold"
                      style={{ color: colors.primary }}
                    >
                      {storeData.stats.repeatCustomers}%
                    </p>
                    <p className="text-xs text-gray-500">Retention Rate</p>
                  </div>
                  <div className="text-center">
                    <p
                      className="text-lg font-semibold"
                      style={{ color: themeStyles.color }}
                    >
                      {formatLKR(storeData.stats.avgOrderValue)}
                    </p>
                    <p className="text-xs text-gray-500">Avg Order</p>
                  </div>
                </div>

                {/* Social Links */}
                {socialLinks.length > 0 && (
                  <div className="flex justify-center space-x-3 pt-3">
                    {socialLinks.map((social, index) => {
                      const Icon = social.icon;
                      return (
                        <a
                          key={index}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-full bg-gray-100 hover:scale-110 flex items-center justify-center transition-all duration-300 group"
                          style={{
                            ":hover": {
                              backgroundColor: colors.light,
                            },
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = colors.light)
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = "#f3f4f6")
                          }
                        >
                          <Icon
                            className="w-3 h-3 text-gray-500 group-hover:transition-colors duration-300"
                            style={{
                              ":hover": {
                                color: colors.primary,
                              },
                            }}
                          />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compact Info Card */}
          <div className="lg:col-span-2">
            <div
              className={`rounded-2xl p-5 border shadow-sm ${
                storeData.isPremium
                  ? "bg-gradient-to-br from-white/90 to-gray-50/80 backdrop-blur-sm"
                  : "bg-gradient-to-br from-gray-50/80 to-white/60 backdrop-blur-sm"
              }`}
              style={
                storeData.isPremium
                  ? {
                      borderColor: colors.primary + "30",
                      boxShadow: `0 0 20px ${colors.primary}10`,
                    }
                  : { borderColor: "#e5e7eb50" }
              }
            >
              {/* Contact Section */}
              <div className="mb-4">
                <h3
                  className="text-sm font-medium mb-3 flex items-center space-x-2"
                  style={{ color: themeStyles.color }}
                >
                  <span>Contact</span>
                  <div
                    className="w-6 h-px bg-gradient-to-r to-transparent"
                    style={{ backgroundColor: colors.primary }}
                  ></div>
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  {contactItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={index}
                        className="group cursor-pointer"
                        onMouseEnter={() => setHoveredContact(index)}
                        onMouseLeave={() => setHoveredContact(null)}
                        onClick={() =>
                          item.action !== "#" && window.open(item.action)
                        }
                      >
                        <div
                          className={`flex items-center space-x-2 p-2 rounded-lg transition-all duration-300 ${
                            hoveredContact === index
                              ? "transform translate-x-1"
                              : ""
                          }`}
                          style={
                            hoveredContact === index
                              ? {
                                  backgroundColor: colors.light,
                                }
                              : {}
                          }
                        >
                          <div
                            className={`transition-all duration-300 ${
                              hoveredContact === index ? "scale-110" : ""
                            }`}
                            style={{
                              color:
                                hoveredContact === index
                                  ? colors.primary
                                  : "#9ca3af",
                            }}
                          >
                            <Icon className="w-3 h-3" />
                          </div>
                          <span
                            className={`text-xs transition-colors duration-300 truncate ${
                              hoveredContact === index
                                ? "text-gray-900"
                                : "text-gray-600"
                            }`}
                          >
                            {item.type === "email"
                              ? "Email"
                              : item.type === "phone"
                              ? "Phone"
                              : item.type === "whatsapp"
                              ? "WhatsApp"
                              : "Address"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Business Hours & Performance */}
              <div className="mb-4 grid grid-cols-2 gap-4">
                {/* Business Hours */}
                {storeData.operatingHours && (
                  <div>
                    <h4
                      className="text-xs font-medium mb-2 flex items-center space-x-1"
                      style={{ color: themeStyles.color }}
                    >
                      <Clock
                        className="w-3 h-3"
                        style={{ color: colors.primary }}
                      />
                      <span>Hours</span>
                    </h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>
                        Mon-Fri:{" "}
                        {storeData.operatingHours.weekdays.split(" - ")[1]}
                      </div>
                      <div>
                        Weekends:{" "}
                        {storeData.operatingHours.weekends.split(" - ")[1]}
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance */}
                <div>
                  <h4
                    className="text-xs font-medium mb-2"
                    style={{ color: themeStyles.color }}
                  >
                    Performance
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Response:</span>
                      <span
                        className="font-medium"
                        style={{ color: colors.primary }}
                      >
                        {storeData.responseTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg. delivery:</span>
                      <span className="font-medium text-green-600">
                        {storeData.shippingInfo.deliveryTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreInfo;
