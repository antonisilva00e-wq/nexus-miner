// Intelligence Page - Market Intelligence Dashboard
const IntelligencePage = {
  async render() {
    document.getElementById('page-title').textContent = 'Inteligencia de Mercado';
    document.getElementById('page-subtitle').textContent = 'Analise competitiva e insights de mercado em tempo real';

    document.getElementById('page-intelligence').innerHTML = `
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);display:flex;align-items:center;justify-content:center;"><i data-lucide="brain" style="color:white;width:20px;height:20px;"></i></div>
          <div><h3 style="color:white;font-size:1.1rem;">Visao Geral do Mercado</h3><p style="color:var(--text-tertiary);font-size:0.8rem;">Insights automaticos baseados nos seus dados</p></div>
        </div>
        <div id="intelligence-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;"></div>
      </div>

      <div id="intelligence-insights" style="margin-bottom:1.5rem;"></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
        <div class="card">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(139,92,246,0.15);display:flex;align-items:center;justify-content:center;"><i data-lucide="map-pin" style="color:#8b5cf6;width:16px;height:16px;"></i></div>
            <h3 style="color:white;font-size:0.95rem;">Leads por Cidade</h3>
          </div>
          <div id="intel-cities"></div>
        </div>

        <div class="card">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(245,158,11,0.15);display:flex;align-items:center;justify-content:center;"><i data-lucide="briefcase" style="color:#f59e0b;width:16px;height:16px;"></i></div>
            <h3 style="color:white;font-size:0.95rem;">Leads por Atividade</h3>
          </div>
          <div id="intel-activities"></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(16,185,129,0.15);display:flex;align-items:center;justify-content:center;"><i data-lucide="target" style="color:#10b981;width:16px;height:16px;"></i></div>
          <h3 style="color:white;font-size:0.95rem;">Top Nichos por Conversao</h3>
        </div>
        <div id="intel-niches"></div>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(59,130,246,0.15);display:flex;align-items:center;justify-content:center;"><i data-lucide="trending-up" style="color:#3b82f6;width:16px;height:16px;"></i></div>
          <h3 style="color:white;font-size:0.95rem;">Crescimento Mensal</h3>
        </div>
        <div id="intel-growth"></div>
      </div>
    `;
    lucide.createIcons();

    this.loadData();
  },

  async loadData() {
    try {
      const data = await API.get('/intelligence/dashboard');

      // Stats
      const statsEl = document.getElementById('intelligence-stats');
      if (statsEl) {
        statsEl.innerHTML = `
          <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.12);border-radius:var(--border-radius-md);padding:1rem;">
            <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">Total Leads</p>
            <p style="color:white;font-size:1.5rem;font-weight:700;margin:0;">${data.overview.totalLeads}</p>
          </div>
          <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.12);border-radius:var(--border-radius-md);padding:1rem;">
            <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">Clientes Ativos</p>
            <p style="color:#10b981;font-size:1.5rem;font-weight:700;margin:0;">${data.overview.activeClients}</p>
          </div>
          <div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.12);border-radius:var(--border-radius-md);padding:1rem;">
            <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">Taxa Conversao</p>
            <p style="color:#8b5cf6;font-size:1.5rem;font-weight:700;margin:0;">${data.overview.conversionRate}%</p>
          </div>
          <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.12);border-radius:var(--border-radius-md);padding:1rem;">
            <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">MRR</p>
            <p style="color:#f59e0b;font-size:1.5rem;font-weight:700;margin:0;">R$ ${data.overview.mrr.toLocaleString('pt-BR')}</p>
          </div>
        `;
      }

      // Insights
      const insightsEl = document.getElementById('intelligence-insights');
      if (insightsEl && data.insights) {
        insightsEl.innerHTML = `
          <div class="card">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
              <div style="width:32px;height:32px;border-radius:8px;background:rgba(245,158,11,0.15);display:flex;align-items:center;justify-content:center;"><i data-lucide="lightbulb" style="color:#f59e0b;width:16px;height:16px;"></i></div>
              <h3 style="color:white;font-size:0.95rem;">Insights da IA</h3>
            </div>
            <div style="display:grid;gap:0.75rem;">
              ${data.insights.map(i => `
                <div style="display:flex;align-items:start;gap:0.75rem;padding:0.75rem;background:rgba(${i.priority === 'high' ? '239,68,68' : i.priority === 'medium' ? '245,158,11' : '16,185,129'},0.06);border:1px solid rgba(${i.priority === 'high' ? '239,68,68' : i.priority === 'medium' ? '245,158,11' : '16,185,129'},0.12);border-radius:8px;">
                  <i data-lucide="${i.icon}" style="width:18px;height:18px;color:${i.priority === 'high' ? '#ef4444' : i.priority === 'medium' ? '#f59e0b' : '#10b981'};flex-shrink:0;margin-top:2px;"></i>
                  <div>
                    <p style="color:white;font-size:0.88rem;font-weight:500;margin:0;">${i.title}</p>
                    <p style="color:var(--text-secondary);font-size:0.8rem;margin:4px 0 0;">${i.description}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Cities
      const citiesEl = document.getElementById('intel-cities');
      if (citiesEl && data.leadsByCity) {
        const maxCity = Math.max(...data.leadsByCity.map(c => c.count));
        citiesEl.innerHTML = data.leadsByCity.slice(0, 8).map(c => `
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
            <span style="color:var(--text-secondary);font-size:0.8rem;width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.city}</span>
            <div style="flex:1;height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${(c.count / maxCity) * 100}%;background:linear-gradient(90deg,#8b5cf6,#6366f1);border-radius:4px;"></div>
            </div>
            <span style="color:white;font-size:0.8rem;font-weight:600;width:30px;text-align:right;">${c.count}</span>
          </div>
        `).join('');
      }

      // Activities
      const actEl = document.getElementById('intel-activities');
      if (actEl && data.leadsByActivity) {
        const maxAct = Math.max(...data.leadsByActivity.map(a => a.count));
        actEl.innerHTML = data.leadsByActivity.slice(0, 8).map(a => `
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
            <span style="color:var(--text-secondary);font-size:0.8rem;width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.activity}</span>
            <div style="flex:1;height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${(a.count / maxAct) * 100}%;background:linear-gradient(90deg,#f59e0b,#d97706);border-radius:4px;"></div>
            </div>
            <span style="color:white;font-size:0.8rem;font-weight:600;width:30px;text-align:right;">${a.count}</span>
          </div>
        `).join('');
      }

      // Niches
      const nichesEl = document.getElementById('intel-niches');
      if (nichesEl) {
        const nichesData = await API.get('/intelligence/niches');
        if (nichesData.niches) {
          nichesEl.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem;">
              ${nichesData.niches.slice(0, 6).map(n => `
                <div style="padding:0.75rem;background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.1);border-radius:8px;">
                  <p style="color:white;font-size:0.9rem;font-weight:600;margin:0 0 4px;">${n.activity}</p>
                  <div style="display:flex;justify-content:space-between;font-size:0.75rem;">
                    <span style="color:var(--text-tertiary);">${n.totalLeads} leads</span>
                    <span style="color:#10b981;font-weight:600;">${n.conversionRate}%</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      }

      // Growth
      const growthEl = document.getElementById('intel-growth');
      if (growthEl && data.growthTrend) {
        const maxGrowth = Math.max(...data.growthTrend.map(g => g.count));
        growthEl.innerHTML = `
          <div style="display:flex;align-items:end;gap:0.5rem;height:120px;">
            ${data.growthTrend.map(g => `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                <span style="color:white;font-size:0.7rem;font-weight:600;">${g.count}</span>
                <div style="width:100%;height:${Math.max((g.count / maxGrowth) * 80, 4)}px;background:linear-gradient(180deg,#3b82f6,#2563eb);border-radius:4px 4px 0 0;"></div>
                <span style="color:var(--text-tertiary);font-size:0.65rem;">${g.month.split('-')[1]}/${g.month.split('-')[0].slice(2)}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      lucide.createIcons();
    } catch (err) {
      console.error('Erro ao carregar inteligencia:', err);
    }
  }
};
