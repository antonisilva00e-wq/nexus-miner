// Users Page (Admin only)
const UsersPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Gerenciar Usuários';
    document.getElementById('page-subtitle').textContent = 'Administração de acessos';

    document.getElementById('page-users').innerHTML = `
      <div class="card">
        <div class="card-header"><h3><i data-lucide="shield"></i>Usuários do Sistema</h3>
          <button class="btn btn-primary" onclick="UsersPage.openModal()"><i data-lucide="user-plus"></i>Novo Usuário</button>
        </div>
        <div class="table-wrapper">
          <table><thead><tr><th>Nome</th><th>Email</th><th>Usuário</th><th>Role</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody id="users-tbody"></tbody></table>
        </div>
      </div>
    `;
    lucide.createIcons();
    await this.loadUsers();
  },

  async loadUsers() {
    try {
      const data = await API.get('/users');
      const roleLabels = { admin: 'Administrador', manager: 'Gerente', seller: 'Vendedor' };
      const roleClasses = { admin: 'badge-danger', manager: 'badge-warning', seller: 'badge-primary' };

      document.getElementById('users-tbody').innerHTML = data.users.map(u => `
        <tr>
          <td><strong style="color:white;">${u.name}</strong></td>
          <td style="color:var(--text-secondary);">${u.email}</td>
          <td><code style="background:rgba(129,140,248,0.1);color:var(--accent-primary);padding:2px 6px;border-radius:4px;">${u.username}</code></td>
          <td><span class="badge ${roleClasses[u.role] || 'badge-primary'}">${roleLabels[u.role] || u.role}</span></td>
          <td><span class="badge ${u.active ? 'badge-success' : 'badge-danger'}">${u.active ? 'Ativo' : 'Inativo'}</span></td>
          <td><div style="display:flex;gap:0.25rem;">
            <button class="btn btn-sm btn-secondary" onclick="UsersPage.editUser('${u.id}')" title="Editar"><i data-lucide="edit-3"></i></button>
            ${u.id !== Auth.getUser()?.id ? `<button class="btn btn-sm btn-danger" onclick="UsersPage.deactivateUser('${u.id}')" title="Desativar"><i data-lucide="user-x"></i></button>` : ''}
          </div></td>
        </tr>
      `).join('');
      lucide.createIcons();
    } catch (err) { showToast('Erro ao carregar usuários', 'danger'); }
  },

  openModal(userId = null) {
    const isEdit = !!userId;
    Modal.open(
      isEdit ? '<i data-lucide="edit-3" style="color:var(--accent-secondary);"></i> Editar Usuário' : '<i data-lucide="user-plus" style="color:var(--accent-primary);"></i> Novo Usuário',
      `<form id="user-form">
        <input type="hidden" id="uf-id" value="${userId || ''}">
        <div class="form-grid"><div class="form-group"><label>Nome *</label><input type="text" id="uf-name" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
        <div class="form-group"><label>Email *</label><input type="email" id="uf-email" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div></div>
        <div class="form-grid"><div class="form-group"><label>Usuário *</label><input type="text" id="uf-username" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
        <div class="form-group"><label>${isEdit ? 'Nova Senha (opcional)' : 'Senha *'}</label><input type="password" id="uf-password" ${isEdit ? '' : 'required'} style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div></div>
        <div class="form-group"><label>Role</label><select id="uf-role" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;"><option value="seller">Vendedor</option><option value="manager">Gerente</option><option value="admin">Administrador</option></select></div>
      </form>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
       <button class="btn btn-primary" onclick="UsersPage.saveUser()"><i data-lucide="save"></i>Salvar</button>`
    );
  },

  async saveUser() {
    const id = document.getElementById('uf-id').value;
    const body = {
      name: document.getElementById('uf-name').value.trim(),
      email: document.getElementById('uf-email').value.trim(),
      username: document.getElementById('uf-username').value.trim(),
      role: document.getElementById('uf-role').value,
    };
    const password = document.getElementById('uf-password').value.trim();
    if (password) body.password = password;
    if (!body.name || !body.email || !body.username) return showToast('Preencha todos os campos', 'warning');
    try {
      if (id) {
        await API.put(`/users/${id}`, body);
        showToast('Usuário atualizado!', 'success');
      } else {
        if (!password) return showToast('Senha é obrigatória', 'warning');
        await API.post('/users', body);
        showToast('Usuário criado!', 'success');
      }
      Modal.close();
      await this.loadUsers();
    } catch (err) { showToast('Erro: ' + err.message, 'danger'); }
  },

  async editUser(id) {
    try {
      const data = await API.get('/users');
      const u = data.users.find(x => x.id === id);
      if (!u) return;
      this.openModal(id);
      document.getElementById('uf-name').value = u.name;
      document.getElementById('uf-email').value = u.email;
      document.getElementById('uf-username').value = u.username;
      document.getElementById('uf-role').value = u.role;
    } catch (err) { console.error(err); }
  },

  async deactivateUser(id) {
    if (!confirm('Desativar este usuário?')) return;
    try {
      await API.del(`/users/${id}`);
      showToast('Usuário desativado', 'success');
      await this.loadUsers();
    } catch (err) { showToast('Erro: ' + err.message, 'danger'); }
  }
};
