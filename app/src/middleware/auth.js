const jwt = require('jsonwebtoken');
const config = require('../config');

function requireAuth(roles = []) {
  return (req, res, next) => {
    // First check for JWT Bearer token
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, config.jwtSecret);
        
        req.user = {
          id: decoded.id || decoded.sub,
          role: decoded.role || decoded.roles
        };
        
        return next();
      } catch (error) {
        // JWT invalid, try Google service account auth
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
      } catch (error) {
        // Google auth failed
      }
    }
    
    // No valid auth found
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - No valid authentication'
    });
  };
}

module.exports = { requireAuth };
