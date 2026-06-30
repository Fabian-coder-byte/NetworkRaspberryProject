const { runCommand } = require('../utils/shell');

async function getTailscaleStatus() {
  const result = await runCommand('tailscale_status', [], 10000);

  if (!result.success) {
    return { available: false, reason: result.stderr };
  }

  try {
    const data = JSON.parse(result.stdout);
    const self = data.Self;
    const peers = Object.values(data.Peer || {});

    return {
      available: true,
      self: self ? {
        hostname:   self.HostName,
        tailscaleIp: self.TailscaleIPs?.[0] || null,
        online:     self.Online,
        exitNode:   self.ExitNode || false,
      } : null,
      peers: peers.map(p => ({
        hostname:    p.HostName,
        tailscaleIp: p.TailscaleIPs?.[0] || null,
        online:      p.Online,
        exitNode:    p.ExitNode || false,
        tags:        p.Tags || [],
      })),
    };
  } catch {
    return { available: false, reason: 'Failed to parse tailscale status' };
  }
}

module.exports = { getTailscaleStatus };
