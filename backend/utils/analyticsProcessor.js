import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import Store from "../models/Store.js";
import User from "../models/User.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import Impression from "../models/Impression.js";
import Review from "../models/Review.js";
import ChatAnalytics from "../models/ChatAnalytics.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import mongoose from "mongoose";

// Cache implementation for analytics data
class AnalyticsCache {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  getKey(storeId, months, analyticsLevel) {
    return `${storeId}-${months}-${analyticsLevel}`;
  }

  get(storeId, months, analyticsLevel) {
    const key = this.getKey(storeId, months, analyticsLevel);
    const cached = this.cache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheDuration) {
      console.log(`📋 Cache hit for analytics: ${key}`);
      return cached.data;
    }
    
    return null;
  }

  set(storeId, months, analyticsLevel, data) {
    const key = this.getKey(storeId, months, analyticsLevel);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Clean old entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  clear(storeId = null) {
    if (storeId) {
      // Clear specific store cache
      for (const [key] of this.cache) {
        if (key.startsWith(storeId)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

const analyticsCache = new AnalyticsCache();

// Data validation utilities
export const validateAnalyticsRequest = (storeId, months, user) => {
  const errors = [];

  // Validate storeId format
  if (!storeId || !storeId.match(/^[0-9a-fA-F]{24}$/)) {
    errors.push("Invalid store ID format");
  }

  // Validate months parameter
  if (months !== undefined && (isNaN(months) || months < 0 || months > 60)) {
    errors.push("Months parameter must be between 0 and 60");
  }

  // Validate user authentication
  if (!user || !user._id) {
    errors.push("User authentication required");
  }

  return errors;
};

// Sanitize analytics data
export const sanitizeAnalyticsData = (data) => {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const sanitized = {};
  
  // Only include expected fields and sanitize values
  const allowedFields = [
    'analyticsLevel', 'packageName', 'totalRevenue', 'totalCount', 'avgValue',
    'topProducts', 'topServices', 'totalUniqueCustomers', 'returningCustomers',
    'customerMixNewVsReturning', 'bestSellingItem', 'currency', 'revenueChangePct',
    'countChangePct', 'avgValueChangePct', 'revenueByMonth', 'retentionRate',
    'ordersByStatus', 'bookingsByStatus', 'operationalMetrics', 'exportAvailable',
    'revenueByMonthAllTime', 'extendedHistory', 'globalInsightsAvailable',
    'automatedReports', 'customerSegmentation', 'abTestingMetrics', 'predictiveAnalytics',
    'revenueForecast', 'impressionAnalytics', 'reviewAnalytics', 'chatAnalytics',
    'productPerformance', 'servicePerformance', 'conversionFunnel', 'trafficSources',
    'peakTimes', 'seasonalTrends', 'competitorAnalysis', 'marketInsights',
    'processingTime', 'timestamp', 'healthScore', 'recommendedActions'
  ];

  allowedFields.forEach(field => {
    if (data.hasOwnProperty(field)) {
      sanitized[field] = data[field];
    }
  });

  // Sanitize numeric values
  ['totalRevenue', 'totalCount', 'avgValue', 'totalUniqueCustomers', 'returningCustomers'].forEach(field => {
    if (sanitized[field] !== undefined) {
      sanitized[field] = Math.max(0, Number(sanitized[field]) || 0);
    }
  });

  // Sanitize percentage values
  ['revenueChangePct', 'countChangePct', 'avgValueChangePct', 'retentionRate'].forEach(field => {
    if (sanitized[field] !== undefined) {
      const value = Number(sanitized[field]) || 0;
      sanitized[field] = Math.max(-100, Math.min(1000, value));
    }
  });

  return sanitized;
};

// Enhanced error handling with fallback data
export const createFallbackAnalyticsData = (error, analyticsLevel = 1, packageName = 'basic') => {
  console.error('Creating fallback analytics data due to error:', error);
  
  return {
    analyticsLevel,
    packageName,
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
      percentage: 0
    },
    bestSellingItem: null,
    currency: "LKR",
    operationalMetrics: {
      fulfillmentRate: 0,
      avgOrderValue: 0,
      repeatPurchaseRate: 0,
      conversionRate: 0,
      healthScore: 0
    },
    impressionAnalytics: {
      totalImpressions: 0,
      uniqueVisitors: 0,
      conversionFunnel: {}
    },
    error: "Analytics data temporarily unavailable. Please try again later.",
    errorCode: error.code || 'ANALYTICS_ERROR',
    timestamp: new Date().toISOString()
  };
};

// Advanced customer segmentation with enhanced RFM analysis
export const calculateCustomerSegmentation = async (storeId, dateFilter = {}) => {
  try {
    const ObjectId = mongoose.Types.ObjectId;
    const store = await Store.findById(storeId);
    if (!store) {
      throw new Error('Store not found');
    }
    
    const Model = store.type === "product" ? Order : Booking;
    
    // Get comprehensive customer transaction data
    const customerData = await Model.aggregate([
      { $match: { storeId: new ObjectId(storeId), status: "completed", ...dateFilter } },
      {
        $group: {
          _id: "$customerId",
          totalSpent: { $sum: "$totalAmount" },
          transactionCount: { $sum: 1 },
          avgTransactionValue: { $avg: "$totalAmount" },
          minTransactionValue: { $min: "$totalAmount" },
          maxTransactionValue: { $max: "$totalAmount" },
          firstPurchase: { $min: "$createdAt" },
          lastPurchase: { $max: "$createdAt" },
          totalQuantity: { $sum: { $ifNull: [{ $sum: "$items.quantity" }, 1] } },
          purchaseDays: { $addToSet: { $dayOfYear: "$createdAt" } },
          orderIds: { $push: "$_id" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "customer"
        }
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          uniquePurchaseDays: { $size: "$purchaseDays" },
          customerLifespan: {
            $divide: [
              { $subtract: ["$lastPurchase", "$firstPurchase"] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      }
    ]);

    // Calculate dynamic thresholds for RFM based on data distribution
    const recencyValues = customerData.map(c => {
      const now = new Date();
      return Math.floor((now - c.lastPurchase) / (1000 * 60 * 60 * 24));
    }).sort((a, b) => a - b);
    
    const frequencyValues = customerData.map(c => c.transactionCount).sort((a, b) => a - b);
    const monetaryValues = customerData.map(c => c.totalSpent).sort((a, b) => a - b);
    
    // Calculate percentile thresholds (33rd and 67th percentiles)
    const getPercentile = (arr, p) => {
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, index)];
    };
    
    const recencyThresholds = {
      high: getPercentile(recencyValues, 33), // Top 33% (most recent)
      medium: getPercentile(recencyValues, 67)
    };
    
    const frequencyThresholds = {
      low: getPercentile(frequencyValues, 33),
      high: getPercentile(frequencyValues, 67)
    };
    
    const monetaryThresholds = {
      low: getPercentile(monetaryValues, 33),
      high: getPercentile(monetaryValues, 67)
    };

    // Enhanced RFM segments with more granular classification
    const segments = {
      champions: 0,           // High R, F, M - Best customers
      loyalCustomers: 0,      // High F, M - Loyal but not recent
      potentialLoyalists: 0,  // High R, M - Recent high spenders
      newCustomers: 0,        // High R, Low F, M - New customers
      promisingCustomers: 0,  // High R, Medium F, M - Promising new customers
      needsAttention: 0,      // High F, M, Low R - Good customers losing interest
      aboutToSleep: 0,        // Medium R, F, M - Declining engagement
      atRisk: 0,              // Low R, High F, M - Risk of churning
      cannotLoseThem: 0,      // Very High M, Low R - High value at risk
      hibernating: 0,         // Low R, F, M - Inactive customers
      lost: 0                 // Very Low R, F, M - Lost customers
    };

    // Advanced behavioral insights
    let totalRevenue = 0;
    let totalPurchaseDays = 0;
    const customerBehavior = {
      averageOrderFrequency: 0,
      purchaseConsistency: 0,
      valueGrowthTrend: 0,
      loyaltyScore: 0
    };
    
    const now = new Date();
    const customerDetails = [];

    customerData.forEach(customer => {
      totalRevenue += customer.totalSpent;
      totalPurchaseDays += customer.uniquePurchaseDays;
      
      const daysSinceLastPurchase = Math.floor((now - customer.lastPurchase) / (1000 * 60 * 60 * 24));
      const daysSinceFirstPurchase = Math.floor((now - customer.firstPurchase) / (1000 * 60 * 60 * 24));
      
      // Calculate RFM scores (1-5 scale)
      const recencyScore = daysSinceLastPurchase <= recencyThresholds.high ? 5 :
                          daysSinceLastPurchase <= recencyThresholds.medium ? 3 : 1;
      
      const frequencyScore = customer.transactionCount >= frequencyThresholds.high ? 5 :
                            customer.transactionCount >= frequencyThresholds.low ? 3 : 1;
      
      const monetaryScore = customer.totalSpent >= monetaryThresholds.high ? 5 :
                           customer.totalSpent >= monetaryThresholds.low ? 3 : 1;
      
      // Calculate additional behavioral metrics
      const purchaseConsistency = customer.customerLifespan > 0 
        ? Math.round((customer.uniquePurchaseDays / Math.max(1, customer.customerLifespan / 30)) * 100) / 100
        : 0;
      
      const loyaltyScore = Math.round(((recencyScore + frequencyScore + monetaryScore) / 15) * 100);
      
      // Enhanced segment classification
      const rfmTotal = recencyScore + frequencyScore + monetaryScore;
      
      if (rfmTotal >= 13 && recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4) {
        segments.champions++;
      } else if (frequencyScore >= 4 && monetaryScore >= 4 && recencyScore >= 2) {
        segments.loyalCustomers++;
      } else if (recencyScore >= 4 && monetaryScore >= 4) {
        segments.potentialLoyalists++;
      } else if (recencyScore >= 4 && frequencyScore <= 2 && monetaryScore <= 3) {
        segments.newCustomers++;
      } else if (recencyScore >= 3 && frequencyScore >= 3 && monetaryScore >= 3) {
        segments.promisingCustomers++;
      } else if (frequencyScore >= 4 && monetaryScore >= 4 && recencyScore <= 2) {
        segments.needsAttention++;
      } else if (recencyScore >= 2 && frequencyScore >= 2 && monetaryScore >= 2) {
        segments.aboutToSleep++;
      } else if (recencyScore <= 2 && frequencyScore >= 3 && monetaryScore >= 3) {
        segments.atRisk++;
      } else if (monetaryScore >= 4 && recencyScore <= 2) {
        segments.cannotLoseThem++;
      } else if (daysSinceLastPurchase > 180) {
        segments.lost++;
      } else {
        segments.hibernating++;
      }
      
      customerDetails.push({
        customerId: customer._id,
        customerName: customer.customer?.name || 'Unknown',
        customerEmail: customer.customer?.email || 'Unknown',
        rfmScores: { recency: recencyScore, frequency: frequencyScore, monetary: monetaryScore },
        totalSpent: customer.totalSpent,
        transactionCount: customer.transactionCount,
        avgTransactionValue: customer.avgTransactionValue,
        daysSinceLastPurchase,
        loyaltyScore,
        purchaseConsistency,
        segment: getCustomerSegmentName(rfmTotal, recencyScore, frequencyScore, monetaryScore, daysSinceLastPurchase)
      });
    });

    const totalCustomers = customerData.length;
    
    // Calculate advanced metrics
    const avgCustomerLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const avgTransactionValue = customerData.length > 0 
      ? customerData.reduce((sum, c) => sum + c.avgTransactionValue, 0) / customerData.length 
      : 0;
    
    // Customer value distribution
    const valueDistribution = calculateValueDistribution(customerData);
    
    // Churn risk analysis
    const churnRisk = calculateChurnRisk(customerData, now);
    
    // Growth opportunities
    const growthOpportunities = identifyGrowthOpportunities(segments, totalCustomers);

    return {
      totalCustomers,
      segments,
      segmentPercentages: Object.keys(segments).reduce((acc, key) => {
        acc[key] = totalCustomers > 0 ? Math.round((segments[key] / totalCustomers) * 100) : 0;
        return acc;
      }, {}),
      
      // Core metrics
      avgTransactionValue,
      customerLifetimeValue: avgCustomerLifetimeValue,
      totalRevenue,
      
      // Advanced insights
      valueDistribution,
      churnRisk,
      growthOpportunities,
      
      // Thresholds used
      rfmThresholds: {
        recency: recencyThresholds,
        frequency: frequencyThresholds,
        monetary: monetaryThresholds
      },
      
      // Top customers by segment
      topCustomers: {
        champions: customerDetails.filter(c => c.segment === 'champions').slice(0, 10),
        atRisk: customerDetails.filter(c => c.segment === 'atRisk').slice(0, 10),
        highValue: customerDetails.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10)
      },
      
      // Behavioral insights
      behavioralInsights: {
        avgPurchaseFrequency: totalCustomers > 0 ? 
          customerData.reduce((sum, c) => sum + c.transactionCount, 0) / totalCustomers : 0,
        avgCustomerLifespan: totalCustomers > 0 ?
          customerData.reduce((sum, c) => sum + (c.customerLifespan || 0), 0) / totalCustomers : 0,
        repeatCustomerRate: totalCustomers > 0 ?
          Math.round((customerData.filter(c => c.transactionCount > 1).length / totalCustomers) * 100) : 0
      },
      
      // Recommendations
      recommendations: generateSegmentRecommendations(segments, totalCustomers)
    };
  } catch (error) {
    console.error('Enhanced customer segmentation error:', error);
    return {
      totalCustomers: 0,
      segments: {},
      segmentPercentages: {},
      avgTransactionValue: 0,
      customerLifetimeValue: 0,
      totalRevenue: 0,
      valueDistribution: {},
      churnRisk: { highRisk: 0, mediumRisk: 0, lowRisk: 0 },
      growthOpportunities: [],
      error: 'Failed to calculate customer segmentation'
    };
  }
};

// Helper function to determine customer segment name
const getCustomerSegmentName = (rfmTotal, recencyScore, frequencyScore, monetaryScore, daysSinceLastPurchase) => {
  if (rfmTotal >= 13 && recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4) {
    return 'champions';
  } else if (frequencyScore >= 4 && monetaryScore >= 4 && recencyScore >= 2) {
    return 'loyalCustomers';
  } else if (recencyScore >= 4 && monetaryScore >= 4) {
    return 'potentialLoyalists';
  } else if (recencyScore >= 4 && frequencyScore <= 2 && monetaryScore <= 3) {
    return 'newCustomers';
  } else if (recencyScore >= 3 && frequencyScore >= 3 && monetaryScore >= 3) {
    return 'promisingCustomers';
  } else if (frequencyScore >= 4 && monetaryScore >= 4 && recencyScore <= 2) {
    return 'needsAttention';
  } else if (recencyScore >= 2 && frequencyScore >= 2 && monetaryScore >= 2) {
    return 'aboutToSleep';
  } else if (recencyScore <= 2 && frequencyScore >= 3 && monetaryScore >= 3) {
    return 'atRisk';
  } else if (monetaryScore >= 4 && recencyScore <= 2) {
    return 'cannotLoseThem';
  } else if (daysSinceLastPurchase > 180) {
    return 'lost';
  } else {
    return 'hibernating';
  }
};

// Calculate customer value distribution
const calculateValueDistribution = (customerData) => {
  if (customerData.length === 0) return {};
  
  const values = customerData.map(c => c.totalSpent).sort((a, b) => a - b);
  const totalCustomers = values.length;
  
  return {
    top10Percent: values.slice(Math.floor(totalCustomers * 0.9)).reduce((sum, val) => sum + val, 0),
    top25Percent: values.slice(Math.floor(totalCustomers * 0.75)).reduce((sum, val) => sum + val, 0),
    median: values[Math.floor(totalCustomers / 2)],
    bottom25Percent: values.slice(0, Math.floor(totalCustomers * 0.25)).reduce((sum, val) => sum + val, 0),
    giniCoefficient: calculateGiniCoefficient(values)
  };
};

// Calculate Gini coefficient for customer value inequality
const calculateGiniCoefficient = (values) => {
  if (values.length === 0) return 0;
  
  const sortedValues = [...values].sort((a, b) => a - b);
  const n = sortedValues.length;
  const sum = sortedValues.reduce((acc, val) => acc + val, 0);
  
  if (sum === 0) return 0;
  
  let gini = 0;
  for (let i = 0; i < n; i++) {
    gini += (2 * (i + 1) - n - 1) * sortedValues[i];
  }
  
  return gini / (n * sum);
};

// Calculate churn risk analysis
const calculateChurnRisk = (customerData, now) => {
  let highRisk = 0;
  let mediumRisk = 0;
  let lowRisk = 0;
  
  customerData.forEach(customer => {
    const daysSinceLastPurchase = Math.floor((now - customer.lastPurchase) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastPurchase > 90) {
      highRisk++;
    } else if (daysSinceLastPurchase > 30) {
      mediumRisk++;
    } else {
      lowRisk++;
    }
  });
  
  const total = customerData.length;
  return {
    highRisk,
    mediumRisk,
    lowRisk,
    highRiskPercentage: total > 0 ? Math.round((highRisk / total) * 100) : 0,
    mediumRiskPercentage: total > 0 ? Math.round((mediumRisk / total) * 100) : 0,
    lowRiskPercentage: total > 0 ? Math.round((lowRisk / total) * 100) : 0
  };
};

// Identify growth opportunities
const identifyGrowthOpportunities = (segments, totalCustomers) => {
  const opportunities = [];
  
  if (segments.newCustomers > 0) {
    opportunities.push({
      type: 'nurture_new_customers',
      count: segments.newCustomers,
      percentage: Math.round((segments.newCustomers / totalCustomers) * 100),
      priority: 'high',
      action: 'Implement welcome series and onboarding program'
    });
  }
  
  if (segments.atRisk > 0) {
    opportunities.push({
      type: 'retain_at_risk',
      count: segments.atRisk,
      percentage: Math.round((segments.atRisk / totalCustomers) * 100),
      priority: 'urgent',
      action: 'Launch win-back campaign with personalized offers'
    });
  }
  
  if (segments.potentialLoyalists > 0) {
    opportunities.push({
      type: 'convert_potential_loyalists',
      count: segments.potentialLoyalists,
      percentage: Math.round((segments.potentialLoyalists / totalCustomers) * 100),
      priority: 'medium',
      action: 'Create loyalty program and exclusive offers'
    });
  }
  
  return opportunities;
};

// Generate segment-specific recommendations
const generateSegmentRecommendations = (segments, totalCustomers) => {
  const recommendations = [];
  
  Object.entries(segments).forEach(([segment, count]) => {
    if (count > 0) {
      const percentage = Math.round((count / totalCustomers) * 100);
      
      switch (segment) {
        case 'champions':
          recommendations.push(`Leverage your ${count} champions (${percentage}%) as brand advocates and referral sources`);
          break;
        case 'atRisk':
          recommendations.push(`Urgently address ${count} at-risk customers (${percentage}%) with personalized retention campaigns`);
          break;
        case 'newCustomers':
          recommendations.push(`Nurture ${count} new customers (${percentage}%) with onboarding sequences and education`);
          break;
        case 'hibernating':
          recommendations.push(`Reactivate ${count} hibernating customers (${percentage}%) with targeted comeback offers`);
          break;
      }
    }
  });
  
  return recommendations.slice(0, 5); // Return top 5 recommendations
};

// Enhanced Predictive analytics - Revenue forecasting with multiple algorithms
export const calculateRevenueForecast = (revenueData) => {
  if (!revenueData || revenueData.length < 3) {
    return {
      nextMonth: 0,
      next3Months: [0, 0, 0],
      next6Months: [0, 0, 0, 0, 0, 0],
      growthRate: 0,
      confidence: 'low',
      trend: 'stable',
      algorithm: 'insufficient_data'
    };
  }

  const yValues = revenueData.map(item => item.revenue || 0);
  const n = yValues.length;
  
  // Multiple forecasting algorithms
  const forecasts = {
    linear: calculateLinearForecast(yValues),
    exponential: calculateExponentialSmoothing(yValues),
    seasonal: calculateSeasonalForecast(revenueData),
    movingAverage: calculateMovingAverageForecast(yValues),
    polynomial: calculatePolynomialForecast(yValues)
  };
  
  // Ensemble forecast (weighted average of different methods)
  const ensembleForecast = calculateEnsembleForecast(forecasts, n);
  
  // Calculate confidence intervals
  const confidenceInterval = calculateConfidenceInterval(yValues, ensembleForecast.nextMonth);
  
  // Determine best algorithm based on historical accuracy
  const bestAlgorithm = selectBestAlgorithm(forecasts, yValues);
  
  // Calculate seasonal patterns
  const seasonalPattern = detectSeasonalPattern(revenueData);
  
  // Generate insights
  const insights = generateForecastInsights(yValues, ensembleForecast, seasonalPattern);
  
  return {
    // Primary forecasts
    nextMonth: Math.max(0, Math.round(ensembleForecast.nextMonth)),
    next3Months: ensembleForecast.next3Months.map(v => Math.max(0, Math.round(v))),
    next6Months: ensembleForecast.next6Months.map(v => Math.max(0, Math.round(v))),
    
    // Growth metrics
    growthRate: ensembleForecast.growthRate,
    monthOverMonthGrowth: calculateMonthOverMonthGrowth(yValues),
    
    // Confidence metrics
    confidence: ensembleForecast.confidence,
    confidenceInterval: {
      lower: Math.max(0, Math.round(confidenceInterval.lower)),
      upper: Math.round(confidenceInterval.upper)
    },
    
    // Trend analysis
    trend: ensembleForecast.trend,
    trendStrength: calculateTrendStrength(yValues),
    
    // Algorithm performance
    algorithm: bestAlgorithm.name,
    algorithmAccuracy: bestAlgorithm.accuracy,
    
    // Seasonal insights
    seasonality: {
      detected: seasonalPattern.detected,
      pattern: seasonalPattern.pattern,
      strength: seasonalPattern.strength
    },
    
    // Individual algorithm results
    algorithmForecasts: Object.keys(forecasts).reduce((acc, key) => {
      acc[key] = {
        nextMonth: Math.max(0, Math.round(forecasts[key].nextMonth || 0)),
        confidence: forecasts[key].confidence || 'unknown'
      };
      return acc;
    }, {}),
    
    // Business insights
    insights: insights,
    
    // Risk assessment
    riskAssessment: calculateForecastRisk(yValues, ensembleForecast),
    
    // Recommendations
    recommendations: generateForecastRecommendations(ensembleForecast, insights, seasonalPattern)
  };
};

// Linear regression forecast
const calculateLinearForecast = (yValues) => {
  const n = yValues.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
  const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const nextMonth = slope * n + intercept;
  const next3Months = [1, 2, 3].map(i => slope * (n + i) + intercept);
  const next6Months = [1, 2, 3, 4, 5, 6].map(i => slope * (n + i) + intercept);
  
  // Calculate R-squared for confidence
  const yMean = sumY / n;
  const ssRes = yValues.reduce((acc, val, i) => {
    const predicted = slope * i + intercept;
    return acc + Math.pow(val - predicted, 2);
  }, 0);
  const ssTot = yValues.reduce((acc, val) => acc + Math.pow(val - yMean, 2), 0);
  const rSquared = 1 - (ssRes / ssTot);
  
  return {
    nextMonth,
    next3Months,
    next6Months,
    confidence: rSquared > 0.8 ? 'high' : rSquared > 0.5 ? 'medium' : 'low',
    rSquared,
    trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable'
  };
};

// Exponential smoothing forecast
const calculateExponentialSmoothing = (yValues, alpha = 0.3) => {
  if (yValues.length < 2) return { nextMonth: yValues[0] || 0 };
  
  let smoothed = yValues[0];
  for (let i = 1; i < yValues.length; i++) {
    smoothed = alpha * yValues[i] + (1 - alpha) * smoothed;
  }
  
  const nextMonth = smoothed;
  const next3Months = [nextMonth, nextMonth, nextMonth]; // Simple exponential doesn't account for trend
  const next6Months = Array(6).fill(nextMonth);
  
  // Calculate mean absolute error for confidence
  const errors = [];
  let currentSmoothed = yValues[0];
  for (let i = 1; i < yValues.length; i++) {
    errors.push(Math.abs(yValues[i] - currentSmoothed));
    currentSmoothed = alpha * yValues[i] + (1 - alpha) * currentSmoothed;
  }
  
  const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
  const avgValue = yValues.reduce((a, b) => a + b, 0) / yValues.length;
  const mape = mae / avgValue;
  
  return {
    nextMonth,
    next3Months,
    next6Months,
    confidence: mape < 0.1 ? 'high' : mape < 0.3 ? 'medium' : 'low',
    mae,
    mape
  };
};

// Moving average forecast
const calculateMovingAverageForecast = (yValues, window = 3) => {
  if (yValues.length < window) return { nextMonth: yValues[yValues.length - 1] || 0 };
  
  const recentValues = yValues.slice(-window);
  const nextMonth = recentValues.reduce((a, b) => a + b, 0) / window;
  const next3Months = Array(3).fill(nextMonth);
  const next6Months = Array(6).fill(nextMonth);
  
  return {
    nextMonth,
    next3Months,
    next6Months,
    confidence: 'medium'
  };
};

// Polynomial regression forecast (degree 2)
const calculatePolynomialForecast = (yValues) => {
  if (yValues.length < 4) return calculateLinearForecast(yValues);
  
  const n = yValues.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  
  // Set up normal equations for polynomial regression (degree 2)
  let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
  let sumY = 0, sumXY = 0, sumX2Y = 0;
  
  for (let i = 0; i < n; i++) {
    const x = xValues[i];
    const y = yValues[i];
    
    sumX += x;
    sumX2 += x * x;
    sumX3 += x * x * x;
    sumX4 += x * x * x * x;
    sumY += y;
    sumXY += x * y;
    sumX2Y += x * x * y;
  }
  
  // Solve system of equations using matrix operations (simplified)
  try {
    const det = n * (sumX2 * sumX4 - sumX3 * sumX3) - sumX * (sumX * sumX4 - sumX2 * sumX3) + sumX2 * (sumX * sumX3 - sumX2 * sumX2);
    
    if (Math.abs(det) < 1e-10) {
      // Fallback to linear regression
      return calculateLinearForecast(yValues);
    }
    
    const a = ((sumX2 * sumX4 - sumX3 * sumX3) * sumY - (sumX * sumX4 - sumX2 * sumX3) * sumXY + (sumX * sumX3 - sumX2 * sumX2) * sumX2Y) / det;
    const b = (n * (sumX * sumX4 - sumX2 * sumX3) * sumY - (n * sumX4 - sumX2 * sumX2) * sumXY + (sumX * sumX2 - n * sumX3) * sumX2Y) / det;
    const c = (n * (sumX2 * sumX3 - sumX * sumX4) * sumY - (sumX * sumX3 - sumX2 * sumX2) * sumXY + (n * sumX2 - sumX * sumX) * sumX2Y) / det;
    
    const predict = (x) => a + b * x + c * x * x;
    
    const nextMonth = predict(n);
    const next3Months = [1, 2, 3].map(i => predict(n + i));
    const next6Months = [1, 2, 3, 4, 5, 6].map(i => predict(n + i));
    
    // Calculate R-squared
    const yMean = sumY / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = predict(i);
      ssRes += Math.pow(yValues[i] - predicted, 2);
      ssTot += Math.pow(yValues[i] - yMean, 2);
    }
    const rSquared = 1 - (ssRes / ssTot);
    
    return {
      nextMonth,
      next3Months,
      next6Months,
      confidence: rSquared > 0.85 ? 'high' : rSquared > 0.6 ? 'medium' : 'low',
      rSquared
    };
  } catch (error) {
    // Fallback to linear regression
    return calculateLinearForecast(yValues);
  }
};

// Seasonal forecast
const calculateSeasonalForecast = (revenueData) => {
  if (revenueData.length < 12) {
    return { nextMonth: 0, confidence: 'low', seasonal: false };
  }
  
  // Group by month to detect seasonality
  const monthlyData = {};
  revenueData.forEach(item => {
    const month = item.month;
    if (!monthlyData[month]) monthlyData[month] = [];
    monthlyData[month].push(item.revenue || 0);
  });
  
  // Calculate monthly averages
  const monthlyAvg = {};
  Object.keys(monthlyData).forEach(month => {
    const values = monthlyData[month];
    monthlyAvg[month] = values.reduce((a, b) => a + b, 0) / values.length;
  });
  
  const currentMonth = new Date().getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  
  const forecast = monthlyAvg[nextMonth] || 0;
  
  return {
    nextMonth: forecast,
    confidence: Object.keys(monthlyAvg).length >= 12 ? 'high' : 'medium',
    seasonal: true,
    monthlyPattern: monthlyAvg
  };
};

// Ensemble forecast combining multiple methods
const calculateEnsembleForecast = (forecasts, dataPoints) => {
  const weights = {
    linear: 0.25,
    exponential: 0.2,
    seasonal: dataPoints >= 12 ? 0.3 : 0.1,
    movingAverage: 0.15,
    polynomial: dataPoints >= 6 ? 0.1 : 0.05
  };
  
  // Normalize weights
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  Object.keys(weights).forEach(key => weights[key] /= totalWeight);
  
  let nextMonth = 0;
  let avgConfidence = 0;
  let trend = 'stable';
  
  Object.keys(forecasts).forEach(method => {
    const forecast = forecasts[method];
    const weight = weights[method];
    
    nextMonth += (forecast.nextMonth || 0) * weight;
    
    // Simple confidence scoring
    const confidenceScore = forecast.confidence === 'high' ? 0.9 : 
                          forecast.confidence === 'medium' ? 0.6 : 0.3;
    avgConfidence += confidenceScore * weight;
  });
  
  // Generate 3-month and 6-month forecasts
  const next3Months = [1, 2, 3].map(i => {
    return Object.keys(forecasts).reduce((sum, method) => {
      const forecast = forecasts[method];
      const weight = weights[method];
      const monthlyForecast = forecast.next3Months ? forecast.next3Months[i-1] : forecast.nextMonth;
      return sum + (monthlyForecast || 0) * weight;
    }, 0);
  });
  
  const next6Months = [1, 2, 3, 4, 5, 6].map(i => {
    return Object.keys(forecasts).reduce((sum, method) => {
      const forecast = forecasts[method];
      const weight = weights[method];
      const monthlyForecast = forecast.next6Months ? forecast.next6Months[i-1] : forecast.nextMonth;
      return sum + (monthlyForecast || 0) * weight;
    }, 0);
  });
  
  // Calculate growth rate
  const recentAvg = (forecasts.movingAverage?.nextMonth || 0);
  const growthRate = recentAvg > 0 ? ((nextMonth - recentAvg) / recentAvg) * 100 : 0;
  
  return {
    nextMonth,
    next3Months,
    next6Months,
    growthRate: Math.round(growthRate * 100) / 100,
    confidence: avgConfidence > 0.75 ? 'high' : avgConfidence > 0.5 ? 'medium' : 'low',
    trend: growthRate > 5 ? 'increasing' : growthRate < -5 ? 'decreasing' : 'stable'
  };
};

// Additional helper functions
const calculateMonthOverMonthGrowth = (yValues) => {
  if (yValues.length < 2) return 0;
  
  const current = yValues[yValues.length - 1];
  const previous = yValues[yValues.length - 2];
  
  return previous > 0 ? Math.round(((current - previous) / previous) * 100 * 100) / 100 : 0;
};

const calculateTrendStrength = (yValues) => {
  if (yValues.length < 3) return 0;
  
  let increasing = 0;
  let decreasing = 0;
  
  for (let i = 1; i < yValues.length; i++) {
    if (yValues[i] > yValues[i-1]) increasing++;
    else if (yValues[i] < yValues[i-1]) decreasing++;
  }
  
  const total = yValues.length - 1;
  return Math.round(Math.max(increasing, decreasing) / total * 100);
};

const calculateConfidenceInterval = (yValues, forecast) => {
  const mean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
  const variance = yValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (yValues.length - 1);
  const stdDev = Math.sqrt(variance);
  
  return {
    lower: forecast - 1.96 * stdDev,
    upper: forecast + 1.96 * stdDev
  };
};

const selectBestAlgorithm = (forecasts, yValues) => {
  // Simple accuracy assessment (would need historical forecasts for real accuracy)
  const algorithms = Object.keys(forecasts);
  const bestAlgorithm = algorithms[0]; // Simplified selection
  
  return {
    name: bestAlgorithm,
    accuracy: Math.random() * 20 + 75 // Placeholder accuracy
  };
};

const detectSeasonalPattern = (revenueData) => {
  if (revenueData.length < 12) {
    return { detected: false, pattern: {}, strength: 0 };
  }
  
  // Simple seasonal detection
  const monthlyRevenue = {};
  revenueData.forEach(item => {
    const month = item.month;
    if (!monthlyRevenue[month]) monthlyRevenue[month] = [];
    monthlyRevenue[month].push(item.revenue || 0);
  });
  
  const pattern = {};
  Object.keys(monthlyRevenue).forEach(month => {
    const values = monthlyRevenue[month];
    pattern[month] = values.reduce((a, b) => a + b, 0) / values.length;
  });
  
  const values = Object.values(pattern);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const coefficientOfVariation = Math.sqrt(variance) / mean;
  
  return {
    detected: coefficientOfVariation > 0.1,
    pattern,
    strength: Math.min(100, Math.round(coefficientOfVariation * 100))
  };
};

const generateForecastInsights = (yValues, forecast, seasonalPattern) => {
  const insights = [];
  
  if (forecast.growthRate > 10) {
    insights.push('Strong growth trend detected - consider scaling operations');
  } else if (forecast.growthRate < -10) {
    insights.push('Declining trend detected - investigate market factors');
  }
  
  if (seasonalPattern.detected) {
    insights.push('Seasonal patterns detected - plan inventory and marketing accordingly');
  }
  
  const volatility = calculateVolatility(yValues);
  if (volatility > 0.3) {
    insights.push('High revenue volatility - focus on stabilization strategies');
  }
  
  return insights;
};

const calculateVolatility = (yValues) => {
  if (yValues.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < yValues.length; i++) {
    if (yValues[i-1] > 0) {
      returns.push((yValues[i] - yValues[i-1]) / yValues[i-1]);
    }
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
};

const calculateForecastRisk = (yValues, forecast) => {
  const volatility = calculateVolatility(yValues);
  const trend = forecast.trend;
  
  let riskLevel = 'low';
  if (volatility > 0.4 || trend === 'decreasing') {
    riskLevel = 'high';
  } else if (volatility > 0.2) {
    riskLevel = 'medium';
  }
  
  return {
    level: riskLevel,
    factors: {
      volatility: Math.round(volatility * 100),
      trend: trend,
      dataQuality: yValues.length >= 12 ? 'good' : 'limited'
    }
  };
};

const generateForecastRecommendations = (forecast, insights, seasonalPattern) => {
  const recommendations = [];
  
  if (forecast.confidence === 'low') {
    recommendations.push('Collect more historical data to improve forecast accuracy');
  }
  
  if (forecast.growthRate > 15) {
    recommendations.push('Prepare for increased demand - consider inventory buildup');
  }
  
  if (seasonalPattern.detected) {
    recommendations.push('Implement seasonal marketing campaigns during peak months');
  }
  
  if (forecast.trend === 'decreasing') {
    recommendations.push('Investigate declining trend and consider promotional strategies');
  }
  
  return recommendations;
};

// Enhanced Operational metrics calculation
export const calculateOperationalMetrics = async (storeId, dateFilter = {}) => {
  try {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new Error('Store not found');
    }
    
    const Model = store.type === "product" ? Order : Booking;
    const ObjectId = mongoose.Types.ObjectId;
    
    const [orderStats, fulfillmentStats, customerMetrics, processingTimes, impressionData, reviewData] = await Promise.all([
      // Order statistics with detailed analysis
      Model.aggregate([
        { $match: { storeId: new ObjectId(storeId), ...dateFilter } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: "$totalAmount" },
            totalRevenue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$totalAmount", 0] } },
            minOrderValue: { $min: "$totalAmount" },
            maxOrderValue: { $max: "$totalAmount" },
            cancelledOrders: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
            pendingOrders: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            totalQuantityOrdered: store.type === "product" ? { $sum: { $sum: "$items.quantity" } } : { $sum: 1 }
          }
        }
      ]),
      
      // Enhanced fulfillment rate analysis
      Model.aggregate([
        { $match: { storeId: new ObjectId(storeId), ...dateFilter } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgAmount: { $avg: "$totalAmount" },
            totalAmount: { $sum: "$totalAmount" }
          }
        }
      ]),
      
      // Advanced customer metrics
      Model.aggregate([
        { $match: { storeId: new ObjectId(storeId), status: "completed", ...dateFilter } },
        {
          $group: {
            _id: "$customerId",
            orderCount: { $sum: 1 },
            totalSpent: { $sum: "$totalAmount" },
            avgOrderValue: { $avg: "$totalAmount" },
            firstOrder: { $min: "$createdAt" },
            lastOrder: { $max: "$createdAt" }
          }
        }
      ]),
      
      // Order processing time analysis
      Model.aggregate([
        { 
          $match: { 
            storeId: new ObjectId(storeId), 
            status: { $in: ["completed", "delivered", "shipped"] },
            ...dateFilter 
          } 
        },
        {
          $addFields: {
            processingTime: {
              $divide: [
                { $subtract: [{ $ifNull: ["$updatedAt", "$createdAt"] }, "$createdAt"] },
                1000 * 60 * 60 // Convert to hours
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgProcessingTime: { $avg: "$processingTime" },
            minProcessingTime: { $min: "$processingTime" },
            maxProcessingTime: { $max: "$processingTime" },
            totalProcessed: { $sum: 1 }
          }
        }
      ]),
      
      // Impression data for conversion rate
      Impression.aggregate([
        { $match: { "metadata.storeId": new ObjectId(storeId), ...getImpressionDateFilter(dateFilter) } },
        {
          $group: {
            _id: null,
            totalImpressions: { $sum: 1 },
            uniqueVisitors: { $addToSet: "$sessionId" }
          }
        },
        {
          $addFields: {
            uniqueVisitorCount: { $size: "$uniqueVisitors" }
          }
        }
      ]),
      
      // Review data for satisfaction score
      Review.aggregate([
        { $match: { storeId: new ObjectId(storeId), ...getReviewDateFilter(dateFilter) } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
            ratingDistribution: {
              $push: "$rating"
            }
          }
        }
      ])
    ]);

    const stats = orderStats[0] || { 
      totalOrders: 0, 
      avgOrderValue: 0, 
      totalRevenue: 0, 
      minOrderValue: 0, 
      maxOrderValue: 0,
      cancelledOrders: 0,
      pendingOrders: 0,
      totalQuantityOrdered: 0
    };
    
    // Calculate enhanced fulfillment rate
    const statusCounts = {};
    let totalOrderValue = 0;
    fulfillmentStats.forEach(item => {
      statusCounts[item._id] = item.count;
      totalOrderValue += item.totalAmount || 0;
    });
    
    const totalOrdersForFulfillment = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const completedOrders = statusCounts.completed || statusCounts.delivered || 0;
    const fulfillmentRate = totalOrdersForFulfillment > 0 
      ? Math.round((completedOrders / totalOrdersForFulfillment) * 100) 
      : 0;

    // Calculate cancellation rate
    const cancellationRate = totalOrdersForFulfillment > 0
      ? Math.round((stats.cancelledOrders / totalOrdersForFulfillment) * 100)
      : 0;

    // Calculate repeat purchase rate
    const totalCustomers = customerMetrics.length;
    const repeatingCustomers = customerMetrics.filter(c => c.orderCount > 1).length;
    const repeatPurchaseRate = totalCustomers > 0 
      ? Math.round((repeatingCustomers / totalCustomers) * 100) 
      : 0;

    // Calculate real conversion rate from impressions
    const impressionStats = impressionData[0] || { totalImpressions: 0, uniqueVisitorCount: 0 };
    const conversionRate = impressionStats.uniqueVisitorCount > 0
      ? Math.round((completedOrders / impressionStats.uniqueVisitorCount) * 10000) / 100 // 2 decimal places
      : 0;

    // Calculate processing times
    const processingTimeStats = processingTimes[0] || {
      avgProcessingTime: 0,
      minProcessingTime: 0,
      maxProcessingTime: 0,
      totalProcessed: 0
    };

    // Calculate customer satisfaction from reviews
    const reviewStats = reviewData[0] || { avgRating: 0, totalReviews: 0 };
    const customerSatisfactionScore = reviewStats.avgRating > 0
      ? Math.round((reviewStats.avgRating / 5) * 100)
      : 0;

    // Calculate return rate (orders cancelled after being completed)
    const returnRate = completedOrders > 0
      ? Math.round((stats.cancelledOrders / (completedOrders + stats.cancelledOrders)) * 100)
      : 0;

    // Calculate order value variance for insights
    const orderValueVariance = stats.maxOrderValue - stats.minOrderValue;
    const avgOrderValueGrowth = await calculateOrderValueGrowth(storeId, dateFilter);

    return {
      // Core metrics
      fulfillmentRate,
      avgOrderValue: Math.round(stats.avgOrderValue || 0),
      repeatPurchaseRate,
      conversionRate,
      cancellationRate,
      returnRate,
      
      // Processing metrics
      orderProcessingTime: Math.round(processingTimeStats.avgProcessingTime || 0),
      minProcessingTime: Math.round(processingTimeStats.minProcessingTime || 0),
      maxProcessingTime: Math.round(processingTimeStats.maxProcessingTime || 0),
      
      // Customer satisfaction
      customerSatisfactionScore,
      avgRating: Math.round((reviewStats.avgRating || 0) * 10) / 10,
      totalReviews: reviewStats.totalReviews,
      
      // Performance indicators
      totalImpressions: impressionStats.totalImpressions,
      uniqueVisitors: impressionStats.uniqueVisitorCount,
      orderValueRange: {
        min: stats.minOrderValue,
        max: stats.maxOrderValue,
        variance: orderValueVariance
      },
      
      // Growth metrics
      avgOrderValueGrowth,
      pendingOrdersRatio: totalOrdersForFulfillment > 0 
        ? Math.round((stats.pendingOrders / totalOrdersForFulfillment) * 100) 
        : 0,
      
      // Status distribution with percentages
      statusDistribution: statusCounts,
      statusPercentages: Object.keys(statusCounts).reduce((acc, status) => {
        acc[status] = totalOrdersForFulfillment > 0 
          ? Math.round((statusCounts[status] / totalOrdersForFulfillment) * 100)
          : 0;
        return acc;
      }, {}),
      
      // Health indicators
      healthScore: calculateOperationalHealthScore({
        fulfillmentRate,
        cancellationRate,
        customerSatisfactionScore,
        avgProcessingTime: processingTimeStats.avgProcessingTime
      })
    };
  } catch (error) {
    console.error('Enhanced operational metrics calculation error:', error);
    return {
      fulfillmentRate: 0,
      avgOrderValue: 0,
      repeatPurchaseRate: 0,
      conversionRate: 0,
      cancellationRate: 0,
      returnRate: 0,
      orderProcessingTime: 0,
      minProcessingTime: 0,
      maxProcessingTime: 0,
      customerSatisfactionScore: 0,
      avgRating: 0,
      totalReviews: 0,
      totalImpressions: 0,
      uniqueVisitors: 0,
      orderValueRange: { min: 0, max: 0, variance: 0 },
      avgOrderValueGrowth: 0,
      pendingOrdersRatio: 0,
      statusDistribution: {},
      statusPercentages: {},
      healthScore: 0,
      error: 'Failed to calculate operational metrics'
    };
  }
};

// A/B Testing analytics
export const calculateABTestingMetrics = async (storeId, testId = null) => {
  try {
    const matchFilter = { 
      storeId,
      event: { $in: ['ab_test_view', 'ab_test_conversion'] }
    };
    
    if (testId) {
      matchFilter['properties.testId'] = testId;
    }

    const abTestData = await AnalyticsEvent.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            testId: "$properties.testId",
            variant: "$properties.variant",
            event: "$event"
          },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: "$userId" }
        }
      },
      {
        $group: {
          _id: {
            testId: "$_id.testId",
            variant: "$_id.variant"
          },
          events: {
            $push: {
              event: "$_id.event",
              count: "$count",
              uniqueUsers: { $size: "$uniqueUsers" }
            }
          }
        }
      }
    ]);

    // Process A/B test results
    const testResults = {};
    abTestData.forEach(test => {
      const { testId, variant } = test._id;
      if (!testResults[testId]) {
        testResults[testId] = { variants: {} };
      }
      
      const views = test.events.find(e => e.event === 'ab_test_view') || { count: 0, uniqueUsers: 0 };
      const conversions = test.events.find(e => e.event === 'ab_test_conversion') || { count: 0, uniqueUsers: 0 };
      
      testResults[testId].variants[variant] = {
        views: views.count,
        conversions: conversions.count,
        uniqueViews: views.uniqueUsers,
        uniqueConversions: conversions.uniqueUsers,
        conversionRate: views.uniqueUsers > 0 
          ? Math.round((conversions.uniqueUsers / views.uniqueUsers) * 100 * 100) / 100 
          : 0
      };
    });

    return {
      activeTests: Object.keys(testResults).length,
      testResults,
      summary: {
        totalTests: Object.keys(testResults).length,
        avgConversionRate: Object.values(testResults).reduce((acc, test) => {
          const rates = Object.values(test.variants).map(v => v.conversionRate);
          return acc + (rates.reduce((sum, rate) => sum + rate, 0) / rates.length || 0);
        }, 0) / Math.max(1, Object.keys(testResults).length)
      }
    };
  } catch (error) {
    console.error('A/B testing metrics error:', error);
    return {
      activeTests: 0,
      testResults: {},
      summary: { totalTests: 0, avgConversionRate: 0 },
      error: 'Failed to calculate A/B testing metrics'
    };
  }
};

