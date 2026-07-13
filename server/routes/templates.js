const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { generateId } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin', 'manager'));

// GET /api/templates
router.get('/', (req, res) => {
  const templates = db.prepare('SELECT t.*, u.name as creator_name FROM message_templates t LEFT JOIN users u ON t.created_by = u.id ORDER BY t.created_at DESC').all();
  res.json({ templates });
});

// POST /api/templates
router.post('/', (req, res) => {
  const { name, content, category, variables } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'Nome e conteúdo são obrigatórios' });

  const id = generateId();
  db.prepare('INSERT INTO message_templates (id, name, content, category, variables, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, content, category || 'followup', JSON.stringify(variables || []), req.user.id);

  const template = db.prepare('SELECT * FROM message_templates WHERE id = ?').get(id);
  res.status(201).json({ template });
});

// PUT /api/templates/:id
router.put('/:id', (req, res) => {
  const template = db.prepare('SELECT * FROM message_templates WHERE id = ?').get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template não encontrado' });

  const { name, content, category, variables } = req.body;
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (content !== undefined) { updates.push('content = ?'); params.push(content); }
  if (category !== undefined) { updates.push('category = ?'); params.push(category); }
  if (variables !== undefined) { updates.push('variables = ?'); params.push(JSON.stringify(variables)); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  params.push(req.params.id);
  db.prepare(`UPDATE message_templates SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM message_templates WHERE id = ?').get(req.params.id);
  res.json({ template: updated });
});

// DELETE /api/templates/:id
router.delete('/:id', (req, res) => {
  const template = db.prepare('SELECT * FROM message_templates WHERE id = ?').get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template não encontrado' });

  db.prepare('DELETE FROM message_templates WHERE id = ?').run(req.params.id);
  res.json({ message: 'Template removido' });
});

module.exports = router;
