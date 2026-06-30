const router = require('express').Router();
const { getNetworkInfo } = require('../services/networkInfo');
const { performAutoScan } = require('../services/scanner');
const { pingHost, checkInternet } = require('../services/ping');
const { getDnsStatus } = require('../services/dns');
const { getTailscaleStatus } = require('../services/tailscale');
const { validateSubnet } = require('../utils/validators');
const db = require('../db/database');

// GET /api/network/overview
router.get('/overview', async (req, res) => {
  try {
    const [netInfo, internet, dns] = await Promise.all([
      getNetworkInfo(),
      checkInternet(),
      getDnsStatus(),
    ]);

    let gatewayPing = null;
    if (netInfo.gateway) {
      gatewayPing = await pingHost(netInfo.gateway, 2);
    }

    const deviceCount = db.prepare(`SELECT COUNT(*) AS c FROM devices`).get().c;
    const onlineCount = db.prepare(`SELECT COUNT(*) AS c FROM devices WHERE last_status = 'online'`).get().c;
    const newCount    = db.prepare(`SELECT COUNT(*) AS c FROM devices WHERE is_new = 1`).get().c;
    const unreadAlerts= db.prepare(`SELECT COUNT(*) AS c FROM alerts WHERE read_at IS NULL`).get().c;

    res.json({
      hostIp:    netInfo.hostIp,
      gateway:   netInfo.gateway,
      interface: netInfo.interface,
      subnet:    netInfo.subnet,
      internet: {
        status:    internet.status,
        latencyMs: internet.latencyMs,
      },
      gateway_ping: gatewayPing ? {
        reachable:  gatewayPing.reachable,
        latencyMs:  gatewayPing.latencyMs,
      } : null,
      dns: {
        status:    dns.status,
        servers:   dns.servers,
        responseMs:dns.responseMs,
      },
      stats: {
        total:   deviceCount,
        online:  onlineCount,
        offline: deviceCount - onlineCount,
        new:     newCount,
        alerts:  unreadAlerts,
      },
    });
  } catch (err) {
    console.error('/overview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/network/scan
router.post('/scan', async (req, res) => {
  const { subnet } = req.body;

  if (subnet && !validateSubnet(subnet)) {
    return res.status(400).json({ error: 'Invalid subnet format. Use CIDR notation, e.g. 192.168.1.0/24' });
  }

  try {
    const result = await performAutoScan(subnet || undefined);
    res.json(result);
  } catch (err) {
    console.error('/scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/network/graph — returns nodes + edges for React Flow
router.get('/graph', (req, res) => {
  try {
    const devices = db.prepare(`SELECT * FROM devices ORDER BY is_gateway DESC, last_seen DESC`).all();

    const nodes = [];
    const edges = [];

    const gateway = devices.find(d => d.is_gateway);

    for (const dev of devices) {
      const label = dev.display_name || dev.hostname || dev.ip;
      nodes.push({
        id:    String(dev.id),
        type:  'deviceNode',
        data: {
          id:          dev.id,
          label,
          ip:          dev.ip,
          mac:         dev.mac,
          vendor:      dev.vendor,
          hostname:    dev.hostname,
          display_name:dev.display_name,
          device_type: dev.device_type,
          status:      dev.last_status,
          is_gateway:  dev.is_gateway,
          is_new:      dev.is_new,
          trusted:     dev.trusted,
          first_seen:  dev.first_seen,
          last_seen:   dev.last_seen,
          notes:       dev.notes,
        },
        // Positions are computed by the frontend layout engine
        position: { x: 0, y: 0 },
      });

      if (gateway && dev.id !== gateway.id) {
        edges.push({
          id:     `e-${gateway.id}-${dev.id}`,
          source: String(gateway.id),
          target: String(dev.id),
          type:   'smoothstep',
        });
      }
    }

    res.json({ nodes, edges });
  } catch (err) {
    console.error('/graph error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/network/tailscale
router.get('/tailscale', async (req, res) => {
  try {
    const status = await getTailscaleStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/network/scans — recent scan history
router.get('/scans', (req, res) => {
  const scans = db.prepare(
    `SELECT * FROM network_scans ORDER BY started_at DESC LIMIT 20`
  ).all();
  res.json(scans);
});

module.exports = router;
