const fs = require('fs');
let code = fs.readFileSync('public/js/pages/sites.js', 'utf8');

// Replace static buttons with functional ones
code = code.replace(
  /extraActions\.innerHTML = \[\s\S]*?\;/,
  \extraActions.innerHTML = \\\
      <button class="btn btn-secondary" onclick="SitesPage.switchTab('list')" id="btn-tab-list" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
        <i data-lucide="layout"></i> Meus Sites
      </button>
      <button class="btn btn-primary" onclick="SitesPage.switchTab('new')" id="btn-tab-new" style="background: #8b5cf6; color: #fff; padding: 8px 16px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px; border:none;">
        <i data-lucide="plus"></i> Novo Projeto
      </button>
    \\\;\
);

// Add state and tab switching methods
if (!code.includes('switchTab(tab)')) {
  code = code.replace(
    /const SitesPage = \{/,
    \const SitesPage = {
  currentTab: 'new',
  
  switchTab(tab) {
    this.currentTab = tab;
    document.getElementById('sites-view-new').style.display = tab === 'new' ? 'flex' : 'none';
    document.getElementById('sites-view-list').style.display = tab === 'list' ? 'block' : 'none';
    
    document.getElementById('btn-tab-new').style.opacity = tab === 'new' ? '1' : '0.5';
    document.getElementById('btn-tab-list').style.opacity = tab === 'list' ? '1' : '0.5';
    
    if (tab === 'list') {
      this.loadMySites();
    }
  },
  
  async loadMySites() {
    const container = document.getElementById('my-sites-grid');
    container.innerHTML = '<div style="color: #94a3b8; padding: 20px;">Carregando seus sites...</div>';
    try {
      const data = await API.get('/sites');
      if (!data.sites || data.sites.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; padding: 20px;">Nenhum site criado ainda. Clique em Novo Projeto!</div>';
        return;
      }
      container.innerHTML = data.sites.map(s => \\\
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 15px;">
          <h4 style="margin: 0 0 10px 0; color: #fff;">\\\</h4>
          <p style="color: #94a3b8; font-size: 0.9rem; margin: 0 0 15px 0;">\\\</p>
          <a href="http://\\\.nexusminer.app" target="_blank" style="color: #8b5cf6; text-decoration: none; font-size: 0.9rem;"><i data-lucide="external-link" style="width:14px;height:14px;vertical-align:middle;"></i> Acessar Site</a>
        </div>
      \\\).join('');
      if (window.lucide) lucide.createIcons();
    } catch(e) {
      container.innerHTML = '<div style="color: #ef4444; padding: 20px;">Erro ao carregar sites.</div>';
    }
  },\
  );
}

// Wrap the current container in a view and add list view
code = code.replace(
  /container\.innerHTML = \([\s\S]*?)\;/,
  \container.innerHTML = \\\
    <div id="sites-view-new" style="display: flex; gap: 24px; min-height: calc(100vh - 120px);"></div>
    <div id="sites-view-list" style="display: none; padding: 20px 0;">
      <div id="my-sites-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;"></div>
    </div>
  \\\;\
);

// Set initial tab state after lucide.createIcons()
code = code.replace(
  /if \(window\.lucide\) lucide\.createIcons\(\);\s*}/,
  \if (window.lucide) lucide.createIcons();
    this.switchTab('new');
  }\
);

fs.writeFileSync('public/js/pages/sites.js', code);
console.log('done sites.js update');
