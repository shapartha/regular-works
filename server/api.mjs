import { randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, resolve, sep } from 'node:path';

const dataDirectory = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : join(dirname(fileURLToPath(import.meta.url)), 'data');
const dataFile = join(dataDirectory, 'daily-tasks.json');
const progressFile = join(dataDirectory, 'daily-task-progress.json');
const staticDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'regular-works', 'browser');
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
const maxBodyBytes = 16 * 1024;
const progressResetHour = 7;
const progressResetMinute = 30;
let writeQueue = Promise.resolve();
let progressWriteQueue = Promise.resolve();

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readTasks() {
  const contents = await readFile(dataFile, 'utf8');
  const tasks = JSON.parse(contents);
  if (!Array.isArray(tasks)) {
    throw new Error('The daily task JSON store must contain an array.');
  }
  return tasks;
}

async function writeTasks(tasks) {
  await writeJsonFile(dataFile, tasks);
}

async function writeJsonFile(file, value) {
  const temporaryFile = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryFile, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await rename(temporaryFile, file);
  } catch (error) {
    await unlink(temporaryFile).catch((cleanupError) => {
      if (cleanupError.code !== 'ENOENT') {
        console.error('Could not clean up temporary task store:', cleanupError);
      }
    });
    throw error;
  }
}

async function readProgressStore() {
  const store = JSON.parse(await readFile(progressFile, 'utf8'));
  if (!store || !Array.isArray(store.profiles) || !store.progress || typeof store.progress !== 'object') {
    throw new Error('The daily task progress JSON store has an invalid structure.');
  }
  return store;
}

