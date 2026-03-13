const { test, expect } = require('@playwright/test');
const {
  POLL_TIMEOUT,
  createSessionViaAPI,
  createCreatorContext,
  createAuthenticatedUserInSession,
  getSessionViaAPI,
} = require('./helpers/test-helpers');

const VALID_CSV = `Issue Key,Summary,Issue Type,Status,Priority,Description
PROJ-1,Build authentication system,Story,To Do,High,Implement OAuth login
PROJ-2,Design landing page,Story,To Do,Medium,Create responsive design
PROJ-3,Set up database,Task,In Progress,High,Configure PostgreSQL`;

const CSV_WITH_EMPTY_ROWS = `Issue Key,Summary,Issue Type,Status,Priority
PROJ-1,Valid task one,Story,To Do,High
PROJ-2,,Story,To Do,Medium
PROJ-3,Valid task two,Task,To Do,Low
PROJ-4,,Bug,Done,High`;

const INVALID_CSV = `Name,Age,Email
Alice,30,alice@example.com
Bob,25,bob@example.com`;

/**
 * Simulate dropping a CSV file onto the page via DataTransfer events.
 * Uses page.evaluate to dispatch events from within the browser context
 * so that document-level event listeners pick them up correctly.
 */
async function dropCsvOnPage(page, csvContent, fileName = 'tasks.csv') {
  await page.evaluate(
    ({ content, name }) => {
      const file = new File([content], name, { type: 'text/csv' });
      const dt = new DataTransfer();
      dt.items.add(file);

      // Dispatch dragover to activate the drop zone overlay
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      document.dispatchEvent(dragOverEvent);

      // Dispatch drop after a brief tick
      setTimeout(() => {
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
        });
        document.dispatchEvent(dropEvent);
      }, 100);
    },
    { content: csvContent, name: fileName }
  );

  // Wait for the drop event to be processed
  await page.waitForTimeout(500);
}

