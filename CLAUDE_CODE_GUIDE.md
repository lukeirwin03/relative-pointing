# Development Guide

Guide for understanding and modifying the Relative Pointing App.

## Current State

✅ **Fully Functional**
- Sessions with room codes
- Multi-participant support  
- CSV upload
- Drag-and-drop task placement
- Dynamic columns
- Dark mode

🗑️ **Removed**
- Firebase (replaced with Express + SQLite)
- Turn-based gameplay
- Chat functionality
- SessionJoin component (merged into SessionCreator)

## Architecture Overview

```
┌─────────────────┐
│   React App     │
│   (Port 3000)   │
└────────┬────────┘
         │ REST API
         ↓
┌─────────────────┐
│  Express Server │
│   (Port 5000)   │
└────────┬────────┘
         │ SQL
         ↓
┌─────────────────┐
│    SQLite DB    │
│   (app.db)      │
└─────────────────┘
```

## Code Organization

### Frontend (src/)

**Components**
- `App.jsx` - Main app with routing
- `SessionCreator.jsx` - Create/join sessions
- `TaskBoard.jsx` - Main workspace
- `ParticipantList.jsx` - Show participants
- `Column.jsx` - Task column
- `TaskCard.jsx` - Individual task
- `CreateTaskModal.jsx` - Task creation
- `DropZoneOverlay.jsx` - CSV drag-drop

**Hooks**
- `useSession.js` - Fetch and sync session data
- `useTheme.js` - Dark mode support

**Services**
- `api.js` - REST API client

**Utils**
- `csvParser.js` - Parse CSV files
- `roomCodeGenerator.js` - Generate room codes

### Backend (server/)

**Routes**
- `sessions.js` - Session endpoints
- `tasks.js` - Task endpoints

**Core**
- `server.js` - Express server
- `db.js` - SQLite initialization
- `schema.sql` - Database schema

## Key Data Flows

### Create Session

```
User enters name
     ↓
SessionCreator.jsx calls APIService.createSession()
     ↓
POST /sessions
     ↓
server/routes/sessions.js creates record
     ↓
Returns room code
     ↓
User navigated to /session/:roomCode
     ↓
TaskBoard loads
```

### Join Session

```
User enters name + room code
     ↓
SessionCreator.jsx calls APIService.joinSession()
     ↓
POST /sessions/:roomCode/join
     ↓
server/routes/sessions.js creates participant record
     ↓
User navigated to /session/:roomCode
     ↓
TaskBoard loads
     ↓
useSession hook fetches participants
     ↓
ParticipantList updates
```

### Move Task

```
User drags task
     ↓
TaskBoard.handleDragEnd()
     ↓
APIService.moveTask()
     ↓
PUT /sessions/:roomCode/tasks/:taskId
     ↓
server/routes/tasks.js updates database
     ↓
useSession hook polls and fetches new state
     ↓
TaskBoard re-renders with updated position
```

## Important Files

| File | What It Does | Key Functions |
|------|-------------|----------------|
| src/App.jsx | Routing & user state | Routes, user persistence |
| src/components/SessionCreator.jsx | Create/join UI | handleCreateSession, handleJoinSession |
| src/components/TaskBoard.jsx | Main board | handleDragEnd, handleDeleteTask |
| src/hooks/useSession.js | Data fetching | Polls API every 2 seconds |
| src/services/api.js | API calls | All fetch calls to backend |
| server/server.js | Express app | Middleware, error handling |
| server/routes/sessions.js | Session logic | Create, get, join |
| server/routes/tasks.js | Task logic | Create, move, delete |
| server/schema.sql | Database design | Tables and schema |

## Database Tables

### sessions
```
id, room_code, creator_id, creator_name, created_at
```

### participants
```
id, session_id, user_id, user_name, joined_at
```

### tasks
```
id, session_id, jira_key, title, description, column_id, task_order, metadata
```

