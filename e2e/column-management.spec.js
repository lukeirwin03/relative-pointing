const { test, expect } = require('@playwright/test');
const {
  generateUUID,
  createSessionViaAPI,
  createColumnViaAPI,
  moveTaskViaAPI,
  getSessionViaAPI,
  createAuthenticatedUserInSession,
  API_URL,
  POLL_TIMEOUT,
} = require('./helpers/test-helpers');

test.describe('Column Management', () => {
  let roomCode;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
  });

  test('columns created via API render in correct left-to-right order', async ({
    browser,
    request,
  }) => {
    // Use unique column IDs (columns.id is globally unique PK)
    const colSmall = `col-small-${generateUUID().slice(0, 8)}`;
    const colMedium = `col-medium-${generateUUID().slice(0, 8)}`;
    const colLarge = `col-large-${generateUUID().slice(0, 8)}`;

    await createColumnViaAPI(request, roomCode, colSmall, 'Small', 1);
    await createColumnViaAPI(request, roomCode, colMedium, 'Medium', 2);
    await createColumnViaAPI(request, roomCode, colLarge, 'Large', 3);

    // Get tasks and move one into each column
    const data = await getSessionViaAPI(request, roomCode);
    const tasks = data.tasks;
    await moveTaskViaAPI(request, roomCode, tasks[0].id, colSmall, 'system');
    await moveTaskViaAPI(request, roomCode, tasks[1].id, colMedium, 'system');
    await moveTaskViaAPI(request, roomCode, tasks[2].id, colLarge, 'system');

    const user = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Viewer'
    );

    // Wait for all three tasks to be visible in their columns
    await expect(user.page.getByText('PROJ-123').first()).toBeVisible(
      POLL_TIMEOUT
    );
    await expect(user.page.getByText('PROJ-124').first()).toBeVisible(
      POLL_TIMEOUT
    );
    await expect(user.page.getByText('PROJ-125').first()).toBeVisible(
      POLL_TIMEOUT
    );

    // Verify left-to-right order by comparing x positions of the task cards
    const proj123Box = await user.page
      .getByText('PROJ-123')
      .first()
      .boundingBox();
    const proj124Box = await user.page
      .getByText('PROJ-124')
      .first()
      .boundingBox();
    const proj125Box = await user.page
      .getByText('PROJ-125')
      .first()
      .boundingBox();

    expect(proj123Box.x).toBeLessThan(proj124Box.x);
    expect(proj124Box.x).toBeLessThan(proj125Box.x);

    await user.context.close();
  });

  test('between-column ordering produces correct intermediate column_order value', async ({
    request,
  }) => {
    const colLeft = `col-left-${generateUUID().slice(0, 8)}`;
    const colRight = `col-right-${generateUUID().slice(0, 8)}`;
    const colBetween = `col-between-${generateUUID().slice(0, 8)}`;

    await createColumnViaAPI(request, roomCode, colLeft, 'Left', 10);
    await createColumnViaAPI(request, roomCode, colRight, 'Right', 20);

    // Create a column between them
    const betweenOrder = (10 + 20) / 2; // 15
    await createColumnViaAPI(
      request,
      roomCode,
      colBetween,
      'Between',
      betweenOrder
    );

    const data = await getSessionViaAPI(request, roomCode);
    const cols = data.columns.sort((a, b) => a.column_order - b.column_order);

    expect(cols).toHaveLength(3);
    expect(cols[0].name).toBe('Left');
    expect(cols[1].name).toBe('Between');
    expect(cols[2].name).toBe('Right');
    expect(cols[1].column_order).toBe(15);
  });

  test('empty columns are auto-deleted when removed via API', async ({
    browser,
    request,
  }) => {
    const colTemp = `col-temp-${generateUUID().slice(0, 8)}`;
    const colDest = `col-dest-${generateUUID().slice(0, 8)}`;

    const c1 = await createColumnViaAPI(
      request,
      roomCode,
      colTemp,
      'Temporary',
      1
    );
    const c2 = await createColumnViaAPI(
      request,
      roomCode,
      colDest,
      'Destination',
      2
    );
    expect(c1.success).toBe(true);
    expect(c2.success).toBe(true);

    const data = await getSessionViaAPI(request, roomCode);
    expect(data.tasks).toBeDefined();
    const task0 = data.tasks[0];
    const task1 = data.tasks[1];

    await moveTaskViaAPI(request, roomCode, task0.id, colTemp, 'system');
    await moveTaskViaAPI(request, roomCode, task1.id, colDest, 'system');

    const user = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Mover'
    );

    // Both tasks visible in their columns
    await expect(user.page.getByText('PROJ-123').first()).toBeVisible(
      POLL_TIMEOUT
    );
    await expect(user.page.getByText('PROJ-124').first()).toBeVisible(
      POLL_TIMEOUT
    );

    // Move task out of temp column, then delete the empty column
    await moveTaskViaAPI(request, roomCode, task0.id, 'unsorted', 'system');
    await request.delete(`${API_URL}/sessions/${roomCode}/columns/${colTemp}`);

    // After poll, PROJ-124 should still be visible
    await expect(user.page.getByText('PROJ-124').first()).toBeVisible(
      POLL_TIMEOUT
    );

    // Verify only one column remains via API
    const updatedData = await getSessionViaAPI(request, roomCode);
    expect(updatedData.columns).toHaveLength(1);
    expect(updatedData.columns[0].id).toBe(colDest);

    await user.context.close();
  });

  test('column appears dynamically when created after page load', async ({
    browser,
    request,
  }) => {
    // Put a task into a column so user sees something initially
    const colInitial = `col-init-${generateUUID().slice(0, 8)}`;
    await createColumnViaAPI(request, roomCode, colInitial, 'Initial', 1);
    const data = await getSessionViaAPI(request, roomCode);
    await moveTaskViaAPI(
      request,
      roomCode,
      data.tasks[0].id,
      colInitial,
      'system'
    );

    const user = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Watcher'
    );
    // PROJ-123 is in the column on the board (not in the Tasks sidebar)
    const boardArea = user.page.locator('.overflow-x-auto');
    await expect(boardArea.getByText('PROJ-123').first()).toBeVisible(
      POLL_TIMEOUT
    );

    // Now create a second column and move a task into it while user is on the page
    const colNew = `col-new-${generateUUID().slice(0, 8)}`;
    await createColumnViaAPI(request, roomCode, colNew, 'NewColumn', 2);
    await moveTaskViaAPI(request, roomCode, data.tasks[1].id, colNew, 'system');

    // After polling, PROJ-124 should appear in the board area
    await expect(boardArea.getByText('PROJ-124').first()).toBeVisible(
      POLL_TIMEOUT
    );

    // Verify 2 columns exist via API
    const updated = await getSessionViaAPI(request, roomCode);
    expect(updated.columns).toHaveLength(2);

    await user.context.close();
  });

  test('column disappears when deleted after page load', async ({
    browser,
    request,
  }) => {
    const colKeep = `col-keep-${generateUUID().slice(0, 8)}`;
    const colRemove = `col-remove-${generateUUID().slice(0, 8)}`;
    await createColumnViaAPI(request, roomCode, colKeep, 'KeepMe', 1);
    await createColumnViaAPI(request, roomCode, colRemove, 'RemoveMe', 2);

    const data = await getSessionViaAPI(request, roomCode);
    await moveTaskViaAPI(
      request,
      roomCode,
      data.tasks[0].id,
      colKeep,
      'system'
    );
    await moveTaskViaAPI(
      request,
      roomCode,
      data.tasks[1].id,
      colRemove,
      'system'
    );

    const user = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Watcher'
    );
    const boardArea = user.page.locator('.overflow-x-auto');
    await expect(boardArea.getByText('PROJ-123').first()).toBeVisible(
      POLL_TIMEOUT
    );
    await expect(boardArea.getByText('PROJ-124').first()).toBeVisible(
      POLL_TIMEOUT
    );

    // Move task out and delete the column
    await moveTaskViaAPI(
      request,
      roomCode,
      data.tasks[1].id,
      'unsorted',
      'system'
    );
    await request.delete(
      `${API_URL}/sessions/${roomCode}/columns/${colRemove}`
    );

    // PROJ-124 should leave the board area (moved back to unsorted sidebar)
    await expect(boardArea.getByText('PROJ-124')).toHaveCount(0, POLL_TIMEOUT);
    // PROJ-123 should still be visible in its column
    await expect(boardArea.getByText('PROJ-123').first()).toBeVisible(
      POLL_TIMEOUT
    );

    // Only 1 column remains
    const updated = await getSessionViaAPI(request, roomCode);
    expect(updated.columns).toHaveLength(1);
    expect(updated.columns[0].id).toBe(colKeep);

    await user.context.close();
  });

  test('full column lifecycle: 0 → 2 → delete 1 → verify 1 remains', async ({
    browser,
    request,
  }) => {
    const user = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Lifecycle'
    );
    const boardArea = user.page.locator('.overflow-x-auto');

    // Start with 0 columns
    const data = await getSessionViaAPI(request, roomCode);
    expect(data.columns).toHaveLength(0);

    // Create two columns and move tasks into them
    const colA = `col-a-${generateUUID().slice(0, 8)}`;
    const colB = `col-b-${generateUUID().slice(0, 8)}`;
    await createColumnViaAPI(request, roomCode, colA, 'ColA', 1);
    await createColumnViaAPI(request, roomCode, colB, 'ColB', 2);
    await moveTaskViaAPI(request, roomCode, data.tasks[0].id, colA, 'system');
    await moveTaskViaAPI(request, roomCode, data.tasks[1].id, colB, 'system');

    // Both tasks should appear in the board area
    await expect(boardArea.getByText('PROJ-123').first()).toBeVisible(
      POLL_TIMEOUT
    );
    await expect(boardArea.getByText('PROJ-124').first()).toBeVisible(
      POLL_TIMEOUT
    );

    // Delete one column (move task back to unsorted first)
    await moveTaskViaAPI(
      request,
      roomCode,
      data.tasks[0].id,
      'unsorted',
      'system'
    );
    await request.delete(`${API_URL}/sessions/${roomCode}/columns/${colA}`);

    // PROJ-123 should leave the board, PROJ-124 should remain
    await expect(boardArea.getByText('PROJ-123')).toHaveCount(0, POLL_TIMEOUT);
    await expect(boardArea.getByText('PROJ-124').first()).toBeVisible(
      POLL_TIMEOUT
    );

    // Verify via API
    const finalData = await getSessionViaAPI(request, roomCode);
    expect(finalData.columns).toHaveLength(1);
    expect(finalData.columns[0].id).toBe(colB);

    await user.context.close();
  });
});
