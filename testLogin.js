const http = require('http');

const loginData = JSON.stringify({ username: 'adminj7', password: 'admin.j7' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Login Response:', res.statusCode, data);
    
    if (res.statusCode === 200) {
      const { accessToken } = JSON.parse(data);
      
      const dashOpts = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/dashboard/overview?period=30d',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      };
      
      const dashReq = http.request(dashOpts, (dRes) => {
        let dData = '';
        dRes.on('data', (c) => { dData += c; });
        dRes.on('end', () => {
          console.log('Dashboard Response:', dRes.statusCode, dData);
        });
      });
      dashReq.end();
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(loginData);
req.end();
