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
  UserPlus,
  UserCheck,
  Users,
} from "lucide-react";
import ContactReveal from "./ContactReveal";
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaTiktok,
  FaLinkedin,
  FaPinterest,
  FaSnapchat,
  FaTwitter,
  FaGlobe,
} from "react-icons/fa";

const StoreInfo = ({
  store = {},
  user = {},
  reviews = [],
  onFollowChange,
  followData,
  setFollowData,
}) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [followersCount, setFollowersCount] = useState(
    store.stats?.followersCount || 0
  );

  const [followLoading, setFollowLoading] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);

  const formatFollowersCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(count % 1000000 === 0 ? 0 : 1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}K`;
    }
    return count.toString();
  };

  const handleFollow = async () => {
    if (followData.isFollowing) {
      setShowUnfollowConfirm(true);
      return;
    }

    try {
      setFollowLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/stores/${storeData._id}/follow`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setFollowData((prev) => ({
          ...prev,
          isFollowing: data.isFollowing,
        }));
        setFollowersCount(data.followersCount);

        // Notify parent component
        if (onFollowChange) {
          onFollowChange(data.isFollowing, data.followersCount);
        }
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (error) {
      console.error("Follow error:", error);
      alert("Something went wrong");
    } finally {
      setFollowLoading(false);
    }
  };

  const confirmUnfollow = async () => {
    try {
      setFollowLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/stores/${storeData._id}/follow`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setFollowData((prev) => ({
          ...prev,
          isFollowing: data.isFollowing,
        }));
        setFollowersCount(data.followersCount);

        // Notify parent component
        if (onFollowChange) {
          onFollowChange(data.isFollowing, data.followersCount);
        }
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (error) {
      console.error("Unfollow error:", error);
      alert("Something went wrong");
    } finally {
      setFollowLoading(false);
      setShowUnfollowConfirm(false);
    }
  };

  const storeData = store;
  const userData = user;
  const reviewsData = reviews.length > 0 ? reviews : Array(0).fill({});

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

  // Helper function to get platform icon
  const getPlatformData = (platform) => {
    const platformData = {
      facebook: {
        icon: FaFacebook,
        color: "#1877F2",
        hoverColor: "#166FE5",
      },
      instagram: {
        icon: FaInstagram,
        color: "#E4405F",
        hoverColor: "#D93B55",
      },
      youtube: {
        icon: FaYoutube,
        color: "#FF0000",
        hoverColor: "#E60000",
      },
      tiktok: {
        icon: FaTiktok,
        color: "#000000",
        hoverColor: "#333333",
      },
      linkedin: {
        icon: FaLinkedin,
        color: "#0A66C2",
        hoverColor: "#0958A5",
      },
      pinterest: {
        icon: FaPinterest,
        color: "#BD081C",
        hoverColor: "#A8071A",
      },
      snapchat: {
        icon: FaSnapchat,
        color: "#FFFC00",
        hoverColor: "#E6E300",
        textColor: "#000000", // Black text for yellow background
      },
      website: {
        icon: FaGlobe,
        color: "#6B7280",
        hoverColor: "#4B5563",
      },
      twitter: {
        icon: FaTwitter,
        color: "#1DA1F2",
        hoverColor: "#1A91DA",
      },
    };
    return (
      platformData[platform] || {
        icon: FaGlobe,
        color: "#6B7280",
        hoverColor: "#4B5563",
      }
    );
  };

  // Helper function to get platform label (keep this the same)
  const getPlatformLabel = (platform) => {
    const labels = {
      facebook: "Facebook",
      instagram: "Instagram",
      youtube: "YouTube",
      tiktok: "TikTok",
      linkedin: "LinkedIn",
      pinterest: "Pinterest",
      snapchat: "Snapchat",
      website: "Website",
      twitter: "Twitter",
    };
    return (
      labels[platform] || platform.charAt(0).toUpperCase() + platform.slice(1)
    );
  };

  // Create social links from the object structure - updated with brand data
  const socialLinks =
    storeData.socialLinks && typeof storeData.socialLinks === "object"
      ? Object.entries(storeData.socialLinks)
          .filter(([platform, url]) => {
            return (
              url &&
              typeof url === "string" &&
              url.trim() !== "" &&
              url.trim() !== "undefined" &&
              url.trim() !== "null"
            );
          })
          .map(([platform, url]) => {
            const platformData = getPlatformData(platform);
            return {
              icon: platformData.icon,
              label: getPlatformLabel(platform),
              url: url.startsWith("http") ? url : `https://${url}`,
              platform: platform,
              color: platformData.color,
              hoverColor: platformData.hoverColor,
              available: true,
            };
          })
      : [];

  return (
    <div className="py-4 sm:py-8" style={themeStyles}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Store Content */}
          <div className="lg:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-8">
              {/* Enhanced Store Image with Premium Features */}
              <div className="relative group flex-shrink-0 mx-auto sm:mx-0">
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
                      className={`w-24 h-24 sm:w-20 sm:h-20 rounded-full object-cover shadow-lg ${
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
                      <div title="Verified"
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

              <div className="flex-1 space-y-4 text-center sm:text-left">
                {/* Enhanced Store Header */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                    <h1
                      className="text-xl sm:text-2xl font-light tracking-wide"
                      style={{ color: themeStyles.color }}
                    >
                      {storeData.name}
                    </h1>

                    {/* Store badges */}
                    <div className="flex items-center justify-center sm:justify-start space-x-2">
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
                    <div className="flex items-center justify-center sm:justify-start space-x-2 sm:ml-auto">
                      {/* Follow Button */}
                      {/* Follow Button - Updated without outside colors */}
                      {/* Follow Button - Using theme colors with black/white text */}
                      {!followData.isOwnStore && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleFollow}
                            disabled={followLoading}
                            className={`flex items-center space-x-2 px-4 py-3 sm:py-2 rounded-full font-medium text-sm transition-all duration-300 min-h-[44px] ${
                              followData.isFollowing
                                ? "hover:opacity-80"
                                : "hover:opacity-90 shadow-md"
                            }`}
                            style={
                              followData.isFollowing
                                ? {
                                    backgroundColor: colors.light,
                                    color: "#000000",
                                    border: `1px solid ${colors.primary}`,
                                  }
                                : {
                                    backgroundColor: colors.primary,
                                    color: "#ffffff",
                                  }
                            }
                          >
                            {followLoading ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : followData.isFollowing ? (
                              <UserCheck className="w-4 h-4" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
                            )}
                            <span>
                              {followLoading
                                ? "Loading..."
                                : followData.isFollowing
                                ? "Following"
                                : "Follow"}
                            </span>
                            {/* Follow count badge */}
                            <span
                              className="px-2 py-1 text-xs rounded-full font-medium"
                              style={
                                followData.isFollowing
                                  ? {
                                      backgroundColor: colors.primary,
                                      color: "#ffffff",
                                    }
                                  : {
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.2)",
                                      color: "#ffffff",
                                    }
                              }
                            >
                              {formatFollowersCount(followersCount)}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Show followers count for store owner */}
                      {followData.isOwnStore && (
                        <div className="flex items-center space-x-2">
                          <span
                            className="flex items-center space-x-1 px-3 py-2 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: colors.light,
                              color: "#000000",
                              border: `1px solid ${colors.primary}`,
                            }}
                          >
                            <Users className="w-4 h-4" />
                            <span>
                              {formatFollowersCount(followersCount)} followers
                            </span>
                          </span>
                        </div>
                      )}
                      <button
                        onClick={handleShare}
                        className="flex items-center space-x-1 px-3 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 text-sm"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
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

                    <span className="text-xs sm:text-sm text-gray-500">
                      Member since{" "}
                      {storeData.createdAt
                        ? new Date(storeData.createdAt).getFullYear()
                        : "Unknown"}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p
                  className="text-sm sm:text-base leading-relaxed max-w-lg"
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 pt-2">
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
                      className="text-base sm:text-lg font-light tracking-wider"
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
                      style={{ color: colors.primary }}
                    >
                      {storeData.stats.totalOrdersOrBookings.toLocaleString()}
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
                      {storeData.stats.views || 0}
                    </p>
                    <p className="text-xs text-gray-500">Views</p>
                  </div>
                  <div className="text-center">
                    <p
                      className="text-lg font-semibold"
                      style={{ color: themeStyles.color }}
                    >
                      {formatLKR(storeData.stats.avgPurchaseAmount || 0)}
                    </p>
                    <p className="text-xs text-gray-500">Avg Order</p>
                  </div>
                </div>

                {/* Social Links */}
                {socialLinks.length > 0 && (
                  <div className="flex justify-center flex-wrap gap-3 pt-3">
                    {socialLinks.map((social) => {
                      const IconComponent = social.icon;

                      return (
                        <a
                          key={social.platform}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 group transform hover:scale-110 hover:shadow-lg min-h-[44px]"
                          style={{
                            background:
                              social.platform === "instagram"
                                ? "linear-gradient(45deg, #833ab4, #fd1d1d, #fcb045)"
                                : social.backgroundColor || social.color,
                            color: social.textColor || "#ffffff",
                          }}
                          onMouseEnter={(e) => {
                            if (social.platform !== "instagram") {
                              e.target.style.backgroundColor =
                                social.hoverColor;
                            }
                            e.target.style.transform = "scale(1.1)";
                            e.target.style.boxShadow = `0 8px 25px ${
                              social.backgroundColor || social.color
                            }40`;
                          }}
                          onMouseLeave={(e) => {
                            if (social.platform !== "instagram") {
                              e.target.style.backgroundColor =
                                social.backgroundColor || social.color;
                            }
                            e.target.style.transform = "scale(1)";
                            e.target.style.boxShadow = "none";
                          }}
                          title={social.label}
                        >
                          <IconComponent className="w-5 h-5" />
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
              className={`rounded-2xl p-4 sm:p-5 border shadow-sm ${
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
              {/* Contact Reveal Section */}
              <div className="mb-4">
                <h3
                  className="text-sm font-medium mb-3 flex items-center space-x-2"
                  style={{ color: themeStyles.color }}
                >
                  <span>Contact Details</span>
                  <div
                    className="w-6 h-px bg-gradient-to-r to-transparent"
                    style={{ backgroundColor: colors.primary }}
                  ></div>
                </h3>

                <ContactReveal store={storeData} />
              </div>

              {/* Business Hours & Performance */}
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business Hours */}
                {storeData.serviceSettings?.workingHours && (
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
                    <div className="text-xs text-gray-600">
                      {(() => {
                        const workingDays =
                          storeData.serviceSettings.workingDays || [];
                        const { start, end } =
                          storeData.serviceSettings.workingHours;

                        if (workingDays.length === 0) return "Closed";

                        // Group consecutive days
                        const dayOrder = [
                          "monday",
                          "tuesday",
                          "wednesday",
                          "thursday",
                          "friday",
                          "saturday",
                          "sunday",
                        ];
                        const dayAbbr = {
                          monday: "Mon",
                          tuesday: "Tue",
                          wednesday: "Wed",
                          thursday: "Thu",
                          friday: "Fri",
                          saturday: "Sat",
                          sunday: "Sun",
                        };

                        const sortedDays = workingDays.sort(
                          (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
                        );

                        // Simple grouping for common patterns
                        const isWeekdays =
                          sortedDays.length === 5 &&
                          [
                            "monday",
                            "tuesday",
                            "wednesday",
                            "thursday",
                            "friday",
                          ].every((day) => sortedDays.includes(day));

                        if (isWeekdays) {
                          return (
                            <div>
                              <div>Mon-Fri</div>
                              <div>
                                {start} - {end}
                              </div>
                            </div>
                          );
                        }

                        // For other patterns, show abbreviated list
                        const daysList = sortedDays
                          .map((day) => dayAbbr[day])
                          .join(", ");
                        return (
                          <div>
                            <div>{daysList}</div>
                            <div>
                              {start} - {end}
                            </div>
                          </div>
                        );
                      })()}
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
                        {storeData.responseTime >= 24
                          ? `${Math.floor(storeData.responseTime / 24)} days`
                          : `${storeData.responseTime || 0}h`}
                      </span>
                    </div>
                    {store.type === "product" && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg. delivery:</span>
                        <span className="font-medium text-green-600">
                          {storeData.shippingInfo?.deliveryDaysMin || 0} -{" "}
                          {storeData.shippingInfo?.deliveryDaysMax || 0} days
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unfollow Confirmation Modal */}
          {showUnfollowConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                <h3 className="text-lg font-medium mb-2">
                  Unfollow {storeData.name}?
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  You'll stop receiving updates about this store.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={confirmUnfollow}
                    disabled={followLoading}
                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    {followLoading ? "Unfollowing..." : "Unfollow"}
                  </button>
                  <button
                    onClick={() => setShowUnfollowConfirm(false)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreInfo;