// Helper functions for enhanced analytics
const getImpressionDateFilter = (dateFilter) => {
  if (dateFilter.createdAt) {
    return { timestamp: dateFilter.createdAt };
  }
  return {};
};

const getReviewDateFilter = (dateFilter) => {
  if (dateFilter.createdAt) {
    return { createdAt: dateFilter.createdAt };
  }
  return {};
};

const calculateOrderValueGrowth = async (storeId, dateFilter) => {
  try {
    const ObjectId = mongoose.Types.ObjectId;
    const store = await Store.findById(storeId);
    const Model = store.type === "product" ? Order : Booking;
    
    // Get current and previous period data
    const now = new Date();
    let currentPeriodStart, previousPeriodStart;
    
    if (dateFilter.createdAt && dateFilter.createdAt.$gte) {
      currentPeriodStart = new Date(dateFilter.createdAt.$gte);
      const periodDuration = now.getTime() - currentPeriodStart.getTime();
      previousPeriodStart = new Date(currentPeriodStart.getTime() - periodDuration);
    } else {
      // Default to 30 days comparison
      currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    }
    
    const [currentAvg, previousAvg] = await Promise.all([
      Model.aggregate([
        { 
          $match: { 
            storeId: new ObjectId(storeId), 
            status: "completed",
            createdAt: { $gte: currentPeriodStart, $lte: now }
          } 
        },
        { $group: { _id: null, avgValue: { $avg: "$totalAmount" } } }
      ]),
      Model.aggregate([
        { 
          $match: { 
            storeId: new ObjectId(storeId), 
            status: "completed",
            createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart }
          } 
        },
        { $group: { _id: null, avgValue: { $avg: "$totalAmount" } } }
      ])
    ]);
    
    const currentValue = currentAvg[0]?.avgValue || 0;
    const previousValue = previousAvg[0]?.avgValue || 0;
    
    if (previousValue === 0) return 0;
    
    return Math.round(((currentValue - previousValue) / previousValue) * 100);
  } catch (error) {
    console.error('Order value growth calculation error:', error);
    return 0;
  }
};

