const { test, expect } = require('@playwright/test');

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Create a session and navigate to the task board
    await page.goto('/');
    await page.getByPlaceholder('Enter your name').fill('Test User');
    await page.getByRole('button', { name: 'Create New Session' }).click();
    await expect(page).toHaveURL(/\/session\/.+/);
  });

  test('create a task via modal', async ({ page }) => {
    await page.getByRole('button', { name: '+ Create Task' }).click();

    // Modal should be visible
    await expect(page.getByText('Create New Task')).toBeVisible();

    // Fill in task details
    await page.getByPlaceholder('e.g., PROJ-1').fill('TEST-1');
    await page.getByPlaceholder('Enter task title').fill('My new test task');

    // Use the submit button inside the modal form (not the sidebar button)
    await page
      .locator('form')
      .getByRole('button', { name: 'Create Task' })
      .click();

    // Task should appear on the board
    await expect(page.getByText('TEST-1')).toBeVisible();
    await expect(page.getByText('My new test task')).toBeVisible();
  });

  test('delete a task via action modal', async ({ page }) => {
    // The session comes with sample tasks — use PROJ-123 (first/visible task)
    const taskText = page.getByText('PROJ-123').first();
    await expect(taskText).toBeVisible();

    // Find the task card and click the gear icon to open settings tab
    const taskCard = page
      .locator('div.group')
      .filter({ hasText: 'PROJ-123' })
      .first();
    const gearButton = taskCard.locator('button[title="Task settings"]');

    // force: true because the button is opacity-0 until CSS hover
    await gearButton.click({ force: true });

    // Settings tab should be open with delete button
    await expect(page.getByText('Danger Zone')).toBeVisible();
    const deleteButton = page.getByRole('button', { name: 'Delete Task' });
    await expect(deleteButton).toBeVisible();

    // First click arms the confirmation
    await deleteButton.click();
    await expect(
      page.getByRole('button', { name: 'Click again to confirm delete' })
    ).toBeVisible();

    // Second click confirms the delete
    await page
      .getByRole('button', { name: 'Click again to confirm delete' })
      .click();

    // Task should be removed
    await expect(page.getByText('PROJ-123').first()).not.toBeVisible({
      timeout: 10000,
    });
  });

  test('create task modal can be cancelled', async ({ page }) => {
    await page.getByRole('button', { name: '+ Create Task' }).click();
    await expect(page.getByText('Create New Task')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();

    // Modal should be closed
    await expect(page.getByText('Create New Task')).not.toBeVisible();
  });
});
