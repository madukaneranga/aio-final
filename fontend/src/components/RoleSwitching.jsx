import React, { useState, useEffect } from "react";
import { ShoppingBag, Store, ArrowLeftRight } from "lucide-react";

const RoleSwitching = ({ currentRole, isTransitioning = false }) => {
  // Role configuration
  const roleConfig = {
    customer: {
      icon: ShoppingBag,
      title: "Customer Mode",
      subtitle: "Browse and purchase products",
      fromText: "Shopping Mode",
      toText: "Store Management",
    },
    store_owner: {
      icon: Store,
      title: "Store Owner Mode",
      subtitle: "Manage your store and products",
      fromText: "Store Management",
      toText: "Shopping Mode",
    },
  };

  const getTargetRole = () =>
    currentRole === "customer" ? "store_owner" : "customer";
  const currentConfig = roleConfig[currentRole] || {};
  const targetConfig = roleConfig[getTargetRole()] || {};

  const CurrentIcon = currentConfig.icon || (() => null);
  const TargetIcon = targetConfig.icon || (() => null);

  return (
    <>
      {/* Elegant Role Switching Overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Sophisticated Background */}
          <div className="absolute inset-0 bg-black">
            {/* Subtle radial patterns */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,white_0%,transparent_50%)] animate-pulse"></div>
              <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,white_0%,transparent_50%)] animate-pulse"
                style={{ animationDelay: "1s" }}
              ></div>
            </div>

            {/* Geometric line elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute top-1/4 left-1/4 w-px h-32 bg-white/8 rotate-45 animate-fade-in"
                style={{ animationDelay: "0.5s" }}
              ></div>
              <div
                className="absolute top-3/4 right-1/4 w-px h-32 bg-white/8 -rotate-45 animate-fade-in"
                style={{ animationDelay: "0.7s" }}
              ></div>
              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-px bg-white/8 animate-fade-in"
                style={{ animationDelay: "0.9s" }}
              ></div>
              <div
                className="absolute top-1/3 right-1/3 w-24 h-px bg-white/6 rotate-90 animate-fade-in"
                style={{ animationDelay: "1.1s" }}
              ></div>
            </div>

            {/* Floating minimal elements */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-20 animate-float"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                    animationDelay: `${Math.random() * 4}s`,
                    animationDuration: `${4 + Math.random() * 2}s`,
                  }}
                ></div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="relative z-10 text-center">
            {/* Role Transition Visual */}
            <div className="mb-16 flex items-center justify-center space-x-16">
              {/* Current Role (Fading Out) */}
              <div
                className="text-center animate-fade-out"
                style={{ animationDelay: "0.5s" }}
              >
                <div className="relative p-8 mb-6">
                  <div className="absolute inset-0 border border-white/15 rounded-full animate-shrink"></div>
                  <CurrentIcon className="w-10 h-10 text-white/40 relative z-10" />
                </div>
                <p className="text-white/30 text-sm font-light tracking-wider uppercase">
                  {currentConfig.fromText}
                </p>
              </div>

              {/* Elegant Transition Indicator */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <ArrowLeftRight className="w-6 h-6 text-white/60 animate-pulse" />
                  <div className="absolute -inset-2 border border-white/10 rounded-full animate-ping opacity-20"></div>
                </div>
                <div className="w-20 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>

              {/* Target Role (Fading In) */}
              <div className="text-center animate-fade-in-scale">
                <div className="relative p-8 mb-6">
                  <div className="absolute inset-0 border border-white/30 rounded-full animate-glow-ring"></div>
                  <div className="absolute inset-2 border border-white/10 rounded-full animate-pulse"></div>
                  <TargetIcon className="w-10 h-10 text-white relative z-10" />
                </div>
                <p className="text-white text-sm font-light tracking-wider uppercase">
                  {currentConfig.toText}
                </p>
              </div>
            </div>

            {/* Elegant Typography */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-6xl md:text-7xl font-thin text-white tracking-[0.2em]">
                  <span
                    className="inline-block animate-fade-in-up"
                    style={{ animationDelay: "0.2s" }}
                  >
                    SWITCHING
                  </span>
                </h1>
                <h2
                  className="text-2xl md:text-3xl font-extralight text-white/80 tracking-[0.3em] animate-fade-in-up"
                  style={{ animationDelay: "0.4s" }}
                >
                  ROLES
                </h2>
              </div>

              <div
                className="animate-fade-in-up"
                style={{ animationDelay: "0.6s" }}
              >
                <div className="w-24 h-px bg-white/30 mx-auto mb-4"></div>
                <p className="text-white/50 text-base font-light tracking-wide">
                  Transitioning to {currentConfig.toText.toLowerCase()}
                </p>
              </div>
            </div>

            {/* Minimalist Progress */}
            <div className="mt-20 flex justify-center">
              <div className="relative w-48">
                <div className="h-px bg-white/10"></div>
                <div className="absolute top-0 left-0 h-px bg-white/40 animate-progress-elegant"></div>
              </div>
            </div>
          </div>

          {/* Refined Corner Accents */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-12 left-12 w-12 h-12 border-l border-t border-white/15 animate-fade-in"></div>
            <div
              className="absolute top-12 right-12 w-12 h-12 border-r border-t border-white/15 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            ></div>
            <div
              className="absolute bottom-12 left-12 w-12 h-12 border-l border-b border-white/15 animate-fade-in"
              style={{ animationDelay: "0.6s" }}
            ></div>
            <div
              className="absolute bottom-12 right-12 w-12 h-12 border-r border-b border-white/15 animate-fade-in"
              style={{ animationDelay: "0.9s" }}
            ></div>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-out {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0.2;
            transform: scale(0.9);
          }
        }

        @keyframes fade-in-scale {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 0.3;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shrink {
          from {
            transform: scale(1);
            opacity: 0.3;
          }
          to {
            transform: scale(0.8);
            opacity: 0.1;
          }
        }

        @keyframes glow-ring {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
            transform: scale(1.05);
          }
        }

        @keyframes progress-elegant {
          from {
            width: 0;
            opacity: 0.3;
          }
          to {
            width: 100%;
            opacity: 0.8;
          }
        }

        @keyframes shimmer {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(180deg);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in {
          animation: fade-in 1.2s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-out {
          animation: fade-out 1.5s ease-out forwards;
        }

        .animate-fade-in-scale {
          animation: fade-in-scale 2s ease-out forwards;
          opacity: 0;
        }

        .animate-shrink {
          animation: shrink 1.5s ease-out forwards;
        }

        .animate-glow-ring {
          animation: glow-ring 2s ease-in-out infinite;
        }

        .animate-progress-elegant {
          animation: progress-elegant 2.5s ease-out forwards;
        }

        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default RoleSwitching;
