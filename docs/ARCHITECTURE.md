# Nexus Miner ERP - Full-Stack Architecture Plan

## 1. Project Structure

```
nexus-miner-erp/
├── package.json
├── .env
├── .env.example
├── server/
│   ├── index.js
│   ├── config.js
│   ├── db/
│   │   ├── connection.js
│   │   ├── migrate.js
│   │   ├── migrations/
│   │   │   └── 001_init.sql
│   │   └── seeds/
│   │       └── admin.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rateLimit.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── leads.js
│   │   ├── pipeline.js
│   │   ├── clients.js
│   │   ├── financials.js
│   │   ├── whatsapp.js
│   │   ├── apikeys.js
│   │   └── reports.js
│   └── services/
│       ├── leadService.js
│       ├── whatsappService.js
│       ├── financialService.js
│       └── notificationService.js
├── public/
│   ├── index.html
│   ├── login.html
│   ├── css/
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── sidebar.css
│   │   ├── kanban.css
│   │   ├── dashboard.css
│   │   └── components.css
│   ├── js/
│   │   ├── app.js
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── router.js
│   │   ├── store.js
│   │   ├── modules/
│   │   │   ├── dashboard.js
│   │   │   ├── leads.js
│   │   │   ├── kanban.js
│   │   │   ├── clients.js
│   │   │   ├── financials.js
│   │   │   ├── whatsapp.js
│   │   │   ├── settings.js
│   │   │   └── apikeys.js
│   │   └── utils/
│   │       ├── toast.js
│   │       ├── masks.js
│   │       ├── csv.js
│   │       └── charts.js
│   └── assets/
│       └── logo.jpg
├── data/
│   └── nexus.db
└── scripts/
    └── migrate-localstorage.js
```

## 2. Complete Database Schema (SQLite)

