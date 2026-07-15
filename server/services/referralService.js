/**
 * Referral Service - Sistema simples de indicação
 */

const { db } = require('../db');
const { generateId } = require('../utils/helpers');

const COMMISSION_PERCENT = 40; // 40% para o indicador

// ============================================================
// GERAR LINK DE CONVITE
// ============================================================
function generateInviteCode(clientId) {
  let code = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

  // Try clients table first, then users table
  try {
    const r1 = db.prepare('UPDATE clients SET invite_code = ? WHERE id = ?').run(code, clientId);
    if (!r1 || r1.changes === 0) {
      db.prepare('UPDATE users SET invite_code = ? WHERE id = ?').run(code, clientId);
    }
  } catch {
    try { db.prepare('UPDATE users SET invite_code = ? WHERE id = ?').run(code, clientId); } catch {}
  }
  return code;
}

// ============================================================
// OBTER INDICADOR PELO CODIGO
// ============================================================
function getReferrerByCode(code) {
  // Check clients table first, then users table
  let referrer = db.prepare('SELECT id, name, username FROM clients WHERE invite_code = ?').get(code);
  if (!referrer) {
    referrer = db.prepare('SELECT id, name, username FROM users WHERE invite_code = ?').get(code);
  }
  return referrer;
}

// ============================================================
// REGISTRAR INDICADO
// ============================================================
function registerReferral(referrerId, newClientData) {
  const id = generateId();
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync(newClientData.password, 12);

  // Criar novo cliente
  db.prepare('INSERT INTO clients (id, name, email, username, password_hash, plan, price, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, newClientData.name, newClientData.email, newClientData.username, hash, newClientData.plan, newClientData.price, referrerId);

  // Calcular comissão
  const commission = (newClientData.price * COMMISSION_PERCENT) / 100;

  // Registrar comissão
  const commId = generateId();
  db.prepare('INSERT INTO commissions (id, referrer_client_id, lead_value, commission_amount, platform_amount, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(commId, referrerId, newClientData.price, commission, 0, 'pending');

  // Atualizar saldo do indicador
  db.prepare('UPDATE clients SET commission_balance = COALESCE(commission_balance, 0) + ? WHERE id = ?')
    .run(commission, referrerId);

  return { clientId: id, commission };
}

// ============================================================
// OBTER SALDO DO INDICADOR
// ============================================================
function getBalance(clientId) {
  const client = db.prepare('SELECT commission_balance FROM clients WHERE id = ?').get(clientId);
  return client?.commission_balance || 0;
}

// ============================================================
// OBTER HISTÓRICO DE COMISSÕES
// ============================================================
function getCommissions(clientId) {
  return db.prepare(`
    SELECT c.*
    FROM commissions c
    WHERE c.referrer_client_id = ?
    ORDER BY c.created_at DESC
  `).all(clientId);
}

// ============================================================
// STATS DO ADMIN
// ============================================================
function getStats() {
  const totalReferrals = db.prepare('SELECT COUNT(*) as count FROM clients WHERE referred_by IS NOT NULL').get().count;
  const totalCommissions = db.prepare('SELECT COALESCE(SUM(commission_amount), 0) as total FROM commissions').get().total;
  const topReferrers = db.prepare(`
    SELECT c.name, c.username, COUNT(cm.id) as referral_count, COALESCE(SUM(cm.commission_amount), 0) as earned
    FROM clients c
    LEFT JOIN commissions cm ON c.id = cm.referrer_client_id
    GROUP BY c.id
    HAVING referral_count > 0
    ORDER BY earned DESC
    LIMIT 10
  `).all();

  return { totalReferrals, totalCommissions, topReferrers };
}

module.exports = {
  COMMISSION_PERCENT, generateInviteCode, getReferrerByCode,
  registerReferral, getBalance, getCommissions, getStats,
};
