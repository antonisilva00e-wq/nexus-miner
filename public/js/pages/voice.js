const VoicePage = {
  async render() {
    document.getElementById('page-title').textContent = 'AI Voice Agent';
    document.getElementById('page-subtitle').textContent = 'Automate your calls with a smart agent';

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
                  <p style="color:var(--text-tertiary);font-size:0.85rem;margin:0;">Status: <span style="color:#10b981;">Ready to configure</span></p>
                </div>
              </div>
              <button class="btn btn-primary" onclick="VoicePage.testCall()" style="background:linear-gradient(135deg, #10b981, #059669);border:none;box-shadow:0 0 15px rgba(16,185,129,0.4);"><i data-lucide="phone-call"></i> Test in Browser</button>
            </div>
            
            <div class="form-group" style="margin-bottom:1.5rem;">
              <label style="color:var(--text-secondary);font-weight:600;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="file-code-2" style="width:16px;"></i> Agent Brain / Prompt</label>
              <textarea id="voice-prompt" class="form-control" style="height:150px;font-family:monospace;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);color:#a5b4fc;font-size:0.9rem;" placeholder="You are the virtual assistant for Nexus Miner..."></textarea>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
              <div class="form-group">
                <label style="color:var(--text-secondary);font-weight:600;">Agent Voice</label>
                <select id="voice-voice" class="form-control" style="background:rgba(0,0,0,0.2);">
                  <option value="male_br">Ricardo (Male BR)</option>
                  <option value="female_br">Camila (Female BR)</option>
                </select>
              </div>
              <div class="form-group">
                <label style="color:var(--text-secondary);font-weight:600;">Language</label>
                <select id="voice-language" class="form-control" style="background:rgba(0,0,0,0.2);">
                  <option value="pt-BR">Portuguese (Brazil)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
            </div>

            <button class="btn btn-primary w-100" onclick="VoicePage.saveConfig()" style="background:linear-gradient(135deg, #6366f1, #4f46e5);border:none;"><i data-lucide="save"></i> Save Settings</button>
          </div>
          
          <!-- Histórico de Chamadas -->
          <div class="card">
            <div class="card-header">
              <h3 style="display:flex;align-items:center;gap:0.5rem;"><i data-lucide="history"></i> Recent Calls</h3>
            </div>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Phone</th>
                    <th>Duration</th>
                    <th>Outcome</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="voice-calls-list">
                  <tr><td colspan="5" style="text-align:center;color:var(--text-tertiary);padding:2rem;">No calls recorded</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Lado Direito: Analytics e Status -->
        <div class="voice-sidebar">
          <div class="card" style="margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;font-size:1rem;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="activity"></i> Voice Analytics</h3>
            <div style="display:grid;gap:1rem;">
              <div style="background:rgba(255,255,255,0.03);padding:1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
                <p style="margin:0;color:var(--text-tertiary);font-size:0.8rem;">Minutes Spoken (Month)</p>
                <h4 style="margin:0;color:white;font-size:1.5rem;" id="voice-stat-minutes">0</h4>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
                <p style="margin:0;color:var(--text-tertiary);font-size:0.8rem;">Calls Answered</p>
                <h4 style="margin:0;color:#10b981;font-size:1.5rem;" id="voice-stat-calls">0</h4>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
                <p style="margin:0;color:var(--text-tertiary);font-size:0.8rem;">Estimated Cost</p>
                <h4 style="margin:0;color:#ef4444;font-size:1.5rem;" id="voice-stat-cost">R$ 0,00</h4>
              </div>
            </div>
          </div>

          <!-- Integração -->
          <div class="card">
            <h3 style="margin-bottom:1rem;font-size:1rem;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="link"></i> Telephony Provider</h3>
            <div class="form-group">
              <label>API Key (Vapi.ai / Bland.ai)</label>
              <input type="password" id="voice-api-key" class="form-control" placeholder="sk-...">
            </div>
            <div class="form-group">
              <label>Agent ID / Number</label>
              <input type="text" id="voice-agent-id" class="form-control" placeholder="agent_...">
            </div>
            <button class="btn btn-sm btn-secondary w-100" onclick="VoicePage.saveProvider()"><i data-lucide="save"></i> Save Integration</button>
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
              <button class="btn btn-sm btn-secondary" onclick="VoicePage.viewTranscript('${c.id}')"><i data-lucide="file-text"></i> Transcript</button>
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
      showToast('Agent settings saved successfully!', 'success');
    } catch (err) {
      showToast('Error saving settings: ' + err.message, 'danger');
    }
  },

  async saveProvider() {
    const providerKey = document.getElementById('voice-api-key').value;
    const agentId = document.getElementById('voice-agent-id').value;

    try {
      await API.post('/voice-agent/provider', { providerKey, agentId });
      showToast('Telephony integration updated!', 'success');
    } catch (err) {
      showToast('Error saving provider: ' + err.message, 'danger');
    }
  },

  testCall() {
    const publicKey = document.getElementById('voice-api-key').value;
    const agentId = document.getElementById('voice-agent-id').value;

    if (!publicKey || !agentId) {
      return showToast('Please fill in the API Key and Agent ID before testing.', 'warning');
    }

    if (!window.Vapi && !this.vapiClass) {
      showToast('Loading voice engine, please wait...', 'info');
      
      if (typeof window.exports === 'undefined') {
        window.exports = {};
      }

      const script = document.createElement('script');
      script.src = '/js/vapi.min.js';
      
      script.onload = () => {
        const globalVapi = window.Vapi || window.vapi || window.exports?.default || window.exports;
        this.vapiClass = globalVapi?.default?.default || globalVapi?.default || globalVapi?.Vapi || globalVapi;

        if (typeof this.vapiClass !== 'function') {
          return showToast('Critical error: The voice package was not initialized correctly. (Not a constructor)', 'danger');
        }
        this.startVapiCall(publicKey, agentId);
      };

      script.onerror = () => {
        showToast('Error loading local Vapi file.', 'danger');
      };

      document.head.appendChild(script);
    } else {
      this.vapiClass = window.Vapi || this.vapiClass;
      this.startVapiCall(publicKey, agentId);
    }
  },

  startVapiCall(publicKey, agentId) {
    try {
      if (!this.vapiInstance) {
        this.vapiInstance = new this.vapiClass(publicKey);

        this.vapiInstance.on('call-start', () => {
          showToast('Call connected! You may speak.', 'success');
          const statusEl = document.getElementById('vapi-status-text');
          if (statusEl) { statusEl.textContent = 'Connected! Speak now...'; statusEl.style.color = '#10b981'; }
        });

        this.vapiInstance.on('call-end', () => {
          showToast('Call ended.', 'info');
          Modal.close();
        });

        this.vapiInstance.on('error', (e) => {
          // Log detalhado no console para debug
          console.error('Vapi Error Object:', e);
          console.error('Vapi Error Type:', typeof e);
          try { console.error('Vapi Error JSON:', JSON.stringify(e, null, 2)); } catch(_) {}

          // Extrair mensagem legivel
          let errorMsg = 'Unknown error';
          try {
            if (typeof e === 'string') {
              errorMsg = e;
            } else if (e && e.message) {
              errorMsg = e.message;
            } else if (e && e.error && e.error.message) {
              errorMsg = e.error.message;
            } else if (e && e.errorMessage) {
              errorMsg = e.errorMessage;
            } else if (e && e.msg) {
              errorMsg = e.msg;
            } else if (e) {
              errorMsg = JSON.stringify(e);
            }
          } catch(_) { errorMsg = 'Error processing Vapi response'; }

          showToast('Vapi Error: ' + errorMsg, 'danger');
          console.warn('[Voice] Dica: Verifique no console F12 o "Vapi Error JSON" para mais detalhes.');
          Modal.close();
        });
      }

      Modal.open(
        '🎙️ WebRTC Test (Browser)',
        `<div style="text-align:center;padding:2rem;">
          <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;margin:0 auto 2rem auto;animation:pulse 2s infinite;box-shadow:0 0 30px rgba(16,185,129,0.4);">
            <i data-lucide="mic" style="color:white;width:40px;height:40px;"></i>
          </div>
          <h3 id="vapi-status-text" style="color:white;margin-bottom:1rem;">Starting call...</h3>
          <p style="color:var(--text-tertiary);margin-bottom:2rem;">Allow microphone access in your browser.</p>
          <button class="btn btn-danger" onclick="VoicePage.endVapiCall()"><i data-lucide="phone-off"></i> Hang up</button>
        </div>`,
        `<button class="btn btn-secondary" onclick="VoicePage.endVapiCall()">Cancel</button>`
      );
      lucide.createIcons();

      const promptText = document.getElementById('voice-prompt')?.value || '';

      // Inicia com o assistente sem overrides - configuracao vem do dashboard Vapi
      // Passar overrides de model causa erro 400 se o assistente usa configuracao diferente
      this.vapiInstance.start(agentId);

    } catch (err) {
      console.error('[Voice] Erro ao iniciar Vapi:', err);
      showToast('Error starting Vapi: ' + (err.message || err), 'danger');
    }
  },

  endVapiCall() {
    if (this.vapiInstance) {
      this.vapiInstance.stop();
    }
    Modal.close();
  },

  async viewTranscript(id) {
    showToast('Loading transcript...', 'info');
  }
};
