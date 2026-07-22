const VoicePage = {
  async render() {
    document.getElementById('page-title').textContent = 'Agente de Voz IA';
    document.getElementById('page-subtitle').textContent = 'Automatize suas ligações com um agente inteligente';

    document.getElementById('page-voice').innerHTML = `
      <div class="voice-dashboard" style="display:grid;gap:1.5rem;grid-template-columns:1fr 350px;">
        <!-- Lado Esquerdo: Configurações do Agente -->
        <div class="voice-main">
          
          <div class="card" style="margin-bottom:1.5rem;background:linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.9)); border:1px solid rgba(99,102,241,0.2); box-shadow:0 0 20px rgba(99,102,241,0.1);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
              <div style="display:flex;align-items:center;gap:1rem;">
                <div style="position:relative;">
                  <div class="pulse-ring"></div>
                  <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg, #6366f1, #8b5cf6);display:flex;align-items:center;justify-content:center;position:relative;z-index:2;box-shadow:0 0 15px rgba(99,102,241,0.5);">
                    <i data-lucide="bot" style="color:white;width:24px;height:24px;"></i>
                  </div>
                </div>
                <div>
                  <h2 style="color:white;font-size:1.25rem;margin:0;text-shadow:0 0 10px rgba(255,255,255,0.2);">Nexus Voice AI</h2>
                  <p style="color:var(--text-tertiary);font-size:0.85rem;margin:0;">Status: <span style="color:#10b981;">Pronto para configurar</span></p>
                </div>
              </div>
              <button class="btn btn-primary" onclick="VoicePage.testCall()" style="background:linear-gradient(135deg, #10b981, #059669);border:none;box-shadow:0 0 15px rgba(16,185,129,0.4);"><i data-lucide="phone-call"></i> Testar no Navegador</button>
            </div>
            
            <div class="form-group" style="margin-bottom:1.5rem;">
              <label style="color:var(--text-secondary);font-weight:600;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="file-code-2" style="width:16px;"></i> Cérebro / Prompt do Agente</label>
              <textarea id="voice-prompt" class="form-control" style="height:150px;font-family:monospace;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);color:#a5b4fc;font-size:0.9rem;" placeholder="Você é o assistente virtual da Nexus Miner..."></textarea>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
              <div class="form-group">
                <label style="color:var(--text-secondary);font-weight:600;">Voz do Agente</label>
                <select id="voice-voice" class="form-control" style="background:rgba(0,0,0,0.2);">
                  <option value="male_br">Ricardo (Masculino BR)</option>
                  <option value="female_br">Camila (Feminino BR)</option>
                </select>
              </div>
              <div class="form-group">
                <label style="color:var(--text-secondary);font-weight:600;">Idioma</label>
                <select id="voice-language" class="form-control" style="background:rgba(0,0,0,0.2);">
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
            </div>

            <button class="btn btn-primary w-100" onclick="VoicePage.saveConfig()" style="background:linear-gradient(135deg, #6366f1, #4f46e5);border:none;"><i data-lucide="save"></i> Salvar Configurações</button>
          </div>
          
          <!-- Histórico de Chamadas -->
          <div class="card">
            <div class="card-header">
              <h3 style="display:flex;align-items:center;gap:0.5rem;"><i data-lucide="history"></i> Últimas Ligações</h3>
            </div>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Telefone</th>
                    <th>Duração</th>
                    <th>Desfecho</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody id="voice-calls-list">
                  <tr><td colspan="5" style="text-align:center;color:var(--text-tertiary);padding:2rem;">Nenhuma ligação registrada</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Lado Direito: Analytics e Status -->
        <div class="voice-sidebar">
          <div class="card" style="margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;font-size:1rem;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="activity"></i> Analytics de Voz</h3>
            <div style="display:grid;gap:1rem;">
              <div style="background:rgba(255,255,255,0.03);padding:1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
                <p style="margin:0;color:var(--text-tertiary);font-size:0.8rem;">Minutos Falados (Mês)</p>
                <h4 style="margin:0;color:white;font-size:1.5rem;" id="voice-stat-minutes">0</h4>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
                <p style="margin:0;color:var(--text-tertiary);font-size:0.8rem;">Ligações Atendidas</p>
                <h4 style="margin:0;color:#10b981;font-size:1.5rem;" id="voice-stat-calls">0</h4>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
                <p style="margin:0;color:var(--text-tertiary);font-size:0.8rem;">Custo Estimado</p>
                <h4 style="margin:0;color:#ef4444;font-size:1.5rem;" id="voice-stat-cost">R$ 0,00</h4>
              </div>
            </div>
          </div>

          <!-- Integração -->
          <div class="card">
            <h3 style="margin-bottom:1rem;font-size:1rem;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="link"></i> Provedor de Telefonia</h3>
            <div class="form-group">
              <label>Chave da API (Vapi.ai / Bland.ai)</label>
              <input type="password" id="voice-api-key" class="form-control" placeholder="sk-...">
            </div>
            <div class="form-group">
              <label>ID do Agente / Número</label>
              <input type="text" id="voice-agent-id" class="form-control" placeholder="agent_...">
            </div>
            <button class="btn btn-sm btn-secondary w-100" onclick="VoicePage.saveProvider()"><i data-lucide="save"></i> Salvar Integração</button>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons();
    this.loadData();
  },

  async loadData() {
    try {
      const data = await API.get('/voice-agent/config');
      if (data) {
        if(data.prompt) document.getElementById('voice-prompt').value = data.prompt;
        if(data.voice) document.getElementById('voice-voice').value = data.voice;
        if(data.language) document.getElementById('voice-language').value = data.language;
        if(data.providerKey) document.getElementById('voice-api-key').value = data.providerKey;
        if(data.agentId) document.getElementById('voice-agent-id').value = data.agentId;
      }

      const calls = await API.get('/voice-agent/calls');
      const list = document.getElementById('voice-calls-list');
      if (calls && calls.length > 0) {
        list.innerHTML = calls.map(c => `
          <tr>
            <td style="color:var(--text-secondary);">${new Date(c.created_at).toLocaleString('pt-BR')}</td>
            <td>${c.phone}</td>
            <td>${c.duration}s</td>
            <td><span class="badge ${c.outcome === 'success' ? 'badge-primary' : 'badge-secondary'}">${c.outcome}</span></td>
            <td>
              <button class="btn btn-sm btn-secondary" onclick="VoicePage.viewTranscript('${c.id}')"><i data-lucide="file-text"></i> Transcrição</button>
            </td>
          </tr>
        `).join('');
      }
      lucide.createIcons();
    } catch (err) {
      console.warn('Rotas de voz ainda não implementadas no backend');
    }
  },

  async saveConfig() {
    const prompt = document.getElementById('voice-prompt').value;
    const voice = document.getElementById('voice-voice').value;
    const language = document.getElementById('voice-language').value;

    try {
      await API.post('/voice-agent/config', { prompt, voice, language });
      showToast('Configurações do Agente salvas com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao salvar configurações: ' + err.message, 'danger');
    }
  },

  async saveProvider() {
    const providerKey = document.getElementById('voice-api-key').value;
    const agentId = document.getElementById('voice-agent-id').value;

    try {
      await API.post('/voice-agent/provider', { providerKey, agentId });
      showToast('Integração de telefonia atualizada!', 'success');
    } catch (err) {
      showToast('Erro ao salvar provedor: ' + err.message, 'danger');
    }
  },

  testCall() {
    const publicKey = document.getElementById('voice-api-key').value;
    const agentId = document.getElementById('voice-agent-id').value;

    if (!publicKey || !agentId) {
      return showToast('Por favor, preencha a Chave da API e o ID do Agente antes de testar.', 'warning');
    }

    if (!window.Vapi && !this.vapiClass) {
      showToast('Carregando motor de voz, aguarde...', 'info');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/vapi.min.js';
      script.onload = () => {
        // vapi.min.js usually exports window.vapi or window.Vapi
        this.vapiClass = window.Vapi || window.vapi;
        if (!this.vapiClass) {
          return showToast('Erro crítico: O pacote de voz não foi carregado corretamente.', 'danger');
        }
        this.startVapiCall(publicKey, agentId);
      };
      script.onerror = () => showToast('Erro ao baixar motor de voz. Verifique sua conexão.', 'danger');
      document.head.appendChild(script);
    } else {
      this.vapiClass = window.Vapi || window.vapi || this.vapiClass;
      this.startVapiCall(publicKey, agentId);
    }
  },

  startVapiCall(publicKey, agentId) {
    try {
      if (!this.vapiInstance) {
        this.vapiInstance = new this.vapiClass(publicKey);
        
        this.vapiInstance.on('call-start', () => {
          showToast('Chamada conectada! Pode falar.', 'success');
          document.getElementById('vapi-status-text').textContent = 'Conectado! Fale agora...';
          document.getElementById('vapi-status-text').style.color = '#10b981';
        });

        this.vapiInstance.on('call-end', () => {
          showToast('Chamada encerrada.', 'info');
          Modal.close();
        });

        this.vapiInstance.on('error', (e) => {
          console.error(e);
          showToast('Erro no Vapi: ' + (e.message || 'Verifique suas chaves'), 'danger');
          Modal.close();
        });
      }

      Modal.open(
        '🎙️ Teste WebRTC (Navegador)',
        `<div style="text-align:center;padding:2rem;">
          <div class="pulse-ring" style="margin:0 auto 2rem auto;position:relative;">
            <div style="width:80px;height:80px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;position:relative;z-index:2;margin:0 auto;animation:pulse 2s infinite;">
              <i data-lucide="mic" style="color:white;width:40px;height:40px;"></i>
            </div>
          </div>
          <h3 id="vapi-status-text" style="color:white;margin-bottom:1rem;">Iniciando chamada...</h3>
          <p style="color:var(--text-tertiary);margin-bottom:2rem;">Por favor, permita o acesso ao microfone no seu navegador.</p>
          <button class="btn btn-danger" onclick="VoicePage.endVapiCall()"><i data-lucide="phone-off"></i> Desligar</button>
         </div>`,
        `<button class="btn btn-secondary" onclick="VoicePage.endVapiCall()">Cancelar</button>`
      );
      lucide.createIcons();

      // Start the call
      this.vapiInstance.start(agentId);
      
    } catch (err) {
      showToast('Erro ao iniciar Vapi: ' + err.message, 'danger');
    }
  },

  endVapiCall() {
    if (this.vapiInstance) {
      this.vapiInstance.stop();
    }
    Modal.close();
  },

  async viewTranscript(id) {
    showToast('Carregando transcrição...', 'info');
  }
};
