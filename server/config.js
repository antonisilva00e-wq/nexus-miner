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

// JWT secrets - always have fallback, never crash (use static fallback to survive nodemon/render restarts)
const jwtSecret = process.env.JWT_SECRET || 'nexus_miner_default_jwt_secret_please_change_in_production_12345';
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'nexus_miner_default_jwt_refresh_secret_please_change_in_production_12345';

if (!process.env.JWT_SECRET) {
  console.warn('[SECURITY] JWT_SECRET nao definido - usando fallback gerado.');
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
