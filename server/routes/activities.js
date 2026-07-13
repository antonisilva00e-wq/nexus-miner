const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();
router.use(authenticate);

// GET /api/activities
router.get('/', authorize('admin', 'manager'), (req, res) => {
  const { entity_type, entity_id, user_id, limit = 50 } = req.query;
  const params = [];
  const conditions = [];

  if (entity_type) { conditions.push('a.entity_type = ?'); params.push(entity_type); }
  if (entity_id) { conditions.push('a.entity_id = ?'); params.push(entity_id); }
  if (user_id) { conditions.push('a.user_id = ?'); params.push(user_id); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const activities = db.prepare(`
    SELECT a.*, u.name as user_name
    FROM activities a LEFT JOIN users u ON a.user_id = u.id
    ${where} ORDER BY a.created_at DESC LIMIT ?
  `).all(...params, limit);

  res.json({ activities });
});

module.exports = router;
