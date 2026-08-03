// Settings Page
const SettingsPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Settings';
    document.getElementById('page-subtitle').textContent = 'System settings';

    document.getElementById('page-settings').innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3><i data-lucide="key"></i>Google Places API</h3></div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">Configure your key for Google Maps search.</p>
          <div class="form-group" style="margin-bottom:1rem;">
            <label>API Key</label>
            <input type="password" id="settings-google-key" placeholder="AIzaSy..." style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);">
          </div>
          <div style="display:flex;gap:0.75rem;">
            <button class="btn btn-primary" onclick="SettingsPage.saveGoogleKey()">Save Key</button>
            <button class="btn btn-secondary" onclick="SettingsPage.clearGoogleKey()">Remove</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3><i data-lucide="bell"></i>Push Notifications</h3></div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">Receive alerts on mobile and PC even with the dashboard closed. Tap the bell to view history.</p>
          <div id="push-status" style="margin-bottom:1rem;padding:0.75rem;border-radius:var(--border-radius-sm);background:rgba(255,255,255,0.03);border:1px solid var(--border-color);">
            <span style="color:var(--text-secondary);font-size:0.85rem;">Checking status...</span>
          </div>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <button id="btn-push-notifications" class="btn btn-primary" onclick="Notifications.requestPermission()">
              <i data-lucide="bell"></i><span>Enable Notifications</span>
            </button>
            <button class="btn btn-secondary" onclick="SettingsPage.testPush()">
              <i data-lucide="send"></i><span>Test</span>
            </button>
            <button class="btn btn-secondary" onclick="NC.open()">
              <i data-lucide="inbox"></i><span>Notification Center</span>
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3><i data-lucide="shield"></i>Change Password</h3></div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">Update your access password.</p>
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label>Current Password</label>
            <input type="password" id="settings-current-pass" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);">
          </div>
          <div class="form-group" style="margin-bottom:1rem;">
            <label>New Password</label>
            <input type="password" id="settings-new-pass" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);">
          </div>
          <button class="btn btn-primary" onclick="SettingsPage.changePassword()">Update Password</button>
        </div>

        <div class="card">
          <div class="card-header"><h3><i data-lucide="key"></i>API Keys</h3>
            <button class="btn btn-sm btn-primary" onclick="SettingsPage.openApiKeyModal()"><i data-lucide="plus"></i>New Key</button>
          </div>
          <div id="apikeys-list"></div>
        </div>

        <div class="card" style="border-color:rgba(244,63,94,0.2);">
          <div class="card-header"><h3 style="color:var(--danger);"><i data-lucide="trash-2"></i>Danger Zone</h3></div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">Reset all system data. This action is irreversible.</p>
          <button class="btn btn-danger" onclick="SettingsPage.resetDatabase()"><i data-lucide="alert-triangle"></i>Reset Database</button>
        </div>

        <div class="card" style="grid-column:1/-1;">
          <div class="card-header"><h3><i data-lucide="message-square"></i>Sale Notification Message</h3></div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1.25rem;">Write the text that will appear in <strong>all</strong> sale notifications. Use <code style="background:rgba(99,102,241,0.15);padding:1px 6px;border-radius:4px;color:var(--accent-primary);">{valor}</code> to insert the value automatically.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
            <div>
              <label style="display:block;font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.5rem;">NOTIFICATION TEXT</label>
              <textarea id="notif-template-msg" rows="3" oninput="SettingsPage.previewNotification()" placeholder="Ex: Sale completed: {valor}" style="width:100%;padding:0.75rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);font-size:0.95rem;resize:vertical;"></textarea>
              <p style="font-size:0.75rem;color:var(--text-tertiary);margin-top:0.4rem;">Use {valor} wherever you want to display the sale value (ex: $297.00)</p>
            </div>
            <div>
              <label style="display:block;font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.5rem;">PREVIEW</label>
              <div style="background:rgba(255,255,255,0.06);border:1px solid var(--border-color);border-radius:10px;padding:1rem;min-height:90px;">
                <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.5rem;">
                  <img src="/assets/logo.png" style="width:22px;height:22px;border-radius:4px;object-fit:cover;">
                  <span style="font-weight:700;font-size:0.85rem;color:white;">Nexus Miner</span>
                  <span style="font-size:0.75rem;color:var(--text-tertiary);margin-left:auto;">now</span>
                </div>
                <p id="notif-preview-text" style="font-size:0.88rem;color:var(--text-secondary);margin:0;">Sale completed: $297.00</p>
              </div>
            </div>
          </div>
          <div style="margin-top:1.25rem;display:flex;align-items:center;gap:1rem;">
            <button class="btn btn-primary" onclick="SettingsPage.saveNotificationTemplate()">
              <i data-lucide="save"></i>Save Message
            </button>
            <button class="btn btn-secondary" onclick="SettingsPage.resetNotificationTemplate()">
              <i data-lucide="rotate-ccw"></i>Restore Default
            </button>
            <span id="notif-save-status" style="font-size:0.82rem;color:var(--success);display:none;">Saved successfully!</span>
          </div>
        </div>

      </div>
    `;
    lucide.createIcons();

    // Load saved API key
    const savedKey = localStorage.getItem('nexus_google_key') || '';
    document.getElementById('settings-google-key').value = savedKey;

    await this.loadApiKeys();
    await this.loadPushStatus();
    await this.loadNotificationTemplate();
  },

  saveGoogleKey() {
    const key = document.getElementById('settings-google-key').value.trim();
    if (!key) return showToast('Enter a valid key', 'warning');
    localStorage.setItem('nexus_google_key', key);
    showToast('Key saved!', 'success');
  },

  clearGoogleKey() {
    localStorage.removeItem('nexus_google_key');
    document.getElementById('settings-google-key').value = '';
    showToast('Key removed', 'info');
  },

  async changePassword() {
    const current = document.getElementById('settings-current-pass').value;
    const newPass = document.getElementById('settings-new-pass').value;
    if (!current || !newPass) return showToast('Fill in both fields', 'warning');
    if (newPass.length < 8) return showToast('New password must be at least 8 characters long', 'warning');
    if (!/[A-Z]/.test(newPass) || !/[0-9]/.test(newPass)) return showToast('Password must contain an uppercase letter and a number', 'warning');
    try {
      await API.put('/auth/password', { currentPassword: current, newPassword: newPass });
      showToast('Password updated!', 'success');
      document.getElementById('settings-current-pass').value = '';
      document.getElementById('settings-new-pass').value = '';
    } catch (err) { showToast('Error: ' + err.message, 'danger'); }
  },

  async loadPushStatus() {
    try {
      const status = await API.get('/push/status');
      const el = document.getElementById('push-status');
      if (el) {
        el.innerHTML = status.enabled
          ? `<span style="color:var(--success);">✓ Notifications active (${status.devices} device${status.devices > 1 ? 's' : ''})</span>`
          : `<span style="color:var(--text-secondary);">Notifications disabled</span>`;
      }
    } catch {}
    Notifications.updateButton();
  },

  async testPush() {
    try {
      const result = await API.post('/push/test');
      showToast(result.message || 'Test notification sent!', 'success');
      NC.add('sale', 'Sale Test', 'Tech Solutions Company — $4,500.00', '/#/financial');
      setTimeout(() => NC.add('commission', 'Example Commission', 'João Silva — $225.00 for referral', '/#/financial'), 1500);
      setTimeout(() => NC.add('lead', 'Example Lead', 'Startup Inova — Score: 92 (mining)', '/#/leads'), 3000);
    } catch (err) {
      showToast('Error: ' + (err.message || 'No registered devices'), 'danger');
    }
  },

  async loadApiKeys() {
    try {
      const data = await API.get('/apikeys');
      const list = document.getElementById('apikeys-list');
      if (data.apiKeys?.length) {
        list.innerHTML = data.apiKeys.map(k => `
          <div class="seller-item">
            <div class="seller-info"><span class="seller-name">${k.name}</span><span class="seller-stats">${k.permissions} · ${k.active ? 'Active' : 'Inactive'}</span></div>
            <button class="btn btn-sm btn-danger" onclick="SettingsPage.revokeApiKey('${k.id}')"><i data-lucide="trash-2"></i></button>
          </div>
        `).join('');
      } else {
        list.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:2rem;">No API Keys</p>';
      }
      lucide.createIcons();
    } catch (err) { console.error(err); }
  },

  openApiKeyModal() {
    Modal.open(
      '<i data-lucide="key" style="color:var(--accent-primary);"></i> New API Key',
      `<div class="form-group" style="margin-bottom:1rem;"><label>Name *</label><input type="text" id="apikey-name" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
      <div class="form-group"><label>Permissions</label><select id="apikey-perms" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;"><option value="read">Read</option><option value="write">Read + Write</option><option value="admin">Administrator</option></select></div>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
       <button class="btn btn-primary" onclick="SettingsPage.createApiKey()"><i data-lucide="plus"></i>Create</button>`
    );
  },

  async createApiKey() {
    const name = document.getElementById('apikey-name').value.trim();
    const permissions = document.getElementById('apikey-perms').value;
    if (!name) return showToast('Name is required', 'warning');
    try {
      const result = await API.post('/apikeys', { name, permissions });
      Modal.close();
      Modal.open(
        '<i data-lucide="key" style="color:var(--success);"></i> API Key Created!',
        `<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:var(--border-radius-sm);padding:1rem;margin-bottom:1rem;">
          <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.5rem;">YOUR KEY (save it!):</p>
          <code style="font-size:1rem;color:var(--success);word-break:break-all;">${result.key}</code>
        </div>
        <p style="font-size:0.8rem;color:var(--text-tertiary);">This key will not be shown again.</p>`,
        `<button class="btn btn-primary" onclick="navigator.clipboard.writeText('${result.key}');showToast('Copied!','success');Modal.close();"><i data-lucide="copy"></i>Copy</button>`
      );
      await this.loadApiKeys();
    } catch (err) { showToast('Error: ' + err.message, 'danger'); }
  },

  async revokeApiKey(id) {
    if (!confirm('Revoke this API Key?')) return;
    try {
      await API.del(`/apikeys/${id}`);
      showToast('API Key revoked', 'success');
      await this.loadApiKeys();
    } catch (err) { showToast('Error: ' + err.message, 'danger'); }
  },

  async resetDatabase() {
    if (!confirm('WARNING: This will delete ALL data. Are you sure?')) return;
    if (!confirm('Last chance! All leads, clients, and settings will be lost.')) return;
    try {
      const res = await API.post('/settings/reset-database', { confirm: 'RESETAR_BANCO' });
      showToast(res.message || 'Database reset!', 'success');
      setTimeout(() => location.reload(), 2000);
    } catch (err) { showToast('Error: ' + err.message, 'danger'); }
  },

  async loadNotificationTemplate() {
    try {
      const data = await API.get('/settings');
      const msg = data.settings?.notification_sale_message || 'Sale completed: {valor}';
      const el = document.getElementById('notif-template-msg');
      if (el) { el.value = msg; this.previewNotification(); }
    } catch {}
  },

  previewNotification() {
    const msg = document.getElementById('notif-template-msg')?.value || '';
    const preview = msg.replace('{valor}', '$297.00') || 'Sale completed: $297.00';
    const el = document.getElementById('notif-preview-text');
    if (el) el.textContent = preview;
  },

  async saveNotificationTemplate() {
    const msg = document.getElementById('notif-template-msg')?.value?.trim();
    if (!msg) return showToast('Write a message', 'warning');
    try {
      await API.put('/settings', { settings: { notification_sale_message: msg } });
      const status = document.getElementById('notif-save-status');
      if (status) { status.style.display = 'inline'; setTimeout(() => status.style.display = 'none', 3000); }
      showToast('Message saved! Next sales will use this text.', 'success');
    } catch (err) { showToast('Error: ' + err.message, 'danger'); }
  },

  async resetNotificationTemplate() {
    document.getElementById('notif-template-msg').value = 'Sale completed: {valor}';
    this.previewNotification();
    await this.saveNotificationTemplate();
  }
};
