/**
 * Security Middleware - Comprehensive protection against intruders
 */

const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// ============================================================
// 1. GLOBAL RATE LIMITER - Prevent brute force attacks
// ============================================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
});

// ============================================================
// 2. AUTH RATE LIMITER - Strict limit for login attempts
// ============================================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 login attempts per 15 min
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + username combination
    const username = req.body?.username || 'unknown';
    return `${req.ip}:${username}`;
  },
  skipSuccessfulRequests: true,
});

// ============================================================
// 3. API RATE LIMITER - For API endpoints
// ============================================================
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  message: { error: 'Limite de API atingido. Aguarde 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================
// 4. MINING RATE LIMITER - Prevent resource exhaustion
// ============================================================
const miningLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 mining operations per hour
  message: { error: 'Limite de mineracao atingido. Aguarde 1 hora.' },
  keyGenerator: (req) => req.user?.id || req.ip,
});

// ============================================================
// 5. INPUT SANITIZER - Prevent XSS and injection
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
  // Fields that should NOT be sanitized (passwords, tokens, etc.)
  const skipSanitize = ['password', 'password_hash', 'currentPassword', 'newPassword', 'refreshToken', 'token'];
  for (const [key, value] of Object.entries(obj)) {
    if (skipSanitize.includes(key)) {
      sanitized[key] = value; // Keep password fields as-is
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
// 6. INPUT VALIDATOR - Validate expected types and lengths
// ============================================================
const VALIDATORS = {
  email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v) => !v || /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(v.replace(/\s/g, '')),
  cnpj: (v) => !v || /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(v),
  cpf: (v) => !v || /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(v),
  uuid: (v) => !v || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  username: (v) => !v || /^[a-zA-Z0-9_]{3,30}$/.test(v),
  password: (v) => !v || v.length >= 6 && v.length <= 128,
  name: (v) => !v || v.length >= 2 && v.length <= 200,
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
// 7. SQL INJECTION GUARD - Block suspicious patterns
// ============================================================
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|CAST|CONVERT)\b)/i,
  /(--|;|\/\*|\*\/|xp_|sp_)/i,
  /(0x[0-9a-f]+)/i,
  /(\bOR\b\s+\b\d+\b\s*=\s*\b\d+\b)/i,
  /('.*OR.*'.*'.*')/i,
];

function detectSQLInjection(value) {
  if (typeof value !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

// ============================================================
// 8. XSS GUARD - Block script injection
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
];

function detectXSS(value) {
  if (typeof value !== 'string') return false;
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

// ============================================================
// 9. SECURITY MIDDLEWARE - Apply all checks
// ============================================================
function securityMiddleware(req, res, next) {
  // Check for SQL injection in query params
  for (const [key, value] of Object.entries(req.query)) {
    if (detectSQLInjection(value)) {
      return res.status(400).json({ error: 'Parametro invalido detectado' });
    }
  }

  // Check for XSS in body
  if (req.body && typeof req.body === 'object') {
    const checkObj = (obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && detectXSS(value)) {
          return true;
        }
        if (typeof value === 'object' && value !== null) {
          if (checkObj(value)) return true;
        }
      }
      return false;
    };
    if (checkObj(req.body)) {
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
// 10. SECURITY HEADERS
// ============================================================
function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'");

  next();
}

// ============================================================
// 11. REQUEST LOGGER - Track suspicious activity
// ============================================================
const suspiciousActivity = new Map();

function trackSuspiciousActivity(ip, reason) {
  const count = (suspiciousActivity.get(ip) || 0) + 1;
  suspiciousActivity.set(ip, count);

  if (count >= 10) {
    console.log(`[SECURITY] IP ${ip} blocked after ${count} suspicious attempts: ${reason}`);
    return true; // Should be blocked
  }
  return false;
}

function suspiciousActivityDetector(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

  // Check for common attack patterns in URL
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /\/etc\/passwd/i,
    /\/proc\//i,
    /\/admin/i,
    /\.env/i,
    /\.git/i,
    /wp-admin/i,
    /phpmyadmin/i,
    /xmlrpc/i,
  ];

  const fullPath = req.originalUrl || req.url;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullPath)) {
      trackSuspiciousActivity(ip, 'suspicious URL pattern');
      return res.status(403).json({ error: 'Acesso negado' });
    }
  }

  // Check for unusual HTTP methods
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
  if (!allowedMethods.includes(req.method)) {
    trackSuspiciousActivity(ip, 'unusual HTTP method');
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  next();
}

// ============================================================
// 12. CORS CONFIGURATION
// ============================================================
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // In production, specify allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://nexus-miner.onrender.com',
      process.env.APP_URL,
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

// ============================================================
// 13. PASSWORD STRENGTH CHECKER
// ============================================================
function checkPasswordStrength(password) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    noCommon: !isCommonPassword(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  let strength = 'fraca';
  if (score >= 5) strength = 'forte';
  else if (score >= 4) strength = 'media';

  return { strength, score, checks };
}

function isCommonPassword(pwd) {
  const common = ['123456', 'password', 'admin', 'admin123', '12345678', 'qwerty', 'letmein', 'welcome', 'monkey', 'dragon'];
  return common.includes(pwd.toLowerCase());
}

// ============================================================
// 14. ACCOUNT LOCKOUT
// ============================================================
const loginAttempts = new Map();
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

function checkAccountLockout(username) {
  const attempts = loginAttempts.get(username);
  if (!attempts) return false;

  if (attempts.count >= LOCKOUT_THRESHOLD) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    if (timeSinceLastAttempt < LOCKOUT_DURATION) {
      return true; // Account is locked
    }
    loginAttempts.delete(username); // Reset after lockout period
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
// EXPORTS
// ============================================================
module.exports = {
  globalLimiter,
  authLimiter,
  apiLimiter,
  miningLimiter,
  sanitizeInput,
  sanitizeObject,
  validateInput,
  VALIDATORS,
  detectSQLInjection,
  detectXSS,
  securityMiddleware,
  securityHeaders,
  suspiciousActivityDetector,
  corsOptions,
  checkPasswordStrength,
  checkAccountLockout,
  recordLoginAttempt,
};
