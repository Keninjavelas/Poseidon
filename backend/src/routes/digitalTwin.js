'use strict';

const express = require('express');

const router = express.Router();

router.get('/state', (req, res) => {
  const service = req.app.locals.digitalTwinService;
  if (!service) {
    return res.status(503).json({ error: 'digital twin service unavailable' });
  }

  return res.json({
    state: service.getState(),
    control: service.getControlState(),
  });
});

router.post('/control', (req, res) => {
  const service = req.app.locals.digitalTwinService;
  if (!service) {
    return res.status(503).json({ error: 'digital twin service unavailable' });
  }

  const { action, speed } = req.body || {};
  if (action === 'play') {
    service.setPaused(false);
  } else if (action === 'pause') {
    service.setPaused(true);
  } else if (action === 'speed') {
    service.setSpeed(speed);
  } else {
    return res.status(400).json({ error: 'invalid control action' });
  }

  return res.json({ control: service.getControlState() });
});

router.post('/event', (req, res) => {
  const service = req.app.locals.digitalTwinService;
  if (!service) {
    return res.status(503).json({ error: 'digital twin service unavailable' });
  }

  const event = req.body;
  if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
    return res.status(400).json({ error: 'invalid event payload' });
  }

  service.injectEvent(event);
  return res.status(202).json({ accepted: true });
});

module.exports = router;
