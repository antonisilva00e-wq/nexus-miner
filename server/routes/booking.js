/**
 * Booking Routes - Appointment booking system
 * Allows leads to book appointments via shareable links
 */

const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

const router = express.Router();

// ============================================================
// PUBLIC ROUTES (no auth required)
// ============================================================

// GET /api/booking/:token - Get booking page data (public)
router.get('/:token', (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, u.name as seller_name, u.email as seller_email
    FROM bookings b
    LEFT JOIN users u ON b.seller_id = u.id
    WHERE b.token = ? AND b.status = 'active'
  `).get(req.params.token);

  if (!booking) {
    return res.status(404).json({ error: 'Link de agendamento invalido ou expirado' });
  }

  // Get available time slots
  const slots = getAvailableSlots(booking.seller_id, booking.date);

  res.json({
    booking: {
      id: booking.id,
      sellerName: booking.seller_name,
      sellerEmail: booking.seller_email,
      date: booking.date,
      duration: booking.duration,
      description: booking.description,
      location: booking.location,
    },
    slots,
  });
});

// POST /api/booking/:token/book - Book an appointment (public)
router.post('/:token/book', (req, res) => {
  const { name, email, phone, time, notes } = req.body;

  if (!name || !email || !time) {
    return res.status(400).json({ error: 'Nome, email e horario sao obrigatorios' });
  }

  const booking = db.prepare(`
    SELECT b.*, u.name as seller_name
    FROM bookings b
    LEFT JOIN users u ON b.seller_id = u.id
    WHERE b.token = ? AND b.status = 'active'
  `).get(req.params.token);

  if (!booking) {
    return res.status(404).json({ error: 'Link de agendamento invalido' });
  }

  // Check if slot is available
  const existing = db.prepare(`
    SELECT id FROM appointments 
    WHERE booking_id = ? AND date = ? AND time = ? AND status != 'cancelled'
  `).get(booking.id, booking.date, time);

  if (existing) {
    return res.status(400).json({ error: 'Este horario ja esta ocupado' });
  }

  // Create appointment
  const id = generateId();
  db.prepare(`
    INSERT INTO appointments (id, booking_id, client_name, client_email, client_phone, date, time, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `).run(id, booking.id, name, email, phone || null, booking.date, time, notes || null);

  // Log activity
  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(generateId(), booking.seller_id, 'appointment', id, 'booked', JSON.stringify({ client: name, date: booking.date, time }));

  // Notify seller via Socket.IO
  if (global.__notify) {
    global.__notify('appointment', 'Nexus Miner', `Reunião agendada: ${name} — ${booking.date} às ${time}`, { appointmentId: id, bookingId: booking.id });
  }

  res.status(201).json({
    message: 'Agendamento confirmado!',
    appointment: {
      id,
      date: booking.date,
      time,
      sellerName: booking.seller_name,
      duration: booking.duration,
    },
  });
});

// ============================================================
// AUTHENTICATED ROUTES
// ============================================================

// POST /api/booking/create - Create a booking link (authenticated)
router.post('/create', authenticate, (req, res) => {
  const { date, duration, description, location } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Data e obrigatoria' });
  }

  const id = generateId();
  const token = generateId().replace(/-/g, '').substring(0, 16);

  db.prepare(`
    INSERT INTO bookings (id, seller_id, token, date, duration, description, location, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(id, req.user.id, token, date, duration || 30, description || '', location || '');

  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  res.status(201).json({
    message: 'Link de agendamento criado!',
    booking: {
      id,
      token,
      url: `${baseUrl}/booking/${token}`,
      date,
      duration: duration || 30,
    },
  });
});

// GET /api/booking/list - List user's bookings (authenticated)
router.get('/list', authenticate, (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, 
      (SELECT COUNT(*) FROM appointments a WHERE a.booking_id = b.id AND a.status = 'confirmed') as confirmed_count,
      (SELECT COUNT(*) FROM appointments a WHERE a.booking_id = b.id AND a.status = 'cancelled') as cancelled_count
    FROM bookings b
    WHERE b.seller_id = ?
    ORDER BY b.date DESC
  `).all(req.user.id);

  res.json({ bookings });
});

// GET /api/booking/appointments/:bookingId - Get appointments for a booking
router.get('/appointments/:bookingId', authenticate, (req, res) => {
  const appointments = db.prepare(`
    SELECT * FROM appointments
    WHERE booking_id = ?
    ORDER BY date, time
  `).all(req.params.bookingId);

  res.json({ appointments });
});

// PUT /api/booking/appointments/:id/status - Update appointment status
router.put('/appointments/:id/status', authenticate, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['confirmed', 'completed', 'cancelled', 'no-show'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status invalido' });
  }

  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!appointment) {
    return res.status(404).json({ error: 'Agendamento nao encontrado' });
  }

  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id);

  res.json({ message: 'Status atualizado', status });
});

// ============================================================
// HELPER: Get available time slots
// ============================================================
function getAvailableSlots(sellerId, date) {
  const allSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
  ];

  // Get booked slots
  const booked = db.prepare(`
    SELECT time FROM appointments
    WHERE date = ? AND status != 'cancelled'
  `).all(date).map(a => a.time);

  return allSlots.map(time => ({
    time,
    available: !booked.includes(time),
  }));
}

module.exports = router;
