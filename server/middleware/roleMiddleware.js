const managerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    return next();
  }
  res.status(403).json({ success: false, message: 'Access denied.' });
};

module.exports = { managerOrAdmin };