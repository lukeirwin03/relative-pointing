const { test, expect } = require('@playwright/test');
const {
  API_URL,
  POLL_TIMEOUT,
  createSessionViaAPI,
  joinSessionViaAPI,
  getSessionViaAPI,
  updateSessionViaAPI,
  endTurnViaAPI,
  moveTaskRawViaAPI,
  transferOwnershipViaAPI,
  createCreatorContext,
  openBrowserAsUser,
  sleep,
} = require('./helpers/test-helpers');

test.describe('Presence Tracking', () => {
  let roomCode;
  let creatorId;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
    creatorId = session.creatorId;
  });

  test('last_seen_at is updated when polling with userId', async ({
    request,
  }) => {
    // Initial fetch without userId — last_seen_at should be the join time
    const before = await getSessionViaAPI(request, roomCode);
    const creatorParticipant = before.participants.find(
      (p) => p.user_id === creatorId
    );
    expect(creatorParticipant).toBeTruthy();
    expect(creatorParticipant.last_seen_at).toBeTruthy();

    const firstSeenAt = creatorParticipant.last_seen_at;

    // Wait a moment, then poll with userId to update last_seen_at
    await sleep(1100);
    await getSessionViaAPI(request, roomCode, creatorId);

    // Fetch again to verify the timestamp was updated
    const after = await getSessionViaAPI(request, roomCode);
    const updatedParticipant = after.participants.find(
      (p) => p.user_id === creatorId
    );
    expect(updatedParticipant.last_seen_at).not.toBe(firstSeenAt);
  });

  test('participants include last_seen_at in API response', async ({
    request,
  }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    // Poll as both users
    await getSessionViaAPI(request, roomCode, creatorId);
    await getSessionViaAPI(request, roomCode, alice.userId);

    const data = await getSessionViaAPI(request, roomCode);
    for (const p of data.participants) {
      expect(p.last_seen_at).toBeTruthy();
    }
  });

  test('offline user shows grey indicator in participant list', async ({
    browser,
    request,
  }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    // Open browser as creator (who will keep polling)
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    // Open browser as Alice briefly, then close to simulate disconnect
    const aliceCtx = await openBrowserAsUser(
      browser,
      roomCode,
      alice.userId,
      'Alice'
    );

    // Both should be visible initially
    await expect(creator.page.getByText('Participants (2/2)')).toBeVisible(
      POLL_TIMEOUT
    );

    // Close Alice's browser to stop her polling
    await aliceCtx.context.close();

    // Wait for Alice to be considered offline (>15s threshold)
    await sleep(17000);

    // Alice should be shown as offline in the sidebar participant list
    await expect(creator.page.getByText('(offline)')).toBeVisible(POLL_TIMEOUT);

    await creator.context.close();
  });

  test('online user does NOT show offline indicator', async ({
    browser,
    request,
  }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    // Open browsers for both users (both actively polling)
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );
    const aliceCtx = await openBrowserAsUser(
      browser,
      roomCode,
      alice.userId,
      'Alice'
    );

    // Wait for polling to establish presence
    await sleep(3000);

    // Neither user should have "(offline)" indicator in the sidebar
    const offlineLabels = creator.page.getByText('(offline)');
    await expect(offlineLabels).toHaveCount(0);

    await aliceCtx.context.close();
    await creator.context.close();
  });
});

