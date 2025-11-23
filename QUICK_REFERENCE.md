# Quick Reference

Fast answers for common questions.

## Start the App

```bash
./run
```

Opens at http://localhost:3000

## Common Commands

```bash
./run                    # Start everything
npm run dev              # Start both servers
npm run start:backend    # Just backend (port 5000)
npm start                # Just frontend (port 3000)
npm test                 # Run tests
npm run build            # Build for production
npm run lint             # Check code
npm run format           # Format code
```

## Database

```bash
rm server/app.db         # Reset database
./run                    # Restart with fresh data
```

## Troubleshooting

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9   # Kill frontend
lsof -ti:5000 | xargs kill -9   # Kill backend
```

### Missing Dependencies
```bash
rm -rf node_modules package-lock.json
./run
```

### Check Backend
```bash
curl http://localhost:5000/api/health
```

## Key Files

| File | Purpose |
|------|---------|
| `./run` | Start script |
| `src/App.jsx` | React app entry |
| `src/services/api.js` | API client |
| `server/server.js` | Express server |
| `server/schema.sql` | Database schema |
| `package.json` | Dependencies |

## API Endpoints

```
Base: http://localhost:5000/api

Sessions:
  POST   /sessions
  GET    /sessions/:roomCode
  POST   /sessions/:roomCode/join

Tasks:
  POST   /sessions/:roomCode/tasks
  PUT    /sessions/:roomCode/tasks/:taskId
  DELETE /sessions/:roomCode/tasks/:taskId

Columns:
  POST   /sessions/:roomCode/columns
  DELETE /sessions/:roomCode/columns/:columnId

Health:
  GET    /health
```

## File Structure

```
src/
├── components/        # React components
├── hooks/            # Custom hooks
├── services/api.js   # API client
├── utils/            # Utilities
├── App.jsx
└── index.js

server/
├── server.js         # Express app
├── db.js            # SQLite init
├── schema.sql       # Database
└── routes/
    ├── sessions.js
    └── tasks.js
```

## Ports

- **Frontend**: 3000
- **Backend**: 5000
- **Both**: Start with `./run`

## Environment

Auto-created in `.env`:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Database Location

```
server/app.db
```

File-based SQLite database. Delete to reset.

## Testing

### Create Session
```bash
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"creatorId":"user-id","creatorName":"Alice"}'
```

### Get Session
```bash
curl http://localhost:5000/api/sessions/room-code
```

### Join Session
```bash
curl -X POST http://localhost:5000/api/sessions/room-code/join \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-id","userName":"Bob"}'
```

## Tech Stack

- React 18
- Express.js
- SQLite
- Tailwind CSS
- @dnd-kit

## Documentation

- [START_HERE.md](START_HERE.md) - Overview
- [README.md](README.md) - Full description
- [GETTING_STARTED.md](GETTING_STARTED.md) - Setup
- [LOCAL_SETUP.md](LOCAL_SETUP.md) - Architecture
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - What's built
- [SECURITY.md](SECURITY.md) - Security
- [INDEX.md](INDEX.md) - Docs index

## Quick Test

```bash
# Tab 1
./run

# Tab 2 (new incognito window)
http://localhost:3000
Click "Join Session"
Enter name + room code from Tab 1

# Result
Both tabs show 2 participants
```

## Useful Links

- **App**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Health**: http://localhost:5000/api/health
- **Sample CSV**: sample-tasks.csv

---

Need more? Check [INDEX.md](INDEX.md) for full documentation.
