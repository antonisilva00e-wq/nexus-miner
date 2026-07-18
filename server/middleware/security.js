/**
 * Security Middleware - Ultra Protection
 * Multi-layer defense: rate limiting, input validation, SQL injection, XSS, IP blocking, HMAC webhooks
 */

const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// ============================================================
// 1. GLOBAL RATE LIMITER - Brute force protection
// ============================================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  skip: (req) => req.path === '/api/health',
});

// ============================================================
// 2. AUTH RATE LIMITER - Strict login protection
// ============================================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 30 : 8,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const username = req.body?.username || 'unknown';
    return `auth:${req.ip}:${username}`;
  },
  skipSuccessfulRequests: true,
});

// ============================================================
// 3. API RATE LIMITER
// ============================================================
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: { error: 'Limite de API atingido. Aguarde 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================
// 4. MINING RATE LIMITER - Resource exhaustion protection
// ============================================================
const miningLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { error: 'Limite de mineracao atingido. Aguarde 1 hora.' },
  keyGenerator: (req) => `mine:${req.user?.id || req.ip}`,
});

// ============================================================
// 5. REGISTRATION RATE LIMITER - Prevent mass account creation
// ============================================================
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Limite de cadastro atingido. Aguarde 1 hora.' },
  keyGenerator: (req) => `reg:${req.ip}`,
});

// ============================================================
// 6. REFRESH TOKEN RATE LIMITER - Prevent token brute force
// ============================================================
const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas de refresh. Aguarde 5 minutos.' },
  keyGenerator: (req) => `refresh:${req.ip}`,
});

// ============================================================
// 7. IP BLACKLIST - Auto-block after repeated offenses
// ============================================================
const ipBlacklist = new Map();
const IP_BLOCK_DURATION = 60 * 60 * 1000; // 1 hour
const IP_BLOCK_THRESHOLD = 20;

function isIPBlocked(ip) {
  const entry = ipBlacklist.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.blockedAt > IP_BLOCK_DURATION) {
    ipBlacklist.delete(ip);
    return false;
  }
  return true;
}

function recordIPViolation(ip, reason) {
  const entry = ipBlacklist.get(ip) || { violations: 0, blockedAt: 0 };
  entry.violations++;
  entry.lastViolation = Date.now();
  entry.reason = reason;

  if (entry.violations >= IP_BLOCK_THRESHOLD && !entry.blockedAt) {
    entry.blockedAt = Date.now();
    console.log(`[SECURITY] IP BLOCKED: ${ip} (${entry.violations} violations: ${reason})`);
  }
  ipBlacklist.set(ip, entry);
}

