// Kanban Page - Enhanced
const KanbanPage = {
  draggedLead: null,

  async render() {
    document.getElementById('page-title').textContent = 'Pipeline Kanban';
    document.getElementById('page-subtitle').textContent = 'Arraste os leads entre estagios';

    document.getElementById('page-kanban').innerHTML = `
      <div class="kanban-board" id="kanban-board">
        ${Array(5).fill(`
          <div class="kanban-column">
            <div class="kanban-column-header">
              <div class="skeleton" style="width:120px;height:16px;border-radius:4px;"></div>
              <div class="skeleton" style="width:24px;height:24px;border-radius:12px;"></div>
            </div>
            <div class="kanban-column-body">
              ${Array(3).fill('<div class="skeleton" style="height:100px;border-radius:12px;margin-bottom:0.75rem;"></div>').join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    await this.loadPipeline();
  },

  async loadPipeline() {
    try {
      const data = await API.get('/pipeline');
      const board = document.getElementById('kanban-board');
      const stageLabels = { leads: 'Novos Leads', contato: 'Em Contato', proposta: 'Proposta', fechado: 'Fechados', perdido: 'Perdidos' };
      const stageColors = { leads: '#818cf8', contato: '#22d3ee', proposta: '#f59e0b', fechado: '#10b981', perdido: '#f43f5e' };

      board.innerHTML = data.stages.map(s => `
        <div class="kanban-column kanban-col-${s.stage}" data-stage="${s.stage}">
          <div class="kanban-column-header">
            <div class="kanban-column-title" style="color:${stageColors[s.stage]};">
              <span style="width:8px;height:8px;border-radius:50%;background:${stageColors[s.stage]};display:inline-block;"></span>
              ${stageLabels[s.stage] || s.stage}
            </div>
            <span class="kanban-column-count" style="background:${stageColors[s.stage]}22;color:${stageColors[s.stage]};border:1px solid ${stageColors[s.stage]}33;">${s.count}</span>
          </div>
          <div class="kanban-column-body" data-stage="${s.stage}"
            ondragover="KanbanPage.onDragOver(event)" ondragleave="KanbanPage.onDragLeave(event)" ondrop="KanbanPage.onDrop(event)">
            ${s.leads.length ? s.leads.map(l => this.renderCard(l, stageColors[s.stage])).join('') : `
              <div style="text-align:center;padding:2rem 1rem;color:var(--text-tertiary);font-size:0.82rem;">
                <i data-lucide="inbox" style="width:32px;height:32px;margin:0 auto 0.5rem;display:block;opacity:0.3;"></i>
                Nenhum lead
              </div>
            `}
          </div>
        </div>
      `).join('');
      lucide.createIcons();
    } catch (err) {
      document.getElementById('kanban-board').innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-triangle"></i>
          <p>Erro ao carregar pipeline</p>
          <span class="text-secondary text-sm">${err.message}</span>
          <button class="btn btn-primary" style="margin-top:1rem;" onclick="KanbanPage.render()">
            <i data-lucide="refresh-cw"></i> Tentar Novamente
          </button>
        </div>
      `;
      lucide.createIcons();
    }
  },

  renderCard(l, stageColor) {
    const days = Math.floor((Date.now() - new Date(l.created_at)) / 86400000);
    const urgency = days > 7 ? 'var(--danger)' : days > 3 ? 'var(--attention)' : 'var(--text-tertiary)';
    return `
      <div class="kanban-card" draggable="true" data-lead-id="${l.id}"
        ondragstart="KanbanPage.onDragStart(event, '${l.id}')"
        ondragend="KanbanPage.onDragEnd(event)">
        <div class="kanban-card-name">${l.name}</div>
        <div class="kanban-card-company">${l.activity || ''} ${l.city ? '· ' + l.city : ''}</div>
        ${l.phone ? `<div class="kanban-card-phone"><i data-lucide="phone" style="width:12px;height:12px;"></i>${l.phone}</div>` : ''}
        <div class="kanban-card-footer">
          <span class="kanban-card-date" style="color:${urgency};">${days === 0 ? 'Hoje' : `${days}d atras`}</span>
          ${l.assigned_name ? `<span class="kanban-card-assignee">${l.assigned_name}</span>` : ''}
        </div>
      </div>
    `;
  },

  onDragStart(e, leadId) {
    this.draggedLead = leadId;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
  },

  onDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.kanban-column-body').forEach(el => el.classList.remove('drag-over'));
  },

  onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  },

  onDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  },

  async onDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const toStage = e.currentTarget.dataset.stage;
    if (!this.draggedLead || !toStage) return;

    try {
      await API.put(`/pipeline/${this.draggedLead}/mover`, { to_stage: toStage });
      showToast('Lead movido com sucesso!', 'success');
      await this.loadPipeline();
    } catch (err) {
      showToast('Erro ao mover lead: ' + err.message, 'danger');
    }
  }
};
