// Map Page — Leads geolocalizados
const MapPage = {
  map: null,
  markers: null,

  async render() {
    document.getElementById('page-title').textContent = 'Mapa de Leads';
    document.getElementById('page-subtitle').textContent = 'Visualização geográfica dos seus prospects';

    document.getElementById('page-map').innerHTML = `
      <div style="display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap;">
        <select id="map-filter-state" style="padding:0.6rem 1rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);min-width:150px;">
          <option value="">Todos os estados</option>
        </select>
        <select id="map-filter-source" style="padding:0.6rem 1rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);min-width:150px;">
          <option value="">Todas as fontes</option>
          <option value="mineração">Mineração</option>
          <option value="manual">Manual</option>
          <option value="rfsearch">RF Search</option>
          <option value="cnpj">CNPJ Lookup</option>
        </select>
        <select id="map-filter-stage" style="padding:0.6rem 1rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);min-width:150px;">
          <option value="">Todos os estágios</option>
          <option value="leads">Leads</option>
          <option value="contato">Contato</option>
          <option value="proposta">Proposta</option>
          <option value="fechado">Fechado</option>
          <option value="perdido">Perdido</option>
        </select>
        <button class="btn btn-secondary" onclick="MapPage.fitBounds()"><i data-lucide="maximize"></i>Ajustar mapa</button>
      </div>
      <div id="map-stats" style="display:flex;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;"></div>
      <div id="map-container" style="height:calc(100vh - 280px);min-height:500px;border-radius:var(--border-radius);overflow:hidden;border:1px solid var(--border-color);"></div>
    `;
    lucide.createIcons();

    // Load Leaflet
    if (!window.L) {
      await this.loadScript('/js/leaflet.js');
      await this.loadCSS('/css/leaflet.css');
      await this.loadScript('/js/leaflet.markercluster.js');
      await this.loadCSS('/css/MarkerCluster.css');
      await this.loadCSS('/css/MarkerCluster.Default.css');
    }

    this.initMap();
    await this.loadLeads();
    this.setupFilters();
  },

  loadScript(src) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; document.head.appendChild(s);
    });
  },

  loadCSS(href) {
    return new Promise((resolve) => {
      if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = href; l.onload = resolve; document.head.appendChild(l);
    });
  },

  initMap() {
    this.map = L.map('map-container', {
      zoomControl: true,
      attributionControl: true
    }).setView([-14.235, -51.925], 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }).addTo(this.map);

    this.markers = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small', r = 30;
        if (count > 50) { size = 'large'; r = 50; }
        else if (count > 20) { size = 'medium'; r = 40; }
        return L.divIcon({
          html: `<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);width:${r}px;height:${r}px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${size==='large'?'14px':'12px'};box-shadow:0 4px 20px rgba(99,102,241,0.5);border:2px solid rgba(255,255,255,0.2);">${count}</div>`,
          className: 'custom-cluster',
          iconSize: L.point(r, r)
        });
      }
    });
    this.map.addLayer(this.markers);
  },

  async loadLeads() {
    try {
      const data = await API.get('/leads?limit=500');
      const leads = data.leads || [];
      this.renderLeads(leads);
    } catch (e) {
      console.error('[MAP]', e);
    }
  },

  renderLeads(leads) {
    this.markers.clearLayers();
    let geocoded = 0;

    const stageColors = {
      leads: '#818cf8', contato: '#22d3ee', proposta: '#f59e0b', fechado: '#10b981', perdido: '#f43f5e'
    };

    leads.forEach(lead => {
      if (!lead.city || !lead.state) return;

      // Simple geocoding by city name (stored lat/lng would be better)
      const lat = lead.lat || this.cityToLat(lead.city, lead.state);
      const lng = lead.lng || this.cityToLng(lead.city, lead.state);
      if (!lat || !lng) return;

      geocoded++;
      const color = stageColors[lead.pipeline_stage] || '#818cf8';
      const icon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,0.8);box-shadow:0 2px 8px ${color}80;"></div>`,
        className: 'custom-marker',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      const marker = L.marker([lat, lng], { icon });
      marker.bindPopup(`
        <div style="min-width:200px;font-family:'Outfit',sans-serif;">
          <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;">${lead.name}</div>
          <div style="color:#666;font-size:0.8rem;margin-bottom:8px;">${lead.activity || lead.source || ''}</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
            <span style="background:${color}20;color:${color};padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:600;">${(lead.pipeline_stage || 'leads').toUpperCase()}</span>
            ${lead.city ? `<span style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:0.7rem;">${lead.city}/${lead.state}</span>` : ''}
          </div>
          ${lead.phone ? `<div style="font-size:0.8rem;color:#444;">📞 ${lead.phone}</div>` : ''}
          ${lead.cnpj ? `<div style="font-size:0.8rem;color:#444;">📋 ${lead.cnpj}</div>` : ''}
        </div>
      `, { maxWidth: 280 });

      this.markers.addLayer(marker);
    });

    this.renderStats(leads, geocoded);
  },

  renderStats(leads, geocoded) {
    const byStage = {};
    leads.forEach(l => { const s = l.pipeline_stage || 'leads'; byStage[s] = (byStage[s]||0)+1; });
    const stageColors = { leads: '#818cf8', contato: '#22d3ee', proposta: '#f59e0b', fechado: '#10b981', perdido: '#f43f5e' };

    document.getElementById('map-stats').innerHTML = `
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);padding:12px 16px;display:flex;align-items:center;gap:10px;">
        <div style="width:8px;height:8px;border-radius:50%;background:#6366f1;"></div>
        <span style="color:var(--text-secondary);font-size:0.85rem;"><strong style="color:#fff;">${leads.length}</strong> leads</span>
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);padding:12px 16px;display:flex;align-items:center;gap:10px;">
        <div style="width:8px;height:8px;border-radius:50%;background:#10b981;"></div>
        <span style="color:var(--text-secondary);font-size:0.85rem;"><strong style="color:#fff;">${geocoded}</strong> no mapa</span>
      </div>
      ${Object.entries(byStage).map(([s,c]) => `
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);padding:12px 16px;display:flex;align-items:center;gap:10px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${stageColors[s]||'#818cf8'};"></div>
          <span style="color:var(--text-secondary);font-size:0.85rem;"><strong style="color:#fff;">${c}</strong> ${s}</span>
        </div>
      `).join('')}
    `;
  },

  setupFilters() {
    ['map-filter-state', 'map-filter-source', 'map-filter-stage'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this.loadLeads());
    });
  },

  fitBounds() {
    if (this.markers.getLayers().length > 0) {
      this.map.fitBounds(this.markers.getBounds().pad(0.1));
    }
  },

  // Simple city-to-coordinate mapping (major Brazilian cities)
  cityToLat(city, state) {
    const cities = {
      'São Paulo': -23.55, 'Rio de Janeiro': -22.91, 'Brasília': -15.78, 'Salvador': -12.97,
      'Fortaleza': -3.72, 'Belo Horizonte': -19.92, 'Manaus': -3.12, 'Curitiba': -25.43,
      'Recife': -8.05, 'Porto Alegre': -30.03, 'Belém': -1.46, 'Goiânia': -16.69,
      'Guarulhos': -23.45, 'Campinas': -22.91, 'São Luís': -2.53, 'Maceió': -9.67,
      'Campo Grande': -20.47, 'Teresina': -5.09, 'João Pessoa': -7.12, 'Aracaju': -10.91,
      'Natal': -5.79, 'Cuiabá': -15.60, 'São Bernardo do Campo': -23.69, 'Santo André': -23.66,
      'Osasco': -23.53, 'Sorocaba': -23.50, 'Ribeirão Preto': -21.18, 'Uberlândia': -18.92,
      'Santos': -23.96, 'Londrina': -23.30, 'Joinville': -26.30, 'Florianópolis': -27.59,
      'Vitória': -20.32, 'São José dos Campos': -23.18, 'Feira de Santana': -12.27,
      'Juiz de Fora': -21.76, 'Niterói': -22.88, 'São José do Rio Preto': -20.81,
      'Bauru': -22.31, 'Porto Velho': -8.76, 'Macapá': 0.03, 'Boa Vista': 2.82,
      'Rio Branco': -9.97, 'Maceió': -9.67, 'Palmas': -10.17
    };
    return cities[city] || null;
  },

  cityToLng(city, state) {
    const cities = {
      'São Paulo': -46.63, 'Rio de Janeiro': -43.17, 'Brasília': -47.88, 'Salvador': -38.51,
      'Fortaleza': -38.54, 'Belo Horizonte': -43.94, 'Manaus': -60.02, 'Curitiba': -49.27,
      'Recife': -34.87, 'Porto Alegre': -51.23, 'Belém': -48.50, 'Goiânia': -49.26,
      'Guarulhos': -46.53, 'Campinas': -47.06, 'São Luís': -44.30, 'Maceió': -35.73,
      'Campo Grande': -54.62, 'Teresina': -42.81, 'João Pessoa': -34.86, 'Aracaju': -37.07,
      'Natal': -35.21, 'Cuiabá': -56.10, 'São Bernardo do Campo': -46.57, 'Santo André': -46.53,
      'Osasco': -46.79, 'Sorocaba': -47.46, 'Ribeirão Preto': -47.81, 'Uberlândia': -48.28,
      'Santos': -46.33, 'Londrina': -51.18, 'Joinville': -48.85, 'Florianópolis': -48.55,
      'Vitória': -40.31, 'São José dos Campos': -45.89, 'Feira de Santana': -38.97,
      'Juiz de Fora': -43.34, 'Niterói': -43.10, 'São José do Rio Preto': -49.38,
      'Bauru': -49.03, 'Porto Velho': -63.90, 'Macapá': -51.07, 'Boa Vista': -60.67,
      'Rio Branco': -67.81, 'Maceió': -35.73, 'Palmas': -48.33
    };
    return cities[city] || null;
  }
};
