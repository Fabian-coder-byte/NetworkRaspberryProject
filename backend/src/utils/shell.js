const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Only pre-defined commands are allowed — never accept free-form input from the client.
const ALLOWED_COMMANDS = {
  nmap_ping_scan:  (subnet) => `nmap -sn -oX - ${subnet}`,
  nmap_port_scan:  (ip)     => `nmap -T3 --top-ports 30 -oX - ${ip}`,
  ip_route:        ()       => `ip route show`,
  ip_addr:         ()       => `ip addr show`,
  ip_neigh:        ()       => `ip neigh show`,
  arp:             ()       => `arp -a`,
  ping_host:       (host, count) => `ping -c ${count} -W 3 ${host}`,
  dig_query:       (domain, server) =>
    server ? `dig @${server} ${domain} +short +time=3` : `dig ${domain} +short +time=3`,
  resolv_conf:     ()       => `cat /etc/resolv.conf`,
  resolvectl:      ()       => `resolvectl status`,
  tailscale_status:()       => `tailscale status --json`,
  tailscale_ip:    ()       => `tailscale ip`,
};

async function runCommand(commandKey, args = [], timeoutMs = 30000) {
  if (!ALLOWED_COMMANDS[commandKey]) {
    throw new Error(`Command not in allowlist: ${commandKey}`);
  }

  const command = ALLOWED_COMMANDS[commandKey](...args);

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 5,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), success: true };
  } catch (error) {
    if (error.killed) {
      return { stdout: '', stderr: 'Command timed out', success: false, timedOut: true };
    }
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      success: false,
    };
  }
}

module.exports = { runCommand };
