# Playwright E2E Test Inventory

> **Total: 27 tests across 8 spec files**
>
> Run with: `npx playwright test`

---

## Session Creation (`session-creation.spec.js`) — 4 tests

| Test                                                        | Description                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| home page loads with create and join tabs                   | Verifies the home page displays the app title and both "Create Session" and "Join Session" tab buttons |
| create session with a name navigates to session page        | Entering a username and clicking "Create New Session" navigates to `/session/:roomCode`                |
| task board renders with sample tasks after session creation | Sample tasks (PROJ-123, PROJ-124) appear on the task board after creating a new session                |
| create session button is disabled without a name            | The "Create New Session" button is disabled when no username is entered                                |

## Join Session (`join-session.spec.js`) — 3 tests

| Test                                               | Description                                                                                                |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| join an existing session via UI                    | User can join an existing session by entering their name and room code, then navigates to the session page |
| shows error on invalid room code                   | An error message appears when attempting to join with a non-existent room code                             |
| join button is disabled without name and room code | The "Join Session" button remains disabled until both name and room code fields are filled                 |

## Task Management (`task-management.spec.js`) — 3 tests

| Test                               | Description                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| create a task via modal            | Creating a new task via the modal (issue key + title) adds it to the board     |
| delete a task                      | Clicking the delete button on a task card removes it from the board            |
| create task modal can be cancelled | Clicking "Cancel" in the task creation modal closes it without creating a task |

## Shared Link Flow (`shared-link.spec.js`) — 3 tests

| Test                                                                                         | Description                                                                                                       |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| unauthenticated user visiting /session/:roomCode redirects to join page with code pre-filled | Unauthenticated users are redirected to `/?join=roomCode` with the Join tab active and room code input pre-filled |
| user can complete join flow from the redirected page                                         | User can fill in their name on the redirected page and successfully join the session                              |
| authenticated user accesses session directly without redirect                                | Authenticated users (with localStorage credentials) access the session page directly without redirect             |

## Unique Task IDs (`unique-ids.spec.js`) — 3 tests

| Test                                                        | Description                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| API returns unique UUID id and separate display_id per task | Each task has a unique UUID `id` and a separate `display_id` derived from `jira_key` |
| two tasks with same jira_key render as separate cards       | Two tasks created with identical issue keys display as separate cards on the board   |
| deleting one duplicate-key task leaves the other intact     | Deleting one task by UUID leaves another task with the same `jira_key` unaffected    |

## Column Management (`column-management.spec.js`) — 3 tests

| Test                                                                     | Description                                                                                                                  |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| columns created via API render in correct left-to-right order            | Columns appear left-to-right on the board according to their `column_order` values                                           |
| between-column ordering produces correct intermediate column_order value | Creating a column between two existing columns produces the correct intermediate `column_order` (e.g., 15 between 10 and 20) |
| empty columns are auto-deleted when removed via API                      | Deleting an empty column via the API removes it from the board; remaining columns and tasks are unaffected                   |

## Multi-User Session Management (`multi-user-session.spec.js`) — 4 tests

| Test                                                        | Description                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| two users join and see each other in participant list       | Both users see "Participants (3):" after joining (creator + 2 users)                        |
| three users join, all visible in participant count          | All users see "Participants (4):" after three users join (creator + 3 users)                |
| user B joining is reflected on user A page after poll cycle | User A's participant count updates from 2 to 3 after User B joins, within the poll interval |
| duplicate username is rejected                              | The API returns 400 with "already taken" error when a duplicate username is used            |

## Multi-User Task Operations (`multi-user-tasks.spec.js`) — 4 tests

| Test                                                      | Description                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| task created by User A appears on User B board after poll | A task created by one user appears on all other users' boards after the polling cycle |
| task deleted by User A disappears from User B board       | A task deleted by one user disappears from all other users' boards after polling      |
| task color changed by User A is visible to User B         | Color tag changes to a task are synchronized across all users' views after polling    |
| both users see same sample tasks on initial load          | Multiple users joining the same session see the same set of sample tasks              |

---

## Test Infrastructure

- **Helper utilities**: `e2e/helpers/test-helpers.js` — shared API helpers, user context creation, UUID generation
- **Config**: `playwright.config.js` — Chromium only, `fullyParallel: true`, auto-starts frontend (port 3000) and backend (port 5001)
- **Poll timeout**: Cross-user assertions use `{ timeout: 5000 }` to account for the 2-second polling interval
- **Multi-user pattern**: Uses `browser.newContext()` for isolated browser sessions with separate localStorage per user
