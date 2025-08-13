const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

// Generate session binding hash (IP + User Agent)
function generateSessionBinding(req) {
  const data = req.ip + (req.headers['user-agent'] || '');
  return crypto.createHash('sha256').update(data).digest('hex');
}

// JWT Authentication middleware
function requireAuth(roles = []) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header'
        });
      }

      const token = authHeader.substring(7);
      
      // Verify JWT
      const decoded = jwt.verify(token, config.jwtSecret);
      
      // Validate required claims
      if (!decoded.sub || !decoded.aud || decoded.aud !== 'interview-gateway') {
        return res.status(401).json({
          error: 'Invalid Token',
          message: 'Token missing required claims'
        });
      }

      // Role-based access control
      if (roles.length > 0 && !roles.includes(decoded.roles)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        });
      }

      // Add user info to request
      req.user = {
        id: decoded.sub,
        role: decoded.roles,
        sessionId: decoded.sessionId
      };

      next();
    } catch (error) {
      logger.error('JWT Auth Error:', error);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token Expired',
          message: 'Your session has expired'
        });
      }
      
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Token verification failed'
      });
    }
  };
}

// Session binding middleware
function bindSession(req, res, next) {
  try {
    const currentBinding = generateSessionBinding(req);
    
    // Add binding to request for later comparison with stored session
    req.sessionBinding = currentBinding;
    
    // TODO: Compare with stored session binding in database
    // For now, just pass through
    next();
  } catch (error) {
    logger.error('Session Binding Error:', error);
    res.status(500).json({
      error: 'Session Error',
      message: 'Failed to validate session binding'
    });
  }
}

module.exports = {
  requireAuth,
  bindSession,
  generateSessionBinding
};
