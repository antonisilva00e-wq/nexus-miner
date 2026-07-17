const webpush = require('web-push');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@nexusminer.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  console.log('[PUSH] VAPID configurado');
}

// heading = titulo em negrito que aparece na notificacao (ex: "Venda concluida")
// body    = detalhe menor abaixo (ex: "R$ 297,00")
// O nome "Nexus Miner" aparece automaticamente pelo PWA
async function sendPush(subscription, { heading, body, url, type }) {
  if (!vapidPublicKey) return null;
  const payload = JSON.stringify({
    heading: heading || 'Nova notificacao',
    body:    body    || '',
    url:     url     || '/',
    type:    type    || 'info'
  });
  return webpush.sendNotification(subscription, payload);
}

async function broadcast(subscriptions, { heading, body, url, type }) {
  const results = await Promise.allSettled(
    subscriptions.map(sub => sendPush(sub, { heading, body, url, type }))
  );
  return results;
}

module.exports = { sendPush, broadcast, vapidPublicKey };
