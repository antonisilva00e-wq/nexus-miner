// Telegram Page — Connect bot, extract groups & members
const TelegramPage = {
  connected: false,
  botInfo: null,
  groups: [],
  selectedGroup: null,
  extractedMembers: [],

  async render() {
    document.getElementById('page-title').textContent = 'Telegram';
    document.getElementById('page-subtitle').textContent = 'Extração de membros e gestão de grupos';

    document.getElementById('page-telegram').innerHTML = `
      <div id="telegram-content">
        <div class="skeleton" style="height:200px;border-radius:var(--border-radius);"></div>
      </div>
    `;
    lucide.createIcons();

    await this.checkStatus();
  },

  async checkStatus() {
    try {
      const status = await API.get('/telegram/status');
      this.connected = status.connected;
      this.botInfo = status.bot;
      this.renderContent();
    } catch {
      this.renderContent();
    }
  },

  renderContent() {
    const el = document.getElementById('telegram-content');
    if (!el) return;

    if (this.connected) {
      this.renderConnected(el);
    } else {
      this.renderConnectForm(el);
    }
  },

  renderConnectForm(el) {
    el.innerHTML = `
      <div style="max-width:600px;margin:0 auto;text-align:center;padding:40px 20px;">
        <div style="width:80px;height:80px;margin:0 auto 24px;background:linear-gradient(135deg,#0088cc,#00aaff);border-radius:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(0,136,204,0.3);">
          <i data-lucide="send" style="width:40px;height:40px;color:#fff;"></i>
        </div>
        <h2 style="color:#fff;font-size:1.5rem;margin-bottom:8px;">Conectar Bot do Telegram</h2>
        <p style="color:var(--text-secondary);margin-bottom:32px;line-height:1.6;">
          Crie um bot com <a href="https://t.me/BotFather" target="_blank" style="color:var(--accent-primary);">@BotFather</a> no Telegram,<br>
          copie o token e cole abaixo para começar a extrair membros.
        </p>

        <div class="card" style="text-align:left;padding:24px;">
          <div class="form-group" style="margin-bottom:16px;">
            <label style="color:var(--text-secondary);font-size:0.85rem;display:block;margin-bottom:6px;">Token do Bot</label>
            <input type="text" id="tg-bot-token" placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" style="width:100%;padding:12px 16px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-mono);font-size:0.9rem;">
          </div>
          <button class="btn btn-primary" onclick="TelegramPage.connect()" style="width:100%;">
            <i data-lucide="link"></i> Conectar Bot
          </button>
        </div>

        <div style="margin-top:32px;text-align:left;">
          <h3 style="color:#fff;font-size:1rem;margin-bottom:12px;">Como criar seu bot:</h3>
          <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:var(--border-radius);padding:20px;">
            <ol style="color:var(--text-secondary);font-size:0.85rem;line-height:2;padding-left:20px;">
              <li>Abra o Telegram e busque por <a href="https://t.me/BotFather" target="_blank" style="color:var(--accent-primary);">@BotFather</a></li>
              <li>Envie <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;">/newbot</code></li>
              <li>Dê um nome ao bot (ex: Nexus Miner Extractor)</li>
              <li>Dê um username (ex: nexus_miner_bot)</li>
              <li>Copie o token gerado</li>
              <li>Adicione o bot como <strong style="color:#fff;">ADMINISTRADOR</strong> nos grupos que quer extrair</li>
              <li>Cole o token aqui e conecte!</li>
            </ol>
          </div>
        </div>
      </div>
    `;
    lucide.createIcons();
  },

  renderConnected(el) {
    el.innerHTML = `
      <div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        <div class="card" style="flex:1;min-width:250px;padding:20px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div style="width:48px;height:48px;background:linear-gradient(135deg,#0088cc,#00aaff);border-radius:12px;display:flex;align-items:center;justify-content:center;">
              <i data-lucide="bot" style="width:24px;height:24px;color:#fff;"></i>
            </div>
            <div>
              <div style="color:#fff;font-weight:600;">${this.botInfo?.name || 'Bot'}</div>
              <div style="color:var(--text-secondary);font-size:0.85rem;">@${this.botInfo?.username || 'unknown'}</div>
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <span style="background:rgba(16,185,129,0.15);color:#10b981;padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">CONECTADO</span>
          </div>
        </div>
        <div class="card" style="flex:1;min-width:250px;padding:20px;">
          <div style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:8px;">Grupos Encontrados</div>
          <div style="color:#fff;font-size:1.5rem;font-weight:700;">${this.groups.length}</div>
          <button class="btn btn-sm btn-secondary" onclick="TelegramPage.loadGroups()" style="margin-top:8px;">
            <i data-lucide="refresh-cw"></i> Atualizar
          </button>
        </div>
        <div class="card" style="flex:0;padding:20px;">
          <button class="btn btn-danger btn-sm" onclick="TelegramPage.disconnect()">
            <i data-lucide="unplug"></i> Desconectar
          </button>
        </div>
      </div>

      <!-- Niche Selector -->
      <div class="card" style="padding:20px;margin-bottom:1.5rem;">
        <h3 style="color:#fff;font-size:1rem;margin-bottom:12px;">
          <i data-lucide="hash" style="width:18px;height:18px;display:inline;vertical-align:middle;margin-right:6px;"></i>
          Buscar por Nicho
        </h3>
        <div id="tg-niches" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;"></div>
        <div style="display:flex;gap:8px;">
          <input type="text" id="tg-search" placeholder="Ou digite uma palavra-chave..." style="flex:1;padding:10px 14px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-size:0.85rem;">
          <button class="btn btn-primary" onclick="TelegramPage.searchNiche()">
            <i data-lucide="search"></i> Buscar
          </button>
        </div>
        <div id="tg-niche-results" style="margin-top:12px;"></div>
      </div>

      <!-- Groups List -->
      <div class="card" style="padding:20px;margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h3 style="color:#fff;font-size:1rem;">
            <i data-lucide="users" style="width:18px;height:18px;display:inline;vertical-align:middle;margin-right:6px;"></i>
            Seus Grupos
          </h3>
          <button class="btn btn-sm btn-secondary" onclick="TelegramPage.loadGroups()">
            <i data-lucide="refresh-cw"></i>
          </button>
        </div>
        <div id="tg-groups-list">
          <p style="color:var(--text-tertiary);text-align:center;padding:2rem;">Clique em "Atualizar" para carregar grupos</p>
        </div>
      </div>

      <!-- Extraction Results -->
      <div id="tg-extraction-section" style="display:none;">
        <div class="card" style="padding:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h3 style="color:#fff;font-size:1rem;">
              <i data-lucide="download" style="width:18px;height:18px;display:inline;vertical-align:middle;margin-right:6px;"></i>
              Membros Extraídos
            </h3>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-primary" onclick="TelegramPage.exportCSV()">
                <i data-lucide="file-text"></i> Exportar CSV
              </button>
            </div>
          </div>
          <div id="tg-members-list"></div>
        </div>
      </div>
    `;
    lucide.createIcons();
    this.loadNiches();
    this.loadGroups();
  },

  async connect() {
    const token = document.getElementById('tg-bot-token')?.value?.trim();
    if (!token) { showToast('Cole o token do bot', 'warning'); return; }

    try {
      const result = await API.post('/telegram/connect', { botToken: token });
      if (result.ok) {
        this.connected = true;
        this.botInfo = result.bot;
        showToast('Bot conectado com sucesso!', 'success');
        this.renderContent();
      }
    } catch (err) {
      showToast(err.message || 'Erro ao conectar', 'error');
    }
  },

  async disconnect() {
    if (!confirm('Desconectar o bot?')) return;
    try {
      await API.del('/telegram/disconnect');
      this.connected = false;
      this.botInfo = null;
      this.groups = [];
      showToast('Bot desconectado', 'info');
      this.renderContent();
    } catch (err) {
      showToast('Erro: ' + err.message, 'error');
    }
  },

  async loadGroups() {
    try {
      const result = await API.get('/telegram/groups');
      this.groups = result.groups || [];
      this.renderGroups();
    } catch (err) {
      showToast('Erro ao carregar grupos: ' + err.message, 'error');
    }
  },

  renderGroups() {
    const el = document.getElementById('tg-groups-list');
    if (!el) return;

    if (this.groups.length === 0) {
      el.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:2rem;">Nenhum grupo encontrado. Adicione o bot como admin em um grupo e clique em Atualizar.</p>';
      return;
    }

    el.innerHTML = this.groups.map(g => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);margin-bottom:8px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'" onclick="TelegramPage.extractMembers('${g.id}', '${g.name.replace(/'/g, "\\'")}')">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;background:linear-gradient(135deg,#0088cc,#00aaff);border-radius:10px;display:flex;align-items:center;justify-content:center;">
            <i data-lucide="users" style="width:20px;height:20px;color:#fff;"></i>
          </div>
          <div>
            <div style="color:#fff;font-weight:600;font-size:0.9rem;">${g.name}</div>
            <div style="color:var(--text-secondary);font-size:0.75rem;">ID: ${g.id} • ${g.type}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();TelegramPage.extractMembers('${g.id}', '${g.name.replace(/'/g, "\\'")}')">
          <i data-lucide="download"></i> Extrair
        </button>
      </div>
    `).join('');
    lucide.createIcons();
  },

  async extractMembers(chatId, groupName) {
    showToast('Extraindo membros...', 'info');
    try {
      const result = await API.post('/telegram/extract', { chatId, groupName, limit: 500 });
      if (result.ok) {
        this.extractedMembers = result.members;
        this.selectedGroup = { id: chatId, name: groupName };
        showToast(`${result.members.length} membros extraídos!`, 'success');
        this.renderExtractionResults(result);
      }
    } catch (err) {
      showToast('Erro: ' + err.message, 'error');
    }
  },

  renderExtractionResults(result) {
    const section = document.getElementById('tg-extraction-section');
    if (!section) return;
    section.style.display = 'block';

    const list = document.getElementById('tg-members-list');
    list.innerHTML = `
      <div style="margin-bottom:12px;padding:12px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:var(--border-radius-sm);">
        <span style="color:#10b981;font-size:0.85rem;font-weight:600;">${result.note}</span>
      </div>
      <div style="max-height:400px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border-color);">
              <th style="text-align:left;padding:8px;color:var(--text-secondary);font-size:0.75rem;">ID</th>
              <th style="text-align:left;padding:8px;color:var(--text-secondary);font-size:0.75rem;">Username</th>
              <th style="text-align:left;padding:8px;color:var(--text-secondary);font-size:0.75rem;">Nome</th>
            </tr>
          </thead>
          <tbody>
            ${result.members.map(m => `
              <tr style="border-bottom:1px solid var(--border-subtle);">
                <td style="padding:8px;color:var(--text-secondary);font-size:0.8rem;font-family:var(--font-mono);">${m.id}</td>
                <td style="padding:8px;color:var(--accent-primary);font-size:0.8rem;">${m.username ? '@' + m.username : '-'}</td>
                <td style="padding:8px;color:#fff;font-size:0.85rem;">${m.fullName}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async exportCSV() {
    if (!this.extractedMembers.length) { showToast('Nenhum membro para exportar', 'warning'); return; }
    try {
      const res = await fetch('/api/telegram/export-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('nexus_access_token')
        },
        body: JSON.stringify({ members: this.extractedMembers, groupName: this.selectedGroup?.name })
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telegram-members-${this.selectedGroup?.name || 'export'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSV exportado!', 'success');
    } catch (err) {
      showToast('Erro ao exportar: ' + err.message, 'error');
    }
  },

  async loadNiches() {
    try {
      const result = await API.get('/telegram/niches');
      const el = document.getElementById('tg-niches');
      if (!el) return;
      el.innerHTML = result.niches.map(n => `
        <button class="btn btn-sm btn-secondary" onclick="TelegramPage.selectNiche('${n.id}', '${n.keywords.join(',')}')" style="font-size:0.8rem;">
          ${n.icon} ${n.name}
        </button>
      `).join('');
    } catch {}
  },

  selectNiche(nicheId, keywords) {
    const searchEl = document.getElementById('tg-search');
    if (searchEl) searchEl.value = keywords.split(',')[0];
    this.searchNiche();
  },

  async searchNiche() {
    const query = document.getElementById('tg-search')?.value?.trim();
    if (!query) { showToast('Digite uma palavra-chave', 'warning'); return; }

    const el = document.getElementById('tg-niche-results');
    el.innerHTML = `
      <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:var(--border-radius-sm);padding:16px;">
        <h4 style="color:#fff;font-size:0.9rem;margin-bottom:8px;">💡 Como encontrar grupos de "${query}":</h4>
        <ol style="color:var(--text-secondary);font-size:0.8rem;line-height:1.8;padding-left:16px;">
          <li>Abra o Telegram e use a <strong style="color:#fff;">busca</strong> (lupa)</li>
          <li>Pesquise: <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;">${query}</code></li>
          <li>Entre nos grupos relevantes</li>
          <li>Adicione <strong style="color:#fff;">@${this.botInfo?.username || 'seu_bot'}</strong> como <strong style="color:#10b981;">ADMINISTRADOR</strong></li>
          <li>Voltando aqui, clique "Atualizar" e extraia os membros!</li>
        </ol>
      </div>
    `;
  }
};
