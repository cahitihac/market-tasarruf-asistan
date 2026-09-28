import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../../../', import.meta.url));
const expoUrl = process.env.EXPO_DEMO_URL ?? 'http://localhost:8081';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';
const errors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true });
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(expoUrl, { waitUntil: 'domcontentloaded' });
  await page.getByText('Good evening.').waitFor();
  await page.getByText('My Needs', { exact: true }).click();
  await page.getByText('+ Add', { exact: true }).click();
  await page.getByLabel('What do you need?').fill('Dishwasher tablets');
  await page.getByText('Dishwasher tablets', { exact: true }).last().click();
  await page.getByLabel('Preferred brands').fill('Finish');
  await page.getByLabel('Minimum count').fill('40');
  await page.getByText('Create need', { exact: true }).click();
  await page.waitForURL(/\/needs\/[^/]+$/);
  const needId = page.url().split('/').pop();
  assert.ok(needId);
  await page.getByText('Matching offers', { exact: true }).waitFor();
  await page.getByText('319 TRY', { exact: true }).filter({ visible: true }).first().waitFor();
  await page.getByText(/GREAT DEAL/).filter({ visible: true }).first().waitFor();
  await page.getByText('22% below 90-day average').filter({ visible: true }).first().waitFor();

  await run('corepack', ['pnpm', '--filter', '@market/worker', 'trigger'], { cwd: root, timeout: 120000 });
  const dealsResponse = await (await fetch(`${apiUrl}/deals?all=true`)).json();
  const deal = dealsResponse.deals.find(item => item.needId === needId && item.currentPriceMinor === 31900);
  assert.ok(deal, 'Persisted 319 TRY deal missing');
  assert.equal(deal.label, 'GREAT_DEAL');

  await page.getByText('See persisted deals').click();
  await page.getByText('Current deals').waitFor();
  await page.getByText('319 TRY', { exact: true }).filter({ visible: true }).first().waitFor();
  await page.getByText('Alerts', { exact: true }).filter({ visible: true }).last().click();
  const notificationsResponse = await (await fetch(`${apiUrl}/notifications`)).json();
  const notification = notificationsResponse.notifications.find(item => item.alert.needId === needId);
  assert.ok(notification, 'Persistent notification missing');
  await page.getByTestId(`notification-${notification.id}`).click();
  await page.waitForURL(new RegExp(`/deals/${deal.id}$`));
  await page.getByText('Recent price history').waitFor();
  await page.getByLabel(/Price history chart with \d+ observations/).waitFor();
  await page.screenshot({ path: '/private/tmp/market-native-validation-chart.png', fullPage: true });
  await page.getByText('← Back').click();
  await page.getByTestId(`read-${notification.id}`).click();
  await page.getByTestId(`read-${notification.id}`).waitFor({ state: 'detached' });
  const saved = (await (await fetch(`${apiUrl}/notifications`)).json()).notifications.find(item => item.id === notification.id);
  assert.ok(saved?.readAt, 'Notification readAt was not saved');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Notifications', { exact: true }).waitFor();
  assert.match(await page.getByTestId(`notification-${notification.id}`).innerText(), /\bREAD\b/);
  const afterReload = (await (await fetch(`${apiUrl}/notifications`)).json()).notifications.find(item => item.id === notification.id);
  assert.equal(afterReload.readAt, saved.readAt);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: '/private/tmp/market-phase6-notifications.png', fullPage: true });
  await page.getByText('My Needs', { exact: true }).filter({ visible: true }).last().click();
  await page.getByText('+ Add', { exact: true }).filter({ visible: true }).last().click();
  await page.getByLabel('What do you need?').fill('Olive oil');
  await page.getByText('Olive oil', { exact: true }).last().click();
  await page.getByLabel('Minimum volume (ml)').fill('1000');
  await page.getByText('Create need', { exact: true }).click();
  await page.waitForURL(/\/needs\/[^/]+$/);
  const editableNeedId = page.url().split('/').pop();
  await page.getByText('Edit need', { exact: true }).filter({ visible: true }).click();
  await page.getByLabel('Minimum volume (ml)').fill('');
  await page.getByText('Save changes', { exact: true }).click();
  await page.waitForURL(new RegExp(`/needs/${editableNeedId}$`));
  const editedNeed = await (await fetch(`${apiUrl}/needs/${editableNeedId}`)).json();
  assert.equal(editedNeed.minimumVolumeMl, undefined);
  await page.getByText('Archive', { exact: true }).filter({ visible: true }).click();
  await page.getByText('Archive need', { exact: true }).filter({ visible: true }).click();
  await page.waitForURL(/\/needs$/);
  const activeNeeds = await (await fetch(`${apiUrl}/needs`)).json();
  assert.equal(activeNeeds.needs.some(item => item.id === editableNeedId), false);
  const statePage = await context.newPage();
  statePage.on('pageerror', error => errors.push(error.message));
  await statePage.route(`${apiUrl}/needs`, async route => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.fulfill({ status: 503, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ message: 'Temporary outage' }) });
  });
  await statePage.goto(`${expoUrl}/needs`, { waitUntil: 'domcontentloaded' });
  await statePage.getByText('Loading your savings…').waitFor();
  await statePage.getByText('Could not load this page').waitFor();
  await statePage.getByText('Temporary outage').waitFor();
  await statePage.unroute(`${apiUrl}/needs`);
  await statePage.getByText('Try again').click();
  await statePage.getByText('Dishwasher tablets', { exact: true }).first().waitFor();
  await statePage.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', needId, dealId: deal.id, notificationId: notification.id,
    recommendation: deal.label, priceMinor: deal.currentPriceMinor, readAt: saved.readAt,
    editedAndArchivedNeedId: editableNeedId, browserErrors: errors }));
} catch (error) {
  console.error(JSON.stringify({ url: page.url(), text: (await page.locator('body').innerText()).slice(0, 2000), browserErrors: errors }));
  await page.screenshot({ path: '/private/tmp/market-phase6-failure.png', fullPage: true });
  throw error;
} finally {
  await browser.close();
}
