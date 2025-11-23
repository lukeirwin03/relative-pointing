# Getting Started - Quick Setup

Get the Relative Pointing App running in 2 minutes.

## Prerequisites

- **Node.js 18+** - Download from https://nodejs.org/

That's it! No other setup required.

## Quick Start

### macOS / Linux

```bash
./run
```

### Windows

```bash
run.bat
```

The script will:
1. ✅ Check Node.js and npm
2. ✅ Install dependencies
3. ✅ Create environment file
4. ✅ Start backend (port 5000) and frontend (port 3000)

**Done!** App opens at `http://localhost:3000`

## Using the App

### Create a Session

1. Go to http://localhost:3000
2. Enter your name
3. Click "Create Session"
4. Copy the room code (e.g., "friendly-tiger")

### Join from Another User

1. Open a new browser in incognito/private mode
2. Go to http://localhost:3000
3. Click "Join Session" tab
4. Enter your name
5. Paste the room code
6. Click "Join Session"

Both users should now see each other in the participant list (top-right corner).

### Upload Tasks

1. Create or obtain a CSV file with your tasks
2. Drag and drop it onto the app, or use the upload button
3. Tasks appear in the "Tasks" panel on the right

### Point Tasks

1. Drag tasks from the "Tasks" panel into complexity columns
2. Create new columns by dragging between existing columns
3. Watch updates happen in real-time across all open sessions

## What's Running

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | React app |
| Backend API | http://localhost:5000/api | REST API |
| Health Check | http://localhost:5000/api/health | Backend status |

## Commands

```bash
# Start everything (recommended)
./run

# Just the backend
npm run start:backend

# Just the frontend
npm start

# Both together (alternative)
npm run dev
```

## Troubleshooting

### Port Already in Use

```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9   # Frontend
lsof -ti:5000 | xargs kill -9   # Backend

# Or use different ports
PORT=3001 npm start              # Frontend on 3001
PORT=5001 npm run start:backend  # Backend on 5001
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

Should return `{"status":"ok"}`

## Data Persistence

- Database is at `server/app.db`
- Data persists between restarts
- To reset: `rm server/app.db && ./run`

## Next Steps

1. ✅ Run `./run` and test the app
2. ✅ Create a session and join from another tab
3. ✅ Upload sample tasks
4. ✅ Try dragging tasks between columns
5. 📚 Read [LOCAL_SETUP.md](LOCAL_SETUP.md) for more details

## Need Help?

- **Setup issues?** → See "Troubleshooting" above
- **Want to know more?** → Read [LOCAL_SETUP.md](LOCAL_SETUP.md)
- **Exploring code?** → Read [SECURITY.md](SECURITY.md)

---

**That's it!** You're ready to use the app. Just run `./run` 🚀
