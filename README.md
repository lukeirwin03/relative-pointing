# Relative Pointing App

A collaborative web application for Scrum teams to perform relative story pointing using a drag-and-drop interface.

## Features

- **Session-based Collaboration** - Generate room codes for team sessions
- **Multiple Participants** - See all team members joined to a session in real-time
- **CSV Import** - Upload Jira task exports
- **Relative Pointing** - Drag tasks into complexity columns
- **Dynamic Columns** - Create new columns by dragging between existing ones
- **No Setup Required** - Everything runs locally, no external services needed

## Tech Stack

- **Frontend**: React 18 with Hooks, Tailwind CSS, @dnd-kit (drag & drop)
- **Backend**: Express.js REST API with rate limiting
- **Database**: SQLite (local file-based)
- **CSV Parsing**: PapaParse

## Project Structure

```
relative-pointing-app/
├── run                 ← Start everything with this script
├── package.json        ← Dependencies and scripts
├── src/
│   ├── components/     ← React components
│   │   ├── SessionCreator.jsx
│   │   ├── TaskBoard.jsx
│   │   ├── ParticipantList.jsx
│   │   ├── Column.jsx
│   │   ├── TaskCard.jsx
│   │   ├── CreateTaskModal.jsx
│   │   └── ...
│   ├── hooks/          ← Custom React hooks
│   │   ├── useSession.js
│   │   ├── useTheme.js
│   │   └── ...
│   ├── services/
│   │   └── api.js      ← API client (no Firebase)
│   ├── utils/
│   │   ├── csvParser.js
│   │   └── roomCodeGenerator.js
│   ├── App.jsx
│   └── index.js
├── server/
│   ├── server.js       ← Express app
│   ├── db.js          ← SQLite initialization
│   ├── schema.sql     ← Database schema
│   └── routes/
│       ├── sessions.js
│       ├── tasks.js
│       └── ...
└── public/
    └── index.html
```

## Quick Start

### Prerequisites
- Node.js 18+

### Run the App

```bash
./run
```

This script will:
- ✅ Check Node.js and npm
- ✅ Install dependencies
- ✅ Set up environment variables
- ✅ Start backend (port 5000) and frontend (port 3000)

### Using the App

1. **Create a Session** - Enter your name and click "Create Session"
2. **Share the Room Code** - Copy and share the generated code with team members
3. **Others Join** - They click "Join Session", enter their name and the room code
4. **Start Pointing** - Upload a CSV and start dragging tasks into complexity columns

## API Endpoints

All endpoints are at `http://localhost:5000/api`

### Sessions
- `POST /sessions` - Create new session
- `GET /sessions/:roomCode` - Get session with participants and tasks
- `POST /sessions/:roomCode/join` - Join existing session
- `POST /sessions/:roomCode/columns` - Create column
- `DELETE /sessions/:roomCode/columns/:columnId` - Delete column

### Tasks
- `POST /sessions/:roomCode/tasks` - Create/upload tasks
- `PUT /sessions/:roomCode/tasks/:taskId` - Move task to column
- `DELETE /sessions/:roomCode/tasks/:taskId` - Delete task

### Health
- `GET /api/health` - Backend health check

## Development

### Commands

```bash
# Start everything (recommended)
./run

# Start just backend
npm run start:backend

# Start just frontend
npm start

# Run both together (alternative to ./run)
npm run dev
```

### Testing Multi-User

1. **Tab 1**: Create a session and note the room code
2. **Tab 2**: Open in incognito/private mode, join with same room code but different name
3. Both tabs should show both participants in the top-right corner
4. Drag tasks in one tab - they update in real-time in the other

## Environment Variables

The `run` script creates `.env` automatically with:

```
REACT_APP_API_URL=http://localhost:5000/api
```

## Database

- SQLite database at `server/app.db`
- Created automatically on first run
- Persists between restarts
- Delete and restart to reset data

## License

MIT