### USERS & AUTHENTICATION

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'seller'
                CHECK(role IN ('admin','manager','seller')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_login    TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE refresh_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  revoked    INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### LEADS & CRM PIPELINE

```sql
CREATE TABLE leads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  cnpj         TEXT,
  activity     TEXT,
  phone        TEXT,
  email        TEXT,
  website      TEXT,
  address      TEXT,
  state        TEXT,
  city         TEXT,
  neighborhood TEXT,
  owner_name   TEXT,
  bank_code    TEXT,
  bank_name    TEXT,
  rating       REAL,
  source       TEXT DEFAULT 'offline',
  assigned_to  INTEGER REFERENCES users(id),
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_activity ON leads(activity);

CREATE TABLE lead_stages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  stage      TEXT NOT NULL DEFAULT 'novo'
             CHECK(stage IN ('novo','contato','negociacao','fechado','perdido')),
  entered_at TEXT DEFAULT (datetime('now')),
  exited_at  TEXT,
  position   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_stages_lead ON lead_stages(lead_id);
CREATE INDEX idx_stages_stage ON lead_stages(stage);

CREATE TABLE lead_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id),
  note       TEXT NOT NULL,
  type       TEXT DEFAULT 'note' CHECK(type IN ('note','call','email','whatsapp')),
  created_at TEXT DEFAULT (datetime('now'))
);
```

### CLIENTS (subscriptions)

```sql
CREATE TABLE clients (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id       INTEGER REFERENCES leads(id),
  full_name     TEXT NOT NULL,
  email         TEXT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone         TEXT,
  plan          TEXT NOT NULL DEFAULT 'Starter'
                CHECK(plan IN ('Starter','Pro','Business','Personalizado')),
  monthly_price REAL NOT NULL DEFAULT 97.00,
  expiry_date   TEXT NOT NULL,
  status        TEXT DEFAULT 'active'
                CHECK(status IN ('active','expiring','expired','cancelled')),
  notes         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE invoices (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount     REAL NOT NULL,
  due_date   TEXT NOT NULL,
  paid_date  TEXT,
  status     TEXT DEFAULT 'pending'
             CHECK(status IN ('pending','paid','overdue','cancelled')),
  notes      TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### WHATSAPP MODULE

```sql
CREATE TABLE whatsapp_connections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  phone_number TEXT,
  status       TEXT DEFAULT 'disconnected'
               CHECK(status IN ('connected','disconnected','qr_pending')),
  connected_at TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE whatsapp_templates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  name       TEXT NOT NULL,
  body       TEXT NOT NULL,
  variables  TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE whatsapp_messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id       INTEGER REFERENCES leads(id),
  user_id       INTEGER REFERENCES users(id),
  connection_id INTEGER REFERENCES whatsapp_connections(id),
  phone_number  TEXT NOT NULL,
  direction     TEXT NOT NULL CHECK(direction IN ('sent','received')),
  body          TEXT NOT NULL,
  status        TEXT DEFAULT 'sent'
                CHECK(status IN ('sent','delivered','read','failed')),
  template_id   INTEGER REFERENCES whatsapp_templates(id),
  sent_at       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_wpp_messages_lead ON whatsapp_messages(lead_id);

CREATE TABLE whatsapp_followups (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id      INTEGER NOT NULL REFERENCES leads(id),
  user_id      INTEGER NOT NULL REFERENCES users(id),
  template_id  INTEGER REFERENCES whatsapp_templates(id),
  message      TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  sent_at      TEXT,
  status       TEXT DEFAULT 'pending'
               CHECK(status IN ('pending','sent','cancelled')),
  created_at   TEXT DEFAULT (datetime('now'))
);
```

### API KEYS & AUDIT

```sql
CREATE TABLE api_keys (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  name       TEXT NOT NULL,
  key_hash   TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes     TEXT NOT NULL DEFAULT '["leads:read"]',
  is_active  INTEGER DEFAULT 1,
  last_used  TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id),
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  INTEGER,
  details    TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

## 3. API Route Structure

### Authentication
```
POST   /api/auth/login              Returns access + refresh tokens
POST   /api/auth/rotate             Rotate refresh token
POST   /api/auth/logout             Revoke refresh token
GET    /api/auth/me                 Current user profile
```

### Users (admin only)
```
GET    /api/users                   List users
POST   /api/users                   Create user
PUT    /api/users/:id               Update user
DELETE /api/users/:id               Deactivate user
```

### Leads
```
GET    /api/leads                   List (?stage=&assigned=&search=&page=&limit=)
POST   /api/leads                   Create lead
GET    /api/leads/:id               Single lead + notes + history
PUT    /api/leads/:id               Update lead
DELETE /api/leads/:id               Soft-delete
POST   /api/leads/search            Nominatim + offline search
POST   /api/leads/:id/save          Save to pipeline
```

### Pipeline (Kanban)
```
GET    /api/pipeline                All leads grouped by stage
PUT    /api/pipeline/:leadId/move   Move lead { stage, position }
GET    /api/pipeline/stats          Counts per stage
```

### Lead Notes
```
GET    /api/leads/:id/notes         Notes history
POST   /api/leads/:id/notes         Add note
```

### Clients
```
GET    /api/clients                 List clients
POST   /api/clients                 Create client
PUT    /api/clients/:id             Update client
DELETE /api/clients/:id             Delete client
GET    /api/clients/:id/invoices    Client invoices
POST   /api/clients/:id/invoices    Create invoice
PUT    /api/invoices/:id            Mark paid
```

### Financials
```
GET    /api/financials/mrr          Current MRR
GET    /api/financials/mrr/history  MRR over time
GET    /api/financials/churn        Churn rate
GET    /api/financials/revenue      Revenue summary
GET    /api/financials/forecast     Revenue forecast
GET    /api/financials/invoices     All invoices (?status=)
```

### Reports (Dashboard)
```
GET    /api/reports/dashboard       All KPIs in one call
GET    /api/reports/leads-by-status Leads per pipeline stage
GET    /api/reports/revenue-chart   Monthly revenue data
GET    /api/reports/conversion      Stage-to-stage conversion rates
```

### WhatsApp
```
GET    /api/whatsapp/status         Connection status
POST   /api/whatsapp/connect        Initiate QR generation
GET    /api/whatsapp/qr             Current QR (polling)
POST   /api/whatsapp/disconnect     Disconnect session
POST   /api/whatsapp/send           Send message { phone, message }
GET    /api/whatsapp/templates      List templates
POST   /api/whatsapp/templates      Create template
PUT    /api/whatsapp/templates/:id  Update template
DELETE /api/whatsapp/templates/:id  Delete template
POST   /api/whatsapp/followup       Schedule follow-up
GET    /api/whatsapp/followups      Pending follow-ups
DELETE /api/whatsapp/followups/:id  Cancel follow-up
GET    /api/whatsapp/messages       Message log
```

### API Keys
```
GET    /api/apikeys                 List keys
POST   /api/apikeys                 Generate key
DELETE /api/apikeys/:id             Revoke key
```

### Import/Export
```
POST   /api/import/json             Import localStorage JSON
GET    /api/export/leads            Export leads CSV
GET    /api/export/clients          Export clients CSV
```

## 4. Authentication Flow

### Login Sequence

1. Client: `POST /api/auth/login { username, password }`
2. Server: `bcrypt.compare(password, user.password_hash)`
3. Server: Generate access token (15min JWT) + refresh token (7 day opaque string)
4. Store refresh token hash in `refresh_tokens` table
5. Return `{ accessToken, refreshToken, user: { id, name, role } }`
6. Client: Store accessToken in sessionStorage, refreshToken in httpOnly cookie

### Token Refresh

1. Client detects 401 OR token nearing expiry
2. `POST /api/auth/rotate { refreshToken }`
3. Server: verify token exists in DB, not revoked, not expired
4. Server: revoke old token, issue new pair
5. Return new `{ accessToken, refreshToken }`

### Middleware

```js
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}
```

### Role Permissions

| Resource   | admin | manager | seller    |
|------------|-------|---------|-----------|
| Users      | Full  | Read    | -         |
| Leads      | Full  | Full    | Own only  |
| Pipeline   | Full  | Full    | Own leads |
| Clients    | Full  | Full    | Read      |
| Financials | Full  | Read    | -         |
| WhatsApp   | Full  | Full    | Own conn  |
| API Keys   | Full  | Own     | Own       |
| Reports    | Full  | Full    | Own data  |

## 5. Frontend Architecture

### SPA Router (hash-based, no build step)

```js
const routes = {
  '#/dashboard':  { module: 'dashboard',  title: 'Dashboard' },
  '#/leads':      { module: 'leads',      title: 'Minerar Leads' },
  '#/kanban':     { module: 'kanban',     title: 'Pipeline' },
  '#/clients':    { module: 'clients',    title: 'Clientes' },
  '#/financials': { module: 'financials', title: 'Financeiro',
                    roles: ['admin','manager'] },
  '#/whatsapp':   { module: 'whatsapp',   title: 'WhatsApp' },
  '#/settings':   { module: 'settings',   title: 'Configuracoes' },
  '#/apikeys':    { module: 'apikeys',    title: 'API Keys',
                    roles: ['admin','manager'] },
};
```

### Module Pattern

Each JS module is self-contained with init/render/destroy lifecycle:

```js
export default {
  init() { this.render(); this.bindEvents(); },
  render() { /* build DOM */ },
  bindEvents() { /* handlers */ },
  destroy() { /* cleanup listeners */ }
};
```

### API Client

```js
let accessToken = sessionStorage.getItem('accessToken');

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options.headers
    }
  });
  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) return api(path, options);
    window.location.href = '/login.html';
    throw new Error('Session expired');
  }
  return res.json();
}
```

### State Store (simple pub/sub)

```js
const store = {
  _state: { user: null, leads: [], clients: [] },
  _listeners: {},
  get(key) { return this._state[key]; },
  set(key, value) {
    this._state[key] = value;
    (this._listeners[key] || []).forEach(fn => fn(value));
  },
  on(key, fn) {
    (this._listeners[key] = this._listeners[key] || []).push(fn);
  }
};
```

## 6. Kanban Implementation

### HTML Structure

```html
<div id="kanban-board" class="kanban-board">
  <div class="kanban-column" data-stage="novo">
    <div class="kanban-column-header">
      <span class="stage-dot novo"></span>
      <h3>Novo</h3>
      <span class="kanban-count">0</span>
    </div>
    <div class="kanban-cards" data-stage="novo"></div>
  </div>
  <!-- Repeat for: contato, negociacao, fechado, perdido -->
</div>
```

### Drag and Drop (native HTML5 API)

```js
function initDragAndDrop() {
  document.querySelectorAll('.kanban-card').forEach(card => {
    card.setAttribute('draggable', true);
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.dataset.leadId);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });

  document.querySelectorAll('.kanban-cards').forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      column.classList.add('drag-over');
    });
    column.addEventListener('dragleave', () => column.classList.remove('drag-over'));
    column.addEventListener('drop', async (e) => {
      e.preventDefault();
      column.classList.remove('drag-over');
      const leadId = e.dataTransfer.getData('text/plain');
      const newStage = column.dataset.stage;
      moveCardToColumn(leadId, newStage);
      await api(`/pipeline/${leadId}/move`, {
        method: 'PUT',
        body: JSON.stringify({ stage: newStage })
      });
      updateColumnCounts();
    });
  });
}
```

### Backend Pipeline Move

```js
router.put('/:leadId/move', authenticate, (req, res) => {
  const { stage } = req.body;
  const { leadId } = req.params;
  db.transaction(() => {
    db.run(`UPDATE lead_stages SET exited_at = datetime('now')
            WHERE lead_id = ? AND exited_at IS NULL`, [leadId]);
    const maxPos = db.get(
      `SELECT COALESCE(MAX(position),0) as m FROM lead_stages WHERE lead_id = ?`,
      [leadId]
    );
    db.run(`INSERT INTO lead_stages (lead_id, stage, position) VALUES (?, ?, ?)`,
      [leadId, stage, maxPos.m + 1]);
  })();
  res.json({ success: true });
});
```

### Stage Colors

```css
.kanban-column[data-stage="novo"]       { --stage-color: #9ca3af; }
.kanban-column[data-stage="contato"]    { --stage-color: #38bdf8; }
.kanban-column[data-stage="negociacao"] { --stage-color: #fbbf24; }
.kanban-column[data-stage="fechado"]    { --stage-color: #34d399; }
.kanban-column[data-stage="perdido"]    { --stage-color: #f43f5e; }
```

## 7. WhatsApp Integration Architecture

### Library: `@whiskeysockets/baileys`

```
Server Process:
+---------------------------------------------+
|  WhatsApp Service (singleton)               |
|                                             |
|  - Persistent socket connection             |
|  - QR code generation as data URL           |
|  - Outbound message queue                   |
|  - Inbound message listener                 |
|  - Follow-up scheduler (cron-like)          |
+---------------------+-----------------------+
                      |
             Socket.IO (real-time)
                      |
                 Browser Client
```

### Connection Flow

1. `POST /api/whatsapp/connect` -- server creates Baileys socket, generates QR
2. QR stored in memory, status set to `qr_pending`
3. Client polls `GET /api/whatsapp/qr` every 3 seconds
4. User scans QR with phone
5. Socket authenticates, status changes to `connected`
6. Connection state persisted to `whatsapp_connections` table

### Message Queue

```js
class WhatsAppService {
  constructor() {
    this.sock = null;
    this.messageQueue = [];
    this.processing = false;
  }

  async sendMessage(phone, message, leadId) {
    const jid = `55${phone.replace(/\D/g, '')}@s.whatsapp.net`;
    this.messageQueue.push({ jid, message, leadId, timestamp: Date.now() });
    if (!this.processing) this.processQueue();
  }

  async processQueue() {
    this.processing = true;
    while (this.messageQueue.length > 0) {
      const item = this.messageQueue.shift();
      try {
        await this.sock.sendMessage(item.jid, { text: item.message });
        this.logMessage(item, 'sent');
      } catch (err) {
        this.logMessage(item, 'failed');
      }
      await this.sleep(1000);
    }
    this.processing = false;
  }
}
```

### Follow-Up Scheduler

Runs every minute via `setInterval`. Queries `whatsapp_followups` for pending items where `scheduled_at <= now`, interpolates template variables with lead data, sends message, marks as sent.

## 8. Financial Module Data Model

### MRR Calculation

```sql
SELECT COALESCE(SUM(monthly_price), 0) as mrr
FROM clients WHERE status = 'active';
```

### Churn Rate

```sql
-- Cancellations in period / total at start of period * 100
SELECT
  (SELECT COUNT(*) FROM clients
   WHERE status = 'cancelled'
     AND updated_at >= date('now', '-1 months')) * 100.0 /
  NULLIF((SELECT COUNT(*) FROM clients
   WHERE created_at <= date('now', '-1 months')), 0)
  as churn_rate;
```

### Revenue Forecast (linear regression on last 6 months)

```js
function forecastRevenue(monthsAhead = 3) {
  const history = getMRRHistory(6);
  if (history.length < 2) return [];
  const n = history.length;
  const x = history.map((_, i) => i);
  const y = history.map(h => h.revenue);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
  const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return Array.from({ length: monthsAhead }, (_, i) => ({
    month: futureMonth(i + 1),
    predicted: Math.round(intercept + slope * (n + i))
  }));
}
```

### Dashboard KPIs Endpoint

Returns in one call: MRR, churn rate, active clients, expiring clients, total leads, stage counts, recent invoices.

## 9. Key npm Packages

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.4.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.4.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "@whiskeysockets/baileys": "^6.7.0",
    "qrcode-terminal": "^0.12.0",
    "node-cron": "^3.0.3",
    "csv-stringify": "^6.4.5",
    "pino": "^8.18.0",
    "pino-pretty": "^10.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.3"
  }
}
```

**Why each:**
- **express** -- HTTP server and routing
- **better-sqlite3** -- Synchronous SQLite, fast for local use
- **bcryptjs** -- Pure JS bcrypt (no native compilation)
- **jsonwebtoken** -- JWT generation and verification
- **helmet** -- Security headers
- **express-rate-limit** -- Prevent brute-force attacks
- **express-validator** -- Input validation
- **@whiskeysockets/baileys** -- WhatsApp Web protocol client
- **node-cron** -- Scheduled follow-up processing
- **csv-stringify** -- CSV export generation
- **pino** -- Structured logging

## 10. Running Locally

### package.json scripts

```json
{
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",
    "db:init": "node server/db/migrate.js",
    "db:seed": "node server/db/seeds/admin.js",
    "migrate:localstorage": "node scripts/migrate-localstorage.js"
  }
}
```

### Environment Variables (.env)

```
PORT=3000
JWT_SECRET=nexus-miner-secret-change-this-in-production
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=7d
DB_PATH=./data/nexus.db
NODE_ENV=development
```

### First Run Sequence

```bash
npm install
mkdir data
npm run db:init
npm run db:seed
npm run dev
# Open http://localhost:3000
# Login: admin / admin123 (change immediately)
```

### Migration from localStorage

```bash
# In browser console, export leads:
# copy(localStorage.getItem('bizminer_saved_leads'))
# Save as leads.json, then:
npm run migrate:localstorage -- --file leads.json
```

## 11. Implementation Order

### Phase 1: Foundation (Week 1)
1. Project scaffolding (package.json, folder structure, .env)
2. Express server with helmet, cors, static file serving
3. SQLite connection + migration runner
4. Users table + bcrypt admin seed
5. JWT auth middleware (login, refresh, protect routes)
6. Frontend: login.html + auth.js
7. Frontend: SPA router + module loading

### Phase 2: Core CRM (Week 2)
8. Leads CRUD API
9. Lead search service (port Nominatim + offline DB)
10. Frontend: Lead search module
11. Pipeline stages + move endpoint
12. Frontend: Kanban board with drag-and-drop
13. Lead notes API + UI

### Phase 3: Client Management (Week 3)
14. Clients + Invoices tables
15. Client CRUD API
16. Frontend: Clients module
17. Invoice creation + payment tracking

### Phase 4: Dashboard & Financials (Week 4)
18. Reports API (dashboard aggregates)
19. Frontend: Dashboard with Chart.js
20. Financial service (MRR, churn, forecast)
21. Frontend: Financials module

### Phase 5: WhatsApp (Week 5)
22. Baileys integration service
23. QR code generation + connection flow
24. Message sending + template management
25. Follow-up scheduler
26. Frontend: WhatsApp module

### Phase 6: Multi-User & Polish (Week 6)
27. User management CRUD (admin)
28. Role-based route guards
29. Audit logging
30. API key management + public API
31. CSV import/export
32. Data migration from localStorage
33. Dark glassmorphism CSS refinement

## 12. Key Design Decisions

**better-sqlite3 over knex.js**: Synchronous SQLite calls simplify the codebase. No query builder overhead. Plain SQL migration files.

**Hash-based routing**: No build step, works with static serving, back button works, bookmarkable URLs.

**Baileys over WhatsApp Business API**: Business API requires Facebook approval and per-message costs. Baileys uses a regular WhatsApp account at no cost. Trade-off: unofficial protocol.

**Single index.html with modules**: The existing tab-switching pattern maps naturally to hash-based SPA routing. Each module lazy-loads its DOM.

**sessionStorage for access token**: Tokens clear on tab close, reducing exposure. Refresh tokens in httpOnly cookie when possible.

**Preserving existing CSS**: The dark glassmorphism design system with CSS variables is well-structured and transfers directly.
