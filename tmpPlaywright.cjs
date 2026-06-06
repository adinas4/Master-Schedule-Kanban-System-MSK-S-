const { spawn } = require('child_process');
const { chromium } = require('playwright');

(async () => {
  const server = spawn('cmd.exe', ['/c', 'npm run dev -- --host 127.0.0.1 --port 4173'], { stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (chunk) => {
    process.stdout.write('[serve-Em 