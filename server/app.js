const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const passport = require('./config/passport');
const importRoutes = require('./routes/importRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const teamRoutes = require('./routes/teamRoutes');
const teamChatRoutes = require('./routes/teamChatRoutes');
const authScopedRoutes = require('./routes/authScopedRoutes'); 
const leadRoutes = require('./routes/leadRoutes'); 
const managerRoutes = require('./routes/managerRoutes');
const siteVisitRoutes = require('./routes/siteVisitRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');


// ...

dotenv.config();

const app = express();

const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:3000'];
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
}
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(passport.initialize());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.set('etag', false);

app.use('/api/import', importRoutes);
app.use('/api', activityLogRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/teams', teamChatRoutes);
app.use('/api/auth', authScopedRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/site-visits', siteVisitRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);


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