test.describe('Manual Ownership Transfer', () => {
  let roomCode;
  let creatorId;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
    creatorId = session.creatorId;
  });

  test('creator can transfer ownership via API', async ({ request }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    const result = await transferOwnershipViaAPI(
      request,
      roomCode,
      creatorId,
      alice.userId
    );

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.newOwnerId).toBe(alice.userId);
    expect(result.data.newOwnerName).toBe('Alice');

    // Verify the session now has Alice as creator
    const data = await getSessionViaAPI(request, roomCode);
    expect(data.session.creator_id).toBe(alice.userId);
    expect(data.session.creator_name).toBe('Alice');
  });

  test('non-creator cannot transfer ownership', async ({ request }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');
    const bob = await joinSessionViaAPI(request, roomCode, 'Bob');

    // Alice (non-creator) tries to transfer to Bob
    const result = await transferOwnershipViaAPI(
      request,
      roomCode,
      alice.userId,
      bob.userId
    );

    expect(result.status).toBe(403);
    expect(result.data.error).toContain('Only the session owner');
  });

  test('cannot transfer ownership to yourself', async ({ request }) => {
    const result = await transferOwnershipViaAPI(
      request,
      roomCode,
      creatorId,
      creatorId
    );

    expect(result.status).toBe(400);
    expect(result.data.error).toContain('already the session owner');
  });

  test('cannot transfer ownership to non-participant', async ({ request }) => {
    const fakeUserId = '00000000-0000-4000-8000-000000000000';

    const result = await transferOwnershipViaAPI(
      request,
      roomCode,
      creatorId,
      fakeUserId
    );

    expect(result.status).toBe(400);
    expect(result.data.error).toContain('must be a participant');
  });

  test('new owner sees creator UI, old owner loses it', async ({
    browser,
    request,
  }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    // Open both browsers
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );
    const alicePage = await openBrowserAsUser(
      browser,
      roomCode,
      alice.userId,
      'Alice'
    );

    // Creator should see "Create Task" button
    await expect(
      creator.page.getByRole('button', { name: 'Create Task' })
    ).toBeVisible(POLL_TIMEOUT);

    // Alice should NOT see "Create Task" button yet
    await expect(
      alicePage.page.getByRole('button', { name: 'Create Task' })
    ).not.toBeVisible();

    // Transfer ownership to Alice via API
    await transferOwnershipViaAPI(request, roomCode, creatorId, alice.userId);

    // After poll cycle, Alice should now see "Create Task" button
    await expect(
      alicePage.page.getByRole('button', { name: 'Create Task' })
    ).toBeVisible(POLL_TIMEOUT);

    // Creator should no longer see "Create Task" button
    await expect(
      creator.page.getByRole('button', { name: 'Create Task' })
    ).not.toBeVisible(POLL_TIMEOUT);

    await alicePage.context.close();
    await creator.context.close();
  });

  test('owner star indicator shown in participant list', async ({
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

    // The owner star character (★) should be visible in the sidebar
    await expect(creator.page.locator('text=★')).toBeVisible(POLL_TIMEOUT);

    await creator.context.close();
  });

  test('transfer button is visible for eligible participants', async ({
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

    // Wait for Alice to appear in the sidebar
    await expect(creator.page.getByText('Participants (2/2)')).toBeVisible(
      POLL_TIMEOUT
    );

    // The transfer button (person icon SVG) should be visible for Alice in the sidebar
    // There should be exactly one transfer button (not for the creator themselves)
    const transferButtons = creator.page.locator(
      'button[title="Transfer ownership"]'
    );
    await expect(transferButtons).toHaveCount(1, POLL_TIMEOUT);

    await creator.context.close();
  });
});

test.describe('Disabled User Protection', () => {
  let roomCode;
  let creatorId;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
    creatorId = session.creatorId;
  });

  test('disabled user cannot move tasks via API', async ({ request }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    // Give Alice the turn
    await endTurnViaAPI(request, roomCode, creatorId);
    const data = await getSessionViaAPI(request, roomCode);
    expect(data.session.current_turn_user_id).toBe(alice.userId);

    // Disable Alice
    await updateSessionViaAPI(request, roomCode, {
      skipped_participants: [alice.userId],
    });

    // Turn should have auto-advanced away from Alice
    const afterSkip = await getSessionViaAPI(request, roomCode);
    expect(afterSkip.session.current_turn_user_id).not.toBe(alice.userId);

    // Alice tries to move a task — should get 403
    const task = data.tasks[0];
    const result = await moveTaskRawViaAPI(
      request,
      roomCode,
      task.id,
      'some-column',
      alice.userId
    );

    expect(result.status).toBe(403);
  });

  test('all participants disabled shows warning banner and null turn', async ({
    browser,
    request,
  }) => {
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    // Wait for initial load
    await expect(creator.page.getByText("It's your turn!")).toBeVisible(
      POLL_TIMEOUT
    );

    // Disable the only participant (the creator)
    await updateSessionViaAPI(request, roomCode, {
      skipped_participants: [creatorId],
    });

    // Should see the "all disabled" red banner
    await expect(
      creator.page.getByText('All participants are disabled')
    ).toBeVisible(POLL_TIMEOUT);

    // The "It's your turn!" banner should be gone
    await expect(creator.page.getByText("It's your turn!")).not.toBeVisible();

    // Verify via API that turn is null
    const data = await getSessionViaAPI(request, roomCode);
    expect(data.session.current_turn_user_id).toBeNull();

    await creator.context.close();
  });

  test('re-enabling a participant restores the turn', async ({ request }) => {
    // Disable creator (only participant)
    await updateSessionViaAPI(request, roomCode, {
      skipped_participants: [creatorId],
    });

    const disabledData = await getSessionViaAPI(request, roomCode);
    expect(disabledData.session.current_turn_user_id).toBeNull();

    // Re-enable creator
    await updateSessionViaAPI(request, roomCode, {
      skipped_participants: [],
    });

    const enabledData = await getSessionViaAPI(request, roomCode);
    expect(enabledData.session.current_turn_user_id).toBe(creatorId);
  });
});