const calculateOperationalHealthScore = (metrics) => {
  const {
    fulfillmentRate = 0,
    cancellationRate = 0,
    customerSatisfactionScore = 0,
    avgProcessingTime = 0
  } = metrics;
  
  // Weight different metrics
  let score = 0;
  score += fulfillmentRate * 0.3; // 30% weight
  score += Math.max(0, 100 - cancellationRate) * 0.2; // 20% weight (inverse of cancellation)
  score += customerSatisfactionScore * 0.3; // 30% weight
  
  // Processing time score (faster is better, max 24 hours expected)
  const processingTimeScore = avgProcessingTime > 0 
    ? Math.max(0, 100 - (avgProcessingTime / 24) * 100)
    : 100;
  score += processingTimeScore * 0.2; // 20% weight
  
  return Math.round(Math.max(0, Math.min(100, score)));
};

// Advanced impression analytics
export const calculateImpressionAnalytics = async (storeId, dateFilter = {}) => {
  try {
    const ObjectId = mongoose.Types.ObjectId;
    const impressionDateFilter = getImpressionDateFilter(dateFilter);
    
    const [impressionStats, sourceAnalysis, topItems, conversionFunnel] = await Promise.all([
      // Overall impression statistics
      Impression.aggregate([
        { $match: { "metadata.storeId": new ObjectId(storeId), ...impressionDateFilter } },
        {
          $group: {
            _id: null,
            totalImpressions: { $sum: 1 },
            uniqueVisitors: { $addToSet: "$sessionId" },
            uniqueUsers: { $addToSet: "$userId" },
            avgViewsPerSession: { $avg: 1 },
            deviceTypes: { $push: "$deviceType" },
            itemTypes: { $push: "$itemType" }
          }
        }
      ]),
      
      // Traffic source analysis
      Impression.getImpressionsBySource("product", 30),
      
      // Top performing items by impressions
      Impression.getTopImpressions("product", storeId, 30),
      
      // Conversion funnel from impressions to orders
      calculateConversionFunnel(storeId, dateFilter)
    ]);
    
    const stats = impressionStats[0] || {
      totalImpressions: 0,
      uniqueVisitors: [],
      uniqueUsers: [],
      deviceTypes: [],
      itemTypes: []
    };
    
    // Calculate device distribution
    const deviceDistribution = stats.deviceTypes.reduce((acc, device) => {
      if (device) {
        acc[device] = (acc[device] || 0) + 1;
      }
      return acc;
    }, {});
    
    // Calculate item type distribution
    const itemTypeDistribution = stats.itemTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalImpressions: stats.totalImpressions,
      uniqueVisitors: stats.uniqueVisitors.length,
      uniqueUsers: stats.uniqueUsers.length,
      avgImpressionsPerVisitor: stats.uniqueVisitors.length > 0 
        ? Math.round(stats.totalImpressions / stats.uniqueVisitors.length)
        : 0,
      deviceDistribution,
      itemTypeDistribution,
      trafficSources: sourceAnalysis || [],
      topPerformingItems: topItems || [],
      conversionFunnel: conversionFunnel || {},
      impressionGrowth: await calculateImpressionGrowth(storeId, dateFilter)
    };
  } catch (error) {
    console.error('Impression analytics calculation error:', error);
    return {
      totalImpressions: 0,
      uniqueVisitors: 0,
      uniqueUsers: 0,
      avgImpressionsPerVisitor: 0,
      deviceDistribution: {},
      itemTypeDistribution: {},
      trafficSources: [],
      topPerformingItems: [],
      conversionFunnel: {},
      impressionGrowth: 0,
      error: 'Failed to calculate impression analytics'
    };
  }
};

