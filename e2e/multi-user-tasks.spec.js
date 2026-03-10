const { test, expect } = require('@playwright/test');
const {
  createSessionViaAPI,
  createTaskViaAPI,
  deleteTaskViaAPI,
  updateTaskColorViaAPI,
  getSessionViaAPI,
  createAuthenticatedUserInSession,
  POLL_TIMEOUT,
} = require('./helpers/test-helpers');

test.describe('Multi-User Task Operations', () => {
  let roomCode;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
  });

  test('task created by User A appears on User B board after poll', async ({
    browser,
    request,
  }) => {
    const alice = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Alice'
    );
    const bob = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Bob'
    );

    // Alice creates a task via API
    await createTaskViaAPI(request, roomCode, 'NEW-1', 'Alice task');

    // Bob should see it after poll
    await expect(bob.page.getByText('NEW-1')).toBeVisible(POLL_TIMEOUT);
    await expect(bob.page.getByText('Alice task')).toBeVisible(POLL_TIMEOUT);

    // Alice should also see it
    await expect(alice.page.getByText('NEW-1')).toBeVisible(POLL_TIMEOUT);

    await alice.context.close();
    await bob.context.close();
  });

  test('task deleted by User A disappears from User B board', async ({
    browser,
    request,
  }) => {
    // Create a task first
    const taskResult = await createTaskViaAPI(
      request,
      roomCode,
      'DEL-1',
      'To be deleted'
    );

    const alice = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Alice'
    );
    const bob = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Bob'
    );

    // Both should see the task initially
    await expect(alice.page.getByText('DEL-1')).toBeVisible(POLL_TIMEOUT);
    await expect(bob.page.getByText('DEL-1')).toBeVisible(POLL_TIMEOUT);

    // Delete via API
    await deleteTaskViaAPI(request, roomCode, taskResult.task.id);

    // Both should see it disappear
    await expect(alice.page.getByText('DEL-1')).not.toBeVisible(POLL_TIMEOUT);
    await expect(bob.page.getByText('DEL-1')).not.toBeVisible(POLL_TIMEOUT);

    await alice.context.close();
    await bob.context.close();
  });

  test('both users see same sample tasks on initial load', async ({
    browser,
    request,
  }) => {
    const alice = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Alice'
    );
    const bob = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Bob'
    );

    // Both should see the default sample tasks
    for (const key of ['PROJ-123', 'PROJ-124', 'PROJ-125']) {
      await expect(alice.page.getByText(key).first()).toBeVisible(POLL_TIMEOUT);
      await expect(bob.page.getByText(key).first()).toBeVisible(POLL_TIMEOUT);
    }

    await alice.context.close();
    await bob.context.close();
  });
});
