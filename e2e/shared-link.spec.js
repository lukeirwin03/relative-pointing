const { test, expect } = require('@playwright/test');
const {
  createSessionViaAPI,
  createUserContext,
  POLL_TIMEOUT,
} = require('./helpers/test-helpers');

test.describe('Shared Link Flow', () => {
  let roomCode;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
  });

  test('unauthenticated user visiting /session/:roomCode redirects to join page with code pre-filled', async ({
    page,
  }) => {
    // Visit the session URL directly (no localStorage auth)
    await page.goto(`/session/${roomCode}`);

    // Should redirect to /?join=roomCode
    await expect(page).toHaveURL(`/?join=${roomCode}`);

    // Join tab should be active (blue background)
    const joinTab = page.getByRole('button', { name: 'Join Session' }).first();
    await expect(joinTab).toHaveClass(/bg-blue-600/);

    // Room code input should be pre-filled
    const roomCodeInput = page.getByPlaceholder('Enter room code');
    await expect(roomCodeInput).toHaveValue(roomCode);
  });

  test('user can complete join flow from the redirected page', async ({
    page,
  }) => {
    await page.goto(`/session/${roomCode}`);
    await expect(page).toHaveURL(`/?join=${roomCode}`);

    // Fill in name and submit
    await page.getByPlaceholder('Enter your name').fill('SharedLinkUser');
    await page
      .locator('form')
      .getByRole('button', { name: 'Join Session' })
      .click();

    // Should navigate to the session board
    await expect(page).toHaveURL(`/session/${roomCode}`);
    await expect(page.getByText('Room Code:')).toBeVisible();
  });

  test('authenticated user accesses session directly without redirect', async ({
    browser,
    request,
  }) => {
    const { context, page, userId } = await createUserContext(
      browser,
      'AuthUser'
    );

    // Join via API so the user is a valid participant
    await request.post(
      `http://localhost:${process.env.PORT || 5002}/api/sessions/${roomCode}/join`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { userId, userName: 'AuthUser' },
      }
    );

    await page.goto(`/session/${roomCode}`);

    // Should NOT redirect — stays on the session page
    await expect(page).toHaveURL(`/session/${roomCode}`);
    await expect(page.getByText('Room Code:')).toBeVisible(POLL_TIMEOUT);

    await context.close();
  });
});