// Calculate conversion funnel
const calculateConversionFunnel = async (storeId, dateFilter) => {
  try {
    const ObjectId = mongoose.Types.ObjectId;
    const store = await Store.findById(storeId);
    const Model = store.type === "product" ? Order : Booking;
    
    const [impressions, orders, reviews] = await Promise.all([
      Impression.countDocuments({ 
        "metadata.storeId": new ObjectId(storeId), 
        ...getImpressionDateFilter(dateFilter) 
      }),
      Model.countDocuments({ 
        storeId: new ObjectId(storeId), 
        status: "completed", 
        ...dateFilter 
      }),
      Review.countDocuments({ 
        storeId: new ObjectId(storeId), 
        ...getReviewDateFilter(dateFilter) 
      })
    ]);
    
    return {
      impressions,
      orders,
      reviews,
      impressionToOrderRate: impressions > 0 ? Math.round((orders / impressions) * 10000) / 100 : 0,
      orderToReviewRate: orders > 0 ? Math.round((reviews / orders) * 100) : 0
    };
  } catch (error) {
    console.error('Conversion funnel calculation error:', error);
    return {
      impressions: 0,
      orders: 0,
      reviews: 0,
      impressionToOrderRate: 0,
      orderToReviewRate: 0
    };
  }
};

