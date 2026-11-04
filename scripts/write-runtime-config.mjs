import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const configFile = join(projectRoot, 'public', 'runtime-config.js');
const configuredApiBaseUrl = process.env.API_BASE_URL?.trim() ?? '';

let apiBaseUrl = '';
if (configuredApiBaseUrl) {
  let url;
  try {
    url = new URL(configuredApiBaseUrl);
  } catch {
    throw new Error('API_BASE_URL must be an absolute backend origin URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('API_BASE_URL must contain only the backend origin, without a path, query, or fragment.');
  }
  apiBaseUrl = url.origin;
}

await mkdir(dirname(configFile), { recursive: true });
await writeFile(
  configFile,
  `globalThis.__REGULAR_WORKS_API_BASE_URL__ = ${JSON.stringify(apiBaseUrl)};\n`,
  'utf8',
);
