const SitesProspectingPage = {
  allLeads: [],

  async render() {
    document.getElementById('page-title').textContent = 'Prospecção de Sites';
    document.getElementById('page-subtitle').textContent = 'Encontre leads sem site e gere oportunidades de venda';

    document.getElementById('page-sites-prospecting').innerHTML = `
      <div class="filters-bar" style="margin-bottom: 20px;">
        <div class="search-box" style="flex: 1;">
          <i data-lucide="search"></i>
          <input type="text" id="site-prospect-search" placeholder="Buscar por nome ou cidade..." oninput="SitesProspectingPage.filter()">
        </div>
        <div style="display: flex; gap: 10px;">
          <select id="site-filter-status" onchange="SitesProspectingPage.filter()" style="padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff;">
            <option value="all">Todos os Leads</option>
            <option value="-1">Não Verificado</option>
            <option value="0">Sem Site (🔴)</option>
            <option value="1">Com Site (🟢)</option>
          </select>
          <button class="btn btn-primary" onclick="SitesProspectingPage.checkAllUnchecked()">
            <i data-lucide="refresh-cw"></i> Verificar Pendentes
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table" id="sites-prospect-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Contato</th>
              <th>Status do Site</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="sites-prospect-tbody">
            <tr><td colspan="4" style="text-align: center; padding: 20px;">Carregando leads...</td></tr>
          </tbody>
        </table>
      </div>
    `;
    
    lucide.createIcons();
    await this.loadLeads();
  },

  async loadLeads() {
    try {
      const data = await API.get('/leads');
      this.allLeads = data.leads || [];
      this.filter();
    } catch (err) {
      document.getElementById('sites-prospect-tbody').innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ef4444;">Erro ao carregar leads: ${err.message}</td></tr>`;
    }
  },

  filter() {
    const term = document.getElementById('site-prospect-search').value.toLowerCase();
    const status = document.getElementById('site-filter-status').value;
    
    const filtered = this.allLeads.filter(l => {
      const matchTerm = l.name?.toLowerCase().includes(term) || l.city?.toLowerCase().includes(term);
      let matchStatus = true;
      if (status !== 'all') {
        const hasWeb = l.has_website !== undefined ? l.has_website : -1;
        matchStatus = hasWeb.toString() === status;
      }
      return matchTerm && matchStatus;
    });
    
    this.renderTable(filtered);
  },

  renderTable(leads) {
    const tbody = document.getElementById('sites-prospect-tbody');
    if (leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: rgba(255,255,255,0.5);">Nenhum lead encontrado com esses filtros.</td></tr>';
      return;
    }
    
    tbody.innerHTML = leads.map(l => {
      const hasWeb = l.has_website !== undefined ? l.has_website : -1;
      let statusBadge = '<span class="badge" style="background:#64748b;">Não Verificado</span>';
      
      if (hasWeb === 0) {
        statusBadge = '<span class="badge" style="background:#ef4444;">Sem Site</span>';
      } else if (hasWeb === 1) {
        if (l.website_status === 'bad') {
          statusBadge = '<span class="badge" style="background:#f59e0b;">Site Ruim</span>';
        } else {
          statusBadge = '<span class="badge" style="background:#22c55e;">Com Site</span>';
        }
      }
      
      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: #fff;">${escapeHtml(l.name)}</div>
            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.5);">${escapeHtml(l.activity || '-')} | ${escapeHtml(l.city || '')}</div>
          </td>
          <td>
            ${l.phone ? `<div><i data-lucide="phone" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> ${escapeHtml(l.phone)}</div>` : ''}
            ${l.site ? `<div style="font-size: 0.8rem; margin-top: 4px;"><a href="${l.site.startsWith('http') ? l.site : 'http://'+l.site}" target="_blank" style="color: #60a5fa;">${escapeHtml(l.site)}</a></div>` : ''}
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${statusBadge}
              <button onclick="SitesProspectingPage.checkSite('${l.id}')" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px;" title="Verificar Site Agora">
                <i data-lucide="refresh-cw" style="width:14px;height:14px;" id="icon-check-${l.id}"></i>
              </button>
            </div>
          </td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-sm btn-secondary" onclick="SitesProspectingPage.openAbordagem('${l.id}')">Abordar</button>
              <button class="btn btn-sm" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; color: white;" onclick="SitesProspectingPage.openCriador('${l.name}', '${l.activity}')">Criar Site</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    lucide.createIcons();
  },

  async checkSite(id) {
    const icon = document.getElementById(`icon-check-${id}`);
    if (icon) icon.classList.add('spin-animation');
    
    try {
      const res = await API.post(`/leads/${id}/check-website`);
      const lead = this.allLeads.find(l => l.id === id);
      if (lead) {
        lead.has_website = res.has_website;
        lead.website_status = res.status;
      }
      this.filter();
      showToast('Status do site atualizado!', 'success');
    } catch (err) {
      showToast('Erro ao verificar site', 'danger');
    }
  },

  async checkAllUnchecked() {
    const unchecked = this.allLeads.filter(l => (l.has_website === undefined || l.has_website === -1) && l.site);
    if (unchecked.length === 0) {
      showToast('Não há sites pendentes com URL cadastrada para verificar.', 'info');
      return;
    }
    
    showToast(`Iniciando verificação de ${unchecked.length} sites...`, 'info');
    for (let i = 0; i < unchecked.length; i++) {
      await this.checkSite(unchecked[i].id);
    }
    showToast('Verificação concluída.', 'success');
  },
  
  openAbordagem(id) {
    const lead = this.allLeads.find(l => l.id === id);
    if (!lead || !lead.phone) {
      showToast('Este lead não tem telefone cadastrado', 'warning');
      return;
    }
    const cleanPhone = lead.phone.replace(/\\D/g, '');
    const msg = encodeURIComponent(`Olá, encontrei a ${lead.name} na internet, porém vi que vocês não possuem um site (ou o site está fora do ar). O digital é essencial hoje em dia, gostaria de conversar sobre como podemos criar um site incrível para vocês?`);
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
  },
  
  openCriador(name, segment) {
    App.navigateTo('sites');
    setTimeout(() => {
      document.getElementById('site-name').value = name;
      document.getElementById('site-segment').value = segment || '';
      document.getElementById('site-prompt').focus();
    }, 100);
  }
};

window.SitesProspectingPage = SitesProspectingPage;
