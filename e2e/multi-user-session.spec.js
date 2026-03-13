const { test, expect } = require('@playwright/test');
const {
  createSessionViaAPI,
  createAuthenticatedUserInSession,
  joinSessionViaAPI,
  POLL_TIMEOUT,
} = require('./helpers/test-helpers');

test.describe('Multi-User Session Management', () => {
  let roomCode;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
  });

  test('two users join and see each other in participant list', async ({
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

    // Creator (skipped) + Alice + Bob = 3 total, 2 active
    await expect(alice.page.getByText('Participants (2/3)')).toBeVisible(
      POLL_TIMEOUT
    );
    await expect(bob.page.getByText('Participants (2/3)')).toBeVisible(
      POLL_TIMEOUT
    );

    await alice.context.close();
    await bob.context.close();
  });

  test('three users join, all visible in participant count', async ({
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
    const charlie = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Charlie'
    );

    // Creator (skipped) + 3 joiners = 4 total, 3 active
    await expect(alice.page.getByText('Participants (3/4)')).toBeVisible(
      POLL_TIMEOUT
    );
    await expect(bob.page.getByText('Participants (3/4)')).toBeVisible(
      POLL_TIMEOUT
    );
    await expect(charlie.page.getByText('Participants (3/4)')).toBeVisible(
      POLL_TIMEOUT
    );

    await alice.context.close();
    await bob.context.close();
    await charlie.context.close();
  });

  test('user B joining is reflected on user A page after poll cycle', async ({
    browser,
    request,
  }) => {
    // Alice joins first
    const alice = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Alice'
    );

    // Initially: Creator (skipped) + Alice = 2 total, 1 active
    await expect(alice.page.getByText('Participants (1/2)')).toBeVisible(
      POLL_TIMEOUT
    );

    // Now Bob joins
    const bob = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Bob'
    );

    // Alice should see the count update to 3 total, 2 active
    await expect(alice.page.getByText('Participants (2/3)')).toBeVisible(
      POLL_TIMEOUT
    );

    await alice.context.close();
    await bob.context.close();
  });

  test('duplicate username is rejected', async ({ request }) => {
    // Creator is already "Creator" — try joining with the same name
    const response = await request.post(
      `http://localhost:${process.env.PORT || 5001}/api/sessions/${roomCode}/join`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          userId: '00000000-0000-0000-0000-000000000099',
          userName: 'Creator',
        },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('already taken');
  });
});
