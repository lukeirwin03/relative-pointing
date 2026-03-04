const { test, expect } = require('@playwright/test');

const API_URL = `http://localhost:${process.env.PORT || 5001}/api`;

test.describe('Join Session', () => {
  let roomCode;

  test.beforeEach(async ({ request }) => {
    // Create a session via API so we have a room code to join
    const response = await request.post(`${API_URL}/sessions`, {
      data: {
        creatorId: '00000000-0000-0000-0000-000000000001',
        creatorName: 'Creator',
      },
    });
    const data = await response.json();
    roomCode = data.roomCode;
  });

  test('join an existing session via UI', async ({ page }) => {
    await page.goto('/');

    // Switch to join tab
    await page.getByRole('button', { name: 'Join Session' }).click();

    await page.getByPlaceholder('Enter your name').fill('Joiner');
    await page.getByPlaceholder('Enter room code').fill(roomCode);

    // Use the submit button inside the form (not the tab button)
    await page
      .locator('form')
      .getByRole('button', { name: 'Join Session' })
      .click();

    // Should navigate to the session page
    await expect(page).toHaveURL(`/session/${roomCode}`);
    await expect(page.getByText('Room Code:')).toBeVisible();
  });

  test('shows error on invalid room code', async ({ page }) => {
    await page.goto('/');

    // Switch to join tab
    await page.getByRole('button', { name: 'Join Session' }).click();

    await page.getByPlaceholder('Enter your name').fill('Joiner');
    await page.getByPlaceholder('Enter room code').fill('nonexistent-code');

    await page
      .locator('form')
      .getByRole('button', { name: 'Join Session' })
      .click();

    // Error message should appear
    await expect(page.locator('.text-red-600')).toBeVisible();
  });

  test('join button is disabled without name and room code', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Join Session' }).click();

    const joinButton = page
      .locator('form')
      .getByRole('button', { name: 'Join Session' });
    await expect(joinButton).toBeDisabled();
  });
});
