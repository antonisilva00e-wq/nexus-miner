const fs = require('fs');

try {
  let code = fs.readFileSync('public/js/pages/sites.js', 'utf8');

  // Replace buttons with onclick
  code = code.replace(
    /extraActions\.innerHTML = `([^`]+)`;/,
    `extraActions.innerHTML = \`
      <button class="btn btn-secondary" onclick="SitesPage.switchTab('list')" id="btn-tab-list" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
        <i data-lucide="layout"></i> Meus Sites
      </button>
      <button class="btn btn-primary" onclick="SitesPage.switchTab('new')" id="btn-tab-new" style="background: #8b5cf6; color: #fff; padding: 8px 16px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px; border:none;">
        <i data-lucide="plus"></i> Novo Projeto
      </button>
    \`;`
  );

  // Wrap the main canvas
  code = code.replace(
    /container\.innerHTML = `([\s\S]*?)`;\s+if \(window\.lucide\)/,
    `container.innerHTML = \`
      <div id="sites-view-new">$1</div>
      <div id="sites-view-list" style="display: none; padding: 20px;">
        <div id="my-sites-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;"></div>
      </div>
    \`;
    if (window.lucide)`
  );

  // Add the logic methods at the end of the object
  code = code.replace(
    /,\s*async generateSite\(\) \{/,
    `,
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
      container.innerHTML = data.sites.map(s => \`
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 10px;">
          <h4 style="margin: 0; color: #fff;">\${s.name}</h4>
          <p style="color: #94a3b8; font-size: 0.9rem; margin: 0;">\${s.description || 'Sem descrição'}</p>
          <a href="http://\${s.slug}.nexusminer.app" target="_blank" style="color: #8b5cf6; text-decoration: none; font-size: 0.9rem; font-weight: bold; margin-top: auto;"><i data-lucide="external-link" style="width:14px;height:14px;vertical-align:middle;"></i> Acessar Link</a>
        </div>
      \`).join('');
      if (window.lucide) lucide.createIcons();
    } catch(e) {
      container.innerHTML = '<div style="color: #ef4444;">Erro ao carregar sites.</div>';
    }
  },
  
  async generateSite() {`
  );

  fs.writeFileSync('public/js/pages/sites.js', code);
  console.log('Update successful');
} catch (e) {
  console.error(e);
}
