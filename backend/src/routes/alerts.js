const router = require('express').Router();
const db = require('../db/database');

// GET /api/network/alerts
router.get('/', (req, res) => {
  const { unread } = req.query;
  let query = 'SELECT a.*, d.ip, d.display_name, d.hostname FROM alerts a LEFT JOIN devices d ON a.device_id = d.id';
  if (unread === '1') query += ' WHERE a.read_at IS NULL';
  query += ' ORDER BY a.created_at DESC LIMIT 100';
  res.json(db.prepare(query).all());
});

// PATCH /api/network/alerts/:id/read
router.patch('/:id/read', (req, res) => {
  const now = new Date().toISOString();
  const result = db.prepare('UPDATE alerts SET read_at = ? WHERE id = ?').run(now, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Alert not found' });
  res.json({ ok: true });
});

// PATCH /api/network/alerts/read-all
router.patch('/read-all', (req, res) => {
  const now = new Date().toISOString();
  db.prepare('UPDATE alerts SET read_at = ? WHERE read_at IS NULL').run(now);
  res.json({ ok: true });
});

// DELETE /api/network/alerts/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM alerts WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Alert not found' });
  res.json({ ok: true });
});

module.exports = router;
