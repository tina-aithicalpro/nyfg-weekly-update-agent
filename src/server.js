require('dotenv').config();
const express = require('express');

// Fail closed: refuse to boot without required secrets.
if (!process.env.API_KEY) {
  console.error('FATAL: API_KEY is not set. Refusing to start.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set. Refusing to start.');
  process.exit(1);
}

const { requireApiKeyHeader, requireApiKeyHeaderOrQuery } = require('./middleware/auth');

const app = express();
app.use(express.json({ limit: '2mb' }));

const healthRoutes = require('./routes/health');
const taskRoutes = require('./routes/tasks');
const completedRoutes = require('./routes/completed');
const dashboardRoutes = require('./routes/dashboard');
const clientDraftRoutes = require('./routes/clientDraft');

// No auth.
app.use(healthRoutes);

// Header-only auth (strict) for all writes and task reads. Scoped to /tasks
// so it does not intercept requests meant for /dashboard's looser auth.
app.use('/tasks', requireApiKeyHeader, taskRoutes);
app.use('/completed', requireApiKeyHeader, completedRoutes);

// Dashboard: header OR URL-param key, so it can be a plain link.
// This exception is deliberate and documented -- never extend it to writes.
app.use('/dashboard', requireApiKeyHeaderOrQuery, dashboardRoutes);

// Client draft: header-only, ALWAYS. Never accepts a URL-param key.
app.use('/client-draft', requireApiKeyHeader, clientDraftRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`NYFG Weekly Update Agent listening on port ${PORT}`);
});
