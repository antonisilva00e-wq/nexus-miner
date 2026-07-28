const AutomationPage = {
  interval: null,

  async render() {
    const el = document.getElementById('page-automation');
    if (!el) return;
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    if (titleEl) titleEl.textContent = 'Automacao';
    if (subtitleEl) subtitleEl.textContent = 'Campanha de ligacoes automaticas via Vapi';

    el.innerHTML = `
      <div class="card" style="max-width:700px;margin:0 auto;">
        <div class="card-header"><h3><i data-lucide="bot"></i> Automacao de Ligacoes</h3></div>
        <div style="display:flex;flex-direction:column;gap:1rem;padding:1rem 0;">
          <div class="form-group">
            <label>Chave Privada Vapi</label>
            <input type="password" id="automation-private-key" placeholder="sk-..." style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:white;font-family:var(--font-body);">
          </div>
          <div class="form-group">
            <label>Phone Number ID</label>
            <input type="text" id="automation-phone-id" placeholder="ID do numero no Vapi" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:white;font-family:var(--font-body);">
          </div>
          <div class="form-group">
            <label>Agent ID</label>
            <input type="text" id="automation-agent-id" placeholder="ID do agente no Vapi" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:white;font-family:var(--font-body);">
          </div>
          <div class="form-group">
            <label>Lista de Telefones (um por linha)</label>
            <textarea id="automation-phone-list" rows="6" placeholder="+5511999999999" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:white;font-family:var(--font-body);resize:vertical;"></textarea>
          </div>
          <div style="display:flex;gap:1rem;">
            <button id="btn-start-automation" class="btn btn-primary" onclick="AutomationPage.start()">
              <i data-lucide="play"></i> Iniciar Campanha
            </button>
            <button id="btn-stop-automation" class="btn btn-danger" onclick="AutomationPage.stop()" style="display:none;">
              <i data-lucide="square"></i> Parar Campanha
            </button>
          </div>
        </div>
        <div class="card-header" style="margin-top:1rem;"><h3><i data-lucide="list"></i> Status da Fila</h3></div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            <th style="text-align:left;padding:0.5rem;color:var(--text-secondary);font-size:0.8rem;">TELEFONE</th>
            <th style="text-align:left;padding:0.5rem;color:var(--text-secondary);font-size:0.8rem;">STATUS</th>
          </tr></thead>
          <tbody id="automation-table-body">
            <tr><td colspan="2" style="padding:1rem;text-align:center;color:var(--text-tertiary);">Nenhuma campanha em andamento.</td></tr>
          </tbody>
        </table>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    this.loadSettings();
    this.fetchStatus();
  },

  loadSettings() {
    const pk = document.getElementById('automation-private-key');
    const ph = document.getElementById('automation-phone-id');
    const ag = document.getElementById('automation-agent-id');
    if (pk) pk.value = localStorage.getItem('automation_private_key') || '';
    if (ph) ph.value = localStorage.getItem('automation_phone_id') || '';
    if (ag) ag.value = localStorage.getItem('automation_agent_id') || '';
  },

  saveSettings() {
    const pk = document.getElementById('automation-private-key')?.value;
    const ph = document.getElementById('automation-phone-id')?.value;
    const ag = document.getElementById('automation-agent-id')?.value;
    if (pk) localStorage.setItem('automation_private_key', pk);
    if (ph) localStorage.setItem('automation_phone_id', ph);
    if (ag) localStorage.setItem('automation_agent_id', ag);
  },

  async start() {
    const privateKey = document.getElementById('automation-private-key')?.value?.trim();
    const phoneId = document.getElementById('automation-phone-id')?.value?.trim();
    const agentId = document.getElementById('automation-agent-id')?.value?.trim();
    const listRaw = document.getElementById('automation-phone-list')?.value?.trim();

    if (!privateKey || !phoneId || !agentId || !listRaw) {
      return showToast('Preencha todos os campos obrigatorios!', 'danger');
    }

    const phones = listRaw.split('\n').map(p => p.trim().replace(/\s+/g, '')).filter(p => p.length > 8);
    if (phones.length === 0) return showToast('Nenhum numero valido encontrado.', 'danger');

    this.saveSettings();
    try {
      const response = await fetch('/api/vapi/outbound/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey, phoneNumberId: phoneId, agentId, phones })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao iniciar campanha');
      showToast('Campanha iniciada!', 'success');
      const startBtn = document.getElementById('btn-start-automation');
      const stopBtn = document.getElementById('btn-stop-automation');
      if (startBtn) startBtn.style.display = 'none';
      if (stopBtn) stopBtn.style.display = 'flex';
      this.pollStatus();
    } catch (err) { showToast(err.message, 'danger'); }
  },

  async stop() {
    try {
      await fetch('/api/vapi/outbound/stop', { method: 'POST' });
      showToast('Campanha interrompida.', 'info');
      const startBtn = document.getElementById('btn-start-automation');
      const stopBtn = document.getElementById('btn-stop-automation');
      if (startBtn) startBtn.style.display = 'flex';
      if (stopBtn) stopBtn.style.display = 'none';
      if (this.interval) { clearInterval(this.interval); this.interval = null; }
      this.fetchStatus();
    } catch (err) { showToast('Erro ao parar campanha', 'danger'); }
  },

  pollStatus() {
    if (this.interval) clearInterval(this.interval);
    this.fetchStatus();
    this.interval = setInterval(() => this.fetchStatus(), 3000);
  },

  async fetchStatus() {
    try {
      const response = await fetch('/api/vapi/outbound/status');
      const data = await response.json();
      const startBtn = document.getElementById('btn-start-automation');
      const stopBtn = document.getElementById('btn-stop-automation');
      if (startBtn && stopBtn) {
        if (data.active) {
          startBtn.style.display = 'none';
          stopBtn.style.display = 'flex';
        } else {
          startBtn.style.display = 'flex';
          stopBtn.style.display = 'none';
          if (this.interval) { clearInterval(this.interval); this.interval = null; }
        }
      }
      const tbody = document.getElementById('automation-table-body');
      if (!tbody) return;
      if (!data.queue || data.queue.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="padding:1rem;text-align:center;color:var(--text-tertiary);">Nenhuma campanha em andamento.</td></tr>';
        return;
      }
      const labels = { queued: 'Na fila', calling: 'Chamando...', completed: 'Concluido', failed: 'Falhou' };
      tbody.innerHTML = data.queue.map(item =>
        `<tr><td style="padding:0.5rem;">${item.phone}</td><td style="padding:0.5rem;">${labels[item.status] || item.status}</td></tr>`
      ).join('');
    } catch (_) {}
  }
};
