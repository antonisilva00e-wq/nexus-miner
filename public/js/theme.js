// Theme Toggle — Dark/Light mode
const Theme = {
  current: 'dark',

  init() {
    const saved = localStorage.getItem('nexus_theme') || 'dark';
    this.apply(saved);
  },

  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
    this.apply(this.current);
    localStorage.setItem('nexus_theme', this.current);
  },

  apply(theme) {
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.innerHTML = theme === 'dark'
        ? '<i data-lucide="sun"></i>'
        : '<i data-lucide="moon"></i>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
};
