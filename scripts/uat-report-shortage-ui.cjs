const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const baseUrl = 'http://localhost:3000';
const downloadDir = path.join(__dirname, '..', 'tmp-downloads');
fs.mkdirSync(downloadDir, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  page.on('pageerror', (err) => {
    console.error('[pageerror]', err.message);
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Masukkan username').fill('admin');
  await page.getByPlaceholder('Masukkan password').fill('admin123');
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.getByRole('button', { name: 'Masuk Sistem' }).click(),
  ]);

  // Open report menu and navigate to supplier shortage report.
  await page.getByRole('button', { name: 'Laporan' }).click();
  await page.getByRole('button', { name: /Report Shortage Supplier/i }).click();

  await page.getByRole('heading', { name: /Report Shortage Supplier/i }).waitFor({ timeout: 15000 });
  await page.getByText(/Total Shortage Qty/i).waitFor({ timeout: 15000 });
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.getByRole('button', { name: 'Terapkan' }).click(),
  ]);
  await page.waitForTimeout(1200);

  const emptyStateCount = await page.getByText('Tidak ada data shortage supplier.').count();
  const rowCount = await page.locator('table tbody tr').count();
  if (emptyStateCount > 0 || rowCount <= 1) {
    throw new Error(`Shortage table seems empty. emptyStateCount=${emptyStateCount}, rowCount=${rowCount}`);
  }

  const [excelDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Excel' }).click(),
  ]);
  const excelPath = path.join(downloadDir, `uat_supplier_shortage_${Date.now()}.xlsx`);
  await excelDownload.saveAs(excelPath);
  if (!fs.existsSync(excelPath)) {
    throw new Error('Excel export file not found.');
  }

  console.log('UAT UI Report Shortage PASS');
  console.log(`Downloaded: ${excelPath}`);

  await context.close();
  await browser.close();
}

run().catch((error) => {
  console.error('UAT UI Report Shortage FAILED');
  console.error(error);
  process.exit(1);
});
