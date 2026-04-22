# Relative Pointing App

A collaborative web application for Scrum teams to perform relative story pointing using a drag-and-drop interface with turn-based facilitation.

## Features

- **Session-based Collaboration** — Create sessions with shareable room codes
- **Turn-based Facilitation** — Structured turn rotation so one person points at a time
- **Stack Mode** — Focus on one task at a time; skip tasks to reorder the backlog
- **Session Lifecycle** — Creator starts the session when all participants have joined, ends it to generate a report, and clicks "Finish & Discard" on the report to permanently delete all session data
- **Ephemeral by Design** — Session data (tasks, comments, point assignments) is deleted when the creator clicks "Finish & Discard" or automatically after 15 minutes of inactivity — nothing persists indefinitely
- **CSV Import** — Upload Jira task exports (or create tasks manually)
- **Drag-and-drop Columns** — Create complexity columns by dragging tasks into gaps between existing columns
- **Tags and Comments** — Label tasks with color-coded tags; add comments for discussion
- **Column Point Values** — Assign numeric point values to columns and apply scale presets (Fibonacci, T-shirt, etc.)
- **Session Reports** — View a summary of pointed tasks after ending a session
- **Participant Management** — Skip/unskip participants, auto-transfer ownership if creator goes offline
- **Dark Mode** — Light and dark themes with system preference detection
- **Presence Detection** — Auto-skip turns for offline participants, auto-transfer session ownership

## Tech Stack

| Layer     | Technology                 | Purpose                                                         |
| --------- | -------------------------- | --------------------------------------------------------------- |
| Frontend  | Vue 3 (Composition API)    | UI framework                                                    |
| Router    | vue-router                 | Client-side routing                                             |
| State     | Pinia                      | Reactive stores                                                 |
| Drag-Drop | vuedraggable (Sortable.js) | Task/column reordering                                          |
| Styling   | Tailwind CSS               | Utility-first CSS                                               |
| Build     | Vite                       | Dev server and bundler                                          |
| Backend   | Express.js                 | REST API with rate limiting                                     |
| Sync      | HTTP polling (~2s)         | Multi-user sync (no WebSockets)                                 |
| Database  | SQLite (via `sqlite3`)     | In-process store; backed by tmpfs in container (no disk writes) |
| CSV       | PapaParse                  | CSV file parsing                                                |
| Testing   | Playwright                 | End-to-end tests                                                |
| Container | Docker + compose           | Reproducible build; read-only FS, non-root, tmpfs for DB        |

## Project Structure

```
relative-pointing/
├── package.json            ← Root (npm workspaces)
├── Dockerfile              ← Multi-stage build (builder → hardened runtime)
├── docker-compose.yml      ← Local/ECS-friendly runtime with tmpfs DB
├── .dockerignore
├── client/                 ← Vue 3 frontend
│   ├── src/
│   │   ├── components/     ← Vue components
│   │   │   ├── SessionCreator.vue
│   │   │   ├── TaskBoard.vue
│   │   │   ├── ParticipantList.vue
│   │   │   ├── Column.vue
│   │   │   ├── CreateColumnDropZone.vue
│   │   │   ├── DropZoneOverlay.vue
│   │   │   ├── TaskItem.vue
│   │   │   ├── CreateTaskModal.vue
│   │   │   ├── CsvImportModal.vue
│   │   │   ├── TaskActionModal.vue
│   │   │   ├── TaskInfoModal.vue
│   │   │   ├── SessionReport.vue
│   │   │   ├── SandTimer.vue
│   │   │   ├── TurnTimer.vue
│   │   │   ├── Snowflakes.vue
│   │   │   ├── Version.vue
│   │   │   ├── taskColors.js
│   │   │   └── taskTags.js
│   │   ├── router/
│   │   │   └── index.js    ← Routes and auth-redirect guard
│   │   ├── stores/         ← Pinia stores
│   │   │   ├── session.js  ← Session state, polling, actions
│   │   │   ├── user.js     ← User identity (localStorage)
│   │   │   └── theme.js    ← Dark mode
│   │   ├── services/
│   │   │   └── api.js      ← REST API client
│   │   ├── utils/          ← CSV parser, room code gen, Jira URL builder
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── package.json
│   └── vite.config.js      ← Proxies /api to VITE_PROXY_TARGET (defaults to :5001)
├── server/
│   ├── server.js           ← Express app (HTTP only — no WebSockets)
│   ├── db.js               ← SQLite init, migrations, presence checker
│   ├── schema.sql          ← Database schema
│   ├── routes/
│   │   ├── sessions.js     ← Session, column, turn, and lifecycle endpoints
│   │   ├── tasks.js        ← Task CRUD and movement
│   │   ├── tags.js         ← Tag management
│   │   └── comments.js     ← Task comments
│   └── utils/
│       └── roomCodeGenerator.js
├── e2e/                    ← Playwright tests (14 spec files, 85 tests)
│   ├── helpers/
│   ├── TESTS.md            ← Full test inventory
│   └── *.spec.js
├── sample-tasks.csv        ← Sample CSV (not shipped in container image)
├── run                     ← Quick-start script (local dev)
├── deploy.sh               ← EC2 deployment script (legacy)
└── deploy-remote.sh        ← Remote EC2 deployment via SCP (legacy)
```

## Quick Start

### Prerequisites

- Node.js 20+ (see `.nvmrc`) — **or** Docker 24+ if you only want to run the container
- npm 10+

### Run the App — Docker (recommended)

```bash
docker compose build && docker compose up
```

