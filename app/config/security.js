import crypto from 'node:crypto';

const FALLBACK_JWT_SECRET = crypto.randomBytes(32).toString('hex');
const PASSWORD_SCHEME = 'scrypt';
const VALID_ROLES = new Set(['admin', 'cliente']);
const SCRYPT_PARAMS = {
  keylen: 64,
  N: 16384,
  r: 8,
  p: 1,
  saltLength: 16
};

export function getJwtSecret() {
  return normalizeText(process.env.JWT_SECRET) || FALLBACK_JWT_SECRET;
}

export function hashPassword(password) {
  const textPassword = normalizeText(password);

  if (!textPassword) {
    throw new Error('La contraseña no puede estar vacía');
  }

  const salt = crypto.randomBytes(SCRYPT_PARAMS.saltLength).toString('hex');
  const derivedKey = crypto.scryptSync(textPassword, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p
  });

  return [
    PASSWORD_SCHEME,
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt,
    derivedKey.toString('hex')
  ].join('$');
}

export function verifyPassword(password, storedPassword) {
  const textPassword = normalizeText(password);
  const stored = normalizeText(storedPassword);

  if (!textPassword || !stored) {
    return false;
  }

  if (!stored.startsWith(`${PASSWORD_SCHEME}$`)) {
    return safeEqual(textPassword, stored);
  }

  const parts = stored.split('$');

  if (parts.length !== 6) {
    return false;
  }

  const [, nValue, rValue, pValue, salt, derivedKeyHex] = parts;
  const expectedKeyLength = Buffer.from(derivedKeyHex, 'hex').length;

  if (expectedKeyLength <= 0) {
    return false;
  }

  const derivedKey = crypto.scryptSync(textPassword, salt, expectedKeyLength, {
    N: Number.parseInt(nValue, 10) || SCRYPT_PARAMS.N,
    r: Number.parseInt(rValue, 10) || SCRYPT_PARAMS.r,
    p: Number.parseInt(pValue, 10) || SCRYPT_PARAMS.p
  });

  return safeEqualBuffer(derivedKey, Buffer.from(derivedKeyHex, 'hex'));
}

export function needsPasswordUpgrade(storedPassword) {
  const stored = normalizeText(storedPassword);
  return stored !== '' && !stored.startsWith(`${PASSWORD_SCHEME}$`);
}

export function normalizeRole(value, fallback = 'cliente') {
  const role = normalizeText(value).toLowerCase();
  return VALID_ROLES.has(role) ? role : fallback;
}

export function isAdminRole(value) {
  return normalizeRole(value, '') === 'admin';
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function safeEqualBuffer(leftBuffer, rightBuffer) {
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}
