import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import Level1Analytics from "../components/analytics/Level1Analytics";
import Level2Analytics from "../components/analytics/Level2Analytics";
import Level3Analytics from "../components/analytics/Level3Analytics";
import UpgradePrompt from "../components/analytics/UpgradePrompt";
import AnalyticsErrorBoundary from "../components/analytics/AnalyticsErrorBoundary";
import { AnalyticsDashboardSkeleton } from "../components/analytics/SkeletonLoader";
import useAnalyticsTracking from "../hooks/useAnalyticsTracking";
import { BarChart3, TrendingUp, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SalesAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [globalInsights, setGlobalInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const {
    trackAnalyticsView,
    trackTabSwitch,
    trackTimeOnPage,
    trackFeatureAttempt,
  } = useAnalyticsTracking();
  const startTimeRef = useRef(Date.now());
  const previousTabRef = useRef("overview");
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "store_owner" && user?.storeId) {
      fetchAnalytics();
    }
  }, [user]);

  // Track page view and time spent
  useEffect(() => {
    if (analytics?.analyticsLevel) {
      trackAnalyticsView(analytics.analyticsLevel, activeTab);
    }

    // Track time spent when user leaves or component unmounts
    return () => {
      if (startTimeRef.current) {
        const timeSpent = Date.now() - startTimeRef.current;
        trackTimeOnPage(
          Math.round(timeSpent / 1000),
          analytics?.analyticsLevel || 1
        );
      }
    };
  }, [
    analytics?.analyticsLevel,
    activeTab,
    trackAnalyticsView,
    trackTimeOnPage,
  ]);

  const handleUpgradeClick = () => {
    navigate("/sub-management");
  };
  // Track tab switches
  const handleTabSwitch = (newTab, canAccess) => {
    if (canAccess) {
      trackTabSwitch(
        previousTabRef.current,
        newTab,
        analytics?.analyticsLevel || 1
      );
      previousTabRef.current = newTab;
      setActiveTab(newTab);
    } else {
      trackFeatureAttempt(
        `${newTab}_tab`,
        analytics?.analyticsLevel || 1,
        newTab === "trends" ? 2 : 3
      );
    }
  };

  const fetchAnalytics = async () => {
    console.log("🔍 Fetching analytics for user:", {
      userId: user?._id,
      storeId: user?.storeId,
      role: user?.role,
      email: user?.email,
      timestamp: new Date().toISOString(),
    });

    try {
      setLoading(true);
      setError(null);

      if (!user?.storeId) {
        console.error("❌ No storeId found for user");
        throw new Error("No store ID found. Please contact support.");
      }

      console.log("📡 Making analytics request...");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/analytics/${user.storeId}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📊 Analytics response status:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      const data = await response.json();
      console.log("📈 Analytics data received:", {
        analyticsLevel: data.analyticsLevel,
        packageName: data.packageName,
        hasError: !!data.error,
        dataKeys: Object.keys(data),
        totalRevenue: data.totalRevenue,
        totalCount: data.totalCount,
      });

      if (!response.ok) {
        // Handle server errors but still try to use fallback data if available
        if (data.error) {
          console.warn(
            "⚠️ Server returned error with fallback data:",
            data.error
          );
          setAnalytics(data); // Use fallback data from server
          setError(
            `${data.error}${data.errorDetails ? " - " + data.errorDetails : ""}`
          );
        } else {
          throw new Error(
            `Server error: ${response.status} ${response.statusText}`
          );
        }
      } else {
        setAnalytics(data);
        console.log("✅ Analytics data set successfully");
      }

      // Fetch global insights if premium user
      if (data.analyticsLevel >= 3) {
        console.log("🌍 Fetching global insights for premium user...");
        try {
          const globalResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/api/analytics/global/insights`,
            {
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          console.log("🌍 Global insights response:", {
            status: globalResponse.status,
            ok: globalResponse.ok,
          });

          if (globalResponse.ok) {
            const globalData = await globalResponse.json();
            setGlobalInsights(globalData.globalInsights);
            console.log("✅ Global insights loaded successfully");
          } else {
            console.warn(
              "⚠️ Could not load global insights:",
              globalResponse.status
            );
          }
        } catch (globalError) {
          console.warn("❌ Global insights fetch error:", globalError);
        }
      }
    } catch (err) {
      console.error("❌ Analytics fetch error:", {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });

      // Set a more user-friendly error message
      let userFriendlyError = "Unable to load analytics data";

      if (err.message.includes("No store ID")) {
        userFriendlyError =
          "Your account is not properly set up. Please contact support.";
      } else if (
        err.message.includes("Failed to fetch") ||
        err.message.includes("NetworkError")
      ) {
        userFriendlyError =
          "Network error. Please check your connection and try again.";
      } else if (
        err.message.includes("403") ||
        err.message.includes("Access denied")
      ) {
        userFriendlyError =
          "Access denied. You may not have permission to view this data.";
      } else if (err.message.includes("404")) {
        userFriendlyError = "Store not found. Please verify your store setup.";
      }

      setError(userFriendlyError);

      // Set fallback analytics data to prevent blank screen
      setAnalytics({
        analyticsLevel: 1,
        packageName: "basic",
        totalRevenue: 0,
        totalCount: 0,
        avgValue: 0,
        topProducts: [],
        topServices: [],
        totalUniqueCustomers: 0,
        returningCustomers: 0,
        customerMixNewVsReturning: {
          new: 0,
          returning: 0,
          percentage: 0,
        },
        bestSellingItem: null,
        currency: "LKR",
        error: userFriendlyError,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "store_owner") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600">
            Only store owners can access sales analytics
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <AnalyticsDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Error Loading Analytics
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const analyticsLevel = analytics?.analyticsLevel || 1;
  const packageName = analytics?.packageName || "basic";

  const tabs = [
    {
      id: "overview",
      name: "Overview",
      icon: BarChart3,
      available: true,
    },
    {
      id: "trends",
      name: "Trends",
      icon: TrendingUp,
      available: analyticsLevel >= 2,
      upgradePrompt: analyticsLevel < 2 ? "Upgrade to Standard" : null,
    },
    {
      id: "global",
      name: "Global Insights",
      icon: Globe,
      available: analyticsLevel >= 3,
      upgradePrompt: analyticsLevel < 3 ? "Upgrade to Premium" : null,
    },
  ];

  return (
    <AnalyticsErrorBoundary>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center mr-4">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Analytics
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {packageName.charAt(0).toUpperCase() + packageName.slice(1)}{" "}
                    Plan • Level {analyticsLevel}
                  </p>
                </div>
              </div>

              {analyticsLevel < 3 && (
                <UpgradePrompt currentLevel={analyticsLevel} compact />
              )}
            </div>

            {/* Navigation Tabs */}
            <nav className="flex space-x-4 sm:space-x-8 mt-6 -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const canAccess = tab.available;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSwitch(tab.id, canAccess)}
                    disabled={!canAccess}
                    className={`
                    flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      isActive && canAccess
                        ? "border-black text-black"
                        : canAccess
                        ? "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        : "border-transparent text-gray-300 cursor-not-allowed"
                    }
                  `}
                  >
                    <Icon
                      className={`w-4 h-4 ${!canAccess ? "opacity-50" : ""}`}
                    />
                    <span>{tab.name}</span>
                    {tab.upgradePrompt && (
                      <span className="text-xs bg-black text-white px-2 py-1 rounded-full ml-2">
                        Pro
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {activeTab === "overview" && (
            <>
              {analyticsLevel === 1 && <Level1Analytics data={analytics} />}
              {analyticsLevel === 2 && <Level2Analytics data={analytics} />}
              {analyticsLevel >= 3 && (
                <Level3Analytics
                  data={analytics}
                  globalInsights={globalInsights}
                />
              )}
            </>
          )}

          {activeTab === "trends" && (
            <>
              {analyticsLevel >= 2 ? (
                <Level2Analytics
                  data={analytics}
                  viewMode="trends"
                  handleUpgradeClick={handleUpgradeClick}
                />
              ) : (
                <UpgradePrompt
                  currentLevel={analyticsLevel}
                  targetLevel={2}
                  feature="Historical Trends & Advanced Analytics"
                />
              )}
            </>
          )}

          {activeTab === "global" && (
            <>
              {analyticsLevel >= 3 ? (
                <Level3Analytics
                  data={analytics}
                  globalInsights={globalInsights}
                  viewMode="global"
                />
              ) : (
                <UpgradePrompt
                  currentLevel={analyticsLevel}
                  targetLevel={3}
                  feature="Global Market Insights & Competitive Analysis"
                />
              )}
            </>
          )}
        </div>
      </div>
    </AnalyticsErrorBoundary>
  );
};

export default SalesAnalytics;
