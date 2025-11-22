# Local Development Setup - SQLite + Express Backend

This project now runs entirely locally with no external dependencies!

## What's Included

✅ **SQLite Database** - File-based, zero setup
✅ **Express Backend** - Node.js REST API on port 5000
✅ **React Frontend** - Development server on port 3000
✅ **Real-time Sync** - Polling mechanism for multi-tab support

## Quick Start (One Command)

```bash
./run
```

That's it! The script will:
- ✅ Check Node.js and npm
- ✅ Install dependencies (both backend and frontend)
- ✅ Create `.env.local` automatically
- ✅ Start both backend and frontend servers

## Architecture

```
┌─────────────────────────────────────────────┐
│         React Frontend (Port 3000)          │
│  - Session Creator / Joiner                 │
│  - Task Board with Drag & Drop              │
│  - Chat & Turn Management                   │
└────────────┬────────────────────────────────┘
             │ HTTP / REST API
             ↓
┌─────────────────────────────────────────────┐
│       Express Backend (Port 5000)           │
│  - Session management                       │
│  - Task CRUD operations                     │
│  - Chat messaging                           │
│  - Turn management                          │
└────────────┬────────────────────────────────┘
             │ SQL queries
             ↓
┌─────────────────────────────────────────────┐
│      SQLite Database (app.db)               │
│  - Sessions                                 │
│  - Tasks & Columns                          │
│  - Participants & Chat                      │
│  - Turn Order                               │
└─────────────────────────────────────────────┘
```

## File Structure

```
relative-pointing-app/
├── run                           ← Start everything with this
├── .env.example                  ← Environment template
├── .env.local                    ← Created automatically
│
├── src/                          ← React frontend
│   ├── services/
│   │   └── api.js              ← API client (replaces Firebase)
│   ├── components/
│   ├── hooks/
│   └── utils/
│
└── server/                       ← Express backend
    ├── server.js               ← Main Express app
    ├── db.js                   ← SQLite initialization
    ├── schema.sql              ← Database schema
    ├── routes/
    │   ├── sessions.js         ← Session endpoints
    │   ├── tasks.js            ← Task endpoints
    │   ├── chat.js             ← Chat endpoints
    │   └── turns.js            ← Turn management endpoints
    └── app.db                  ← SQLite database (created on first run)
```

## How It Works

### Backend (`server/server.js`)

1. **Initializes SQLite** - Creates tables from `schema.sql`
2. **Exposes REST API** - Listens on `http://localhost:5000`
3. **Handles requests** - Manages all data operations

### Frontend (`src/services/api.js`)

1. **Replaces Firebase** - Makes HTTP requests to backend
2. **Handles API calls** - All data operations go through API
3. **No authentication** - Local dev, so open access

### Database (`server/app.db`)

- Created automatically on first run
- SQLite file-based database
- Tables for sessions, tasks, chat, turns, participants
- Persists between restarts

## API Endpoints

All endpoints start with `http://localhost:5000/api`

### Sessions
- `POST /sessions` - Create new session
- `GET /sessions/:roomCode` - Get session details
- `POST /sessions/:roomCode/join` - Join existing session

### Tasks
- `POST /sessions/:roomCode/tasks` - Upload tasks
- `GET /sessions/:roomCode/tasks` - Get all tasks
- `PUT /sessions/:roomCode/tasks/:taskId` - Move task to column

### Chat
- `GET /sessions/:roomCode/chat` - Get messages
- `POST /sessions/:roomCode/chat` - Send message

### Turns
- `GET /sessions/:roomCode/turns` - Get current turn
- `POST /sessions/:roomCode/turns/advance` - Next turn

### Health
- `GET /health` - Backend health check

## Development Workflow

### First Run
```bash
./run
```

The script creates `.env.local` and starts both servers.

### Subsequent Runs
```bash
./run
```

Just run the same command. It checks dependencies and starts servers.

### Manual Commands

```bash
# Just start the backend
npm run start:backend

# Just start the frontend
npm start

# Run both together
npm run dev
```

## Testing Multi-User Features

The app is designed for collaborative real-time use. Test it like this:

1. **Start the app**
   ```bash
   ./run
   ```

