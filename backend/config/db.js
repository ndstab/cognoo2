const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.log("MONGO_URI:", process.env.MONGO_URI);
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
