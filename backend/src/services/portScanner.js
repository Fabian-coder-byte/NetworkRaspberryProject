const xml2js = require('xml2js');
const { runCommand } = require('../utils/shell');
const { validateIp } = require('../utils/validators');
const db = require('../db/database');

// Known service port descriptions for homelab devices
const KNOWN_SERVICES = {
  22:   'SSH',
  80:   'HTTP',
  443:  'HTTPS',
  2283: 'Immich',
  3000: 'Homepage / Grafana',
  3001: 'Uptime Kuma',
  8096: 'Jellyfin',
  8080: 'Nextcloud / HTTP-alt',
  8384: 'Syncthing UI',
  9000: 'Portainer',
  9443: 'Portainer HTTPS',
  22000:'Syncthing Transfer',
};

async function parsePortScanXml(xml) {
  if (!xml) return [];
  try {
    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: true });
    const host = parsed.nmaprun?.host?.[0];
    if (!host) return [];

    const ports = host.ports?.[0]?.port || [];
    return ports.map(p => ({
      port:     parseInt(p.$.portid, 10),
      protocol: p.$.protocol,
      state:    p.state?.[0]?.$.state || 'unknown',
      service:  KNOWN_SERVICES[parseInt(p.$.portid, 10)] || p.service?.[0]?.$.name || null,
      version:  p.service?.[0]?.$.version || null,
    })).filter(p => p.state === 'open');
  } catch {
    return [];
  }
}

async function scanDevicePorts(deviceId) {
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId);
  if (!device) throw new Error('Device not found');
  if (!validateIp(device.ip)) throw new Error('Device has invalid IP');

  const result = await runCommand('nmap_port_scan', [device.ip], 90000);
  const ports = await parsePortScanXml(result.stdout);

  const now = new Date().toISOString();
  const scanId = db.prepare(
    'INSERT INTO port_scans (device_id, scanned_at, scan_type) VALUES (?, ?, ?)'
  ).run(deviceId, now, 'top-30').lastInsertRowid;

  const insertPort = db.prepare(
    'INSERT INTO open_ports (port_scan_id, port, protocol, state, service, version) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((portList) => {
    for (const p of portList) {
      insertPort.run(scanId, p.port, p.protocol, p.state, p.service, p.version);
    }
  });

  insertMany(ports);

  return { scanId, ports, scannedAt: now };
}

function getLatestPorts(deviceId) {
  const scan = db.prepare(
    'SELECT id FROM port_scans WHERE device_id = ? ORDER BY scanned_at DESC LIMIT 1'
  ).get(deviceId);
  if (!scan) return [];
  return db.prepare('SELECT * FROM open_ports WHERE port_scan_id = ?').all(scan.id);
}

module.exports = { scanDevicePorts, getLatestPorts };
