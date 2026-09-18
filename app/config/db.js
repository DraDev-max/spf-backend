import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(configDir, '..', '..');
const baseEnvKeys = new Set(Object.keys(process.env));
const DEFAULT_DB_NAME = 'backend_api';

loadLocalEnv(path.join(projectRoot, '.env'));
loadLocalEnv(path.join(projectRoot, '.env.local'));

const pool = mysql.createPool(buildConnectionConfig());

export default pool;

function loadLocalEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    let key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (key.startsWith('export ')) {
      key = key.slice(7).trim();
    }

    if (!key || baseEnvKeys.has(key)) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }
}

function buildConnectionConfig() {
  const databaseUrl = firstEnv('DATABASE_URL', 'MYSQL_URL');

  if (databaseUrl) {
    return buildUrlConnectionConfig(databaseUrl);
  }

  const socketPath = firstEnv('DB_SOCKET_PATH', 'MYSQL_SOCKET_PATH');
  const database = normalizeText(firstEnv('DB_NAME', 'DB_DATABASE', 'MYSQL_DATABASE', 'DATABASE_NAME')) || DEFAULT_DB_NAME;

  const config = {
    host: normalizeText(firstEnv('DB_HOST', 'DB_SERVER', 'MYSQL_HOST')) || '127.0.0.1',
    port: parseNumber(firstEnv('DB_PORT', 'MYSQL_PORT'), 3306),
    user: normalizeText(firstEnv('DB_USER', 'DB_USERNAME', 'MYSQL_USER')) || 'root',
    password: firstEnv('DB_PASSWORD', 'DB_PASS', 'MYSQL_PASSWORD') || '',
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  if (socketPath) {
    config.socketPath = socketPath;
    delete config.host;
    delete config.port;
  }

  return config;
}

function buildUrlConnectionConfig(databaseUrl) {
  const url = new URL(databaseUrl);

  if (!['mysql:', 'mysql2:'].includes(url.protocol)) {
    throw new Error(`Unsupported database protocol: ${url.protocol}`);
  }

  const socketPath = url.searchParams.get('socketPath');
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));

  if (!database) {
    throw new Error('DATABASE_URL must include a database name in the path.');
  }

  const config = {
    host: url.hostname || '127.0.0.1',
    port: parseNumber(url.port, 3306),
    user: decodeURIComponent(url.username || 'root'),
    password: decodeURIComponent(url.password || ''),
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  if (socketPath) {
    config.socketPath = socketPath;
    delete config.host;
    delete config.port;
  }

  return config;
}

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== '') {
      return value;
    }
  }

  return '';
}

function normalizeText(value) {
  return value ? value.trim() : '';
}

function parseNumber(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
