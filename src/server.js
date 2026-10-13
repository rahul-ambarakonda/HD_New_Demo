import express from 'express';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

// Helper for structured JSON logging
const log = (level, message, context = {}) => {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...context }));
};

// Trust proxy for correct IP detection behind NGINX
app.set('trust proxy', 1);

// Apply Helmet middleware with specified CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));

// Serve static files from the public directory
app.use(express.static('public'));

// Global error handling middleware
app.use((err, req, res, next) => {
  log('error', 'Unhandled server error', { path: req.path, method: req.method, error: { message: err.message, stack: err.stack } });
  res.status(500).json({
    error: {
      code: 'SERVER_ERROR',
      message: 'Something went wrong. Try again shortly.',
    },
  });
});

// Start the server
app.listen(PORT, () => {
  log('info', `Server listening on port ${PORT}`);
});