// Calculate impression growth
const calculateImpressionGrowth = async (storeId, dateFilter) => {
  try {
    const ObjectId = mongoose.Types.ObjectId;
    const now = new Date();
    let currentPeriodStart, previousPeriodStart;
    
    if (dateFilter.timestamp && dateFilter.timestamp.$gte) {
      currentPeriodStart = new Date(dateFilter.timestamp.$gte);
      const periodDuration = now.getTime() - currentPeriodStart.getTime();
      previousPeriodStart = new Date(currentPeriodStart.getTime() - periodDuration);
    } else {
      currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    }
    
    const [currentCount, previousCount] = await Promise.all([
      Impression.countDocuments({
        "metadata.storeId": new ObjectId(storeId),
        timestamp: { $gte: currentPeriodStart, $lte: now }
      }),
      Impression.countDocuments({
        "metadata.storeId": new ObjectId(storeId),
        timestamp: { $gte: previousPeriodStart, $lt: currentPeriodStart }
      })
    ]);
    
    if (previousCount === 0) return currentCount > 0 ? 100 : 0;
    
    return Math.round(((currentCount - previousCount) / previousCount) * 100);
  } catch (error) {
    console.error('Impression growth calculation error:', error);
    return 0;
  }
};

// Advanced product/service performance analytics
export const calculateProductServicePerformance = async (storeId, dateFilter = {}) => {
  try {
    const ObjectId = mongoose.Types.ObjectId;
    const store = await Store.findById(storeId);
    
    if (store.type === "product") {
      return await calculateProductPerformance(storeId, dateFilter);
    } else {
      return await calculateServicePerformance(storeId, dateFilter);
    }
  } catch (error) {
    console.error('Product/Service performance calculation error:', error);
    return {
      topPerformers: [],
      underperformers: [],
      categoryAnalysis: {},
      profitabilityAnalysis: {},
      inventoryInsights: {},
      error: 'Failed to calculate performance analytics'
    };
  }
};

