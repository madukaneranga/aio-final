import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const FlashDealsBanner = ({
  // Timer props
  saleStartsInHours = 0,
  saleStartsInMinutes = 0,
  saleStartsInSeconds = 4,
  saleEndsInHours = 6,
  saleEndsInMinutes = 30,
  saleEndsInSeconds = 0,

  // Content props
  saleName = "MEGA FLASH SALE",
  saleSubtitle = "Limited time offers you can't miss",
  discountText = "UP TO 80% OFF",
  buttonText = "SHOP NOW",
  timerLabel = "Sale Starts In:",

  // Design props
  backgroundColor = "linear-gradient(135deg, #ff1744, #e91e63, #f50057)",
  backgroundImage = null, // URL for background image
  textColor = "#ffffff",
  accentColor = "#ffff00", // Yellow for discount text

  // Image props
  heroImage = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500&h=400&fit=crop&format=png", // Sample PNG-style sale image
  showHeroImage = true,

  // Products data
  products = [
    {
      id: 1,
      image:
        "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/sales%2Fsale.png?alt=media&token=131461b9-f22b-41fc-b8e8-3d467401d3d7",
      title: "Top deals",
      price: "LKR926.18",
      category: "Electronics",
    },
    {
      id: 2,
      image:
        "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/sales%2Fsale.png?alt=media&token=131461b9-f22b-41fc-b8e8-3d467401d3d7",
      title: "Tech essentials",
      price: "LKR953.86",
      category: "Gadgets",
    },
    {
      id: 3,
      image:
        "https://firebasestorage.googleapis.com/v0/b/all-in-one-98568.firebasestorage.app/o/sales%2Fsale.png?alt=media&token=131461b9-f22b-41fc-b8e8-3d467401d3d7",
      title: "Top deals",
      price: "LKR14,184.05",
      category: "Fashion",
    },
  ],

  onPage = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 4,
    seconds: 20,
  });
  const [saleStarted, setSaleStarted] = useState(false);

  // Auto-rotate products every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [products.length]);

  // Timer logic
  useEffect(() => {
    const now = new Date();
    const saleStartTime = new Date(
      now.getTime() +
        saleStartsInHours * 60 * 60 * 1000 +
        saleStartsInMinutes * 60 * 1000 +
        saleStartsInSeconds * 1000
    );
    const saleEndTime = new Date(
      saleStartTime.getTime() +
        saleEndsInHours * 60 * 60 * 1000 +
        saleEndsInMinutes * 60 * 1000 +
        saleEndsInSeconds * 1000
    );

    const updateTimer = () => {
      const currentTime = new Date();

      if (currentTime < saleStartTime) {
        setSaleStarted(false);
        const diff = saleStartTime - currentTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      } else if (currentTime < saleEndTime) {
        setSaleStarted(true);
        const diff = saleEndTime - currentTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      } else {
        setSaleStarted(false);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [
    saleStartsInHours,
    saleStartsInMinutes,
    saleStartsInSeconds,
    saleEndsInHours,
    saleEndsInMinutes,
    saleEndsInSeconds,
  ]);

  const nextProduct = () => {
    setCurrentIndex((prev) => (prev + 1) % products.length);
  };

  const prevProduct = () => {
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  const backgroundStyle = backgroundImage
    ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: backgroundColor };

  return (
    <section className="relative overflow-hidden" style={backgroundStyle}>
      {/* Background Pattern/Glow Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-20 w-48 h-48 bg-white rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white rounded-full blur-2xl"></div>
        {/* Geometric patterns */}
        <div className="absolute top-5 right-5 w-4 h-4 bg-yellow-300 rotate-45"></div>
        <div className="absolute bottom-20 left-20 w-6 h-6 bg-cyan-300 rotate-12"></div>
        <div className="absolute top-20 right-1/3 w-3 h-3 bg-pink-300 rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row items-stretch min-h-[500px]">
          {/* LEFT SIDE - Content */}
          <div
            className="flex-1 flex flex-col justify-center text-center lg:text-left px-4 sm:px-6 lg:px-8 py-12 lg:py-16"
            style={{ color: textColor }}
          >
            {/* Timer Badge */}
            <div className="inline-flex items-center gap-3 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 mb-6 mx-auto lg:mx-0 w-fit">
              <Clock className="w-4 h-4" />
              <span className="font-bold text-sm">
                {saleStarted ? "Sale Ends In:" : timerLabel}
              </span>
              <div className="flex gap-1">
                <span className="bg-white text-black px-2 py-1 rounded text-sm font-mono font-bold min-w-[30px]">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="bg-white text-black px-2 py-1 rounded text-sm font-mono font-bold min-w-[30px]">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="bg-white text-black px-2 py-1 rounded text-sm font-mono font-bold min-w-[30px]">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Main Content */}
            <h1 className="text-4xl lg:text-6xl font-black mb-4">{saleName}</h1>

            <div
              className="text-3xl lg:text-5xl font-black mb-6"
              style={{ color: accentColor }}
            >
              {discountText}
              <ArrowRight className="inline ml-4 w-8 h-8 lg:w-12 lg:h-12" />
            </div>

            <p className="text-lg lg:text-xl mb-8 opacity-90 max-w-2xl mx-auto lg:mx-0">
              {saleSubtitle}
            </p>

            {/* CTA Button */}
            {!onPage && saleStarted && (
              <Link to={`/sale`}>
                <button
                  type="button"
                  className="bg-white text-black font-bold text-lg px-8 py-4 rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-xl hover:scale-105 flex items-center gap-3 mx-auto lg:mx-0 w-fit"
                >
                  {buttonText}

                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            )}
          </div>

          {/* RIGHT SIDE - Hero Image (Desktop) */}
          {showHeroImage && (
            <div className="hidden lg:block flex-1">
              <img
                src={heroImage}
                alt="Sale Hero"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FlashDealsBanner;
