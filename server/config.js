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

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_change_me',
  dbPath,
  whatsappEnabled: process.env.WHATSAPP_ENABLED === 'true',
  whatsappSessionPath: process.env.WHATSAPP_SESSION_PATH || './data/whatsapp',
  nodeEnv: process.env.NODE_ENV || 'development',
};
