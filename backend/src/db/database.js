const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../../data/network-map.db');
const DB_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ip           TEXT NOT NULL,
    mac          TEXT,
    hostname     TEXT,
    vendor       TEXT,
    display_name TEXT,
    device_type  TEXT DEFAULT 'unknown',
    icon         TEXT DEFAULT 'device',
    trusted      INTEGER DEFAULT 0,
    first_seen   TEXT NOT NULL,
    last_seen    TEXT NOT NULL,
    last_status  TEXT DEFAULT 'online',
    notes        TEXT,
    source       TEXT DEFAULT 'scan',
    is_gateway   INTEGER DEFAULT 0,
    is_new       INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS device_ip_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id  INTEGER NOT NULL,
    ip         TEXT NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen  TEXT NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE TABLE IF NOT EXISTS port_scans (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id  INTEGER NOT NULL,
    scanned_at TEXT NOT NULL,
    scan_type  TEXT DEFAULT 'top-ports',
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE TABLE IF NOT EXISTS open_ports (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    port_scan_id INTEGER NOT NULL,
    port         INTEGER NOT NULL,
    protocol     TEXT DEFAULT 'tcp',
    state        TEXT DEFAULT 'open',
    service      TEXT,
    version      TEXT,
    FOREIGN KEY (port_scan_id) REFERENCES port_scans(id)
  );

  CREATE TABLE IF NOT EXISTS network_scans (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at     TEXT NOT NULL,
    finished_at    TEXT,
    subnet         TEXT,
    status         TEXT DEFAULT 'running',
    devices_found  INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL,
    severity   TEXT DEFAULT 'info',
    title      TEXT NOT NULL,
    message    TEXT,
    device_id  INTEGER,
    created_at TEXT NOT NULL,
    read_at    TEXT,
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE INDEX IF NOT EXISTS idx_devices_ip      ON devices(ip);
  CREATE INDEX IF NOT EXISTS idx_devices_mac     ON devices(mac);
  CREATE INDEX IF NOT EXISTS idx_devices_status  ON devices(last_status);
  CREATE INDEX IF NOT EXISTS idx_alerts_read_at  ON alerts(read_at);
`);

module.exports = db;