function updateProgressStore(update) {
  const operation = progressWriteQueue.then(async () => {
    const store = await readProgressStore();
    const result = update(store);
    await writeJsonFile(progressFile, store);
    return result;
  });
  progressWriteQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isProgressResetTime(date) {
  return date.getHours() > progressResetHour
    || (date.getHours() === progressResetHour && date.getMinutes() >= progressResetMinute);
}

function scheduleNextProgressReset(now) {
  const nextReset = new Date(now);
  nextReset.setHours(progressResetHour, progressResetMinute, 0, 0);
  if (nextReset <= now) {
    nextReset.setDate(nextReset.getDate() + 1);
  }

  setTimeout(() => {
    void runDailyProgressReset();
  }, nextReset.getTime() - now.getTime());
}

async function runDailyProgressReset() {
  const now = new Date();
  try {
    if (isProgressResetTime(now)) {
      const today = localDateKey(now);
      const didReset = await updateProgressStore((store) => {
        if (store.lastResetDate === today) {
          return false;
        }
        store.progress = Object.fromEntries(store.profiles.map((profile) => [profile.id, {}]));
        store.lastResetDate = today;
        return true;
      });
      if (didReset) {
        console.log(`Daily task progress cleared at ${progressResetHour}:${String(progressResetMinute).padStart(2, '0')}.`);
      }
    }
  } catch (error) {
    console.error('Could not reset daily task progress:', error);
    setTimeout(() => {
      void runDailyProgressReset();
    }, 60_000);
    return;
  }

  scheduleNextProgressReset(new Date());
}

function updateTasks(update) {
  const operation = writeQueue.then(async () => {
    const tasks = await readTasks();
    const result = update(tasks);
    await writeTasks(tasks);
    return result;
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

async function readBody(request) {
  if (request.headers['content-type']?.split(';', 1)[0].trim() !== 'application/json') {
    throw new ApiError(415, 'Content-Type must be application/json.');
  }

  const contentLength = Number(request.headers['content-length'] ?? 0);
  if (contentLength > maxBodyBytes) {
    throw new ApiError(413, 'Request body is too large.');
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxBodyBytes) {
      throw new ApiError(413, 'Request body is too large.');
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }
}

function validateTask(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Task must be a JSON object.');
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const detail = typeof body.detail === 'string' ? body.detail.trim() : '';
  if (!title) {
    throw new ApiError(400, 'Task title is required.');
  }
  if (title.length > 120 || detail.length > 300) {
    throw new ApiError(400, 'Task title or details exceed the allowed length.');
  }
  if (typeof body.detail !== 'string') {
    throw new ApiError(400, 'Task details must be a string.');
  }

  return { title, detail };
}

function validateProfileName(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.name !== 'string') {
    throw new ApiError(400, 'Profile name is required.');
  }
  const name = body.name.trim();
  if (!name || name.length > 40) {
    throw new ApiError(400, 'Profile name must be between 1 and 40 characters.');
  }
  return name;
}

function validateProgress(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Progress must be a JSON object.');
  }
  for (const [taskId, completed] of Object.entries(body)) {
    if (!taskId || typeof completed !== 'boolean') {
      throw new ApiError(400, 'Progress must map task IDs to boolean values.');
    }
  }
  return body;
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

async function serveFrontend(request, response, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400);
    response.end('Invalid path.');
    return;
  }

  const requestedFile = resolve(staticDirectory, `.${decodedPath}`);
  if (requestedFile !== staticDirectory && !requestedFile.startsWith(`${staticDirectory}${sep}`)) {
    response.writeHead(400);
    response.end('Invalid path.');
    return;
  }

  let file = requestedFile;
  try {
    const contents = await readFile(file);
    const contentType = staticContentTypes[extname(file).toLowerCase()] ?? 'application/octet-stream';
    response.writeHead(200, {
      'content-type': contentType,
      'cache-control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
    return;
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'EISDIR') {
      throw error;
    }
  }

  if (extname(file)) {
    response.writeHead(404);
    response.end('Not found.');
    return;
  }

  file = join(staticDirectory, 'index.html');
  const contents = await readFile(file);
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
  response.end(request.method === 'HEAD' ? undefined : contents);
}

const staticContentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function handleRequest(request, response) {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/health') {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      sendJson(response, 405, { error: 'Method not allowed.' });
      return;
    }
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (pathname !== '/api' && !pathname.startsWith('/api/')) {
    await serveFrontend(request, response, pathname);
    return;
  }

  const profileProgressMatch = pathname.match(/^\/api\/daily-task-profiles\/([^/]+)\/progress$/);
  if (pathname === '/api/daily-task-profiles' && request.method === 'GET') {
    const store = await readProgressStore();
    sendJson(response, 200, store.profiles);
    return;
  }

  if (pathname === '/api/daily-task-profiles' && request.method === 'POST') {
    const name = validateProfileName(await readBody(request));
    const profile = await updateProgressStore((store) => {
      if (store.profiles.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        throw new ApiError(409, 'A profile with that name already exists.');
      }
      const newProfile = { id: randomUUID(), name };
      store.profiles.push(newProfile);
      store.progress[newProfile.id] = {};
      return newProfile;
    });
    sendJson(response, 201, profile);
    return;
  }

  if (profileProgressMatch && (request.method === 'GET' || request.method === 'PUT')) {
    let profileId;
    try {
      profileId = decodeURIComponent(profileProgressMatch[1]);
    } catch {
      throw new ApiError(400, 'Invalid profile ID.');
    }

    if (request.method === 'GET') {
      const store = await readProgressStore();
      if (!store.profiles.some((profile) => profile.id === profileId)) {
        throw new ApiError(404, 'Profile not found.');
      }
      sendJson(response, 200, store.progress[profileId] ?? {});
      return;
    }

    const progress = validateProgress(await readBody(request));
    const savedProgress = await updateProgressStore((store) => {
      if (!store.profiles.some((profile) => profile.id === profileId)) {
        throw new ApiError(404, 'Profile not found.');
      }
      store.progress[profileId] = progress;
      return progress;
    });
    sendJson(response, 200, savedProgress);
    return;
  }

  if (pathname === '/api/daily-task-profiles' || pathname.startsWith('/api/daily-task-profiles/')) {
    response.setHeader('Allow', pathname === '/api/daily-task-profiles' ? 'GET, POST' : 'GET, PUT');
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  const taskIdMatch = pathname.match(/^\/api\/daily-tasks\/([^/]+)$/);
  if (pathname !== '/api/daily-tasks' && !taskIdMatch) {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  if (request.method === 'GET' && pathname === '/api/daily-tasks') {
    sendJson(response, 200, await readTasks());
    return;
  }

  if (request.method === 'POST' && pathname === '/api/daily-tasks') {
    const taskInput = validateTask(await readBody(request));
    const task = await updateTasks((tasks) => {
      const newTask = { id: randomUUID(), ...taskInput };
      tasks.push(newTask);
      return newTask;
    });
    sendJson(response, 201, task);
    return;
  }

  if (taskIdMatch && (request.method === 'PUT' || request.method === 'DELETE')) {
    let taskId;
    try {
      taskId = decodeURIComponent(taskIdMatch[1]);
    } catch {
      throw new ApiError(400, 'Invalid task ID.');
    }

    if (request.method === 'PUT') {
      const taskInput = validateTask(await readBody(request));
      const task = await updateTasks((tasks) => {
        const index = tasks.findIndex((item) => item.id === taskId);
        if (index === -1) {
          throw new ApiError(404, 'Task not found.');
        }
        tasks[index] = { id: taskId, ...taskInput };
        return tasks[index];
      });
      sendJson(response, 200, task);
      return;
    }

    const task = await updateTasks((tasks) => {
      const index = tasks.findIndex((item) => item.id === taskId);
      if (index === -1) {
        throw new ApiError(404, 'Task not found.');
      }
      return tasks.splice(index, 1)[0];
    });
    sendJson(response, 200, task);
    return;
  }

  const allowedMethods = pathname === '/api/daily-tasks' ? 'GET, POST' : 'PUT, DELETE';
  response.setHeader('Allow', allowedMethods);
  sendJson(response, 405, { error: 'Method not allowed.' });
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('API_PORT must be a valid TCP port.');
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    if (error instanceof ApiError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    console.error('Daily tasks API request failed:', error);
    sendJson(response, 500, { error: 'The daily tasks request failed.' });
  });
});

server.listen(port, host, () => {
  console.log(`Regular Works server listening on ${host}:${port}`);
  console.log(`Daily task progress resets at 07:30 server local time (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`);
  void runDailyProgressReset();
});
