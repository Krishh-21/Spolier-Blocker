require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 8080;
const TMDB_KEY = process.env.DEFAULT_TMDB_KEY || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

// CORS - restrict to specific origins if provided
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., Postman, curl) in development
    if (!origin && process.env.NODE_ENV === 'development') return callback(null, true);
    
    // If ALLOWED_ORIGINS is configured, check against whitelist
    if (ALLOWED_ORIGINS.length > 0) {
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
    
    // Default: allow extension origins only
    if (origin && origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  }
};

app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/3/', limiter);

if (!TMDB_KEY) {
  console.warn('WARNING: DEFAULT_TMDB_KEY is not set. Proxy will reject requests.');
}

// Allowlist of valid TMDB API endpoints
const ALLOWED_ENDPOINTS = [
  /^\/3\/search\/(movie|tv|multi)$/,
  /^\/3\/(movie|tv)\/\d+$/,
  /^\/3\/(movie|tv)\/\d+\/(alternative_titles|keywords|credits)$/
];

function isValidEndpoint(path) {
  return ALLOWED_ENDPOINTS.some(pattern => pattern.test(path));
}

// Forward GET requests to TMDB, preserving query params and appending API key
app.get('/3/*', async (req, res) => {
  if (!TMDB_KEY) {
    return res.status(500).json({ error: 'Server TMDB key not configured' });
  }

  try {
    const path = req.path;
    
    // Validate endpoint against allowlist
    if (!isValidEndpoint(path)) {
      return res.status(403).json({ error: 'Endpoint not allowed' });
    }

    const qs = new URLSearchParams(req.query);
    // Always include API key server-side
    qs.set('api_key', TMDB_KEY);

    const tmdbUrl = `https://api.themoviedb.org${path}?${qs.toString()}`;

    const upstream = await fetch(tmdbUrl, {
      method: 'GET',
      timeout: 8000,
      size: 2000000,
      redirect: 'error',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Spoiler-Shield-Proxy/1.0'
      }
    });

    const text = await upstream.text();
    res.status(upstream.status)
       .set('Content-Type', upstream.headers.get('content-type') || 'application/json')
       .set('Cache-Control', 'public, max-age=3600')
       .send(text);
  } catch (e) {
    console.error('Proxy upstream request failed');
    res.status(502).json({ error: 'Upstream request failed' });
  }
});

// Public health is local: never spend upstream quota or disclose key-bearing errors.
app.get('/health', (req, res) => {
  const ready = Boolean(TMDB_KEY);
  res.status(ready ? 200 : 503).set('Cache-Control', 'no-store').json({
    status: ready ? 'ok' : 'unconfigured', tmdbConfigured: ready
  });
});

// Legacy health check (keep for backwards compatibility)
app.get('/healthz', (req, res) => res.json({ ok: true }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`TMDB proxy listening on ${PORT}`);
  console.log(`CORS origins: ${ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS.join(', ') : 'extension origins only'}`);
});
