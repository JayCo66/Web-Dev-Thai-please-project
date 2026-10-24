const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Hash raw Thai citizen ID using SHA-256 for privacy compliance (never store plaintext)
 */
function hashCitizenId(citizenId) {
  if (!citizenId) return null;
  const cleanId = String(citizenId).replace(/\D/g, '');
  return crypto.createHash('sha256').update(cleanId).digest('hex');
}

/**
 * Hash external provider subject identifier (ThaiD / NDID)
 */
function hashProviderSubject(subject) {
  if (!subject) return null;
  return crypto.createHash('sha256').update(String(subject)).digest('hex');
}

/**
 * Hash password with bcrypt
 */
async function hashPassword(password) {
  if (!password) return null;
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with bcrypt hash
 */
async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Hash 6-digit PIN with bcrypt
 */
async function hashPin(pin) {
  if (!pin) return null;
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(String(pin), salt);
}

/**
 * Compare PIN
 */
async function comparePin(pin, hash) {
  if (!pin || !hash) return false;
  return bcrypt.compare(String(pin), hash);
}

/**
 * Validate 13-digit Thai National ID checksum (Modulo 11 algorithm)
 */
function validateThaiCitizenId(id) {
  if (!id) return false;
  const cleanId = String(id).replace(/\D/g, '');
  if (cleanId.length !== 13) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanId.charAt(i), 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(cleanId.charAt(12), 10);
}

/**
 * Mask Thai National ID for PDPA display: e.g. "1-2345-xxxxx-89-0"
 */
function maskCitizenId(citizenId) {
  if (!citizenId) return 'x-xxxx-xxxxx-xx-x';
  const clean = String(citizenId).replace(/\D/g, '');
  if (clean.length === 13) {
    return `${clean.charAt(0)}-${clean.substring(1, 5)}-xxxxx-${clean.substring(10, 12)}-${clean.charAt(12)}`;
  }
  return 'x-xxxx-xxxxx-xx-x';
}

/**
 * Mask Phone number for PDPA display: e.g. "081-xxx-4567"
 */
function maskPhoneNumber(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.substring(0, 3)}-xxx-${clean.substring(6)}`;
  }
  return phone;
}

/**
 * Mask Email for PDPA display: e.g. "s***@domain.com"
 */
function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local.charAt(0)}*@${domain}`;
  return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
}

module.exports = {
  hashCitizenId,
  hashProviderSubject,
  hashPassword,
  comparePassword,
  hashPin,
  comparePin,
  validateThaiCitizenId,
  maskCitizenId,
  maskPhoneNumber,
  maskEmail,
};
