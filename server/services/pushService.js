/**
 * Push Notification Service — OneSignal integration
 *
 * Para usar:
 * 1. Crie conta grátis em https://onesignal.com
 * 2. Crie um app e copie o App ID e REST API Key
 * 3. Adicione no .env:
 *    ONESIGNAL_APP_ID=seu_app_id
 *    ONESIGNAL_API_KEY=sua_rest_api_key
 */

const https = require('https');

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY || '';

/**
 * Send push notification via OneSignal
 */
async function sendPush({ title, message, url, tags, segment, includePlayerIds }) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.log('[PUSH] OneSignal não configurado — notificação ignorada');
    return null;
  }

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    contents: { en: message, pt: message },
    headings: { en: title, pt: title },
    url: url || '/',
    web_buttons: [
      { id: 'open', text: 'Abrir', url: url || '/' }
    ],
    chrome_web_pattern: url || '/',
    firefox_pattern: url || '/',
    ttl: 86400,
    priority: 10
  };

  // Target: specific players, segment, or all users
  if (includePlayerIds && includePlayerIds.length > 0) {
    payload.include_player_ids = includePlayerIds;
  } else if (segment) {
    payload.included_segments = [segment];
  } else {
    payload.included_segments = ['Subscribed Users'];
  }

  // Tags for targeting
  if (tags && Object.keys(tags).length > 0) {
    payload.tags = tags;
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'onesignal.com',
      port: 443,
      path: '/api/v1/notifications',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          console.log(`[PUSH] Enviado: "${title}" → ${result.id || 'ok'}`);
          resolve(result);
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[PUSH] Erro:', err.message);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Send to specific user by player_id
 */
async function sendToUser(playerId, { title, message, url }) {
  return sendPush({ title, message, url, includePlayerIds: [playerId] });
}

/**
 * Send to all users (broadcast)
 */
async function broadcast({ title, message, url }) {
  return sendPush({ title, message, url });
}

/**
 * Send to users with specific tag
 */
async function sendToSegment(segment, { title, message, url }) {
  return sendPush({ title, message, url, segment });
}

module.exports = { sendPush, sendToUser, broadcast, sendToSegment };
