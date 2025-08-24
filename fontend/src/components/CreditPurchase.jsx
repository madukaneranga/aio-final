import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShoppingCart, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Package,
  Wallet
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

const CreditPurchase = ({ className = '' }) => {
  const { 
    creditPackages, 
    purchaseCredits, 
    summary, 
    loading 
  } = useWallet();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handlePurchase = async (packageId) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await purchaseCredits(packageId);
      const pkg = creditPackages.find(p => p.id === packageId);
      setSuccess(`Successfully purchased ${pkg?.credits} credits!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDiscount = (discount) => {
    return discount > 0 ? `${discount}% OFF` : null;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-200 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Purchase Credits</h3>
            <p className="text-sm text-gray-500">
              Buy credits with your wallet balance to reveal store contacts
            </p>
          </div>
        </div>
      </div>

      {/* Wallet Balance Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wallet className="w-5 h-5 text-black" />
            <div>
              <div className="text-sm text-gray-600">Available Wallet Balance</div>
              <div className="text-lg font-semibold text-gray-900">
                LKR {summary?.availableBalance?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Current Credits</div>
            <div className="text-lg font-semibold text-black">
              {summary?.credits?.balance || 0} Credits
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2 text-black">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2 text-black">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Credit Packages */}
      <div className="space-y-4">
        {creditPackages.map((pkg) => (
          <div
            key={pkg.id}
            className={`border rounded-xl p-4 transition-all duration-200 ${
              pkg.canAffordWithWallet
                ? 'border-gray-300 bg-gray-50 hover:shadow-md'
                : 'border-gray-200 bg-gray-50 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              {/* Package Info */}
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${
                  pkg.canAffordWithWallet ? 'bg-gray-200' : 'bg-gray-200'
                }`}>
                  <Package className={`w-6 h-6 ${
                    pkg.canAffordWithWallet ? 'text-black' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold text-gray-900">
                      {pkg.credits.toLocaleString()} Credits
                    </span>
                    {formatDiscount(pkg.discount) && (
                      <span className="bg-gray-200 text-black text-xs px-2 py-1 rounded-full font-medium">
                        {formatDiscount(pkg.discount)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    LKR {pkg.price.toLocaleString()}
                    {pkg.discount > 0 && (
                      <span className="text-gray-400 line-through ml-2">
                        LKR {Math.round(pkg.price / (1 - pkg.discount / 100)).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    LKR {(pkg.price / pkg.credits).toFixed(2)} per credit
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              <div className="flex flex-col items-end space-y-2">
                <button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={!pkg.canAffordWithWallet || isLoading}
                  className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 min-w-[120px] ${
                    pkg.canAffordWithWallet && !isLoading
                      ? 'bg-black text-white hover:bg-gray-800 hover:shadow-lg transform hover:-translate-y-0.5'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : pkg.canAffordWithWallet ? (
                    'Purchase'
                  ) : (
                    'Insufficient Balance'
                  )}
                </button>
                
                {pkg.canAffordWithWallet && (
                  <div className="text-xs text-black font-medium">
                    ✓ {Math.round(pkg.walletCoverage)}% covered by wallet
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="text-sm text-blue-800">
          <div className="font-medium mb-1">💡 How credits work:</div>
          <ul className="text-xs space-y-1 list-disc list-inside">
            <li>1 credit = 1 store contact reveal</li>
            <li>Valid for 24 hours per store (prevents duplicate reveals)</li>
            <li>Credits are purchased using your wallet balance from earnings</li>
            <li>Unused credits never expire</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreditPurchase;