const { initDatabase, saveDatabase } = require('./connection');
const { createSchema } = require('./schema');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function seedDemo() {
  const rawDb = await initDatabase();
  createSchema(rawDb);
  
  // Need to bypass the createWrapper and just use rawDb directly, or require the wrapper logic.
  // Actually, we can just execute raw SQL strings to be safe with sql.js.
  
  const demoId = crypto.randomUUID();
  const demoHash = bcrypt.hashSync('demo123', 10);
  
  console.log('[SEED] Creating Demo Investor Account...');
  
  // Check if exists
  const existing = rawDb.exec(`SELECT id FROM users WHERE username = 'demo'`);
  if (existing.length > 0 && existing[0].values.length > 0) {
    console.log('[SEED] Demo account already exists. Resetting password...');
    const eId = existing[0].values[0][0];
    rawDb.run(`UPDATE users SET password_hash = '${demoHash}', role = 'manager' WHERE id = '${eId}'`);
  } else {
    rawDb.run(`INSERT INTO users (id, name, email, username, password_hash, role, active) VALUES ('${demoId}', 'Investor Demo', 'demo@nexus.com', 'demo', '${demoHash}', 'manager', 1)`);
  }
  
  // Create fake clients for the demo user
  console.log('[SEED] Creating Mock Data (Clients/Revenue)...');
  const dId = existing.length > 0 ? existing[0].values[0][0] : demoId;
  
  // Delete old mock data
  rawDb.run(`DELETE FROM clients WHERE created_by = '${dId}'`);
  
  for(let i=1; i<=15; i++) {
    const cId = crypto.randomUUID();
    const plans = ['Mensal', 'Semestral', 'Anual'];
    const p = plans[Math.floor(Math.random() * plans.length)];
    const val = p === 'Mensal' ? 197 : p === 'Semestral' ? 997 : 1997;
    rawDb.run(`
      INSERT INTO clients (id, name, email, phone, username, password_hash, plan, price, expiry, active, created_by) 
      VALUES ('${cId}', 'Demo Agency Client ${i}', 'client${i}@demo.com', '5511999999999', 'clientdemo${i}', '${demoHash}', '${p}', ${val}, '2027-01-01', 1, '${dId}')
    `);
  }

  saveDatabase();
  console.log('[SEED] Demo Database seeded successfully!');
  console.log('------------------------------------------------');
  console.log('Login: demo');
  console.log('Password: demo123');
  console.log('------------------------------------------------');
  process.exit(0);
}

seedDemo().catch(console.error);