test.describe('Auto-skip Turn on Disconnect', () => {
  // These tests require waiting for the presence check interval (10s)
  // and the auto-skip threshold (30s). They are intentionally slower.
  test.setTimeout(90000);

  let roomCode;
  let creatorId;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
    creatorId = session.creatorId;
  });

  test('turn auto-advances when turn holder goes offline', async ({
    request,
  }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    // Make both users "online" by polling with userId
    await getSessionViaAPI(request, roomCode, creatorId);
    await getSessionViaAPI(request, roomCode, alice.userId);

    // End creator's turn so Alice has it
    await endTurnViaAPI(request, roomCode, creatorId);
    const data = await getSessionViaAPI(request, roomCode, creatorId);
    expect(data.session.current_turn_user_id).toBe(alice.userId);

    // Alice stops polling. Creator keeps polling to stay online.
    // Wait for auto-skip threshold (30s) + presence check interval (10s) + buffer
    for (let i = 0; i < 22; i++) {
      await sleep(2000);
      await getSessionViaAPI(request, roomCode, creatorId);
    }

    // Verify the turn has moved away from Alice
    const afterSkip = await getSessionViaAPI(request, roomCode, creatorId);
    expect(afterSkip.session.current_turn_user_id).not.toBe(alice.userId);
    expect(afterSkip.session.current_turn_user_id).toBe(creatorId);
  });

  test('turn becomes null when all users go offline', async ({ request }) => {
    // Poll once to register presence
    await getSessionViaAPI(request, roomCode, creatorId);

    const before = await getSessionViaAPI(request, roomCode);
    expect(before.session.current_turn_user_id).toBe(creatorId);

    // Stop polling entirely and wait for auto-skip threshold
    await sleep(45000);

    // Fetch without userId (don't update presence)
    const after = await getSessionViaAPI(request, roomCode);
    expect(after.session.current_turn_user_id).toBeNull();
  });
});

test.describe('Auto-transfer Ownership on Creator Disconnect', () => {
  // These tests require waiting for the auto-transfer threshold (60s).
  test.setTimeout(120000);

  let roomCode;
  let creatorId;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
    creatorId = session.creatorId;
  });

  test('ownership auto-transfers when creator goes offline', async ({
    request,
  }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    // Both users poll initially
    await getSessionViaAPI(request, roomCode, creatorId);
    await getSessionViaAPI(request, roomCode, alice.userId);

    // Creator stops polling. Alice keeps polling.
    // Wait for auto-transfer threshold (60s) + presence check interval (10s) + buffer
    for (let i = 0; i < 38; i++) {
      await sleep(2000);
      await getSessionViaAPI(request, roomCode, alice.userId);
    }

    // Verify ownership has transferred to Alice
    const afterTransfer = await getSessionViaAPI(
      request,
      roomCode,
      alice.userId
    );
    expect(afterTransfer.session.creator_id).toBe(alice.userId);
    expect(afterTransfer.session.creator_name).toBe('Alice');
  });

  test('ownership does NOT transfer if creator stays online', async ({
    request,
  }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    // Both keep polling for a while
    for (let i = 0; i < 10; i++) {
      await sleep(2000);
      await getSessionViaAPI(request, roomCode, creatorId);
      await getSessionViaAPI(request, roomCode, alice.userId);
    }

    // Creator should still be the owner
    const data = await getSessionViaAPI(request, roomCode, creatorId);
    expect(data.session.creator_id).toBe(creatorId);
    expect(data.session.creator_name).toBe('Creator');
  });
});
