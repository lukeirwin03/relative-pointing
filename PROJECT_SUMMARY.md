# Relative Pointing App - Project Summary

## Current State

A fully functional collaborative story pointing application with:

### ✅ Completed Features
- Session creation with unique room codes
- Multi-participant sessions with real-time participant list
- CSV import for Jira tasks
- Drag-and-drop task placement into complexity columns
- Dynamic column creation
- Task management (create, delete, move)
- Dark mode support
- Rate limiting and security measures
- SQLite database with Express backend
- Simplified session join flow (no extra modal)

### 🏗️ Architecture
- **Frontend**: React 18 with React Router, Tailwind CSS, @dnd-kit
- **Backend**: Express.js REST API with rate limiting
- **Database**: SQLite (local file-based)
- **No External Services**: Everything runs locally

## What's Built

### Components
- `SessionCreator.jsx` - Create/join sessions on single page
- `TaskBoard.jsx` - Main board with drag-and-drop
- `ParticipantList.jsx` - Show all session participants
- `Column.jsx` - Task columns
- `TaskCard.jsx` - Individual task display
- `CreateTaskModal.jsx` - Quick task creation
- `DropZoneOverlay.jsx` - CSV drag-and-drop
- `App.jsx` - Routing and state management

### Backend Routes
- `POST /sessions` - Create session
- `GET /sessions/:roomCode` - Get session details
- `POST /sessions/:roomCode/join` - Join session
- `POST /sessions/:roomCode/tasks` - Create/upload tasks
- `PUT /sessions/:roomCode/tasks/:taskId` - Move task
- `DELETE /sessions/:roomCode/tasks/:taskId` - Delete task
- `POST /sessions/:roomCode/columns` - Create column
- `DELETE /sessions/:roomCode/columns/:columnId` - Delete column

### Utilities
- Room code generation
- CSV parsing
- Session management
- User authentication (localStorage)

## Project Structure

```
relative-pointing-app/
├── run                      ← Start everything
├── package.json
├── src/
│   ├── components/          ← React UI components
│   ├── hooks/               ← Custom React hooks
│   ├── services/api.js      ← API client
│   ├── utils/               ← Helper functions
│   ├── App.jsx
│   └── index.js
├── server/
│   ├── server.js
│   ├── db.js
│   ├── schema.sql
│   └── routes/
│       ├── sessions.js
│       └── tasks.js
├── public/
└── README.md, docs, etc.
```

## Quick Start

```bash
./run
```

Opens at `http://localhost:3000`

## How to Use

### Create a Session
1. Enter your name
2. Click "Create Session"
3. Copy the room code

### Join a Session
1. Click "Join Session" tab
2. Enter your name
3. Paste room code
4. Click "Join"

### Point Tasks
1. Upload CSV with tasks
2. Drag tasks into complexity columns
3. Create new columns as needed
4. See all participants in real-time

## Development Notes

### No Firebase
Everything runs locally with Express + SQLite. No external services needed.

### Removed Features
- Turn-based gameplay (replaced with free-form pointing)
- Chat functionality (simplified scope)
- SessionJoin component (merged into SessionCreator)
- Firebase dependency

### Current Limitations
- No WebSocket support (uses polling every 2 seconds)
- Single server (not distributed)
- SQLite (not suitable for large scale)
- No user authentication

## Deployment Ready

To deploy to production:

1. **Backend** - Express app to AWS Lambda, Heroku, DigitalOcean
2. **Database** - Migrate from SQLite to PostgreSQL
3. **Frontend** - Build React and deploy to S3/CloudFront
4. **Update API URL** - Change `REACT_APP_API_URL` environment variable

## Technology Stack

| Layer | Tech | Purpose |
|-------|------|---------|
| Frontend | React 18 | UI framework |
| Styling | Tailwind CSS | Component styles |
| Drag-Drop | @dnd-kit | Reordering |
| CSV | PapaParse | File parsing |
| Routing | React Router | Navigation |
| Backend | Express.js | REST API |
| Database | SQLite | Data persistence |
| Rate Limit | express-rate-limit | API protection |

## Security

- Rate limiting on all endpoints
- Brute force protection on session joins
- Input validation
- Session isolation
- No sensitive data exposure

See [SECURITY.md](SECURITY.md) for details.

## Next Steps for Development

1. Add WebSocket support for real-time updates
2. Implement user authentication
3. Add session export functionality
4. Improve mobile responsiveness
5. Add more task metadata fields
6. Implement user preferences

## Files You Need to Know

| File | Purpose |
|------|---------|
| `./run` | Start everything |
| `server/server.js` | Express entry point |
| `src/App.jsx` | React entry point |
| `src/services/api.js` | API communication |
| `src/components/SessionCreator.jsx` | Create/join interface |
| `src/components/TaskBoard.jsx` | Main workspace |
| `server/schema.sql` | Database structure |

## Testing

Test with 2 browser windows/tabs:

1. Tab 1: Create session
2. Tab 2: Join with room code
3. Both should show participants
4. Upload CSV and drag tasks
5. Updates appear in both tabs

## Documentation

- [README.md](README.md) - Overview
- [GETTING_STARTED.md](GETTING_STARTED.md) - Quick setup
- [LOCAL_SETUP.md](LOCAL_SETUP.md) - Detailed architecture
- [SECURITY.md](SECURITY.md) - Security measures
- [INDEX.md](INDEX.md) - Documentation index

## Cost

✅ **$0** - Everything runs locally. Deploy for minimal cost.

## Status

**🚀 Production Ready** - Fully functional for team story pointing sessions
