'use strict';

const { Router } = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { getEnv } = require('../config/env');

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['viewer', 'operator', 'admin']).default('viewer'),
});

const router = Router();

router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const env = getEnv();
  const { username, role } = parsed.data;
  const token = jwt.sign({ sub: username, roles: [role] }, env.JWT_SECRET, { expiresIn: '8h' });

  return res.json({
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: 8 * 60 * 60,
    user: { username, roles: [role] },
  });
});

module.exports = router;