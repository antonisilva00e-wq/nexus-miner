const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Handle DB_PATH for Render (ephemeral filesystem)
let dbPath;
if (process.env.DB_PATH) {
  dbPath = path.isAbsolute(process.env.DB_PATH)
    ? process.env.DB_PATH
    : path.resolve(process.cwd(), process.env.DB_PATH);
} else {
  dbPath = path.resolve(__dirname, '..', 'data', 'nexusminer.db');
}

// JWT secrets - require in production, fallback only in development
const isProduction = process.env.NODE_ENV === 'production';

let jwtSecret = process.env.JWT_SECRET;
let jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

if (isProduction) {
  if (!jwtSecret || !jwtRefreshSecret) {
    console.error('[SECURITY] ERRO CRITICO: JWT_SECRET e JWT_REFRESH_SECRET devem ser definidos nas env vars em producao!');
    process.exit(1);
  }
  if (jwtSecret.length < 16 || jwtRefreshSecret.length < 16) {
    console.warn('[SECURITY] AVISO: JWT secrets muito curtos. Recomendado: minimo 32 caracteres.');
  }
} else {
  // Development fallback - generate random secrets
  jwtSecret = jwtSecret || crypto.randomBytes(64).toString('hex');
  jwtRefreshSecret = jwtRefreshSecret || crypto.randomBytes(64).toString('hex');
  if (!process.env.JWT_SECRET) {
    console.warn('[SECURITY] JWT_SECRET nao definido - usando fallback gerado (apenas dev).');
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    console.warn('[SECURITY] JWT_REFRESH_SECRET nao definido - usando fallback gerado (apenas dev).');
  }
}

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret,
  jwtRefreshSecret,
  dbPath,
  whatsappEnabled: process.env.WHATSAPP_ENABLED === 'true',
  whatsappSessionPath: process.env.WHATSAPP_SESSION_PATH || './data/whatsapp',
  nodeEnv: process.env.NODE_ENV || 'development',
};
