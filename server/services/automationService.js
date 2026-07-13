/**
 * Automation Service - Scheduled lead mining and alerts
 */

const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { generateId } = require('../utils/helpers');
const { mineLeads, lookupCNPJ } = require('./leadService');

const SCHEDULES_FILE = path.join(__dirname, '..', 'data', 'schedules.json');

// ============================================================
// SCHEDULE MANAGEMENT
// ============================================================
function loadSchedules() {
  try {
    if (fs.existsSync(SCHEDULES_FILE)) {
      return JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

function saveSchedules(schedules) {
  const dir = path.dirname(SCHEDULES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
}

function createSchedule(data) {
  const schedules = loadSchedules();
  const schedule = {
    id: generateId(),
    name: data.name || 'Mineração Automática',
    keyword: data.keyword,
    city: data.city,
    frequency: data.frequency || 'weekly', // daily, weekly, monthly
    maxResults: data.maxResults || 100,
    active: true,
    lastRun: null,
    nextRun: getNextRun(data.frequency || 'weekly'),
    createdBy: data.userId,
    createdAt: new Date().toISOString(),
    results: 0,
  };
  schedules.push(schedule);
  saveSchedules(schedules);
  return schedule;
}

function getNextRun(frequency) {
  const now = new Date();
  switch (frequency) {
    case 'daily': now.setDate(now.getDate() + 1); break;
    case 'weekly': now.setDate(now.getDate() + 7); break;
    case 'monthly': now.setMonth(now.getMonth() + 1); break;
  }
  return now.toISOString();
}

function deleteSchedule(id) {
  const schedules = loadSchedules().filter(s => s.id !== id);
  saveSchedules(schedules);
}

function toggleSchedule(id) {
  const schedules = loadSchedules();
  const s = schedules.find(s => s.id === id);
  if (s) { s.active = !s.active; saveSchedules(schedules); }
  return s;
}

// ============================================================
// RUN SCHEDULED MINING
// ============================================================
async function runSchedule(scheduleId) {
  const schedules = loadSchedules();
  const schedule = schedules.find(s => s.id === scheduleId);
  if (!schedule || !schedule.active) return null;

  try {
    const leads = await mineLeads(schedule.keyword, schedule.city, { maxResults: schedule.maxResults });

    // Save leads to database
    let saved = 0;
    for (const lead of leads) {
      const id = generateId();
      try {
        db.prepare(`INSERT INTO leads (id, name, cnpj, activity, phone, email, site, address, city, state, owner, source, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id, lead.name, lead.cnpj || null, lead.activity || schedule.keyword, lead.phone || null, lead.email || null, lead.site || null, lead.address || null, lead.city || schedule.city.split(',')[0], lead.state || schedule.city.split(',')[1]?.trim() || '', lead.owner || null, lead.fonte || 'automation', schedule.createdBy, schedule.createdBy);
        saved++;
      } catch { /* skip duplicates */ }
    }

    // Update schedule
    schedule.lastRun = new Date().toISOString();
    schedule.nextRun = getNextRun(schedule.frequency);
    schedule.results = saved;
    saveSchedules(schedules);

    // Log activity
    db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
      .run(generateId(), schedule.createdBy, 'automation', schedule.id, 'completed', JSON.stringify({ keyword: schedule.keyword, city: schedule.city, results: saved }));

    return { schedule, leadsFound: leads.length, leadsSaved: saved };
  } catch (err) {
    console.error('Automation error:', err);
    return { schedule, error: err.message };
  }
}

// ============================================================
// CHECK AND RUN DUE SCHEDULES
// ============================================================
async function checkDueSchedules() {
  const schedules = loadSchedules();
  const now = new Date();
  const results = [];

  for (const s of schedules) {
    if (!s.active) continue;
    if (new Date(s.nextRun) <= now) {
      const result = await runSchedule(s.id);
      if (result) results.push(result);
    }
  }

  return results;
}

// ============================================================
// LEAD ALERTS - New leads matching criteria
// ============================================================
function getAlerts(userId) {
  const recentLeads = db.prepare(`
    SELECT * FROM leads 
    WHERE created_at >= datetime('now', '-24 hours')
    AND assigned_to = ?
    ORDER BY created_at DESC
  `).all(userId);

  return recentLeads.map(l => ({
    id: l.id,
    type: 'new_lead',
    title: `Novo lead: ${l.name}`,
    message: `${l.activity || 'Empresa'} em ${l.city || 'N/I'} - ${l.source || 'manual'}`,
    createdAt: l.created_at,
    read: false,
  }));
}

module.exports = {
  loadSchedules, createSchedule, deleteSchedule, toggleSchedule,
  runSchedule, checkDueSchedules, getAlerts,
};