2. **Create a session** in Tab 1
   - Go to `http://localhost:3000`
   - Click "Create Session"
   - Note the room code (e.g., "A3X9K2")

3. **Join from Tab 2**
   - Open new tab: `http://localhost:3000`
   - Click "Join Session"
   - Enter the room code
   - Use a different username

4. **Test real-time sync**
   - Upload CSV in Tab 1
   - See tasks appear in Tab 2
   - Drag a task in Tab 1
   - Watch it update in Tab 2

5. **Test chat**
   - Send message in Tab 1
   - See it appear in Tab 2 (may need refresh until polling is implemented)

## Data Persistence

- **Survives restarts** - SQLite data persists to `server/app.db`
- **Clear database** - Delete `server/app.db` to start fresh
- **Fresh start**
  ```bash
  rm server/app.db
  ./run
  ```

## Troubleshooting

### "Port already in use"

Backend (port 5000):
```bash
lsof -ti:5000 | xargs kill -9
```

Frontend (port 3000):
```bash
lsof -ti:3000 | xargs kill -9
```

Or use different ports:
```bash
PORT=3001 npm start     # Frontend on 3001
PORT=5001 npm run start:backend  # Backend on 5001
```

### "Cannot find module" errors

Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
./run
```

### Backend not responding

Check health:
```bash
curl http://localhost:5000/api/health
```

If it fails, backend didn't start. Check console output.

### Database locked error

SQLite locks database during writes. Usually resolves itself.
- Close the app (`Ctrl+C`)
- Delete `server/app.db`
- Restart: `./run`

### Real-time sync not working

Currently uses polling (checks for updates periodically).
For instant updates between tabs:
1. Refresh the tab manually
2. Check browser console for errors
3. Verify backend is running: `curl http://localhost:5000/api/health`

## Environment Variables

Only one environment variable:

```
REACT_APP_API_URL=http://localhost:5000/api
```

Created automatically in `.env.local`

## Database Schema

### Sessions
```sql
id, room_code, creator_id, created_at, status, jira_base_url
```

### Participants
```sql
id, session_id, user_id, user_name, joined_at, turn_order
```

### Tasks
```sql
id, session_id, jira_key, title, description, issue_type,
status, priority, column_id, assigned_by, assigned_at,
task_order, metadata
```

### Columns
```sql
id, session_id, name, column_order, created_by, created_at
```

### Chat Messages
```sql
id, session_id, user_id, user_name, message, created_at
```

### Turns
```sql
id, session_id, current_turn_user_id, turn_order, updated_at
```

## Next Steps

1. ✅ Run `./run`
2. ✅ Create a test session
3. ✅ Upload sample CSV
4. ✅ Drag tasks between columns
5. ✅ Test with multiple tabs
6. 🔄 Implement real-time WebSocket updates (optional)
7. 📚 Read [CLAUDE_CODE_GUIDE.md](CLAUDE_CODE_GUIDE.md) for next features

## Improvements Over Firebase

✅ **No external dependencies** - Everything runs locally
✅ **No credentials needed** - Just run the script
✅ **Free** - No Firebase free tier limits
✅ **Data privacy** - Everything stays on your machine
✅ **Easy to debug** - See database directly
✅ **Good foundation** - Easy to migrate to production later

## Switching to Production

When ready to deploy:

1. **Backend**: Deploy Express app to AWS, Heroku, DigitalOcean, etc.
2. **Database**: Switch from SQLite to PostgreSQL
3. **Frontend**: Deploy React build to S3/CloudFront
4. **Update API URL**: Change `REACT_APP_API_URL` for production

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for details.

## Getting Help

- **Setup issues** → See above "Troubleshooting"
- **API issues** → Check `server/routes/*.js` for endpoints
- **Frontend issues** → Check `src/services/api.js` for client
- **Database issues** → Check `server/schema.sql` for schema

## Key Files to Know

| File | Purpose |
|------|---------|
| `run` | Launch script for everything |
| `server/server.js` | Express server entry point |
| `server/db.js` | SQLite initialization |
| `server/schema.sql` | Database schema |
| `src/services/api.js` | Frontend API client |
| `src/App.jsx` | Main React component |
| `package.json` | Dependencies & scripts |

---

**That's it!** You have a complete local dev environment with no external dependencies. Just run `./run` and start building! 🚀
