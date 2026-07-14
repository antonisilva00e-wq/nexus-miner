/**
 * Referral Routes - Sistema simples de indicação
 */

const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const {
  COMMISSION_PERCENT, generateInviteCode, getReferrerByCode,
  registerReferral, getBalance, getCommissions, getStats,
} = require('../services/referralService');

const router = express.Router();

// Garantir que colunas existam
try { db.prepare('ALTER TABLE clients ADD COLUMN invite_code TEXT'); } catch {}
try { db.prepare('ALTER TABLE clients ADD COLUMN referred_by TEXT'); } catch {}
try { db.prepare('ALTER TABLE clients ADD COLUMN commission_balance REAL DEFAULT 0'); } catch {}

// GET /api/referrals/my-code - Meu código de convite (requer login)
router.get('/my-code', authenticate, (req, res) => {
  const baseUrl = process.env.APP_URL || 'https://nexus-miner.onrender.com';
  let client = db.prepare('SELECT invite_code FROM clients WHERE id = ?').get(req.user.id);
  if (!client || !client.invite_code) {
    const code = generateInviteCode(req.user.id);
    res.json({ code, link: `${baseUrl}/#/register?ref=${code}` });
  } else {
    res.json({ code: client.invite_code, link: `${baseUrl}/#/register?ref=${client.invite_code}` });
  }
});

// GET /api/referrals/balance - Meu saldo (requer login)
router.get('/balance', authenticate, (req, res) => {
  const balance = getBalance(req.user.id);
  const commission = COMMISSION_PERCENT;
  res.json({ balance, commission });
});

// GET /api/referrals/history - Histórico de comissões (requer login)
router.get('/history', authenticate, (req, res) => {
  const commissions = getCommissions(req.user.id);
  const balance = getBalance(req.user.id);
  res.json({ commissions, balance });
});

// GET /api/referrals/stats - Stats do admin (requer login admin)
router.get('/stats', authenticate, authorize('admin'), (req, res) => {
  const stats = getStats();
  res.json(stats);
});

// POST /api/referrals/register - Cadastro via código de convite (público)
router.post('/register', (req, res) => {
  const { code, name, email, username, password, plan, price } = req.body;
  if (!code || !name || !email || !username || !password) {
    return res.status(400).json({ error: 'Todos os campos sao obrigatorios' });
  }

  const referrer = getReferrerByCode(code);
  if (!referrer) return res.status(404).json({ error: 'Codigo de convite invalido' });

  // Verificar se usuario já existe
  const existing = db.prepare('SELECT id FROM clients WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Usuario ja existe' });

  const result = registerReferral(referrer.id, {
    name, email, username, password,
    plan: plan || 'Mensal',
    price: price || 97,
  });

  // Real-time notification for commission
  if (global.__notify) {
    global.__notify('commission', 'Comissão Recebida!', `${referrer.name} — R$ ${result.commission.toLocaleString('pt-BR')} por indicação de ${name}`, { referrerId: referrer.id, newClient: name });
  }

  res.status(201).json({
    message: 'Conta criada com sucesso!',
    commission: result.commission,
    referredBy: referrer.name,
  });
});

module.exports = router;
