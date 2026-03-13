const { test, expect } = require('@playwright/test');
const {
  API_URL,
  POLL_TIMEOUT,
  createSessionViaAPI,
  joinSessionViaAPI,
  getSessionViaAPI,
  updateSessionViaAPI,
  startSessionViaAPI,
  createCreatorContext,
  openBrowserAsUser,
} = require('./helpers/test-helpers');

test.describe('Session Start Flow', () => {
  let roomCode;
  let creatorId;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
    creatorId = session.creatorId;
  });

  test('new session has no turns and creator is disabled', async ({
    request,
  }) => {
    const data = await getSessionViaAPI(request, roomCode);

    // No turn assigned yet
    expect(data.session.current_turn_user_id).toBeNull();
    expect(data.session.started_at).toBeNull();

    // Creator is in skipped_participants
    expect(data.session.skipped_participants).toContain(creatorId);
  });

  test('start session via API assigns turn to first active participant', async ({
    request,
  }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    // Alice is active (not skipped), creator is skipped
    await startSessionViaAPI(request, roomCode, creatorId);

    const data = await getSessionViaAPI(request, roomCode);
    expect(data.session.started_at).toBeTruthy();
    // Turn goes to Alice (first non-skipped participant)
    expect(data.session.current_turn_user_id).toBe(alice.userId);
  });

  test('start session fails with no active participants', async ({
    request,
  }) => {
    // Only creator exists and they are skipped — no active participants
    const response = await request.post(
      `${API_URL}/sessions/${roomCode}/start`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { userId: creatorId },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('No active participants');
  });

  test('start session fails for non-creator', async ({ request }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    const response = await request.post(
      `${API_URL}/sessions/${roomCode}/start`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { userId: alice.userId },
      }
    );

    expect(response.status()).toBe(403);
  });

  test('cannot start session twice', async ({ request }) => {
    await joinSessionViaAPI(request, roomCode, 'Alice');
    await startSessionViaAPI(request, roomCode, creatorId);

    const response = await request.post(
      `${API_URL}/sessions/${roomCode}/start`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { userId: creatorId },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('already started');
  });

  test('creator sees Start Session button before start and End Session after', async ({
    browser,
    request,
  }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    // Before start: should see "Start Session" button
    await expect(
      creator.page.getByRole('button', { name: 'Start Session' })
    ).toBeVisible(POLL_TIMEOUT);

    // Should NOT see "End Session" button yet
    await expect(
      creator.page.getByRole('button', { name: 'End Session' })
    ).not.toBeVisible();

    // Should see the pre-start banner
    await expect(
      creator.page.getByText('Please enable a participant to begin')
    ).toBeVisible(POLL_TIMEOUT);

    // Click Start Session
    await creator.page.getByRole('button', { name: 'Start Session' }).click();

    // After start: should see "End Session" button
    await expect(
      creator.page.getByRole('button', { name: 'End Session' })
    ).toBeVisible(POLL_TIMEOUT);

    // "Start Session" button should be gone
    await expect(
      creator.page.getByRole('button', { name: 'Start Session' })
    ).not.toBeVisible();

    await creator.context.close();
  });

  test('sand timer does not fall before session starts', async ({
    browser,
    request,
  }) => {
    await joinSessionViaAPI(request, roomCode, 'Alice');

    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    // Before starting: no turn banner should be visible
    await expect(creator.page.getByText("It's your turn!")).not.toBeVisible();
    await expect(creator.page.getByText("It's Alice's turn")).not.toBeVisible();

    await creator.context.close();
  });
});
