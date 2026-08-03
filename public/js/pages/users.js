// Users Page (Admin/Manager with restrictions)
const UsersPage = {
  async render() {
    const user = Auth.getUser();
    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';

    document.getElementById('page-title').textContent = isAdmin ? 'Manage Users' : 'Manage Sellers';
    document.getElementById('page-subtitle').textContent = isAdmin ? 'Full access administration' : 'Sellers only';

    document.getElementById('page-users').innerHTML = `
      <div class="card">
        <div class="card-header"><h3><i data-lucide="shield"></i>${isAdmin ? 'System Users' : 'Sellers'}</h3>
          <button class="btn btn-primary" onclick="UsersPage.openModal()"><i data-lucide="user-plus"></i>New ${isAdmin ? 'User' : 'Seller'}</button>
        </div>
        <div class="table-wrapper">
          <table><thead><tr><th>Name</th><th>Email</th><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
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
      const user = Auth.getUser();
      const isAdmin = user?.role === 'admin';
      const roleLabels = { admin: 'Administrator', manager: 'Promoter', seller: 'Seller' };
      const roleClasses = { admin: 'badge-danger', manager: 'badge-warning', seller: 'badge-primary' };

      document.getElementById('users-tbody').innerHTML = data.users.map(u => `
        <tr>
          <td><strong style="color:white;">${u.name}</strong></td>
          <td style="color:var(--text-secondary);">${u.email}</td>
          <td><code style="background:rgba(129,140,248,0.1);color:var(--accent-primary);padding:2px 6px;border-radius:4px;">${u.username}</code></td>
          <td><span class="badge ${roleClasses[u.role] || 'badge-primary'}">${roleLabels[u.role] || u.role}</span></td>
          <td><span class="badge ${u.active ? 'badge-success' : 'badge-danger'}">${u.active ? 'Active' : 'Inactive'}</span></td>
          <td><div style="display:flex;gap:0.25rem;">
            ${u.id !== Auth.getUser()?.id ? `<button class="btn btn-sm btn-secondary" onclick="UsersPage.editUser('${u.id}')" title="Edit"><i data-lucide="edit-3"></i></button>` : ''}
            ${u.id !== Auth.getUser()?.id && isAdmin ? `<button class="btn btn-sm btn-danger" onclick="UsersPage.deactivateUser('${u.id}')" title="Deactivate"><i data-lucide="user-x"></i></button>` : ''}
          </div></td>
        </tr>
      `).join('');
      lucide.createIcons();
    } catch (err) { showToast('Error loading users', 'danger'); }
  },

  openModal(userId = null) {
    const isEdit = !!userId;
    const user = Auth.getUser();
    const isAdmin = user?.role === 'admin';

    // Managers can only create sellers
    const roleOptions = isAdmin
      ? '<option value="seller">Seller</option><option value="manager">Promoter</option><option value="admin">Administrator</option>'
      : '<option value="seller">Seller</option>';

    Modal.open(
      isEdit ? '<i data-lucide="edit-3" style="color:var(--accent-secondary);"></i> Edit User' : `<i data-lucide="user-plus" style="color:var(--accent-primary);"></i> New ${isAdmin ? 'User' : 'Seller'}`,
      `<form id="user-form">
        <input type="hidden" id="uf-id" value="${userId || ''}">
        <div class="form-grid"><div class="form-group"><label>Name *</label><input type="text" id="uf-name" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
        <div class="form-group"><label>Email *</label><input type="email" id="uf-email" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div></div>
        <div class="form-grid"><div class="form-group"><label>Username *</label><input type="text" id="uf-username" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
        <div class="form-group"><label>${isEdit ? 'New Password (optional)' : 'Password *'}</label><input type="password" id="uf-password" ${isEdit ? '' : 'required'} style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div></div>
        <div class="form-group"><label>Role</label><select id="uf-role" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;">${roleOptions}</select></div>
      </form>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
       <button class="btn btn-primary" onclick="UsersPage.saveUser()"><i data-lucide="save"></i>Save</button>`
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
    if (!body.name || !body.email || !body.username) return showToast('Please fill in all fields', 'warning');
    try {
      if (id) {
        await API.put(`/users/${id}`, body);
        showToast('User updated!', 'success');
      } else {
        if (!password) return showToast('Password is required', 'warning');
        await API.post('/users', body);
        showToast('User created!', 'success');
      }
      Modal.close();
      await this.loadUsers();
    } catch (err) { showToast('Error: ' + err.message, 'danger'); }
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
    if (!confirm('Deactivate this user?')) return;
    try {
      await API.del(`/users/${id}`);
      showToast('User deactivated', 'success');
      await this.loadUsers();
    } catch (err) { showToast('Error: ' + err.message, 'danger'); }
  }
};
