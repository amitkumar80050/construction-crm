const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

try {
  const authRoutes = require('./routes/authRoutes');
  const clientRoutes = require('./routes/clientRoutes');
  const remarkRoutes = require('./routes/remarkRoutes');
  const stageRoutes = require('./routes/stageRoutes');
  const reminderRoutes = require('./routes/reminderRoutes');
  const analyticsRoutes = require('./routes/analyticsRoutes');
  const userRoutes = require('./routes/userRoutes');
  const seedRoutes = require('./routes/seedRoutes');

  app.use('/api/auth', authRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/remarks', remarkRoutes);
  app.use('/api/stages', stageRoutes);
  app.use('/api/reminders', reminderRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/dev', seedRoutes);
} catch (error) {
  console.error('FAILED TO LOAD ROUTES:', error.message);
  console.error(error.stack);
}

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

module.exports = app;