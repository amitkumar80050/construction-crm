const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  maxFileSize: process.env.MAX_FILE_SIZE || 5242880,
  uploadPath: process.env.UPLOAD_PATH || './uploads',
};

module.exports = config;