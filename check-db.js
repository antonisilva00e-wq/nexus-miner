const initSqlJs = require('sql.js');
const fs = require('fs');
const path = './server/data/nexusminer.db';
if (!fs.existsSync(path)) { console.log('NO DB FILE'); process.exit(0); }
initSqlJs().then(SQL => {
  const db = new SQL.Database(fs.readFileSync(path));
  const users = db.exec('SELECT id, username, email FROM users');
  console.log('USERS:', JSON.stringify(users));
  const clients = db.exec('SELECT id, username, email FROM clients');
  console.log('CLIENTS:', JSON.stringify(clients));
});
