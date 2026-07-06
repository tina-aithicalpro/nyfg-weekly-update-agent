const express = require('express');
const router = express.Router();
const pool = require('../db');
const { renderDashboard } = require('../services/dashboardRenderer');

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks ORDER BY workstream, id');
  res.set('Content-Type', 'text/html');
  res.send(renderDashboard(rows));
});

module.exports = router;
