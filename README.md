# Relative Pointing App

A collaborative web application for Scrum teams to perform relative story pointing using a drag-and-drop interface with turn-based facilitation.

## Features

- **Session-based Collaboration** — Create sessions with shareable room codes
- **Turn-based Facilitation** — Structured turn rotation so one person points at a time
- **Stack Mode** — Focus on one task at a time; skip tasks to reorder the backlog
- **Session Lifecycle** — Creator starts the session when all participants have joined, then ends it to generate a report
- **CSV Import** — Upload Jira task exports (or create tasks manually)
- **Drag-and-drop Columns** — Create complexity columns by dragging tasks into gaps between existing columns
- **Tags and Comments** — Label tasks with color-coded tags; add comments for discussion
- **Column Point Values** — Assign numeric point values to columns and apply scale presets (Fibonacci, T-shirt, etc.)
- **Session Reports** — View a summary of pointed tasks after ending a session
- **Participant Management** — Skip/unskip participants, auto-transfer ownership if creator goes offline
- **Dark Mode** — Light and dark themes with system preference detection
- **Presence Detection** — Auto-skip turns for offline participants, auto-transfer session ownership

## Tech Stack

| Layer     | Technology                 | Purpose                     |
| --------- | -------------------------- | --------------------------- |
| Frontend  | Vue 3 (Composition API)    | UI framework                |
| State     | Pinia                      | Reactive stores             |
| Drag-Drop | vuedraggable (Sortable.js) | Task/column reordering      |
| Styling   | Tailwind CSS               | Utility-first CSS           |
| Build     | Vite                       | Dev server and bundler      |
| Backend   | Express.js                 | REST API with rate limiting |
| Realtime  | Socket.io                  | WebSocket connections       |
| Database  | SQLite                     | File-based persistence      |
| CSV       | PapaParse                  | CSV file parsing            |
| Testing   | Playwright                 | End-to-end tests            |

## Project Structure

```
relative-pointing/
├── package.json            ← Root (npm workspaces)
├── client/                 ← Vue 3 frontend
│   ├── src/
│   │   ├── components/     ← Vue components
│   │   │   ├── SessionCreator.vue
│   │   │   ├── TaskBoard.vue
│   │   │   ├── ParticipantList.vue
│   │   │   ├── Column.vue
│   │   │   ├── TaskItem.vue
│   │   │   ├── CreateTaskModal.vue
│   │   │   ├── CsvImportModal.vue
│   │   │   ├── TaskActionModal.vue
│   │   │   ├── TaskInfoModal.vue
│   │   │   ├── SessionReport.vue
│   │   │   ├── SandTimer.vue
│   │   │   ├── TurnTimer.vue
│   │   │   └── ...
│   │   ├── stores/         ← Pinia stores
│   │   │   ├── session.js  ← Session state, polling, actions
│   │   │   ├── user.js     ← User identity (localStorage)
│   │   │   └── theme.js    ← Dark mode
│   │   ├── services/
│   │   │   └── api.js      ← REST API client
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── server.js           ← Express app + Socket.io
│   ├── db.js               ← SQLite init, migrations, presence checker
│   ├── schema.sql          ← Database schema
│   └── routes/
│       ├── sessions.js     ← Session, column, turn, and lifecycle endpoints
│       ├── tasks.js        ← Task CRUD and movement
│       ├── tags.js         ← Tag management
│       └── comments.js     ← Task comments
├── e2e/                    ← Playwright tests (13 spec files)
│   ├── helpers/
│   └── *.spec.js
├── sample-tasks.csv        ← Sample CSV for testing
├── run                     ← Quick-start script
├── deploy.sh               ← EC2 deployment script
└── deploy-remote.sh        ← Remote deployment via SCP
```

## Quick Start

### Prerequisites

- Node.js 18+

### Run the App

```bash
# Option 1: Quick-start script
./run

# Option 2: npm dev command
npm install
npm run dev
```

This starts:

- Backend on **http://localhost:5001** (Express API + Socket.io)
- Frontend on **http://localhost:3000** (Vite dev server)

### Using the App

1. **Create a Session** — Enter your name and click "Create Session"
2. **Share the Room Code** — Copy and share the generated code (e.g., `friendly-tiger`)
3. **Others Join** — They enter the room code and their name
4. **Enable Participants** — The creator (host) is auto-skipped; enable participants for the turn rotation
5. **Start Session** — Creator clicks "Start Session" to begin turn-based pointing
6. **Point Stories** — Upload a CSV or create tasks manually, then drag tasks into complexity columns on your turn
7. **End Session** — Creator clicks "End Session" to generate a report

## Session Lifecycle

```
Created → Participants join → Creator clicks "Start Session"
  → Turns begin (round-robin) → Creator clicks "End Session"
  → Report generated
```

- The **creator is auto-skipped** from the turn rotation on session creation. Enable them in the participant list if they should also take turns.
- **Stack mode** (on by default) highlights the top unsorted task and restricts dragging to only that task.
- When the session starts, the top unsorted task automatically moves to the center column.
- Only the **current turn user** can drag tasks. Others can view but not move.
- The creator (session leader) can **skip another user's turn** or **skip the top task** in stack mode.

## API Endpoints

Base URL: `http://localhost:5001/api`

### Sessions

