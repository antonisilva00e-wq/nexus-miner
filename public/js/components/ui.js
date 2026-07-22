// Global HTML escape utility - MUST be before page scripts
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// Global Error Handler & Loading System
const UI = {
  // ============================================================
  // LOADING STATES
  // ============================================================
  showLoading(el, text = 'Carregando...') {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem;gap:1rem;">
        <div class="spin-animation" style="width:32px;height:32px;border:3px solid rgba(var(--accent-primary-rgb),0.2);border-top-color:var(--accent-primary);border-radius:50%;"></div>
        <span style="color:var(--text-secondary);font-size:0.85rem;">${text}</span>
      </div>`;
  },

  showSkeleton(el, type = 'cards') {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;

    const skeletons = {
      cards: Array(6).fill('<div class="skeleton-card"><div class="skeleton skeleton-circle" style="margin-bottom:12px;"></div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div></div>').join(''),
      table: Array(5).fill('<div style="display:flex;gap:1rem;padding:0.75rem;border-bottom:1px solid rgba(255,255,255,0.03);"><div class="skeleton" style="width:40px;height:40px;border-radius:8px;"></div><div style="flex:1;"><div class="skeleton skeleton-text" style="width:60%;"></div><div class="skeleton skeleton-text" style="width:40%;"></div></div></div>').join(''),
      chart: '<div class="skeleton" style="height:200px;border-radius:12px;"></div>',
    };

    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;">${skeletons[type] || skeletons.cards}</div>`;
  },

  // ============================================================
  // CONFIRMATION DIALOG
  // ============================================================
  async confirm(message, title = 'Confirmar') {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop active';
      backdrop.innerHTML = `
        <div class="modal-card" style="max-width:400px;">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="btn-close" id="confirm-cancel"><i data-lucide="x"></i></button>
          </div>
          <div class="modal-body">
            <p style="color:var(--text-secondary);font-size:0.9rem;">${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="confirm-no">Cancelar</button>
            <button class="btn btn-primary" id="confirm-yes">Confirmar</button>
          </div>
        </div>`;

      document.body.appendChild(backdrop);
      lucide.createIcons();

      const close = (result) => {
        backdrop.classList.remove('active');
        setTimeout(() => backdrop.remove(), 300);
        resolve(result);
      };

      document.getElementById('confirm-yes').onclick = () => close(true);
      document.getElementById('confirm-no').onclick = () => close(false);
      document.getElementById('confirm-cancel').onclick = () => close(false);
      backdrop.onclick = (e) => { if (e.target === backdrop) close(false); };
    });
  },

  // ============================================================
  // TOAST NOTIFICATIONS
  // ============================================================
  toast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: 'check-circle', danger: 'alert-circle', warning: 'alert-triangle', info: 'info' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ============================================================
  // EMPTY STATE
  // ============================================================
  emptyState(icon, title, subtitle, actionHtml = '') {
    return `
      <div class="empty-state">
        <i data-lucide="${icon}" style="width:56px;height:56px;color:var(--text-tertiary);opacity:0.3;"></i>
        <h3 style="color:var(--text-secondary);font-size:1.1rem;margin-top:1rem;">${title}</h3>
        <p style="color:var(--text-tertiary);font-size:0.85rem;">${subtitle}</p>
        ${actionHtml}
      </div>`;
  },

  // ============================================================
  // GLOBAL ERROR HANDLER
  // ============================================================
  handleError(err, context = '') {
    console.error(`[UI Error] ${context}:`, err);
    const msg = err.message || 'Erro desconhecido';

    if (err.status === 401) {
      this.toast('Sessao expirada. Faca login novamente.', 'warning');
      Auth.logout();
      setTimeout(() => { window.location.href = '/'; }, 500);
    } else if (err.status === 403) {
      this.toast('Voce nao tem permissao para esta acao.', 'danger');
    } else if (err.status === 404) {
      this.toast('Recurso nao encontrado.', 'warning');
    } else if (err.status === 429) {
      this.toast('Muitas tentativas. Aguarde um momento.', 'warning');
    } else if (err.status >= 500) {
      this.toast('Erro no servidor. Tente novamente.', 'danger');
    } else {
      this.toast(msg, 'danger');
    }
  },

  // ============================================================
  // PAGINATION HELPER
  // ============================================================
  renderPagination(current, total, perPage, onPageChange) {
    const pages = Math.ceil(total / perPage);
    if (pages <= 1) return '';

    let html = '<div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-top:1.5rem;">';

    if (current > 1) {
      html += `<button class="btn btn-sm btn-secondary" onclick="${onPageChange}(${current - 1})"><i data-lucide="chevron-left"></i></button>`;
    }

    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= current - 2 && i <= current + 2)) {
        html += `<button class="btn btn-sm ${i === current ? 'btn-primary' : 'btn-secondary'}" onclick="${onPageChange}(${i})">${i}</button>`;
      } else if (i === current - 3 || i === current + 3) {
        html += '<span style="color:var(--text-tertiary);">...</span>';
      }
    }

    if (current < pages) {
      html += `<button class="btn btn-sm btn-secondary" onclick="${onPageChange}(${current + 1})"><i data-lucide="chevron-right"></i></button>`;
    }

    html += `<span style="font-size:0.75rem;color:var(--text-tertiary);margin-left:0.5rem;">${total} registros</span></div>`;
    return html;
  },

  // ============================================================
  // DEBOUNCED SEARCH
  // ============================================================
  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // ============================================================
  // FORMAT HELPERS
  // ============================================================
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR');
  },

  timeAgo(dateStr) {
    if (!dateStr) return '-';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min atras`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atras`;
    return `${Math.floor(diff / 86400)}d atras`;
  },
};

// Expose globally
window.UI = UI;
