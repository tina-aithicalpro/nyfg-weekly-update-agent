// Static, verified value. NOT live-computed. Update by hand only when a new
// audit produces a new verified score -- never let this drift silently.
const BASELINE = {
  label: 'AI Visibility Score (6 engines: ChatGPT, Gemini, Perplexity, Grok, Genspark, DeepSeek)',
  current: 1.3,
  target: 8.0,
  scale: 10,
  guaranteeNote: 'Top-5 in at least 2 of 6 engines within 60 days',
  lastVerified: '2026-07-07',
};

module.exports = { BASELINE };
