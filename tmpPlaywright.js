const { spawn } = require('child_process');
const { chromium } = require('playwright');

(async () => {
  const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], { stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (chunk) => {
    process.stdout.write('[serve] ' + chunk);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write('[serve-err] ' + chunk);
  });
  await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      if (chunk.toString().includes('Local:')) {
        server.stdout.off('data', onData);
        resolve();
      }
    };
    server.stdout.on('data', onData);
    server.on('error', reject);
  });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (msg) => {
    console.log('[page]', msg.type(), msg.text());
  });
  page.on('pageerror', (err) => {
    console.log('[pageerror]', err.message);
  });
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'page.png', fullPage: true });
  await browser.close();

  server.kill('SIGINT');
})();
