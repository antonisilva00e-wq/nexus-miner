const SitesProspectingPage = {
  allLeads: [],

  async render() {
    document.getElementById('page-title').textContent = 'Website Prospecting';
    document.getElementById('page-subtitle').textContent = 'Find leads without a website and generate sales opportunities';

    document.getElementById('page-sites-prospecting').innerHTML = `
      <div class="mining-bar" style="margin-bottom: 20px; display: flex; gap: 10px; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); align-items: center;">
        <div style="font-weight: 600; color: #fff; margin-right: 10px;"><i data-lucide="radar" style="color: #8b5cf6; margin-right: 5px;"></i> New Radar:</div>
        <input type="text" id="prospect-keyword" placeholder="Ex: Dentist, Lawyer..." style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff;">
        <input type="text" id="prospect-city" placeholder="City and State (Ex: New York, NY)" style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff;">
        <button class="btn btn-primary" onclick="SitesProspectingPage.mineLeads()" id="btn-prospect-mine" style="background: #8b5cf6; border: none;">
          <i data-lucide="search"></i> Search the Web
        </button>
      </div>

      <div class="filters-bar" style="margin-bottom: 20px;">
        <div class="search-box" style="flex: 1;">
          <i data-lucide="filter"></i>
          <input type="text" id="site-prospect-search" placeholder="Filter by name or city in table below..." oninput="SitesProspectingPage.filter()">
        </div>
        <div style="display: flex; gap: 10px;">
          <select id="site-filter-status" onchange="SitesProspectingPage.filter()" style="padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff;">
            <option value="all">All Leads</option>
            <option value="-1">Unverified</option>
            <option value="0">No Website (❌)</option>
            <option value="1">With Website (✅)</option>
          </select>
          <button class="btn btn-primary" onclick="SitesProspectingPage.checkAllUnchecked()">
            <i data-lucide="refresh-cw"></i> Check Pending
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table" id="sites-prospect-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Website Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="sites-prospect-tbody">
            <tr><td colspan="4" style="text-align: center; padding: 20px;">Loading leads...</td></tr>
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
      document.getElementById('sites-prospect-tbody').innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ef4444;">Error loading leads: ${err.message}</td></tr>`;
    }
  },

  async mineLeads() {
    const keyword = document.getElementById('prospect-keyword').value;
    const city = document.getElementById('prospect-city').value;
    const btn = document.getElementById('btn-prospect-mine');

    if (!keyword || !city) {
      return showToast('Please fill in the niche and city.', 'error');
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader" class="fa-spin"></i> Searching...';
    btn.disabled = true;
    if (window.lucide) lucide.createIcons();

    try {
      showToast('Searching companies on Google Maps...', 'info');
      const res = await API.post('/leads/mine', { keyword, city, maxResults: 30 });
      showToast(`${res.saved} new companies found and saved!`, 'success');
      
      // Limpar campos
      document.getElementById('prospect-keyword').value = '';
      
      // Recarregar tabela
      await this.loadLeads();
      
      // Iniciar verificacao automatica dos novos
      setTimeout(() => this.checkAllUnchecked(), 1000);
      
    } catch (err) {
      showToast('Error searching companies: ' + err.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
      if (window.lucide) lucide.createIcons();
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
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: rgba(255,255,255,0.5);">No leads found with these filters.</td></tr>';
      return;
    }
    
    tbody.innerHTML = leads.map(l => {
      const hasWeb = l.has_website !== undefined ? l.has_website : -1;
      let statusBadge = '<span class="badge" style="background:#64748b;">Unverified</span>';
      
      if (hasWeb === 0) {
        statusBadge = '<span class="badge" style="background:#ef4444;">No Website</span>';
      } else if (hasWeb === 1) {
        if (l.website_status === 'bad') {
          statusBadge = '<span class="badge" style="background:#f59e0b;">Bad Website</span>';
        } else {
          statusBadge = '<span class="badge" style="background:#22c55e;">Has Website</span>';
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
              <button onclick="SitesProspectingPage.checkSite('${l.id}')" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px;" title="Check Website Now">
                <i data-lucide="refresh-cw" style="width:14px;height:14px;" id="icon-check-${l.id}"></i>
              </button>
            </div>
          </td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-sm btn-secondary" onclick="SitesProspectingPage.openAbordagem('${l.id}')">Contact</button>
              <button class="btn btn-sm" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; color: white;" onclick="SitesProspectingPage.openCriador('${l.name}', '${l.activity}')">Create Website</button>
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
      showToast('Website status updated!', 'success');
    } catch (err) {
      showToast('Error checking website', 'danger');
    }
  },

  async checkAllUnchecked() {
    const unchecked = this.allLeads.filter(l => (l.has_website === undefined || l.has_website === -1) && l.site);
    if (unchecked.length === 0) {
      showToast('No pending websites with registered URL to check.', 'info');
      return;
    }
    
    showToast(`Starting check of ${unchecked.length} websites...`, 'info');
    for (let i = 0; i < unchecked.length; i++) {
      await this.checkSite(unchecked[i].id);
    }
    showToast('Verification completed.', 'success');
  },
  
  openAbordagem(id) {
    const lead = this.allLeads.find(l => l.id === id);
    if (!lead || !lead.phone) {
      showToast('This lead does not have a registered phone number', 'warning');
      return;
    }
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hello, I found ${lead.name} online, but I noticed you don't have a website (or your website is down). Digital presence is essential nowadays, I would love to talk about how we can create an amazing website for you!`);
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
