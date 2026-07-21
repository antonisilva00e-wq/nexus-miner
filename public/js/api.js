// API Client - with auto token refresh and error handling
const API = {
  getToken() { return localStorage.getItem('nexus_access_token'); },
  getRefreshToken() { return localStorage.getItem('nexus_refresh_token'); },

  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('nexus_access_token', data.accessToken);
        return data.accessToken;
      }
    } catch {}
    return null;
  },

  async request(method, path, body, isRetry = false) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch('/api' + path, opts);
    } catch (err) {
      const error = new Error('Erro de conexao com o servidor');
      error.status = 0;
      throw error;
    }

    if (res.status === 401 && !isRetry) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        return this.request(method, path, body, true);
      }
      try {
        const errorData = await res.clone().json();
        alert('DEBUG ERROR 401 on ' + path + ': ' + (errorData.error || ''));
      } catch (e) {
        alert('DEBUG ERROR 401 on ' + path);
      }
      Auth.logout();
      window.location.reload();
      return null;
    }

    const json = await res.json();
    if (!res.ok) {
      const error = new Error(json.error || 'Erro na requisicao');
      error.status = res.status;
      error.data = json;
      throw error;
    }
    return json;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },
};
