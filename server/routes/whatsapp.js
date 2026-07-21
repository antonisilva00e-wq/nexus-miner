/**
 * WhatsApp API Routes - Gerencia conexao e leitura de QR Code (Baileys)
 */

const express = require('express');
const waService = require('../services/whatsappService');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

router.use(authenticate);

// GET /api/whatsapp/status - Retorna o status atual e QR Code se disponivel
router.get('/status', (req, res) => {
  res.json(waService.getStatus());
});

// POST /api/whatsapp/start - Inicia o motor do Baileys para gerar QR
router.post('/start', authorize('admin', 'manager'), async (req, res) => {
  try {
    if (waService.status === 'connected') {
      return res.json({ message: 'Ja conectado', status: 'connected' });
    }
    await waService.start();
    res.json({ message: 'Servico iniciado', status: waService.status });
  } catch (err) {
    console.error('[WhatsApp Route] Erro start:', err);
    res.status(500).json({ error: 'Falha ao iniciar WhatsApp' });
  }
});

// POST /api/whatsapp/logout - Desconecta a sessao atual
router.post('/logout', authorize('admin', 'manager'), async (req, res) => {
  try {
    await waService.logout();
    res.json({ message: 'Desconectado com sucesso', status: 'disconnected' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desconectar' });
  }
});

// POST /api/whatsapp/send - Envia mensagem de teste ou ativa
router.post('/send', authorize('admin', 'manager', 'seller'), async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'Telefone (to) e mensagem sao obrigatorios' });
  }

  try {
    const cleanPhone = to.replace(/\D/g, '');
    await waService.sendMessage(cleanPhone, message);
    res.json({ ok: true, message: 'Enviada' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Falha ao enviar' });
  }
});

module.exports = router;
