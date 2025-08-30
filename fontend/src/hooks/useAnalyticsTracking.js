import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const useAnalyticsTracking = () => {
  const { user } = useAuth();
  const [trackingEnabled, setTrackingEnabled] = useState(true);

  const trackEvent = useCallback(async (eventName, properties = {}) => {
    if (!trackingEnabled || !user) return;

    const eventData = {
      event: eventName,
      userId: user._id,
      storeId: user.storeId,
      timestamp: new Date().toISOString(),
      properties: {
        ...properties,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        currentUrl: window.location.href,
        currentPlan: user.package || 'basic',
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/track-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(eventData)
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }, [user, trackingEnabled]);

  // Specific tracking methods for common analytics events
  const trackAnalyticsView = useCallback((level, viewType = 'overview') => {
    trackEvent('analytics_view', {
      analyticsLevel: level,
      viewType,
      category: 'engagement'
    });
  }, [trackEvent]);

  const trackUpgradeClick = useCallback((currentLevel, targetLevel, source) => {
    trackEvent('upgrade_click', {
      currentLevel,
      targetLevel,
      source,
      category: 'conversion'
    });
  }, [trackEvent]);

  const trackFeatureAttempt = useCallback((feature, currentLevel, requiredLevel) => {
    trackEvent('feature_attempt', {
      feature,
      currentLevel,
      requiredLevel,
      category: 'engagement'
    });
  }, [trackEvent]);

  const trackExportAttempt = useCallback((format, currentLevel, success = false) => {
    trackEvent('export_attempt', {
      format,
      currentLevel,
      success,
      category: 'engagement'
    });
  }, [trackEvent]);

  const trackTabSwitch = useCallback((fromTab, toTab, currentLevel) => {
    trackEvent('tab_switch', {
      fromTab,
      toTab,
      currentLevel,
      category: 'navigation'
    });
  }, [trackEvent]);

  const trackTimeOnPage = useCallback((duration, currentLevel) => {
    trackEvent('time_on_analytics', {
      duration,
      currentLevel,
      category: 'engagement'
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackAnalyticsView,
    trackUpgradeClick,
    trackFeatureAttempt,
    trackExportAttempt,
    trackTabSwitch,
    trackTimeOnPage,
    setTrackingEnabled
  };
};

export default useAnalyticsTracking;