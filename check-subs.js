const { getDb, initDatabase, createWrapper } = require('./server/database/connection');

async function check() {
  await initDatabase();
  const raw = getDb();
  const db = createWrapper(raw);
  const subs = db.prepare('SELECT * FROM push_subscriptions').all();
  console.log('Subscriptions no banco local:', subs.length);
  console.log(JSON.stringify(subs, null, 2));
}

check().catch(console.error);