### columns
```
id, session_id, name, column_order, created_at
```

## API Response Format

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Error
```json
{
  "error": "Error message"
}
```

## Development Workflow

### 1. Understand the Current State

Read:
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - What's built
- [LOCAL_SETUP.md](LOCAL_SETUP.md) - Architecture
- This document

### 2. Make a Change

Example: Add a new task field

**Frontend (src/components/CreateTaskModal.jsx)**
```jsx
// Add to state
const [priority, setPriority] = useState('medium');

// Add to form
<select value={priority} onChange={(e) => setPriority(e.target.value)}>
  <option>Low</option>
  <option>Medium</option>
  <option>High</option>
</select>

// Pass to API
APIService.createTask(roomCode, title, priority);
```

**Backend (server/routes/tasks.js)**
```js
// Add column to insert
INSERT INTO tasks (..., priority) 
VALUES (..., ?)
```

**Database (server/schema.sql)**
```sql
ALTER TABLE tasks ADD COLUMN priority TEXT;
```

### 3. Test Locally

```bash
./run
# Test in browser
```

### 4. Deploy

See [LOCAL_SETUP.md](LOCAL_SETUP.md) Deployment section

## Common Modifications

### Add a New API Endpoint

1. Create route in `server/routes/*.js`
2. Add function to `src/services/api.js`
3. Call from React component

### Add a New Database Field

1. Update `server/schema.sql`
2. Delete `server/app.db` to reset
3. Update API endpoint to use field
4. Update React component if needed

### Add a New Page/Component

1. Create in `src/components/`
2. Add route in `src/App.jsx`
3. Update navigation

### Add Styling

Everything uses Tailwind CSS. Just add classes to JSX:

```jsx
<div className="bg-blue-500 text-white p-4">
  Styled content
</div>
```

## Debugging

### Check Browser Console
```
Press F12 → Console tab
Look for errors and logs
```

### Check Backend Logs
```
Look at terminal running ./run
See Express logs
```

### Test API Endpoint
```bash
curl http://localhost:5000/api/health
```

### Check Database
```bash
sqlite3 server/app.db
SELECT * FROM sessions;
```

## Performance Considerations

### Polling (Current)
- useSession hook polls every 2 seconds
- Works well for team sessions
- Not real-time for very fast changes

### For Real-Time
- Could implement WebSocket
- Use Socket.io with Express
- Would update participants instantly

## Security Notes

- Rate limiting implemented
- Input validation in place
- No authentication (local dev)
- SQL queries use parameterized statements

See [SECURITY.md](SECURITY.md) for details.

## Testing Tips

### Test Multi-User
1. Tab 1: Create session
2. Tab 2 (incognito): Join same session
3. Both should see same data

### Test Drag-Drop
1. Upload CSV
2. Drag tasks between columns
3. Check both tabs update

### Test Persistence
1. Make changes
2. Refresh page
3. Data should persist

## Common Issues

### "Cannot find module" Error
```bash
rm -rf node_modules
./run
```

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9
```

### Database Locked
```bash
rm server/app.db
./run
```

## Next Steps for Development

Possible improvements:

1. **WebSocket** - Real-time updates instead of polling
2. **Authentication** - User logins and roles
3. **Export** - Download results as CSV/Excel
4. **Undo/Redo** - Task change history
5. **Notifications** - Real-time alerts
6. **Mobile App** - React Native version
7. **Collaboration** - Video/audio chat
8. **Analytics** - Track pointing metrics

## Resources

- [React Docs](https://react.dev)
- [Express Docs](https://expressjs.com)
- [SQLite Docs](https://www.sqlite.org)
- [Tailwind CSS](https://tailwindcss.com)
- [@dnd-kit](https://docs.dndkit.com)

## Getting Help

- Check [INDEX.md](INDEX.md) for all docs
- Read inline code comments
- Check git history for changes
- Run `./run` to test changes locally

---

**Happy developing! 🚀**
