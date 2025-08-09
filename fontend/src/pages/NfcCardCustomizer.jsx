
import React, { useState } from 'react';
import * as QRCodeModule from 'qrcode.react';
const QRCode = QRCodeModule.default || QRCodeModule;

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { UploadCloud, BadgeCheck, Paintbrush, Eye, ShoppingCart } from 'lucide-react';

// ... rest of the component


const mockUser = {
  uid: 'user_123',
  isPremium: true,
  name: 'Maduka Neranga',
  email: 'maduka@aiocart.lk',
};

// Initialize all fields with non-null string defaults to prevent React errors
const mockStore = {
  storeName: 'AIO Cart Interiors',
  ownerName: 'Maduka Neranga',
  preferredName: 'Neranga',
  phone: '+94 77 123 4567',
  email: 'info@aiocart.lk',
  url: 'https://aiocart.lk/interiors',
  address: 'No 21, Colombo Road, Kandy',
  description: 'Elegant interior solutions for your living spaces.',
  businessCategory: 'Interior Design',
  businessHours: 'Mon-Fri: 9am–6pm',
  establishedYear: '2018',
  website: 'https://aiocart.lk/interiors',
  instagram: '@aiocart.lk',
  facebook: 'aiocartlk',
  whatsapp: '+94 77 123 4567',
  logoUrl: '',
};

const analyticsData = [
  { month: 'Apr', taps: 30 },
  { month: 'May', taps: 45 },
  { month: 'Jun', taps: 60 },
  { month: 'Jul', taps: 75 },
  { month: 'Aug', taps: 90 },
];

export default function NfcCardCustomizer() {
  const [activeTab, setActiveTab] = useState('Information');
  const [storeData, setStoreData] = useState(mockStore);
  const [quantity, setQuantity] = useState(25);
  const [templatePrice, setTemplatePrice] = useState(0);
  const [finishPrice, setFinishPrice] = useState(0);

  const tabs = [
    { name: 'Information', icon: <BadgeCheck size={16} /> },
    { name: 'Design', icon: <Paintbrush size={16} /> },
    { name: 'Layout', icon: <Eye size={16} /> },
    { name: 'Social', icon: <UploadCloud size={16} /> },
    { name: 'Order', icon: <ShoppingCart size={16} /> },
  ];

  const unitPrice =
    quantity === 25 ? 12.99 : quantity === 50 ? 9.99 : quantity === 100 ? 7.99 : 5.99;
  const totalPrice = (unitPrice * quantity + templatePrice + finishPrice).toFixed(2);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStoreData((prev) => ({ ...prev, [name]: value || '' }));
  };

  // Helper to safely render text with fallback empty string
  const safeText = (text) => (text ? text : '');

  return (
    <div className="min-h-screen bg-black text-white font-sans px-6 py-10">
      <h1 className="text-3xl font-bold text-center mb-6">NFC Business Card Customizer</h1>

      {/* Tabs */}
      <div className="flex justify-center space-x-4 mb-8 border-b border-gray-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`flex items-center space-x-1 px-4 py-2 rounded transition-all duration-200 ${
              activeTab === tab.name ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Card Preview */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-10">
        <div className="w-[350px] h-[200px] bg-gradient-to-br from-gray-800 to-black rounded-xl shadow-xl p-4">
          <h2 className="text-xl font-bold">{safeText(storeData.storeName)}</h2>
          <p className="text-sm text-gray-400">
            {safeText(storeData.preferredName) || safeText(storeData.ownerName)}
          </p>
          <p className="text-sm mt-2">{safeText(storeData.businessCategory)}</p>
          <div className="mt-4">
            <QRCode
              value={safeText(storeData.url) || 'https://aiocart.lk'}
              size={64}
              bgColor="#000000"
              fgColor="#ffffff"
            />
          </div>
        </div>

        <div className="w-[350px] h-[200px] bg-black border border-gray-700 rounded-xl p-4 relative">
          <p className="text-sm">{safeText(storeData.description)}</p>
          <div className="text-xs text-gray-400 mt-4 space-y-1">
            {safeText(storeData.phone) && <div>📞 {safeText(storeData.phone)}</div>}
            {safeText(storeData.email) && <div>✉️ {safeText(storeData.email)}</div>}
            {safeText(storeData.website) && <div>🔗 {safeText(storeData.website)}</div>}
            {safeText(storeData.instagram) && <div>📸 {safeText(storeData.instagram)}</div>}
            {safeText(storeData.facebook) && <div>📘 {safeText(storeData.facebook)}</div>}
            {safeText(storeData.whatsapp) && <div>💬 {safeText(storeData.whatsapp)}</div>}
          </div>
          <div className="absolute bottom-2 left-2 text-[10px] text-gray-600">aiocart.lk</div>
        </div>
      </div>

      {/* Analytics */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Analytics</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={analyticsData}>
            <XAxis dataKey="month" stroke="#ccc" />
            <YAxis stroke="#ccc" />
            <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none' }} />
            <Line type="monotone" dataKey="taps" stroke="#00FFAA" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tab Content */}
      {activeTab === 'Information' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            'storeName',
            'ownerName',
            'preferredName',
            'phone',
            'email',
            'url',
            'address',
            'description',
            'businessCategory',
            'businessHours',
            'establishedYear',
            'website',
          ].map((field) => (
            <input
              key={field}
              name={field}
              placeholder={field}
              value={storeData[field] || ''}
              onChange={handleInputChange}
              className="bg-gray-900 border border-gray-700 rounded px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
            />
          ))}
        </div>
      )}

      {activeTab === 'Social' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['instagram', 'facebook', 'whatsapp'].map((field) => (
            <input
              key={field}
              name={field}
              placeholder={field}
              value={storeData[field] || ''}
              onChange={handleInputChange}
              className="bg-gray-900 border border-gray-700 rounded px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
            />
          ))}
        </div>
      )}

      {activeTab === 'Order' && (
        <div className="max-w-md mx-auto bg-gray-900 border border-gray-700 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Place Your Order</h3>

          <label className="block mb-2">Select Quantity</label>
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full mb-4 bg-black border border-gray-700 rounded px-3 py-2"
          >
            <option value={25}>25 Cards</option>
            <option value={50}>50 Cards</option>
            <option value={100}>100 Cards</option>
            <option value={250}>250 Cards</option>
          </select>

          <label className="block mb-2">Select Template</label>
          <select
            onChange={(e) => setTemplatePrice(Number(e.target.value))}
            className="w-full mb-4 bg-black border border-gray-700 rounded px-3 py-2"
          >
            <option value={0}>Elegant Classic (Free)</option>
            <option value={1500}>Luxury Gold (+LKR 1500)</option>
            <option value={900}>Modern Minimal (+LKR 900)</option>
            <option value={1200}>Gradient Pro (+LKR 1200)</option>
            <option value={1800}>Tech Innovation (+LKR 1800)</option>
            <option value={2400}>Executive Elite (+LKR 2400)</option>
          </select>

          <label className="block mb-2">Select Finish</label>
          <select
            onChange={(e) => setFinishPrice(Number(e.target.value))}
            className="w-full mb-4 bg-black border border-gray-700 rounded px-3 py-2"
          >
            <option value={0}>Matte</option>
            <option value={600}>Glossy (+LKR 600)</option>
            <option value={1500}>Metallic (+LKR 1500)</option>
            <option value={900}>Textured (+LKR 900)</option>
          </select>

          <div className="text-right mt-4">
            <p className="text-sm text-gray-400">Unit Price: LKR {unitPrice}</p>
            <p className="text-lg font-bold text-white">Total: LKR {totalPrice}</p>
          </div>
        </div>
      )}
    </div>
  );
}
=======
import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Store,
  Phone,
  Mail,
  MapPin,
  Globe,
  Instagram,
  Facebook,
  MessageCircle,
  Clock,
  Calendar,
  Upload,
  Palette,
  Layout,
  Share2,
  Eye,
  Save,
  ShoppingCart,
  Star,
  Award,
  Zap,
  Sparkles,
  Crown,
  Diamond,
  Copy,
  Check,
  BarChart3,
  TrendingUp,
  Users,
  MousePointer2,
  RefreshCw,
  Trash2,
  Plus,
  Settings,
  Download,
  Undo,
  Redo,
  AlertTriangle,
  Monitor,
  Smartphone,
  Briefcase,
  Paintbrush,
  Camera,
  Layers,
  Move,
  RotateCcw,
  Sliders,
  Lightbulb,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  Info,
  Sun,
  Waves,
  Heart,
  Gem,
  Wand2,
  Cpu,
  Flame,
} from "lucide-react";

