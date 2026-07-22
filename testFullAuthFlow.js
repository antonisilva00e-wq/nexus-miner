const http = require('http');

// Start server
process.env.PORT = '3099';
process.env.NODE_ENV = 'production';
require('./server/index');

setTimeout(async () => {
  try {
    console.log('--- Testing Login ---');
    const loginRes = await fetch('http://localhost:3099/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'adminj7', password: 'admin.j7' })
    });

    console.log('Login status:', loginRes.status);
    const loginData = await loginRes.json();
    console.log('Login result user:', loginData.user);
    console.log('Token length:', loginData.accessToken?.length);

    if (!loginData.accessToken) {
      console.error('FAILED: No access token');
      process.exit(1);
    }

    console.log('\n--- Testing Dashboard Overview Request ---');
    const dashRes = await fetch('http://localhost:3099/api/dashboard/overview?period=30d', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.accessToken}`
      }
    });

    console.log('Dashboard overview status:', dashRes.status);
    const dashData = await dashRes.json();
    console.log('Dashboard overview data totalLeads:', dashData.totalLeads);

    if (dashRes.status === 200) {
      console.log('\nSUCCESS! Authentication and Dashboard API working perfectly.');
    } else {
      console.error('\nFAILED! Status:', dashRes.status, 'Error:', dashData);
    }
  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    process.exit(0);
  }
}, 2000);
