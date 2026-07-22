const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure data directory exists
const dataDir = path.dirname(config.dbPath);
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (err) {
  console.error('[DB] Warning: Could not create data directory:', err.message);
  // Fallback to /tmp on Render if directory creation fails
  config.dbPath = path.join('/tmp', 'nexusminer.db');
  console.log('[DB] Using fallback path:', config.dbPath);
}

let db = null;

// Initialize database (async)
async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(config.dbPath)) {
    const buffer = fs.readFileSync(config.dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL mode and foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Auto-save periodically (every 3 seconds for safety)
  setInterval(() => saveDatabase(), 3000);

  // Save on process exit - multiple handlers for reliability
  process.on('exit', () => saveDatabase());
  process.on('SIGINT', () => { saveDatabase(); process.exit(); });
  process.on('SIGTERM', () => { saveDatabase(); process.exit(); });
  process.on('uncaughtException', () => { saveDatabase(); process.exit(1); });
  process.on('beforeExit', () => saveDatabase());

  return db;
}

// Save database to disk
function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(config.dbPath, buffer);
}

// Get database instance (must call initDatabase first)
function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

// Wrapper to make sql.js API similar to better-sqlite3
// Provides: prepare().run/get/all, exec, pragma
function createWrapper(database) {
  function safeBind(stmt, params) {
    if (params && params.length > 0) {
      stmt.bind(params);
    }
  }

  return {
    prepare(sql) {
      return {
        run(...params) {
          const stmt = database.prepare(sql);
          safeBind(stmt, params);
          stmt.step();
          stmt.free();
          return { changes: database.getRowsModified() };
        },
        get(...params) {
          const stmt = database.prepare(sql);
          safeBind(stmt, params);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const values = stmt.get();
            stmt.free();
            const row = {};
            cols.forEach((col, i) => row[col] = values[i]);
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const stmt = database.prepare(sql);
          safeBind(stmt, params);
          const rows = [];
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const values = stmt.get();
            const row = {};
            cols.forEach((col, i) => row[col] = values[i]);
            rows.push(row);
          }
          stmt.free();
          return rows;
        }
      };
    },
    exec(sql) {
      return database.exec(sql);
    },
    pragma(str) {
      try { database.run(`PRAGMA ${str}`); } catch {}
    }
  };
}

module.exports = { initDatabase, getDb, createWrapper, saveDatabase };
