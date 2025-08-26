import { useState, useEffect, useRef, useCallback } from 'react';

// Touch gesture configuration
const SWIPE_THRESHOLD = 50; // Minimum distance for swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity
const TOUCH_TIMEOUT = 500; // Long press duration

// Custom hook for touch gestures
const useTouchGestures = ({
  onSwipeLeft = () => {},
  onSwipeRight = () => {},
  onSwipeUp = () => {},
  onSwipeDown = () => {},
  onTap = () => {},
  onLongPress = () => {},
  onPinch = () => {},
  disabled = false,
} = {}) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  
  const longPressTimer = useRef(null);
  const touchStartTime = useRef(null);
  const initialDistance = useRef(null);

  // Calculate distance between two touch points (for pinch)
  const getTouchDistance = useCallback((touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (disabled) return;

    const touch = e.touches[0];
    const touches = e.touches;

    touchStartTime.current = Date.now();
    setTouchEnd(null);
    setIsLongPress(false);

    if (touches.length === 1) {
      // Single touch
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: touchStartTime.current,
      });

      // Start long press timer
      longPressTimer.current = setTimeout(() => {
        setIsLongPress(true);
        onLongPress(e);
      }, TOUCH_TIMEOUT);
    } else if (touches.length === 2) {
      // Multi-touch (pinch)
      setIsPinching(true);
      initialDistance.current = getTouchDistance(touches[0], touches[1]);
      
      // Clear long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, [disabled, onLongPress, getTouchDistance]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (disabled) return;

    const touches = e.touches;

    if (touches.length === 1) {
      // Single touch move - cancel long press
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    } else if (touches.length === 2 && isPinching) {
      // Pinch gesture
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      if (initialDistance.current) {
        const scale = currentDistance / initialDistance.current;
        onPinch({ scale, distance: currentDistance });
      }
    }
  }, [disabled, isPinching, getTouchDistance, onPinch]);

  // Handle touch end
  const handleTouchEnd = useCallback((e) => {
    if (disabled) return;

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (e.touches.length === 0) {
      // All touches ended
      setIsPinching(false);
      initialDistance.current = null;

      const touch = e.changedTouches[0];
      const touchEndTime = Date.now();
      
      setTouchEnd({
        x: touch.clientX,
        y: touch.clientY,
        time: touchEndTime,
      });

      if (touchStart && !isLongPress) {
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;
        const deltaTime = touchEndTime - touchStart.time;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const velocity = distance / deltaTime;

        // Check for swipe gestures
        if (distance > SWIPE_THRESHOLD && velocity > SWIPE_VELOCITY_THRESHOLD) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > 0) {
              onSwipeRight(e);
            } else {
              onSwipeLeft(e);
            }
          } else {
            // Vertical swipe
            if (deltaY > 0) {
              onSwipeDown(e);
            } else {
              onSwipeUp(e);
            }
          }
        } else if (distance < 10 && deltaTime < 300) {
          // Tap gesture (small movement, quick duration)
          onTap(e);
        }
      }

      // Reset states
      setTouchStart(null);
      setTouchEnd(null);
      setIsLongPress(false);
    }
  }, [disabled, touchStart, isLongPress, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap]);

  // Touch event handlers
  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  return {
    touchHandlers,
    touchStart,
    touchEnd,
    isLongPress,
    isPinching,
  };
};

// Hook specifically for chat list swipe gestures
export const useChatListSwipe = (onOpen, onClose, isOpen) => {
  const { touchHandlers } = useTouchGestures({
    onSwipeRight: () => {
      if (!isOpen) {
        onOpen();
      }
    },
    onSwipeLeft: () => {
      if (isOpen) {
        onClose();
      }
    },
  });

  return touchHandlers;
};

// Hook for pull-to-refresh gesture
export const usePullToRefresh = (onRefresh, threshold = 80) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    
    setPullDistance(distance);

    if (distance > 0) {
      // Prevent default scrolling when pulling down
      e.preventDefault();
    }
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || isRefreshing) return;

    setIsPulling(false);

    if (pullDistance > threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [isPulling, isRefreshing, pullDistance, threshold, onRefresh]);

  const pullToRefreshHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return {
    pullToRefreshHandlers,
    isPulling,
    pullDistance,
    isRefreshing,
    containerRef,
  };
};

export default useTouchGestures;