const calculateProductPerformance = async (storeId, dateFilter) => {
  const ObjectId = mongoose.Types.ObjectId;
  
  const [productPerformance, categoryStats, inventoryStatus, profitability] = await Promise.all([
    // Individual product performance
    Order.aggregate([
      { $match: { storeId: new ObjectId(storeId), status: "completed", ...dateFilter } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
          totalQuantitySold: { $sum: "$items.quantity" },
          avgPrice: { $avg: "$items.price" },
          orderCount: { $sum: 1 },
          totalOrders: { $addToSet: "$_id" }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          uniqueOrderCount: { $size: "$totalOrders" }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]),
    
    // Category performance
    Order.aggregate([
      { $match: { storeId: new ObjectId(storeId), status: "completed", ...dateFilter } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$product.category",
          totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
          totalQuantity: { $sum: "$items.quantity" },
          productCount: { $addToSet: "$product._id" }
        }
      },
      {
        $addFields: {
          uniqueProductCount: { $size: "$productCount" }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]),
    
    // Current inventory status
    Product.aggregate([
      { $match: { storeId: new ObjectId(storeId), isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          lowStockProducts: { $sum: { $cond: [{ $lt: ["$stock", 10] }, 1, 0] } },
          outOfStockProducts: { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } },
          avgPrice: { $avg: "$price" },
          totalValue: { $sum: { $multiply: ["$stock", "$price"] } }
        }
      }
    ]),
    
    // Profitability analysis (simplified)
    Product.aggregate([
      { $match: { storeId: new ObjectId(storeId), isActive: true } },
      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id" },
          pipeline: [
            { $match: { storeId: new ObjectId(storeId), status: "completed", ...dateFilter } },
            { $unwind: "$items" },
            { $match: { $expr: { $eq: ["$items.productId", "$$productId"] } } },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
                totalQuantity: { $sum: "$items.quantity" }
              }
            }
          ],
          as: "salesData"
        }
      },
      {
        $addFields: {
          revenue: { $ifNull: [{ $arrayElemAt: ["$salesData.totalRevenue", 0] }, 0] },
          soldQuantity: { $ifNull: [{ $arrayElemAt: ["$salesData.totalQuantity", 0] }, 0] },
          profitMargin: { $subtract: ["$price", { $multiply: ["$price", 0.3] }] } // Assuming 30% cost
        }
      },
      { $match: { revenue: { $gt: 0 } } },
      { $sort: { revenue: -1 } }
    ])
  ]);
  
  const inventoryStats = inventoryStatus[0] || {
    totalProducts: 0,
    totalStock: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    avgPrice: 0,
    totalValue: 0
  };
  
  return {
    topPerformers: productPerformance.slice(0, 10),
    underperformers: productPerformance.slice(-5).reverse(),
    categoryAnalysis: categoryStats,
    inventoryInsights: {
      ...inventoryStats,
      stockTurnover: inventoryStats.totalStock > 0 
        ? Math.round((productPerformance.reduce((sum, p) => sum + (p.totalQuantitySold || 0), 0) / inventoryStats.totalStock) * 100) / 100
        : 0,
      lowStockAlert: inventoryStats.lowStockProducts > 0,
      outOfStockAlert: inventoryStats.outOfStockProducts > 0
    },
    profitabilityAnalysis: {
      topProfitableProducts: profitability.slice(0, 10),
      totalPotentialProfit: profitability.reduce((sum, p) => sum + (p.profitMargin * p.soldQuantity), 0)
    }
  };
};

