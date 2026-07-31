// Chart.js helper with UTMify-Style Premium Aesthetics
const Charts = {
  instances: {},

  destroy(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  },

  destroyAll() {
    Object.keys(this.instances).forEach(id => this.destroy(id));
  },

  createGradient(ctx, colorStart, colorEnd, isVertical = true) {
    const gradient = isVertical
      ? ctx.createLinearGradient(0, 0, 0, 350)
      : ctx.createLinearGradient(0, 0, 350, 0);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
  },

  createBar(canvasId, labels, data, label = 'Valor') {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const gradient = this.createGradient(ctx, 'rgba(99, 102, 241, 0.9)', 'rgba(99, 102, 241, 0.15)');
    const hoverGradient = this.createGradient(ctx, 'rgba(99, 102, 241, 1)', 'rgba(99, 102, 241, 0.4)');
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label, data, backgroundColor: gradient, hoverBackgroundColor: hoverGradient, borderColor: 'rgba(99, 102, 241, 0.8)', borderWidth: { top: 2, right: 0, bottom: 0, left: 0 }, borderRadius: 8, barPercentage: 0.65 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(8,13,28,0.95)', titleColor: '#a5b4fc', bodyColor: '#e2e8f0', borderColor: 'rgba(99,102,241,0.4)', borderWidth: 1, padding: 12, displayColors: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11, family: "'Outfit', sans-serif" } }, border: { display: false } },
          y: { border: { display: false }, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11, family: "'Outfit', sans-serif" }, maxTicksLimit: 6 } }
        },
        animation: { duration: 1000, easing: 'easeOutQuart' }
      }
    });
  },

  createLine(canvasId, labels, data, label = 'Valor') {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Reference image style: Emerald bright gradient fill
    const h = canvas.offsetHeight || 300;
    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
    bgGradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.15)');
    bgGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label,
          data,
          borderColor: '#10b981',
          borderWidth: 3,
          tension: 0.45,
          fill: true,
          backgroundColor: bgGradient,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#818cf8',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(8,13,28,0.95)',
            titleColor: '#22d3ee',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(34,211,238,0.4)',
            borderWidth: 1,
            padding: 14,
            displayColors: false,
            callbacks: {
              title: (items) => items[0].label,
              label: (ctx) => ` ${ctx.parsed.y.toLocaleString('pt-BR')} leads`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 11, family: "'Outfit', sans-serif" } }
          },
          y: {
            border: { display: false },
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 11, family: "'Outfit', sans-serif" }, maxTicksLimit: 5 }
          }
        },
        animation: { duration: 1200, easing: 'easeOutCubic' }
      }
    });
  },


  createDoughnut(canvasId, labels, data) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const colors = ['rgba(99,102,241,0.85)','rgba(34,211,238,0.85)','rgba(167,139,250,0.85)','rgba(251,191,36,0.85)','rgba(52,211,153,0.85)','rgba(248,113,113,0.85)'];
    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: 'rgba(8,13,28,0.8)', borderWidth: 3, hoverBorderWidth: 0, hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: 'rgba(255,255,255,0.55)', padding: 12, font: { size: 11, family: "'Outfit', sans-serif" }, boxWidth: 10, boxHeight: 10 } },
          tooltip: { backgroundColor: 'rgba(8,13,28,0.95)', titleColor: '#a5b4fc', bodyColor: '#e2e8f0', borderColor: 'rgba(99,102,241,0.4)', borderWidth: 1, padding: 12 }
        },
        animation: { duration: 1000 }
      }
    });
  },

  createHBar(canvasId, labels, data, label = 'Valor') {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const gradient = this.createGradient(ctx, 'rgba(99,102,241,0.8)', 'rgba(34,211,238,0.2)', false);
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label, data, backgroundColor: gradient, borderColor: 'rgba(99,102,241,0.8)', borderWidth: { top: 0, right: 2, bottom: 0, left: 0 }, borderRadius: 6, barPercentage: 0.65 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(8,13,28,0.95)', titleColor: '#a5b4fc', bodyColor: '#e2e8f0', borderColor: 'rgba(99,102,241,0.4)', borderWidth: 1, padding: 12, displayColors: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11, family: "'Outfit', sans-serif" } }, border: { display: false } },
          y: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.55)', font: { size: 11, family: "'Outfit', sans-serif" } }, border: { display: false } }
        },
        animation: { duration: 1000 }
      }
    });
  }
};