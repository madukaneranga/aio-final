import React, { useState, useEffect } from "react";
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6"; // for the new X logo
import { Mail, Phone, MessageCircle } from "lucide-react";

export default function Maintenance() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [isCountdownFinished, setIsCountdownFinished] = useState(false);

  useEffect(() => {
  const targetDate = new Date("2025-08-10T15:30:00Z").getTime();

  const timer = setInterval(() => {
    const now = new Date().getTime();
    const difference = targetDate - now;

    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor(
        (difference % (1000 * 60 * 60)) / (1000 * 60)
      );
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    } else {
      setIsCountdownFinished(true);
      clearInterval(timer);
    }
  }, 1000);

  return () => clearInterval(timer);
}, []);


  const handleEmailSubmit = () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;

    setEmailStatus("subscribed");

    setTimeout(() => {
      setEmailStatus("");
      setEmail("");
    }, 2000);
  };

  const formatTime = (time) => time.toString().padStart(2, "0");

  return (
    <div className="min-h-screen w-full bg-black relative overflow-hidden">
      {/* Universe Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 40px),
            radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 30px),
            radial-gradient(white, rgba(255,255,255,.1) 2px, transparent 40px),
            radial-gradient(rgba(255,255,255,.4), rgba(255,255,255,.1) 2px, transparent 30px)
          `,
          backgroundSize: "550px 550px, 350px 350px, 250px 250px, 150px 150px",
          backgroundPosition: "0 0, 40px 60px, 130px 270px, 70px 100px",
        }}
      />

      {/* Main Container */}
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative z-10">
        {/* Central Content Card */}
        <div className="bg-white bg-opacity-10 backdrop-blur-lg border border-white border-opacity-20 rounded-3xl p-8 md:p-12 max-w-4xl w-full text-center shadow-2xl">
          {/* Logo and Brand */}
          <div className="mb-8 animate-pulse">
            <div
              className="text-6xl md:text-8xl text-white font-bold tracking-wider mb-6"
              style={{ textShadow: "0 0 20px rgba(255, 255, 255, 0.5)" }}
            >
              AIO
            </div>
            <p className="text-xl md:text-2xl text-gray-300 font-light tracking-widest">
              ALL IN ONE
            </p>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent mx-auto mt-4"></div>
          </div>

          {/* Shopping Cart Icon */}
          <div className="mb-8">
            <div className="text-4xl md:text-5xl text-white opacity-80 animate-bounce">
              🛒
            </div>
          </div>

          {/* Main Message */}
          <div className="mb-12">
            <h1 className="text-2xl md:text-4xl text-white font-semibold mb-6 leading-relaxed">
              We're Upgrading Your Shopping Experience
            </h1>
            <p className="text-lg md:text-xl text-gray-300 font-light leading-relaxed max-w-2xl mx-auto">
              Our ecommerce platform is temporarily offline while we implement
              exciting new features, enhanced security, and improved performance
              for your ultimate shopping journey.
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="mb-12">
            <h2 className="text-xl md:text-2xl text-white font-medium mb-8">
              We'll be back in:
            </h2>

            {!isCountdownFinished ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                {[
                  { label: "DAYS", value: timeLeft.days },
                  { label: "HOURS", value: timeLeft.hours },
                  { label: "MINUTES", value: timeLeft.minutes },
                  { label: "SECONDS", value: timeLeft.seconds },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="bg-white bg-opacity-15 backdrop-blur-md border border-white border-opacity-30 rounded-2xl p-6 hover:transform hover:-translate-y-1 hover:bg-opacity-20 transition-all duration-300 cursor-pointer"
                  >
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                      {formatTime(item.value)}
                    </div>
                    <div className="text-sm md:text-base text-gray-300 font-medium tracking-wider">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-green-500 bg-opacity-20 border border-green-400 border-opacity-50 rounded-2xl p-8 max-w-lg mx-auto">
                <div className="text-2xl md:text-3xl font-bold text-white mb-2">
                  🎉 We're Back Online! 🎉
                </div>
                <div className="text-base text-gray-300">
                  Redirecting you to our store...
                </div>
              </div>
            )}
          </div>

          {/* Email Notification */}
          <div className="mb-12">
            <h3 className="text-lg md:text-xl text-white font-medium mb-6">
              Get notified when we're back online
            </h3>
            <div className="flex flex-col md:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-6 py-4 bg-white bg-opacity-10 border border-white border-opacity-30 rounded-xl text-white placeholder-gray-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 focus:border-white focus:border-opacity-50 transition-all duration-300"
                onKeyPress={(e) => e.key === "Enter" && handleEmailSubmit()}
              />
              <button
                onClick={handleEmailSubmit}
                disabled={!email}
                className={`px-8 py-4 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                  emailStatus === "subscribed"
                    ? "bg-green-500 text-white focus:ring-green-500"
                    : "bg-white text-black hover:bg-opacity-90 focus:ring-white"
                }`}
              >
                {emailStatus === "subscribed" ? "✓ Subscribed!" : "Notify Me"}
              </button>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-white border-opacity-20 pt-8">
            <h3 className="text-lg md:text-xl text-white font-medium mb-6">
              Need immediate assistance?
            </h3>
            <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-8">
              {/* Email */}
              <a
                href="mailto:support@aio.com"
                className="flex items-center text-gray-300 hover:text-white transition-colors duration-300 hover:scale-105 transform"
              >
                <Mail className="w-5 h-5 mr-3" />
                <span className="text-lg">support@aio.com</span>
              </a>

              {/* Phone */}
              <a
                href="tel:+1234567890"
                className="flex items-center text-gray-300 hover:text-white transition-colors duration-300 hover:scale-105 transform"
              >
                <Phone className="w-5 h-5 mr-3" />
                <span className="text-lg">+94 74 114 5704</span>
              </a>

              {/* WhatsApp Business */}
              <a
                href="https://wa.me/1234567890" // Replace with your WhatsApp number (no +, spaces, or dashes)
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-gray-300 hover:text-white transition-colors duration-300 hover:scale-105 transform"
              >
                <MessageCircle className="w-5 h-5 mr-3" />
                <span className="text-lg">WhatsApp</span>
              </a>
            </div>

            {/* Social Media Links */}
            <div className="space-y-4">
              <h4 className="text-lg text-white font-medium">Stay connected</h4>
              <div className="flex justify-center gap-6">
                {[
                  {
                    icon: <FaFacebookF size={20} />,
                    title: "Facebook",
                    href: "https://facebook.com",
                  },
                  {
                    icon: <FaXTwitter size={20} />,
                    title: "Twitter / X",
                    href: "https://twitter.com",
                  },
                  {
                    icon: <FaInstagram size={20} />,
                    title: "Instagram",
                    href: "https://instagram.com",
                  },
                  {
                    icon: <FaLinkedinIn size={20} />,
                    title: "LinkedIn",
                    href: "https://linkedin.com",
                  },
                ].map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    title={social.title}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-white bg-opacity-10 rounded-full flex items-center justify-center text-white hover:bg-opacity-20 transition-all duration-300 transform hover:-translate-y-1 hover:scale-110"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            &copy; {new Date().getFullYear()} AIO - All In One. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
