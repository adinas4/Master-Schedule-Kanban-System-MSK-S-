const { chromium } = require('playwright');

(async () =
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (msg) =, msg.type(), msg.text()));
  page.on('pageerror', (err) =, err.message));
  await page.goto('http://127.0.0.1:4174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await browser.close();
})();
