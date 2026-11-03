import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const node = process.execPath;
const children = [
  spawn(node, [join(projectRoot, 'server', 'api.mjs')], {
    cwd: projectRoot,
    stdio: 'inherit',
  }),
  spawn(node, [join(projectRoot, 'node_modules', '@angular', 'cli', 'bin', 'ng.js'), 'serve', '--proxy-config', 'proxy.conf.json', ...process.argv.slice(2)], {
    cwd: projectRoot,
    stdio: 'inherit',
  }),
];

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) {
    return;
  }
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
    }
  }
}

for (const child of children) {
  child.on('error', (error) => {
    console.error('Could not start the application process:', error);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) {
      stop(code ?? 1);
    }
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
