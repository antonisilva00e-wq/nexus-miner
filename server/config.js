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

// JWT secrets - use env vars or generate secure random fallbacks
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(32).toString('hex');

if (!process.env.JWT_SECRET) {
  console.warn('[SECURITY] JWT_SECRET nao definido - usando fallback gerado. Tokens serao invalidados no restart.');
}
if (!process.env.JWT_REFRESH_SECRET) {
  console.warn('[SECURITY] JWT_REFRESH_SECRET nao definido - usando fallback gerado.');
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
