const { runCommand } = require('../utils/shell');
const { validateIp } = require('../utils/validators');

async function pingHost(host, count = 3) {
  if (!validateIp(host)) throw new Error(`Invalid IP: ${host}`);

  const result = await runCommand('ping_host', [host, count], 15000);

  if (!result.success && !result.stdout) {
    return { host, reachable: false, latencyMs: null, packetLoss: 100 };
  }

  const output = result.stdout + result.stderr;

  // Parse "rtt min/avg/max/mdev = 1.234/2.345/3.456/0.123 ms"
  const rttMatch = output.match(/min\/avg\/max\/\S+\s*=\s*[\d.]+\/([\d.]+)/);
  const latencyMs = rttMatch ? parseFloat(rttMatch[1]) : null;

  // Parse "X% packet loss"
  const lossMatch = output.match(/(\d+)%\s*packet loss/);
  const packetLoss = lossMatch ? parseInt(lossMatch[1], 10) : 100;

  return {
    host,
    reachable: packetLoss < 100,
    latencyMs,
    packetLoss,
  };
}

async function checkInternet() {
  const targets = ['1.1.1.1', '8.8.8.8'];
  for (const target of targets) {
    const result = await pingHost(target, 2);
    if (result.reachable) return { ...result, status: 'online' };
  }
  return { host: '1.1.1.1', reachable: false, latencyMs: null, packetLoss: 100, status: 'offline' };
}

module.exports = { pingHost, checkInternet };
