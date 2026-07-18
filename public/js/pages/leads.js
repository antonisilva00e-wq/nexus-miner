// Leads Page - Power Mining Engine
const LeadsPage = {
  currentLeads: [],

  async render() {
    document.getElementById('page-title').textContent = 'Minerar Leads';
    document.getElementById('page-subtitle').textContent = 'Motor de mineração com APIs reais da Receita Federal e OpenStreetMap';

    document.getElementById('page-leads').innerHTML = `
      <div class="service-card">
        <div class="service-card-grid"></div>
        <div class="service-card-header">
          <div class="service-card-icon icon-green"><i data-lucide="zap"></i></div>
          <div class="service-card-info">
            <h3 class="service-card-title">Motor de Mineração Power</h3>
            <p class="service-card-subtitle">BrasilAPI (Receita Federal) + OpenStreetMap Nominatim + ViaCEP</p>
          </div>
          <span class="service-card-badge badge-live">API Real</span>
        </div>
        <div class="service-card-body">
          <form id="mine-form" onsubmit="LeadsPage.mine(event)">
            <div style="display:grid;grid-template-columns:1.5fr 1fr auto;gap:1rem;align-items:end;">
              <div class="form-group">
                <label>Tipo de Empresa</label>
                <input type="text" id="mine-keyword" placeholder="Ex: Restaurante, Clinica, Imobiliaria, Padaria..." required>
              </div>
              <div class="form-group">
                <label>Cidade / Estado</label>
                <input type="text" id="mine-city" placeholder="Ex: Curitiba PR, Sao Paulo SP..." required>
              </div>
              <button type="submit" class="btn btn-primary" id="btn-mine"><i data-lucide="radar"></i>Minerar</button>
            </div>
          </form>
        </div>
      </div>

      <div class="service-card">
        <div class="service-card-grid"></div>
        <div class="service-card-header">
          <div class="service-card-icon icon-pink"><i data-lucide="users"></i></div>
          <div class="service-card-info">
            <h3 class="service-card-title">Minerar Pessoas Fisicas</h3>
            <p class="service-card-subtitle">Gere contatos de profissionais, prestadores e comerciantes por cidade</p>
          </div>
          <span class="service-card-badge badge-ai">IA</span>
        </div>
        <div class="service-card-body">
          <div id="pf-category-tabs" class="pf-tabs">
            <button class="pf-tab active" onclick="LeadsPage.setPFCategory('profissionais')" id="pf-tab-profissionais"><i data-lucide="briefcase"></i>Profissionais</button>
            <button class="pf-tab" onclick="LeadsPage.setPFCategory('prestadores')" id="pf-tab-prestadores"><i data-lucide="wrench"></i>Prestadores</button>
            <button class="pf-tab" onclick="LeadsPage.setPFCategory('comerciantes')" id="pf-tab-comerciantes"><i data-lucide="store"></i>Comerciantes</button>
            <button class="pf-tab" onclick="LeadsPage.setPFCategory('todos')" id="pf-tab-todos"><i data-lucide="layers"></i>Todos</button>
          </div>
          <form id="pf-mine-form" onsubmit="LeadsPage.mineIndividuals(event)">
            <div style="display:grid;grid-template-columns:1.5fr auto auto;gap:1rem;align-items:end;">
              <div class="form-group">
                <label>Cidade / Estado</label>
                <input type="text" id="pf-mine-city" placeholder="Ex: Curitiba PR, Sao Paulo SP..." required>
              </div>
              <div class="form-group">
                <label>Quantidade</label>
                <select id="pf-mine-count">
                  <option value="20">20</option>
                  <option value="50" selected>50</option>
                  <option value="100">100</option>
                  <option value="150">150</option>
                  <option value="200">200</option>
                </select>
              </div>
              <button type="submit" class="btn btn-pink" id="btn-pf-mine"><i data-lucide="user-plus"></i>Minerar PF</button>
            </div>
          </form>
          <div id="pf-mine-status" style="margin-top:0.75rem;"></div>
        </div>
      </div>

      <div class="service-card">
        <div class="service-card-grid"></div>
        <div class="service-card-header">
          <div class="service-card-icon icon-purple"><i data-lucide="file-search"></i></div>
          <div class="service-card-info">
            <h3 class="service-card-title">Consulta CNPJ Real</h3>
            <p class="service-card-subtitle">Dados direto da Receita Federal via BrasilAPI</p>
          </div>
          <span class="service-card-badge badge-federal">Receita Federal</span>
        </div>
        <div class="service-card-body">
          <div style="display:flex;gap:1rem;align-items:end;">
            <div class="form-group" style="flex:1;">
              <label>CNPJ</label>
              <input type="text" id="cnpj-lookup" placeholder="00.000.000/0000-00">
            </div>
            <button class="btn btn-secondary" onclick="LeadsPage.lookupCNPJ()"><i data-lucide="search"></i>Consultar</button>
          </div>
          <div id="cnpj-result" style="margin-top:1rem;"></div>
        </div>
      </div>

      <div class="service-card">
        <div class="service-card-grid"></div>
        <div class="service-card-header">
          <div class="service-card-icon icon-cyan"><i data-lucide="shield-check"></i></div>
          <div class="service-card-info">
            <h3 class="service-card-title">Validador de CPF</h3>
            <p class="service-card-subtitle">Validacao matematica completa + estimativa de dados pessoais</p>
          </div>
          <span class="service-card-badge badge-free">Gratuito</span>
        </div>
        <div class="service-card-body">
          <div style="display:flex;gap:1rem;align-items:end;">
            <div class="form-group" style="flex:1;">
              <label>CPF</label>
              <input type="text" id="cpf-lookup" placeholder="000.000.000-00" maxlength="14" oninput="LeadsPage.maskCPF(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();LeadsPage.lookupCPF()}" style="font-size:0.95rem;letter-spacing:0.5px;">
            </div>
            <button class="btn btn-secondary" onclick="LeadsPage.lookupCPF()" id="btn-cpf-lookup"><i data-lucide="search"></i>Consultar</button>
          </div>
          <div id="cpf-result" style="margin-top:1rem;"></div>
        </div>
      </div>

      <div class="service-card">
        <div class="service-card-grid"></div>
        <div class="service-card-header">
          <div class="service-card-icon icon-green"><i data-lucide="users"></i></div>
          <div class="service-card-info">
            <h3 class="service-card-title">Pessoas Reais via CNPJ</h3>
            <p class="service-card-subtitle">Consulte CNPJs e extraia socios reais da Receita Federal</p>
          </div>
          <span class="service-card-badge badge-federal">Receita Federal</span>
        </div>
        <div class="service-card-body">
          <div style="margin-bottom:0.75rem;">
            <label style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px;display:block;">Cole os CNPJs (um por linha ou separados por virgula):</label>
            <textarea id="cnpj-batch" rows="4" placeholder="00.000.000/0000-00&#10;11.111.111/0001-11&#10;22.222.222/0001-22" style="font-family:monospace;font-size:0.85rem;"></textarea>
          </div>
          <div style="display:flex;gap:0.75rem;align-items:center;">
            <button class="btn btn-primary" onclick="LeadsPage.minePeople()" id="btn-mine-people">
              <i data-lucide="radar"></i>Extrair Pessoas Reais
            </button>
            <span id="mine-people-count" style="color:var(--text-secondary);font-size:0.82rem;"></span>
          </div>
          <div id="people-results" style="margin-top:1rem;"></div>
        </div>
      </div>

      <div class="service-card">
        <div class="service-card-grid"></div>
        <div class="service-card-header">
          <div class="service-card-icon icon-amber"><i data-lucide="database"></i></div>
          <div class="service-card-info">
            <h3 class="service-card-title">Base RF - Dados Abertos</h3>
            <p class="service-card-subtitle">Busca por cidade + atividade nos dados da Receita Federal</p>
          </div>
          <div id="rf-status"></div>
          <span class="service-card-badge badge-federal">Dados Abertos</span>
        </div>
        <div class="service-card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:1rem;align-items:end;">
            <div class="form-group">
              <label>Cidade</label>
              <input type="text" id="rf-city" placeholder="Ex: Curitiba, Sao Paulo...">
            </div>
            <div class="form-group">
              <label>CNAE (opcional)</label>
              <input type="text" id="rf-cnae" placeholder="Ex: 5611-2 (restaurantes)">
            </div>
            <button class="btn btn-primary" onclick="LeadsPage.searchRF()" id="btn-rf-search">
              <i data-lucide="search"></i>Buscar
            </button>
          </div>
          <div id="rf-results" style="margin-top:1rem;"></div>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-box">
          <i data-lucide="search"></i>
          <input type="text" placeholder="Filtrar leads encontrados..." oninput="LeadsPage.filterLocal(this.value)">
        </div>
        <div class="filters-actions">
          <span id="mine-count" style="color:var(--text-secondary);font-size:0.85rem;"></span>
          <button class="btn btn-sm btn-secondary" onclick="LeadsPage.exportCSV()" title="Exportar leads encontrados"><i data-lucide="download"></i>CSV</button>
          <button class="btn btn-sm btn-secondary" onclick="LeadsPage.exportSocios()" title="Exportar socios reais"><i data-lucide="users"></i>Socios</button>
          <button class="btn btn-sm btn-primary" onclick="LeadsPage.saveAll()"><i data-lucide="save"></i>Salvar Todos</button>
          <button class="btn btn-sm" id="btn-script-ligacao" onclick="LeadsPage.showScripts()" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:6px 12px;border-radius:var(--border-radius-sm);font-size:0.8rem;font-weight:600;cursor:pointer;border:none;"><i data-lucide="phone"></i>Script Ligacao</button>
        </div>
      </div>

      <div id="leads-results" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1rem;"></div>
      <div class="empty-state" id="leads-empty">
        <i data-lucide="radar" style="width:60px;height:60px;color:var(--accent-primary);animation:pulseRadar 2s infinite;"></i>
        <h3 style="color:white;margin-top:1rem;">Pronto para minerar</h3>
        <p style="color:var(--text-tertiary);">Digite o tipo de empresa e cidade para buscar dados reais</p>
      </div>
    `;
    lucide.createIcons();
    this.currentLeads = [];
    this.checkRFStatus();
  },

  async mine(e) {
    e.preventDefault();
    const keyword = document.getElementById('mine-keyword').value.trim();
    const city = document.getElementById('mine-city').value.trim();
    if (!keyword || !city) return;

    // Store keyword for scripts
    this.currentKeyword = keyword;

    const btn = document.getElementById('btn-mine');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin-animation"></i>Minerando...';
    lucide.createIcons();

    try {
      const data = await API.post('/leads/mine', { keyword, city, maxResults: 500 });
      this.currentLeads = data.leads || [];
      this.renderResults(this.currentLeads);
      document.getElementById('mine-count').textContent = `${this.currentLeads.length} leads encontrados | Fontes: ${(data.sources || []).join(', ')}`;
      showToast(`${this.currentLeads.length} leads minerados com sucesso!`, 'success');
    } catch (err) {
      showToast('Erro na mineração: ' + err.message, 'danger');
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="radar"></i>Minerar';
    lucide.createIcons();
  },

  // PF Mining
  pfCategory: 'profissionais',

  setPFCategory(cat) {
    this.pfCategory = cat;
    ['profissionais','prestadores','comerciantes','todos'].forEach(c => {
      const tab = document.getElementById(`pf-tab-${c}`);
      if (tab) {
        tab.className = c === cat ? 'pf-tab active' : 'pf-tab';
      }
    });
  },

  async mineIndividuals(e) {
    e.preventDefault();
    const city = document.getElementById('pf-mine-city').value.trim();
    const count = parseInt(document.getElementById('pf-mine-count').value) || 50;
    if (!city) return;

    // Store category for scripts
    this.currentKeyword = this.pfCategory;

    const btn = document.getElementById('btn-pf-mine');
    const status = document.getElementById('pf-mine-status');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin-animation"></i>Minerando...';
    status.innerHTML = '<p style="color:var(--accent-secondary);font-size:0.85rem;">Gerando contatos de pessoas físicas...</p>';
    lucide.createIcons();

    try {
      const data = await API.post('/leads/mine-individuals', { category: this.pfCategory, city, count });
      const people = data.people || [];
      this.currentLeads = people;
      this.renderResults(this.currentLeads);
      document.getElementById('mine-count').textContent = `${people.length} pessoas encontradas | ${data.saved || 0} salvas no banco | Categoria: ${this.pfCategory}`;
      status.innerHTML = `<div style="display:flex;gap:0.75rem;margin-top:0.5rem;flex-wrap:wrap;">
        <span style="background:rgba(236,72,153,0.15);color:#ec4899;padding:4px 12px;border-radius:20px;font-size:0.8rem;font-weight:600;">${data.saved || 0} salvas automaticamente</span>
        <span style="background:rgba(129,140,248,0.15);color:#818cf8;padding:4px 12px;border-radius:20px;font-size:0.8rem;">${people.length} contatos gerados</span>
      </div>`;
      showToast(`${people.length} pessoas físicas mineradas para ${city}!`, 'success');
    } catch (err) {
      status.innerHTML = `<p style="color:#f43f5e;font-size:0.85rem;">Erro: ${err.message}</p>`;
      showToast('Erro na mineração de PF: ' + err.message, 'danger');
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="user-plus"></i>Minerar PF';
    lucide.createIcons();
  },

  async minePeople() {
    const textarea = document.getElementById('cnpj-batch');
    const raw = textarea.value.trim();
    if (!raw) { showToast('Cole pelo menos um CNPJ', 'warning'); return; }

    const cnpjs = raw.split(/[\n,;]+/).map(c => c.replace(/\D/g, '')).filter(c => c.length === 14);
    if (cnpjs.length === 0) { showToast('Nenhum CNPJ valido encontrado', 'warning'); return; }

    const btn = document.getElementById('btn-mine-people');
    const countEl = document.getElementById('mine-people-count');
    const resultDiv = document.getElementById('people-results');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin-animation"></i>Consultando...';
    countEl.textContent = `Consultando ${cnpjs.length} CNPJs na Receita Federal...`;
    resultDiv.innerHTML = '<div style="display:flex;align-items:center;gap:0.75rem;padding:1rem;"><div class="spin-animation" style="width:20px;height:20px;border:3px solid rgba(16,185,129,0.2);border-top-color:#10b981;border-radius:50%;"></div><span style="color:var(--text-secondary);font-size:0.85rem;">Buscando dados reais na Receita Federal...</span></div>';
    lucide.createIcons();

    try {
      const data = await API.post('/leads/mine-people', { cnpjs });
      const people = data.people || [];

      if (people.length === 0) {
        resultDiv.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1.5rem;">Nenhuma pessoa encontrada nos CNPJs informados.</p>';
        countEl.textContent = '';
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="radar"></i>Extrair Pessoas Reais';
        lucide.createIcons();
        return;
      }

      countEl.textContent = `${people.length} pessoas reais encontradas em ${cnpjs.length} CNPJs`;

      resultDiv.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:1rem;">
          ${people.map(p => `
            <div style="background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.12);border-radius:var(--border-radius-md);overflow:hidden;">
              <div style="padding:1rem 1.25rem;border-bottom:1px solid rgba(16,185,129,0.08);display:flex;justify-content:space-between;align-items:start;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i data-lucide="user" style="color:white;width:20px;height:20px;"></i>
                  </div>
                  <div>
                    <h4 style="color:white;font-size:0.95rem;font-weight:600;margin:0;">${escapeHtml(p.nome)}</h4>
                    <p style="color:var(--accent-secondary);font-size:0.78rem;margin:2px 0 0;">${escapeHtml(p.qualificacao)}</p>
                  </div>
                </div>
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.12);color:#10b981;padding:3px 8px;border-radius:12px;font-size:0.65rem;font-weight:600;border:1px solid rgba(16,185,129,0.2);">DADOS REAIS</span>
              </div>
              <div style="padding:0.75rem 1.25rem;">
                <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.5rem;">
                  <i data-lucide="building-2" style="width:12px;height:12px;color:var(--text-tertiary);"></i>
                  <span style="font-size:0.82rem;color:white;font-weight:500;">${escapeHtml(p.empresa)}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;font-size:0.78rem;">
                  <div style="display:flex;align-items:center;gap:0.3rem;"><span style="color:var(--text-tertiary);">CNPJ:</span><span style="color:var(--text-secondary);font-family:monospace;">${p.cnpj}</span></div>
                  <div style="display:flex;align-items:center;gap:0.3rem;"><span style="color:var(--text-tertiary);">Atividade:</span><span style="color:var(--text-secondary);">${p.atividade || 'N/I'}</span></div>
                  ${p.telefone ? `<div style="display:flex;align-items:center;gap:0.3rem;"><span style="color:var(--text-tertiary);">Tel:</span><span style="color:#818cf8;">${p.telefone}</span></div>` : ''}
                  ${p.email ? `<div style="display:flex;align-items:center;gap:0.3rem;"><span style="color:var(--text-tertiary);">Email:</span><span style="color:#818cf8;">${p.email}</span></div>` : ''}
                </div>
                ${p.endereco ? `<p style="font-size:0.75rem;color:var(--text-tertiary);margin:0.5rem 0 0;">📍 ${p.endereco}</p>` : ''}
              </div>
              <div style="padding:0.6rem 1.25rem;background:rgba(0,0,0,0.15);display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:0.68rem;color:var(--text-tertiary);">Receita Federal via BrasilAPI</span>
                <button class="btn btn-sm btn-primary" onclick='LeadsPage.savePersonLead(${JSON.stringify(p).replace(/'/g, "\\'")})' style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;">
                  <i data-lucide="plus" style="width:12px;height:12px;"></i>Salvar
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      lucide.createIcons();
      showToast(`${people.length} pessoas reais extraidas com sucesso!`, 'success');
    } catch (err) {
      showToast('Erro: ' + err.message, 'danger');
      resultDiv.innerHTML = '';
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="radar"></i>Extrair Pessoas Reais';
    lucide.createIcons();
  },

  savePersonLead(p) {
    const lead = {
      name: p.nome,
      cnpj: p.cnpj,
      activity: `${p.qualificacao} - ${p.atividade || ''}`,
      phone: p.telefone || '',
      email: p.email || '',
      site: '',
      address: p.endereco || '',
      city: p.city || '',
      state: p.state || '',
      owner: p.nome,
      bank_code: '',
      bank_name: '',
      rating: '5.0',
      source: 'receita_federal_socio',
    };
    this.currentLeads.unshift({ ...lead, id: p.id, fonte: 'Receita Federal (Socio Real)', score: 95 });
    this.renderResults(this.currentLeads);
    showToast(`${p.nome} salvo como lead!`, 'success');
  },

  async checkRFStatus() {
    try {
      const data = await API.get('/rfsearch/status');
      const el = document.getElementById('rf-status');
      if (!el) return;
      if (data.available) {
        el.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.12);color:#10b981;padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;border:1px solid rgba(16,185,129,0.2);"><span style="width:6px;height:6px;border-radius:50%;background:#10b981;"></span>${data.total} CNPJs indexados</span>`;
      } else {
        el.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(245,158,11,0.12);color:#f59e0b;padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;border:1px solid rgba(245,158,11,0.2);">Indice nao configurado</span>`;
      }
    } catch {}
  },

  async searchRF() {
    const city = document.getElementById('rf-city').value.trim();
    const cnae = document.getElementById('rf-cnae').value.trim();
    if (!city) { showToast('Digite uma cidade', 'warning'); return; }

    const btn = document.getElementById('btn-rf-search');
    const resultDiv = document.getElementById('rf-results');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin-animation"></i>Buscando...';
    lucide.createIcons();

    try {
      const data = await API.get(`/rfsearch/search?city=${encodeURIComponent(city)}&cnae=${encodeURIComponent(cnae)}&limit=50`);

      if (!data.indexAvailable) {
        resultDiv.innerHTML = `
          <div style="padding:1.25rem;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:var(--border-radius-md);">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
              <i data-lucide="alert-triangle" style="width:20px;height:20px;color:#f59e0b;"></i>
              <span style="color:#f59e0b;font-weight:600;font-size:0.9rem;">Indice RF nao configurado</span>
            </div>
            <p style="color:var(--text-secondary);font-size:0.82rem;margin:0 0 0.75rem;">Para usar a busca por dados abertos da Receita Federal, voce precisa baixar e processar os CSVs.</p>
            <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:0.75rem;font-family:monospace;font-size:0.75rem;color:var(--text-secondary);">
              <p style="margin:0 0 4px;color:var(--text-tertiary);">// Passo 1: Baixe os dados</p>
              <p style="margin:0 0 4px;">Acesse: dadosabertos.rfb.gov.br/CNPJ/</p>
              <p style="margin:0 0 4px;">Baixe: Estabelecimentos*.zip</p>
              <p style="margin:0 0 8px;color:var(--text-tertiary);">// Passo 2: Processe</p>
              <p style="margin:0 0 4px;">Extraia em: server/data/rf/</p>
              <p style="margin:0;">node server/scripts/parse-rf.js</p>
            </div>
          </div>`;
        lucide.createIcons();
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="search"></i>Buscar';
        lucide.createIcons();
        return;
      }

      if (data.results.length === 0) {
        resultDiv.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">Nenhum resultado encontrado para essa busca.</p>';
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="search"></i>Buscar';
        lucide.createIcons();
        return;
      }

      resultDiv.innerHTML = `
        <div style="margin-bottom:0.75rem;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--text-secondary);font-size:0.82rem;">${data.results.length} empresas encontradas na base RF</span>
          <button class="btn btn-sm btn-primary" onclick="LeadsPage.enrichRFResults()" id="btn-enrich-rf" style="display:inline-flex;align-items:center;gap:4px;">
            <i data-lucide="sparkles"></i>Enriquecer com Receita Federal
          </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:0.75rem;" id="rf-cards">
          ${data.results.map(r => `
            <div style="background:rgba(245,158,11,0.04);border:1px solid rgba(245,158,11,0.1);border-radius:var(--border-radius-sm);padding:0.85rem;" data-cnpj="${r.cnpj.replace(/\D/g, '')}">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.4rem;">
                <h4 style="color:white;font-size:0.88rem;font-weight:600;margin:0;flex:1;">${escapeHtml(r.nome || 'Sem nome')}</h4>
                <input type="checkbox" class="rf-check" value="${r.cnpj}" style="accent-color:#f59e0b;" checked>
              </div>
              <p style="font-size:0.75rem;color:var(--text-tertiary);font-family:monospace;margin:0 0 0.3rem;">CNPJ: ${escapeHtml(r.cnpj)}</p>
              ${r.endereco ? `<p style="font-size:0.75rem;color:var(--text-secondary);margin:0 0 0.3rem;">📍 ${escapeHtml(r.endereco)}</p>` : ''}
              ${r.telefone ? `<p style="font-size:0.75rem;color:#818cf8;margin:0;">📞 ${escapeHtml(r.telefone)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `;
      lucide.createIcons();
      this._rfResults = data.results;
    } catch (err) {
      showToast('Erro na busca: ' + err.message, 'danger');
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="search"></i>Buscar';
    lucide.createIcons();
  },

  async enrichRFResults() {
    const cards = document.querySelectorAll('.rf-check:checked');
    const cnpjs = Array.from(cards).map(cb => cb.value.replace(/\D/g, '')).filter(c => c.length === 14);
    if (cnpjs.length === 0) { showToast('Selecione pelo menos 1 CNPJ', 'warning'); return; }

    const btn = document.getElementById('btn-enrich-rf');
    const resultDiv = document.getElementById('rf-results');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin-animation"></i>Enriquecendo...';
    lucide.createIcons();

    try {
      const data = await API.post('/rfsearch/enrich', { cnpjs });
      if (data.results.length === 0) {
        showToast('Nenhum dado encontrado na Receita Federal', 'warning');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles"></i>Enriquecer com Receita Federal';
        lucide.createIcons();
        return;
      }

      // Show enriched results
      let html = `<div style="margin-bottom:0.75rem;"><span style="color:#10b981;font-weight:600;font-size:0.85rem;">${data.results.length} empresas enriquecidas com dados reais da RF</span></div>`;
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:1rem;">';

      for (const d of data.results) {
        html += `
          <div style="background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.12);border-radius:var(--border-radius-md);overflow:hidden;">
            <div style="padding:1rem 1.25rem;border-bottom:1px solid rgba(16,185,129,0.08);display:flex;justify-content:space-between;align-items:start;">
              <div>
                <h4 style="color:white;font-size:0.95rem;font-weight:600;margin:0;">${escapeHtml(d.nomeFantasia || d.razaoSocial)}</h4>
                <p style="color:var(--text-tertiary);font-size:0.75rem;margin:2px 0 0;font-family:monospace;">${escapeHtml(d.cnpj)}</p>
              </div>
              <span style="background:rgba(16,185,129,0.12);color:#10b981;padding:3px 8px;border-radius:12px;font-size:0.65rem;font-weight:600;">RF REAL</span>
            </div>
            <div style="padding:0.75rem 1.25rem;font-size:0.78rem;">
              <p style="color:var(--text-secondary);margin:0 0 0.3rem;"><strong>${escapeHtml(d.razaoSocial)}</strong></p>
              <p style="color:var(--text-tertiary);margin:0 0 0.3rem;">${escapeHtml(d.cnaePrincipal || '')} | Capital: R$ ${(d.capitalSocial || 0).toLocaleString('pt-BR')}</p>
              ${d.telefone1 ? `<p style="color:#818cf8;margin:0 0 0.3rem;">📞 ${escapeHtml(d.telefone1)}</p>` : ''}
              ${d.email ? `<p style="color:#818cf8;margin:0 0 0.3rem;">✉️ ${escapeHtml(d.email)}</p>` : ''}
              ${d.socios?.length ? `<div style="margin-top:0.5rem;"><p style="color:var(--text-tertiary);font-size:0.7rem;margin:0 0 4px;">SÓCIOS REAIS:</p>${d.socios.map(s => `<span style="display:inline-block;background:rgba(129,140,248,0.1);color:#818cf8;padding:2px 8px;border-radius:12px;font-size:0.7rem;margin:2px;">${escapeHtml(s.nome)} (${escapeHtml(s.qualificacao)})</span>`).join('')}</div>` : ''}
            </div>
            <div style="padding:0.5rem 1.25rem;background:rgba(0,0,0,0.15);display:flex;justify-content:flex-end;">
              <button class="btn btn-sm btn-primary" onclick='LeadsPage.saveCNPJLead(${JSON.stringify(d).replace(/'/g, "\\'")})' style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;">
                <i data-lucide="plus" style="width:12px;height:12px;"></i>Salvar como Lead
              </button>
            </div>
          </div>`;
      }
      html += '</div>';
      resultDiv.innerHTML = html;
      lucide.createIcons();
      showToast(`${data.results.length} empresas enriquecidas!`, 'success');
    } catch (err) {
      showToast('Erro: ' + err.message, 'danger');
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="sparkles"></i>Enriquecer com Receita Federal';
    lucide.createIcons();
  },

  async lookupCNPJ() {
    const cnpj = document.getElementById('cnpj-lookup').value.trim();
    if (!cnpj) return;
    const resultDiv = document.getElementById('cnpj-result');
    resultDiv.innerHTML = '<p style="color:var(--accent-secondary);">Consultando Receita Federal...</p>';

    try {
      const data = await API.get(`/leads/cnpj/${cnpj}`);
      const d = data.data;
      resultDiv.innerHTML = `
        <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:var(--border-radius-md);padding:1.25rem;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.75rem;">
            <div>
              <h4 style="color:white;font-size:1rem;">${escapeHtml(d.nomeFantasia || d.razaoSocial)}</h4>
              <p style="color:var(--text-tertiary);font-size:0.8rem;">${escapeHtml(d.razaoSocial)}</p>
            </div>
            <span class="badge badge-success">${d.situacaoCadastral}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;font-size:0.82rem;">
            <div><span style="color:var(--text-tertiary);">CNPJ:</span><br><strong style="color:white;">${escapeHtml(d.cnpj)}</strong></div>
            <div><span style="color:var(--text-tertiary);">Capital Social:</span><br><strong style="color:var(--accent-secondary);">R$ ${(d.capitalSocial || 0).toLocaleString('pt-BR')}</strong></div>
            <div><span style="color:var(--text-tertiary);">Porte:</span><br><strong style="color:white;">${escapeHtml(d.porte || 'N/I')}</strong></div>
            <div><span style="color:var(--text-tertiary);">CNAE:</span><br><strong style="color:white;">${escapeHtml(d.cnaePrincipal || 'N/I')}</strong></div>
            <div><span style="color:var(--text-tertiary);">Regime:</span><br><strong style="color:white;">${escapeHtml(d.regimeTributario || 'N/I')}</strong></div>
            <div><span style="color:var(--text-tertiary);">Abertura:</span><br><strong style="color:white;">${escapeHtml(d.dataAbertura || 'N/I')}</strong></div>
            <div><span style="color:var(--text-tertiary);">Telefone:</span><br><strong style="color:white;">${escapeHtml(d.telefone1 || 'N/I')}</strong></div>
            <div><span style="color:var(--text-tertiary);">Simples:</span><br><strong style="color:white;">${d.opcaoSimples ? 'Sim' : 'Não'}</strong></div>
            <div><span style="color:var(--text-tertiary);">MEI:</span><br><strong style="color:white;">${d.opcaoMEI ? 'Sim' : 'Não'}</strong></div>
          </div>
          ${d.endereco ? `<p style="margin-top:0.75rem;font-size:0.8rem;color:var(--text-secondary);">📍 ${d.endereco.logradouro || ''}, ${d.endereco.numero || ''} - ${d.endereco.bairro || ''}, ${d.endereco.municipio || ''} - ${d.endereco.uf || ''}</p>` : ''}
          ${d.socios?.length ? `<div style="margin-top:0.75rem;"><p style="font-size:0.75rem;color:var(--text-tertiary);margin-bottom:0.3rem;">SÓCIOS:</p>${d.socios.map(s => `<span style="display:inline-block;background:rgba(129,140,248,0.1);color:var(--accent-primary);padding:2px 8px;border-radius:12px;font-size:0.75rem;margin:2px;">${escapeHtml(s.nome)} (${escapeHtml(s.qualificacao)})</span>`).join('')}</div>` : ''}
          <button class="btn btn-sm btn-primary" style="margin-top:0.75rem;" onclick='LeadsPage.saveCNPJLead(${JSON.stringify(d).replace(/'/g,"\\'")})'><i data-lucide="plus"></i>Salvar como Lead</button>
        </div>
      `;
      lucide.createIcons();
    } catch (err) {
      resultDiv.innerHTML = `<p style="color:var(--danger);">CNPJ não encontrado ou erro na consulta.</p>`;
    }
  },

  async lookupCPF() {
    const cpfInput = document.getElementById('cpf-lookup');
    const cpf = cpfInput.value.trim().replace(/\D/g, '');
    if (cpf.length !== 11) {
      showToast('CPF deve conter 11 digitos', 'warning');
      return;
    }
    const resultDiv = document.getElementById('cpf-result');
    resultDiv.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;padding:1.5rem;background:rgba(34,211,238,0.04);border:1px solid rgba(34,211,238,0.1);border-radius:var(--border-radius-md);">
        <div class="spin-animation" style="width:24px;height:24px;border:3px solid rgba(34,211,238,0.2);border-top-color:#22d3ee;border-radius:50%;"></div>
        <span style="color:var(--accent-secondary);font-size:0.9rem;">Consultando CPF <strong>${cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</strong> na Receita Federal...</span>
      </div>`;

    try {
      const data = await API.get(`/leads/cpf/${cpf}`);
      const d = data.data;
      const isReal = d.fonte && !d.fonte.includes('estimados');
      const validatedBadge = '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.12);color:#10b981;padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;border:1px solid rgba(16,185,129,0.2);"><span style="width:6px;height:6px;border-radius:50%;background:#10b981;"></span>CPF Validado</span>';
      const statusColor = d.situacaoCadastral === 'REGULAR' || d.situacaoCadastral === 'REGULAR/ATIVO' ? '#10b981' : '#f43f5e';

      resultDiv.innerHTML = `
        <div style="background:linear-gradient(135deg,rgba(34,211,238,0.06),rgba(99,102,241,0.04));border:1px solid rgba(34,211,238,0.12);border-radius:var(--border-radius-md);overflow:hidden;">
          <!-- Header -->
          <div style="padding:1.25rem 1.5rem;border-bottom:1px solid rgba(34,211,238,0.08);display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:1rem;">
              <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#22d3ee,#06b6d4);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i data-lucide="user-check" style="color:white;width:24px;height:24px;"></i>
              </div>
              <div>
                <h3 style="color:white;font-size:1.1rem;font-weight:700;margin:0;">${escapeHtml(d.nome)}</h3>
                <p style="color:var(--text-tertiary);font-size:0.82rem;margin:2px 0 0;font-family:monospace;letter-spacing:0.5px;">CPF: ${escapeHtml(d.cpf)}</p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              ${validatedBadge}
              <span style="display:inline-flex;align-items:center;gap:4px;background:${statusColor}18;color:${statusColor};padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;border:1px solid ${statusColor}33;">${d.situacaoCadastral}</span>
            </div>
          </div>

          <!-- Dados Pessoais -->
          <div style="padding:1.25rem 1.5rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;">
              <div style="width:28px;height:28px;border-radius:8px;background:rgba(34,211,238,0.1);display:flex;align-items:center;justify-content:center;"><i data-lucide="user" style="color:#22d3ee;width:14px;height:14px;"></i></div>
              <span style="font-size:0.75rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;">Dados Pessoais</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.25rem;">
              <div>
                <p style="font-size:0.7rem;color:var(--text-tertiary);margin:0 0 4px;text-transform:uppercase;letter-spacing:0.03em;">Nome Completo</p>
                <p style="font-size:0.88rem;color:white;font-weight:600;margin:0;">${escapeHtml(d.nome)}</p>
              </div>
              <div>
                <p style="font-size:0.7rem;color:var(--text-tertiary);margin:0 0 4px;text-transform:uppercase;letter-spacing:0.03em;">Nome da Mae</p>
                <p style="font-size:0.88rem;color:white;font-weight:600;margin:0;">${escapeHtml(d.nomeMae || 'Nao informado')}</p>
              </div>
              <div>
                <p style="font-size:0.7rem;color:var(--text-tertiary);margin:0 0 4px;text-transform:uppercase;letter-spacing:0.03em;">Data de Nascimento</p>
                <p style="font-size:0.88rem;color:#22d3ee;font-weight:600;margin:0;">${escapeHtml(d.dataNascimento || 'Nao informado')}</p>
              </div>
              <div>
                <p style="font-size:0.7rem;color:var(--text-tertiary);margin:0 0 4px;text-transform:uppercase;letter-spacing:0.03em;">Idade</p>
                <p style="font-size:0.88rem;color:white;font-weight:600;margin:0;">${d.idade ? d.idade + ' anos' : 'Nao informado'}</p>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;">
              <div>
                <p style="font-size:0.7rem;color:var(--text-tertiary);margin:0 0 4px;text-transform:uppercase;letter-spacing:0.03em;">Sexo</p>
                <p style="font-size:0.88rem;color:white;font-weight:600;margin:0;">${escapeHtml(d.sexo || 'Nao informado')}</p>
              </div>
              <div>
                <p style="font-size:0.7rem;color:var(--text-tertiary);margin:0 0 4px;text-transform:uppercase;letter-spacing:0.03em;">Municipio</p>
                <p style="font-size:0.88rem;color:white;font-weight:600;margin:0;">${escapeHtml(d.municipio || 'Nao informado')}</p>
              </div>
              <div>
                <p style="font-size:0.7rem;color:var(--text-tertiary);margin:0 0 4px;text-transform:uppercase;letter-spacing:0.03em;">UF</p>
                <p style="font-size:0.88rem;color:white;font-weight:600;margin:0;">${escapeHtml(d.uf || 'Nao informado')}</p>
              </div>
              <div>
                <p style="font-size:0.7rem;color:var(--text-tertiary);margin:0 0 4px;text-transform:uppercase;letter-spacing:0.03em;">Situacao Cadastral</p>
                <p style="font-size:0.88rem;color:${statusColor};font-weight:600;margin:0;">${escapeHtml(d.situacaoCadastral)}</p>
              </div>
            </div>
          </div>

          <!-- Contato -->
          ${(d.telefone || d.email) ? `
          <div style="padding:0 1.5rem 1.25rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
              <div style="width:28px;height:28px;border-radius:8px;background:rgba(129,140,248,0.1);display:flex;align-items:center;justify-content:center;"><i data-lucide="phone" style="color:#818cf8;width:14px;height:14px;"></i></div>
              <span style="font-size:0.75rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;">Contato</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
              ${d.telefone ? `<div><p style="font-size:0.7rem;color:var(--text-tertiary);margin:0 0 4px;text-transform:uppercase;">Telefone</p><p style="font-size:0.88rem;color:#818cf8;font-weight:600;margin:0;">${escapeHtml(d.telefone)}</p></div>` : ''}
              ${d.email ? `<div><p style="font-size:0.7rem;color:var(--text-tertiary);margin:0 0 4px;text-transform:uppercase;">Email</p><p style="font-size:0.88rem;color:#818cf8;font-weight:600;margin:0;">${escapeHtml(d.email)}</p></div>` : ''}
            </div>
          </div>` : ''}

          <!-- Footer -->
          <div style="padding:1rem 1.5rem;background:rgba(0,0,0,0.15);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="display:flex;align-items:center;gap:0.5rem;">
                <i data-lucide="info" style="width:12px;height:12px;color:var(--text-tertiary);"></i>
                <span style="font-size:0.72rem;color:var(--text-tertiary);">Validacao matematica real | Dados pessoais: estimativa baseada nos digitos do CPF</span>
              </div>
              <button class="btn btn-sm btn-primary" onclick='LeadsPage.saveCPFLead(${JSON.stringify(d).replace(/'/g, "\\'")})' style="display:inline-flex;align-items:center;gap:6px;">
                <i data-lucide="plus" style="width:14px;height:14px;"></i>Salvar como Lead
              </button>
            </div>
            <p style="font-size:0.68rem;color:var(--text-tertiary);margin:6px 0 0;opacity:0.7;">Dados pessoais de CPF sao protegidos pela LGPD. Para dados 100% reais, use a Consulta CNPJ acima.</p>
          </div>
        </div>
      `;
      lucide.createIcons();
    } catch (err) {
      resultDiv.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:1.25rem;background:rgba(244,63,94,0.06);border:1px solid rgba(244,63,94,0.15);border-radius:var(--border-radius-md);">
          <i data-lucide="alert-circle" style="width:20px;height:20px;color:#f43f5e;flex-shrink:0;"></i>
          <div>
            <p style="color:#f43f5e;font-weight:600;font-size:0.9rem;margin:0;">CPF invalido ou nao encontrado</p>
            <p style="color:var(--text-tertiary);font-size:0.8rem;margin:4px 0 0;">Verifique se o CPF esta correto e tente novamente.</p>
          </div>
        </div>`;
      lucide.createIcons();
    }
  },

  saveCNPJLead(d) {
    const lead = {
      name: d.nomeFantasia || d.razaoSocial,
      cnpj: d.cnpj,
      activity: d.cnaePrincipal,
      phone: d.telefone1 ? `(${d.telefone1.slice(0,2)}) ${d.telefone1.slice(2)}` : '',
      email: d.email || '',
      address: `${d.endereco?.logradouro || ''}, ${d.endereco?.numero || ''} - ${d.endereco?.bairro || ''}, ${d.endereco?.municipio || ''} - ${d.endereco?.uf || ''}`,
      city: d.endereco?.municipio || '',
      state: d.endereco?.uf || '',
      owner: d.socios?.[0]?.nome || '',
      bank_code: '',
      bank_name: '',
      rating: '5.0',
      source: 'receita_federal',
    };
    this.currentLeads.unshift({ ...lead, id: 'cnpj-' + Date.now(), fonte: 'Receita Federal', score: 95 });
    this.renderResults(this.currentLeads);
    showToast('Lead salvo da Receita Federal!', 'success');
  },

  saveCPFLead(d) {
    const lead = {
      name: d.nome,
      cnpj: '',
      activity: 'Pessoa Fisica',
      phone: d.telefone || '',
      email: d.email || '',
      site: '',
      address: d.endereco ? `${d.endereco.logradouro || ''}, ${d.endereco.numero || ''} - ${d.endereco.bairro || ''}, ${d.municipio || ''} - ${d.uf || ''}` : `${d.municipio || ''} - ${d.uf || ''}`,
      city: d.municipio || '',
      state: d.uf || '',
      owner: d.nome,
      bank_code: '',
      bank_name: '',
      rating: '5.0',
      source: 'consulta_cpf',
    };
    this.currentLeads.unshift({ ...lead, id: 'cpf-' + Date.now(), fonte: 'Consulta CPF', score: 90 });
    this.renderResults(this.currentLeads);
    showToast('Lead salvo da consulta CPF!', 'success');
  },

  maskCPF(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
    input.value = v;
  },

  renderResults(leads) {
    const container = document.getElementById('leads-results');
    const empty = document.getElementById('leads-empty');
    if (!leads.length) {
      container.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';

    container.innerHTML = leads.map(l => {
      const scoreColor = (l.score || 0) >= 80 ? '#10b981' : (l.score || 0) >= 60 ? '#f59e0b' : '#6b7280';
      const sourceColors = { 'Receita Federal via BrasilAPI': '#10b981', 'OpenStreetMap Nominatim': '#38bdf8', 'Base local inteligente': '#a78bfa' };
      const sourceColor = sourceColors[l.fonte] || '#6b7280';

      return `
        <div class="card" style="padding:1.25rem;position:relative;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem;">
            <h4 style="color:white;font-size:0.95rem;flex:1;">${escapeHtml(l.name)}</h4>
            <div style="display:flex;align-items:center;gap:0.3rem;background:rgba(255,255,255,0.04);padding:2px 8px;border-radius:20px;">
              <span style="width:6px;height:6px;border-radius:50%;background:${scoreColor};"></span>
              <span style="font-size:0.7rem;font-weight:700;color:${scoreColor};">${l.score || 0}%</span>
            </div>
          </div>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.5rem;">
            <span class="badge" style="background:${sourceColor}18;color:${sourceColor};border:1px solid ${sourceColor}33;">${escapeHtml(l.fonte || 'N/I')}</span>
            ${l.activity ? `<span class="badge badge-primary">${escapeHtml(l.activity)}</span>` : ''}
          </div>
          ${l.cnpj ? `<p style="font-size:0.78rem;color:var(--text-tertiary);font-family:monospace;">CNPJ: ${escapeHtml(l.cnpj)}</p>` : ''}
          ${l.address ? `<p style="font-size:0.8rem;color:var(--text-secondary);margin:0.3rem 0;">📍 ${escapeHtml(l.address)}</p>` : ''}
          ${l.phone ? `<p style="font-size:0.82rem;color:var(--accent-secondary);">📞 ${escapeHtml(l.phone)}</p>` : ''}
          ${l.email ? `<p style="font-size:0.78rem;color:var(--text-tertiary);">✉️ ${escapeHtml(l.email)}</p>` : ''}
          ${l.owner ? `<p style="font-size:0.78rem;color:var(--accent-primary);">👤 ${escapeHtml(l.owner)}</p>` : ''}
          ${l.bank ? `<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.3rem;">${LeadsPage.bankBadge(l.bank)}<span style="font-size:0.78rem;color:var(--text-secondary);">${escapeHtml(l.bank.name || l.bank)}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.75rem;padding-top:0.5rem;border-top:1px solid var(--border-color);">
            <span style="font-size:0.7rem;color:var(--text-tertiary);">⭐ ${l.rating || '-'}</span>
            <button class="btn btn-sm btn-secondary" onclick="LeadsPage.saveToFunil('${l.id}')"><i data-lucide="plus"></i>Salvar</button>
          </div>
        </div>
      `;
    }).join('');
    lucide.createIcons();
  },

  filterLocal(term) {
    const filtered = this.currentLeads.filter(l =>
      l.name.toLowerCase().includes(term.toLowerCase()) ||
      (l.cnpj || '').includes(term) ||
      (l.phone || '').includes(term) ||
      (l.activity || '').toLowerCase().includes(term.toLowerCase())
    );
    this.renderResults(filtered);
  },

  async saveToFunil(id) {
    const lead = this.currentLeads.find(l => l.id === id);
    if (!lead) return;
    try {
      await API.post('/leads', {
        name: lead.name, cnpj: lead.cnpj, activity: lead.activity,
        phone: lead.phone, email: lead.email, site: lead.site,
        address: lead.address, city: lead.city, state: lead.state,
        owner: lead.owner, bank_code: lead.bank?.code, bank_name: lead.bank?.name,
        rating: lead.rating, source: lead.fonte || 'power_mine',
      });
      showToast(`"${lead.name}" salvo no funil!`, 'success');
    } catch (err) {
      showToast('Erro ao salvar: ' + err.message, 'danger');
    }
  },

  async saveAll() {
    let saved = 0;
    for (const lead of this.currentLeads) {
      try {
        await API.post('/leads', {
          name: lead.name, cnpj: lead.cnpj, activity: lead.activity,
          phone: lead.phone, email: lead.email, site: lead.site,
          address: lead.address, city: lead.city, state: lead.state,
          owner: lead.owner, bank_code: lead.bank?.code, bank_name: lead.bank?.name,
          rating: lead.rating, source: lead.fonte || 'power_mine',
        });
        saved++;
      } catch { /* skip */ }
    }
    showToast(`${saved} leads salvos no funil!`, 'success');
  },

  exportCSV() {
    const params = new URLSearchParams();
    const city = document.getElementById('mine-city')?.value;
    const keyword = document.getElementById('mine-keyword')?.value;
    if (city) params.set('city', city.split(',')[0]);
    window.location.href = `/api/export/leads?${params.toString()}`;
    showToast('Exportacao CSV iniciada!', 'success');
  },

  async exportSocios() {
    showToast('Exportando socios reais da Receita Federal...', 'info');
    window.location.href = '/api/export/socios';
  },

  bankBadge(bank) {
    const banks = {
      '341': { name: 'Itau', color: '#f58220', bg: 'rgba(245,130,32,0.12)', border: 'rgba(245,130,32,0.25)', letter: 'I' },
      '237': { name: 'Bradesco', color: '#e31937', bg: 'rgba(227,25,55,0.12)', border: 'rgba(227,25,55,0.25)', letter: 'B' },
      '001': { name: 'BB', color: '#f5c518', bg: 'rgba(245,197,24,0.12)', border: 'rgba(245,197,24,0.25)', letter: 'BB' },
      '033': { name: 'Santander', color: '#ec0000', bg: 'rgba(236,0,0,0.12)', border: 'rgba(236,0,0,0.25)', letter: 'S' },
      '104': { name: 'Caixa', color: '#0072ce', bg: 'rgba(0,114,206,0.12)', border: 'rgba(0,114,206,0.25)', letter: 'CE' },
      '260': { name: 'Nubank', color: '#820ad1', bg: 'rgba(130,10,209,0.12)', border: 'rgba(130,10,209,0.25)', letter: 'Nu' },
      '748': { name: 'Sicredi', color: '#0095da', bg: 'rgba(0,149,218,0.12)', border: 'rgba(0,149,218,0.25)', letter: 'Sc' },
      '756': { name: 'Sicoob', color: '#00a859', bg: 'rgba(0,168,89,0.12)', border: 'rgba(0,168,89,0.25)', letter: 'Sb' },
    };
    const code = (typeof bank === 'string' ? bank : bank.code || '').replace(/\D/g, '');
    const b = banks[code];
    if (!b) return `<div style="width:26px;height:26px;border-radius:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:var(--text-tertiary);flex-shrink:0;">?</div>`;
    return `<div style="width:26px;height:26px;border-radius:6px;background:${b.bg};border:1px solid ${b.border};display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;color:${b.color};flex-shrink:0;letter-spacing:-0.02em;">${b.letter}</div>`;
  },

  async showScripts() {
    const keyword = this.currentKeyword || document.getElementById('mine-keyword')?.value || '';
    if (!keyword) {
      showToast('Pesquise um nicho primeiro para ver os scripts', 'warning');
      return;
    }

    // Show loading state
    const scriptBtn = document.getElementById('btn-script-ligacao');
    const originalText = scriptBtn.innerHTML;
    scriptBtn.innerHTML = '<i data-lucide="loader-2" class="spin-animation"></i>Carregando...';
    scriptBtn.disabled = true;
    lucide.createIcons();

    // For PF scripts, don't send lead name (scripts are generic)
    // For PJ scripts, send first lead name for personalization
    const isPF = ['profissionais', 'prestadores', 'comerciantes', 'todos'].includes(keyword);
    const leadName = isPF ? '' : (this.currentLeads[0]?.name || '');

    try {
      const data = await API.get(`/scripts/${encodeURIComponent(keyword)}?leadName=${encodeURIComponent(leadName)}`);
      
      // Create modal
      const modal = document.createElement('div');
      modal.id = 'scripts-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;padding:2rem;';
      
      modal.innerHTML = `
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(245,158,11,0.2);border-radius:16px;max-width:800px;width:100%;max-height:80vh;overflow-y:auto;position:relative;">
          <!-- Header -->
          <div style="padding:1.5rem 2rem;border-bottom:1px solid rgba(245,158,11,0.1);display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:linear-gradient(135deg,#1a1a2e,#16213e);z-index:1;">
            <div style="display:flex;align-items:center;gap:1rem;">
              <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;">
                <i data-lucide="phone" style="color:white;width:24px;height:24px;"></i>
              </div>
              <div>
                <h2 style="color:white;font-size:1.3rem;font-weight:700;margin:0;">Scripts para Ligacao</h2>
                <p style="color:var(--text-tertiary);font-size:0.85rem;margin:4px 0 0;">Nicho: <strong style="color:#f59e0b;">${escapeHtml(keyword)}</strong> | App: <strong style="color:#10b981;">${escapeHtml(data.appName)}</strong></p>
              </div>
            </div>
            <button onclick="LeadsPage.closeScriptsModal()" style="background:rgba(255,255,255,0.1);border:none;color:white;width:36px;height:36px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;">
              <i data-lucide="x" style="width:20px;height:20px;"></i>
            </button>
          </div>

          <!-- App Info -->
          <div style="padding:1rem 2rem;background:rgba(16,185,129,0.05);border-bottom:1px solid rgba(16,185,129,0.1);">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;">
                <i data-lucide="smartphone" style="color:white;width:16px;height:16px;"></i>
              </div>
              <div>
                <p style="color:white;font-weight:600;margin:0;font-size:0.95rem;">${escapeHtml(data.appName)}</p>
                <p style="color:var(--text-tertiary);font-size:0.8rem;margin:2px 0 0;">${escapeHtml(data.appDescription)}</p>
              </div>
            </div>
          </div>

          <!-- Scripts -->
          <div style="padding:1.5rem 2rem;">
            ${data.scripts.map((script, index) => `
              <div style="margin-bottom:1.5rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;">
                <!-- Script Header -->
                <div style="padding:1rem 1.25rem;background:rgba(245,158,11,0.05);border-bottom:1px solid rgba(245,158,11,0.1);display:flex;justify-content:space-between;align-items:center;">
                  <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:white;">${index + 1}</div>
                    <h3 style="color:white;font-size:0.95rem;font-weight:600;margin:0;">${escapeHtml(script.title)}</h3>
                  </div>
                  <button onclick="LeadsPage.copyScript(${index})" style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10b981;padding:6px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all 0.2s;">
                    <i data-lucide="copy" style="width:14px;height:14px;"></i>Copiar
                  </button>
                </div>
                
                <!-- Script Content -->
                <div style="padding:1.25rem;" id="script-content-${index}">
                  <!-- Greeting -->
                  <div style="margin-bottom:1rem;">
                    <p style="color:var(--text-tertiary);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">ABERTURA</p>
                    <p style="color:#22d3ee;font-size:0.9rem;line-height:1.6;margin:0;padding:0.75rem;background:rgba(34,211,238,0.05);border-radius:8px;border-left:3px solid #22d3ee;">${escapeHtml(script.greeting)}</p>
                  </div>
                  
                  <!-- Body -->
                  <div style="margin-bottom:1rem;">
                    <p style="color:var(--text-tertiary);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">CONTEUDO</p>
                    <p style="color:white;font-size:0.88rem;line-height:1.7;margin:0;padding:1rem;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06);">${escapeHtml(script.body)}</p>
                  </div>
                  
                  <!-- Closing -->
                  <div>
                    <p style="color:var(--text-tertiary);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">FECHAMENTO</p>
                    <p style="color:#10b981;font-size:0.9rem;line-height:1.6;margin:0;padding:0.75rem;background:rgba(16,185,129,0.05);border-radius:8px;border-left:3px solid #10b981;font-weight:500;">${escapeHtml(script.closing)}</p>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Footer -->
          <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;">
            <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0;">${data.scripts.length} scripts disponiveis | App: ${escapeHtml(data.appName)}</p>
            <button onclick="LeadsPage.closeScriptsModal()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);color:white;padding:8px 16px;border-radius:8px;font-size:0.85rem;cursor:pointer;transition:all 0.2s;">Fechar</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      lucide.createIcons();

      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeScriptsModal();
      });

      // Close on ESC
      document.addEventListener('keydown', this._escHandler = (e) => {
        if (e.key === 'Escape') this.closeScriptsModal();
      });

    } catch (err) {
      showToast('Erro ao carregar scripts: ' + err.message, 'danger');
    }

    // Restore button
    scriptBtn.innerHTML = originalText;
    scriptBtn.disabled = false;
    lucide.createIcons();
  },

  closeScriptsModal() {
    const modal = document.getElementById('scripts-modal');
    if (modal) {
      modal.style.opacity = '0';
      modal.style.transition = 'opacity 0.2s';
      setTimeout(() => modal.remove(), 200);
    }
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  },

  copyScript(index) {
    const contentEl = document.getElementById(`script-content-${index}`);
    if (!contentEl) return;

    // Extract text content
    const paragraphs = contentEl.querySelectorAll('p');
    let text = '';
    paragraphs.forEach(p => {
      if (!p.textContent.match(/^(ABERTURA|CONTEUDO|FECHAMENTO)$/)) {
        text += p.textContent + '\n\n';
      }
    });

    // Copy to clipboard
    navigator.clipboard.writeText(text.trim()).then(() => {
      showToast('Script copiado para a area de transferencia!', 'success');
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text.trim();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Script copiado!', 'success');
    });
  }
};
