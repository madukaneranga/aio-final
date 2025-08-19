import React, { useEffect, useState } from "react";
import Pricing from "../components/Pricing";
import { getUsageViolations } from "../utils/helpers";
import ViolationSummary from "../components/ViolationSummary";
import { set } from "mongoose";

// Main Subscription Management Component
const SubscriptionManagement = () => {
  const [subscription, setSubscription] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [view, setView] = useState("overview"); // overview, packages, billing
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [packages, setPackages] = useState(null);
  const [currentPackage, setCurrentPackage] = useState(null);
  const [violations, setViolations] = useState(null);

  const checkViolations = (newPlan) => {
    const newLimits = {
      items: newPlan.items,
      itemImages: newPlan.itemImages,
      headerImages: newPlan.headerImages,
      itemVariants: newPlan.itemVariants,
    };

    const usage = {
      products: usageData.usageInfo.productsInfo,
      services: usageData.usageInfo.servicesInfo,
      headerImages: usageData.usageInfo.headerImagesInfo,
      variants: usageData.usageInfo.variantsInfo,
    };

    return getUsageViolations(usage, newLimits);
  };

  // Fetch current subscription
  const fetchSubscription = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscriptions/my-subscription`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        setSelectedPackage(data.package.name || "");
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setSubscription(null);
    } finally {
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/packages/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch packages");
      const data = await res.json();
      setPackages(data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
    }
  };

  const fetchCurrentPackage = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/packages/user-package`,
        {
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to fetch packages");
      const data = await res.json();
      setCurrentPackage(data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [subscription, currentPackage, packages, usage] =
          await Promise.all([
            fetchSubscription(),
            fetchCurrentPackage(),
            fetchPackages(),
            fetchUserUsage(),
          ]);
      } catch (e) {
        console.error("Error loading subscription data:", e);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const handleSelectPlan = (selectedPackage) => {
    if (!packages || !Array.isArray(packages)) {
      console.warn("⚠️ Packages not yet loaded.");
      return;
    }

    const selectedPkg = packages.find((pkg) => pkg.name === selectedPackage);

    if (!selectedPkg) {
      console.warn("⚠️ Selected package not found.");
      return;
    }

    // 🟡 If there's no currentPackage, assume this is a new subscription
    if (!currentPackage) {
      setViolations(null);
      setSelectedPackage(selectedPackage);
      return;
    }

    const isDowngrade = selectedPkg.amount < currentPackage.amount;

    if (isDowngrade) {
      const result = checkViolations(selectedPkg);

      if (Object.keys(result).length > 0) {
        setViolations(result); // ❌ Block downgrade
        return;
      }

      setViolations(null); // ✅ No violations
    } else {
      setViolations(null); // Upgrade
    }

    setSelectedPackage(selectedPackage);
  };

  useEffect(() => {
    if (!packages || !Array.isArray(packages)) return;
    if (!selectedPackage) return;
    handleSelectPlan(selectedPackage);
  }, [selectedPackage, packages]);

  const handleCancelSubscription = () => {
    const freeLimits = {
      items: 0,
      itemImages: 0,
      headerImages: 0,
      itemVariants: false,
    };

    const usage = {
      products: usageData.usageInfo.productsInfo,
      services: usageData.usageInfo.servicesInfo,
      headerImages: usageData.usageInfo.headerImagesInfo,
      variants: usageData.usageInfo.variantsInfo,
    };

    //console.log("usage", usage);

    const result = getUsageViolations(usage, freeLimits);

    if (Object.keys(result).length > 0) {
      setViolations(result);
      return; // ❌ Block cancel
    }

    setViolations(null);
    // ✅ Proceed with cancel API call here
  };

  const fetchUserUsage = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/usage-summary`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("Failed to fetch usage summary");

      const data = await res.json();
      //console.log("usage summary", data);
      setUsageData(data);
    } catch (error) {
      console.error("Error loading usage data:", e);
    } finally {
    }
  };

  // Load PayHere SDK
  const loadPayHereSDK = () => {
    return new Promise((resolve, reject) => {
      if (window.payhere) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://www.payhere.lk/lib/payhere.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // Start PayHere payment
  const startPayHerePayment = (paymentParams) => {
    return new Promise((resolve, reject) => {
      if (!window.payhere) {
        alert("Payment gateway not loaded. Please refresh and try again.");
        return reject(new Error("PayHere SDK not loaded"));
      }

      window.payhere.onCompleted = function (orderId) {
        console.log("✅ Payment completed. Order ID:", orderId);
        resolve(orderId);
      };

      window.payhere.onDismissed = function () {
        alert("Payment was cancelled.");
        reject(new Error("Payment cancelled"));
      };

      window.payhere.onError = function (error) {
        console.error("❌ PayHere error:", error);
        alert("Payment failed. Please try again.");
        reject(new Error("Payment error: " + error));
      };

      console.log("▶️ Starting PayHere payment with:", paymentParams);
      window.payhere.startPayment(paymentParams);
    });
  };

  // Create new subscription
  const createSubscription = async () => {
    if (!selectedPackage) {
      alert("Please select a package first.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscriptions/create-subscription`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ packageName: selectedPackage }),
        }
      );

      if (response.ok) {
        const { paymentParams } = await response.json();
        await loadPayHereSDK();
        await startPayHerePayment(paymentParams);
        await fetchSubscription();
        alert(`Your monthly subscription is now active.`);
        setView("overview");
      } else {
        const errorData = await response.json();
        alert(
          "Subscription setup failed: " + (errorData?.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Error starting subscription. Please try again.");
    }
  };

  // Handle package upgrade/downgrade
  const handlePackageUpgrade = async () => {
    if (!selectedPackage || selectedPackage === subscription?.package) {
      alert("Please select a different package.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscriptions/upgrade`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ packageName: selectedPackage }),
        }
      );

      const result = await response.json();

      if (response.status === 403 && result.nextAvailableDowngradeDate) {
        const formattedDate = new Date(
          result.nextAvailableDowngradeDate
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        alert(`⛔ You can downgrade only after: ${formattedDate}`);
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to upgrade package");
      }

      if (result.paymentRequired && result.paymentParams) {
        try {
          await loadPayHereSDK();
          await startPayHerePayment(result.paymentParams);
        } catch (paymentError) {
          console.error("❌ Payment failed:", paymentError);
          alert("Payment was not successful. Upgrade was not completed.");
          return;
        }
      }

      setSubscription(result.updatedSubscription || result);
      alert(`✅ Successfully updated to: ${selectedPackage.toUpperCase()}`);
      setView("overview");
    } catch (error) {
      console.error("❌ Upgrade Error:", error);
      alert(error.message || "Something went wrong during the upgrade.");
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/subscriptions/cancel`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        await fetchSubscription();
        alert("Subscription cancelled successfully.");
        setShowCancelModal(false);
      } else {
        const errorData = await response.json();
        alert(
          "Failed to cancel subscription: " +
            (errorData?.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Cancel error:", error);
      alert("Error cancelling subscription. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-t-transparent border-black rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-black text-white py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-light mb-4">
            Subscription Management
          </h1>
          <p className="text-xl font-light text-gray-300">
            Manage your subscription with elegant simplicity
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex space-x-8">
            {["overview", "packages", "billing"].map((tab) => (
              <button
                key={tab}
                onClick={() => setView(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm capitalize transition-colors ${
                  view === tab
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {view === "overview" && (
          <div className="space-y-8">
            {subscription ? (
              <>
                {/* Current Subscription */}
                <div className="bg-gray-50 rounded-2xl p-8">
                  <h2 className="text-2xl font-light text-black mb-6">
                    Current Subscription
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-black mb-2">
                        {subscription.package?.toUpperCase()} Plan
                      </h3>
                      <p className="text-2xl font-light text-black mb-4">
                        LKR {subscription.amount?.toLocaleString()}/month
                      </p>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          {subscription.status}
                        </p>
                        <p>
                          <span className="font-medium">Started:</span>{" "}
                          {new Date(
                            subscription.startDate
                          ).toLocaleDateString()}
                        </p>
                        <p>
                          <span className="font-medium">Next Billing:</span>{" "}
                          {new Date(subscription.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-3">
                      <button
                        onClick={() => setView("packages")}
                        className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                      >
                        Upgrade / Change Plan
                      </button>
                      <button
                        onClick={() => {
                          setShowCancelModal(true);
                          handleCancelSubscription();
                        }}
                        className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancel Subscription
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* No Subscription */
              <div className="text-center py-12">
                <h2 className="text-3xl font-light text-black mb-4">
                  No Active Subscription
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Choose a plan to get started with your subscription
                </p>
                <button
                  onClick={() => setView("packages")}
                  className="bg-black text-white px-8 py-4 rounded-lg font-medium text-lg hover:bg-gray-800 transition-colors"
                >
                  View Plans
                </button>
              </div>
            )}
          </div>
        )}

        {view === "packages" && (
          <div>
            <Pricing
              selectedPackage={selectedPackage}
              setSelectedPackage={setSelectedPackage}
              isUpgrade={!!subscription}
            />
            <div className="text-center mt-8">
              <button
                onClick={
                  subscription ? handlePackageUpgrade : createSubscription
                }
                disabled={!selectedPackage}
                className="bg-black text-white px-12 py-4 rounded-lg font-medium text-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {subscription ? "Update Subscription" : "Start Subscription"}
              </button>
            </div>
          </div>
        )}

        {view === "billing" && (
          <div className="space-y-8">
            <h2 className="text-3xl font-light text-black">Billing History</h2>
            {subscription?.paymentHistory?.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscription.paymentHistory.map((payment, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payment.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          LKR {payment.amount?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              payment.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.method || "PayHere"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No billing history available.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-light text-black mb-4">
              Cancel Subscription
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your subscription? This action
              cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  cancelSubscription();
                  handleCancelSubscription();
                }}
                className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Yes, Cancel
              </button>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                }}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Keep Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {violations && (
        
        <div className="flex justify-center px-4">
          <div className="w-full max-w-md">
            <ViolationSummary violations={violations} />
          </div>
        </div>
      )}



      
    </div>
  );
};

export default SubscriptionManagement;
