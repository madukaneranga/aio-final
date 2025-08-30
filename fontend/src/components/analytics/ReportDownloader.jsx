import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { 
  Download, 
  FileSpreadsheet, 
  Lock, 
  Crown,
  CheckCircle,
  Loader
} from "lucide-react";

const ReportDownloader = ({ 
  analyticsLevel = 1, 
  storeId, 
  className = "" 
}) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  const canExport = analyticsLevel >= 2;
  const actualStoreId = storeId || user?.storeId;

  const handleDownload = async () => {
    if (!canExport || !actualStoreId) return;

    setIsGenerating(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/analytics/export/${actualStoreId}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics-comprehensive-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setLastGenerated(new Date());
    } catch (error) {
      console.error('Export error:', error);
      
      // Show more specific error messages
      let errorMessage = 'Failed to generate comprehensive Excel report. Please try again.';
      if (error.message.includes('403')) {
        errorMessage = 'You need to upgrade your plan to export reports.';
      } else if (error.message.includes('401')) {
        errorMessage = 'Please log in again to export reports.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Store not found. Please refresh and try again.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again in a few minutes.';
      }
      
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!canExport) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Report Exports Locked
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Upgrade to Standard or Premium to download comprehensive Excel analytics reports with detailed insights across multiple sheets.
          </p>
          <div className="mb-6">
            <div className="flex items-center justify-center py-4 px-6 bg-white border-2 border-dashed border-gray-300 rounded-lg opacity-50">
              <FileSpreadsheet className="w-6 h-6 mr-3 text-gray-400" />
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Comprehensive Excel Report</div>
                <div className="text-xs text-gray-400 mt-1">6+ sheets with detailed analytics</div>
              </div>
            </div>
          </div>
          <button className="w-full bg-black text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors">
            Upgrade to Access Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center mb-4">
        <Download className="w-5 h-5 mr-2 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-900">Export Reports</h3>
        {analyticsLevel >= 3 && (
          <Crown className="w-4 h-4 ml-2 text-purple-400" />
        )}
      </div>

      <p className="text-gray-600 text-sm mb-6">
        Download comprehensive Excel analytics report with detailed insights across multiple worksheets including revenue trends, customer analytics, product performance, and operational metrics.
      </p>

      <div className="mb-6">
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="w-full flex items-center justify-center py-4 px-6 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
              {isGenerating ? (
                <Loader className="w-6 h-6 animate-spin text-white" />
              ) : (
                <FileSpreadsheet className="w-6 h-6 text-white" />
              )}
            </div>
            
            <div className="text-left">
              <div className="text-lg font-semibold">
                {isGenerating ? 'Generating...' : 'Download Comprehensive Excel Report'}
              </div>
              <div className="text-sm text-white/80">
                {isGenerating ? 'Creating detailed analytics...' : '6+ worksheets with complete business insights'}
              </div>
            </div>
          </div>
          
          <Download className="w-5 h-5 text-white/80 ml-4" />
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          What's Included in Your Excel Report
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-700">
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 mr-2 text-blue-500" />
            Executive Summary
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 mr-2 text-blue-500" />
            Revenue Trends Analysis
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 mr-2 text-blue-500" />
            Product/Service Performance
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 mr-2 text-blue-500" />
            Order Status Breakdown
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 mr-2 text-blue-500" />
            Customer Analytics
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 mr-2 text-blue-500" />
            Operational Metrics
          </div>
        </div>
      </div>

      {analyticsLevel >= 3 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="flex items-center mb-2">
            <Crown className="w-4 h-4 mr-2 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Premium Features</span>
          </div>
          <ul className="text-xs text-purple-700 space-y-1">
            <li>• Advanced customer segmentation worksheet</li>
            <li>• Global market insights included</li>
            <li>• AI recommendations section</li>
            <li>• Extended 12+ month historical data</li>
            <li>• Premium analytics calculations</li>
          </ul>
        </div>
      )}

      {lastGenerated && (
        <div className="flex items-center text-sm text-gray-500">
          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
          Last generated: {lastGenerated.toLocaleString()}
        </div>
      )}

      <ReportPreview analyticsLevel={analyticsLevel} />
    </div>
  );
};


const ReportPreview = ({ analyticsLevel }) => {
  const features = {
    1: [],
    2: [
      "Revenue and order trends analysis",
      "Customer analytics worksheets", 
      "Operational metrics breakdown",
      "Comprehensive Excel export with 6+ sheets"
    ],
    3: [
      "Everything in Standard",
      "Advanced customer segmentation",
      "Global market insights",
      "Competitive benchmarks", 
      "AI recommendations",
      "Extended historical data (12+ months)"
    ]
  };

  const levelFeatures = features[analyticsLevel] || [];

  if (levelFeatures.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        What's Included in Your Excel Report
      </h4>
      
      <ul className="space-y-2">
        {levelFeatures.map((feature, index) => (
          <li key={index} className="flex items-center text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReportDownloader;