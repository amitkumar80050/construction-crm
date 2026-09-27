const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isAllowedAuditorRequest = (req) => {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  if (req.method === 'GET') {
    return ['/api/admin/logs', '/api/auth/me', '/api/notifications'].includes(path);
  }
  return req.method === 'POST' && path === '/api/auth/logout';
};

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found',
        });
      }

      if (req.user.role === 'auditor' && !isAllowedAuditorRequest(req)) {
        return res.status(403).json({ success: false, message: 'Auditors have read-only access to activity logs.' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid token',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token',
    });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.',
    });
  }
};

const auditViewer = (req, res, next) => {
  if (req.user && ['admin', 'auditor'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Admin or Auditor only.' });
  }
};

const manager = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Manager or Admin only.',
    });
  }
};

module.exports = { protect, admin, auditViewer, isAllowedAuditorRequest, manager };