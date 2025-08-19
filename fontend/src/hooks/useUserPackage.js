import { useState, useCallback, useMemo } from "react";

const useUserPackage = () => {
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(null);

  // This helper transforms raw usage data into your structured object
  const buildUsageInfo = (data) => ({
    usageInfo: data || {},
    errorInfo: null,
    planInfo: data?.plan || "none",
    limitsInfo: data?.limits || {},
    productsInfo: {
      count: data?.usage?.products?.count || 0,
      images: data?.usage?.products?.images || 0,
      limitReached: data?.usage?.products?.limitReached || false,
      imageLimitReached: data?.usage?.products?.imageLimitReached || false,
    },
    servicesInfo: {
      count: data?.usage?.services?.count || 0,
      images: data?.usage?.services?.images || 0,
      limitReached: data?.usage?.services?.limitReached || false,
      imageLimitReached: data?.usage?.services?.imageLimitReached || false,
    },
    headerImagesInfo: {
      count: data?.usage?.headerImages?.count || 0,
      limitReached: data?.usage?.headerImages?.limitReached || false,
    },
    variantsInfo: {
      used: data?.usage?.variants?.used || false,
      allowed: data?.usage?.variants?.allowed || false,
      violated: data?.usage?.variants?.violated || false,
    },
  });

  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/usage-summary`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("Failed to fetch usage summary");

      const data = await res.json();
      setUsage(data);

      // Return the structured data immediately
      return buildUsageInfo(data);
    } catch (err) {
      setError(err.message);
      return {
        usageInfo: {},
        errorInfo: err.message,
        planInfo: "none",
        limitsInfo: {},
        productsInfo: { count: 0, images: 0, limitReached: false, imageLimitReached: false },
        servicesInfo: { count: 0, images: 0, limitReached: false, imageLimitReached: false },
        headerImagesInfo: { count: 0, limitReached: false },
        variantsInfo: { used: false, allowed: false, violated: false },
      };
    }
  }, []);

  // Memoize derived info from usage state for component re-render
  const memoizedInfo = useMemo(() => buildUsageInfo(usage), [usage]);

  return {
    ...memoizedInfo,
    errorInfo: error || memoizedInfo.errorInfo,
    loadUsage,
  };
};

export default useUserPackage;
