// Standard set only -- Jay confirmed no NYFG-specific additions (2026-07-07).

// Never allowed in a client-facing draft, case-insensitive substring match.
const HARD_STOPS = [
  'pricing',
  'price',
  'cost breakdown',
  'margin',
  'methodology',
  'internal strategy',
  'commercial',
  're-scope',
  'rescope',
  'change order',
  'do not send',
  'staff performance',
  'guarantee',
  'guaranteed',
];

// Internal people/vendor names that must never appear in a client draft.
// Client draft speaks as "our team" instead.
const INTERNAL_NAMES = [
  'jay', 'tina', 'carlo', 'kamil', 'suhas', 'penny',
  'cherry', 'aithical',
  'bert', 'blue petal', // vendor name, internal-facing even though NYFG-adjacent
];

// Prohibited vocabulary (marketing filler / overpromise language), per playbook.
const PROHIBITED_VOCAB = [
  'streamline', 'leverage', 'unlock', 'game-changer', 'game changer',
  'cutting-edge', 'cutting edge', 'seamless', 'robust', 'synergy',
  'empower', 'delve',
];

function scanForViolations(text) {
  const lower = text.toLowerCase();
  const violations = [];

  for (const term of HARD_STOPS) {
    if (lower.includes(term)) violations.push({ type: 'hard_stop', term });
  }
  for (const name of INTERNAL_NAMES) {
    if (lower.includes(name.toLowerCase())) violations.push({ type: 'internal_name', term: name });
  }
  for (const word of PROHIBITED_VOCAB) {
    if (lower.includes(word)) violations.push({ type: 'prohibited_vocab', term: word });
  }
  if (text.includes('\u2014')) {
    violations.push({ type: 'em_dash', term: '\u2014' });
  }

  return violations;
}

module.exports = { HARD_STOPS, INTERNAL_NAMES, PROHIBITED_VOCAB, scanForViolations };
