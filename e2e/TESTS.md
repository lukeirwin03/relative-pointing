# Playwright E2E Test Inventory

> **Total: ~79 tests across 13 spec files**
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

## Session Start (`session-start.spec.js`) — 7 tests

| Test                                                                 | Description                                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| new session has no turns and creator is disabled                     | A freshly created session has no `current_turn_user_id` and creator is in `skipped_participants` |
| start session via API assigns turn to first active participant       | Starting the session sets `started_at` and assigns the turn to the first non-skipped participant |
| start session fails with no active participants                      | Returns 400 when all participants are skipped                                                    |
| start session fails for non-creator                                  | Returns 403 when a non-creator tries to start the session                                        |
| cannot start session twice                                           | Returns 400 if the session is already started                                                    |
| creator sees Start Session button before start and End Session after | UI toggles between Start/End buttons based on session state                                      |
| sand timer does not fall before session starts                       | The sand timer animation is paused until the session is started                                  |

## Shared Link Flow (`shared-link.spec.js`) — 3 tests

| Test                                                                                         | Description                                                                                                       |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| unauthenticated user visiting /session/:roomCode redirects to join page with code pre-filled | Unauthenticated users are redirected to `/?join=roomCode` with the Join tab active and room code input pre-filled |
| user can complete join flow from the redirected page                                         | User can fill in their name on the redirected page and successfully join the session                              |
| authenticated user accesses session directly without redirect                                | Authenticated users (with localStorage credentials) access the session page directly without redirect             |

## Task Management (`task-management.spec.js`) — 3 tests

| Test                               | Description                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| create a task via modal            | Creating a new task via the modal (issue key + title) adds it to the board     |
| delete a task via action modal     | Clicking delete on a task removes it from the board                            |
| create task modal can be cancelled | Clicking "Cancel" in the task creation modal closes it without creating a task |

## Unique Task IDs (`unique-ids.spec.js`) — 3 tests

| Test                                                        | Description                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| API returns unique UUID id and separate display_id per task | Each task has a unique UUID `id` and a separate `display_id` derived from `jira_key` |
| two tasks with same jira_key render as separate cards       | Two tasks created with identical issue keys display as separate cards on the board   |
| deleting one duplicate-key task leaves the other intact     | Deleting one task by UUID leaves another task with the same `jira_key` unaffected    |

## CSV Import (`csv-import.spec.js`) — 10 tests

| Test                                                            | Description                                                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| dropping a valid CSV shows confirmation modal with task preview | Dragging a CSV file onto the board shows a confirmation modal listing tasks |
| confirming import creates the tasks                             | Clicking "Import" adds all selected tasks to the board                      |
| cancelling import does NOT create tasks                         | Clicking "Cancel" closes the modal without adding tasks                     |
| clicking backdrop closes modal without importing                | Clicking outside the modal closes it                                        |
| deselecting tasks excludes them from import                     | Unchecked tasks are not imported                                            |
| import button is disabled when no tasks are selected            | Cannot import with all tasks deselected                                     |
| CSV with empty rows shows skipped rows warning                  | Empty rows in the CSV trigger a warning message                             |
| invalid CSV (missing required columns) shows error, not modal   | CSVs without required columns show an error                                 |
| non-creator does not see import modal on file drop              | Only the session creator can import CSV files                               |
| select all / deselect all toggle works                          | The select/deselect all checkbox works correctly                            |

## Column Management (`column-management.spec.js`) — 6 tests

| Test                                                                     | Description                                                           |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| columns created via API render in correct left-to-right order            | Columns appear left-to-right according to `column_order` values       |
| between-column ordering produces correct intermediate column_order value | Column created between two others gets the correct intermediate order |
| empty columns are auto-deleted when removed via API                      | Deleting an empty column via API removes it from the board            |
| column appears dynamically when created after page load                  | New columns appear without a page refresh                             |
| column disappears when deleted after page load                           | Deleted columns disappear without a page refresh                      |
| full column lifecycle: 0 → 2 → delete 1 → verify 1 remains               | Tests create/delete cycle of columns                                  |

## Tag Management (`tag-management.spec.js`) — 4 tests

| Test                                                         | Description                                   |
| ------------------------------------------------------------ | --------------------------------------------- |
| selecting a tag in modal shows it as selected with checkmark | Tags show a checkmark when selected           |
| selected tag has ring styling to indicate selection          | Selected tags have a visual ring indicator    |
| clearing a tag removes selection indicators                  | Clearing a tag removes the checkmark and ring |
| switching tag updates selection immediately in modal         | Changing tags updates the UI immediately      |

