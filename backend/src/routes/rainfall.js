'use strict';

const { Router } = require('express');
const { query } = require('../services/db');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    if (limit > 1000) return res.status(400).json({ error: 'limit must not exceed 1000' });
    const result = await query('SELECT * FROM "Rainfall_Log" ORDER BY timestamp DESC LIMIT $1', [limit]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
