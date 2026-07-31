const fs = require('fs');
const code = fs.readFileSync('server/index.js', 'utf8');

const newSeed = \
    const existingRafa = db.prepare('SELECT id FROM users WHERE username = ?').get('rafa77');
    if (!existingRafa) {
      const bcrypt = require('bcryptjs');
      db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run('00000000-0000-0000-0000-000000000004', 'Rafael (Divulgador)', 'rafael@nexusminer.com', 'rafa77', bcrypt.hashSync('rafa.77', 12), 'manager');
      console.log('[SEED] Usuario rafa77 criado com sucesso');
    }
\;

const targetString = "const existingClient = db.prepare('SELECT id FROM clients WHERE username = ?').get('cliente1');";
const newCode = code.replace(targetString, newSeed + '\n    ' + targetString);

fs.writeFileSync('server/index.js', newCode);
console.log('done');
