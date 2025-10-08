/**
 * Logging Middleware
 * Provides structured logging for requests, responses, and errors
 */

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Attach request ID to request object
  req.requestId = requestId;
  
  // Log request
  console.log(`📥 [${requestId}] ${req.method} ${req.path}`, {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.userId || 'anonymous'
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    console.log(`📤 [${requestId}] ${req.method} ${req.path} - ${res.statusCode}`, {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId || 'anonymous',
      success: data?.success !== false
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

const responseLogger = (req, res, next) => {
  // This is handled in requestLogger
  next();
};

const generateRequestId = () => {
  return Math.random().toString(36).substr(2, 9);
};

module.exports = {
  request: requestLogger,
  response: responseLogger
};
