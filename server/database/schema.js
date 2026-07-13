function createSchema(db) {
  db.exec(`
    -- Usuários do sistema
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'seller',
      plan TEXT DEFAULT 'free',
      plan_expiry DATETIME,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Leads (prospectos minerados)
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cnpj TEXT,
      activity TEXT,
      phone TEXT,
      email TEXT,
      site TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      ddd TEXT,
      owner TEXT,
      bank_code TEXT,
      bank_name TEXT,
      rating REAL,
      source TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'novo',
      pipeline_stage TEXT DEFAULT 'leads',
      assigned_to TEXT REFERENCES users(id),
      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Notas/histórico dos leads
    CREATE TABLE IF NOT EXISTS lead_notes (
      id TEXT PRIMARY KEY,
      lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tags/categorias
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#818cf8'
    );

    -- Relação lead-tag
    CREATE TABLE IF NOT EXISTS lead_tags (
      lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
      tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (lead_id, tag_id)
    );

    -- Clientes/assinantes
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT DEFAULT 'Starter',
      price REAL DEFAULT 0,
      expiry DATE,
      active INTEGER DEFAULT 1,
      commission_balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Assinaturas
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
      plan TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'active',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      payment_method TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Pagamentos
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      subscription_id TEXT REFERENCES subscriptions(id),
      client_id TEXT REFERENCES clients(id),
      amount REAL NOT NULL,
      payment_date DATE NOT NULL,
      payment_method TEXT,
      status TEXT DEFAULT 'paid',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Templates de mensagem
    CREATE TABLE IF NOT EXISTS message_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'followup',
      variables TEXT,
      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Mensagens enviadas
    CREATE TABLE IF NOT EXISTS messages_sent (
      id TEXT PRIMARY KEY,
      lead_id TEXT REFERENCES leads(id),
      client_id TEXT REFERENCES clients(id),
      template_id TEXT REFERENCES message_templates(id),
      channel TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      sent_by TEXT REFERENCES users(id),
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit log / atividades
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Configurações do sistema
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- API Keys
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      permissions TEXT DEFAULT 'read',
      active INTEGER DEFAULT 1,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indicações
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_client_id TEXT NOT NULL,
      referred_username TEXT UNIQUE NOT NULL,
      referred_email TEXT,
      referred_name TEXT,
      referral_code TEXT,
      status TEXT DEFAULT 'pending',
      activated_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Comissões
    CREATE TABLE IF NOT EXISTS commissions (
      id TEXT PRIMARY KEY,
      referrer_client_id TEXT NOT NULL,
      lead_id TEXT,
      lead_value REAL DEFAULT 0,
      commission_amount REAL DEFAULT 0,
      platform_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Saldo de comissão nos clientes
    -- (commission_balance column added via migration in plans.js)

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_pipeline ON leads(pipeline_stage);
    CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
    CREATE INDEX IF NOT EXISTS idx_clients_expiry ON clients(expiry);
    CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sent_lead ON messages_sent(lead_id);
  `);

  // Migrations - add missing columns
  const migrations = [
    'ALTER TABLE clients ADD COLUMN commission_balance REAL DEFAULT 0',
    'ALTER TABLE clients ADD COLUMN invite_code TEXT',
    'ALTER TABLE clients ADD COLUMN referred_by TEXT',
    'ALTER TABLE users ADD COLUMN plan TEXT DEFAULT "free"',
    'ALTER TABLE users ADD COLUMN plan_expiry DATETIME',
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch {}
  }
}

module.exports = { createSchema };
