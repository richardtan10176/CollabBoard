const { verifyToken, extractTokenFromHeader } = require('../utils/auth');
const { query } = require('../utils/database');

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    // Verify the token
    const decoded = verifyToken(token);
    
    // Check if user still exists in database
    const userResult = await query(
      'SELECT id, username, email, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.' 
      });
    }

    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account is deactivated.' 
      });
    }

    // Add user info to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      error: 'Invalid or expired token.' 
    });
  }
};

// Middleware to authenticate WebSocket connections
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify the token
    const decoded = verifyToken(token);
    
    // Check if user still exists in database
    const userResult = await query(
      'SELECT id, username, email, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return next(new Error('Authentication error: User not found'));
    }

    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return next(new Error('Authentication error: Account deactivated'));
    }

    // Add user info to socket object
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = {
  authenticateToken,
  authenticateSocket
};