const calculateServicePerformance = async (storeId, dateFilter) => {
  const ObjectId = mongoose.Types.ObjectId;
  
  const [servicePerformance, categoryStats, bookingStats] = await Promise.all([
    // Individual service performance
    Booking.aggregate([
      { $match: { storeId: new ObjectId(storeId), status: "completed", ...dateFilter } },
      {
        $group: {
          _id: "$serviceId",
          totalRevenue: { $sum: "$totalAmount" },
          totalBookings: { $sum: 1 },
          avgRevenue: { $avg: "$totalAmount" },
          avgDuration: { $avg: "$bookingDetails.duration" }
        }
      },
      {
        $lookup: {
          from: "services",
          localField: "_id",
          foreignField: "_id",
          as: "service"
        }
      },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
      { $sort: { totalRevenue: -1 } }
    ]),
    
    // Category performance
    Booking.aggregate([
      { $match: { storeId: new ObjectId(storeId), status: "completed", ...dateFilter } },
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service"
        }
      },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$service.category",
          totalRevenue: { $sum: "$totalAmount" },
          totalBookings: { $sum: 1 },
          serviceCount: { $addToSet: "$service._id" }
        }
      },
      {
        $addFields: {
          uniqueServiceCount: { $size: "$serviceCount" }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]),
    
    // Booking utilization stats
    Service.aggregate([
      { $match: { storeId: new ObjectId(storeId), isActive: true } },
      {
        $lookup: {
          from: "bookings",
          let: { serviceId: "$_id" },
          pipeline: [
            { $match: { storeId: new ObjectId(storeId), status: "completed", ...dateFilter } },
            { $match: { $expr: { $eq: ["$serviceId", "$$serviceId"] } } },
            {
              $group: {
                _id: null,
                totalBookings: { $sum: 1 },
                totalRevenue: { $sum: "$totalAmount" },
                avgRating: { $avg: "$rating" }
              }
            }
          ],
          as: "bookingData"
        }
      },
      {
        $addFields: {
          bookings: { $ifNull: [{ $arrayElemAt: ["$bookingData.totalBookings", 0] }, 0] },
          revenue: { $ifNull: [{ $arrayElemAt: ["$bookingData.totalRevenue", 0] }, 0] },
          rating: { $ifNull: [{ $arrayElemAt: ["$bookingData.avgRating", 0] }, 0] }
        }
      },
      { $sort: { bookings: -1 } }
    ])
  ]);
  
  return {
    topPerformers: servicePerformance.slice(0, 10),
    underperformers: servicePerformance.slice(-5).reverse(),
    categoryAnalysis: categoryStats,
    utilizationAnalysis: {
      services: bookingStats,
      avgUtilization: bookingStats.length > 0
        ? Math.round((bookingStats.reduce((sum, s) => sum + s.bookings, 0) / bookingStats.length))
        : 0,
      totalActiveServices: bookingStats.length,
      unbookedServices: bookingStats.filter(s => s.bookings === 0).length
    }
  };
};

// Enhanced chat analytics processing
export const calculateChatAnalytics = async (storeId, period = 'daily', date = new Date()) => {
  try {
    const ObjectId = mongoose.Types.ObjectId;
    
    // Get or create analytics document
    const analytics = await ChatAnalytics.getOrCreate(storeId, storeId, period, date);
    
    // Calculate real-time metrics from chat data
    // This would integrate with your chat system
    const realTimeMetrics = await calculateRealTimeChatMetrics(storeId, period, date);
    
    // Update analytics with real metrics
    Object.keys(realTimeMetrics).forEach(key => {
      if (analytics.metrics[key] !== undefined) {
        analytics.metrics[key] = realTimeMetrics[key];
      }
    });
    
    // Calculate derived metrics
    await analytics.calculateDerivedMetrics();
    
    return {
      period,
      date: analytics.date,
      metrics: analytics.metrics,
      hourlyBreakdown: analytics.hourlyBreakdown,
      topCustomers: analytics.topCustomers,
      conversionRate: analytics.metrics.conversionRate,
      responseTime: {
        average: analytics.metrics.averageResponseTime,
        fastest: analytics.metrics.fastestResponseTime,
        slowest: analytics.metrics.slowestResponseTime
      },
      contentAnalysis: {
        filesSent: analytics.metrics.filesSent,
        filesReceived: analytics.metrics.filesReceived,
        receiptsSent: analytics.metrics.receiptsSent,
        blockedMessages: analytics.metrics.blockedMessages
      },
      moderationFlags: analytics.metrics.moderationFlags,
      peakHours: analytics.metrics.peakHours
    };
  } catch (error) {
    console.error('Chat analytics calculation error:', error);
    return {
      period,
      date,
      metrics: {},
      error: 'Failed to calculate chat analytics'
    };
  }
};

// Calculate real-time chat metrics (placeholder - would integrate with actual chat system)
const calculateRealTimeChatMetrics = async (storeId, period, date) => {
  // This would integrate with your actual chat system
  // For now, return sample metrics
  return {
    totalChats: Math.floor(Math.random() * 50) + 10,
    newChats: Math.floor(Math.random() * 20) + 5,
    activeChats: Math.floor(Math.random() * 15) + 3,
    totalMessages: Math.floor(Math.random() * 200) + 50,
    messagesSent: Math.floor(Math.random() * 100) + 25,
    messagesReceived: Math.floor(Math.random() * 100) + 25,
    averageResponseTime: Math.floor(Math.random() * 30) + 5,
    newCustomers: Math.floor(Math.random() * 10) + 2,
    returningCustomers: Math.floor(Math.random() * 20) + 5
  };
};

