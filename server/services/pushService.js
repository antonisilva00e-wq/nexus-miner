const webpush = require('web-push');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@nexusminer.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  console.log('[PUSH] VAPID configurado');
}

async function sendPush(subscription, { title, message, url }) {
  if (!vapidPublicKey) return null;
  const payload = JSON.stringify({ title, message, url: url || '/' });
  return webpush.sendNotification(subscription, payload);
}

async function broadcast(subscriptions, { title, message, url }) {
  const results = await Promise.allSettled(
    subscriptions.map(sub => sendPush(sub, { title, message, url }))
  );
  return results;
}

module.exports = { sendPush, broadcast, vapidPublicKey };
