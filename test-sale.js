const https = require('https');

const data = JSON.stringify({ clientName: 'Leticia Martins Franco', value: 297.00 });

const req = https.request({
  hostname: 'nexus-miner.onrender.com',
  path: '/api/webhook/sale',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Resposta:', body));
});

req.on('error', e => console.error('Erro:', e.message));
req.write(data);
req.end();
