const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not defined in environment variables');
    throw new Error('MongoDB connection string is missing');
  }
  
  try {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    };
    
    await mongoose.connect(process.env.MONGO_URI, opts);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.log("MONGO_URI:", process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 15) + '...' : 'undefined');
    console.error('❌ Database connection failed:', err.message);
    throw err; // Propagate error instead of exiting
  }
};

module.exports = connectDB;
