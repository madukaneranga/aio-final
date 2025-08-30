import mongoose from 'mongoose';
import Package from '../models/Package.js';
import dotenv from 'dotenv';

dotenv.config();

const analyticsPackages = [
  {
    name: 'basic',
    amount: 1000,
    features: ['Basic store setup', 'Limited products', 'Basic support'],
    items: 5,
    themeColor: false,
    analytics: true,
    analyticsLevel: 1,
    analyticsFeatures: [
      '30-day sales snapshot',
      'Basic revenue metrics',
      'Customer count overview',
      'Top 3 products/services',
      'New vs returning customers'
    ],
    businessCard: false,
    invoices: false,
    socialButtons: false,
  },
  {
    name: 'standard',
    amount: 2500,
    features: [
      'Everything in Basic',
      'Unlimited products',
      'Custom themes',
      'Advanced analytics',
      'PDF/Excel exports',
      'Priority support'
    ],
    items: 50,
    themeColor: true,
    analytics: true,
    analyticsLevel: 2,
    analyticsFeatures: [
      'Everything in Basic',
      '6-month historical trends',
      'Advanced customer analytics',
      'Operational metrics',
      'Revenue trend analysis',
      'PDF/Excel report exports',
      'AI insights preview',
      'Refund & cancellation tracking'
    ],
    businessCard: true,
    invoices: true,
    socialButtons: true,
  },
  {
    name: 'premium',
    amount: 4999,
    features: [
      'Everything in Standard',
      'Global market insights',
      'Competitive analysis',
      'AI recommendations',
      'Automated reports',
      '12+ months historical data',
      'Forecasting & predictions',
      'White-label options',
      'Dedicated account manager'
    ],
    items: 200,
    themeColor: true,
    analytics: true,
    analyticsLevel: 3,
    analyticsFeatures: [
      'Everything in Standard',
      '12+ months historical data',
      'Global market insights',
      'Competitive benchmarks',
      'Customer lifetime value',
      'Churn prediction analytics',
      'AI-powered recommendations',
      'Automated weekly reports',
      'Industry trend analysis',
      'Forecasting & predictions',
      'Category performance comparison',
      'Platform-wide competitive data'
    ],
    businessCard: true,
    invoices: true,
    socialButtons: true,
  },
  {
    name: 'pro',
    amount: 1800,
    features: [
      'Enhanced Basic features',
      'More products than Basic',
      'Some analytics',
      'Basic themes'
    ],
    items: 25,
    themeColor: true,
    analytics: true,
    analyticsLevel: 1,
    analyticsFeatures: [
      '30-day sales snapshot',
      'Basic revenue metrics',
      'Customer count overview',
      'Top 5 products/services',
      'Simple trend indicators'
    ],
    businessCard: false,
    invoices: false,
    socialButtons: false,
  }
];

async function seedAnalyticsPackages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database');
    console.log('Connected to MongoDB');

    // Clear existing packages (optional - remove this line in production)
    // await Package.deleteMany({});
    // console.log('Cleared existing packages');

    // Update existing packages or create new ones
    for (const packageData of analyticsPackages) {
      const existingPackage = await Package.findOne({ name: packageData.name });
      
      if (existingPackage) {
        // Update existing package
        await Package.findOneAndUpdate(
          { name: packageData.name },
          packageData,
          { new: true, upsert: true }
        );
        console.log(`Updated package: ${packageData.name}`);
      } else {
        // Create new package
        await Package.create(packageData);
        console.log(`Created package: ${packageData.name}`);
      }
    }

    console.log('\n📊 Analytics Packages Seeded Successfully!\n');
    
    // Display package summary
    const packages = await Package.find({}).sort({ analyticsLevel: 1, amount: 1 });
    console.log('📋 Package Summary:');
    console.log('==================');
    
    packages.forEach(pkg => {
      console.log(`
📦 ${pkg.name.toUpperCase()}
   💰 Price: LKR ${pkg.amount}/month
   📊 Analytics Level: ${pkg.analyticsLevel}
   🎯 Items: ${pkg.items}
   ✨ Features: ${pkg.analyticsFeatures.length} analytics features
   📈 Key Analytics:
      ${pkg.analyticsFeatures.slice(0, 3).map(f => `   • ${f}`).join('\n      ')}
      ${pkg.analyticsFeatures.length > 3 ? `   • ... and ${pkg.analyticsFeatures.length - 3} more` : ''}
      `);
    });

    console.log('\n🚀 Ready to use! Your analytics tiers are configured.\n');
    
  } catch (error) {
    console.error('Error seeding analytics packages:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run seeder if called directly
if (process.argv[1].includes('analyticsPackages.js')) {
  seedAnalyticsPackages();
}

export default seedAnalyticsPackages;