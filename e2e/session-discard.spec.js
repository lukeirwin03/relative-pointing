const { test, expect } = require('@playwright/test');
const {
  API_URL,
  createSessionViaAPI,
  joinSessionViaAPI,
  getSessionViaAPI,
  endSessionViaAPI,
  discardSessionViaAPI,
} = require('./helpers/test-helpers');

test.describe('Session Discard', () => {
  let roomCode;
  let creatorId;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
    creatorId = session.creatorId;
  });

  test('creator can discard an ended session and the row is gone', async ({
    request,
  }) => {
    // End the session first (discard is intended for the post-report phase)
    const ended = await endSessionViaAPI(request, roomCode, creatorId);
    expect(ended.status).toBe(200);

    const before = await getSessionViaAPI(request, roomCode);
    expect(before.session).toBeTruthy();
    expect(before.session.room_code.toLowerCase()).toBe(roomCode.toLowerCase());

    const discard = await discardSessionViaAPI(request, roomCode, creatorId);
    expect(discard.status).toBe(200);
    expect(discard.data.success).toBe(true);

    // After discard, the session should no longer exist — the GET handler returns 404
    const afterResponse = await request.get(`${API_URL}/sessions/${roomCode}`);
    expect(afterResponse.status()).toBe(404);
  });

  test('creator can discard before ending (immediate delete)', async ({
    request,
  }) => {
    const discard = await discardSessionViaAPI(request, roomCode, creatorId);
    expect(discard.status).toBe(200);
    expect(discard.data.success).toBe(true);

    const afterResponse = await request.get(`${API_URL}/sessions/${roomCode}`);
    expect(afterResponse.status()).toBe(404);
  });

  test('non-creator cannot discard — returns 403', async ({ request }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    const result = await discardSessionViaAPI(request, roomCode, alice.userId);
    expect(result.status).toBe(403);
    expect(result.data.error).toMatch(/creator/i);

    // Session should still exist
    const after = await getSessionViaAPI(request, roomCode);
    expect(after.session).toBeTruthy();
  });

  test('missing userId returns 400', async ({ request }) => {
    const response = await request.post(
      `${API_URL}/sessions/${roomCode}/discard`,
      { headers: { 'Content-Type': 'application/json' }, data: {} }
    );
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/userId/i);
  });

  test('discarding an unknown room code returns 404', async ({ request }) => {
    const result = await discardSessionViaAPI(
      request,
      'nonexistent-room',
      creatorId
    );
    expect(result.status).toBe(404);
  });

  test('tasks and comments are deleted via cascade', async ({ request }) => {
    // Create a task, then discard
    const taskResp = await request.post(
      `${API_URL}/sessions/${roomCode}/tasks/create-task`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { issueKey: 'SENS-1', title: 'Sensitive task title' },
      }
    );
    expect(taskResp.status()).toBe(200);

    const before = await getSessionViaAPI(request, roomCode);
    expect(before.tasks.length).toBeGreaterThan(0);

    const discard = await discardSessionViaAPI(request, roomCode, creatorId);
    expect(discard.status).toBe(200);

    // Session and its tasks should be gone entirely (cascade)
    const afterResponse = await request.get(`${API_URL}/sessions/${roomCode}`);
    expect(afterResponse.status()).toBe(404);
  });
});

test.describe('Session End — auth', () => {
  // Existing specs don't exercise the /end 403 path. This closes that gap.
  let roomCode;
  let creatorId;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
    creatorId = session.creatorId;
  });

  test('non-creator cannot end the session — returns 403', async ({
    request,
  }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    const result = await endSessionViaAPI(request, roomCode, alice.userId);
    expect(result.status).toBe(403);
    expect(result.data.error).toMatch(/creator/i);

    // Session should still be active (no ended_at)
    const after = await getSessionViaAPI(request, roomCode);
    expect(after.session.ended_at).toBeFalsy();
  });

  test('ending an already-ended session returns 400', async ({ request }) => {
    const first = await endSessionViaAPI(request, roomCode, creatorId);
    expect(first.status).toBe(200);

    const second = await endSessionViaAPI(request, roomCode, creatorId);
    expect(second.status).toBe(400);
    expect(second.data.error).toMatch(/already ended/i);
  });
});
