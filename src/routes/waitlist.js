/**
 * Exports an Express `router` for the waitlist API endpoint.
 */

import { Router, json } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { isValidEmail } from '../lib/validate.js';
import { addEntry, hasEmail } from '../lib/store.js';

export const router = Router();

// Apply helmet with default policy plus a Content-Security-Policy
router.use(helmet({
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

// Rate limiting for the waitlist endpoint
const waitlistRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per IP
  standardHeaders: true,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a minute.' } },
});
router.use(waitlistRateLimiter);

// Content-Type validation and JSON body limit
router.use(json({ limit: '1kb' }));
router.use((req, res, next) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content type is not application/json.' } });
  }
  next();
});

router.post('/', async (req, res, next) => {
  const { email } = req.body;

  if (!isValidEmail(email)) {
    // Log a waitlist_submitted event with outcome: invalid
    req.log({
      event: 'waitlist_submitted',
      outcome: 'invalid',
    });
    return res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'That does not look like an email address.' } });
  }

  try {
    if (await hasEmail(email)) {
      // Log a waitlist_submitted event with outcome: duplicate
      req.log({
        event: 'waitlist_submitted',
        outcome: 'duplicate',
      });
      return res.status(409).json({ error: { code: 'ALREADY_JOINED', message: 'You are already on the list.' } });
    }

    await addEntry(email, req.ip);

    // Log a waitlist_submitted event with outcome: joined
    req.log({
      event: 'waitlist_submitted',
      outcome: 'joined',
    });
    return res.status(201).json({ status: 'joined' });

  } catch (error) {
    // Log a waitlist_store_error event
    req.log({
      event: 'waitlist_store_error',
      message: error.message,
    });
    // Pass the error to the error-handling middleware
    next({ status: 500, code: 'STORE_UNAVAILABLE', message: 'Something went wrong. Try again shortly.' });
  }
});
