import express from 'express';
import helmet from 'helmet';
import { router as healthRouter } from './routes/health.js';
import { router as waitlistRouter } from './routes/waitlist.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();

// Log helper as per project context
app.use((req, res, next) => {
  req.log = (event, fields) => {
    const payload = { timestamp: new Date().toISOString(), event, ...fields };
    process.stdout.write(JSON.stringify(payload) + '\n');
  };
  next();
});

// Set trust proxy for correct IP detection behind nginx
app.set('trust proxy', 1);

// Apply helmet for security headers. Helmet is applied individually to waitlistRouter as per context.
// The global helmet middleware is still useful for static files and other routes.
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
app.use('/api/waitlist', waitlistRouter);

// Error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Log the server error using the request-scoped log helper
  req.log('server_error', { code: err.code || 'UNKNOWN_ERROR', message: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Something went wrong. Try again shortly.',
    },
  });
});

// Start the server
app.listen(PORT, () => {
  // Log server started event using the global log (before request-scoped log is available)
  const globalLog = (event, fields) => {
    const payload = { timestamp: new Date().toISOString(), event, ...fields };
    process.stdout.write(JSON.stringify(payload) + '\n');
  };
  globalLog('server_started', { port: PORT });
});
