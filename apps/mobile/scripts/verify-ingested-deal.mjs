import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const [dealId, notificationId, source = 'external-fixture'] = process.argv.slice(2);
if (!dealId || !notificationId) throw new Error('Usage: node scripts/verify-ingested-deal.mjs <dealId> <notificationId>');
const base = process.env.EXPO_DEMO_URL ?? 'http://localhost:8081';
const api = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';
const deal = await (await fetch(`${api}/deals/${dealId}`)).json();
assert.equal(deal.currentPriceMinor, 27900);
assert.equal(deal.label, 'GREAT_DEAL');
const notifications = await (await fetch(`${api}/notifications`)).json();
assert.ok(notifications.notifications.some(item => item.id === notificationId && item.alert.dealId === dealId));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${base}/notifications`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId(`notification-${notificationId}`).waitFor();
  await page.getByTestId(`notification-${notificationId}`).click();
  await page.waitForURL(new RegExp(`/deals/${dealId}$`));
  await page.getByText('₺279', { exact: true }).first().waitFor();
  await page.getByText(/KAÇIRILMAYACAK FIRSAT/).first().waitFor();
  await page.getByLabel(/\d+ gözlem içeren fiyat geçmişi grafiği/).waitFor();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', dealId, notificationId, source,
    priceMinor: deal.currentPriceMinor, label: deal.label, browserErrors: errors }));
} finally { await browser.close(); }
