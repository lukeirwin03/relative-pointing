const { test, expect } = require('@playwright/test');
const {
  API_URL,
  POLL_TIMEOUT,
  createSessionViaAPI,
  joinSessionViaAPI,
  getSessionViaAPI,
  createCreatorContext,
  openBrowserAsUser,
  endTurnViaAPI,
  updateSessionViaAPI,
  skipTopTaskViaAPI,
} = require('./helpers/test-helpers');

test.describe('Turn-Based Features', () => {
  let roomCode;
  let creatorId;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
    creatorId = session.creatorId;
  });

  test('full turn rotation: creator clicks End My Turn, banner updates for each user', async ({
    browser,
    request,
  }) => {
    // Join Alice via API
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    // Open browsers with correct identities
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

    // --- Creator's turn ---
    // Creator sees green "It's your turn!" banner
    await expect(creator.page.getByText("It's your turn!")).toBeVisible(
      POLL_TIMEOUT
    );

    // Creator sees "End My Turn" button
    await expect(
      creator.page.getByRole('button', { name: 'End My Turn' })
    ).toBeVisible();

    // Creator sees the timer ticking
    await expect(creator.page.locator('.hourglass-pulse')).toBeVisible();

    // Alice sees yellow banner "It's Creator's turn"
    await expect(alicePage.page.getByText("It's Creator's turn")).toBeVisible(
      POLL_TIMEOUT
    );

    // Alice should NOT see "End My Turn"
    await expect(
      alicePage.page.getByRole('button', { name: 'End My Turn' })
    ).not.toBeVisible();

    // --- Creator ends turn ---
    await creator.page.getByRole('button', { name: 'End My Turn' }).click();

    // Creator now sees yellow banner "It's Alice's turn"
    await expect(creator.page.getByText("It's Alice's turn")).toBeVisible(
      POLL_TIMEOUT
    );

    // Creator should no longer see "End My Turn"
    await expect(
      creator.page.getByRole('button', { name: 'End My Turn' })
    ).not.toBeVisible();

    // Alice now sees green "It's your turn!" banner
    await expect(alicePage.page.getByText("It's your turn!")).toBeVisible(
      POLL_TIMEOUT
    );

    // Alice sees "End My Turn" button
    await expect(
      alicePage.page.getByRole('button', { name: 'End My Turn' })
    ).toBeVisible();

    // --- Alice ends turn, wraps back to Creator ---
    await alicePage.page.getByRole('button', { name: 'End My Turn' }).click();

    // Creator sees "It's your turn!" again
    await expect(creator.page.getByText("It's your turn!")).toBeVisible(
      POLL_TIMEOUT
    );

    await creator.context.close();
    await alicePage.context.close();
  });

  test("leader can skip another user's turn via Skip Turn button", async ({
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

    // Creator ends their own turn to give it to Alice
    await expect(
      creator.page.getByRole('button', { name: 'End My Turn' })
    ).toBeVisible(POLL_TIMEOUT);
    await creator.page.getByRole('button', { name: 'End My Turn' }).click();

    // Now it's Alice's turn — Creator (as leader) sees "Skip Turn" button
    await expect(creator.page.getByText("It's Alice's turn")).toBeVisible(
      POLL_TIMEOUT
    );
    await expect(
      creator.page.getByRole('button', { name: 'Skip Turn' })
    ).toBeVisible();

    // Creator clicks "Skip Turn"
    await creator.page.getByRole('button', { name: 'Skip Turn' }).click();

    // Turn comes back to Creator
    await expect(creator.page.getByText("It's your turn!")).toBeVisible(
      POLL_TIMEOUT
    );

    await creator.context.close();
  });

  test('non-active user cannot move tasks (API returns 403)', async ({
    request,
  }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    // Turn is on creator — Alice tries to move a task
    const data = await getSessionViaAPI(request, roomCode);
    const task = data.tasks[0];

    const response = await request.put(
      `${API_URL}/sessions/${roomCode}/tasks/${task.id}`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { columnId: 'some-column', assignedBy: alice.userId },
      }
    );

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('not your turn');

    // But the current turn user CAN move tasks
    const creatorResponse = await request.put(
      `${API_URL}/sessions/${roomCode}/tasks/${task.id}`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { columnId: 'some-column', assignedBy: creatorId },
      }
    );
    expect(creatorResponse.status()).toBe(200);
  });

  test('stack mode: toggle on, verify dimming, skip task, toggle off', async ({
    browser,
    request,
  }) => {
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    // Verify stack mode checkbox exists and is unchecked
    const stackCheckbox = creator.page.getByLabel(
      'Stack mode (one task at a time)'
    );
    await expect(stackCheckbox).toBeVisible(POLL_TIMEOUT);
    await expect(stackCheckbox).not.toBeChecked();

    // No tasks should be dimmed initially
    await expect(creator.page.locator('.opacity-40')).toHaveCount(0);

    // Enable stack mode
    await stackCheckbox.click();

    // Wait for stack mode to take effect — dimmed tasks should appear
    await expect(creator.page.locator('.opacity-40').first()).toBeVisible(
      POLL_TIMEOUT
    );

    // Count: there should be exactly 5 dimmed tasks (6 total - 1 top)
    const dimmedCount = await creator.page.locator('.opacity-40').count();
    expect(dimmedCount).toBe(5);

    // "Skip Task" button should be visible (stack mode + my turn)
    await expect(
      creator.page.getByRole('button', { name: 'Skip Task' })
    ).toBeVisible();

    // Get the text of the current top task
    const firstTaskText = await creator.page
      .locator('.cursor-grab .text-sm.font-medium')
      .first()
      .textContent();

    // Click Skip Task
    await creator.page.getByRole('button', { name: 'Skip Task' }).click();

    // Wait for the top task to change (poll cycle)
    await expect(async () => {
      const newTopText = await creator.page
        .locator('.cursor-grab .text-sm.font-medium')
        .first()
        .textContent();
      expect(newTopText).not.toBe(firstTaskText);
    }).toPass({ timeout: 5000 });

    // Disable stack mode
    await stackCheckbox.click();

    // All tasks should be interactive again (no dimmed)
    await expect(creator.page.locator('.opacity-40')).toHaveCount(0, {
      timeout: 10000,
    });

    // Skip Task button should be gone
    await expect(
      creator.page.getByRole('button', { name: 'Skip Task' })
    ).not.toBeVisible();

    await creator.context.close();
  });

  test('timer resets when turn advances', async ({ browser, request }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    // Timer hourglass should be visible on the banner
    await expect(creator.page.locator('.hourglass-pulse')).toBeVisible(
      POLL_TIMEOUT
    );

    // Wait so the timer accumulates some seconds
    await creator.page.waitForTimeout(3000);

    // End turn
    await creator.page.getByRole('button', { name: 'End My Turn' }).click();

    // Wait for turn to advance
    await expect(creator.page.getByText("It's Alice's turn")).toBeVisible(
      POLL_TIMEOUT
    );

    // Timer should still be visible (now for Alice's turn) and reset to low value
    await expect(creator.page.locator('.hourglass-pulse')).toBeVisible(
      POLL_TIMEOUT
    );

    // The timer text should contain a low value like 0:0x
    await expect(async () => {
      const timerParent = creator.page
        .locator('.hourglass-pulse')
        .locator('..');
      const text = await timerParent.textContent();
      const match = text.match(/(\d+):(\d{2})/);
      expect(match).toBeTruthy();
      const totalSeconds = parseInt(match[1]) * 60 + parseInt(match[2]);
      expect(totalSeconds).toBeLessThan(10);
    }).toPass(POLL_TIMEOUT);

    await creator.context.close();
  });

  test('participant list shows current turn indicator and whose turn dropdown', async ({
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

    // Wait for participants to load
    await expect(creator.page.getByText('Participants (2):')).toBeVisible(
      POLL_TIMEOUT
    );

    // Click "whose turn?" to open the turn list
    await creator.page.getByText('whose turn?').click();

    // Should show "(current turn)" indicator next to Creator
    await expect(creator.page.getByText('(current turn)')).toBeVisible();

    // Close the dropdown
    await creator.page.getByText('hide turns').click();

    // End turn to advance to Alice
    await creator.page.getByRole('button', { name: 'End My Turn' }).click();

    // Wait for turn to advance
    await expect(creator.page.getByText("It's Alice's turn")).toBeVisible(
      POLL_TIMEOUT
    );

    // Open turn list again — "(current turn)" should now be next to Alice
    await creator.page.getByText('whose turn?').click();
    await expect(creator.page.getByText('(current turn)')).toBeVisible();

    await creator.context.close();
  });

  test('skipped participants are excluded from turn rotation', async ({
    browser,
    request,
  }) => {
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');
    const bob = await joinSessionViaAPI(request, roomCode, 'Bob');

    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    // Wait for all 3 participants to show
    await expect(creator.page.getByText('Participants (3):')).toBeVisible(
      POLL_TIMEOUT
    );

    // Skip Alice via API
    await updateSessionViaAPI(request, roomCode, {
      skipped_participants: [alice.userId],
    });

    // End Creator's turn
    await creator.page.getByRole('button', { name: 'End My Turn' }).click();

    // Should skip Alice and go directly to Bob
    await expect(creator.page.getByText("It's Bob's turn")).toBeVisible(
      POLL_TIMEOUT
    );

    // Verify via API that Alice was indeed skipped
    const data = await getSessionViaAPI(request, roomCode);
    expect(data.session.current_turn_user_id).toBe(bob.userId);

    await creator.context.close();
  });

  test('full workflow: two users take turns with stack mode', async ({
    browser,
    request,
  }) => {
    // Join Alice via API
    const alice = await joinSessionViaAPI(request, roomCode, 'Alice');

    // Open browsers with correct identities
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

    // --- Step 1: Verify initial state ---
    await expect(creator.page.getByText("It's your turn!")).toBeVisible(
      POLL_TIMEOUT
    );
    await expect(alicePage.page.getByText("It's Creator's turn")).toBeVisible(
      POLL_TIMEOUT
    );

    // Both see sample tasks
    await expect(creator.page.getByText('PROJ-123')).toBeVisible(POLL_TIMEOUT);
    await expect(alicePage.page.getByText('PROJ-123')).toBeVisible(
      POLL_TIMEOUT
    );

    // --- Step 2: Creator enables stack mode ---
    const stackCheckbox = creator.page.getByLabel(
      'Stack mode (one task at a time)'
    );
    await stackCheckbox.click();

    // Dimmed tasks appear on creator's view
    await expect(creator.page.locator('.opacity-40').first()).toBeVisible(
      POLL_TIMEOUT
    );

    // Alice also sees dimmed tasks after poll
    await expect(alicePage.page.locator('.opacity-40').first()).toBeVisible(
      POLL_TIMEOUT
    );

    // --- Step 3: Creator skips the top task ---
    await creator.page.getByRole('button', { name: 'Skip Task' }).click();

    // Wait for task order to update via poll
    await creator.page.waitForTimeout(2500);

    // --- Step 4: Creator ends turn ---
    await creator.page.getByRole('button', { name: 'End My Turn' }).click();

    // Alice now has the turn
    await expect(alicePage.page.getByText("It's your turn!")).toBeVisible(
      POLL_TIMEOUT
    );

    // Alice sees "End My Turn"
    await expect(
      alicePage.page.getByRole('button', { name: 'End My Turn' })
    ).toBeVisible();

    // Alice also sees "Skip Task" (stack mode is still on)
    await expect(
      alicePage.page.getByRole('button', { name: 'Skip Task' })
    ).toBeVisible();

    // --- Step 5: Alice ends turn, back to Creator ---
    await alicePage.page.getByRole('button', { name: 'End My Turn' }).click();

    await expect(creator.page.getByText("It's your turn!")).toBeVisible(
      POLL_TIMEOUT
    );

    // --- Step 6: Creator disables stack mode ---
    await stackCheckbox.click();

    // No more dimmed tasks
    await expect(creator.page.locator('.opacity-40')).toHaveCount(0, {
      timeout: 10000,
    });

    await creator.context.close();
    await alicePage.context.close();
  });
});
