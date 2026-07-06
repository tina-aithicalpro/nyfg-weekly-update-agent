const express = require('express');
const router = express.Router();
const pool = require('../db');
const { composeClientDraft } = require('../services/llm');
const { stripForClientPrompt, failClosedCheck } = require('../services/redaction');

const APPROVER = 'Jay';

// POST /client-draft
// Header-only auth (enforced by the router mount, never accepts a URL-param key).
// Reads the SAME task data as /dashboard, but strips internal fields BEFORE the
// LLM prompt and scans the LLM's output AFTER. Refuses (409) rather than ships
// a draft that fails the scan. Never sends anything. Only ever returns a draft
// for a human to review.
router.post('/', async (req, res) => {
  const { rows: tasks } = await pool.query(
    "SELECT * FROM tasks WHERE status != 'on_hold_internal'"
    // on_hold_internal is a dashboard-only concept; it never reaches the client draft at all.
  );

  const stripped = stripForClientPrompt(tasks);

  let draft;
  try {
    draft = await composeClientDraft(stripped, APPROVER);
  } catch (err) {
    return res.status(500).json({ error: 'draft generation failed', detail: err.message });
  }

  const check = failClosedCheck(draft);
  if (!check.passed) {
    // Fail closed: block the response rather than ship a compliance leak.
    return res.status(409).json({
      refused: true,
      reason: 'Draft failed the fail-closed compliance scan and was not returned.',
      violations: check.violations,
    });
  }

  res.json({ draft, approver: APPROVER, note: 'DRAFT ONLY. Route to Jay for approval. A human must send this.' });
});

module.exports = router;
