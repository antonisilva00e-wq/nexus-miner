// WhatsApp Page
const WhatsAppPage = {
  async render() {
    document.getElementById('page-title').textContent = 'WhatsApp';
    document.getElementById('page-subtitle').textContent = 'Connect your device and set up automations';

    document.getElementById('page-whatsapp').innerHTML = `
      <div class="kpi-grid" style="margin-bottom:1.5rem;">
        <div class="kpi-card" id="wa-connection-card">
          <div class="kpi-icon" style="background:linear-gradient(135deg,#25d366,#128c7e);"><i data-lucide="smartphone"></i></div>
          <div class="kpi-info">
            <span class="kpi-value" id="wa-status" style="font-size:1.2rem;">Loading...</span>
            <span class="kpi-label">Device Status</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:linear-gradient(135deg,#818cf8,#6366f1);"><i data-lucide="send"></i></div>
          <div class="kpi-info">
            <span class="kpi-value" id="wa-sent-count">0</span>
            <span class="kpi-label">Sent Messages</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706);"><i data-lucide="file-text"></i></div>
          <div class="kpi-info">
            <span class="kpi-value" id="wa-template-count">0</span>
            <span class="kpi-label">Saved Templates</span>
          </div>
        </div>
      </div>

      <!-- Conexão do Aparelho -->
      <div class="card" style="margin-bottom:1.5rem;" id="wa-device-section">
        <div class="card-header">
          <h3><i data-lucide="scan"></i> Connect Device</h3>
          <button class="btn btn-sm btn-primary" id="btn-wa-action" onclick="WhatsAppPage.startConnection()">Connect Now</button>
        </div>
        <div id="wa-connection-area" style="padding: 2rem; text-align: center; display: none;">
          <div id="wa-qr-container"></div>
          <p id="wa-connection-text" style="margin-top:1rem; color:var(--text-secondary);">Awaiting action...</p>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <h3><i data-lucide="message-circle"></i> Message Templates</h3>
            <button class="btn btn-sm btn-primary" onclick="WhatsAppPage.openTemplateModal()"><i data-lucide="plus"></i> New</button>
          </div>
          <div id="templates-list"></div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h3><i data-lucide="history"></i> Recent Messages</h3>
          </div>
          <div id="messages-history"></div>
        </div>
      </div>
    `;
    
    lucide.createIcons();
    this.setupSocketListeners();
    await this.checkStatus();
    await this.loadData();
  },

  setupSocketListeners() {
    if (!globalThis.__wa_socket_bound) {
      // Find the socket instance. Notifications.socket is created in app.js
      const sock = (typeof Notifications !== 'undefined') ? Notifications.socket : null;
      if (sock) {
        sock.on('wa_status', (data) => {
          WhatsAppPage.updateUIState(data);
        });
        
        sock.on('wa_qr', (data) => {
          const qrContainer = document.getElementById('wa-qr-container');
          const text = document.getElementById('wa-connection-text');
          if (qrContainer && data.qr) {
            qrContainer.innerHTML = `<img src="${data.qr}" style="width:220px;height:220px;border-radius:12px;border:4px solid white;" />`;
            if (text) text.innerHTML = "Open WhatsApp on your phone, go to <b>Linked Devices</b> and scan this QR Code.";
          }
        });
        globalThis.__wa_socket_bound = true;
      } else {
        // If socket isn't ready yet, try again in 500ms
        setTimeout(() => WhatsAppPage.setupSocketListeners(), 500);
      }
    }
  },

  async checkStatus() {
    try {
      const res = await API.get('/whatsapp/status');
      this.updateUIState(res);
    } catch (e) {
      document.getElementById('wa-status').textContent = 'Error';
    }
  },

  updateUIState(data) {
    const statusEl = document.getElementById('wa-status');
    const actionBtn = document.getElementById('btn-wa-action');
    const area = document.getElementById('wa-connection-area');
    const qrContainer = document.getElementById('wa-qr-container');
    const text = document.getElementById('wa-connection-text');

    if (!statusEl) return; // Page changed

    if (data.status === 'connected') {
      statusEl.textContent = 'Connected';
      statusEl.style.color = '#10b981';
      actionBtn.textContent = 'Disconnect';
      actionBtn.className = 'btn btn-sm btn-secondary';
      actionBtn.onclick = () => WhatsAppPage.logoutConnection();
      
      area.style.display = 'block';
      qrContainer.innerHTML = data.user && data.user.pic 
        ? `<img src="${data.user.pic}" style="width:100px;height:100px;border-radius:50%;margin-bottom:1rem;" />` 
        : `<div style="width:100px;height:100px;border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;"><i data-lucide="check-circle" style="color:white;width:40px;height:40px;"></i></div>`;
      
      text.innerHTML = `<h3 style="color:white;margin-bottom:0.25rem;">${data.user?.name || 'Device'}</h3><p style="color:var(--text-tertiary);">${data.user?.phone || 'Connected and ready'}</p>`;
      lucide.createIcons();

    } else if (data.status === 'connecting' || data.status === 'qr') {
      statusEl.textContent = data.status === 'qr' ? 'Awaiting QR Code' : 'Connecting...';
      statusEl.style.color = '#f59e0b';
      actionBtn.textContent = 'Disconnect';
      actionBtn.className = 'btn btn-sm btn-secondary';
      actionBtn.onclick = () => WhatsAppPage.logoutConnection();
      
      area.style.display = 'block';
      if (data.status === 'connecting') {
        qrContainer.innerHTML = `<i data-lucide="loader-2" style="width:40px;height:40px;animation:spin 1.5s linear infinite;color:var(--accent-primary);"></i>`;
        text.innerHTML = 'Initializing WhatsApp engine...';
        lucide.createIcons();
      } else if (data.qr) {
        qrContainer.innerHTML = `<img src="${data.qr}" style="width:220px;height:220px;border-radius:12px;border:4px solid white;" />`;
        text.innerHTML = "Open WhatsApp on your phone, go to <b>Linked Devices</b> and scan this QR Code.";
      }
    } else {
      statusEl.textContent = 'Disconnected';
      statusEl.style.color = 'var(--text-secondary)';
      actionBtn.textContent = 'Connect Device';
      actionBtn.className = 'btn btn-sm btn-primary';
      actionBtn.onclick = () => WhatsAppPage.startConnection();
      
      area.style.display = 'none';
      qrContainer.innerHTML = '';
    }
  },

  async startConnection() {
    try {
      this.updateUIState({ status: 'connecting' });
      await API.post('/whatsapp/start', {});
    } catch (err) {
      showToast('Error starting: ' + err.message, 'danger');
      this.checkStatus();
    }
  },

  async logoutConnection() {
    if (!confirm('Are you sure you want to disconnect this device?')) return;
    try {
      await API.post('/whatsapp/logout', {});
    } catch (err) {
      showToast('Error disconnecting: ' + err.message, 'danger');
    }
  },

  async loadData() {
    try {
      const [templates, messages] = await Promise.all([
        API.get('/templates'),
        API.get('/messages/history?limit=10')
      ]);

      document.getElementById('wa-template-count').textContent = templates.templates?.length || 0;
      document.getElementById('wa-sent-count').textContent = messages.messages?.length || 0;

      const list = document.getElementById('templates-list');
      if (templates.templates?.length) {
        list.innerHTML = templates.templates.map(t => `
          <div class="seller-item" style="cursor:pointer;" onclick="WhatsAppPage.viewTemplate('${escapeHtml(t.id)}', '${escapeHtml(t.name)}', \`${t.content.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)">
            <div class="seller-info"><span class="seller-name">${escapeHtml(t.name)}</span><span class="seller-stats">${escapeHtml(t.category)} · ${escapeHtml(t.content.substring(0, 60))}...</span></div>
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();WhatsAppPage.deleteTemplate('${escapeHtml(t.id)}')"><i data-lucide="trash-2"></i></button>
          </div>
        `).join('');
      } else {
        list.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:2rem;">No templates created</p>';
      }

      const hist = document.getElementById('messages-history');
      if (messages.messages?.length) {
        hist.innerHTML = messages.messages.map(m => `
          <div class="seller-item">
            <div class="seller-info"><span class="seller-name">${escapeHtml(m.lead_name || m.client_name || 'N/A')}</span><span class="seller-stats">${escapeHtml(m.channel)} · ${escapeHtml(m.content.substring(0, 50))}...</span></div>
            <span class="badge badge-primary">${escapeHtml(m.status)}</span>
          </div>
        `).join('');
      } else {
        hist.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:2rem;">No messages sent</p>';
      }
      lucide.createIcons();
    } catch (err) { console.error(err); }
  },

  openTemplateModal() {
    Modal.open(
      '<i data-lucide="file-text" style="color:var(--accent-primary);"></i> New Template',
      `<div class="form-group" style="margin-bottom:1rem;"><label>Name *</label><input type="text" id="tpl-name" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
      <div class="form-group" style="margin-bottom:1rem;"><label>Category</label><select id="tpl-category" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;"><option value="followup">Follow-up</option><option value="proposal">Proposal</option><option value="closing">Closing</option><option value="custom">Custom</option></select></div>
      <div class="form-group"><label>Content * (use {nome}, {empresa} for variables)</label><textarea id="tpl-content" rows="5" style="width:100%;background:rgba(255,255,255,0.02);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);padding:0.7rem;color:white;font-family:var(--font-body);" placeholder="Hello {nome}, how are you?"></textarea></div>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
       <button class="btn btn-primary" onclick="WhatsAppPage.saveTemplate()"><i data-lucide="save"></i>Save</button>`
    );
  },

  async saveTemplate() {
    const name = document.getElementById('tpl-name').value.trim();
    const content = document.getElementById('tpl-content').value.trim();
    const category = document.getElementById('tpl-category').value;
    if (!name || !content) return showToast('Name and content are required', 'warning');
    try {
      await API.post('/templates', { name, content, category });
      showToast('Template created!', 'success');
      Modal.close();
      await this.loadData();
    } catch (err) { showToast('Error: ' + err.message, 'danger'); }
  },

  async deleteTemplate(id) {
    if (!confirm('Remove template?')) return;
    try {
      await API.del(`/templates/${id}`);
      showToast('Template removed', 'success');
      await this.loadData();
    } catch (err) { showToast('Error: ' + err.message, 'danger'); }
  },

  viewTemplate(id, name, content) {
    Modal.open(
      `${escapeHtml(name)}`,
      `<div style="background:rgba(255,255,255,0.02);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);padding:1rem;color:var(--text-secondary);white-space:pre-wrap;font-size:0.9rem;">${escapeHtml(content)}</div>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Close</button>
       <button class="btn btn-primary" onclick="navigator.clipboard.writeText(\`${content.replace(/`/g, '\\`')}\`);showToast('Copied!','success');Modal.close();"><i data-lucide="copy"></i>Copy</button>`
    );
  }
};
