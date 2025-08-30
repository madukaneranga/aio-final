import { useImpressionContext } from '../contexts/ImpressionContext';

// Simple hook that provides access to impression tracking functionality
const useImpression = () => {
  return useImpressionContext();
};

export default useImpression;