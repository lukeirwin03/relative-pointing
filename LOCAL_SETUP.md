# Local Development Setup

The Relative Pointing App runs entirely locally with no external dependencies.

## What's Included

✅ **SQLite Database** - File-based, zero setup  
✅ **Express Backend** - Node.js REST API on port 5000  
✅ **React Frontend** - Development server on port 3000  
✅ **Real-time Sync** - Polling mechanism for multi-participant support  

## Quick Start

```bash
./run
```

The script handles:
- ✅ Node.js and npm verification
- ✅ Dependency installation
- ✅ Environment setup
- ✅ Backend and frontend startup

## Architecture

```
┌──────────────────────────────────┐
│  React Frontend (Port 3000)      │
│  - Session Creator/Joiner        │
│  - Task Board (Drag & Drop)      │
│  - Participant List              │
└─────────────┬────────────────────┘
              │ HTTP/REST API
              ↓
┌──────────────────────────────────┐
│  Express Backend (Port 5000)     │
│  - Session Management            │
│  - Task Operations               │
│  - Participant Tracking          │
└─────────────┬────────────────────┘
              │ SQL Queries
              ↓
┌──────────────────────────────────┐
│  SQLite Database (app.db)        │
│  - Sessions & Participants       │
│  - Tasks & Columns               │
└──────────────────────────────────┘
```

## File Structure

```
relative-pointing-app/
├── run                           ← Launch script
├── .env                          ← Environment variables
│
├── src/                          ← React frontend
│   ├── services/api.js           ← API client
│   ├── components/               ← UI components
│   ├── hooks/                    ← Custom hooks
│   └── utils/                    ← Utilities
│
└── server/                       ← Express backend
    ├── server.js                 ← Express app
    ├── db.js                     ← SQLite init
    ├── schema.sql                ← Database schema
    ├── routes/
    │   ├── sessions.js           ← Session endpoints
    │   └── tasks.js              ← Task endpoints
    └── app.db                    ← Database (created on first run)
```

## How It Works

### Backend (server/server.js)

1. Initializes SQLite database from `schema.sql`
2. Exposes REST API on `http://localhost:5000`
3. Manages all data operations (sessions, tasks, participants)

### Frontend (src/services/api.js)

1. Replaces Firebase with HTTP REST calls
2. All operations go through the API
3. No authentication needed for local development

### Database (server/app.db)

- Created automatically on first run
- SQLite file-based database
- Persists data between restarts
- Delete to reset: `rm server/app.db`

## API Endpoints

All endpoints start with `http://localhost:5000/api`

### Sessions
- `POST /sessions` - Create new session
- `GET /sessions/:roomCode` - Get session details with participants and tasks
- `POST /sessions/:roomCode/join` - Join existing session

### Tasks
- `POST /sessions/:roomCode/tasks` - Create/upload tasks
- `PUT /sessions/:roomCode/tasks/:taskId` - Move task to column
- `DELETE /sessions/:roomCode/tasks/:taskId` - Delete task

### Columns
- `POST /sessions/:roomCode/columns` - Create column
- `DELETE /sessions/:roomCode/columns/:columnId` - Delete column

### Health
- `GET /api/health` - Backend status check

## Development Workflow

### First Run
```bash
./run
```

Creates `.env` and starts both servers automatically.

### Subsequent Runs
```bash
./run
```

Same command. It checks dependencies and starts servers.

### Manual Commands

```bash
# Just backend
npm run start:backend

# Just frontend
npm start

# Both together
npm run dev
```

## Testing Multi-User Features

1. **Create session** in Tab 1
   ```
   http://localhost:3000 → Create Session → Note room code
   ```

2. **Join from Tab 2**
   ```
   New incognito/private window → http://localhost:3000
   → Join Session → Enter room code
   ```

3. **Test real-time sync**
   - Upload CSV in Tab 1
   - See tasks appear in Tab 2
   - Drag task in Tab 1
   - See update in Tab 2

4. **Check participant list**
   - Both should show 2 avatars in top-right corner

## Data Persistence

- **Survives restarts** - Data saved to `server/app.db`
- **Clear database** - Delete `server/app.db` and restart
- **Fresh start**
  ```bash
  rm server/app.db
  ./run
  ```

## Troubleshooting

### Port Already in Use

**Backend (5000):**
```bash
lsof -ti:5000 | xargs kill -9
```

**Frontend (3000):**
```bash
lsof -ti:3000 | xargs kill -9
```

**Or use different ports:**
```bash
PORT=3001 npm start                  # Frontend on 3001
PORT=5001 npm run start:backend      # Backend on 5001
```

### Missing Dependencies

```bash
rm -rf node_modules package-lock.json
./run
```

### Backend Not Responding

Check health:
```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{"status":"ok"}
```

### Database Locked Error

SQLite locks during writes. Usually resolves itself.

```bash
# Kill app and restart
Ctrl+C
rm server/app.db
./run
```

## Environment Variables

Only one required (auto-created):

```
REACT_APP_API_URL=http://localhost:5000/api
```

## Database Schema

### Sessions
```
id, room_code, creator_id, creator_name, created_at
```

### Participants
```
id, session_id, user_id, user_name, joined_at
```

### Tasks
```
id, session_id, jira_key, title, description, column_id,
task_order, metadata
```

### Columns
```
id, session_id, name, column_order, created_at
```

## Next Steps

1. ✅ Run `./run`
2. ✅ Create a test session
3. ✅ Join from another tab
4. ✅ Upload sample CSV
5. ✅ Drag tasks between columns
6. ✅ Test with multiple tabs
7. 📚 Read [SECURITY.md](SECURITY.md) for security details

## Key Files

| File | Purpose |
|------|---------|
| `run` | Launch script |
| `server/server.js` | Express server |
| `server/db.js` | SQLite initialization |
| `server/schema.sql` | Database schema |
| `src/services/api.js` | API client |
| `src/App.jsx` | Main React component |
| `package.json` | Dependencies |

---

**That's it!** You have a complete local development environment. Just run `./run` 🚀
