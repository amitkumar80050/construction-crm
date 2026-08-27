const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const passport = require('./config/passport');
const importRoutes = require('./routes/importRoutes');
// ...

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(passport.initialize());
app.set('etag', false);
app.use('/api/import', importRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

function mountRoute(mountPath, routePath) {
  try {
    const router = require(routePath);
    app.use(mountPath, router);
  } catch (error) {
    console.error(`FAILED TO LOAD ROUTE ${mountPath}:`, error.message);
    console.error(error.stack);
  }
}

// All routes mounted the safe way — one broken route never takes down the others
mountRoute('/api/auth', './routes/authRoutes');
mountRoute('/api/clients', './routes/clientRoutes');
mountRoute('/api/remarks', './routes/remarkRoutes');
mountRoute('/api/stages', './routes/stageRoutes');
mountRoute('/api/reminders', './routes/reminderRoutes');
mountRoute('/api/analytics', './routes/analyticsRoutes');
mountRoute('/api/users', './routes/userRoutes');
mountRoute('/api/dev', './routes/seedRoutes');
mountRoute('/api/import', './routes/importRoutes');
mountRoute('/api/export', './routes/exportRoutes');
mountRoute('/api/settings', './routes/settingsRoutes');

// 404 handler — must come AFTER all real routes are mounted
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler — always last
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

module.exports = app;