// Header-only auth. Used on every route except /health.
function requireApiKeyHeader(req, res, next) {
  const key = req.header('X-API-Key');
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// Dashboard-only convenience: accepts the key as a URL param so it can be a
// plain link. NEVER use this on the client-draft or write endpoints -- a URL
// param leaks into browser/proxy history the same way a password would.
function requireApiKeyHeaderOrQuery(req, res, next) {
  const key = req.header('X-API-Key') || req.query.key;
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).send('Unauthorized');
  }
  next();
}

module.exports = { requireApiKeyHeader, requireApiKeyHeaderOrQuery };
