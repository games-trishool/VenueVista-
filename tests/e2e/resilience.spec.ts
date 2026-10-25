import { expect, test } from '@playwright/test';

const customerURL = process.env.E2E_CUSTOMER_URL || 'http://localhost:8081';

test('denied location permission preserves manual city selection', async ({ page, context }) => {
  const devtools = await context.newCDPSession(page);
  await devtools.send('Browser.setPermission', {
    permission: { name: 'geolocation' },
    setting: 'denied',
    origin: customerURL,
  });
  await page.goto(customerURL);
  await page.getByRole('button', { name: 'Change location, currently Visakhapatnam' }).click();
  await page.getByRole('button', { name: 'Use my current location' }).click();
  await expect(page.getByRole('alert')).toContainText('Location access was not granted');
  await page.getByLabel('Search supported cities').fill('Hyderabad');
  await page.getByRole('button', { name: /Hyderabad/ }).click();
  await expect(
    page.getByRole('button', { name: 'Change location, currently Hyderabad' }),
  ).toBeVisible();
});

test('slow real API response resolves to an honest empty search result', async ({ page }) => {
  // Delay the real request; no fabricated response or API fixture is injected.
  await page.route('**/api/v1/venues?**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.continue();
  });
  await page.goto(`${customerURL}/search`);
  await expect(page.getByText('Finding your perfect setting...', { exact: true })).toBeVisible();
  const needle = `no-such-venue-${Date.now()}`;
  const completed = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/v1/venues?`) &&
      response.url().includes(needle) &&
      response.request().method() === 'GET',
  );
  await page.getByLabel('Search by venue name, locality, PIN or event').fill(needle);
  const result = await completed;
  expect(result.status()).toBe(200);
  expect((await result.json()).items).toEqual([]);
  await expect(
    page.getByText('The perfect place is still out there', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('0 places to explore', { exact: true })).toBeVisible();
});

test('offline browsing reports connectivity and recovers after reconnecting', async ({
  page,
  context,
}) => {
  await page.goto(`${customerURL}/search`);
  await expect(page.getByLabel('Search by venue name, locality, PIN or event')).toBeVisible();
  await context.setOffline(true);
  const needle = `offline-${Date.now()}`;
  await page.getByLabel('Search by venue name, locality, PIN or event').fill(needle);
  await expect(page.getByText(/you.re offline/i)).toBeVisible();
  const resumed = page.waitForResponse(
    (response) => response.url().includes('/api/v1/venues?') && response.url().includes(needle),
  );
  await context.setOffline(false);
  expect((await resumed).status()).toBe(200);
  await expect(page.getByText(/you.re offline/i)).toBeHidden();
  await expect(
    page.getByText('The perfect place is still out there', { exact: true }),
  ).toBeVisible();
});

test('invalid filter ranges explain the problem before changing search', async ({ page }) => {
  await page.goto(`${customerURL}/search`);
  await page.getByRole('button', { name: /Filters/ }).click();
  await page.getByPlaceholder('₹ Min', { exact: true }).fill('20000');
  await page.getByPlaceholder('₹ Max', { exact: true }).fill('10000');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(
    page.getByText('Maximum budget must be at least the minimum.', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Close filters').click();
  await expect(page.getByLabel('Search by venue name, locality, PIN or event')).toBeVisible();
});
