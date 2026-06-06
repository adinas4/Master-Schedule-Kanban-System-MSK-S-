import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve('C:/Users/matra/monitoring-supplier');

const child = spawn('C:\\\\Windows\\\\System32\\\\cmd.exe', ['/c', 'npm run host'], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
});

child.on('close', (code) => {
  console.log(`npm run host exited with code ${code}`);
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('Failed to start npm run host', err);
  process.exit(1);
});
