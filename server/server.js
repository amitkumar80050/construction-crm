const app = require('./app');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const http = require('http');
const { Server } = require('socket.io');
const initSocket = require('./sockets');


process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Rejection:', reason);
});

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB only if MONGO_URI is defined
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
      console.log('✅ MongoDB connected successfully');
      try {
        const { bootstrapDefaultUsers } = require('./utils/bootstrapUsers');
        await bootstrapDefaultUsers();
      } catch (bootErr) {
        console.warn('Bootstrap warning:', bootErr.message);
      }
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

// Replace app.listen(PORT, ...) with:
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: process.env.Lead_URL || 'http://localhost:3000' } });
initSocket(io);

function startServer() {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}