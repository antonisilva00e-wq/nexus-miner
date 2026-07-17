const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Handle DB_PATH for Render (ephemeral filesystem)
let dbPath;
if (process.env.DB_PATH) {
  // If absolute path, use as-is; if relative, resolve from project root
  dbPath = path.isAbsolute(process.env.DB_PATH) 
    ? process.env.DB_PATH 
    : path.resolve(process.cwd(), process.env.DB_PATH);
} else {
  dbPath = path.resolve(__dirname, '..', 'data', 'nexusminer.db');
}

// JWT secrets MUST be set in environment variables for security
const jwtSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
if (!jwtSecret || !jwtRefreshSecret) {
  console.error('[SECURITY] ERRO CRITICO: JWT_SECRET e JWT_REFRESH_SECRET devem ser definidos nas env vars!');
  process.exit(1);
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
