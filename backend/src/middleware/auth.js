'use strict';

const jwt = require('jsonwebtoken');

function createAuthMiddleware(env, logger) {
  return function auth(req, res, next) {
    if (env.AUTH_MODE === 'disabled') return next();

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      if (env.AUTH_MODE === 'optional') return next();
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    try {
      req.user = jwt.verify(token, env.JWT_SECRET);
      return next();
    } catch (error) {
      logger.warn({ error }, 'invalid jwt');
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

function createRoleGuard(allowedRoles = []) {
  return function roleGuard(req, res, next) {
    if (!allowedRoles.length) return next();
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const permitted = roles.some((role) => allowedRoles.includes(role));
    if (!permitted) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    return next();
  };
}

module.exports = { createAuthMiddleware, createRoleGuard };