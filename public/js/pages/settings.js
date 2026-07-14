// Settings Page
const SettingsPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Configurações';
    document.getElementById('page-subtitle').textContent = 'Configurações do sistema';

    document.getElementById('page-settings').innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3><i data-lucide="key"></i>Google Places API</h3></div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">Configure sua chave para buscas no Google Maps.</p>
          <div class="form-group" style="margin-bottom:1rem;">
            <label>API Key</label>
            <input type="password" id="settings-google-key" placeholder="AIzaSy..." style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);">
          </div>
          <div style="display:flex;gap:0.75rem;">
            <button class="btn btn-primary" onclick="SettingsPage.saveGoogleKey()">Salvar Chave</button>
            <button class="btn btn-secondary" onclick="SettingsPage.clearGoogleKey()">Remover</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3><i data-lucide="bell"></i>Notificações Push</h3></div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">Receba alertas no celular e PC mesmo com o painel fechado. Toque no sininho para ver o histórico.</p>
          <div id="push-status" style="margin-bottom:1rem;padding:0.75rem;border-radius:var(--border-radius-sm);background:rgba(255,255,255,0.03);border:1px solid var(--border-color);">
            <span style="color:var(--text-secondary);font-size:0.85rem;">Verificando status...</span>
          </div>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <button id="btn-push-notifications" class="btn btn-primary" onclick="Notifications.requestPermission()">
              <i data-lucide="bell"></i><span>Ativar Notificações</span>
            </button>
            <button class="btn btn-secondary" onclick="SettingsPage.testPush()">
              <i data-lucide="send"></i><span>Testar</span>
            </button>
            <button class="btn btn-secondary" onclick="NC.open()">
              <i data-lucide="inbox"></i><span>Centro de Notificações</span>
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3><i data-lucide="shield"></i>Alterar Senha</h3></div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">Atualize sua senha de acesso.</p>
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label>Senha Atual</label>
            <input type="password" id="settings-current-pass" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);">
          </div>
          <div class="form-group" style="margin-bottom:1rem;">
            <label>Nova Senha</label>
            <input type="password" id="settings-new-pass" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);">
          </div>
          <button class="btn btn-primary" onclick="SettingsPage.changePassword()">Atualizar Senha</button>
        </div>

        <div class="card">
          <div class="card-header"><h3><i data-lucide="key"></i>API Keys</h3>
            <button class="btn btn-sm btn-primary" onclick="SettingsPage.openApiKeyModal()"><i data-lucide="plus"></i>Nova Key</button>
          </div>
          <div id="apikeys-list"></div>
        </div>

        <div class="card" style="border-color:rgba(244,63,94,0.2);">
          <div class="card-header"><h3 style="color:var(--danger);"><i data-lucide="trash-2"></i>Zona de Perigo</h3></div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">Resete todos os dados do sistema. Esta ação é irreversível.</p>
          <button class="btn btn-danger" onclick="SettingsPage.resetDatabase()"><i data-lucide="alert-triangle"></i>Resetar Banco de Dados</button>
        </div>
      </div>
    `;
    lucide.createIcons();

    // Load saved API key
    const savedKey = localStorage.getItem('nexus_google_key') || '';
    document.getElementById('settings-google-key').value = savedKey;

    await this.loadApiKeys();
    await this.loadPushStatus();
  },

  saveGoogleKey() {
    const key = document.getElementById('settings-google-key').value.trim();
    if (!key) return showToast('Insira uma chave válida', 'warning');
    localStorage.setItem('nexus_google_key', key);
    showToast('Chave salva!', 'success');
  },

  clearGoogleKey() {
    localStorage.removeItem('nexus_google-key');
    document.getElementById('settings-google-key').value = '';
    showToast('Chave removida', 'info');
  },

  async changePassword() {
    const current = document.getElementById('settings-current-pass').value;
    const newPass = document.getElementById('settings-new-pass').value;
    if (!current || !newPass) return showToast('Preencha ambos os campos', 'warning');
    if (newPass.length < 6) return showToast('Nova senha deve ter pelo menos 6 caracteres', 'warning');
    try {
      await API.put('/auth/password', { currentPassword: current, newPassword: newPass });
      showToast('Senha atualizada!', 'success');
      document.getElementById('settings-current-pass').value = '';
      document.getElementById('settings-new-pass').value = '';
    } catch (err) { showToast('Erro: ' + err.message, 'danger'); }
  },

  async loadPushStatus() {
    try {
      const status = await API.get('/push/status');
      const el = document.getElementById('push-status');
      if (el) {
        el.innerHTML = status.enabled
          ? `<span style="color:var(--success);">✓ Notificações ativas (${status.devices} dispositivo${status.devices > 1 ? 's' : ''})</span>`
          : `<span style="color:var(--text-secondary);">Notificações desativadas</span>`;
      }
    } catch {}
    Notifications.updateButton();
  },

  async testPush() {
    try {
      const result = await API.post('/push/test');
      showToast(result.message || 'Notificação de teste enviada!', 'success');
      NC.add('sale', 'Teste de Venda', 'Empresa Tech Solutions — R$ 4.500,00', '/#/financial');
      setTimeout(() => NC.add('commission', 'Comissão Exemplo', 'João Silva — R$ 225,00 por indicação', '/#/financial'), 1500);
      setTimeout(() => NC.add('lead', 'Lead Exemplo', 'Startup Inova — Score: 92 (mineração)', '/#/leads'), 3000);
    } catch (err) {
      showToast('Erro: ' + (err.message || 'Nenhum dispositivo registrado'), 'danger');
    }
  },

  async loadApiKeys() {
    try {
      const data = await API.get('/apikeys');
      const list = document.getElementById('apikeys-list');
      if (data.apiKeys?.length) {
        list.innerHTML = data.apiKeys.map(k => `
          <div class="seller-item">
            <div class="seller-info"><span class="seller-name">${k.name}</span><span class="seller-stats">${k.permissions} · ${k.active ? 'Ativa' : 'Inativa'}</span></div>
            <button class="btn btn-sm btn-danger" onclick="SettingsPage.revokeApiKey('${k.id}')"><i data-lucide="trash-2"></i></button>
          </div>
        `).join('');
      } else {
        list.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:2rem;">Nenhuma API Key</p>';
      }
      lucide.createIcons();
    } catch (err) { console.error(err); }
  },

  openApiKeyModal() {
    Modal.open(
      '<i data-lucide="key" style="color:var(--accent-primary);"></i> Nova API Key',
      `<div class="form-group" style="margin-bottom:1rem;"><label>Nome *</label><input type="text" id="apikey-name" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
      <div class="form-group"><label>Permissões</label><select id="apikey-perms" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;"><option value="read">Leitura</option><option value="write">Leitura + Escrita</option><option value="admin">Administrador</option></select></div>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
       <button class="btn btn-primary" onclick="SettingsPage.createApiKey()"><i data-lucide="plus"></i>Criar</button>`
    );
  },

  async createApiKey() {
    const name = document.getElementById('apikey-name').value.trim();
    const permissions = document.getElementById('apikey-perms').value;
    if (!name) return showToast('Nome é obrigatório', 'warning');
    try {
      const result = await API.post('/apikeys', { name, permissions });
      Modal.close();
      Modal.open(
        '<i data-lucide="key" style="color:var(--success);"></i> API Key Criada!',
        `<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:var(--border-radius-sm);padding:1rem;margin-bottom:1rem;">
          <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.5rem;">SUA CHAVE (guarde!):</p>
          <code style="font-size:1rem;color:var(--success);word-break:break-all;">${result.key}</code>
        </div>
        <p style="font-size:0.8rem;color:var(--text-tertiary);">Esta chave não será mostrada novamente.</p>`,
        `<button class="btn btn-primary" onclick="navigator.clipboard.writeText('${result.key}');showToast('Copiado!','success');Modal.close();"><i data-lucide="copy"></i>Copiar</button>`
      );
      await this.loadApiKeys();
    } catch (err) { showToast('Erro: ' + err.message, 'danger'); }
  },

  async revokeApiKey(id) {
    if (!confirm('Revogar esta API Key?')) return;
    try {
      await API.del(`/apikeys/${id}`);
      showToast('API Key revogada', 'success');
      await this.loadApiKeys();
    } catch (err) { showToast('Erro: ' + err.message, 'danger'); }
  },

  resetDatabase() {
    if (!confirm('ATENÇÃO: Isso apagará TODOS os dados. Tem certeza?')) return;
    if (!confirm('Última chance! Todos os leads, clientes e configurações serão perdidos.')) return;
    showToast('Reset não implementado no backend ainda', 'warning');
  }
};
