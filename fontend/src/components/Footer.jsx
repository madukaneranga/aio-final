import React, { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Truck,
  Award,
  MapPin,
  Mail,
  Phone,
  ArrowUpRight,
  Star,
  CheckCircle,
  Globe,
  CreditCard,
  Users,
  Building,
} from "lucide-react";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSubscribe = async () => {
    if (!email) {
      setError("Please enter an email.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/email-subscriptions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Subscription failed");
        setIsLoading(false);
        return;
      }

      // Success
      setIsSubscribed(true);
      setIsLoading(false);

      setTimeout(() => {
        setIsSubscribed(false);
        setEmail("");
      }, 2500);
    } catch (err) {
      setError("Network error. Please try again later.");
      setIsLoading(false);
    }
  };

  const trustFeatures = [
    {
      icon: Shield,
      title: "Bank-Grade Security",
      desc: "SSL & encrypted transactions",
    },
    {
      icon: Truck,
      title: "Island-wide Delivery",
      desc: "Colombo to Jaffna in 24hrs",
    },
    {
      icon: Award,
      title: "Verified Sellers",
      desc: "Licensed Sri Lankan businesses",
    },
    {
      icon: CheckCircle,
      title: "Quality Guaranteed",
      desc: "100% authentic products",
    },
  ];

  const quickLinks = [
    {
      title: "Marketplace",
      links: [
        "Premium Stores",
        "Featured Products",
        "New Arrivals",
        "Top Sellers",
      ],
    },
    {
      title: "Sellers",
      links: [
        "Start Selling",
        "Business Account",
        "Seller Resources",
        "Success Stories",
      ],
    },
    {
      title: "Support",
      links: ["Help Center", "Live Chat", "Returns Policy", "Contact Us"],
    },
    {
      title: "Company",
      links: ["About AIO", "Careers", "Press", "Partnerships"],
    },
  ];

  return (
    <footer className="relative bg-black text-white overflow-hidden">
      {/* Dynamic background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.1), transparent 50%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(45deg, transparent 49%, rgba(255,255,255,0.03) 50%, transparent 51%)`,
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      {/* Trust Banner */}
      <div className="relative border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trustFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl transform group-hover:scale-105 transition-all duration-500 group-hover:from-white/20" />
                  <div className="relative p-4 text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 mb-3 rounded-full bg-white/10 group-hover:bg-white/20 transition-all duration-500 group-hover:scale-110">
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-medium mb-1 group-hover:text-white transition-colors duration-300">
                      {feature.title}
                    </h4>
                    <p className="text-white/60 font-light text-xs group-hover:text-white/80 transition-colors duration-300">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-white/10 via-transparent to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-xl" />
              <div className="relative">
                {/* Logo */}
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-500">
                    <span className="text-black font-bold text-lg">A</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-light tracking-wider">AIO</h2>
                    <p className="text-white/60 text-xs font-light">
                      All In One
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-white/80 font-light leading-relaxed mb-6 text-sm">
                  Sri Lanka's premier digital marketplace connecting authentic
                  local businesses with discerning customers.
                </p>

                {/* Newsletter */}
                <div className="relative">
                  <h4 className="text-sm font-medium mb-3 tracking-wide">
                    Stay Connected
                  </h4>
                  <div className="flex">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      className="flex-1 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-l-xl border border-white/20 focus:outline-none focus:border-white/40 placeholder-white/50 font-light transition-all duration-300 text-sm"
                    />
                    <button
                      onClick={handleSubscribe}
                      disabled={isSubscribed || isLoading}
                      className={`px-4 py-2 rounded-r-xl font-medium transition-all duration-500 text-sm ${
                        isSubscribed
                          ? "bg-green-500 text-white"
                          : "bg-white text-black hover:bg-white/90 hover:scale-105"
                      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isSubscribed ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : isLoading ? (
                        <span>Loading...</span>
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </button>
                    {error && <p className="mt-1 text-white-400 text-xs">{error}</p>}

                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {quickLinks.map((section, sectionIndex) => (
                <div key={sectionIndex} className="group">
                  <h4 className="text-sm font-medium mb-4 tracking-wide group-hover:text-white transition-colors duration-300">
                    {section.title}
                  </h4>
                  <ul className="space-y-2">
                    {section.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <a
                          href="#"
                          className="text-white/70 font-light hover:text-white transition-all duration-300 flex items-center group/link text-xs"
                        >
                          <span className="group-hover/link:translate-x-1 transition-transform duration-300">
                            {link}
                          </span>
                          <ArrowUpRight className="w-3 h-3 ml-1 opacity-0 group-hover/link:opacity-100 transition-all duration-300" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Info Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center group/contact cursor-pointer">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mr-3 group-hover/contact:bg-white/20 transition-all duration-300">
              <Mail className="w-3 h-3" />
            </div>
            <div>
              <p className="text-white font-medium group-hover/contact:text-white transition-colors text-sm">
                support@aio.lk
              </p>
              <p className="text-white/60 text-xs">24/7 Support</p>
            </div>
          </div>

          <div className="flex items-center group/contact cursor-pointer">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mr-3 group-hover/contact:bg-white/20 transition-all duration-300">
              <MapPin className="w-3 h-3" />
            </div>
            <div>
              <p className="text-white font-medium group-hover/contact:text-white transition-colors text-sm">
                Colombo, Sri Lanka
              </p>
              <p className="text-white/60 text-xs">Island-wide Service</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-6 text-white/60">
              <p className="font-light text-sm">
                &copy; {new Date().getFullYear()} AIO Sri Lanka. All rights
                reserved.
              </p>
              <div className="flex items-center space-x-4 text-xs">
                <span className="flex items-center">
                  <Lock className="w-3 h-3 mr-1" />
                  SSL Secured
                </span>
                <span className="flex items-center">
                  <CreditCard className="w-3 h-3 mr-1" />
                  Secure Payments
                </span>
                <span className="flex items-center">
                  <Building className="w-3 h-3 mr-1" />
                  Licensed Business
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/60 font-light text-xs">
                Proudly Sri Lankan
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
