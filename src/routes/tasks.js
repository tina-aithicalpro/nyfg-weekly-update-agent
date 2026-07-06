const express = require('express');
const router = express.Router();
const pool = require('../db');
const { parsePastedTasks } = require('../services/llm');

const VALID_STATUSES = ['to_do', 'in_progress', 'completed', 'on_hold_client', 'on_hold_internal'];
const VALID_TASK_TYPES = ['one_shot', 'recurring'];

// GET /tasks?status=&workstream=&origin=
router.get('/', async (req, res) => {
  const { status, workstream, origin } = req.query;
  const clauses = [];
  const values = [];

  if (status) {
    values.push(status);
    clauses.push(`status = $${values.length}`);
  }
  if (workstream) {
    values.push(workstream);
    clauses.push(`workstream = $${values.length}`);
  }
  if (origin) {
    values.push(origin);
    clauses.push(`origin = $${values.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT * FROM tasks ${where} ORDER BY id`, values);
  res.json(rows);
});

// GET /tasks/{id}
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
});

// POST /tasks -- add an agent-origin task
router.post('/', async (req, res) => {
  const { title, origin, external_ref, workstream, task_type, cadence, assignee } = req.body;

  if (!title || !origin || !workstream) {
    return res.status(400).json({ error: 'title, origin, and workstream are required' });
  }
  const type = task_type || 'one_shot';
  if (!VALID_TASK_TYPES.includes(type)) {
    return res.status(400).json({ error: `invalid task_type: ${type}` });
  }
  if (type === 'recurring' && !cadence) {
    return res.status(400).json({ error: 'cadence is required for recurring tasks' });
  }
  if (type === 'one_shot' && cadence) {
    return res.status(400).json({ error: 'cadence must be omitted for one_shot tasks' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO tasks (origin, external_ref, title, workstream, task_type, cadence, assignee)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [origin, external_ref || null, title, workstream, type, cadence || null, assignee || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // Surfaces DB-level CHECK constraint violations rather than masking them.
    res.status(400).json({ error: err.message });
  }
});

// POST /tasks/{id}/status
router.post('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `invalid status: ${status}` });
  }

  const { rows } = await pool.query(
    'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
});

// POST /tasks/parse -- Stage 2, tolerant parsing of a pasted task list.
// Does NOT write to the database. Returns a grid for Jay to review and confirm.
router.post('/parse', async (req, res) => {
  const { rawText } = req.body;
  if (!rawText) return res.status(400).json({ error: 'rawText is required' });

  try {
    const parsed = await parsePastedTasks(rawText, 'Jay');
    res.json({ parsed });
  } catch (err) {
    res.status(500).json({ error: 'parse failed', detail: err.message });
  }
});

module.exports = router;
