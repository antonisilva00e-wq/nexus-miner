// WhatsApp Page
const WhatsAppPage = {
  async render() {
    document.getElementById('page-title').textContent = 'WhatsApp';
    document.getElementById('page-subtitle').textContent = 'Automação de mensagens e follow-ups';

    document.getElementById('page-whatsapp').innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-icon" style="background:linear-gradient(135deg,#25d366,#128c7e);"><i data-lucide="message-circle"></i></div><div class="kpi-info"><span class="kpi-value" id="wa-status">Desconectado</span><span class="kpi-label">Status WhatsApp</span></div></div>
        <div class="kpi-card"><div class="kpi-icon" style="background:linear-gradient(135deg,#818cf8,#6366f1);"><i data-lucide="send"></i></div><div class="kpi-info"><span class="kpi-value" id="wa-sent-count">0</span><span class="kpi-label">Mensagens Enviadas</span></div></div>
        <div class="kpi-card"><div class="kpi-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706);"><i data-lucide="file-text"></i></div><div class="kpi-info"><span class="kpi-value" id="wa-template-count">0</span><span class="kpi-label">Templates</span></div></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3><i data-lucide="message-circle"></i>Templates de Mensagem</h3>
            <button class="btn btn-sm btn-primary" onclick="WhatsAppPage.openTemplateModal()"><i data-lucide="plus"></i>Novo</button>
          </div>
          <div id="templates-list"></div>
        </div>
        <div class="card">
          <div class="card-header"><h3><i data-lucide="history"></i>Últimas Mensagens</h3></div>
          <div id="messages-history"></div>
        </div>
      </div>
    `;
    lucide.createIcons();
    await this.loadData();
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
        list.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:2rem;">Nenhum template criado</p>';
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
        hist.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:2rem;">Nenhuma mensagem enviada</p>';
      }
      lucide.createIcons();
    } catch (err) { console.error(err); }
  },

  openTemplateModal() {
    Modal.open(
      '<i data-lucide="file-text" style="color:var(--accent-primary);"></i> Novo Template',
      `<div class="form-group" style="margin-bottom:1rem;"><label>Nome *</label><input type="text" id="tpl-name" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
      <div class="form-group" style="margin-bottom:1rem;"><label>Categoria</label><select id="tpl-category" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;"><option value="followup">Follow-up</option><option value="proposal">Proposta</option><option value="closing">Fechamento</option><option value="custom">Personalizado</option></select></div>
      <div class="form-group"><label>Conteúdo * (use {nome}, {empresa} para variáveis)</label><textarea id="tpl-content" rows="5" style="width:100%;background:rgba(255,255,255,0.02);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);padding:0.7rem;color:white;font-family:var(--font-body);" placeholder="Olá {nome}, tudo bem?"></textarea></div>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
       <button class="btn btn-primary" onclick="WhatsAppPage.saveTemplate()"><i data-lucide="save"></i>Salvar</button>`
    );
  },

  async saveTemplate() {
    const name = document.getElementById('tpl-name').value.trim();
    const content = document.getElementById('tpl-content').value.trim();
    const category = document.getElementById('tpl-category').value;
    if (!name || !content) return showToast('Nome e conteúdo são obrigatórios', 'warning');
    try {
      await API.post('/templates', { name, content, category });
      showToast('Template criado!', 'success');
      Modal.close();
      await this.loadData();
    } catch (err) { showToast('Erro: ' + err.message, 'danger'); }
  },

  async deleteTemplate(id) {
    if (!confirm('Remover template?')) return;
    try {
      await API.del(`/templates/${id}`);
      showToast('Template removido', 'success');
      await this.loadData();
    } catch (err) { showToast('Erro: ' + err.message, 'danger'); }
  },

  viewTemplate(id, name, content) {
    Modal.open(
      `${escapeHtml(name)}`,
      `<div style="background:rgba(255,255,255,0.02);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);padding:1rem;color:var(--text-secondary);white-space:pre-wrap;font-size:0.9rem;">${escapeHtml(content)}</div>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Fechar</button>
       <button class="btn btn-primary" onclick="navigator.clipboard.writeText(\`${content.replace(/`/g, '\\`')}\`);showToast('Copiado!','success');Modal.close();"><i data-lucide="copy"></i>Copiar</button>`
    );
  }
};
