const app = require('./app');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB only if MONGO_URI is defined
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('✅ MongoDB connected successfully');
      startServer();
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      console.log('⚠️  Starting server without MongoDB connection');
      startServer();
    });
} else {
  console.log('⚠️  MONGO_URI not found in .env file');
  console.log('⚠️  Starting server without MongoDB connection');
  startServer();
}

function startServer() {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
  });
}