test.describe('CSV Import Confirmation Dialog', () => {
  let roomCode;
  let creatorId;

  test.beforeEach(async ({ request }) => {
    const session = await createSessionViaAPI(request, 'Creator');
    roomCode = session.roomCode;
    creatorId = session.creatorId;
  });

  test('dropping a valid CSV shows confirmation modal with task preview', async ({
    browser,
    request,
  }) => {
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    await dropCsvOnPage(creator.page, VALID_CSV);

    // Modal should appear
    const modal = creator.page.locator('.fixed.inset-0.bg-black');
    await expect(modal).toBeVisible(POLL_TIMEOUT);
    await expect(modal.getByText('Import Tasks')).toBeVisible();

    // File name badge
    await expect(modal.getByText('tasks.csv')).toBeVisible();

    // All 3 tasks should be listed in the table
    const table = modal.locator('table');
    await expect(table.getByText('PROJ-1', { exact: true })).toBeVisible();
    await expect(table.getByText('PROJ-2', { exact: true })).toBeVisible();
    await expect(table.getByText('PROJ-3', { exact: true })).toBeVisible();

    // Task titles
    await expect(table.getByText('Build authentication system')).toBeVisible();
    await expect(table.getByText('Design landing page')).toBeVisible();
    await expect(table.getByText('Set up database')).toBeVisible();

    // Footer shows correct count
    await expect(modal.getByText('3 of 3 tasks selected')).toBeVisible();

    // Import button shows count
    await expect(
      modal.getByRole('button', { name: 'Import 3 Tasks' })
    ).toBeVisible();

    await creator.context.close();
  });

  test('confirming import creates the tasks', async ({ browser, request }) => {
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    await dropCsvOnPage(creator.page, VALID_CSV);

    // Wait for modal
    const modal = creator.page.locator('.fixed.inset-0.bg-black');
    await expect(modal).toBeVisible(POLL_TIMEOUT);

    // Click Import
    await modal.getByRole('button', { name: 'Import 3 Tasks' }).click();

    // Modal should close
    await expect(modal).not.toBeVisible(POLL_TIMEOUT);

    // Verify tasks were created via API
    const data = await getSessionViaAPI(request, roomCode);
    const importedTasks = data.tasks.filter((t) =>
      ['PROJ-1', 'PROJ-2', 'PROJ-3'].includes(t.jira_key)
    );
    expect(importedTasks.length).toBe(3);

    await creator.context.close();
  });

  test('cancelling import does NOT create tasks', async ({
    browser,
    request,
  }) => {
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    // Count existing tasks before
    const before = await getSessionViaAPI(request, roomCode);
    const taskCountBefore = before.tasks.length;

    await dropCsvOnPage(creator.page, VALID_CSV);

    // Wait for modal
    const modal = creator.page.locator('.fixed.inset-0.bg-black');
    await expect(modal).toBeVisible(POLL_TIMEOUT);

    // Click Cancel
    await modal.getByRole('button', { name: 'Cancel' }).click();

    // Modal should close
    await expect(modal).not.toBeVisible();

    // Verify no new tasks were created
    const after = await getSessionViaAPI(request, roomCode);
    expect(after.tasks.length).toBe(taskCountBefore);

    await creator.context.close();
  });

  test('clicking backdrop closes modal without importing', async ({
    browser,
    request,
  }) => {
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    const before = await getSessionViaAPI(request, roomCode);
    const taskCountBefore = before.tasks.length;

    await dropCsvOnPage(creator.page, VALID_CSV);

    const modal = creator.page.locator('.fixed.inset-0.bg-black');
    await expect(modal).toBeVisible(POLL_TIMEOUT);

    // Click the backdrop (the fixed overlay behind the modal)
    await modal.click({ position: { x: 10, y: 10 } });

    await expect(modal).not.toBeVisible();

    const after = await getSessionViaAPI(request, roomCode);
    expect(after.tasks.length).toBe(taskCountBefore);

    await creator.context.close();
  });

  test('deselecting tasks excludes them from import', async ({
    browser,
    request,
  }) => {
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    await dropCsvOnPage(creator.page, VALID_CSV);

    const modal = creator.page.locator('.fixed.inset-0.bg-black');
    await expect(modal).toBeVisible(POLL_TIMEOUT);

    // Uncheck the second task (PROJ-2 row)
    const checkboxes = modal.locator('table tbody input[type="checkbox"]');
    await checkboxes.nth(1).uncheck();

    // Footer count should update
    await expect(modal.getByText('2 of 3 tasks selected')).toBeVisible();

    // Import button updates
    await expect(
      modal.getByRole('button', { name: 'Import 2 Tasks' })
    ).toBeVisible();

    // Click Import
    await modal.getByRole('button', { name: 'Import 2 Tasks' }).click();

    // Verify only 2 imported tasks
    const data = await getSessionViaAPI(request, roomCode);
    const imported = data.tasks.filter((t) =>
      ['PROJ-1', 'PROJ-2', 'PROJ-3'].includes(t.jira_key)
    );
    expect(imported.length).toBe(2);

    // PROJ-2 should NOT be present
    const proj2 = data.tasks.find((t) => t.jira_key === 'PROJ-2');
    expect(proj2).toBeUndefined();

    await creator.context.close();
  });

  test('import button is disabled when no tasks are selected', async ({
    browser,
  }) => {
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    await dropCsvOnPage(creator.page, VALID_CSV);

    const modal = creator.page.locator('.fixed.inset-0.bg-black');
    await expect(modal).toBeVisible(POLL_TIMEOUT);

    // Uncheck all via the header checkbox
    const headerCheckbox = modal.locator('table thead input[type="checkbox"]');
    await headerCheckbox.uncheck();

    // Footer should show 0 selected
    await expect(modal.getByText('0 of 3 tasks selected')).toBeVisible();

    // Import button should be disabled
    const importBtn = modal.getByRole('button', {
      name: 'Import 0 Tasks',
    });
    await expect(importBtn).toBeDisabled();

    await creator.context.close();
  });

  test('CSV with empty rows shows skipped rows warning', async ({
    browser,
  }) => {
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    await dropCsvOnPage(creator.page, CSV_WITH_EMPTY_ROWS);

    const modal = creator.page.locator('.fixed.inset-0.bg-black');
    await expect(modal).toBeVisible(POLL_TIMEOUT);

    // Warning about skipped rows
    await expect(
      modal.getByText('2 rows were skipped due to missing data')
    ).toBeVisible();

    // Only 2 valid tasks shown
    await expect(modal.getByText('2 of 2 tasks selected')).toBeVisible();

    await creator.context.close();
  });

  test('invalid CSV (missing required columns) shows error, not modal', async ({
    browser,
  }) => {
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    await dropCsvOnPage(creator.page, INVALID_CSV);

    // Modal should NOT appear
    await expect(creator.page.getByText('Import Tasks')).not.toBeVisible();

    // Error toast should appear
    await expect(
      creator.page.getByText(
        'CSV must contain task ID and title columns (Jira or Linear format)'
      )
    ).toBeVisible(POLL_TIMEOUT);

    await creator.context.close();
  });

  test('non-creator does not see import modal on file drop', async ({
    browser,
    request,
  }) => {
    const alice = await createAuthenticatedUserInSession(
      browser,
      request,
      roomCode,
      'Alice'
    );

    // Try to drop a CSV as non-creator
    await dropCsvOnPage(alice.page, VALID_CSV);

    // Modal should NOT appear (drag events not registered for non-creators)
    await alice.page.waitForTimeout(1000);
    await expect(alice.page.getByText('Import Tasks')).not.toBeVisible();

    await alice.context.close();
  });

  test('select all / deselect all toggle works', async ({ browser }) => {
    const creator = await createCreatorContext(
      browser,
      roomCode,
      creatorId,
      'Creator'
    );

    await dropCsvOnPage(creator.page, VALID_CSV);

    const modal = creator.page.locator('.fixed.inset-0.bg-black');
    await expect(modal).toBeVisible(POLL_TIMEOUT);

    const headerCheckbox = modal.locator('table thead input[type="checkbox"]');
    const bodyCheckboxes = modal.locator('table tbody input[type="checkbox"]');

    // All should be checked initially
    await expect(modal.getByText('3 of 3 tasks selected')).toBeVisible();

    // Deselect all
    await headerCheckbox.uncheck();
    await expect(modal.getByText('0 of 3 tasks selected')).toBeVisible();
    for (let i = 0; i < 3; i++) {
      await expect(bodyCheckboxes.nth(i)).not.toBeChecked();
    }

    // Select all again
    await headerCheckbox.check();
    await expect(modal.getByText('3 of 3 tasks selected')).toBeVisible();
    for (let i = 0; i < 3; i++) {
      await expect(bodyCheckboxes.nth(i)).toBeChecked();
    }

    await creator.context.close();
  });
});
