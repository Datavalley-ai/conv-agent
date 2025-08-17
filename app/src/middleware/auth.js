const jwt = require('jsonwebtoken');
const config = require('../config');

function requireAuth(roles = []) {
  return (req, res, next) => {
    try {
      // First check for JWT Bearer token
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, config.jwtSecret);
          
          // Validate required claims per Phase 1 spec
          if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
            return res.status(401).json({
              success: false,
              error: 'Token expired'
            });
          }
          
          req.user = {
            id: decoded.id || decoded.sub,
            role: decoded.role || decoded.roles,
            sessionId: decoded.sessionId
          };
          
          // Role-based access control
          if (roles.length > 0) {
            const userRole = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
            const hasRequiredRole = roles.some(role => userRole.includes(role));
            
            if (!hasRequiredRole) {
              return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
              });
            }
          }
          
          return next();
        } catch (jwtError) {
          // JWT invalid, try Google service account auth
          console.log('JWT validation failed:', jwtError.message);
        }
      }

      // Check for Google service account JWT in x-goog-iap-jwt-assertion header
      const iapHeader = req.headers['x-goog-iap-jwt-assertion'];
      if (iapHeader) {
        try {
          // Decode without verification (IAP already verified it)
          const payload = JSON.parse(Buffer.from(iapHeader.split('.')[1], 'base64'));
          req.user = {
            id: payload.email || payload.sub,
            role: 'candidate'
          };
          return next();
        } catch (googleError) {
          console.log('Google IAP auth failed:', googleError.message);
        }
      }
      
      // No valid auth found - return immediately, don't hang
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No valid authentication token'
      });
      
    } catch (error) {
      // Global error handler - ensure we always respond
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication service error'
      });
    }
  };
}

// Internal service authentication
const requireInternalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const expectedAuth = `Bearer ${process.env.INTERNAL_KEY}`;
    
    if (!authHeader || authHeader !== expectedAuth) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized - Invalid internal key' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Internal auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error'
    });
  }
};

// Session binding middleware (Phase 1 requirement)
const bindSession = (req, res, next) => {
  try {
    const crypto = require('crypto');
    const binding = crypto.createHash('sha256')
      .update((req.ip || 'unknown') + (req.headers['user-agent'] || 'unknown'))
      .digest('hex');
    
    req.sessionBinding = binding;
    next();
  } catch (error) {
    console.error('Session binding error:', error);
    // Don't fail the request, just log and continue
    req.sessionBinding = 'fallback-' + Date.now();
    next();
  }
};

module.exports = {
  requireAuth,
  requireInternalAuth,
  bindSession
};
