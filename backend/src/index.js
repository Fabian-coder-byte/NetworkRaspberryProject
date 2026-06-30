const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const cron    = require('node-cron');

const networkRoutes = require('./routes/network');
const devicesRoutes = require('./routes/devices');
const alertsRoutes  = require('./routes/alerts');
const { performAutoScan } = require('./services/scanner');

const app  = express();
const PORT = process.env.PORT || 3001;
const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL_MINUTES || '5', 10);

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/network/devices', devicesRoutes);
app.use('/api/network/alerts',  alertsRoutes);
app.use('/api/network',         networkRoutes);

// Quick liveness probe — useful to test if nginx proxy is working
app.get('/api/ping', (req, res) => res.json({ pong: true, time: Date.now() }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()) });
});

// 404 fallback — log unmatched routes to help debugging
app.use((req, res) => {
  console.warn(`404 — no route for ${req.method} ${req.path}`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Network Map backend listening on :${PORT}`);
  console.log(`Auto-scan every ${SCAN_INTERVAL} minutes`);

  // Initial scan after 5 seconds (give nmap time to be ready)
  setTimeout(() => {
    console.log('Running initial scan...');
    performAutoScan().catch(e => console.error('Initial scan failed:', e.message));
  }, 5000);

  // Scheduled scans
  cron.schedule(`*/${SCAN_INTERVAL} * * * *`, () => {
    console.log(`Scheduled scan triggered`);
    performAutoScan().catch(e => console.error('Scheduled scan failed:', e.message));
  });
});
