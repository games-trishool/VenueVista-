import { randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const apiURL = process.env.E2E_API_URL || 'http://127.0.0.1:4000/api/v1';
const adminURL = process.env.E2E_ADMIN_URL || 'http://localhost:3000';
const customerURL = process.env.E2E_CUSTOMER_URL || 'http://localhost:8081';
const partnerURL = process.env.E2E_PARTNER_URL || 'http://localhost:8082';

function escape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A genuine decodable, synthetic PNG created just for upload validation. It is
// visibly test media and never a photograph of a claimed real bookable venue.
function testImage() {
  const width = 240,
    height = 160;
  const pixels = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    pixels[row] = 0;
    for (let x = 0; x < width; x++) {
      const offset = row + 1 + x * 3;
      const stripe = x > 75 && x < 165 && y > 40 && y < 120;
      pixels[offset] = stripe ? 216 : 55;
      pixels[offset + 1] = stripe ? 185 : 34;
      pixels[offset + 2] = stripe ? 121 : 83;
    }
  }
  const crc32 = (bytes: Buffer) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, bytes: Buffer) => {
    const kind = Buffer.from(type),
      length = Buffer.alloc(4),
      crc = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    crc.writeUInt32BE(crc32(Buffer.concat([kind, bytes])));
    return Buffer.concat([length, kind, bytes, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function devToken(request: APIRequestContext, persona: 'admin' | 'owner' | 'customer') {
  const response = await request.post(`${apiURL}/auth/dev-session`, { data: { persona } });
  expect(
    response.status(),
    'Explicit development authentication must be available on this isolated test instance',
  ).toBe(201);
  const result = (await response.json()) as { accessToken: string };
  expect(typeof result.accessToken).toBe('string');
  return result.accessToken;
}

async function clickContinue(page: Page) {
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

test('admin pages and proxy reject anonymous sessions', async ({ page, request }) => {
  await page.goto(adminURL);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Welcome to the console' })).toBeVisible();
  const privateRequest = await request.get(`${adminURL}/api/backend/admin/overview`);
  expect(privateRequest.status()).toBe(401);
  const crossOriginLogin = await request.post(`${adminURL}/api/auth/login`, {
    headers: { Origin: 'https://attacker.invalid', 'Sec-Fetch-Site': 'cross-site' },
    data: { development: true },
  });
  expect(crossOriginLogin.status(), 'Cross-site login must remain blocked').toBe(403);
  const forwardedOriginLogin = await request.post(`${adminURL}/api/auth/login`, {
    headers: {
      Origin: 'https://attacker.invalid',
      'Sec-Fetch-Site': 'same-origin',
      'X-Forwarded-Host': 'attacker.invalid',
      'X-Forwarded-Proto': 'https',
    },
    data: { development: true },
  });
  expect(
    forwardedOriginLogin.status(),
    'Client-supplied forwarding headers cannot authorize an origin',
  ).toBe(403);
  const missingOriginLogin = await request.post(`${adminURL}/api/auth/login`, {
    data: { development: true },
  });
  expect(missingOriginLogin.status(), 'Login requires an explicit matching browser origin').toBe(
    403,
  );
});

test('owner submission → admin approval → customer enquiry → owner quote', async ({
  browser,
  request,
}, testInfo) => {
  const run = randomUUID().slice(0, 8);
  const venueName = `[E2E ${run}] Synthetic test venue`;
  const businessName = `[E2E ${run}] Test business`;
  const quoteText = `[E2E ${run}] Test quotation includes hall rental only. Not a real offer.`;
  const requirements = `[E2E ${run}] Automated acceptance enquiry, not a real event.`;
  const future = new Date();
  future.setUTCDate(future.getUTCDate() + 30);
  const eventDate = future.toISOString().slice(0, 10);
  let venueId: string | undefined;
  const partnerContext = await browser.newContext({ viewport: { width: 1100, height: 950 } });
  const customerContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const partner = await partnerContext.newPage();
  const customer = await customerContext.newPage();
  const admin = await adminContext.newPage();

  try {
    await test.step('Register the owner business through Partner UI', async () => {
      await partner.goto(partnerURL);
      await partner.getByRole('button', { name: 'Open development owner workspace' }).click();
      await expect(partner.getByText('Your workspace', { exact: true })).toBeVisible();
      await partner.goto(`${partnerURL}/account`);
      await partner.getByLabel('Business name', { exact: true }).fill(businessName);
      await partner.getByLabel('Business mobile number', { exact: true }).fill('+919999999999');
      await partner
        .getByLabel('Registered business address', { exact: true })
        .fill('Synthetic acceptance test business address, Visakhapatnam');
      await partner.getByRole('button', { name: 'Create organization' }).click();
      await expect(
        partner.getByText('Organization created. You can now add a venue to it.', { exact: true }),
      ).toBeVisible();
    });

    await test.step('Create and submit a real database venue through the wizard', async () => {
      await partner.goto(`${partnerURL}/venue/edit`);
      await partner.getByRole('button', { name: businessName, exact: true }).click();
      await partner.getByLabel('Venue name', { exact: true }).fill(venueName);
      await partner
        .getByLabel('Tell customers about your space', { exact: true })
        .fill(
          'Synthetic automated browser-test listing. This is development data and not a real venue or a commercial rental offer.',
        );
      await partner.getByRole('button', { name: 'Wedding', exact: true }).click();
      await clickContinue(partner);
      await partner.getByLabel('City', { exact: true }).fill('Visakhapatnam');
      await partner
        .getByLabel('Locality / neighbourhood', { exact: true })
        .fill('E2E Test Locality');
      await partner.getByLabel('PIN code', { exact: true }).fill('530001');
      await partner
        .getByLabel('Full address', { exact: true })
        .fill('Synthetic test address, Visakhapatnam, Andhra Pradesh');
      await partner.getByLabel('Latitude', { exact: true }).fill('17.6868');
      await partner.getByLabel('Longitude', { exact: true }).fill('83.2185');
      await clickContinue(partner);
      await partner
        .getByLabel('First independently bookable space', { exact: true })
        .fill('E2E Test Main Hall');
      await partner.getByLabel('Venue seating capacity', { exact: true }).fill('500');
      await partner.getByLabel('Dining capacity', { exact: true }).fill('250');
      await partner.getByLabel('Standing capacity', { exact: true }).fill('700');
      await clickContinue(partner);
      await clickContinue(partner);
      await partner.getByLabel('Starting full-day rental (INR)', { exact: true }).fill('50000');
      const draftResponse = partner.waitForResponse(
        (response) =>
          response.url().endsWith('/partner/venues') && response.request().method() === 'POST',
      );
      await partner.getByRole('button', { name: 'Save & continue', exact: true }).click();
      const draft = await draftResponse;
      expect(draft.ok()).toBeTruthy();
      venueId = ((await draft.json()) as { id: string }).id;
      expect(venueId).toMatch(/^[0-9a-f-]{36}$/);
      const choose = partner.waitForEvent('filechooser');
      await partner.getByRole('button', { name: 'Choose and upload a photograph' }).click();
      await (
        await choose
      ).setFiles({ name: `synthetic-e2e-${run}.png`, mimeType: 'image/png', buffer: testImage() });
      await expect(partner.getByRole('img', { name: 'Venue cover photo' })).toBeVisible();
      await clickContinue(partner);
      await partner
        .getByLabel('Booking rules', { exact: true })
        .fill('Synthetic acceptance fixture only. No actual booking is offered.');
      await clickContinue(partner);
      const submitResponse = partner.waitForResponse(
        (response) =>
          response.url().endsWith(`/partner/venues/${venueId}/submit`) &&
          response.request().method() === 'POST',
      );
      await partner.getByRole('button', { name: 'Submit listing for approval' }).click();
      expect((await submitResponse).ok()).toBeTruthy();
      await expect(
        partner.getByText('Your listing is in the review queue.', { exact: false }),
      ).toBeVisible();
      await partner.screenshot({
        path: testInfo.outputPath('partner-pending-listing.png'),
        fullPage: true,
      });
      const publicBeforeApproval = await request.get(
        `${apiURL}/venues?city=Visakhapatnam&q=${encodeURIComponent(venueName)}`,
      );
      expect(((await publicBeforeApproval.json()) as { total: number }).total).toBe(0);
    });

    await test.step('Approve the pending listing through the secure admin UI', async () => {
      await admin.goto(adminURL);
      // Next can render the server-side login button before client hydration has
      // attached its handler. Wait for the initial script requests to finish.
      await admin.waitForLoadState('networkidle');
      await admin.getByRole('button', { name: 'Enter development console' }).click();
      await expect(admin.getByRole('navigation', { name: 'Console navigation' })).toBeVisible();
      const session = (await adminContext.cookies()).find(
        (cookie) => cookie.name === 'venuevista_admin',
      );
      expect(session?.httpOnly, 'Administrator credentials stay in an HTTP-only cookie').toBe(true);
      expect(session?.sameSite).toBe('Lax');
      await admin.getByRole('button', { name: 'Partner verification', exact: true }).click();
      const businessRow = admin.getByRole('row').filter({ hasText: businessName });
      await businessRow.getByRole('button', { name: 'Approve', exact: true }).click();
      const businessDecision = admin.getByRole('dialog', { name: 'Approve this partner?' });
      await businessDecision.getByRole('button', { name: 'Confirm decision', exact: true }).click();
      await expect(businessDecision).toBeHidden();
      await admin.getByRole('button', { name: 'Venue review', exact: false }).first().click();
      await admin.getByRole('textbox', { name: 'Search venue name or city' }).fill(venueName);
      await admin.getByRole('button', { name: 'Search', exact: true }).click();
      const row = admin.getByRole('row').filter({ hasText: venueName });
      await row.getByRole('button', { name: 'Review', exact: true }).click();
      const dialog = admin.getByRole('dialog', { name: 'Venue review' });
      await expect(dialog.getByRole('heading', { name: venueName, exact: true })).toBeVisible();
      const image = dialog.getByRole('img', { name: new RegExp(escape(venueName)) });
      await expect(image).toBeVisible();
      await expect
        .poll(
          () =>
            image.evaluate(
              (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
            ),
          { message: 'Admin can inspect protected pending venue media' },
        )
        .toBe(true);
      await admin.screenshot({
        path: testInfo.outputPath('admin-pending-review.png'),
        fullPage: true,
      });
      await dialog.getByRole('button', { name: 'Approve listing', exact: true }).click();
      await dialog.getByRole('button', { name: 'Confirm decision', exact: true }).click();
      await expect(dialog).toBeHidden();
      const publicAfterApproval = await request.get(
        `${apiURL}/venues?city=Visakhapatnam&q=${encodeURIComponent(venueName)}`,
      );
      expect(((await publicAfterApproval.json()) as { total: number }).total).toBe(1);
      await admin.screenshot({
        path: testInfo.outputPath('admin-after-approval.png'),
        fullPage: true,
      });
    });

    await test.step('Verify Customer tabs, city isolation and persisted wishlist', async () => {
      await customer.goto(customerURL);
      await expect(customer.getByRole('tab')).toHaveCount(3);
      for (const tab of ['Home', 'Wishlist', 'Search'])
        await expect(customer.getByRole('tab', { name: new RegExp(tab) })).toBeVisible();
      await expect(customer.getByText(venueName, { exact: true })).toBeVisible();
      await customer.screenshot({
        path: testInfo.outputPath('customer-discovery.png'),
        fullPage: true,
      });
      await customer
        .getByRole('button', { name: 'Change location, currently Visakhapatnam' })
        .click();
      await customer.getByRole('textbox', { name: 'Search supported cities' }).fill('Hyderabad');
      await customer.getByRole('button', { name: /Hyderabad/ }).click();
      await expect(
        customer.getByRole('button', { name: 'Change location, currently Hyderabad' }),
      ).toBeVisible();
      await expect(customer.getByText(venueName, { exact: true })).toHaveCount(0);
      await customer.getByRole('button', { name: 'Change location, currently Hyderabad' }).click();
      await customer
        .getByRole('textbox', { name: 'Search supported cities' })
        .fill('Visakhapatnam');
      await customer.getByRole('button', { name: /Visakhapatnam/ }).click();
      await expect(customer.getByText(venueName, { exact: true })).toBeVisible();
      await customer.getByRole('button', { name: 'Open your profile' }).click();
      await customer.getByRole('button', { name: 'Use development customer' }).click();
      await expect(customer.getByRole('button', { name: /Your enquiries/ })).toBeVisible();
      await customer.goto(`${customerURL}/venue/${venueId}`);
      await expect(customer.getByText(venueName, { exact: true })).toBeVisible();
      await customer.getByRole('button', { name: 'Save to wishlist', exact: true }).click();
      await expect(
        customer.getByRole('button', { name: 'Remove from wishlist', exact: true }),
      ).toBeVisible();
      await customer.goto(`${customerURL}/wishlist`);
      await expect(customer.getByText(venueName, { exact: true })).toBeVisible();
      await customer.goto(`${customerURL}/venue/${venueId}`);
      await customer.getByRole('button', { name: 'Request a personalized quote' }).click();
    });

    // Customer enquiry selectors are maintained against the real implemented UI.
    await test.step('Submit an enquiry from Customer and respond from Partner', async () => {
      await customer.getByLabel('Your event date', { exact: true }).fill(eventDate);
      await customer.getByLabel('Expected guests', { exact: true }).fill('200');
      await customer
        .getByLabel('Approximate budget · INR (optional)', { exact: true })
        .fill('75000');
      await customer
        .getByLabel('Anything else on your mind? (optional)', { exact: true })
        .fill(requirements);
      const enquiryResponse = customer.waitForResponse(
        (response) =>
          response.url().endsWith('/enquiries') && response.request().method() === 'POST',
      );
      await customer.getByRole('button', { name: 'Send enquiry' }).click();
      const created = await enquiryResponse;
      expect(created.ok()).toBeTruthy();
      const enquiryId = ((await created.json()) as { id: string }).id;
      expect(enquiryId).toMatch(/^[0-9a-f-]{36}$/);
      await partner.goto(`${partnerURL}/enquiry?id=${enquiryId}`);
      await expect(partner.getByText(requirements, { exact: true })).toBeVisible();
      await partner.getByLabel('Quote amount (INR)', { exact: true }).fill('60000');
      await partner.getByLabel('What’s included and excluded', { exact: true }).fill(quoteText);
      await partner.getByRole('button', { name: 'Send quotation', exact: true }).click();
      await expect(partner.getByText(quoteText, { exact: true })).toBeVisible();
      await expect(partner.getByText('QUOTE SENT', { exact: true })).toBeVisible();
      await customer.goto(`${customerURL}/enquiries`);
      await expect(customer.getByText(venueName, { exact: true })).toBeVisible();
      await customer.getByText(venueName, { exact: true }).click();
      await expect(customer.getByText(quoteText, { exact: true })).toBeVisible();
      await expect(
        customer.getByText('QUOTE SENT', { exact: true }).filter({ visible: true }).first(),
      ).toBeVisible();
      await customer.screenshot({
        path: testInfo.outputPath('customer-quotation.png'),
        fullPage: true,
      });
    });
    await test.step('End the administrator session through the console UI', async () => {
      await admin.getByRole('button', { name: 'Sign out', exact: true }).click();
      await expect(admin).toHaveURL(/\/login/);
      expect(
        (await adminContext.cookies()).some((cookie) => cookie.name === 'venuevista_admin'),
      ).toBe(false);
      const expired = await adminContext.request.get(`${adminURL}/api/backend/admin/overview`);
      expect(expired.status()).toBe(401);
    });
  } finally {
    // Do not delete arbitrary records or shared test accounts. Hide only this
    // run's listing by its captured UUID; labelled fixture history remains for
    // diagnosing failures and cannot be mistaken for live venue inventory.
    if (venueId) {
      try {
        const token = await devToken(request, 'admin');
        const suspended = await request.post(`${apiURL}/admin/venues/${venueId}/suspend`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { reason: `Automated browser fixture ${run} completed; hide synthetic listing.` },
        });
        expect(
          suspended.ok(),
          'Cleanup must hide only the captured synthetic listing',
        ).toBeTruthy();
      } finally {
        await testInfo.attach('fixture', {
          body: JSON.stringify({ venueId, venueName, synthetic: true }),
          contentType: 'application/json',
        });
      }
    }
    await Promise.all([partnerContext.close(), customerContext.close(), adminContext.close()]);
  }
});
