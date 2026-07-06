const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /completed?since=ISO
// Computed from status_history, not a point-in-time snapshot -- this is what
// makes "completed this week" correct even if a task later changes status again.
router.get('/', async (req, res) => {
  const since = req.query.since;
  if (!since) return res.status(400).json({ error: 'since (ISO date) is required' });

  const { rows } = await pool.query(
    `SELECT DISTINCT t.*
     FROM tasks t
     JOIN status_history sh ON sh.task_id = t.id
     WHERE sh.new_status = 'completed' AND sh.changed_at >= $1
     ORDER BY t.id`,
    [since]
  );
  res.json(rows);
});

module.exports = router;