## Multi-User Session Management (`multi-user-session.spec.js`) — 4 tests

| Test                                                        | Description                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| two users join and see each other in participant list       | Both users see correct participant count (creator is auto-skipped)     |
| three users join, all visible in participant count          | All users see correct participant count after three users join         |
| user B joining is reflected on user A page after poll cycle | User A's participant count updates after User B joins                  |
| duplicate username is rejected                              | The API returns 400 with "already taken" error for duplicate usernames |

## Multi-User Task Operations (`multi-user-tasks.spec.js`) — 3 tests

| Test                                                      | Description                                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------------------- |
| task created by User A appears on User B board after poll | A task created by one user appears on all other users' boards after polling |
| task deleted by User A disappears from User B board       | A task deleted by one user disappears from all other users' boards          |
| both users see same sample tasks on initial load          | Multiple users joining the same session see the same set of sample tasks    |

## Turn-Based Features (`turn-based.spec.js`) — 8 tests

| Test                                                                         | Description                                                            |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| full turn rotation: creator clicks End My Turn, banner updates for each user | Turn rotation works correctly with banner updates for all participants |
| leader can skip another user's turn via Skip Turn button                     | The session leader can skip another user's turn                        |
| non-active user cannot move tasks (API returns 403)                          | Only the current turn user can move tasks                              |
| stack mode: toggle on, verify dimming, skip task, toggle off                 | Stack mode highlights top task, allows skipping, and can be toggled    |
| turn advances correctly between users                                        | End My Turn correctly advances to the next user                        |
| participant list shows current turn indicator                                | "Current turn" indicator appears next to the active participant        |
| skipped participants are excluded from turn rotation                         | Skipped participants are bypassed in the turn order                    |
| full workflow: two users take turns with stack mode                          | End-to-end test of multi-user turn-taking with stack mode enabled      |

## Presence & Ownership (`presence-ownership.spec.js`) — 18 tests

| Test                                                         | Description                                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| last_seen_at is updated when polling with userId             | Polling with userId updates the participant's last_seen_at timestamp               |
| participants include last_seen_at in API response            | The API response includes last_seen_at for each participant                        |
| offline user shows grey indicator in participant list        | Participants who haven't polled recently show an offline indicator                 |
| online user does NOT show offline indicator                  | Active participants don't show the offline indicator                               |
| creator can transfer ownership via API                       | Session creator can transfer ownership to another participant                      |
| non-creator cannot transfer ownership                        | Non-creators get a 403 when trying to transfer ownership                           |
| cannot transfer ownership to yourself                        | Self-transfer returns an error                                                     |
| cannot transfer ownership to non-participant                 | Transfer to unknown user returns an error                                          |
| new owner sees creator UI, old owner loses it                | After transfer, the new owner gets creator controls                                |
| owner star indicator shown in participant list               | A star icon marks the session owner                                                |
| transfer button is visible for eligible participants         | Creator sees transfer buttons next to other participants                           |
| disabled user cannot move tasks via API                      | Skipped participants cannot move tasks                                             |
| all participants disabled shows warning banner and null turn | When all participants are skipped, a warning banner appears                        |
| re-enabling a participant restores the turn                  | Un-skipping a participant restores turn rotation                                   |
| turn auto-advances when turn holder goes offline             | Turn advances past offline participants automatically                              |
| turn becomes null when all users go offline                  | Turn is cleared when no online participants remain                                 |
| ownership auto-transfers when creator goes offline           | Ownership transfers to the next eligible participant when the creator goes offline |
| ownership does NOT transfer if creator stays online          | Ownership stays with the creator while they remain online                          |

---

## Test Infrastructure

- **Helper utilities**: `e2e/helpers/test-helpers.js` — shared API helpers (create/join/start session, end turn, skip task, etc.), user context creation, UUID generation
- **Config**: `playwright.config.js` — Chromium only, `fullyParallel: true`, auto-starts frontend (port 3000) and backend (port 5001)
- **Poll timeout**: Cross-user assertions use `{ timeout: 5000 }` to account for the 2-second polling interval
- **Multi-user pattern**: Uses `browser.newContext()` for isolated browser sessions with separate localStorage per user
- **Session start**: Most turn-based and multi-user tests call `startSessionViaAPI()` in `beforeEach` to initialize turns before testing
