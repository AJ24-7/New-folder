const mongoose = require('mongoose');

mongoose.set('debug', true);
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI,{
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      bufferCommands: false, // Disable mongoose buffering
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      connectTimeoutMS: 60000, // Give up initial connection after 60 seconds
      heartbeatFrequencyMS: 10000, // Check server health every 10 seconds
      retryWrites: true,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // Log detailed connection error information
    if (error.code === 'ENOTFOUND') {
      console.error('❌ DNS Resolution failed. Check your MongoDB connection string.');
      console.error('❌ Current MONGO_URI host:', (process.env.MONGO_URI?.match(/\/\/(.+?)\//)?.[1] || 'unknown'));
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. MongoDB server may be down.');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('❌ Server selection timeout. Check network connectivity and MongoDB cluster status.');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;
