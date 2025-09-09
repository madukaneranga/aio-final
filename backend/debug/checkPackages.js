import mongoose from 'mongoose';
import Package from '../models/Package.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkPackages() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aio-final');
    console.log('🔗 Connected to MongoDB');
    
    const packages = await Package.find();
    console.log('📦 All packages in database:');
    console.log(JSON.stringify(packages, null, 2));
    
    console.log('\n📊 Package summary:');
    packages.forEach(pkg => {
      console.log(`- ${pkg.name}: ${pkg.amount} LKR`);
    });
    
    // Check for any packages with zero or null amounts
    const invalidPackages = packages.filter(pkg => !pkg.amount || pkg.amount <= 0);
    if (invalidPackages.length > 0) {
      console.log('\n❌ Invalid packages found:');
      invalidPackages.forEach(pkg => {
        console.log(`- ${pkg.name}: ${pkg.amount}`);
      });
    } else {
      console.log('\n✅ All packages have valid amounts');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPackages();