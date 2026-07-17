const http = require('http');

const data = JSON.stringify({ clientName: 'Leticia Martins Franco', value: 297.00 });

const req = http.request({
  hostname: 'localhost',
  port: 3000,
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
