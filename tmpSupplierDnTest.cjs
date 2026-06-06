const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const baseUrl = 'http://localhost:3000';
const downloadDir = path.join(__dirname, 'tmp-downloads');
fs.mkdirSync(downloadDir, { recursive: true });

const loginAndOpenDn = async (page, username, password) => {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Masukkan username').fill(username);
  await page.getByPlaceholder('Masukkan password').fill(password);
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.getByRole('button', { name: 'Masuk Sistem' }).click(),
  ]);
  await page.getByText('Supplier Portal', { exact: true }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Tracking DN' }).click();
  await page.getByText(/Total DN/i).waitFor({ timeout: 15000 });
};

const assertTextVisible = async (page, text) => {
  await page.getByText(text).waitFor({ timeout: 15000 });
};

const assertTextNotVisible = async (page, text) => {
  const count = await page.getByText(text).count();
  if (count > 0) {
    throw new Error(`Text should not be visible: ${text}`);
  }
};

const run = async () => {
  const browser = await chromium.launch();

  // Vendor A
  const contextA = await browser.newContext({ acceptDownloads: true });
  const pageA = await contextA.newPage();
  await loginAndOpenDn(pageA, 'vendor_a', 'supplier123');
  await assertTextVisible(pageA, 'DN-DUM-A-LOCAL-001');
  await assertTextNotVisible(pageA, 'DN-DUM-B-LOCAL-001');

  const [excelDownload] = await Promise.all([
    pageA.waitForEvent('download'),
    pageA.getByRole('button', { name: 'Export Excel' }).click(),
  ]);
  const excelPath = path.join(downloadDir, 'vendor_a_tracking_dn.xlsx');
  await excelDownload.saveAs(excelPath);
  if (!fs.existsSync(excelPath)) throw new Error('Excel export file not found');

  const [csvDownload] = await Promise.all([
    pageA.waitForEvent('download'),
    pageA.getByRole('button', { name: 'Export CSV' }).click(),
  ]);
  const csvPath = path.join(downloadDir, 'vendor_a_tracking_dn.csv');
  await csvDownload.saveAs(csvPath);
  if (!fs.existsSync(csvPath)) throw new Error('CSV export file not found');

  const [popup] = await Promise.all([
    pageA.waitForEvent('popup'),
    pageA.getByRole('button', { name: 'Print' }).click(),
  ]);
  await popup.waitForLoadState('domcontentloaded');
  const popupContent = await popup.content();
  if (!popupContent.includes('Rekap Tracking DN')) {
    throw new Error('Print popup did not render Tracking DN content');
  }
  await popup.close();

  await contextA.close();

  // Vendor B
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await loginAndOpenDn(pageB, 'vendor_b', 'supplier123');
  await assertTextVisible(pageB, 'DN-DUM-B-LOCAL-001');
  await assertTextNotVisible(pageB, 'DN-DUM-A-LOCAL-001');
  await contextB.close();

  await browser.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
