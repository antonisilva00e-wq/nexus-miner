// Map Page — Vista Orbital dos Leads
const MapPage = {
  map: null,
  markers: null,

  async render() {
    document.getElementById('page-title').textContent = 'Mapa Orbital';
    document.getElementById('page-subtitle').textContent = 'Vista de satélite dos seus prospects pelo Brasil';

    document.getElementById('page-map').innerHTML = `
      <style>
        @keyframes orbital-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.8); }
        }
        @keyframes orbital-glow {
          0%, 100% { box-shadow: 0 0 15px 5px var(--glow-color); }
          50% { box-shadow: 0 0 30px 10px var(--glow-color); }
        }
        @keyframes scan-line {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes orbit-ring {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .orbital-marker {
          position: relative;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .orbital-marker:hover {
          transform: scale(1.3);
          z-index: 9999 !important;
        }
        .orbital-pulse-ring {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 30px; height: 30px;
          border-radius: 50%;
          border: 2px solid var(--glow-color);
          animation: orbital-pulse 2s ease-out infinite;
          pointer-events: none;
        }
        .orbital-cluster {
          animation: orbit-ring 20s linear infinite;
        }
        .map-vignette {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 999;
          background:
            radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%);
        }
        .map-scan-line {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent);
          animation: scan-line 4s linear infinite;
          pointer-events: none;
          z-index: 1000;
        }
        .map-atmosphere {
          position: absolute;
          top: -5px; left: -5px; right: -5px; bottom: -5px;
          border-radius: var(--border-radius);
          pointer-events: none;
          z-index: 998;
          box-shadow:
            inset 0 0 60px rgba(99,102,241,0.15),
            inset 0 0 120px rgba(99,102,241,0.05),
            0 0 30px rgba(99,102,241,0.1);
        }
        .map-grid-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 997;
          background-image:
            linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        .map-coords {
          position: absolute;
          bottom: 12px; right: 12px;
          background: rgba(0,0,0,0.7);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 6px;
          padding: 6px 12px;
          color: rgba(129,140,248,0.8);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          z-index: 1001;
          pointer-events: none;
          letter-spacing: 0.05em;
        }
        .map-crosshair {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 40px; height: 40px;
          pointer-events: none;
          z-index: 1000;
          opacity: 0.3;
        }
        .map-crosshair::before, .map-crosshair::after {
          content: '';
          position: absolute;
          background: rgba(99,102,241,0.5);
        }
        .map-crosshair::before {
          top: 50%; left: 0; right: 0; height: 1px;
        }
        .map-crosshair::after {
          left: 50%; top: 0; bottom: 0; width: 1px;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(15,15,30,0.95) !important;
          border: 1px solid rgba(99,102,241,0.3) !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.15) !important;
          backdrop-filter: blur(20px) !important;
        }
        .leaflet-popup-tip {
          background: rgba(15,15,30,0.95) !important;
          border: 1px solid rgba(99,102,241,0.3) !important;
        }
        .leaflet-popup-close-button {
          color: rgba(129,140,248,0.6) !important;
        }
        .leaflet-popup-close-button:hover {
          color: #818cf8 !important;
        }
      </style>

      <!-- Filtros -->
      <div style="display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center;">
        <div style="display:flex;align-items:center;gap:0.5rem;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:var(--border-radius-sm);padding:0.4rem 0.8rem;">
          <div style="width:6px;height:6px;border-radius:50%;background:#10b981;animation:orbital-pulse 2s infinite;"></div>
          <span style="color:rgba(129,140,248,0.8);font-size:0.75rem;font-family:monospace;letter-spacing:0.05em;">LIVE</span>
        </div>
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
          <option value="">Todos os estagios</option>
          <option value="leads">Leads</option>
          <option value="contato">Contato</option>
          <option value="proposta">Proposta</option>
          <option value="fechado">Fechado</option>
          <option value="perdido">Perdido</option>
        </select>
        <button class="btn btn-secondary" onclick="MapPage.fitBounds()" style="margin-left:auto;"><i data-lucide="maximize"></i>Ajustar</button>
        <button class="btn btn-secondary" onclick="MapPage.toggleView()"><i data-lucide="globe"></i>Alternar</button>
      </div>

      <!-- Stats bar -->
      <div id="map-stats" style="display:flex;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;"></div>

      <!-- Map container with overlays -->
      <div style="position:relative;height:calc(100vh - 280px);min-height:500px;border-radius:var(--border-radius);overflow:hidden;border:1px solid rgba(99,102,241,0.2);">
        <div id="map-container" style="width:100%;height:100%;"></div>
        <div class="map-vignette"></div>
        <div class="map-scan-line"></div>
        <div class="map-atmosphere"></div>
        <div class="map-grid-overlay"></div>
        <div class="map-crosshair"></div>
        <div class="map-coords" id="map-coords">LAT: --.---- | LNG: --.----</div>
      </div>
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

    if (!window.L) {
      document.getElementById('page-map').innerHTML = '<div class="empty-state"><p>Erro: biblioteca do mapa (Leaflet) nao carregou. Verifique sua conexao.</p></div>';
      return;
    }

    try {
      this.initMap();
      await this.loadLeads();
      this.setupFilters();
      this.trackCoords();
    } catch (e) {
      console.error('[MAP] Init error:', e);
      document.getElementById('page-map').innerHTML = '<div class="empty-state"><p>Erro ao inicializar mapa: ' + e.message + '</p></div>';
    }
  },

  loadScript(src) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => { console.warn('[MAP] Failed to load:', src); resolve(); };
      document.head.appendChild(s);
    });
  },

  loadCSS(href) {
    return new Promise((resolve) => {
      if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = href;
      l.onload = resolve;
      l.onerror = () => { console.warn('[MAP] Failed to load CSS:', href); resolve(); };
      document.head.appendChild(l);
    });
  },

  satelliteView: true,

  initMap() {
    this.map = L.map('map-container', {
      zoomControl: true,
      attributionControl: true,
      minZoom: 3,
      maxZoom: 18,
      zoomSnap: 0.5,
      zoomDelta: 0.5
    }).setView([-14.235, -51.925], 4);

    // Camada de satelite (ESRI World Imagery)
    this.satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, and the GIS User Community',
      maxZoom: 18
    });

    // Camada dark (fallback)
    this.darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    });

    // Overlay de labels escuro sobre satelite
    this.labelLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      pane: 'overlayPane'
    });

    this.satelliteLayer.addTo(this.map);
    this.labelLayer.addTo(this.map);

    // Marcadores com clustering
    this.markers = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small', r = 36;
        if (count > 50) { size = 'large'; r = 56; }
        else if (count > 20) { size = 'medium'; r = 46; }
        return L.divIcon({
          html: `
            <div class="orbital-cluster" style="position:relative;width:${r}px;height:${r}px;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;top:-8px;left:-8px;right:-8px;bottom:-8px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,0.25) 0%,transparent 70%);animation:orbital-pulse 3s ease-in-out infinite;"></div>
              <div style="position:absolute;top:-3px;left:-3px;right:-3px;bottom:-3px;border-radius:50%;border:1px solid rgba(99,102,241,0.4);"></div>
              <div style="background:radial-gradient(circle at 30% 30%,#818cf8,#4f46e5);width:${r}px;height:${r}px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${size==='large'?'15px':'13px'};box-shadow:0 0 25px rgba(99,102,241,0.6),0 0 50px rgba(99,102,241,0.3);border:2px solid rgba(255,255,255,0.25);letter-spacing:0.02em;">
                ${count}
              </div>
            </div>
          `,
          className: 'custom-cluster',
          iconSize: L.point(r + 16, r + 16)
        });
      }
    });
    this.map.addLayer(this.markers);
  },

  toggleView() {
    this.satelliteView = !this.satelliteView;
    if (this.satelliteView) {
      this.map.removeLayer(this.darkLayer);
      this.satelliteLayer.addTo(this.map);
      this.labelLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.satelliteLayer);
      this.map.removeLayer(this.labelLayer);
      this.darkLayer.addTo(this.map);
    }
  },

  trackCoords() {
    this.map.on('mousemove', (e) => {
      const el = document.getElementById('map-coords');
      if (el) el.textContent = `LAT: ${e.latlng.lat.toFixed(4)} | LNG: ${e.latlng.lng.toFixed(4)}`;
    });
  },

  async loadLeads() {
    try {
      const state = document.getElementById('map-filter-state')?.value;
      const source = document.getElementById('map-filter-source')?.value;
      const stage = document.getElementById('map-filter-stage')?.value;
      let url = '/leads?limit=500';
      if (state) url += `&state=${encodeURIComponent(state)}`;
      if (source) url += `&source=${encodeURIComponent(source)}`;
      if (stage) url += `&stage=${encodeURIComponent(stage)}`;
      const data = await API.get(url);
      const leads = data.leads || [];
      this.renderLeads(leads);
    } catch (e) {
      console.error('[MAP]', e);
    }
  },

  renderLeads(leads) {
    this.markers.clearLayers();
    let geocoded = 0;

    const stageConfig = {
      leads:     { color: '#818cf8', glow: 'rgba(129,140,248,0.6)', label: 'LEAD' },
      contato:   { color: '#22d3ee', glow: 'rgba(34,211,238,0.6)',  label: 'CONTATO' },
      proposta:  { color: '#f59e0b', glow: 'rgba(245,158,11,0.6)', label: 'PROPOSTA' },
      fechado:   { color: '#10b981', glow: 'rgba(16,185,129,0.6)', label: 'FECHADO' },
      perdido:   { color: '#f43f5e', glow: 'rgba(244,63,94,0.6)',  label: 'PERDIDO' }
    };

    leads.forEach((lead, i) => {
      if (!lead.city || !lead.state) return;

      const lat = lead.lat || this.cityToLat(lead.city, lead.state);
      const lng = lead.lng || this.cityToLng(lead.city, lead.state);
      if (!lat || !lng) return;

      geocoded++;
      const stage = stageConfig[lead.pipeline_stage] || stageConfig.leads;
      const delay = (i % 20) * 0.15;
      const size = lead.score > 70 ? 16 : lead.score > 40 ? 13 : 10;

      const icon = L.divIcon({
        html: `
          <div class="orbital-marker" style="--glow-color:${stage.glow};width:${size}px;height:${size}px;position:relative;">
            <div style="position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;border-radius:50%;background:radial-gradient(circle,${stage.glow} 0%,transparent 70%);animation:orbital-pulse 2.5s ease-out ${delay}s infinite;"></div>
            <div style="width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle at 35% 35%,${stage.color},${stage.color}99);box-shadow:0 0 ${size}px ${stage.glow},0 0 ${size*2}px ${stage.glow}55;border:2px solid rgba(255,255,255,0.7);transition:all 0.3s;"></div>
          </div>
        `,
        className: 'custom-marker',
        iconSize: [size + 12, size + 12],
        iconAnchor: [(size + 12) / 2, (size + 12) / 2]
      });

      const marker = L.marker([lat, lng], { icon });
      marker.bindPopup(`
        <div style="min-width:220px;font-family:'Outfit',sans-serif;color:#e2e8f0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${stage.color};box-shadow:0 0 10px ${stage.glow};"></div>
            <div style="font-weight:700;font-size:1rem;color:white;">${lead.name}</div>
          </div>
          <div style="color:#94a3b8;font-size:0.8rem;margin-bottom:10px;">${lead.activity || lead.source || ''}</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;">
            <span style="background:${stage.color}25;color:${stage.color};padding:3px 10px;border-radius:4px;font-size:0.7rem;font-weight:600;border:1px solid ${stage.color}40;">${stage.label}</span>
            ${lead.city ? `<span style="background:rgba(99,102,241,0.1);color:#818cf8;padding:3px 10px;border-radius:4px;font-size:0.7rem;border:1px solid rgba(99,102,241,0.2);">${lead.city}/${lead.state}</span>` : ''}
            ${lead.score ? `<span style="background:rgba(16,185,129,0.1);color:#10b981;padding:3px 10px;border-radius:4px;font-size:0.7rem;border:1px solid rgba(16,185,129,0.2);">Score: ${lead.score}</span>` : ''}
          </div>
          ${lead.phone ? `<div style="font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">📞 ${lead.phone}</div>` : ''}
          ${lead.cnpj ? `<div style="font-size:0.8rem;color:#94a3b8;">📋 ${lead.cnpj}</div>` : ''}
        </div>
      `, { maxWidth: 300 });

      this.markers.addLayer(marker);
    });

    this.renderStats(leads, geocoded);
  },

  renderStats(leads, geocoded) {
    const byStage = {};
    leads.forEach(l => { const s = l.pipeline_stage || 'leads'; byStage[s] = (byStage[s]||0)+1; });
    const stageConfig = {
      leads:     { color: '#818cf8', icon: '📡' },
      contato:   { color: '#22d3ee', icon: '💬' },
      proposta:  { color: '#f59e0b', icon: '📋' },
      fechado:   { color: '#10b981', icon: '✅' },
      perdido:   { color: '#f43f5e', icon: '❌' }
    };

    document.getElementById('map-stats').innerHTML = `
      <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:var(--border-radius-sm);padding:10px 16px;display:flex;align-items:center;gap:10px;">
        <div style="width:8px;height:8px;border-radius:50%;background:#6366f1;box-shadow:0 0 8px rgba(99,102,241,0.5);"></div>
        <span style="color:var(--text-secondary);font-size:0.82rem;"><strong style="color:#fff;">${leads.length}</strong> leads</span>
      </div>
      <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:var(--border-radius-sm);padding:10px 16px;display:flex;align-items:center;gap:10px;">
        <div style="width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 8px rgba(16,185,129,0.5);"></div>
        <span style="color:var(--text-secondary);font-size:0.82rem;"><strong style="color:#fff;">${geocoded}</strong> no mapa</span>
      </div>
      ${Object.entries(byStage).map(([s,c]) => `
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);padding:10px 16px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:0.9rem;">${(stageConfig[s]||stageConfig.leads).icon}</span>
          <span style="color:var(--text-secondary);font-size:0.82rem;"><strong style="color:${(stageConfig[s]||stageConfig.leads).color};">${c}</strong> ${s}</span>
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
      'Rio Branco': -9.97, 'Palmas': -10.17
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
      'Rio Branco': -67.81, 'Palmas': -48.33
    };
    return cities[city] || null;
  }
};
