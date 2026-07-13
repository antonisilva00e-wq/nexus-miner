// Referral Page - Link de convite simples
const ReferralsPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Indicar e Ganhar';
    document.getElementById('page-subtitle').textContent = 'Compartilhe seu link e ganhe 40% de cada venda';
    const el = document.getElementById('page-referrals');
    el.innerHTML = '<div class="skeleton-card" style="height:200px;"></div>';

    try {
      const [codeData, balanceData] = await Promise.all([
        API.get('/referrals/my-code'),
        API.get('/referrals/balance'),
      ]);

      el.innerHTML = `
        <!-- Saldo -->
        <div class="card" style="margin-bottom:1.5rem;padding:2rem;background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(5,150,105,0.05));text-align:center;">
          <p style="font-size:0.8rem;color:var(--text-tertiary);margin:0;text-transform:uppercase;letter-spacing:0.1em;">Seu Saldo Disponivel</p>
          <h1 style="color:#10b981;font-size:3rem;margin:0.5rem 0;font-weight:800;">R$ ${(balanceData.balance || 0).toFixed(2)}</h1>
          <p style="color:var(--text-secondary);font-size:0.9rem;margin:0;">Comissao: <strong style="color:#10b981;">${balanceData.commission}%</strong> de cada venda</p>
        </div>

        <!-- Link de convite -->
        <div class="card" style="margin-bottom:1.5rem;">
          <h3 style="color:white;font-size:1.1rem;margin:0 0 1rem;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="link" style="color:var(--accent-primary);"></i>Seu Link de Convite</h3>
          <div style="background:rgba(0,0,0,0.2);border-radius:var(--border-radius-md);padding:1rem;display:flex;align-items:center;gap:1rem;">
            <input type="text" id="invite-link" value="${codeData.link}" readonly style="flex:1;background:transparent;border:none;color:var(--accent-secondary);font-family:monospace;font-size:0.95rem;padding:0;">
            <button class="btn btn-sm btn-primary" onclick="ReferralsPage.copyLink()"><i data-lucide="copy"></i>Copiar</button>
          </div>
          <div style="display:flex;gap:0.75rem;margin-top:1rem;">
            <button class="btn btn-secondary" onclick="ReferralsPage.shareWhatsApp()"><i data-lucide="message-circle"></i>WhatsApp</button>
            <button class="btn btn-secondary" onclick="ReferralsPage.shareEmail()"><i data-lucide="mail"></i>Email</button>
          </div>
        </div>

        <!-- Como funciona -->
        <div class="card" style="margin-bottom:1.5rem;">
          <h3 style="color:white;font-size:1.1rem;margin:0 0 1rem;">Como Funciona</h3>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;">
            <div style="text-align:center;">
              <div style="width:50px;height:50px;border-radius:50%;background:rgba(129,140,248,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:0.75rem;"><span style="color:var(--accent-primary);font-size:1.2rem;font-weight:800;">1</span></div>
              <h4 style="color:white;font-size:0.9rem;margin:0 0 0.3rem;">Copie o Link</h4>
              <p style="color:var(--text-tertiary);font-size:0.78rem;margin:0;">Copie seu link unico de convite</p>
            </div>
            <div style="text-align:center;">
              <div style="width:50px;height:50px;border-radius:50%;background:rgba(34,211,238,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:0.75rem;"><span style="color:var(--accent-secondary);font-size:1.2rem;font-weight:800;">2</span></div>
              <h4 style="color:white;font-size:0.9rem;margin:0 0 0.3rem;">Compartilhe</h4>
              <p style="color:var(--text-tertiary);font-size:0.78rem;margin:0;">Envie para amigos e conhecidos</p>
            </div>
            <div style="text-align:center;">
              <div style="width:50px;height:50px;border-radius:50%;background:rgba(16,185,129,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:0.75rem;"><span style="color:#10b981;font-size:1.2rem;font-weight:800;">3</span></div>
              <h4 style="color:white;font-size:0.9rem;margin:0 0 0.3rem;">Ganhe 40%</h4>
              <p style="color:var(--text-tertiary);font-size:0.78rem;margin:0;">Receba 40% de cada venda</p>
            </div>
          </div>
        </div>

        <!-- Historico -->
        <div class="card">
          <h3 style="color:white;font-size:1.1rem;margin:0 0 1rem;">Historico de Comissoes</h3>
          <div id="commissions-list"></div>
        </div>
      `;
      lucide.createIcons();
      this.loadCommissions();
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><p>Erro: ${err.message}</p></div>`;
    }
  },

  async loadCommissions() {
    try {
      const data = await API.get('/referrals/history');
      const el = document.getElementById('commissions-list');
      if (!data.commissions || data.commissions.length === 0) {
        el.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1.5rem;">Nenhuma comissao ainda</p>';
        return;
      }
      el.innerHTML = data.commissions.map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem;border-bottom:1px solid var(--border-color);">
          <div>
            <span style="color:white;font-weight:500;">${c.referred_name || 'Cliente'}</span>
            <span style="color:var(--text-tertiary);font-size:0.75rem;margin-left:0.5rem;">${c.referred_plan || ''}</span>
          </div>
          <span style="color:#10b981;font-weight:600;">+R$ ${(c.amount || 0).toFixed(2)}</span>
        </div>
      `).join('');
    } catch {}
  },

  copyLink() {
    const input = document.getElementById('invite-link');
    navigator.clipboard.writeText(input.value);
    showToast('Link copiado!', 'success');
  },

  shareWhatsApp() {
    const link = document.getElementById('invite-link').value;
    window.open(`https://wa.me/?text=${encodeURIComponent('Confira o Nexus Miner: ' + link)}`);
  },

  shareEmail() {
    const link = document.getElementById('invite-link').value;
    window.open(`mailto:?subject=Convite Nexus Miner&body=${encodeURIComponent('Confira o Nexus Miner: ' + link)}`);
  },
};
