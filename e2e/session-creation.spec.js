const { test, expect } = require('@playwright/test');

test.describe('Session Creation', () => {
  test('home page loads with create and join tabs', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Relative Pointing')).toBeVisible();
    await expect(page.getByText('Create Session')).toBeVisible();
    await expect(page.getByText('Join Session')).toBeVisible();
  });

  test('create session with a name navigates to session page', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByPlaceholder('Enter your name').fill('Test User');
    await page.getByRole('button', { name: 'Create New Session' }).click();

    // Should navigate to /session/:roomCode
    await expect(page).toHaveURL(/\/session\/.+/);

    // Room code should be visible in the header
    await expect(page.getByText('Room Code:')).toBeVisible();
  });

  test('task board renders with sample tasks after session creation', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByPlaceholder('Enter your name').fill('Test User');
    await page.getByRole('button', { name: 'Create New Session' }).click();

    await expect(page).toHaveURL(/\/session\/.+/);

    // Sample tasks should be visible (created by the backend)
    await expect(page.getByText('PROJ-123')).toBeVisible();
    await expect(page.getByText('PROJ-124')).toBeVisible();
  });

  test('create session button is disabled without a name', async ({ page }) => {
    await page.goto('/');

    const button = page.getByRole('button', { name: 'Create New Session' });
    await expect(button).toBeDisabled();
  });
});
