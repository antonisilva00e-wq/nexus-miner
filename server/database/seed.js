const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { initDatabase, getDb, createWrapper, saveDatabase } = require('./connection');
const { createSchema } = require('./schema');

async function seed() {
  await initDatabase();
  const rawDb = getDb();
  const db = createWrapper(rawDb);

  createSchema(db);

  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (existingAdmin) {
    console.log('Seed already done. Admin user exists.');
    return;
  }

  const adminId = uuidv4();
  const managerId = uuidv4();
  const sellerId = uuidv4();

  const adminHash = bcrypt.hashSync('admin123', 12);
  const managerHash = bcrypt.hashSync('manager123', 12);
  const sellerHash = bcrypt.hashSync('seller123', 12);

  const insertUser = db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)');
  insertUser.run(adminId, 'Administrador', 'admin@nexusminer.com', 'admin', adminHash, 'admin');
  insertUser.run(managerId, 'Gerente Comercial', 'gerente@nexusminer.com', 'gerente', managerHash, 'manager');
  insertUser.run(sellerId, 'Vendedor', 'vendedor@nexusminer.com', 'vendedor', sellerHash, 'seller');

  const insertTag = db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)');
  [['Quente', '#f43f5e'], ['Frio', '#38bdf8'], ['Retorno', '#f59e0b'], ['Prioridade', '#818cf8'], ['Enterprise', '#10b981'], ['Startup', '#a78bfa']]
    .forEach(([name, color]) => insertTag.run(uuidv4(), name, color));

  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('company_name', 'Nexus Miner');
  insertSetting.run('default_pipeline_stages', JSON.stringify(['leads', 'contato', 'proposta', 'fechado', 'perdido']));

  const insertLead = db.prepare('INSERT INTO leads (id, name, cnpj, activity, phone, email, site, address, city, state, owner, bank_code, bank_name, rating, source, status, pipeline_stage, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  [
    { name: 'Imobiliária Central', cnpj: '12.345.678/0001-90', activity: 'Imobiliária', phone: '(41) 99876-5432', email: 'contato@imobcentral.com.br', site: 'www.imobcentral.com.br', address: 'Av. Sete de Setembro, 1200 - Centro, Curitiba - PR', city: 'Curitiba', state: 'Paraná', owner: 'Roberto Silva', bank: '341', bankName: 'Itaú Unibanco', rating: 4.5 },
    { name: 'Restaurante O Tempero', cnpj: '23.456.789/0001-01', activity: 'Restaurante', phone: '(41) 99123-4567', email: 'contato@otempero.com.br', site: 'www.otempero.com.br', address: 'Rua XV de Novembro, 450 - Centro, Curitiba - PR', city: 'Curitiba', state: 'Paraná', owner: 'Ana Souza', bank: '001', bankName: 'Banco do Brasil', rating: 4.8 },
    { name: 'SmartFit Academia', cnpj: '34.567.890/0001-12', activity: 'Academia', phone: '(11) 98765-4321', email: 'contato@smartfit.com.br', site: 'www.smartfit.com.br', address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP', city: 'São Paulo', state: 'São Paulo', owner: 'Carlos Lima', bank: '260', bankName: 'Nubank', rating: 4.3 },
  ].forEach(l => {
    insertLead.run(uuidv4(), l.name, l.cnpj, l.activity, l.phone, l.email, l.site, l.address, l.city, l.state, l.owner, l.bank, l.bankName, l.rating, 'manual', 'novo', 'leads', sellerId, adminId);
  });

  saveDatabase();
  console.log('Seed completed successfully!');
  console.log('Admin login: admin / admin123');
  console.log('Manager login: gerente / manager123');
  console.log('Seller login: vendedor / seller123');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
