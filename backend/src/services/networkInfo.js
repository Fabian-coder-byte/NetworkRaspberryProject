const { runCommand } = require('../utils/shell');

// Docker/loopback subnets to ignore when detecting the LAN interface.
const IGNORED_PREFIXES = ['127.', '172.', '10.0.', '169.254.'];

async function getNetworkInfo() {
  const info = {
    hostIp: null,
    gateway: null,
    subnet: null,
    interface: null,
    allInterfaces: [],
  };

  const routeResult = await runCommand('ip_route');
  if (!routeResult.success) return info;

  for (const line of routeResult.stdout.split('\n')) {
    // Default gateway: "default via 192.168.1.254 dev eth0 ..."
    const defMatch = line.match(/^default via ([\d.]+) dev (\S+)/);
    if (defMatch && !info.gateway) {
      info.gateway   = defMatch[1];
      info.interface = defMatch[2];
    }

    // Link-scope subnet: "192.168.1.0/24 dev eth0 ... src 192.168.1.175"
    const linkMatch = line.match(/^([\d.]+\/\d+) dev (\S+).*src ([\d.]+)/);
    if (linkMatch) {
      const subnet = linkMatch[1];
      const iface  = linkMatch[2];
      const src    = linkMatch[3];

      const ignore = IGNORED_PREFIXES.some(p => subnet.startsWith(p));
      if (!ignore) {
        info.allInterfaces.push({ subnet, interface: iface, ip: src });
        // Prefer the interface that matches the default gateway interface
        if (!info.subnet || iface === info.interface) {
          info.subnet = subnet;
          info.hostIp = src;
          if (!info.interface) info.interface = iface;
        }
      }
    }
  }

  return info;
}

module.exports = { getNetworkInfo };
