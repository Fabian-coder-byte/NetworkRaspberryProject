const router = require('express').Router();
const { sanitizeDeviceUpdate } = require('../utils/validators');
const { scanDevicePorts, getLatestPorts } = require('../services/portScanner');
const db = require('../db/database');

// GET /api/network/devices
router.get('/', (req, res) => {
  const { status, trusted, search } = req.query;
  let query = 'SELECT * FROM devices WHERE 1=1';
  const params = [];

  if (status === 'online')  { query += ' AND last_status = ?'; params.push('online'); }
  if (status === 'offline') { query += ' AND last_status = ?'; params.push('offline'); }
  if (trusted === '1')      { query += ' AND trusted = 1'; }
  if (req.query.is_new === '1') { query += ' AND is_new = 1'; }

  if (search) {
    query += ` AND (ip LIKE ? OR mac LIKE ? OR hostname LIKE ? OR display_name LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  query += ' ORDER BY is_gateway DESC, last_status ASC, last_seen DESC';

  const devices = db.prepare(query).all(...params);
  res.json(devices);
});

// GET /api/network/devices/:id
router.get('/:id', (req, res) => {
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  const ports = getLatestPorts(device.id);
  const ipHistory = db.prepare(
    'SELECT * FROM device_ip_history WHERE device_id = ? ORDER BY last_seen DESC'
  ).all(device.id);
  const recentAlerts = db.prepare(
    'SELECT * FROM alerts WHERE device_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(device.id);

  res.json({ ...device, ports, ipHistory, recentAlerts });
});

// PATCH /api/network/devices/:id
router.patch('/:id', (req, res) => {
  const device = db.prepare('SELECT id FROM devices WHERE id = ?').get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  const updates = sanitizeDeviceUpdate(req.body);
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  // Mark as no longer "new" when user edits it
  updates.is_new = 0;

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE devices SET ${setClauses} WHERE id = ?`)
    .run(...Object.values(updates), req.params.id);

  const updated = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// POST /api/network/devices/:id/scan-ports
router.post('/:id/scan-ports', async (req, res) => {
  try {
    const result = await scanDevicePorts(parseInt(req.params.id, 10));
    res.json(result);
  } catch (err) {
    console.error('Port scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/network/devices/:id/ports
router.get('/:id/ports', (req, res) => {
  const ports = getLatestPorts(parseInt(req.params.id, 10));
  res.json(ports);
});

module.exports = router;
