const { test, expect } = require('@playwright/test');
const {
  createSessionViaAPI,
  createTaskViaAPI,
  getSessionViaAPI,
  deleteTaskViaAPI,
  createAuthenticatedUserInSession,
  POLL_TIMEOUT,
} = require('./helpers/test-helpers');

test.describe('Unique Task IDs', () => {
  let roomCode;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
  });

  test('API returns unique UUID id and separate display_id per task', async ({
    request,
  }) => {
    const data = await getSessionViaAPI(request, roomCode);
    const tasks = data.tasks;

    // Each task should have a UUID id and a display_id (jira_key)
    const ids = tasks.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // display_id should match jira_key
    for (const task of tasks) {
      expect(task.display_id).toBeTruthy();
      expect(task.id).not.toBe(task.display_id);
      // id should be a UUID
      expect(task.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    }
  });

  test('two tasks with same jira_key render as separate cards', async ({
    browser,
    request,
  }) => {
    // Create two tasks with the same issue key
    await createTaskViaAPI(request, roomCode, 'DUP-1', 'First duplicate');
    await createTaskViaAPI(request, roomCode, 'DUP-1', 'Second duplicate');

    const user = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Viewer'
    );

    // Both task titles should be visible as separate cards
    const cards = user.page.locator('text=DUP-1');
    await expect(cards).toHaveCount(2, POLL_TIMEOUT);

    // Both titles should be visible
    await expect(user.page.getByText('First duplicate')).toBeVisible();
    await expect(user.page.getByText('Second duplicate')).toBeVisible();

    await user.context.close();
  });

  test('deleting one duplicate-key task leaves the other intact', async ({
    browser,
    request,
  }) => {
    // Create two tasks with the same jira_key
    const task1 = await createTaskViaAPI(request, roomCode, 'DUP-2', 'Keep me');
    const task2 = await createTaskViaAPI(
      request,
      roomCode,
      'DUP-2',
      'Delete me'
    );

    // Delete only the second task by its UUID
    await deleteTaskViaAPI(request, roomCode, task2.task.id);

    // Verify via API that only task1 remains
    const data = await getSessionViaAPI(request, roomCode);
    const dupTasks = data.tasks.filter((t) => t.jira_key === 'DUP-2');
    expect(dupTasks).toHaveLength(1);
    expect(dupTasks[0].title).toBe('Keep me');

    // Verify via UI
    const user = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Checker'
    );

    await expect(user.page.getByText('Keep me')).toBeVisible(POLL_TIMEOUT);
    await expect(user.page.getByText('Delete me')).not.toBeVisible();

    await user.context.close();
  });
});
