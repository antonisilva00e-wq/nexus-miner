/**
 * Automation Routes - Scheduled mining and alerts
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { loadSchedules, createSchedule, deleteSchedule, toggleSchedule, runSchedule, getAlerts } = require('../services/automationService');

const router = express.Router();
router.use(authenticate);

// GET /api/automation/schedules - List all schedules
router.get('/schedules', authorize('admin', 'manager'), (req, res) => {
  const schedules = loadSchedules();
  res.json({ schedules });
});

// POST /api/automation/schedules - Create a new schedule
router.post('/schedules', authorize('admin', 'manager'), (req, res) => {
  const { name, keyword, city, frequency, maxResults } = req.body;
  if (!keyword || !city) return res.status(400).json({ error: 'Palavra-chave e cidade obrigatorias' });

  const schedule = createSchedule({ name, keyword, city, frequency, maxResults, userId: req.user.id });
  res.status(201).json({ schedule });
});

// DELETE /api/automation/schedules/:id - Delete a schedule
router.delete('/schedules/:id', authorize('admin', 'manager'), (req, res) => {
  deleteSchedule(req.params.id);
  res.json({ message: 'Agendamento removido' });
});

// PUT /api/automation/schedules/:id/toggle - Toggle active/inactive
router.put('/schedules/:id/toggle', authorize('admin', 'manager'), (req, res) => {
  const schedule = toggleSchedule(req.params.id);
  if (!schedule) return res.status(404).json({ error: 'Agendamento nao encontrado' });
  res.json({ schedule });
});

// POST /api/automation/schedules/:id/run - Run a schedule immediately
router.post('/schedules/:id/run', authorize('admin', 'manager'), async (req, res) => {
  try {
    const result = await runSchedule(req.params.id);
    if (!result) return res.status(404).json({ error: 'Agendamento nao encontrado' });
    if (result.error) return res.status(500).json({ error: result.error });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/automation/alerts - Get recent lead alerts
router.get('/alerts', authorize('admin', 'manager'), (req, res) => {
  const alerts = getAlerts(req.user.id);
  res.json({ alerts });
});

module.exports = router;
