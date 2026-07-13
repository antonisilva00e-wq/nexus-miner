// Automation Page - Scheduled Mining & Alerts
const AutomationPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Automacao';
    document.getElementById('page-subtitle').textContent = 'Mineracao agendada e alertas';
    const el = document.getElementById('page-automation');
    el.innerHTML = `
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#818cf8,#6366f1);display:flex;align-items:center;justify-content:center;"><i data-lucide="bot" style="color:white;width:20px;height:20px;"></i></div>
          <div><h3 style="color:white;font-size:1.1rem;">Novo Agendamento</h3><p style="color:var(--text-tertiary);font-size:0.8rem;">Configure mineracao automatica por cidade e atividade</p></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:1rem;align-items:end;">
          <div class="form-group">
            <label>Nome</label>
            <input type="text" id="auto-name" placeholder="Ex: Restaurantes SP" style="width:100%;padding:0.7rem 1rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:var(--text-primary);font-family:var(--font-body);">
          </div>
          <div class="form-group">
            <label>Atividade</label>
            <input type="text" id="auto-keyword" placeholder="Ex: Restaurante" required style="width:100%;padding:0.7rem 1rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:var(--text-primary);font-family:var(--font-body);">
          </div>
          <div class="form-group">
            <label>Cidade</label>
            <input type="text" id="auto-city" placeholder="Ex: Curitiba PR" required style="width:100%;padding:0.7rem 1rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:var(--text-primary);font-family:var(--font-body);">
          </div>
          <button class="btn btn-primary" onclick="AutomationPage.create()" style="height:42px;"><i data-lucide="plus"></i>Criar</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;">
          <div class="form-group">
            <label>Frequencia</label>
            <select id="auto-freq" style="width:100%;padding:0.7rem 1rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:var(--text-primary);font-family:var(--font-body);">
              <option value="daily">Diario</option>
              <option value="weekly" selected>Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>
          <div class="form-group">
            <label>Max Leads por Execucao</label>
            <input type="number" id="auto-max" value="100" min="10" max="500" style="width:100%;padding:0.7rem 1rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:var(--text-primary);font-family:var(--font-body);">
          </div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;"><i data-lucide="list" style="color:white;width:20px;height:20px;"></i></div>
          <div><h3 style="color:white;font-size:1.1rem;">Agendamentos Ativos</h3></div>
        </div>
        <div id="schedules-list"></div>
      </div>
    `;
    lucide.createIcons();
    this.loadSchedules();
  },

  async loadSchedules() {
    try {
      const data = await API.get('/automation/schedules');
      const el = document.getElementById('schedules-list');
      if (!data.schedules.length) {
        el.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1.5rem;">Nenhum agendamento criado</p>';
        return;
      }
      el.innerHTML = data.schedules.map(s => `
        <div style="display:flex;align-items:center;gap:1rem;padding:0.85rem;border-bottom:1px solid var(--border-color);">
          <div style="width:8px;height:8px;border-radius:50%;background:${s.active ? '#10b981' : '#6b7280'};flex-shrink:0;"></div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <span style="color:white;font-weight:600;font-size:0.9rem;">${s.name}</span>
              <span style="font-size:0.7rem;color:var(--text-tertiary);background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;">${s.frequency}</span>
            </div>
            <p style="font-size:0.78rem;color:var(--text-secondary);margin:2px 0 0;">${s.keyword} em ${s.city} · Max: ${s.maxResults} leads</p>
            <p style="font-size:0.7rem;color:var(--text-tertiary);margin:2px 0 0;">Ultima execucao: ${s.lastRun ? new Date(s.lastRun).toLocaleDateString('pt-BR') : 'Nunca'} · Proxima: ${new Date(s.nextRun).toLocaleDateString('pt-BR')}</p>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-sm btn-secondary" onclick="AutomationPage.toggle('${s.id}')" title="${s.active ? 'Pausar' : 'Ativar'}">
              <i data-lucide="${s.active ? 'pause' : 'play'}"></i>
            </button>
            <button class="btn btn-sm btn-primary" onclick="AutomationPage.runNow('${s.id}')" title="Executar agora">
              <i data-lucide="play"></i>
            </button>
            <button class="btn btn-sm btn-secondary" onclick="AutomationPage.remove('${s.id}')" title="Remover" style="color:var(--danger);">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `).join('');
      lucide.createIcons();
    } catch (err) {
      showToast('Erro ao carregar agendamentos: ' + err.message, 'danger');
    }
  },

  async create() {
    const name = document.getElementById('auto-name').value.trim();
    const keyword = document.getElementById('auto-keyword').value.trim();
    const city = document.getElementById('auto-city').value.trim();
    const frequency = document.getElementById('auto-freq').value;
    const maxResults = parseInt(document.getElementById('auto-max').value) || 100;

    if (!keyword || !city) { showToast('Preencha atividade e cidade', 'warning'); return; }

    try {
      await API.post('/automation/schedules', { name: name || `${keyword} ${city}`, keyword, city, frequency, maxResults });
      showToast('Agendamento criado!', 'success');
      this.loadSchedules();
    } catch (err) {
      showToast('Erro: ' + err.message, 'danger');
    }
  },

  async toggle(id) {
    try {
      await API.put(`/automation/schedules/${id}/toggle`);
      this.loadSchedules();
    } catch (err) {
      showToast('Erro: ' + err.message, 'danger');
    }
  },

  async runNow(id) {
    showToast('Executando mineracao...', 'info');
    try {
      const result = await API.post(`/automation/schedules/${id}/run`);
      showToast(`${result.leadsSaved} leads encontrados!`, 'success');
      this.loadSchedules();
    } catch (err) {
      showToast('Erro: ' + err.message, 'danger');
    }
  },

  async remove(id) {
    if (!confirm('Remover este agendamento?')) return;
    try {
      await API.del(`/automation/schedules/${id}`);
      showToast('Agendamento removido', 'success');
      this.loadSchedules();
    } catch (err) {
      showToast('Erro: ' + err.message, 'danger');
    }
  },
};
