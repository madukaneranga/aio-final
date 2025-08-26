import { useState, useEffect, useCallback } from 'react';

// Breakpoint definitions
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1024
};

// Custom hook for responsive behavior
const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const [deviceType, setDeviceType] = useState('desktop');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  // Debounced resize handler to improve performance
  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    setWindowSize({ width, height });
    
    // Determine device type
    if (width < BREAKPOINTS.mobile) {
      setDeviceType('mobile');
      setIsMobile(true);
      setIsTablet(false);
      setIsDesktop(false);
    } else if (width < BREAKPOINTS.tablet) {
      setDeviceType('tablet');
      setIsMobile(false);
      setIsTablet(true);
      setIsDesktop(false);
    } else {
      setDeviceType('desktop');
      setIsMobile(false);
      setIsTablet(false);
      setIsDesktop(true);
    }
  }, []);

  useEffect(() => {
    // Initial check
    handleResize();

    // Debounced resize listener
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [handleResize]);

  // Utility functions
  const isScreenSize = useCallback((size) => {
    switch (size) {
      case 'mobile':
        return windowSize.width < BREAKPOINTS.mobile;
      case 'tablet':
        return windowSize.width >= BREAKPOINTS.mobile && windowSize.width < BREAKPOINTS.tablet;
      case 'desktop':
        return windowSize.width >= BREAKPOINTS.desktop;
      default:
        return false;
    }
  }, [windowSize.width]);

  const getResponsiveValue = useCallback((mobileValue, tabletValue, desktopValue) => {
    if (isMobile) return mobileValue;
    if (isTablet) return tabletValue;
    return desktopValue;
  }, [isMobile, isTablet]);

  // Check if device has touch capability
  const isTouchDevice = useCallback(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Get optimal chat list width based on screen size
  const getChatListWidth = useCallback(() => {
    if (isMobile) return '100%';
    if (isTablet) return '320px';
    return '360px';
  }, [isMobile, isTablet]);

  // Get chat interface layout classes
  const getChatLayoutClasses = useCallback(() => {
    const baseClasses = 'chat-responsive-container';
    return baseClasses;
  }, []);

  // Get chat list classes based on device
  const getChatListClasses = useCallback(() => {
    if (isMobile) return 'chat-list-mobile';
    if (isTablet) return 'chat-list-tablet';
    return 'chat-list-desktop';
  }, [isMobile, isTablet]);

  return {
    // Screen size info
    windowSize,
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    
    // Utility functions
    isScreenSize,
    getResponsiveValue,
    isTouchDevice,
    getChatListWidth,
    getChatLayoutClasses,
    getChatListClasses,
    
    // Breakpoints for reference
    breakpoints: BREAKPOINTS,
  };
};

// Hook for managing mobile chat list visibility
export const useMobileChatList = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile } = useResponsive();

  const openChatList = useCallback(() => {
    if (isMobile) {
      setIsOpen(true);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }
  }, [isMobile]);

  const closeChatList = useCallback(() => {
    setIsOpen(false);
    // Restore background scrolling
    document.body.style.overflow = 'unset';
  }, []);

  const toggleChatList = useCallback(() => {
    if (isOpen) {
      closeChatList();
    } else {
      openChatList();
    }
  }, [isOpen, openChatList, closeChatList]);

  // Auto-close on desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      closeChatList();
    }
  }, [isMobile, isOpen, closeChatList]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return {
    isOpen,
    openChatList,
    closeChatList,
    toggleChatList,
    isMobile,
  };
};

export default useResponsive;