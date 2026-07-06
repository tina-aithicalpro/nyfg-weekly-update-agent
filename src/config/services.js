// Locked per Jay, 2026-07-07. Do not rediscover services on future runs.
// If the service list ever changes, it must be a deliberate edit here plus a
// corresponding row update in the `services` table -- not a live pull.
const SERVICES = [
  'AI Visibility Program',
  'Website Conversion Infrastructure',
  'Social Media Management',
];

module.exports = { SERVICES };