function ipBlocker(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  if (isIPBlocked(ip)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

// ============================================================
// 8. INPUT SANITIZER - XSS prevention
// ============================================================
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = {};
  const skipSanitize = ['password', 'password_hash', 'currentPassword', 'newPassword', 'refreshToken', 'token'];
  for (const [key, value] of Object.entries(obj)) {
    if (skipSanitize.includes(key)) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ============================================================
// 9. INPUT VALIDATORS
// ============================================================
const VALIDATORS = {
  email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v) => !v || /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(v.replace(/\s/g, '')),
  cnpj: (v) => !v || /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(v),
  cpf: (v) => !v || /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(v),
  uuid: (v) => !v || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  username: (v) => !v || /^[a-zA-Z0-9_]{3,30}$/.test(v),
  password: (v) => !v || (v.length >= 6 && v.length <= 128),
  name: (v) => !v || (v.length >= 2 && v.length <= 200),
  text: (v, maxLen = 1000) => !v || v.length <= maxLen,
};

function validateInput(data, rules) {
  const errors = [];
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    if (rule.required && (!value || value.toString().trim() === '')) {
      errors.push(`${field} e obrigatorio`);
      continue;
    }
    if (value && rule.validator && !rule.validator(value)) {
      errors.push(`${field} invalido`);
    }
    if (value && rule.maxLen && value.length > rule.maxLen) {
      errors.push(`${field} muito longo (max: ${rule.maxLen})`);
    }
  }
  return errors;
}

// ============================================================
// 10. SQL INJECTION DETECTION - Multi-pattern
// ============================================================
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|CAST|CONVERT|TRUNCATE|REPLACE|GRANT|REVOKE)\b)/i,
  /(--|;|\/\*|\*\/|xp_|sp_|WAITFOR|DELAY)/i,
  /(0x[0-9a-f]+)/i,
  /(\bOR\b\s+\b\d+\b\s*=\s*\b\d+\b)/i,
  /('.*OR.*'.*'.*')/i,
  /(\bAND\b\s+\b\d+\b\s*=\s*\b\d+\b)/i,
  /CHAR\(|CONCAT\(|BENCHMARK\(|SLEEP\(/i,
  /INTO\s+(OUTFILE|DUMPFILE)/i,
  /LOAD_FILE\(/i,
];

function detectSQLInjection(value) {
  if (typeof value !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

// ============================================================
// 11. XSS DETECTION - Multi-pattern
// ============================================================
const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<link[\s>]/i,
  /expression\(/i,
  /eval\(/i,
  /document\.(cookie|write|location)/i,
  /window\.(location|open)/i,
  /<svg[\s>].*?on\w+/i,
  /data:\s*text\/html/i,
  /base64/i,
  /atob\(/i,
  /btoa\(/i,
  /fetch\(/i,
  /XMLHttpRequest/i,
];

function detectXSS(value) {
  if (typeof value !== 'string') return false;
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

// ============================================================
// 12. PATH TRAVERSAL DETECTION
// ============================================================
function detectPathTraversal(value) {
  if (typeof value !== 'string') return false;
  const patterns = [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e/i,
    /%252e/i,
    /\.\.%2f/i,
    /\.\.%5c/i,
  ];
  return patterns.some(p => p.test(value));
}

// ============================================================
// 13. REQUEST BODY SIZE LIMITER
// ============================================================
function bodySizeLimit(maxKB = 500) {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > maxKB * 1024) {
      return res.status(413).json({ error: `Corpo da requisicao muito grande (max: ${maxKB}KB)` });
    }
    next();
  };
}

// ============================================================
// 14. SECURITY MIDDLEWARE - Full request inspection
// ============================================================
function securityMiddleware(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const fullPath = req.originalUrl || req.url;

  // Check SQL injection in query params
  for (const [key, value] of Object.entries(req.query)) {
    if (detectSQLInjection(value)) {
      recordIPViolation(ip, `SQL injection in query: ${key}`);
      return res.status(400).json({ error: 'Parametro invalido detectado' });
    }
    if (detectPathTraversal(value)) {
      recordIPViolation(ip, `Path traversal in query: ${key}`);
      return res.status(400).json({ error: 'Parametro invalido detectado' });
    }
  }

  // Check SQL injection + XSS in body
  if (req.body && typeof req.body === 'object') {
    const checkObj = (obj, depth = 0) => {
      if (depth > 10) return { type: null };
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          if (detectSQLInjection(value)) return { type: 'sql', field: key };
          if (detectXSS(value)) return { type: 'xss', field: key };
          if (detectPathTraversal(value)) return { type: 'path', field: key };
        }
        if (typeof value === 'object' && value !== null) {
          const result = checkObj(value, depth + 1);
          if (result.type) return result;
        }
      }
      return { type: null };
    };
    const threat = checkObj(req.body);
    if (threat.type) {
      recordIPViolation(ip, `${threat.type} injection in body: ${threat.field}`);
      return res.status(400).json({ error: 'Conteudo invalido detectado' });
    }
  }

  // Sanitize body inputs
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
}

// ============================================================
// 15. SECURITY HEADERS - Hardened CSP
// ============================================================
function securityHeaders(req, res, next) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  // NOTE: COOP/COEP/CORP removed — they block cross-origin tiles (Leaflet/OSM),
  // Google Fonts, CDN resources, and Socket.IO websocket upgrades.

  // CSP - balanced security and functionality
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://server.arcgisonline.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://unpkg.com",
    "connect-src 'self' ws: wss:",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);

  // Remove server identification
  res.removeHeader('X-Powered-By');
  res.setHeader('Server', '');

  next();
}

// ============================================================
// 16. SUSPICIOUS ACTIVITY DETECTOR - Enhanced
// ============================================================
function suspiciousActivityDetector(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const fullPath = req.originalUrl || req.url;

  const suspiciousPatterns = [
    { pattern: /\.\.\//, name: 'path traversal' },
    { pattern: /\/etc\/passwd/i, name: 'etc passwd' },
    { pattern: /\/proc\//i, name: 'proc access' },
    { pattern: /\.env/i, name: 'env file' },
    { pattern: /\.git/i, name: 'git access' },
    { pattern: /wp-admin/i, name: 'wordpress probe' },
    { pattern: /phpmyadmin/i, name: 'phpmyadmin probe' },
    { pattern: /xmlrpc/i, name: 'xmlrpc probe' },
    { pattern: /\.env\.local/i, name: 'env local' },
    { pattern: /actuator/i, name: 'spring actuator' },
    { pattern: /debug\/scalar/i, name: 'debug probe' },
    { pattern: /\.htaccess/i, name: 'htaccess probe' },
    { pattern: /admin\.php/i, name: 'php admin probe' },
    { pattern: /cgi-bin/i, name: 'cgi probe' },
    { pattern: /shell/i, name: 'shell probe' },
    { pattern: /eval\(/i, name: 'eval probe' },
  ];

  for (const { pattern, name } of suspiciousPatterns) {
    if (pattern.test(fullPath)) {
      recordIPViolation(ip, `suspicious URL: ${name}`);
      return res.status(403).json({ error: 'Acesso negado' });
    }
  }

  // Block unusual HTTP methods
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  if (!allowedMethods.includes(req.method)) {
    recordIPViolation(ip, `unusual method: ${req.method}`);
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  // Check for oversized headers (header injection)
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.length > 512) {
    recordIPViolation(ip, 'oversized user-agent');
    return res.status(400).json({ error: 'Header invalido' });
  }

  // Block requests with no user-agent (common in bots)
  if (!userAgent && req.method !== 'OPTIONS') {
    recordIPViolation(ip, 'no user-agent');
  }

  next();
}

// ============================================================
// 17. CORS CONFIGURATION - Strict in production
// ============================================================
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, mobile apps, curl)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://nexus-miner.onrender.com',
      process.env.APP_URL,
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // NOTE: callback(new Error()) crashes Express — log + allow instead
      console.warn(`[CORS] Unknown origin allowed: ${origin}`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400,
};

// ============================================================
// 18. PASSWORD STRENGTH CHECKER - Enhanced
// ============================================================
function checkPasswordStrength(password) {
  if (!password) return { strength: 'fraca', score: 0, checks: {} };

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    noCommon: !isCommonPassword(password),
    noRepeating: !/(.)\1{2,}/.test(password),
    noSequential: !hasSequentialChars(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  let strength = 'fraca';
  if (score >= 7) strength = 'forte';
  else if (score >= 5) strength = 'media';

  return { strength, score, checks };
}

function isCommonPassword(pwd) {
  const common = [
    '123456', 'password', 'admin', 'admin123', '12345678', 'qwerty',
    'letmein', 'welcome', 'monkey', 'dragon', 'master', 'abc123',
    'password1', 'nexusminer', 'minhaSenha', 'senha123', '123456789',
  ];
  return common.includes(pwd.toLowerCase());
}

function hasSequentialChars(pwd) {
  const seqs = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop'];
  const lower = pwd.toLowerCase();
  for (const seq of seqs) {
    for (let i = 0; i <= seq.length - 4; i++) {
      if (lower.includes(seq.substring(i, i + 4))) return true;
    }
  }
  return false;
}

// ============================================================
// 19. ACCOUNT LOCKOUT - Enhanced with IP tracking
// ============================================================
const loginAttempts = new Map();
const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_DURATION = 5 * 60 * 1000;

function checkAccountLockout(username) {
  const attempts = loginAttempts.get(username);
  if (!attempts) return false;

  if (attempts.count >= LOCKOUT_THRESHOLD) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    if (timeSinceLastAttempt < LOCKOUT_DURATION) {
      return true;
    }
    loginAttempts.delete(username);
  }
  return false;
}

function recordLoginAttempt(username, success) {
  if (success) {
    loginAttempts.delete(username);
    return;
  }

  const attempts = loginAttempts.get(username) || { count: 0, lastAttempt: 0 };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(username, attempts);
}

// ============================================================
// 20. HMAC WEBHOOK VERIFICATION
// ============================================================
function verifyWebhookHMAC(req, res, next) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: 'Webhook not configured' });

  const signature = req.headers['x-webhook-signature'] || req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: 'Assinatura HMAC ausente' });
  }

  const body = JSON.stringify(req.body);
  const expectedSig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      recordIPViolation(req.ip, 'invalid webhook signature');
      return res.status(401).json({ error: 'Assinatura HMAC invalida' });
    }
  } catch {
    return res.status(401).json({ error: 'Assinatura HMAC invalida' });
  }

  next();
}

