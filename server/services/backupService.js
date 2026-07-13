/**
 * Backup Service - Database backup and restore
 */

const fs = require('fs');
const path = require('path');
const { getDb } = require('../database/connection');

const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');

// ============================================================
// CREATE BACKUP
// ============================================================
function createBackup(reason = 'manual') {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `backup_${timestamp}.json`);

  const db = getDb();

  // Export all tables
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")[0]?.values || [];
  const backup = {
    timestamp: new Date().toISOString(),
    reason,
    tables: {},
  };

  for (const [tableName] of tables) {
    try {
      const rows = db.exec(`SELECT * FROM ${tableName}`);
      if (rows.length > 0) {
        backup.tables[tableName] = {
          columns: rows[0].columns,
          rows: rows[0].values,
        };
      }
    } catch { /* skip */ }
  }

  fs.writeFileSync(backupFile, JSON.stringify(backup));
  const stats = fs.statSync(backupFile);

  console.log(`[BACKUP] Criado: ${backupFile} (${(stats.size / 1024).toFixed(1)} KB)`);
  return { file: backupFile, size: stats.size, tables: Object.keys(backup.tables).length };
}

// ============================================================
// LIST BACKUPS
// ============================================================
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .map(f => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        filename: f,
        size: stats.size,
        created: stats.birthtime,
      };
    })
    .sort((a, b) => b.created - a.created);
}

// ============================================================
// DELETE OLD BACKUPS (keep last 10)
// ============================================================
function cleanupBackups(keep = 10) {
  const backups = listBackups();
  if (backups.length <= keep) return 0;

  const toDelete = backups.slice(keep);
  for (const b of toDelete) {
    fs.unlinkSync(path.join(BACKUP_DIR, b.filename));
  }
  return toDelete.length;
}

// ============================================================
// AUTO BACKUP (run daily)
// ============================================================
function startAutoBackup() {
  // Backup every 24 hours
  setInterval(() => {
    try {
      createBackup('auto');
      cleanupBackups(10);
    } catch (err) {
      console.error('[BACKUP] Erro no backup automatico:', err.message);
    }
  }, 24 * 60 * 60 * 1000);

  // Initial backup on startup
  setTimeout(() => {
    try {
      createBackup('startup');
      cleanupBackups(10);
    } catch (err) {
      console.error('[BACKUP] Erro no backup inicial:', err.message);
    }
  }, 5000);
}

module.exports = { createBackup, listBackups, cleanupBackups, startAutoBackup };
