const IP_RE     = /^(\d{1,3}\.){3}\d{1,3}$/;
const SUBNET_RE  = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
const DOMAIN_RE  = /^[a-zA-Z0-9][a-zA-Z0-9.-]{0,253}[a-zA-Z0-9]$/;

function validateIp(ip) {
  if (!IP_RE.test(ip)) return false;
  return ip.split('.').map(Number).every(n => n >= 0 && n <= 255);
}

function validateSubnet(subnet) {
  if (!SUBNET_RE.test(subnet)) return false;
  const [ip, bits] = subnet.split('/');
  const cidr = parseInt(bits, 10);
  return validateIp(ip) && cidr >= 0 && cidr <= 32;
}

function validateDomain(domain) {
  return domain && DOMAIN_RE.test(domain) && domain.length <= 255;
}

function sanitizeDeviceUpdate(body) {
  const allowed = ['display_name', 'device_type', 'icon', 'trusted', 'notes'];
  const result = {};
  for (const key of allowed) {
    if (body[key] !== undefined) result[key] = body[key];
  }
  if (result.trusted !== undefined) result.trusted = result.trusted ? 1 : 0;
  return result;
}

module.exports = { validateIp, validateSubnet, validateDomain, sanitizeDeviceUpdate };