| Method  | Path                                     | Description                                                          |
| ------- | ---------------------------------------- | -------------------------------------------------------------------- |
| `POST`  | `/sessions`                              | Create new session                                                   |
| `GET`   | `/sessions/:roomCode`                    | Get session with participants, tasks, columns                        |
| `PATCH` | `/sessions/:roomCode`                    | Update session settings (Jira URL, skipped participants, stack mode) |
| `POST`  | `/sessions/:roomCode/join`               | Join existing session                                                |
| `POST`  | `/sessions/:roomCode/start`              | Start session (creator only)                                         |
| `POST`  | `/sessions/:roomCode/end`                | End session (creator only)                                           |
| `POST`  | `/sessions/:roomCode/end-turn`           | End current turn                                                     |
| `POST`  | `/sessions/:roomCode/transfer-ownership` | Transfer session ownership                                           |
| `GET`   | `/sessions/:roomCode/report`             | Get session report                                                   |

### Tasks

| Method   | Path                                    | Description               |
| -------- | --------------------------------------- | ------------------------- |
| `POST`   | `/sessions/:roomCode/tasks`             | Upload tasks (CSV import) |
| `POST`   | `/sessions/:roomCode/tasks/create-task` | Create single task        |
| `PUT`    | `/sessions/:roomCode/tasks/:taskId`     | Move task to column       |
| `DELETE` | `/sessions/:roomCode/tasks/:taskId`     | Delete task               |
| `PATCH`  | `/sessions/:roomCode/tasks/:taskId/tag` | Update task tag           |
| `POST`   | `/sessions/:roomCode/tasks/skip-top`    | Skip top unsorted task    |

### Columns

| Method   | Path                                                | Description                       |
| -------- | --------------------------------------------------- | --------------------------------- |
| `POST`   | `/sessions/:roomCode/columns`                       | Create column                     |
| `DELETE` | `/sessions/:roomCode/columns/:columnId`             | Delete column                     |
| `PATCH`  | `/sessions/:roomCode/columns/:columnId/point-value` | Set column point value            |
| `POST`   | `/sessions/:roomCode/columns/apply-scale`           | Apply scale preset to all columns |

### Tags

| Method   | Path                              | Description      |
| -------- | --------------------------------- | ---------------- |
| `GET`    | `/sessions/:roomCode/tags`        | Get session tags |
| `POST`   | `/sessions/:roomCode/tags`        | Create tag       |
| `DELETE` | `/sessions/:roomCode/tags/:tagId` | Delete tag       |

### Comments

| Method | Path                                         | Description       |
| ------ | -------------------------------------------- | ----------------- |
| `GET`  | `/sessions/:roomCode/tasks/:taskId/comments` | Get task comments |
| `POST` | `/sessions/:roomCode/tasks/:taskId/comments` | Add comment       |

### Health

| Method | Path          | Description          |
| ------ | ------------- | -------------------- |
| `GET`  | `/api/health` | Backend health check |

## Development

### Commands

```bash
npm run dev              # Start backend + frontend (concurrently)
npm run dev:client       # Just frontend (Vite on port 3000)
npm run dev:server       # Just backend (Express on port 5001)
npm run build            # Build frontend for production
npm start                # Production mode (serves built frontend)
npm test                 # Build + run Playwright e2e tests
npm run test:e2e         # Run Playwright tests only
npm run test:e2e:ui      # Run Playwright tests with UI
npm run lint             # Check formatting (Prettier)
npm run format           # Auto-format code (Prettier)
```

### Testing Multi-User Locally

1. **Tab 1**: Create a session and note the room code
2. **Tab 2**: Open in incognito/private mode, join with the same room code but a different name
3. Both tabs show both participants in the participant list
4. Enable participants and start the session to test turn rotation

### E2E Tests

The project has 13 Playwright spec files covering:

- Session creation, joining, and shared links
- CSV import
- Task and column management
- Tag management
- Multi-user sessions and task sync
- Turn-based features (rotation, skip turn, stack mode)
- Session start/end lifecycle
- Presence detection and ownership transfer
- Unique ID isolation

### Environment Variables

```bash
# Frontend (client/.env)
VITE_API_URL=http://localhost:5001/api

# Server (auto-configured)
PORT=5001                    # Backend port
OFFLINE_THRESHOLD_S=15       # Seconds before participant marked offline
AUTO_SKIP_TURN_S=30          # Seconds before auto-skipping offline turn holder
AUTO_TRANSFER_OWNER_S=60     # Seconds before auto-transferring ownership
```

## Database

- SQLite database at `server/app.db`
- Created automatically on first run with migrations
- Sessions auto-expire after 15 minutes of inactivity
- Delete `server/app.db` and restart to reset all data

### Schema

```sql
sessions    — id, room_code, creator_id, creator_name, jira_base_url,
              skipped_participants, current_turn_user_id, turn_started_at,
              stack_mode, started_at, ended_at, created_at, last_activity_at

participants — id, session_id, user_id, user_name, joined_at, last_seen_at

tasks       — id, session_id, jira_key, title, description, issue_type,
              status, priority, column_id, assigned_by, assigned_at,
              task_order, metadata, color_tag, tag_id

columns     — id, session_id, name, column_order, created_by, point_value, created_at

tags        — id, session_id, name, color, is_builtin, created_by, created_at

comments    — id, task_id, session_id, user_id, user_name, content, created_at
```

## Deployment

Deploy to AWS EC2 with one command:

```bash
cp .env.example .env
# Edit .env with your EC2 details
./deploy-remote.sh
```

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the complete deployment guide covering EC2 setup, nginx, SSL, and systemd configuration.

## License

MIT
