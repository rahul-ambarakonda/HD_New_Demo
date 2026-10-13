import express from 'express';
import helmet from 'helmet';
import { router as healthRouter } from './routes/health.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();

// Log helper as per project context
const log = (event, fields) => {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields }));
};

// Set trust proxy for correct IP detection behind nginx
app.set('trust proxy', 1);

// Apply helmet for security headers
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
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use(healthRouter);

// Error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  log('server_error', { code: err.code || 'UNKNOWN_ERROR', message: err.message, stack: err.stack });
  res.status(err.statusCode || 500).json({
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Something went wrong. Try again shortly.',
    },
  });
});

// Start the server
app.listen(PORT, () => {
  log('server_started', { port: PORT });
});
