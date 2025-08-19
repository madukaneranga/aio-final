import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, ArrowRight, Play, Sparkles } from 'lucide-react';

// Simulating Chakra UI components with Tailwind (since Chakra isn't available in this environment)
// In a real project, you would import these from '@chakra-ui/react'
const Box = ({ children, className, ...props }) => <div className={className} {...props}>{children}</div>;
const Flex = ({ children, className, ...props }) => <div className={`flex ${className}`} {...props}>{children}</div>;
const Text = ({ children, className, ...props }) => <span className={className} {...props}>{children}</span>;
const Button = ({ children, variant, size, className, ...props }) => {
  const baseClass = "px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center justify-center space-x-2";
  const variantClass = variant === 'solid' ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-transparent border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm';
  return <button className={`${baseClass} ${variantClass} ${className}`} {...props}>{children}</button>;
};
const Badge = ({ children, className }) => <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${className}`}>{children}</span>;

// Framer Motion simulation (in real project: import { motion } from 'framer-motion')
const motion = {
  div: ({ children, initial, animate, transition, className, ...props }) => (
    <div className={className} {...props}>{children}</div>
  ),
  h1: ({ children, initial, animate, transition, className, ...props }) => (
    <h1 className={className} {...props}>{children}</h1>
  )
};

const EcommerceHero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const heroSlides = [
    {
      title: "Elevate Your Style",
      subtitle: "Premium Collection 2025",
      description: "Discover our curated selection of luxury fashion pieces that define modern elegance and sophistication.",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop",
      badge: "New Arrivals",
      color: "purple"
    },
    {
      title: "Sustainable Fashion", 
      subtitle: "Eco-Conscious Design",
      description: "Join the movement towards sustainable luxury with our environmentally responsible fashion collection.",
      image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=600&fit=crop",
      badge: "Eco-Friendly",
      color: "green"
    },
    {
      title: "Exclusive Drops",
      subtitle: "Limited Edition", 
      description: "Be among the first to own our limited edition pieces crafted by renowned designers worldwide.",
      image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=600&fit=crop",
      badge: "Limited",
      color: "red"
    }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { icon: "🚚", text: "Free worldwide shipping", delay: 0 },
    { icon: "💎", text: "Premium quality guarantee", delay: 0.1 },
    { icon: "🔄", text: "30-day easy returns", delay: 0.2 },
    { icon: "⚡", text: "24/7 customer support", delay: 0.3 }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <Box className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Animated Background Blobs */}
      <Box className="absolute inset-0 pointer-events-none">
        <Box className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <Box className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <Box className="absolute top-1/2 left-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </Box>

      {/* Navigation Bar */}
      <Flex className="relative z-20 items-center justify-between px-6 lg:px-12 py-6">
        <Flex className="items-center space-x-3">
          <Box className="p-2 bg-white/10 rounded-full backdrop-blur-sm">
            <Sparkles className="w-6 h-6 text-white" />
          </Box>
          <Text className="text-2xl font-bold text-white tracking-tight">LUXE</Text>
        </Flex>
        
        <Flex className="hidden md:flex items-center space-x-8">
          {['Collections', 'About', 'Contact'].map((item) => (
            <Text key={item} className="text-white/80 hover:text-white transition-colors cursor-pointer font-medium">
              {item}
            </Text>
          ))}
        </Flex>
        
        <Flex className="items-center space-x-4">
          <Box className="relative p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
            <ShoppingBag className="w-6 h-6 text-white" />
            <Box className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <Text className="text-xs text-white font-bold">3</Text>
            </Box>
          </Box>
          <Button variant="solid" size="sm" className="transform hover:scale-105">
            Sign In
          </Button>
        </Flex>
      </Flex>

      {/* Main Hero Content */}
      <Box className="relative z-10 container mx-auto px-6 lg:px-12">
        <motion.div
          className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]"
          initial="hidden"
          animate={isVisible ? "visible" : "hidden"}
          variants={containerVariants}
        >
          
          {/* Left Content */}
          <motion.div className="space-y-8" variants={itemVariants}>
            {/* Status Badge */}
            <Badge className={`bg-${heroSlides[currentSlide].color}-600/20 border border-${heroSlides[currentSlide].color}-500/30 backdrop-blur-sm text-${heroSlides[currentSlide].color}-300`}>
              <Box className={`w-2 h-2 bg-${heroSlides[currentSlide].color}-400 rounded-full mr-3 animate-pulse`} />
              {heroSlides[currentSlide].badge}
            </Badge>

            {/* Main Headlines */}
            <Box>
              <motion.h1 
                className="text-5xl lg:text-7xl font-black text-white leading-[0.9] mb-4"
                variants={itemVariants}
              >
                {heroSlides[currentSlide].title.split(' ').map((word, index) => (
                  <span 
                    key={index} 
                    className={`inline-block ${index === 1 ? 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent' : ''} mr-4`}
                  >
                    {word}
                  </span>
                ))}
              </motion.h1>
              
              <Text className="text-xl lg:text-2xl text-purple-300 font-light">
                {heroSlides[currentSlide].subtitle}
              </Text>
            </Box>

            <Text className="text-lg text-gray-300 max-w-xl leading-relaxed">
              {heroSlides[currentSlide].description}
            </Text>

            {/* Social Proof */}
            <Flex className="items-center space-x-3">
              <Flex className="space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </Flex>
              <Text className="text-white font-medium">4.9/5</Text>
              <Text className="text-gray-400">from 2,847 reviews</Text>
            </Flex>

            {/* CTA Buttons */}
            <Flex className="flex-col sm:flex-row gap-4">
              <Button variant="solid" className="group transform hover:scale-105 shadow-2xl">
                <ShoppingBag className="w-5 h-5" />
                <span>Shop Collection</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button variant="outline" className="group backdrop-blur-sm">
                <Play className="w-5 h-5" />
                <span>Watch Story</span>
              </Button>
            </Flex>

            {/* Feature Grid */}
            <Box className="grid grid-cols-2 gap-6 pt-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all"
                  variants={itemVariants}
                  style={{ animationDelay: `${feature.delay}s` }}
                >
                  <Text className="text-2xl">{feature.icon}</Text>
                  <Text className="text-sm text-gray-300 font-medium">{feature.text}</Text>
                </motion.div>
              ))}
            </Box>
          </motion.div>

          {/* Right Content - Product Showcase */}
          <motion.div className="relative" variants={itemVariants}>
            <Box className="relative group">
              {/* Main Product Card */}
              <Box className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 backdrop-blur-xl border border-white/10 transform group-hover:scale-[1.02] transition-all duration-500">
                <img 
                  src={heroSlides[currentSlide].image} 
                  alt="Featured Product"
                  className="w-full h-96 object-cover rounded-2xl transition-all duration-700 group-hover:scale-110"
                />
                
                {/* Floating Quality Badge */}
                <Box className="absolute top-6 right-6 bg-white/90 backdrop-blur-sm rounded-full p-4 animate-bounce shadow-xl">
                  <span className="text-2xl">💎</span>
                </Box>
                
                {/* Premium Label */}
                <Box className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-md text-white px-6 py-3 rounded-full border border-white/20">
                  <Text className="text-sm font-semibold">Premium Quality</Text>
                </Box>
              </Box>

              {/* Floating Discount Card */}
              <Box className="absolute -top-6 -left-6 bg-gradient-to-r from-red-500 to-pink-600 text-white p-6 rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform">
                <Text className="text-3xl font-black">50%</Text>
                <Text className="text-sm opacity-90">OFF</Text>
              </Box>

              {/* Floating Customer Stats */}
              <Box className="absolute -bottom-8 -right-8 bg-white text-gray-900 p-6 rounded-2xl shadow-2xl border border-gray-200">
                <Flex className="items-center space-x-4">
                  <Box className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <Text className="text-white text-lg font-bold">✓</Text>
                  </Box>
                  <Box>
                    <Text className="text-xl font-black text-gray-900">2.8K+</Text>
                    <Text className="text-sm text-gray-600">Happy Customers</Text>
                  </Box>
                </Flex>
              </Box>
            </Box>
          </motion.div>
        </motion.div>
      </Box>

      {/* Slide Navigation */}
      <Box className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <Flex className="space-x-3 bg-black/30 backdrop-blur-md p-2 rounded-full border border-white/10">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-12 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-white shadow-lg' 
                  : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </Flex>
      </Box>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .animate-slide-up {
          animation: slideUp 0.8s ease-out forwards;
        }
        
        .animate-slide-right {
          animation: slideRight 0.8s ease-out 0.3s forwards;
        }
      `}</style>
    </Box>
  );
};

export default EcommerceHero;