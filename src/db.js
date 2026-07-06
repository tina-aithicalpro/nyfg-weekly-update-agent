const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  // Fail closed: never boot without a database connection string.
  console.error('FATAL: DATABASE_URL is not set. Refusing to start.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
});

module.exports = pool;
