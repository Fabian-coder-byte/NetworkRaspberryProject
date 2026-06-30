const xml2js = require('xml2js');
const { runCommand } = require('../utils/shell');
const { validateSubnet } = require('../utils/validators');
const { getNetworkInfo } = require('./networkInfo');
const db = require('../db/database');

async function parseNmapXml(xml) {
  if (!xml || !xml.trim()) return [];
  try {
    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: true });
    const hosts = parsed.nmaprun?.host || [];

    return hosts
      .filter(h => h.status?.[0]?.$?.state === 'up')
      .map(h => {
        const device = { ip: null, mac: null, hostname: null, vendor: null, status: 'online' };

        for (const addr of h.address || []) {
          const a = addr.$;
          if (a?.addrtype === 'ipv4') device.ip = a.addr;
          if (a?.addrtype === 'mac') {
            device.mac    = a.addr.toUpperCase();
            device.vendor = a.vendor || null;
          }
        }

        const hn = h.hostnames?.[0]?.hostname;
        if (hn?.length) device.hostname = hn[0]?.$?.name || null;

        return device;
      })
      .filter(d => d.ip);
  } catch (err) {
    console.error('nmap XML parse error:', err.message);
    return [];
  }
}

async function getNeighborDevices() {
  const devices = [];
  const result = await runCommand('ip_neigh');
  if (!result.success) return devices;

  for (const line of result.stdout.split('\n').filter(Boolean)) {
    const m = line.match(/^([\d.]+)\s+dev\s+\S+\s+lladdr\s+([\da-fA-F:]+)\s+(\w+)/);
    if (m) {
      const state = m[3].toUpperCase();
      devices.push({
        ip:       m[1],
        mac:      m[2].toUpperCase(),
        hostname: null,
        vendor:   null,
        status:   ['REACHABLE', 'DELAY', 'PROBE'].includes(state) ? 'online' : 'offline',
      });
    }
  }
  return devices;
}

function upsertDevice(device, gateway) {
  const now = new Date().toISOString();
  const isGateway = device.ip === gateway ? 1 : 0;

  let existing = null;
  if (device.mac) {
    existing = db.prepare('SELECT * FROM devices WHERE mac = ?').get(device.mac);
  }
  if (!existing) {
    existing = db.prepare('SELECT * FROM devices WHERE ip = ?').get(device.ip);
  }

  if (!existing) {
    const result = db.prepare(`
      INSERT INTO devices
        (ip, mac, hostname, vendor, display_name, device_type, trusted,
         first_seen, last_seen, last_status, source, is_gateway, is_new)
      VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'scan', ?, 1)
    `).run(
      device.ip,
      device.mac || null,
      device.hostname || null,
      device.vendor || null,
      isGateway ? 'router' : 'unknown',
      isGateway ? 1 : 0,
      now, now,
      device.status,
      isGateway,
    );

    const macInfo = device.mac ? ` MAC: ${device.mac}` : '';
    db.prepare(`
      INSERT INTO alerts (type, severity, title, message, device_id, created_at)
      VALUES ('new_device', 'warning', 'Nuovo dispositivo rilevato', ?, ?, ?)
    `).run(`IP: ${device.ip}${macInfo}`, result.lastInsertRowid, now);

    return result.lastInsertRowid;
  }

  db.prepare(`
    UPDATE devices
    SET ip          = ?,
        last_seen   = ?,
        last_status = ?,
        is_new      = 0,
        hostname    = COALESCE(NULLIF(?, ''), hostname),
        vendor      = COALESCE(NULLIF(?, ''), vendor)
    WHERE id = ?
  `).run(device.ip, now, device.status, device.hostname, device.vendor, existing.id);

  return existing.id;
}

async function performAutoScan(subnetOverride) {
  const netInfo = await getNetworkInfo();
  const subnet  = subnetOverride || netInfo.subnet;

  if (!subnet || !validateSubnet(subnet)) {
    console.error('Could not determine a valid subnet, skipping scan');
    return { error: 'No valid subnet' };
  }

  const now    = new Date().toISOString();
  const scanId = db.prepare(
    `INSERT INTO network_scans (started_at, subnet, status) VALUES (?, ?, 'running')`
  ).run(now, subnet).lastInsertRowid;

  try {
    let devices = [];

    const nmapResult = await runCommand('nmap_ping_scan', [subnet], 120000);
    if (nmapResult.success && nmapResult.stdout) {
      devices = await parseNmapXml(nmapResult.stdout);
    }

    // Fallback to ARP table if nmap returned nothing
    if (devices.length === 0) {
      devices = await getNeighborDevices();
    }

    // Always include gateway and self even if scan missed them
    if (netInfo.gateway && !devices.find(d => d.ip === netInfo.gateway)) {
      devices.push({ ip: netInfo.gateway, mac: null, hostname: null, vendor: null, status: 'online' });
    }
    if (netInfo.hostIp && !devices.find(d => d.ip === netInfo.hostIp)) {
      devices.push({ ip: netInfo.hostIp, mac: null, hostname: 'localhost', vendor: null, status: 'online' });
    }

    const foundIds = [];
    for (const dev of devices) {
      const id = upsertDevice(dev, netInfo.gateway);
      if (id) foundIds.push(id);
    }

    // Mark devices not found in this scan as offline if last seen > 10 minutes ago
    const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    if (foundIds.length > 0) {
      const placeholders = foundIds.map(() => '?').join(',');
      db.prepare(`
        UPDATE devices
        SET last_status = 'offline'
        WHERE id NOT IN (${placeholders})
          AND last_seen < ?
          AND last_status = 'online'
      `).run(...foundIds, cutoff);
    }

    db.prepare(
      `UPDATE network_scans SET finished_at = ?, status = 'completed', devices_found = ? WHERE id = ?`
    ).run(new Date().toISOString(), devices.length, scanId);

    console.log(`Scan done: ${devices.length} devices on ${subnet}`);
    return { devicesFound: devices.length, subnet };

  } catch (err) {
    db.prepare(
      `UPDATE network_scans SET finished_at = ?, status = 'failed' WHERE id = ?`
    ).run(new Date().toISOString(), scanId);
    throw err;
  }
}

module.exports = { performAutoScan };
