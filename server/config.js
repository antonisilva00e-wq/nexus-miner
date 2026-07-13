const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_change_me',
  dbPath: path.resolve(__dirname, '..', process.env.DB_PATH || './data/nexusminer.db'),
  whatsappEnabled: process.env.WHATSAPP_ENABLED === 'true',
  whatsappSessionPath: process.env.WHATSAPP_SESSION_PATH || './data/whatsapp',
  nodeEnv: process.env.NODE_ENV || 'development',
};