Open **http://localhost:5001** — the Node server serves both the built Vue app
and the API from the same origin. The SQLite database is backed by a tmpfs
mount, so session data never touches disk and is wiped when the container
stops.

### Run the App — Local dev

```bash
# Option 1: Quick-start script
./run

# Option 2: npm dev command
npm install
npm run dev
```

This starts:

- Backend on **http://localhost:5001** (Express, HTTP-only — multi-user sync is via ~2s polling)
- Frontend on **http://localhost:3000** (Vite dev server; proxies `/api` to the backend)

### Using the App

1. **Create a Session** — Enter your name and click "Create Session"
2. **Share the Room Code** — Copy and share the generated code (e.g., `friendly-tiger`)
3. **Others Join** — They enter the room code and their name
4. **Enable Participants** — The creator (host) is auto-skipped; enable participants for the turn rotation
5. **Start Session** — Creator clicks "Start Session" to begin turn-based pointing
6. **Point Stories** — Upload a CSV or create tasks manually, then drag tasks into complexity columns on your turn
7. **End Session** — Creator clicks "End Session" to generate a report
8. **Finish & Discard** — On the report page, creator clicks "Finish & Discard" to permanently delete all session data

## Session Lifecycle

```
Created → Participants join → Creator clicks "Start Session"
  → Turns begin (round-robin) → Creator clicks "End Session"
  → Report generated → Creator clicks "Finish & Discard"
  → All session data deleted
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
| `POST`  | `/sessions/:roomCode/discard`            | Discard session and delete all data (creator only)                   |
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

The project has 14 Playwright spec files (85 tests) covering:

- Session creation, joining, shared links, and discard/end lifecycle
- CSV import
- Task and column management
- Tag management
- Multi-user sessions and task sync
- Turn-based features (rotation, skip turn, stack mode)
- Session start/end/discard lifecycle
- Presence detection and ownership transfer
- Unique ID isolation

The test backend runs on port **5002** by default (off the dev/docker port 5001)
so `npx playwright test` works even while `docker compose up` is running.
See [`e2e/TESTS.md`](e2e/TESTS.md) for the full inventory.

### Environment Variables

```bash
# Frontend (optional — client falls back to `/api` relative URLs which
# work whenever the server serves the built SPA on the same origin)
VITE_API_URL=http://localhost:5001/api

# Vite dev-server proxy target (used by `npm run dev` and by Playwright
# to redirect /api traffic to the test backend on 5002).
VITE_PROXY_TARGET=http://localhost:5001

# Server
PORT=5001                    # Backend port (container default is 5001)
NODE_ENV=production          # Enables static serving of client/dist + rate limiter
DB_PATH=/data/app.db         # SQLite path (container uses /data on tmpfs)
OFFLINE_THRESHOLD_S=600      # Seconds before participant marked offline (10 min)
AUTO_SKIP_TURN_S=600         # Seconds before auto-skipping offline turn holder (10 min)
AUTO_TRANSFER_OWNER_S=900    # Seconds before auto-transferring ownership (15 min)
```

## Database

- SQLite, in-process via the `sqlite3` npm package
- In local dev, the file lives at `server/app.db`. In the container, it lives
  at `/data/app.db` on a **tmpfs** — RAM-only, never written to the host disk,
  and wiped when the container stops
- Created automatically on startup; schema lives in `server/schema.sql` and
  additive migrations run at boot from `server/db.js`
- Session data is deleted when the creator clicks "Finish & Discard" on the
  report page, or automatically after 15 minutes of inactivity (whichever
  comes first) — the app is **ephemeral by design** and never retains session
  contents beyond active use
- To reset in local dev: delete `server/app.db` and restart
- To reset in docker: `docker compose restart` (everything goes with the tmpfs)

## Logging

- The app logs every API request (with timestamp, method, path, and client IP)
  and every presence-check decision (with user name and room code) via
  `console.log` / `console.error`
- In dev, logs go to the terminal
- In the container, logs go to **both** stdout (so `docker logs` / ECS
  `awslogs` → CloudWatch keep working) **and** to a plain-text file at
  `/var/log/app/app-YYYY-MM-DD.log`, which is bind-mounted to `./logs/` on
  the host. These files survive `docker compose down` and are easy to
  `tail -f` / `grep`
- Set `LOG_DIR=<path>` to opt in outside the container; unset it to stay
  stdout-only. See `server/logger.js`
- **Privacy note:** logs contain IP addresses and participant names. Session
  _contents_ (tasks, comments, points) are never logged, but the IP ↔ name
  ↔ room-code correlation survives session deletion. If that's a concern for
  your deployment, redact before writing or retain only short-term

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

### Container (recommended — target: AWS ECS)

The image is a single hardened artifact that serves the API and the built SPA
on one port. It runs as the non-root `node` user, with a read-only root
filesystem and a tmpfs for `/data` (SQLite) and `/tmp`.

```bash
docker compose build
docker compose up
```

To deploy on ECS: push the image to ECR, run as a Fargate task with
`desiredCount=1` (SQLite is single-node — scale-out requires migrating to
RDS/Dynamo first), and put an ALB in front on port 5001. No volume is
needed — task-level ephemeral storage is enough, and the tmpfs is what
guarantees no session data lands on disk.

### EC2 + nginx + systemd (legacy path)

```bash
cp .env.example .env
# Edit .env with your EC2 details
./deploy-remote.sh
```

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the complete non-container deployment
guide (nginx, SSL, systemd). Security posture and rate limiting notes live in
**[SECURITY.md](SECURITY.md)**.

## License

MIT
