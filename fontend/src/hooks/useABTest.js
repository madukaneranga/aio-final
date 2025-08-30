import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

// A/B Test configurations
const AB_TESTS = {
  upgrade_prompt_style: {
    name: 'Upgrade Prompt Style',
    variants: [
      {
        id: 'control',
        name: 'Control - Standard Prompt',
        weight: 50,
        config: {
          style: 'standard',
          urgency: 'low',
          social_proof: false,
          discount: false
        }
      },
      {
        id: 'urgency',
        name: 'High Urgency with Limited Time',
        weight: 25,
        config: {
          style: 'urgent',
          urgency: 'high',
          social_proof: true,
          discount: '20% off first month',
          countdown: true
        }
      },
      {
        id: 'social_proof',
        name: 'Social Proof Emphasis',
        weight: 25,
        config: {
          style: 'social',
          urgency: 'medium',
          social_proof: true,
          testimonial: true,
          stats: '10,000+ sellers upgraded this month'
        }
      }
    ]
  },
  
  analytics_preview: {
    name: 'Analytics Preview Style',
    variants: [
      {
        id: 'minimal',
        name: 'Minimal Preview',
        weight: 50,
        config: {
          show_full_chart: false,
          blur_effect: true,
          preview_rows: 3
        }
      },
      {
        id: 'detailed',
        name: 'Detailed Preview',
        weight: 50,
        config: {
          show_full_chart: true,
          blur_effect: false,
          preview_rows: 5,
          show_tooltips: true
        }
      }
    ]
  }
};

const useABTest = (testName) => {
  const { user } = useAuth();
  const [variant, setVariant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Generate consistent hash for user to ensure they always get the same variant
  const getUserHash = (userId, testName) => {
    if (!userId) return Math.random();
    
    let hash = 0;
    const str = userId + testName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483648; // Normalize to 0-1
  };

  // Determine which variant to show
  const selectedVariant = useMemo(() => {
    if (!user || !AB_TESTS[testName]) return null;

    const test = AB_TESTS[testName];
    const userHash = getUserHash(user._id, testName);
    
    let cumulativeWeight = 0;
    const totalWeight = test.variants.reduce((sum, variant) => sum + variant.weight, 0);
    const threshold = userHash * totalWeight;

    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (threshold <= cumulativeWeight) {
        return variant;
      }
    }
    
    return test.variants[0]; // Fallback
  }, [user, testName]);

  useEffect(() => {
    if (selectedVariant) {
      setVariant(selectedVariant);
      setIsLoading(false);
      
      // Track A/B test assignment
      trackABTestAssignment(testName, selectedVariant.id);
    }
  }, [selectedVariant, testName]);

  const trackABTestAssignment = async (testName, variantId) => {
    if (!user) return;

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/track-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event: 'ab_test_assignment',
          properties: {
            testName,
            variantId,
            userId: user._id,
            timestamp: new Date().toISOString()
          },
          category: 'ab_test'
        })
      });
    } catch (error) {
      console.warn('Failed to track A/B test assignment:', error);
    }
  };

  const trackABTestConversion = async (conversionType = 'upgrade_click') => {
    if (!variant || !user) return;

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/track-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event: 'ab_test_conversion',
          properties: {
            testName,
            variantId: variant.id,
            conversionType,
            userId: user._id,
            timestamp: new Date().toISOString()
          },
          category: 'ab_test'
        })
      });
    } catch (error) {
      console.warn('Failed to track A/B test conversion:', error);
    }
  };

  return {
    variant,
    config: variant?.config || {},
    isLoading,
    trackConversion: trackABTestConversion
  };
};

// Hook for multiple A/B tests
const useMultipleABTests = (testNames = []) => {
  const tests = {};
  
  for (const testName of testNames) {
    tests[testName] = useABTest(testName);
  }
  
  const isLoading = Object.values(tests).some(test => test.isLoading);
  
  return { tests, isLoading };
};

// Component wrapper for A/B testing
const ABTestProvider = ({ testName, children }) => {
  const { variant, config, isLoading } = useABTest(testName);
  
  if (isLoading) {
    return children(null, {});
  }
  
  return children(variant, config);
};

export default useABTest;
export { useMultipleABTests, ABTestProvider, AB_TESTS };