const NfcCardCustomizer = () => {
  // Mock user data
  const mockUser = {
    name: "Priya Wickramasinghe",
    email: "priya@aiocart.lk",
    isPremium: true,
    memberSince: "2023",
    totalOrders: 847,
    rating: 4.9,
  };

  // Store information state
  const [storeInfo, setStoreInfo] = useState({
    storeName: "Elegance Boutique",
    ownerName: "Priya Wickramasinghe",
    preferredName: "Priya",
    phone: "+94 77 123 4567",
    email: "hello@eleganceboutique.lk",
    storeUrl: "eleganceboutique.aiocart.lk",
    address: "123 Galle Road, Colombo 03",
    description:
      "Premium fashion boutique offering elegant clothing and accessories for the modern Sri Lankan woman.",
    category: "Fashion & Apparel",
    businessHours: "Mon-Sat: 9:00 AM - 8:00 PM",
    establishedYear: "2019",
    website: "https://eleganceboutique.lk",
    instagram: "@eleganceboutique_lk",
    facebook: "https://facebook.com/eleganceboutique",
    whatsapp: "+94 77 123 4567",
  });

  // Enhanced design state
  const [currentTemplate, setCurrentTemplate] = useState("elegant-classic");
  const [previewTemplate, setPreviewTemplate] = useState("elegant-classic");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPosition, setLogoPosition] = useState("top-left");
  const [logoSize, setLogoSize] = useState("medium");
  const [qrPosition, setQrPosition] = useState("bottom-right");
  const [typography, setTypography] = useState("elegant-serif");
  const [fontWeight, setFontWeight] = useState("normal");
  const [fontSize, setFontSize] = useState("medium");
  const [cardFinish, setCardFinish] = useState("matte");
  const [primaryColor, setPrimaryColor] = useState("#1a1a1a");
  const [accentColor, setAccentColor] = useState("#d4af37");
  const [cornerStyle, setCornerStyle] = useState("rounded");
  const [backgroundPattern, setBackgroundPattern] = useState("none");
  const [cardShadow, setCardShadow] = useState("subtle");
  const [elementSpacing, setElementSpacing] = useState("normal");
  const [textPositioning, setTextPositioning] = useState({
    storeName: "center",
    ownerName: "center",
  });
  const [showBack, setShowBack] = useState(false);
  const [flipAnimation, setFlipAnimation] = useState("3d");
  const [viewMode, setViewMode] = useState("2d"); // 2d, 3d, mockup
  const [mockupContext, setMockupContext] = useState("desk");

  // History state for undo/redo
  const [designHistory, setDesignHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // UI state
  const [activeTab, setActiveTab] = useState("information");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [designWarnings, setDesignWarnings] = useState([]);
  const [hoveredTemplate, setHoveredTemplate] = useState(null);
  // Add these new state variables
  const [backgroundType, setBackgroundType] = useState("gradient"); // gradient, solid, template
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [textColors, setTextColors] = useState({
    storeName: "#1a1a1a",
    ownerName: "#6b7280",
    category: "#9ca3af",
    contactText: "#374151",
  });

  const fileInputRef = useRef(null);

  const templateCategories = {
    business: {
      name: "Business Professional",
      icon: Briefcase,
      templates: ["elegant-classic", "executive-elite", "royal-elegance"],
    },
    creative: {
      name: "Creative & Modern",
      icon: Paintbrush,
      templates: ["modern-minimal", "gradient-pro", "vibrant-elegance"],
    },
    luxury: {
      name: "Luxury Premium",
      icon: Crown,
      templates: ["luxury-gold", "tech-innovation", "jewel-tones"],
    },
    colorful: {
      name: "Colorful Elegant",
      icon: Palette,
      templates: ["sunset-elegance", "ocean-breeze", "aurora-premium"],
    },
    neon: {
      name: "Neon & Electric",
      icon: Zap,
      templates: [
        "electric-blue",
        "neon-pink",
        "cyber-green",
        "plasma-purple",
        "laser-red",
        "toxic-lime",
        "hypernova-orange",
      ],
    },
  };

  const templates = {
    "elegant-classic": {
      name: "Elegant Classic",
      price: 0,
      gradient: "from-gray-50 to-white",
      icon: Star,
      description: "Timeless elegance with clean lines",
      category: "business",
      preview: "/api/placeholder/200/120",
    },
    "luxury-gold": {
      name: "Luxury Gold",
      price: 1500,
      gradient: "from-yellow-50 via-yellow-100 to-yellow-200",
      icon: Crown,
      description: "Premium gold accents and luxury feel",
      category: "luxury",
      preview: "/api/placeholder/200/120",
    },
    "modern-minimal": {
      name: "Modern Minimal",
      price: 900,
      gradient: "from-blue-50 to-indigo-50",
      icon: Zap,
      description: "Clean, contemporary design",
      category: "creative",
      preview: "/api/placeholder/200/120",
    },
    "gradient-pro": {
      name: "Gradient Pro",
      price: 1200,
      gradient: "from-purple-50 via-pink-50 to-purple-100",
      icon: Sparkles,
      description: "Dynamic gradients and modern appeal",
      category: "creative",
      preview: "/api/placeholder/200/120",
    },
    "tech-innovation": {
      name: "Tech Innovation",
      price: 1800,
      gradient: "from-green-50 via-emerald-50 to-green-100",
      icon: Award,
      description: "Cutting-edge tech-inspired design",
      category: "luxury",
      preview: "/api/placeholder/200/120",
    },
    "executive-elite": {
      name: "Executive Elite",
      price: 2400,
      gradient: "from-slate-50 via-gray-100 to-slate-100",
      icon: Diamond,
      description: "Ultimate premium executive styling",
      category: "business",
      preview: "/api/placeholder/200/120",
    },

    // New Colorful Elegant Templates
    "sunset-elegance": {
      name: "Sunset Elegance",
      price: 1600,
      gradient: "from-orange-100 via-pink-100 to-red-100",
      icon: Sun,
      description: "Warm sunset hues with sophisticated styling",
      category: "colorful",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#ff6b35",
        secondary: "#f7931e",
        accent: "#ff8a80",
        text: "#2d1b14",
      },
    },
    "ocean-breeze": {
      name: "Ocean Breeze",
      price: 1400,
      gradient: "from-cyan-100 via-teal-100 to-blue-200",
      icon: Waves,
      description: "Refreshing ocean tones with elegant touches",
      category: "colorful",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#0891b2",
        secondary: "#14b8a6",
        accent: "#67e8f9",
        text: "#0f172a",
      },
    },
    "aurora-premium": {
      name: "Aurora Premium",
      price: 2000,
      gradient: "from-violet-200 via-purple-100 to-fuchsia-200",
      icon: Star,
      description: "Mystical aurora colors with luxury appeal",
      category: "colorful",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#8b5cf6",
        secondary: "#a855f7",
        accent: "#c084fc",
        text: "#1e1b4b",
      },
    },
    "royal-elegance": {
      name: "Royal Elegance",
      price: 1800,
      gradient: "from-indigo-200 via-purple-200 to-blue-300",
      icon: Crown,
      description: "Regal blues and purples with sophisticated charm",
      category: "business",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#4338ca",
        secondary: "#6366f1",
        accent: "#8b5cf6",
        text: "#1e1b4b",
      },
    },
    "vibrant-elegance": {
      name: "Vibrant Elegance",
      price: 1300,
      gradient: "from-rose-200 via-pink-200 to-purple-300",
      icon: Heart,
      description: "Vibrant pinks with elegant sophistication",
      category: "creative",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#e11d48",
        secondary: "#ec4899",
        accent: "#f472b6",
        text: "#4c1d95",
      },
    },
    "jewel-tones": {
      name: "Jewel Tones",
      price: 2200,
      gradient: "from-emerald-200 via-teal-200 to-cyan-300",
      icon: Gem,
      description: "Rich emerald and sapphire luxury tones",
      category: "luxury",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#059669",
        secondary: "#0d9488",
        accent: "#10b981",
        text: "#064e3b",
      },
    },

    // NEW NEON & ELECTRIC TEMPLATES
    "electric-blue": {
      name: "Electric Blue",
      price: 1800,
      gradient: "from-blue-400 via-blue-500 to-cyan-400",
      icon: Zap,
      description: "High-voltage electric blue energy",
      category: "neon",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#3b82f6",
        secondary: "#06b6d4",
        accent: "#0ea5e9",
        text: "#1e3a8a",
      },
    },
    "neon-pink": {
      name: "Neon Pink",
      price: 1900,
      gradient: "from-pink-400 via-fuchsia-500 to-purple-500",
      icon: Heart,
      description: "Blazing hot pink neon vibes",
      category: "neon",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#ec4899",
        secondary: "#d946ef",
        accent: "#f472b6",
        text: "#831843",
      },
    },
    "cyber-green": {
      name: "Cyber Green",
      price: 2100,
      gradient: "from-green-400 via-emerald-500 to-teal-400",
      icon: Cpu,
      description: "Matrix-inspired cyber green glow",
      category: "neon",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#22c55e",
        secondary: "#10b981",
        accent: "#4ade80",
        text: "#14532d",
      },
    },
    "plasma-purple": {
      name: "Plasma Purple",
      price: 2000,
      gradient: "from-violet-500 via-purple-600 to-indigo-600",
      icon: Star,
      description: "Intense plasma purple energy field",
      category: "neon",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#8b5cf6",
        secondary: "#7c3aed",
        accent: "#a855f7",
        text: "#312e81",
      },
    },

    // ULTRA-HARD NEON GRADIENTS (Even more intense)
    "laser-red": {
      name: "Laser Red",
      price: 2500,
      gradient: "from-red-500 via-orange-500 to-yellow-400",
      icon: Flame,
      description: "Blazing laser red with fire intensity",
      category: "neon",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#ef4444",
        secondary: "#f97316",
        accent: "#fbbf24",
        text: "#7f1d1d",
      },
    },
    "toxic-lime": {
      name: "Toxic Lime",
      price: 2300,
      gradient: "from-lime-400 via-green-500 to-emerald-400",
      icon: Zap,
      description: "Radioactive lime green intensity",
      category: "neon",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#84cc16",
        secondary: "#22c55e",
        accent: "#65a30d",
        text: "#365314",
      },
    },
    "hypernova-orange": {
      name: "Hypernova Orange",
      price: 2400,
      gradient: "from-orange-400 via-red-500 to-pink-500",
      icon: Sun,
      description: "Explosive hypernova orange blast",
      category: "neon",
      preview: "/api/placeholder/200/120",
      colors: {
        primary: "#fb923c",
        secondary: "#ef4444",
        accent: "#f97316",
        text: "#9a3412",
      },
    },
  };

  // Color themes
  const colorThemes = {
    "corporate-blue": {
      primary: "#1e40af",
      accent: "#3b82f6",
      name: "Corporate Blue",
    },
    "luxury-gold": {
      primary: "#1a1a1a",
      accent: "#d4af37",
      name: "Luxury Gold",
    },
    "modern-mono": {
      primary: "#374151",
      accent: "#6b7280",
      name: "Modern Monochrome",
    },
    "vibrant-sunset": {
      primary: "#dc2626",
      accent: "#f59e0b",
      name: "Vibrant Sunset",
    },
    "forest-green": {
      primary: "#065f46",
      accent: "#10b981",
      name: "Forest Green",
    },
    "royal-purple": {
      primary: "#581c87",
      accent: "#a855f7",
      name: "Royal Purple",
    },
  };

  // Background patterns
  const backgroundPatterns = {
    none: { name: "None", pattern: "" },
    dots: {
      name: "Dots",
      pattern: "radial-gradient(circle, #00000008 1px, transparent 1px)",
    },
    lines: {
      name: "Lines",
      pattern: "linear-gradient(45deg, #00000005 25%, transparent 25%)",
    },
    grid: {
      name: "Grid",
      pattern:
        "linear-gradient(#00000008 1px, transparent 1px), linear-gradient(90deg, #00000008 1px, transparent 1px)",
    },
    geometric: {
      name: "Geometric",
      pattern:
        "repeating-linear-gradient(45deg, #00000003, #00000003 10px, transparent 10px, transparent 20px)",
    },
  };

  // Pricing tiers
  const pricingTiers = [
    { quantity: 25, price: 12990, popular: false },
    { quantity: 50, price: 9990, popular: true },
    { quantity: 100, price: 7990, popular: false },
    { quantity: 250, price: 5990, popular: false },
  ];

  // Save current state to history
  const saveToHistory = () => {
    const currentState = {
      storeInfo: { ...storeInfo },
      currentTemplate,
      logoFile,
      logoPosition,
      logoSize,
      typography,
      fontWeight,
      fontSize,
      primaryColor,
      accentColor,
      backgroundPattern,
      cardShadow,
      elementSpacing,
      textPositioning: { ...textPositioning },
      backgroundType,
      backgroundColor,
      textColors: { ...textColors },
    };
    const newHistory = designHistory.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    setDesignHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Design validation
  const validateDesign = () => {
    const warnings = [];

    // Check color contrast
    const getContrast = (color1, color2) => {
      // Simplified contrast check
      const c1 = parseInt(color1.replace("#", ""), 16);
      const c2 = parseInt(color2.replace("#", ""), 16);
      return Math.abs(c1 - c2) > 0x808080;
    };

    if (!getContrast(primaryColor, "#ffffff")) {
      warnings.push(
        "Primary color may not have enough contrast with white background"
      );
    }

    if (fontSize === "small" && storeInfo.storeName.length > 20) {
      warnings.push("Store name may be too long for small font size");
    }

    if (!logoFile) {
      warnings.push("Consider adding a logo for better brand recognition");
    }

    setDesignWarnings(warnings);
  };

  // Smart color suggestions
  const getSuggestedColors = () => {
    const templateColors = {
      "luxury-gold": [colorThemes["luxury-gold"], colorThemes["royal-purple"]],
      "modern-minimal": [
        colorThemes["corporate-blue"],
        colorThemes["modern-mono"],
      ],
      "tech-innovation": [
        colorThemes["forest-green"],
        colorThemes["corporate-blue"],
      ],
      "elegant-classic": [
        colorThemes["modern-mono"],
        colorThemes["luxury-gold"],
      ],
      "gradient-pro": [
        colorThemes["vibrant-sunset"],
        colorThemes["royal-purple"],
      ],
      "executive-elite": [
        colorThemes["modern-mono"],
        colorThemes["corporate-blue"],
      ],
    };
    return templateColors[currentTemplate] || [colorThemes["modern-mono"]];
  };

  useEffect(() => {
    validateDesign();
  }, [primaryColor, accentColor, fontSize, storeInfo.storeName, logoFile]);

  const addNotification = (message, type = "success") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  };

  const handleInputChange = (field, value) => {
    setStoreInfo((prev) => ({ ...prev, [field]: value }));
    saveToHistory();
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        addNotification("File size should be less than 2MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoFile(e.target.result);
        addNotification("Logo uploaded successfully!");
        saveToHistory();
      };
      reader.readAsDataURL(file);
    }
  };

  const applyColorTheme = (theme) => {
    setPrimaryColor(theme.primary);
    setAccentColor(theme.accent);
    addNotification(`Applied ${theme.name} theme`);
    saveToHistory();
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    addNotification("Copied to clipboard!");
    setTimeout(() => setCopiedField(""), 2000);
  };

  const getFilledFields = () => {
    return Object.entries(storeInfo).filter(
      ([key, value]) => value && value.trim() !== ""
    );
  };

  const generateQRCode = (data) => {
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="white"/>
        <rect x="10" y="10" width="80" height="80" fill="none" stroke="black" stroke-width="2"/>
        <text x="50" y="55" font-family="Arial" font-size="8" text-anchor="middle">QR</text>
      </svg>
    `)}`;
  };

  const getLogoSizeClass = () => {
    switch (logoSize) {
      case "small":
        return "w-6 h-6";
      case "medium":
        return "w-8 h-8";
      case "large":
        return "w-12 h-12";
      default:
        return "w-8 h-8";
    }
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case "small":
        return "text-lg";
      case "medium":
        return "text-xl";
      case "large":
        return "text-2xl";
      default:
        return "text-xl";
    }
  };

  const getFontWeightClass = () => {
    switch (fontWeight) {
      case "light":
        return "font-light";
      case "normal":
        return "font-normal";
      case "bold":
        return "font-bold";
      default:
        return "font-normal";
    }
  };

  const getSpacingClass = () => {
    switch (elementSpacing) {
      case "tight":
        return "space-y-1";
      case "normal":
        return "space-y-2";
      case "relaxed":
        return "space-y-4";
      default:
        return "space-y-2";
    }
  };

  const getShadowClass = () => {
    switch (cardShadow) {
      case "none":
        return "shadow-none";
      case "subtle":
        return "shadow-lg";
      case "medium":
        return "shadow-xl";
      case "strong":
        return "shadow-2xl";
      default:
        return "shadow-lg";
    }
  };

  const renderCard = (isBack = false, templateOverride = null) => {
    const template = templates[templateOverride || currentTemplate];

    // Fixed: Determine background based on type with proper gradient handling
    const getCardBackground = () => {
      switch (backgroundType) {
        case "solid":
          return backgroundColor;
        case "gradient":
          return `linear-gradient(135deg, ${primaryColor}80, ${accentColor}80)`; // 50% opacity
        case "gradient_low":
          return `linear-gradient(135deg, ${primaryColor}40, ${accentColor}40)`; // 25% opacity
        case "gradient_high":
          return `linear-gradient(135deg, ${primaryColor}CC, ${accentColor}CC)`; // 80% opacity
        case "template":
        default:
          return null;
      }
    };

    // Fixed: Get proper template gradient classes
    const getTemplateClasses = () => {
      if (backgroundType === "template" && template) {
        return `bg-gradient-to-br ${template.gradient}`;
      }
      return "";
    };

    // Fixed: Get inline styles only when needed
    const getInlineStyles = () => {
      const styles = {
        borderColor: primaryColor + "20",
      };

      // Only add background if not using template
      if (backgroundType !== "template") {
        const bg = getCardBackground();
        if (bg) {
          styles.background = bg;
        }
      }

      // Add background pattern
      if (
        backgroundPattern !== "none" &&
        backgroundPatterns[backgroundPattern]
      ) {
        styles.backgroundImage = backgroundPatterns[backgroundPattern].pattern;
        styles.backgroundSize =
          backgroundPattern === "grid"
            ? "20px 20px"
            : backgroundPattern === "dots"
            ? "20px 20px"
            : "40px 40px";
      }

      return styles;
    };

    const cardContent = (
      <div
        className={`
        relative w-80 h-48 border border-gray-200 
        ${cornerStyle === "rounded" ? "rounded-xl" : "rounded-none"} 
        ${getShadowClass()} 
        overflow-hidden transition-all duration-500 cursor-pointer 
        hover:shadow-xl transform hover:scale-105 
        ${getTemplateClasses()}
      `
          .replace(/\s+/g, " ")
          .trim()}
        style={getInlineStyles()}
        onClick={() => setShowBack(!showBack)}
      >
        {/* Card Front */}
        {!isBack && (
          <div
            className={`p-6 h-full flex flex-col justify-between ${getSpacingClass()}`}
          >
            {/* Logo */}
            {logoFile && (
              <div
                className={`absolute ${
                  logoPosition === "top-left"
                    ? "top-4 left-4"
                    : logoPosition === "center"
                    ? "top-4 left-1/2 transform -translate-x-1/2"
                    : "top-4 right-4"
                }`}
              >
                <img
                  src={logoFile}
                  alt="Logo"
                  className={`${getLogoSizeClass()} object-cover rounded`}
                />
              </div>
            )}

            {/* Premium Badge 
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
              <Crown size={10} />
            </div>
*/}
            {/* Store Name */}
            <div
              className={`${
                elementSpacing === "tight"
                  ? "mt-8"
                  : elementSpacing === "relaxed"
                  ? "mt-12"
                  : "mt-10"
              } ${
                textPositioning.storeName === "center"
                  ? "text-center"
                  : textPositioning.storeName === "left"
                  ? "text-left"
                  : "text-right"
              }`}
            >
              <h2
                className={`${getFontSizeClass()} ${getFontWeightClass()} ${
                  typography === "elegant-serif"
                    ? "font-serif"
                    : typography === "modern-sans"
                    ? "font-sans"
                    : typography === "classic-times"
                    ? "font-serif"
                    : "font-script"
                }`}
                style={{ color: textColors.storeName }}
              >
                {storeInfo.storeName}
              </h2>
              <p
                className={`text-sm mt-1 ${
                  textPositioning.ownerName === "center"
                    ? "text-center"
                    : textPositioning.ownerName === "left"
                    ? "text-left"
                    : "text-right"
                }`}
                style={{ color: textColors.ownerName }}
              >
                {storeInfo.preferredName || storeInfo.ownerName}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: textColors.category }}
              >
                {storeInfo.category}
              </p>
            </div>

            {/* QR Code */}
            <div
              className={`absolute ${
                qrPosition === "bottom-left"
                  ? "bottom-4 left-4"
                  : "bottom-4 right-4"
              }`}
            >
              <img
                src={generateQRCode(storeInfo.storeUrl)}
                alt="QR Code"
                className="w-12 h-12 border border-gray-300 rounded"
              />
            </div>
          </div>
        )}

        {/* Card Back */}
        {isBack && (
          <div className="p-4 h-full flex flex-col justify-between text-xs">
            <div className="space-y-2">
              {getFilledFields().map(([key, value]) => {
                if (
                  [
                    "storeName",
                    "ownerName",
                    "preferredName",
                    "category",
                  ].includes(key)
                )
                  return null;

                const getIcon = (key) => {
                  switch (key) {
                    case "phone":
                      return <Phone size={12} />;
                    case "email":
                      return <Mail size={12} />;
                    case "address":
                      return <MapPin size={12} />;
                    case "website":
                      return <Globe size={12} />;
                    case "instagram":
                      return <Instagram size={12} />;
                    case "facebook":
                      return <Facebook size={12} />;
                    case "whatsapp":
                      return <MessageCircle size={12} />;
                    case "businessHours":
                      return <Clock size={12} />;
                    case "establishedYear":
                      return <Calendar size={12} />;
                    default:
                      return <Globe size={12} />;
                  }
                };

                return (
                  <div key={key} className="flex items-center gap-2">
                    <span style={{ color: accentColor }}>{getIcon(key)}</span>
                    <span
                      className="truncate"
                      style={{ color: textColors.contactText }}
                    >
                      {value}
                    </span>
                  </div>
                );
              })}

              {storeInfo.description && (
                <div
                  className="mt-3 p-2 bg-gray-50 rounded text-xs"
                  style={{ color: textColors.contactText }}
                >
                  {storeInfo.description}
                </div>
              )}
            </div>

            {/* Branding */}
            <div className="flex justify-between items-end">
              <div className="text-xs text-gray-400">aiocart.lk</div>
              <div className="text-xs text-gray-500">Powered by NFC</div>
            </div>
          </div>
        )}
      </div>
    );

    // Rest of the 3D and mockup logic stays the same...
    if (viewMode === "3d") {
      return (
        <div className="transform-gpu perspective-1000">
          <div className="transform rotate-x-12 rotate-y-12">{cardContent}</div>
        </div>
      );
    }

    if (viewMode === "mockup") {
      return (
        <div className="relative">
          {mockupContext === "desk" && (
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-8 rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 to-amber-300/20 rounded-2xl"></div>
              <div className="relative">{cardContent}</div>
              <div className="absolute bottom-2 right-2 text-xs text-amber-600">
                On Desk
              </div>
            </div>
          )}
          {mockupContext === "hand" && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl">
              <div className="relative transform rotate-3">{cardContent}</div>
              <div className="absolute bottom-2 right-2 text-xs text-blue-600">
                In Hand
              </div>
            </div>
          )}
          {mockupContext === "holder" && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl">
              <div className="relative">
                <div className="bg-gray-300 h-2 w-full mb-2 rounded"></div>
                {cardContent}
              </div>
              <div className="absolute bottom-2 right-2 text-xs text-gray-600">
                Card Holder
              </div>
            </div>
          )}
        </div>
      );
    }

    return cardContent;
  };

  // Additional debugging function to test gradient rendering
  const debugGradients = () => {
    console.log("Current template:", currentTemplate);
    console.log("Template gradient:", templates[currentTemplate]?.gradient);
    console.log("Background type:", backgroundType);

    // Test if Tailwind gradient classes are working
    const testElement = document.createElement("div");
    testElement.className = "bg-gradient-to-br from-blue-50 to-indigo-50";
    document.body.appendChild(testElement);
    const computedStyle = window.getComputedStyle(testElement);
    console.log("Test gradient computed style:", computedStyle.background);
    document.body.removeChild(testElement);
  };

  // Call this function to debug gradient issues
  // debugGradients();

  const renderPricingModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Order Your NFC Cards
          </h2>
          <button
            onClick={() => setShowPricingModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {pricingTiers.map((tier) => (
            <div
              key={tier.quantity}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all relative ${
                tier.popular
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-2 left-4 bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
                  Most Popular
                </div>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {tier.quantity} Cards
                </div>
                <div className="text-xl font-semibold text-green-600 mt-1">
                  LKR {tier.price.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  LKR {Math.round(tier.price / tier.quantity)} per card
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-2">Your Design Summary:</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Template: {templates[currentTemplate].name}</div>
            <div>
              Finish: {cardFinish.charAt(0).toUpperCase() + cardFinish.slice(1)}
            </div>
            <div>
              Typography:{" "}
              {typography
                .replace("-", " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </div>
            <div>
              Corner:{" "}
              {cornerStyle.charAt(0).toUpperCase() + cornerStyle.slice(1)}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowPricingModal(false)}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Continue Designing
          </button>
          <button
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => {
                setIsLoading(false);
                setShowPricingModal(false);
                addNotification(
                  "Order placed successfully! We'll contact you soon.",
                  "success"
                );
              }, 2000);
            }}
            className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart size={16} />
                Place Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderInformationTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Store Name *
          </label>
          <input
            type="text"
            value={storeInfo.storeName}
            onChange={(e) => handleInputChange("storeName", e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Enter store name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Owner Name *
          </label>
          <input
            type="text"
            value={storeInfo.ownerName}
            onChange={(e) => handleInputChange("ownerName", e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Enter owner name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Name
          </label>
          <input
            type="text"
            value={storeInfo.preferredName}
            onChange={(e) => handleInputChange("preferredName", e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Display name (optional)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Category
          </label>
          <select
            value={storeInfo.category}
            onChange={(e) => handleInputChange("category", e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="Fashion & Apparel">Fashion & Apparel</option>
            <option value="Electronics">Electronics</option>
            <option value="Food & Beverage">Food & Beverage</option>
            <option value="Health & Beauty">Health & Beauty</option>
            <option value="Home & Garden">Home & Garden</option>
            <option value="Services">Services</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={storeInfo.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="+94 77 123 4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={storeInfo.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="hello@yourstore.lk"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Store URL
          </label>
          <div className="flex">
            <input
              type="text"
              value={storeInfo.storeUrl}
              onChange={(e) => handleInputChange("storeUrl", e.target.value)}
              className="flex-1 p-3 border border-gray-200 rounded-l-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="yourstore.aiocart.lk"
            />
            <button
              onClick={() =>
                copyToClipboard(`https://${storeInfo.storeUrl}`, "storeUrl")
              }
              className="px-3 border border-l-0 border-gray-200 rounded-r-lg hover:bg-gray-50 transition-colors"
            >
              {copiedField === "storeUrl" ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Established Year
          </label>
          <input
            type="number"
            value={storeInfo.establishedYear}
            onChange={(e) =>
              handleInputChange("establishedYear", e.target.value)
            }
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="2019"
            min="1900"
            max="2024"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Address
        </label>
        <textarea
          value={storeInfo.address}
          onChange={(e) => handleInputChange("address", e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          rows="2"
          placeholder="123 Galle Road, Colombo 03"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Hours
        </label>
        <input
          type="text"
          value={storeInfo.businessHours}
          onChange={(e) => handleInputChange("businessHours", e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          placeholder="Mon-Sat: 9:00 AM - 8:00 PM"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={storeInfo.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          rows="3"
          placeholder="Brief description of your business..."
        />
      </div>
    </div>
  );

  const renderSocialTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website URL
          </label>
          <input
            type="url"
            value={storeInfo.website}
            onChange={(e) => handleInputChange("website", e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="https://yourwebsite.lk"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instagram Handle
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-gray-500 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg">
              @
            </span>
            <input
              type="text"
              value={storeInfo.instagram.replace("@", "")}
              onChange={(e) =>
                handleInputChange(
                  "instagram",
                  "@" + e.target.value.replace("@", "")
                )
              }
              className="flex-1 p-3 border border-gray-200 rounded-r-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="yourbusiness_lk"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Facebook Page
          </label>
          <input
            type="url"
            value={storeInfo.facebook}
            onChange={(e) => handleInputChange("facebook", e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="https://facebook.com/yourbusiness"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WhatsApp Number
          </label>
          <input
            type="tel"
            value={storeInfo.whatsapp}
            onChange={(e) => handleInputChange("whatsapp", e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="+94 77 123 4567"
          />
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">NFC Features</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Instant contact saving to phone</li>
          <li>• One-tap social media follows</li>
          <li>• Direct website visits</li>
          <li>• WhatsApp message initiation</li>
          <li>• Analytics tracking for all interactions</li>
          <li>• Universal smartphone compatibility</li>
        </ul>
      </div>
    </div>
  );

  const renderDesignTab = () => (
    <div className="space-y-6">
      {/* Template Categories */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Choose Template by Category
        </h3>
        {Object.entries(templateCategories).map(([categoryKey, category]) => {
          const Icon = category.icon;
          return (
            <div key={categoryKey} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Icon size={20} className="text-gray-600" />
                <h4 className="font-medium text-gray-800">{category.name}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.templates.map((templateKey) => {
                  const template = templates[templateKey];
                  const TemplateIcon = template.icon;
                  return (
                    <div
                      key={templateKey}
                      className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        currentTemplate === templateKey
                          ? "border-black bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => {
                        setCurrentTemplate(templateKey);
                        saveToHistory();
                      }}
                      onMouseEnter={() => setHoveredTemplate(templateKey)}
                      onMouseLeave={() => setHoveredTemplate(null)}
                    >
                      {hoveredTemplate === templateKey && (
                        <div className="absolute inset-0 bg-black bg-opacity-75 rounded-lg flex items-center justify-center z-10">
                          <div className="text-white text-center">
                            <Eye size={24} className="mx-auto mb-2" />
                            <div className="text-sm">Preview</div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <TemplateIcon size={20} className="text-gray-600" />
                        {template.price > 0 ? (
                          <span className="text-sm font-semibold text-green-600">
                            LKR {template.price.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-blue-600">
                            Free
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-800">
                        {template.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.description}
                      </p>

                      {/* Mini Preview */}
                      <div className="mt-3 transform scale-50 origin-left">
                        {renderCard(false, templateKey)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Color Themes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Color Themes</h3>
          <button
            onClick={() => {
              const suggested = getSuggestedColors();
              if (suggested.length > 0) {
                applyColorTheme(suggested[0]);
              }
            }}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <Wand2 size={16} />
            Smart Suggestion
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(colorThemes).map(([key, theme]) => (
            <div
              key={key}
              className="p-3 border rounded-lg cursor-pointer hover:border-gray-300 transition-all"
              onClick={() => applyColorTheme(theme)}
            >
              <div className="flex gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.primary }}
                ></div>
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.accent }}
                ></div>
              </div>
              <div className="text-sm font-medium">{theme.name}</div>
            </div>
          ))}
        </div>

        {/* Custom Colors */}
        <div className="mt-4 p-4 border border-gray-200 rounded-lg">
          <h4 className="font-medium mb-3">Custom Colors</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    saveToHistory();
                  }}
                  className="w-12 h-12 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    saveToHistory();
                  }}
                  className="flex-1 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => {
                    setAccentColor(e.target.value);
                    saveToHistory();
                  }}
                  className="w-12 h-12 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => {
                    setAccentColor(e.target.value);
                    saveToHistory();
                  }}
                  className="flex-1 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Logo Upload
        </h3>
        <div className="flex items-start gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
          >
            {logoFile ? (
              <img
                src={logoFile}
                alt="Logo"
                className="w-20 h-20 object-cover rounded"
              />
            ) : (
              <Upload size={32} className="text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors mb-2"
            >
              Upload Logo
            </button>
            <p className="text-xs text-gray-500 mb-3">PNG, JPG up to 2MB</p>

            {/* Logo Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo Size
              </label>
              <div className="flex gap-2">
                {["small", "medium", "large"].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setLogoSize(size);
                      saveToHistory();
                    }}
                    className={`px-3 py-1 text-sm rounded ${
                      logoSize === size
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } transition-colors`}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Typography */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Typography</h3>
        <div className="space-y-4">
          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Style
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  key: "elegant-serif",
                  name: "Elegant Serif",
                  preview: "Elegance",
                },
                { key: "modern-sans", name: "Modern Sans", preview: "Modern" },
                {
                  key: "classic-times",
                  name: "Classic Times",
                  preview: "Classic",
                },
                {
                  key: "luxury-script",
                  name: "Luxury Script",
                  preview: "Luxury",
                },
              ].map((font) => (
                <div
                  key={font.key}
                  className={`p-3 border rounded-lg cursor-pointer text-center transition-all ${
                    typography === font.key
                      ? "border-black bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => {
                    setTypography(font.key);
                    saveToHistory();
                  }}
                >
                  <div
                    className={`text-lg ${
                      font.key === "elegant-serif"
                        ? "font-serif"
                        : font.key === "modern-sans"
                        ? "font-sans"
                        : font.key === "classic-times"
                        ? "font-serif"
                        : "font-script"
                    }`}
                  >
                    {font.preview}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{font.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Font Weight & Size */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Weight
              </label>
              <div className="flex gap-2">
                {["light", "normal", "bold"].map((weight) => (
                  <button
                    key={weight}
                    onClick={() => {
                      setFontWeight(weight);
                      saveToHistory();
                    }}
                    className={`px-3 py-1 text-sm rounded ${
                      fontWeight === weight
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } transition-colors`}
                  >
                    {weight.charAt(0).toUpperCase() + weight.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Size
              </label>
              <div className="flex gap-2">
                {["small", "medium", "large"].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setFontSize(size);
                      saveToHistory();
                    }}
                    className={`px-3 py-1 text-sm rounded ${
                      fontSize === size
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } transition-colors`}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Background Control */}
      <div className="mt-4 p-4 border border-gray-200 rounded-lg">
        <h4 className="font-medium mb-3">Background Control</h4>

        {/* Background Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "gradient", name: "Gradient" },
              { key: "solid", name: "Solid Color" },
              { key: "template", name: "Template Default" },
            ].map((type) => (
              <button
                key={type.key}
                onClick={() => {
                  setBackgroundType(type.key);
                  saveToHistory();
                }}
                className={`px-3 py-2 text-sm rounded transition-all ${
                  backgroundType === type.key
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Background Color (for solid type) */}
        {backgroundType === "solid" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => {
                  setBackgroundColor(e.target.value);
                  saveToHistory();
                }}
                className="w-12 h-12 rounded border border-gray-300"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => {
                  setBackgroundColor(e.target.value);
                  saveToHistory();
                }}
                className="flex-1 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Text Colors */}
      <div className="mt-4 p-4 border border-gray-200 rounded-lg">
        <h4 className="font-medium mb-3">Text Colors</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Name Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={textColors.storeName}
                onChange={(e) => {
                  setTextColors((prev) => ({
                    ...prev,
                    storeName: e.target.value,
                  }));
                  saveToHistory();
                }}
                className="w-10 h-10 rounded border border-gray-300"
              />
              <input
                type="text"
                value={textColors.storeName}
                onChange={(e) => {
                  setTextColors((prev) => ({
                    ...prev,
                    storeName: e.target.value,
                  }));
                  saveToHistory();
                }}
                className="flex-1 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-black focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Owner Name Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={textColors.ownerName}
                onChange={(e) => {
                  setTextColors((prev) => ({
                    ...prev,
                    ownerName: e.target.value,
                  }));
                  saveToHistory();
                }}
                className="w-10 h-10 rounded border border-gray-300"
              />
              <input
                type="text"
                value={textColors.ownerName}
                onChange={(e) => {
                  setTextColors((prev) => ({
                    ...prev,
                    ownerName: e.target.value,
                  }));
                  saveToHistory();
                }}
                className="flex-1 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-black focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={textColors.category}
                onChange={(e) => {
                  setTextColors((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }));
                  saveToHistory();
                }}
                className="w-10 h-10 rounded border border-gray-300"
              />
              <input
                type="text"
                value={textColors.category}
                onChange={(e) => {
                  setTextColors((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }));
                  saveToHistory();
                }}
                className="flex-1 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-black focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Text Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={textColors.contactText}
                onChange={(e) => {
                  setTextColors((prev) => ({
                    ...prev,
                    contactText: e.target.value,
                  }));
                  saveToHistory();
                }}
                className="w-10 h-10 rounded border border-gray-300"
              />
              <input
                type="text"
                value={textColors.contactText}
                onChange={(e) => {
                  setTextColors((prev) => ({
                    ...prev,
                    contactText: e.target.value,
                  }));
                  saveToHistory();
                }}
                className="flex-1 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-black focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Quick Text Color Presets */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Presets
          </label>
          <div className="flex gap-2 flex-wrap">
            {[
              {
                name: "Dark",
                colors: {
                  storeName: "#1a1a1a",
                  ownerName: "#374151",
                  category: "#6b7280",
                  contactText: "#374151",
                },
              },
              {
                name: "Light",
                colors: {
                  storeName: "#ffffff",
                  ownerName: "#e5e7eb",
                  category: "#d1d5db",
                  contactText: "#f3f4f6",
                },
              },
              {
                name: "Blue",
                colors: {
                  storeName: "#1e40af",
                  ownerName: "#3b82f6",
                  category: "#60a5fa",
                  contactText: "#1e40af",
                },
              },
              {
                name: "Gold",
                colors: {
                  storeName: "#d4af37",
                  ownerName: "#b8860b",
                  category: "#daa520",
                  contactText: "#b8860b",
                },
              },
            ].map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setTextColors(preset.colors);
                  saveToHistory();
                }}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Background Patterns */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Background Pattern
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(backgroundPatterns).map(([key, pattern]) => (
            <div
              key={key}
              className={`p-3 border rounded-lg cursor-pointer text-center transition-all ${
                backgroundPattern === key
                  ? "border-black bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => {
                setBackgroundPattern(key);
                saveToHistory();
              }}
            >
              <div
                className="w-8 h-8 mx-auto mb-2 border border-gray-300 rounded"
                style={{
                  backgroundImage: pattern.pattern,
                  backgroundSize:
                    key === "grid"
                      ? "8px 8px"
                      : key === "dots"
                      ? "8px 8px"
                      : "16px 16px",
                }}
              ></div>
              <div className="text-xs">{pattern.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Card Effects */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Card Effects
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shadow Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "none", name: "No Shadow" },
                { key: "subtle", name: "Subtle" },
                { key: "medium", name: "Medium" },
                { key: "strong", name: "Strong" },
              ].map((shadow) => (
                <button
                  key={shadow.key}
                  onClick={() => {
                    setCardShadow(shadow.key);
                    saveToHistory();
                  }}
                  className={`px-3 py-2 text-sm rounded transition-all ${
                    cardShadow === shadow.key
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {shadow.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Corner Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "rounded", name: "Rounded" },
                { key: "sharp", name: "Sharp" },
              ].map((corner) => (
                <button
                  key={corner.key}
                  onClick={() => {
                    setCornerStyle(corner.key);
                    saveToHistory();
                  }}
                  className={`px-3 py-2 text-sm rounded transition-all ${
                    cornerStyle === corner.key
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {corner.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card Finish */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Card Finish
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              key: "matte",
              name: "Matte",
              price: 0,
              description: "Smooth, non-reflective finish",
            },
            {
              key: "glossy",
              name: "Glossy",
              price: 600,
              description: "Shiny, reflective surface",
            },
            {
              key: "metallic",
              name: "Metallic",
              price: 1500,
              description: "Premium metallic coating",
            },
            {
              key: "textured",
              name: "Textured",
              price: 900,
              description: "Tactile textured surface",
            },
          ].map((finish) => (
            <div
              key={finish.key}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                cardFinish === finish.key
                  ? "border-black bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => {
                setCardFinish(finish.key);
                saveToHistory();
              }}
            >
              <div className="font-medium">{finish.name}</div>
              <div className="text-xs text-gray-500 mb-1">
                {finish.description}
              </div>
              {finish.price > 0 ? (
                <div className="text-xs text-green-600">
                  +LKR {finish.price.toLocaleString()}
                </div>
              ) : (
                <div className="text-xs text-blue-600">Included</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLayoutTab = () => (
    <div className="space-y-6">
      {/* Element Positioning */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Element Positioning
        </h3>

        {/* Logo Position */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo Position
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "top-left", name: "Top Left", icon: "↖" },
              { key: "center", name: "Center", icon: "↑" },
              { key: "top-right", name: "Top Right", icon: "↗" },
            ].map((position) => (
              <div
                key={position.key}
                className={`p-4 border rounded-lg cursor-pointer text-center transition-all ${
                  logoPosition === position.key
                    ? "border-black bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => {
                  setLogoPosition(position.key);
                  saveToHistory();
                }}
              >
                <div className="text-2xl mb-1">{position.icon}</div>
                <div className="text-sm">{position.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* QR Code Position */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            QR Code Position
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "bottom-left", name: "Bottom Left", icon: "↙" },
              { key: "bottom-right", name: "Bottom Right", icon: "↘" },
            ].map((position) => (
              <div
                key={position.key}
                className={`p-4 border rounded-lg cursor-pointer text-center transition-all ${
                  qrPosition === position.key
                    ? "border-black bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => {
                  setQrPosition(position.key);
                  saveToHistory();
                }}
              >
                <div className="text-2xl mb-1">{position.icon}</div>
                <div className="text-sm">{position.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Text Positioning */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Text Alignment
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name Position
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "left", name: "Left", icon: "←" },
                { key: "center", name: "Center", icon: "↔" },
                { key: "right", name: "Right", icon: "→" },
              ].map((align) => (
                <button
                  key={align.key}
                  onClick={() => {
                    setTextPositioning((prev) => ({
                      ...prev,
                      storeName: align.key,
                    }));
                    saveToHistory();
                  }}
                  className={`p-3 border rounded-lg transition-all flex items-center justify-center gap-2 ${
                    textPositioning.storeName === align.key
                      ? "border-black bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{align.icon}</span>
                  <span className="text-sm">{align.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Owner Name Position
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "left", name: "Left", icon: "←" },
                { key: "center", name: "Center", icon: "↔" },
                { key: "right", name: "Right", icon: "→" },
              ].map((align) => (
                <button
                  key={align.key}
                  onClick={() => {
                    setTextPositioning((prev) => ({
                      ...prev,
                      ownerName: align.key,
                    }));
                    saveToHistory();
                  }}
                  className={`p-3 border rounded-lg transition-all flex items-center justify-center gap-2 ${
                    textPositioning.ownerName === align.key
                      ? "border-black bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{align.icon}</span>
                  <span className="text-sm">{align.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Element Spacing */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Element Spacing
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "tight", name: "Tight", description: "Compact layout" },
            { key: "normal", name: "Normal", description: "Balanced spacing" },
            { key: "relaxed", name: "Relaxed", description: "Spacious layout" },
          ].map((spacing) => (
            <div
              key={spacing.key}
              className={`p-4 border rounded-lg cursor-pointer text-center transition-all ${
                elementSpacing === spacing.key
                  ? "border-black bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => {
                setElementSpacing(spacing.key);
                saveToHistory();
              }}
            >
              <div className="font-medium">{spacing.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {spacing.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Options */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Preview Options
        </h3>

        <div className="space-y-4">
          {/* View Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              View Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "2d", name: "2D View", icon: Monitor },
                { key: "3d", name: "3D View", icon: Layers },
                { key: "mockup", name: "Mockup", icon: Camera },
              ].map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.key}
                    onClick={() => setViewMode(mode.key)}
                    className={`p-3 border rounded-lg transition-all flex items-center justify-center gap-2 ${
                      viewMode === mode.key
                        ? "border-black bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-sm">{mode.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mockup Context */}
          {viewMode === "mockup" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mockup Context
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "desk", name: "On Desk" },
                  { key: "hand", name: "In Hand" },
                  { key: "holder", name: "Card Holder" },
                ].map((context) => (
                  <button
                    key={context.key}
                    onClick={() => setMockupContext(context.key)}
                    className={`p-3 border rounded-lg transition-all ${
                      mockupContext === context.key
                        ? "border-black bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {context.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Flip Animation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Flip Animation
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "3d", name: "3D Flip" },
                { key: "fade", name: "Fade Effect" },
              ].map((animation) => (
                <button
                  key={animation.key}
                  onClick={() => setFlipAnimation(animation.key)}
                  className={`p-3 border rounded-lg transition-all ${
                    flipAnimation === animation.key
                      ? "border-black bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {animation.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Advanced NFC Card Designer
              </h1>
              <p className="text-gray-600 mt-1">
                Create premium NFC-enabled business cards with advanced
                customization
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {mockUser.name}
                </div>
                <div className="flex items-center gap-1 text-sm text-yellow-600">
                  <Crown size={14} />
                  Premium Member
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex">
                  {[
                    { key: "information", label: "Information", icon: User },
                    { key: "design", label: "Design", icon: Palette },
                    { key: "layout", label: "Layout", icon: Layout },
                    { key: "social", label: "Social", icon: Share2 },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-colors ${
                          activeTab === tab.key
                            ? "text-black border-b-2 border-black bg-gray-50"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <Icon size={16} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "information" && renderInformationTab()}
                {activeTab === "design" && renderDesignTab()}
                {activeTab === "layout" && renderLayoutTab()}
                {activeTab === "social" && renderSocialTab()}
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Live Preview
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowBack(!showBack)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Flip Card"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <div className="text-xs text-gray-500">
                      {viewMode.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mb-6">
                  <div
                    className={
                      flipAnimation === "fade"
                        ? "transition-opacity duration-500"
                        : "transition-transform duration-700 transform-style-preserve-3d"
                    }
                  >
                    {renderCard(showBack)}
                  </div>
                </div>

                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500 mb-2">
                    {showBack ? "Back Side" : "Front Side"} • Click to flip
                  </p>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => setShowBack(false)}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        !showBack
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Front
                    </button>
                    <button
                      onClick={() => setShowBack(true)}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        showBack
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Back
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setShowPricingModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <ShoppingCart size={16} />
                    Order Cards
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        addNotification("PNG download feature coming soon!")
                      }
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <Download size={14} />
                      Download
                    </button>
                    <button
                      onClick={() =>
                        copyToClipboard(window.location.href, "design")
                      }
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <Share2 size={14} />
                      Share
                    </button>
                  </div>
                </div>

                {/* Smart Suggestions */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 size={16} className="text-blue-600" />
                    <h4 className="font-medium text-blue-900">
                      Smart Suggestions
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {getSuggestedColors().map((theme, index) => (
                      <button
                        key={index}
                        onClick={() => applyColorTheme(theme)}
                        className="w-full text-left p-2 bg-white rounded border hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: theme.primary }}
                            ></div>
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: theme.accent }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-700">
                            {theme.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    Pricing Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Template:</span>
                      <span className="font-medium">
                        {templates[currentTemplate].price === 0
                          ? "Free"
                          : `LKR ${templates[
                              currentTemplate
                            ].price.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Finish:</span>
                      <span className="font-medium">
                        {cardFinish === "matte"
                          ? "Included"
                          : `+LKR ${
                              cardFinish === "glossy"
                                ? "600"
                                : cardFinish === "metallic"
                                ? "1,500"
                                : "900"
                            }`}
                      </span>
                    </div>
                    {backgroundPattern !== "none" && (
                      <div className="flex justify-between">
                        <span>Pattern:</span>
                        <span className="font-medium">+LKR 200</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold text-base">
                      <span>Per Card:</span>
                      <span className="text-green-600">
                        LKR{" "}
                        {(
                          templates[currentTemplate].price +
                          (cardFinish === "glossy"
                            ? 600
                            : cardFinish === "metallic"
                            ? 1500
                            : cardFinish === "textured"
                            ? 900
                            : 0) +
                          (backgroundPattern !== "none" ? 200 : 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* NFC Benefits */}
                <div className="mt-6 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-100">
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <Zap size={16} />
                    Premium NFC Technology
                  </h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• Instant contact sharing</li>
                    <li>• Real-time analytics tracking</li>
                    <li>• Eco-friendly paperless solution</li>
                    <li>• Universal smartphone compatibility</li>
                    <li>• Professional impression guaranteed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPricingModal && renderPricingModal()}

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-40">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg flex items-center gap-2 animate-slide-up ${
              notification.type === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {notification.type === "success" ? (
              <Check size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            {notification.message}
          </div>
        ))}
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }

        .perspective-1000 {
          perspective: 1000px;
        }

        .rotate-x-12 {
          transform: rotateX(12deg);
        }

        .rotate-y-12 {
          transform: rotateY(12deg);
        }
      `}</style>
    </div>
  );
};

export default NfcCardCustomizer;

