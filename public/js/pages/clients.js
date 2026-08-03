// Clients Page - Enhanced
const ClientsPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Manage Clients';
    document.getElementById('page-subtitle').textContent = 'Nexus Miner Subscribers';

    const el = document.getElementById('page-clients');
    el.innerHTML = `
      <div id="clients-metrics" class="kpi-grid">
        ${Array(4).fill('<div class="skeleton-card" style="min-height:80px;"></div>').join('')}
      </div>
      <div class="card">
        <div class="card-header">
          <h3><i data-lucide="users"></i>Subscribers</h3>
          <button class="btn btn-primary" onclick="ClientsPage.openModal()"><i data-lucide="user-plus"></i>New Client</button>
        </div>
        <div class="filters-bar">
          <div class="search-box">
            <i data-lucide="search"></i>
            <input type="text" id="clients-search" placeholder="Search client..." oninput="ClientsPage.loadClients()">
          </div>
        </div>
        <div class="table-wrapper">
          <table><thead><tr><th>Client</th><th>User</th><th>Plan</th><th>Expiration</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="clients-tbody"></tbody></table>
        </div>
        <div class="empty-state" id="clients-empty" style="display:none;">
          <i data-lucide="users"></i>
          <p>No registered clients</p>
          <span class="text-secondary text-sm">Click on "New Client" to create the first access.</span>
        </div>
      </div>
    `;
    lucide.createIcons();
    await Promise.all([this.loadMetrics(), this.loadClients()]);
  },

  async loadMetrics() {
    try {
      const data = await API.get('/clients/stats');
      document.getElementById('clients-metrics').innerHTML = `
        <div class="kpi-card">
          <div class="kpi-icon" style="background:linear-gradient(135deg,#818cf8,#6366f1);"><i data-lucide="users"></i></div>
          <div class="kpi-info"><span class="kpi-value" data-counter="${data.total}">0</span><span class="kpi-label">Total</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:linear-gradient(135deg,#10b981,#059669);"><i data-lucide="check-circle"></i></div>
          <div class="kpi-info"><span class="kpi-value" data-counter="${data.active}">0</span><span class="kpi-label">Active</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706);"><i data-lucide="clock"></i></div>
          <div class="kpi-info"><span class="kpi-value" data-counter="${data.expiring}">0</span><span class="kpi-label">Expire in 7d</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:linear-gradient(135deg,#22d3ee,#06b6d4);"><i data-lucide="dollar-sign"></i></div>
          <div class="kpi-info"><span class="kpi-value">R$ ${data.mrr.toLocaleString('pt-BR')}</span><span class="kpi-label">MRR</span></div>
        </div>
      `;
      lucide.createIcons();
      // Animate counters
      document.querySelectorAll('#clients-metrics [data-counter]').forEach(el => {
        const target = parseFloat(el.dataset.counter);
        const duration = 600;
        const start = performance.now();
        function step(now) {
          const p = Math.min((now - start) / duration, 1);
          el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    } catch (err) { console.error(err); }
  },

  async loadClients() {
    try {
      const search = document.getElementById('clients-search')?.value || '';
      const data = await API.get(`/clients?search=${encodeURIComponent(search)}`);
      const tbody = document.getElementById('clients-tbody');
      const empty = document.getElementById('clients-empty');

      if (!data.clients.length) { tbody.innerHTML = ''; empty.style.display = 'flex'; return; }
      empty.style.display = 'none';

      const statusLabels = { active: 'Active', expired: 'Expired', expiring: 'Expiring soon', inactive: 'Inactive' };
      const statusClasses = { active: 'badge-success', expired: 'badge-danger', expiring: 'badge-warning', inactive: 'badge-primary' };
      const planColors = { Starter: '#818cf8', Pro: '#38bdf8', Business: '#34d399', Personalizado: '#f59e0b', Custom: '#f59e0b' };

      tbody.innerHTML = data.clients.map(c => {
        const expiryDate = c.expiry ? new Date(c.expiry) : null;
        const isExpiring = expiryDate && (expiryDate - new Date()) / 86400000 <= 7 && expiryDate > new Date();
        return `
          <tr>
            <td><strong style="color:white;">${c.name}</strong>${c.email ? `<br><span class="text-tertiary" style="font-size:0.75rem;">${c.email}</span>` : ''}</td>
            <td><code style="background:rgba(129,140,248,0.1);color:var(--accent-primary);padding:2px 8px;border-radius:4px;font-size:0.82rem;">${c.username}</code></td>
            <td><span class="badge" style="background:${planColors[c.plan] || '#818cf8'}22;color:${planColors[c.plan] || '#818cf8'};border:1px solid ${planColors[c.plan] || '#818cf8'}33;">${c.plan} · R$${c.price}</span></td>
            <td><span style="font-size:0.85rem;color:${isExpiring ? 'var(--attention)' : 'var(--text-secondary)'};">${c.expiry ? new Date(c.expiry).toLocaleDateString('pt-BR') : '-'}</span></td>
            <td><span class="badge ${statusClasses[c.status] || 'badge-primary'}">${statusLabels[c.status] || c.status}</span></td>
            <td><div style="display:flex;gap:0.35rem;">
              <button class="btn btn-sm btn-secondary" onclick="ClientsPage.editClient('${c.id}')" title="Edit"><i data-lucide="edit-3"></i></button>
              <button class="btn btn-sm btn-danger" onclick="ClientsPage.deleteClient('${c.id}')" title="Delete"><i data-lucide="trash-2"></i></button>
            </div></td>
          </tr>
        `;
      }).join('');
      lucide.createIcons();
    } catch (err) { showToast('Error loading clients', 'danger'); }
  },

  openModal(clientId = null) {
    const isEdit = !!clientId;
    Modal.open(
      isEdit ? '<i data-lucide="edit-3" style="color:var(--accent-secondary);"></i> Edit Client' : '<i data-lucide="user-plus" style="color:var(--accent-primary);"></i> New Client',
      `<form id="client-form">
        <input type="hidden" id="cf-id" value="${clientId || ''}">
        <div class="form-grid"><div class="form-group"><label>Name *</label><input type="text" id="cf-name" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
        <div class="form-group"><label>Email</label><input type="email" id="cf-email" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div></div>
        <div class="form-grid"><div class="form-group"><label>User *</label><input type="text" id="cf-username" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
        <div class="form-group"><label>${isEdit ? 'New Password (optional)' : 'Password *'}</label><input type="password" id="cf-password" ${isEdit ? '' : 'required'} style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div></div>
        <div class="form-grid"><div class="form-group"><label>Plan</label><select id="cf-plan" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;"><option value="Starter">Starter - R$97</option><option value="Pro">Pro - R$197</option><option value="Business">Business - R$397</option><option value="Personalizado">Custom</option></select></div>
        <div class="form-group"><label>Monthly Amount (R$)</label><input type="number" id="cf-price" min="0" step="0.01" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div></div>
        <div class="form-grid"><div class="form-group"><label>Expiration</label><input type="date" id="cf-expiry" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
        <div class="form-group"><label>WhatsApp</label><input type="text" id="cf-phone" placeholder="(41) 99999-0000" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div></div>
      </form>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
       <button class="btn btn-primary" onclick="ClientsPage.saveClient()"><i data-lucide="save"></i>Save</button>`
    );

    if (isEdit) this.loadClientData(clientId);
  },

  async loadClientData(id) {
    try {
      const data = await API.get(`/clients?limit=100`);
      const c = data.clients.find(x => x.id === id);
      if (!c) return;
      document.getElementById('cf-name').value = c.name;
      document.getElementById('cf-email').value = c.email || '';
      document.getElementById('cf-username').value = c.username;
      document.getElementById('cf-plan').value = c.plan || 'Starter';
      document.getElementById('cf-price').value = c.price || '';
      document.getElementById('cf-expiry').value = c.expiry || '';
      document.getElementById('cf-phone').value = c.phone || '';
    } catch (err) { console.error(err); }
  },

  async saveClient() {
    const id = document.getElementById('cf-id').value;
    const body = {
      name: document.getElementById('cf-name').value.trim(),
      email: document.getElementById('cf-email').value.trim(),
      username: document.getElementById('cf-username').value.trim(),
      plan: document.getElementById('cf-plan').value,
      price: parseFloat(document.getElementById('cf-price').value) || 0,
      expiry: document.getElementById('cf-expiry').value,
      phone: document.getElementById('cf-phone').value.trim(),
    };

    const password = document.getElementById('cf-password').value.trim();
    if (password) body.password = password;

    if (!body.name || !body.username) return showToast('Name and user are required', 'warning');
    if (!id && !password) return showToast('Password is required', 'warning');

    try {
      if (id) {
        await API.put(`/clients/${id}`, body);
        showToast('Client updated!', 'success');
      } else {
        body.password = password;
        await API.post('/clients', body);
        showToast('Client created!', 'success');
      }
      Modal.close();
      await Promise.all([this.loadClients(), this.loadMetrics()]);
    } catch (err) { showToast('Error: ' + err.message, 'danger'); }
  },

  async editClient(id) { this.openModal(id); },

  async deleteClient(id) {
    if (!confirm('Remove this client?')) return;
    try {
      await API.del(`/clients/${id}`);
      showToast('Client removed', 'success');
      await Promise.all([this.loadClients(), this.loadMetrics()]);
    } catch (err) { showToast('Error: ' + err.message, 'danger'); }
  }
};
