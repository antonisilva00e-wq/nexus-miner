const http = require('http');

function req(method, url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, port: u.port, path: u.pathname, method, headers: headers || {} };
    if (body) opts.headers['Content-Type'] = 'application/json';
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

setTimeout(async () => {
  const base = 'http://localhost:3000';

  // Login
  const login = await req('POST', base + '/api/auth/login', {username:'adminj7', password:'admin.j7'});
  console.log('LOGIN:', login.status, login.status === 200 ? 'OK' : login.body);

  if (login.status !== 200) { process.exit(1); }

  const tok = JSON.parse(login.body).accessToken;
  const h = { Authorization: 'Bearer ' + tok };

  const apis = [
    '/api/health', '/api/dashboard/overview', '/api/leads', '/api/plans/current',
    '/api/clients', '/api/reports/overview', '/api/referrals/stats', '/api/activities',
    '/api/pipeline', '/api/templates', '/api/settings', '/api/plans/check/reports',
    '/api/dashboard/score-dist', '/api/dashboard/funnel', '/api/dashboard/alerts',
    '/api/dashboard/geo', '/api/dashboard/export', '/api/dashboard/leads-chart',
    '/api/dashboard/pipeline-chart', '/api/dashboard/top-sellers',
  ];

  const statics = [
    '/', '/css/variables.css', '/css/layout.css', '/css/components.css',
    '/js/app.js', '/js/auth.js', '/js/api.js', '/js/leaflet.js',
    '/js/chart.min.js', '/js/lucide.min.js', '/js/socket.io.min.js',
    '/js/pages/dashboard.js', '/js/pages/leads.js', '/js/pages/map.js',
    '/js/pages/kanban.js', '/js/pages/financial.js', '/js/pages/clients.js',
    '/js/pages/reports.js', '/js/pages/settings.js', '/js/components/ui.js',
    '/js/components/charts.js', '/js/notifications.js', '/js/notification-center.js',
    '/js/onboarding.js', '/js/theme.js', '/manifest.json',
  ];

  let ok = 0, fail = 0;

  console.log('\n=== API ENDPOINTS ===');
  for (const ep of apis) {
    const r = await req('GET', base + ep, null, h);
    if (r.status === 200) { ok++; console.log('OK  ' + ep); }
    else { fail++; console.log('FAIL ' + ep + ' -> ' + r.status + ' ' + r.body.substring(0, 80)); }
  }

  console.log('\n=== STATIC FILES ===');
  for (const s of statics) {
    const r = await req('GET', base + s);
    if (r.status === 200) { ok++; console.log('OK  ' + s + ' (' + r.body.length + ' bytes)'); }
    else { fail++; console.log('FAIL ' + s + ' -> ' + r.status); }
  }

  console.log('\n=== RESULTADO: ' + ok + ' OK / ' + fail + ' FALHOU ===');
  process.exit(fail > 0 ? 1 : 0);
}, 5000);