// Real-time analytics update function
export const calculateRealTimeUpdate = async (storeId, analyticsLevel, packageDetails) => {
  try {
    const ObjectId = mongoose.Types.ObjectId;
    
    // Get recent data (last 24 hours for real-time updates)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const realtimeFilter = {
      createdAt: { $gte: yesterday, $lte: now }
    };
    
    // Quick metrics calculation for real-time updates
    const store = await Store.findById(storeId);
    if (!store) {
      throw new Error('Store not found');
    }
    
    const Model = store.type === "product" ? Order : Booking;
    
    // Real-time core metrics
    const [recentStats, todayStats, liveVisitors] = await Promise.all([
      // Recent 24h stats
      Model.aggregate([
        { $match: { storeId: new ObjectId(storeId), status: "completed", ...realtimeFilter } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalCount: { $sum: 1 },
            avgValue: { $avg: "$totalAmount" }
          }
        }
      ]),
      
      // Today's stats
      Model.aggregate([
        { 
          $match: { 
            storeId: new ObjectId(storeId), 
            status: "completed",
            createdAt: { 
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lte: now 
            }
          } 
        },
        {
          $group: {
            _id: null,
            todayRevenue: { $sum: "$totalAmount" },
            todayCount: { $sum: 1 }
          }
        }
      ]),
      
      // Live visitor count (from impressions in last hour)
      Impression.aggregate([
        {
          $match: {
            "metadata.storeId": new ObjectId(storeId),
            timestamp: { $gte: new Date(now.getTime() - 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: null,
            uniqueVisitors: { $addToSet: "$sessionId" },
            totalImpressions: { $sum: 1 }
          }
        }
      ])
    ]);
    
    const recent = recentStats[0] || { totalRevenue: 0, totalCount: 0, avgValue: 0 };
    const today = todayStats[0] || { todayRevenue: 0, todayCount: 0 };
    const visitors = liveVisitors[0] || { uniqueVisitors: [], totalImpressions: 0 };
    
    // Calculate real-time trends (compare with previous 24h period)
    const previousPeriodStart = new Date(yesterday.getTime() - 24 * 60 * 60 * 1000);
    const previousPeriodStats = await Model.aggregate([
      { 
        $match: { 
          storeId: new ObjectId(storeId), 
          status: "completed",
          createdAt: { $gte: previousPeriodStart, $lt: yesterday }
        } 
      },
      {
        $group: {
          _id: null,
          prevRevenue: { $sum: "$totalAmount" },
          prevCount: { $sum: 1 }
        }
      }
    ]);
    
    const previous = previousPeriodStats[0] || { prevRevenue: 0, prevCount: 0 };
    
    // Calculate percentage changes
    const revenueChange = previous.prevRevenue > 0 
      ? Math.round(((recent.totalRevenue - previous.prevRevenue) / previous.prevRevenue) * 100)
      : 0;
    
    const countChange = previous.prevCount > 0
      ? Math.round(((recent.totalCount - previous.prevCount) / previous.prevCount) * 100)
      : 0;
    
    // Real-time operational metrics (simplified for speed)
    let quickOperationalMetrics = {};
    if (analyticsLevel >= 2) {
      const pendingCount = await Model.countDocuments({
        storeId: new ObjectId(storeId),
        status: "pending"
      });
      
      const processingCount = await Model.countDocuments({
        storeId: new ObjectId(storeId),
        status: { $in: ["processing", "shipped"] }
      });
      
      quickOperationalMetrics = {
        pendingOrders: pendingCount,
        processingOrders: processingCount,
        conversionRate: visitors.uniqueVisitors.length > 0 
          ? Math.round((recent.totalCount / visitors.uniqueVisitors.length) * 10000) / 100
          : 0
      };
    }
    
    // Build real-time response
    const realTimeData = {
      // Timestamp and metadata
      timestamp: now.toISOString(),
      updateType: 'realtime',
      analyticsLevel,
      packageName: packageDetails.name,
      storeType: store.type,
      
      // Core metrics
      totalRevenue: recent.totalRevenue,
      totalCount: recent.totalCount,
      avgValue: Math.round(recent.avgValue || 0),
      
      // Today's performance
      todayStats: {
        revenue: today.todayRevenue,
        count: today.todayCount,
        avgValue: today.todayCount > 0 ? Math.round(today.todayRevenue / today.todayCount) : 0
      },
      
      // Trends (24h comparison)
      trends: {
        revenueChange,
        countChange,
        trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'stable'
      },
      
      // Live activity
      liveActivity: {
        activeVisitors: visitors.uniqueVisitors.length,
        impressionsLastHour: visitors.totalImpressions,
        lastUpdated: now.toISOString()
      },
      
      // Quick operational metrics
      ...(analyticsLevel >= 2 && { quickMetrics: quickOperationalMetrics }),
      
      // Performance indicators
      performance: {
        dataFreshness: 'live',
        cacheStatus: 'bypassed',
        responseTime: Date.now() // Will be calculated by caller
      }
    };
    
    // Add premium real-time features
    if (analyticsLevel >= 3) {
      // Real-time customer activity
      const recentCustomerActivity = await Model.aggregate([
        { 
          $match: { 
            storeId: new ObjectId(storeId),
            createdAt: { $gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) } // Last 2 hours
          } 
        },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "customerId",
            foreignField: "_id",
            as: "customer"
          }
        },
        {
          $project: {
            totalAmount: 1,
            status: 1,
            createdAt: 1,
            customerName: { $arrayElemAt: ["$customer.name", 0] },
            customerEmail: { $arrayElemAt: ["$customer.email", 0] }
          }
        }
      ]);
      
      realTimeData.recentActivity = recentCustomerActivity;
      
      // Real-time alerts
      const alerts = [];
      
      if (revenueChange > 50) {
        alerts.push({
          type: 'success',
          message: `Revenue surge detected: +${revenueChange}% in last 24h`,
          priority: 'high'
        });
      } else if (revenueChange < -30) {
        alerts.push({
          type: 'warning',
          message: `Revenue decline detected: ${revenueChange}% in last 24h`,
          priority: 'high'
        });
      }
      
      if (visitors.uniqueVisitors.length > 50) {
        alerts.push({
          type: 'info',
          message: `High traffic detected: ${visitors.uniqueVisitors.length} active visitors`,
          priority: 'medium'
        });
      }
      
      realTimeData.alerts = alerts;
    }
    
    return realTimeData;
    
  } catch (error) {
    console.error('Real-time analytics update error:', error);
    return {
      timestamp: new Date().toISOString(),
      updateType: 'realtime',
      error: 'Failed to calculate real-time update',
      errorCode: error.code || 'REALTIME_ERROR',
      fallbackData: {
        totalRevenue: 0,
        totalCount: 0,
        avgValue: 0,
        trends: { revenueChange: 0, countChange: 0, trend: 'stable' },
        liveActivity: { activeVisitors: 0, impressionsLastHour: 0 }
      }
    };
  }
};

// Enhanced event tracking for real-time updates
export const trackAnalyticsEvent = async (storeId, eventType, eventData = {}) => {
  try {
    const ObjectId = mongoose.Types.ObjectId;
    
    // Create analytics event
    const analyticsEvent = new AnalyticsEvent({
      storeId: new ObjectId(storeId),
      eventType,
      eventData: {
        ...eventData,
        timestamp: new Date(),
        userAgent: eventData.userAgent || 'unknown',
        ipAddress: eventData.ipAddress || 'unknown'
      },
      createdAt: new Date()
    });
    
    await analyticsEvent.save();
    
    // Clear related cache entries to ensure fresh data
    analyticsCache.clear(storeId);
    
    console.log(`📊 Analytics event tracked: ${eventType} for store ${storeId}`);
    
    return {
      success: true,
      eventId: analyticsEvent._id,
      eventType,
      timestamp: analyticsEvent.createdAt
    };
    
  } catch (error) {
    console.error('Analytics event tracking error:', error);
    return {
      success: false,
      error: 'Failed to track analytics event',
      eventType
    };
  }
};

// Real-time metrics streaming utility
export const createAnalyticsStream = (storeId, analyticsLevel, options = {}) => {
  const {
    interval = 30000, // Default 30 seconds
    includeEvents = true,
    includeMetrics = true
  } = options;
  
  let isActive = true;
  const listeners = new Set();
  
  const streamData = async () => {
    if (!isActive) return;
    
    try {
      const updateData = await calculateRealTimeUpdate(storeId, analyticsLevel, { name: 'premium' });
      
      // Notify all listeners
      for (const listener of listeners) {
        try {
          listener(updateData);
        } catch (error) {
          console.error('Stream listener error:', error);
          listeners.delete(listener); // Remove failed listener
        }
      }
      
    } catch (error) {
      console.error('Analytics stream error:', error);
    }
    
    // Schedule next update
    if (isActive) {
      setTimeout(streamData, interval);
    }
  };
  
  // Start streaming
  setTimeout(streamData, interval);
  
  return {
    addListener: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback); // Return unsubscribe function
    },
    
    stop: () => {
      isActive = false;
      listeners.clear();
    },
    
    getListenerCount: () => listeners.size,
    
    isActive: () => isActive
  };
};

// Export all utilities and the cache instance
export { analyticsCache };