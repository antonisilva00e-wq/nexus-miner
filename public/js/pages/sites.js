const SitesPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Criador Inteligente de Landing Pages';
    document.getElementById('page-subtitle').textContent = 'Crie páginas profissionais com Inteligência Artificial em menos de 30 segundos.';
    
    // Create Top Bar buttons
    const titleContainer = document.getElementById('page-title').parentElement.parentElement;
    let extraActions = document.getElementById('sites-extra-actions');
    if (!extraActions) {
      extraActions = document.createElement('div');
      extraActions.id = 'sites-extra-actions';
      extraActions.style.display = 'flex';
      extraActions.style.gap = '10px';
      extraActions.style.marginLeft = 'auto';
      titleContainer.style.display = 'flex';
      titleContainer.style.alignItems = 'center';
      titleContainer.appendChild(extraActions);
    }
    extraActions.innerHTML = `
      <button class="btn btn-secondary" onclick="SitesPage.switchTab('list')" id="btn-tab-list" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
        <i data-lucide="layout"></i> Meus Sites
      </button>
      <button class="btn btn-primary" onclick="SitesPage.switchTab('new')" id="btn-tab-new" style="background: #8b5cf6; color: #fff; padding: 8px 16px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px; border:none;">
        <i data-lucide="plus"></i> Novo Projeto
      </button>
    `;
    
    const container = document.getElementById('page-sites');
    if (!container) return;

    container.innerHTML = `
      <div id="sites-view-new">
      <style>
        .sites-split {
          display: flex;
          height: calc(100vh - 160px);
          gap: 24px;
        }
        .sites-form {
          width: 450px;
          background: #0f111a;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        .sites-form::-webkit-scrollbar { width: 6px; }
        .sites-form::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .sites-preview {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #0f111a;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          overflow: hidden;
        }
        .form-section {
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .form-section h3 {
          font-size: 0.9rem;
          color: #fff;
          margin: 0 0 16px 0;
          font-weight: 600;
        }
        .form-row {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }
        .form-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.6);
        }
        .form-group input, .form-group select, .form-group textarea {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          border-color: #8b5cf6;
        }
        
        /* Pills */
        .pill-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pill {
          padding: 6px 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          transition: all 0.2s;
        }
        .pill:hover {
          background: rgba(255,255,255,0.1);
        }
        .pill.active {
          background: #8b5cf6;
          border-color: #8b5cf6;
          color: #fff;
        }

        /* Color Picker */
        .color-circles {
          display: flex;
          gap: 8px;
        }
        .color-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
        }
        .color-circle.active {
          border-color: #fff;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.3);
        }
        
        /* Toggle Switch */
        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .toggle-row span {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.8);
        }
        .toggle-switch {
          position: relative;
          width: 32px;
          height: 18px;
          background: #8b5cf6;
          border-radius: 10px;
          cursor: pointer;
        }
        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          background: #fff;
          border-radius: 50%;
          transition: 0.2s;
        }
        .toggle-switch.off {
          background: rgba(255,255,255,0.2);
        }
        .toggle-switch.off::after {
          right: 16px;
        }

        /* Browser Mockup */
        .browser-header {
          background: #1a1d27;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .mac-dots {
          display: flex;
          gap: 6px;
        }
        .mac-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .url-bar {
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
          padding: 6px 16px;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .browser-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .device-toggle {
          display: flex;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
          overflow: hidden;
        }
        .device-btn {
          padding: 8px 12px;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .device-btn.active {
          background: rgba(139,92,246,0.2);
          color: #8b5cf6;
        }
        
        .preview-canvas {
          flex: 1;
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #1e293b;
          text-align: center;
          padding: 20px 40px;
          overflow-y: auto;
        }
        
        .progress-bar-container {
          background: #1a1d27;
          padding: 20px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
      </style>

      <div class="sites-split">
        <!-- LEFT COLUMN: FORM -->
        <div class="sites-form">
          <!-- Sec 1: Project Info -->
          <div class="form-section">
            <h3>Informações do Projeto</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Nome da Empresa</label>
                <input type="text" placeholder="Ex: NexusMiner">
              </div>
              <div class="form-group">
                <label>Segmento</label>
                <select>
                  <option>Selecione o segmento</option>
                  <option>Tecnologia / SaaS</option>
                  <option>Consultoria</option>
                  <option>Varejo</option>
                  <option>Saúde</option>
                </select>
              </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label>Descrição e Comandos Especiais para a IA</label>
              <textarea rows="3" placeholder="Ex: Crie o site na cor vermelha, adicione botão do WhatsApp flutuante, e foque em vendas diretas..."></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Público-Alvo</label>
                <input type="text" placeholder="Ex: Empresários, clínicas...">
              </div>
              <div class="form-group">
                <label>Cidade / Estado</label>
                <input type="text" placeholder="Ex: São Paulo / SP">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Telefone</label>
                <input type="text" placeholder="(11) 00000-0000">
              </div>
              <div class="form-group">
                <label>WhatsApp</label>
                <div style="position:relative;">
                  <input type="text" placeholder="(11) 00000-0000" style="width:100%;">
                  <i data-lucide="message-circle" style="position:absolute;right:10px;top:10px;width:14px;height:14px;color:#8b5cf6;"></i>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>E-mail</label>
                <input type="email" placeholder="contato@empresa.com.br">
              </div>
              <div class="form-group">
                <label>Site opcional</label>
                <input type="text" placeholder="https://www.empresa.com.br">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Instagram</label>
                <div style="position:relative;">
                  <input type="text" placeholder="@empresa" style="width:100%;">
                  <i data-lucide="instagram" style="position:absolute;right:10px;top:10px;width:14px;height:14px;color:rgba(255,255,255,0.4);"></i>
                </div>
              </div>
              <div class="form-group">
                <label>Facebook</label>
                <div style="position:relative;">
                  <input type="text" placeholder="/empresa" style="width:100%;">
                  <i data-lucide="facebook" style="position:absolute;right:10px;top:10px;width:14px;height:14px;color:rgba(255,255,255,0.4);"></i>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex:0.6;">
                <label>Cores da Marca</label>
                <div class="color-circles" style="margin-top:4px;">
                  <div class="color-circle active" style="background: #8b5cf6;"></div>
                  <div class="color-circle" style="background: #3b82f6;"></div>
                  <div class="color-circle" style="background: #10b981;"></div>
                  <div class="color-circle" style="background: #f59e0b;"></div>
                  <div class="color-circle" style="background: #ef4444;"></div>
                  <div class="color-circle" style="background: #1e293b; border: 1px solid rgba(255,255,255,0.2);"></div>
                  <div class="color-circle" style="background: rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center;">
                    <i data-lucide="plus" style="width:12px;height:12px;color:#fff;"></i>
                  </div>
                </div>
              </div>
              <div class="form-group" style="flex:1;">
                <label>Logo</label>
                <div style="background:rgba(255,255,255,0.03); border:1px dashed rgba(255,255,255,0.2); border-radius:6px; padding:10px; text-align:center; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                  <i data-lucide="upload-cloud" style="width:16px;height:16px;color:rgba(255,255,255,0.5);"></i>
                  <span style="font-size:0.75rem;color:rgba(255,255,255,0.5);">Arraste ou clique para enviar<br>(Max 2MB, .png ou .svg)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sec 2: Style -->
          <div class="form-section">
            <h3>Estilo da Landing Page</h3>
            <div class="pill-group">
              <div class="pill active">Moderno</div>
              <div class="pill">Minimalista</div>
              <div class="pill">Elegante</div>
              <div class="pill">Premium</div>
              <div class="pill">Escuro</div>
              <div class="pill">Claro</div>
              <div class="pill">Corporativo</div>
            </div>
          </div>

          <!-- Sec 3: Objective -->
          <div class="form-section">
            <h3>Objetivo</h3>
            <div class="pill-group">
              <div class="pill active">Captar Leads</div>
              <div class="pill">Vender Produto</div>
              <div class="pill">Agendar Atendimento</div>
              <div class="pill">WhatsApp</div>
              <div class="pill">Catálogo</div>
              <div class="pill">Portfólio</div>
            </div>
          </div>

          <!-- Sec 4: AI Toggles -->
          <div class="form-section">
            <h3>Inteligência Artificial</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <div class="toggle-row"><span>Criar textos automaticamente</span><div class="toggle-switch"></div></div>
                <div class="toggle-row"><span>Gerar imagens IA</span><div class="toggle-switch"></div></div>
                <div class="toggle-row"><span>SEO automático</span><div class="toggle-switch"></div></div>
                <div class="toggle-row"><span>Botão WhatsApp</span><div class="toggle-switch"></div></div>
                <div class="toggle-row"><span>Google Maps</span><div class="toggle-switch"></div></div>
              </div>
              <div>
                <div class="toggle-row"><span>CRM inteligente</span><div class="toggle-switch"></div></div>
                <div class="toggle-row"><span>Depoimentos IA</span><div class="toggle-switch"></div></div>
                <div class="toggle-row"><span>Animações</span><div class="toggle-switch"></div></div>
                <div class="toggle-row"><span>Modo Responsivo</span><div class="toggle-switch"></div></div>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div style="padding: 20px;">
            <button class="btn btn-primary" onclick="SitesPage.generateSite()" style="width: 100%; background: #8b5cf6; border:none; padding: 14px; border-radius: 8px; font-weight: 700; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <i data-lucide="zap"></i> Gerar Landing Page com IA
            </button>
          </div>
        </div>

        <!-- RIGHT COLUMN: PREVIEW -->
        <div class="sites-preview">
          
          <!-- Browser Chrome -->
          <div class="browser-header">
            <div class="mac-dots">
              <div class="mac-dot" style="background: #ef4444;"></div>
              <div class="mac-dot" style="background: #f59e0b;"></div>
              <div class="mac-dot" style="background: #10b981;"></div>
            </div>
            
            <div class="url-bar">
              <i data-lucide="lock" style="width:12px;height:12px;"></i>
              preview.nexusminer.app
            </div>
            
            <div class="browser-controls">
              <div class="device-toggle">
                <div class="device-btn active" title="Desktop"><i data-lucide="monitor" style="width:16px;height:16px;"></i></div>
                <div class="device-btn" title="Tablet"><i data-lucide="tablet" style="width:16px;height:16px;"></i></div>
                <div class="device-btn" title="Mobile"><i data-lucide="smartphone" style="width:16px;height:16px;"></i></div>
              </div>
              <span style="font-size:0.75rem;color:rgba(255,255,255,0.5);">100%</span>
              <i data-lucide="rotate-cw" style="width:16px;height:16px;color:rgba(255,255,255,0.5);cursor:pointer;"></i>
              <i data-lucide="external-link" style="width:16px;height:16px;color:rgba(255,255,255,0.5);cursor:pointer;"></i>
            </div>
          </div>

          <!-- White Canvas -->
          <div class="preview-canvas">
            <div style="max-width: 600px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
              
              <!-- Mockup Graphic -->
              <div style="position:relative; width: 100%; max-height: 240px; min-height: 180px; flex: 1; background: rgba(139,92,246,0.05); border-radius: 12px; margin-bottom: 24px; display:flex; align-items:center; justify-content:center;">
                <!-- Abstract UI blocks -->
                <div style="width: 75%; height: 65%; background: #fff; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05); display:flex; flex-direction:column; overflow:hidden;">
                  <div style="height: 20px; background: rgba(139,92,246,0.1); border-bottom: 1px solid rgba(139,92,246,0.1); display:flex; align-items:center; padding:0 10px; gap:4px;">
                    <div style="width:5px;height:5px;border-radius:50%;background:rgba(139,92,246,0.3);"></div>
                    <div style="width:5px;height:5px;border-radius:50%;background:rgba(139,92,246,0.3);"></div>
                    <div style="width:5px;height:5px;border-radius:50%;background:rgba(139,92,246,0.3);"></div>
                  </div>
                  <div style="flex:1; padding:16px; display:flex; gap:16px;">
                    <div style="flex:1; background: rgba(139,92,246,0.1); border-radius:6px; display:flex; align-items:center; justify-content:center;">
                      <i data-lucide="image" style="width:24px;height:24px;color:rgba(139,92,246,0.4);"></i>
                    </div>
                    <div style="flex:1; display:flex; flex-direction:column; gap:10px; justify-content:center;">
                      <div style="height:10px; width:80%; background:rgba(0,0,0,0.05); border-radius:4px;"></div>
                      <div style="height:6px; width:100%; background:rgba(0,0,0,0.03); border-radius:4px;"></div>
                      <div style="height:6px; width:60%; background:rgba(0,0,0,0.03); border-radius:4px;"></div>
                      <div style="height:20px; width:40%; background: rgba(139,92,246,0.2); border-radius:10px; margin-top:6px;"></div>
                    </div>
                  </div>
                </div>
                <!-- Little floating element -->
                <div style="position:absolute; right: 8%; top: 35%; width: 40px; height: 40px; background: #fff; border-radius: 50%; box-shadow: 0 10px 20px rgba(0,0,0,0.05); display:flex; align-items:center; justify-content:center;">
                  <div style="width:12px;height:12px;border-radius:50%;background:rgba(139,92,246,0.1);"></div>
                </div>
              </div>

              <!-- Typography -->
              <h2 style="font-size: 1.6rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; font-family: var(--font-heading);">
                Sua Landing Page aparecerá aqui.
              </h2>
              <p style="font-size: 1rem; color: #64748b; margin: 0 0 32px 0; max-width: 440px; margin-inline: auto;">
                Preencha as informações ao lado e clique em <strong style="color: #8b5cf6;">Gerar Landing Page com IA</strong> para começar.
              </p>

              <!-- Features -->
              <div style="display:flex; justify-content: space-between; gap: 16px;">
                <div style="flex:1; text-align:center;">
                  <div style="width:40px;height:40px;border-radius:50%;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <i data-lucide="sparkles" style="width:18px;height:18px;color:#8b5cf6;"></i>
                  </div>
                  <h4 style="font-size:0.85rem;font-weight:700;color:#1e293b;margin:0 0 6px;">IA Avançada</h4>
                  <p style="font-size:0.75rem;color:#64748b;margin:0;">Textos, imagens e estrutura criados pela IA.</p>
                </div>
                <div style="flex:1; text-align:center;">
                  <div style="width:40px;height:40px;border-radius:50%;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <i data-lucide="zap" style="width:18px;height:18px;color:#8b5cf6;"></i>
                  </div>
                  <h4 style="font-size:0.85rem;font-weight:700;color:#1e293b;margin:0 0 6px;">Rápido e Inteligente</h4>
                  <p style="font-size:0.75rem;color:#64748b;margin:0;">Um site completo criado em 30 segundos.</p>
                </div>
                <div style="flex:1; text-align:center;">
                  <div style="width:40px;height:40px;border-radius:50%;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <i data-lucide="bar-chart-2" style="width:18px;height:18px;color:#8b5cf6;"></i>
                  </div>
                  <h4 style="font-size:0.85rem;font-weight:700;color:#1e293b;margin:0 0 6px;">Otimizado p/ Conversão</h4>
                  <p style="font-size:0.75rem;color:#64748b;margin:0;">SEO e gatilhos focados em vendas e leads.</p>
                </div>
              </div>

            </div>
          </div>

          <!-- Progress Bar Footer -->
          <div class="progress-bar-container">
            <p style="font-size:0.75rem; color:rgba(255,255,255,0.7); margin: 0 0 12px 0; font-weight:600;">Progresso da Geração</p>
            <div style="display:flex; align-items:center; justify-content:space-between; position:relative;">
              
              <!-- Background line -->
              <div style="position:absolute; top:35%; left:20px; right:20px; height:2px; background:rgba(255,255,255,0.1); transform:translateY(-50%); z-index:1;"></div>
              
              <!-- Steps -->
              <div style="display:flex; flex-direction:column; align-items:center; gap:8px; z-index:2;">
                <div style="width:24px;height:24px;border-radius:50%;background:#8b5cf6;border:4px solid #1a1d27;display:flex;align-items:center;justify-content:center;">
                  <div style="width:6px;height:6px;border-radius:50%;background:#fff;"></div>
                </div>
                <span style="font-size:0.65rem;color:#8b5cf6;font-weight:600;">Coletar dados</span>
              </div>
              
              <div style="display:flex; flex-direction:column; align-items:center; gap:8px; z-index:2;">
                <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.1);border:4px solid #1a1d27;"></div>
                <span style="font-size:0.65rem;color:rgba(255,255,255,0.4);">Gerando textos</span>
              </div>
              
              <div style="display:flex; flex-direction:column; align-items:center; gap:8px; z-index:2;">
                <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.1);border:4px solid #1a1d27;"></div>
                <span style="font-size:0.65rem;color:rgba(255,255,255,0.4);">Criando imagens</span>
              </div>
              
              <div style="display:flex; flex-direction:column; align-items:center; gap:8px; z-index:2;">
                <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.1);border:4px solid #1a1d27;"></div>
                <span style="font-size:0.65rem;color:rgba(255,255,255,0.4);">Otimizando SEO</span>
              </div>

              <div style="display:flex; flex-direction:column; align-items:center; gap:8px; z-index:2;">
                <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.1);border:4px solid #1a1d27;"></div>
                <span style="font-size:0.65rem;color:rgba(255,255,255,0.4);">Finalizando...</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    `;
    
    // Add interactive logic for pills, colors, and toggles
    document.querySelectorAll('.pill').forEach(p => {
      p.addEventListener('click', (e) => {
        const group = e.target.closest('.pill-group');
        group.querySelectorAll('.pill').forEach(el => el.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    document.querySelectorAll('.color-circle').forEach(c => {
      c.addEventListener('click', (e) => {
        document.querySelectorAll('.color-circle').forEach(el => el.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    document.querySelectorAll('.toggle-switch').forEach(t => {
      t.addEventListener('click', (e) => {
        e.target.classList.toggle('off');
      });
    });

    document.querySelectorAll('.device-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.device-btn').forEach(el => el.classList.remove('active'));
        e.target.closest('.device-btn').classList.add('active');
      });
    });

    lucide.createIcons();
  },
  switchTab(tab) {
    document.getElementById('sites-view-new').style.display = (tab === 'new') ? 'block' : 'none';
    document.getElementById('sites-view-list').style.display = (tab === 'list') ? 'block' : 'none';
    document.getElementById('btn-tab-new').style.opacity = (tab === 'new') ? '1' : '0.5';
    document.getElementById('btn-tab-list').style.opacity = (tab === 'list') ? '1' : '0.5';
    if (tab === 'list') {
      this.loadMySites();
    }
  },

  async loadMySites() {
    const container = document.getElementById('my-sites-grid');
    container.innerHTML = '<div style="color: #94a3b8;">Carregando seus sites...</div>';
    try {
      const data = await API.get('/sites');
      if (!data.sites || data.sites.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8;">Nenhum site criado ainda. Clique em Novo Projeto!</div>';
        return;
      }
      container.innerHTML = data.sites.map(s => `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 10px;">
          <h4 style="margin: 0; color: #fff;">${s.name}</h4>
          <p style="color: #94a3b8; font-size: 0.9rem; margin: 0;">${s.description || 'Sem descrição'}</p>
          <a href="http://${s.slug}.nexusminer.app" target="_blank" style="color: #8b5cf6; text-decoration: none; font-size: 0.9rem; font-weight: bold; margin-top: auto;"><i data-lucide="external-link" style="width:14px;height:14px;vertical-align:middle;"></i> Acessar Link</a>
        </div>
      `).join('');
      if (window.lucide) lucide.createIcons();
    } catch(e) {
      container.innerHTML = '<div style="color: #ef4444;">Erro ao carregar sites.</div>';
    }
  },
  
  async generateSite() {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader" class="fa-spin"></i> Gerando (Pode levar 1 minuto)...';
    btn.style.opacity = '0.7';
    btn.disabled = true;
    if (window.lucide) lucide.createIcons();

    // Get input values correctly by index based on the form structure
    const formInputs = document.querySelectorAll('.sites-form input, .sites-form select, .sites-form textarea');
    
    const name = formInputs[0]?.value || 'Meu Novo Negócio';
    const segment = formInputs[1]?.value || 'SaaS';
    const desc = formInputs[2]?.value || 'Site incrível gerado pela IA.';
    const targetAudience = formInputs[3]?.value || '';
    const cityState = formInputs[4]?.value || '';
    const phone = formInputs[5]?.value || '';
    const whatsapp = formInputs[6]?.value || '';
    const email = formInputs[7]?.value || '';
    const website = formInputs[8]?.value || '';
    const instagram = formInputs[9]?.value || '';
    const facebook = formInputs[10]?.value || '';

    const style = document.querySelector('.pill-group .pill.active')?.textContent || 'Moderno';
    const color = document.querySelector('.color-circle.active')?.style.backgroundColor || '#8b5cf6';
    const objective = document.querySelectorAll('.pill-group')[1]?.querySelector('.active')?.textContent || 'Leads';

    const payload = {
      name,
      description: desc,
      services: segment,
      diff: objective,
      colors: color,
      prompt: style,
      contact: { targetAudience, cityState, phone, whatsapp, email, website, instagram, facebook }
    };

    showToast('Iniciando IA... conectando servidores.', 'info');

    // Setup Progress Bar Animation
    const stepTexts = Array.from(document.querySelectorAll('.progress-bar-container span'));
    const progressSteps = stepTexts.map(span => span.previousElementSibling);
    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length - 1) {
        // Deactivate previous
        if (currentStep > 0) {
          progressSteps[currentStep].style.background = '#8b5cf6';
          progressSteps[currentStep].innerHTML = '<i data-lucide="check" style="width:12px;height:12px;color:#fff;"></i>';
          stepTexts[currentStep].style.color = '#8b5cf6';
        }
        // Activate next
        currentStep++;
        progressSteps[currentStep].style.background = '#8b5cf6';
        progressSteps[currentStep].innerHTML = '<div style="width:6px;height:6px;border-radius:50%;background:#fff;"></div>';
        stepTexts[currentStep].style.color = '#8b5cf6';
        if (window.lucide) lucide.createIcons();
      }
    }, 4500); // Progress advances every 4.5s while waiting

    try {
      const data = await API.post('/sites/generate', payload);

      clearInterval(progressInterval);

      // Finish all progress steps
      progressSteps.forEach((step, idx) => {
        step.style.background = '#10b981';
        step.innerHTML = '<i data-lucide="check" style="width:12px;height:12px;color:#fff;"></i>';
        stepTexts[idx].style.color = '#10b981';
      });
      if (window.lucide) lucide.createIcons();

      showToast('Site gerado com sucesso!', 'success');

      // Update URL bar
      const urlBar = document.querySelector('.url-bar');
      if (urlBar) {
        urlBar.innerHTML = '<i data-lucide="lock" style="width:12px;height:12px;color:#10b981;"></i> ' + data.slug + '.nexusminer.app';
      }

      // Replace Preview Canvas with iframe
      const canvas = document.querySelector('.preview-canvas');
      canvas.style.padding = '0';
      canvas.style.overflow = 'hidden';
      canvas.innerHTML = `
        <iframe 
          id="site-preview-iframe"
          style="width: 100%; height: 100%; border: none; background: #fff; transition: width 0.3s;" 
          sandbox="allow-scripts allow-same-origin"
          srcdoc="${data.html.replace(/"/g, '&quot;')}">
        </iframe>
      </div>
      <div id="sites-view-list" style="display: none; padding: 20px;">
        <div id="my-sites-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;"></div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

      // Make device toggles actually resize the iframe!
      document.querySelectorAll('.device-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const device = e.currentTarget.getAttribute('title');
          const iframe = document.getElementById('site-preview-iframe');
          if (!iframe) return;
          
          if (device === 'Mobile') {
            iframe.style.width = '375px';
            iframe.style.borderLeft = '1px solid rgba(0,0,0,0.1)';
            iframe.style.borderRight = '1px solid rgba(0,0,0,0.1)';
            iframe.style.margin = '0 auto';
          } else if (device === 'Tablet') {
            iframe.style.width = '768px';
            iframe.style.borderLeft = '1px solid rgba(0,0,0,0.1)';
            iframe.style.borderRight = '1px solid rgba(0,0,0,0.1)';
            iframe.style.margin = '0 auto';
          } else {
            iframe.style.width = '100%';
            iframe.style.border = 'none';
            iframe.style.margin = '0';
          }
        });
      });

    } catch (error) {
      clearInterval(progressInterval);
      console.error(error);
      showToast('Erro ao gerar o site: ' + error.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.style.opacity = '1';
      btn.disabled = false;
    }
  }
};