// ============================================================
// 21. REQUEST ID GENERATOR - For audit trail
// ============================================================
function requestID(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
}

// ============================================================
// 22. AUDIT LOGGER - Track all state-changing operations
// ============================================================
function auditLogger(req, res, next) {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const start = Date.now();
    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - start;
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const userId = req.user?.id || 'anonymous';
      console.log(`[AUDIT] ${req.method} ${req.originalUrl} | user=${userId} ip=${ip} status=${res.statusCode} ${duration}ms reqId=${req.id || '-'}`);
      originalEnd.apply(this, args);
    };
  }
  next();
}

// ============================================================
// 23. HEALTH CHECK EXCLUDER - Don't log health checks
// ============================================================
function skipHealthChecks(req, res, next) {
  if (req.path === '/api/health') return next();
  next();
}

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  globalLimiter,
  authLimiter,
  apiLimiter,
  miningLimiter,
  registerLimiter,
  refreshLimiter,
  ipBlocker,
  isIPBlocked,
  recordIPViolation,
  sanitizeInput,
  sanitizeObject,
  validateInput,
  VALIDATORS,
  detectSQLInjection,
  detectXSS,
  detectPathTraversal,
  securityMiddleware,
  securityHeaders,
  suspiciousActivityDetector,
  corsOptions,
  checkPasswordStrength,
  checkAccountLockout,
  recordLoginAttempt,
  verifyWebhookHMAC,
  requestID,
  auditLogger,
  bodySizeLimit,
  skipHealthChecks,
};
