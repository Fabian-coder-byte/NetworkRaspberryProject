const { runCommand } = require('../utils/shell');
const { validateDomain } = require('../utils/validators');

async function getDnsServers() {
  const servers = [];

  const resolvResult = await runCommand('resolv_conf');
  if (resolvResult.success) {
    const matches = resolvResult.stdout.matchAll(/^nameserver\s+([\d.]+)/gm);
    for (const m of matches) servers.push(m[1]);
  }

  return [...new Set(servers)];
}

async function testDnsResolution(domain = 'google.com', server = null) {
  if (!validateDomain(domain)) throw new Error(`Invalid domain: ${domain}`);

  const start = Date.now();
  const result = await runCommand('dig_query', [domain, server], 10000);
  const elapsed = Date.now() - start;

  const ok = result.success && result.stdout.trim().length > 0;

  return {
    domain,
    server: server || 'system',
    ok,
    responseMs: elapsed,
    answer: result.stdout.trim().split('\n')[0] || null,
  };
}

async function getDnsStatus() {
  const servers = await getDnsServers();

  const tests = await Promise.allSettled([
    testDnsResolution('google.com'),
    testDnsResolution('cloudflare.com'),
  ]);

  const allOk = tests.every(t => t.status === 'fulfilled' && t.value.ok);
  const firstOk = tests.find(t => t.status === 'fulfilled' && t.value.ok);

  return {
    status: allOk ? 'ok' : 'degraded',
    servers,
    responseMs: firstOk ? firstOk.value.responseMs : null,
    tests: tests
      .filter(t => t.status === 'fulfilled')
      .map(t => t.value),
  };
}

module.exports = { getDnsStatus, testDnsResolution, getDnsServers };
