/**
 * Audit Service - Track all user actions for security and compliance
 */

const { db } = require('../db');
const { generateId } = require('../utils/helpers');

// ============================================================
// LOG ACTION
// ============================================================
function logAction(userId, action, details = {}) {
  try {
    db.prepare(`
      INSERT INTO activities (id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      generateId(),
      userId,
      details.entityType || 'system',
      details.entityId || null,
      action,
      JSON.stringify({
        ...details,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (err) {
    console.error('[AUDIT] Erro ao registrar:', err.message);
  }
}

// ============================================================
// GET AUDIT LOG
// ============================================================
function getAuditLog(filters = {}) {
  const { userId, action, entityType, limit = 100, offset = 0 } = filters;
  const conditions = [];
  const params = [];

  if (userId) { conditions.push('a.user_id = ?'); params.push(userId); }
  if (action) { conditions.push('a.action = ?'); params.push(action); }
  if (entityType) { conditions.push('a.entity_type = ?'); params.push(entityType); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  return db.prepare(`
    SELECT a.*, u.name as user_name, u.username
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
}

// ============================================================
// GET SECURITY EVENTS
// ============================================================
function getSecurityEvents(hours = 24) {
  return db.prepare(`
    SELECT a.*, u.name as user_name, u.username
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.action IN ('login', 'logout', 'password_changed', 'failed_login')
    AND a.created_at >= datetime('now', '-${hours} hours')
    ORDER BY a.created_at DESC
  `).all();
}

// ============================================================
// GET USER ACTIVITY SUMMARY
// ============================================================
function getUserActivitySummary(userId, days = 30) {
  const totalActions = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ? AND created_at >= date('now', '-${days} days')
  `).get(userId).count;

  const byAction = db.prepare(`
    SELECT action, COUNT(*) as count FROM activities
    WHERE user_id = ? AND created_at >= date('now', '-${days} days')
    GROUP BY action ORDER BY count DESC
  `).all(userId);

  const lastActivity = db.prepare(`
    SELECT * FROM activities WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(userId);

  return { totalActions, byAction, lastActivity };
}

module.exports = { logAction, getAuditLog, getSecurityEvents, getUserActivitySummary };
