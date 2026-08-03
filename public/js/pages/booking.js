// Booking Page - Appointment Scheduling System
const BookingPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Appointments';
    document.getElementById('page-subtitle').textContent = 'Create booking links for your leads';

    document.getElementById('page-booking').innerHTML = `
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;"><i data-lucide="calendar" style="color:white;width:20px;height:20px;"></i></div>
          <div><h3 style="color:white;font-size:1.1rem;">Create Booking Link</h3><p style="color:var(--text-tertiary);font-size:0.8rem;">Generate a link for your leads to schedule meetings</p></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="booking-date" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:var(--text-primary);">
          </div>
          <div class="form-group">
            <label>Duration (minutes)</label>
            <select id="booking-duration" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:var(--text-primary);">
              <option value="15">15 minutes</option>
              <option value="30" selected>30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
            </select>
          </div>
          <div class="form-group">
            <label>Location (optional)</label>
            <input type="text" id="booking-location" placeholder="Meeting room, Zoom..." style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:var(--text-primary);">
          </div>
        </div>
        <div class="form-group" style="margin-bottom:1rem;">
          <label>Description (optional)</label>
          <input type="text" id="booking-description" placeholder="Introductory meeting, Demo..." style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:var(--text-primary);">
        </div>
        <button class="btn btn-primary" onclick="BookingPage.createBooking()" id="btn-create-booking"><i data-lucide="link"></i>Generate Link</button>
      </div>

      <div id="booking-created" style="display:none;" class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;"><i data-lucide="check-circle" style="color:white;width:18px;height:18px;"></i></div>
          <h3 style="color:white;font-size:1rem;">Link Created!</h3>
        </div>
        <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.12);border-radius:8px;padding:1rem;margin-bottom:1rem;">
          <p style="color:var(--text-tertiary);font-size:0.8rem;margin:0 0 4px;">Booking Link:</p>
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <input type="text" id="booking-link" readonly style="flex:1;padding:0.5rem;background:rgba(0,0,0,0.2);border:1px solid rgba(16,185,129,0.2);border-radius:4px;color:#10b981;font-family:monospace;font-size:0.85rem;">
            <button class="btn btn-sm btn-secondary" onclick="BookingPage.copyLink()"><i data-lucide="copy"></i>Copy</button>
          </div>
        </div>
        <p style="color:var(--text-secondary);font-size:0.85rem;">Send this link to your lead. They will be able to choose a time and book directly.</p>
      </div>

      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);display:flex;align-items:center;justify-content:center;"><i data-lucide="list" style="color:white;width:18px;height:18px;"></i></div>
          <h3 style="color:white;font-size:1rem;">My Appointments</h3>
        </div>
        <div id="booking-list"></div>
      </div>
    `;
    lucide.createIcons();

    this.loadBookings();
  },

  async createBooking() {
    const date = document.getElementById('booking-date').value;
    const duration = parseInt(document.getElementById('booking-duration').value);
    const location = document.getElementById('booking-location').value;
    const description = document.getElementById('booking-description').value;

    if (!date) return showToast('Select a date', 'warning');

    const btn = document.getElementById('btn-create-booking');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin-animation"></i>Creating...';
    lucide.createIcons();

    try {
      const result = await API.post('/booking/create', { date, duration, description, location });

      document.getElementById('booking-created').style.display = 'block';
      document.getElementById('booking-link').value = result.booking.url;

      showToast('Link created successfully!', 'success');
      this.loadBookings();
    } catch (err) {
      showToast('Error: ' + err.message, 'danger');
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="link"></i>Generate Link';
    lucide.createIcons();
  },

  copyLink() {
    const link = document.getElementById('booking-link').value;
    navigator.clipboard.writeText(link).then(() => {
      showToast('Link copied!', 'success');
    });
  },

  async loadBookings() {
    try {
      const data = await API.get('/booking/list');
      const container = document.getElementById('booking-list');

      if (!data.bookings || data.bookings.length === 0) {
        container.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">No appointments created yet</p>';
        return;
      }

      container.innerHTML = data.bookings.map(b => {
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/booking/${b.token}`;
        const isPast = new Date(b.date) < new Date();

        return `
          <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;border-bottom:1px solid var(--border-color);${isPast ? 'opacity:0.5;' : ''}">
            <div style="width:40px;height:40px;border-radius:10px;background:${isPast ? 'rgba(107,114,128,0.15)' : 'rgba(16,185,129,0.15)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i data-lucide="calendar" style="width:18px;height:18px;color:${isPast ? '#6b7280' : '#10b981'};"></i>
            </div>
            <div style="flex:1;">
              <p style="color:white;font-size:0.9rem;font-weight:500;margin:0;">${new Date(b.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <p style="color:var(--text-tertiary);font-size:0.78rem;margin:2px 0 0;">${b.duration}min | ${b.confirmed_count || 0} scheduled | ${b.description || 'No description'}</p>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-sm btn-secondary" onclick="BookingPage.copyBookingLink('${url}')" title="Copy link"><i data-lucide="copy" style="width:14px;height:14px;"></i></button>
              <button class="btn btn-sm btn-secondary" onclick="BookingPage.viewAppointments('${b.id}')" title="View appointments"><i data-lucide="users" style="width:14px;height:14px;"></i></button>
            </div>
          </div>
        `;
      }).join('');

      lucide.createIcons();
    } catch (err) {
      console.error('Erro ao carregar bookings:', err);
    }
  },

  copyBookingLink(url) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied!', 'success');
    });
  },

  async viewAppointments(bookingId) {
    try {
      const data = await API.get(`/booking/appointments/${bookingId}`);

      if (!data.appointments || data.appointments.length === 0) {
        showToast('No appointments yet', 'info');
        return;
      }

      // Show modal with appointments
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;padding:2rem;';
      modal.innerHTML = `
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(16,185,129,0.2);border-radius:16px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto;">
          <div style="padding:1.5rem;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;">
            <h3 style="color:white;font-size:1.1rem;margin:0;">Appointments</h3>
            <button onclick="this.closest('div[style*=fixed]').remove()" style="background:rgba(255,255,255,0.1);border:none;color:white;width:32px;height:32px;border-radius:8px;cursor:pointer;">X</button>
          </div>
          <div style="padding:1rem;">
            ${data.appointments.map(a => `
              <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;border-bottom:1px solid rgba(255,255,255,0.06);">
                <div style="width:36px;height:36px;border-radius:8px;background:rgba(16,185,129,0.15);display:flex;align-items:center;justify-content:center;">
                  <i data-lucide="user" style="width:16px;height:16px;color:#10b981;"></i>
                </div>
                <div style="flex:1;">
                  <p style="color:white;font-size:0.9rem;margin:0;">${a.client_name}</p>
                  <p style="color:var(--text-tertiary);font-size:0.75rem;margin:2px 0 0;">${a.time} | ${a.client_email} | ${a.status}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      lucide.createIcons();
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    } catch (err) {
      showToast('Error: ' + err.message, 'danger');
    }
  }
};
