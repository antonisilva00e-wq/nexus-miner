const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { generateId } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/apikeys
router.get('/', (req, res) => {
  const keys = db.prepare('SELECT id, name, permissions, active, last_used_at, created_at FROM api_keys ORDER BY created_at DESC').all();
  res.json({ apiKeys: keys });
});

// POST /api/apikeys
router.post('/', (req, res) => {
  const { name, permissions } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  const rawKey = 'nmx_' + crypto.randomBytes(32).toString('hex');
  const keyHash = bcrypt.hashSync(rawKey, 10);
  const id = generateId();

  db.prepare('INSERT INTO api_keys (id, name, key_hash, permissions) VALUES (?, ?, ?, ?)')
    .run(id, name, keyHash, permissions || 'read');

  res.status(201).json({ id, name, key: rawKey, permissions: permissions || 'read', message: 'Guarde esta chave! Ela não será mostrada novamente.' });
});

// DELETE /api/apikeys/:id
router.delete('/:id', (req, res) => {
  const key = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(req.params.id);
  if (!key) return res.status(404).json({ error: 'API Key não encontrada' });

  db.prepare('DELETE FROM api_keys WHERE id = ?').run(req.params.id);
  res.json({ message: 'API Key revogada' });
});

module.exports = router;
