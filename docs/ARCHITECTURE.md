# Architecture Documentation

## System Overview

The Relative Pointing App is a real-time collaborative tool built as a static React application with Firebase backend for synchronization.

## Architecture Diagram

```
┌─────────────────┐
│   User Browser  │
│   (React App)   │
└────────┬────────┘
         │
         │ HTTPS
         │
┌────────▼────────┐
│   CloudFront    │
│      (CDN)      │
└────────┬────────┘
         │
         │
┌────────▼────────┐
│    S3 Bucket    │
│  (Static Files) │
└─────────────────┘

┌─────────────────┐
│  Firebase       │
│  Realtime DB    │◄─────── WebSocket Connections
└─────────────────┘
```

## Data Flow

### Session Creation
1. User clicks "Create Session"
2. Generate random 6-character room code
3. Create Firebase path: `/sessions/{roomCode}`
4. Initialize session metadata
5. Redirect to session URL with code

### Joining Session
1. User enters room code or uses shared link
2. Prompt for username
3. Add user to `/sessions/{roomCode}/participants`
4. Subscribe to real-time updates
5. Display session state

### CSV Upload
1. Session creator drops CSV file
2. PapaParse extracts task data
3. Parse Jira format columns (Issue Key, Summary, etc.)
4. Create task objects in Firebase
5. All participants see tasks appear in "Unsorted" column

### Turn-Based Pointing
1. Firebase tracks `currentTurn` field
2. UI highlights active user
3. Active user drags task to column
4. Update task's `columnId` and `order` in Firebase
5. Advance to next participant
6. All users see real-time update

### Column Creation
1. User drags task between two columns
2. Detect drop zone between columns
3. Create new column with order between existing columns
4. Update task to reference new column
5. Sync to Firebase

### Chat System
1. User types message
2. Push to `/sessions/{roomCode}/chat`
3. Include: userId, username, text, timestamp
4. All users receive via Firebase listener
5. Display in chat panel

### Session Completion
1. Scrum Master clicks "Complete Session"
2. Display summary: columns with task counts
3. "Open Tabs" button per column
4. Build Jira URLs for each task in column
5. Open tabs in batches (browser may limit)

## Firebase Schema

```javascript
sessions/
  {roomCode}/              // e.g., "ABC123"
    metadata/
      createdAt: timestamp
      createdBy: userId
      status: "active" | "completed"
      jiraBaseUrl: string  // extracted from CSV
    
    participants/
      {userId}/
        name: string
        joinedAt: timestamp
        color: string       // for UI differentiation
        isCreator: boolean
    
    currentTurn: userId     // whose turn it is
    turnOrder: [userId]     // rotation sequence
    
    tasks/
      {taskId}/             // e.g., "PROJ-123"
        id: string
        title: string
        description: string
        columnId: string    // which column it's in
        order: number       // position within column
        assignedBy: userId  // who placed it
        assignedAt: timestamp
    
    columns/
      {columnId}/
        id: string
        name: string
        order: number       // left-to-right position
        suggestedPoints: number  // optional
        createdBy: userId
        createdAt: timestamp
    
    chat/
      {messageId}/
        userId: string
        username: string
        text: string
        timestamp: timestamp
```

## Component Hierarchy

```
App
├── SessionCreator (if no room code)
├── SessionJoin (if room code but no username)
└── SessionContainer (main app)
    ├── Header
    │   ├── RoomCode
    │   └── ParticipantList
    ├── CSVUploader (creator only)
    ├── TurnIndicator
    ├── TaskBoard
    │   ├── UnsortedColumn
    │   ├── Column (dynamic, can have multiple)
    │   │   └── TaskCard[]
    │   └── DropZone (between columns)
    ├── Chat
    └── SessionComplete (when finished)
        └── BulkTabOpener
```

## State Management

### Local State (React useState/useReducer)
- Current username
- UI state (modals, loading)
- Draft chat message

### Firebase Listeners (Custom Hooks)
- `useSession()` - Session metadata and participants
- `useTasks()` - Task list and updates
- `useColumns()` - Column configuration
- `useChat()` - Chat messages
- `useTurnManager()` - Current turn logic

## Real-time Synchronization

All state changes flow through Firebase:
1. User action triggers state change
2. Update Firebase with transaction or set
3. Firebase broadcasts to all connected clients
4. Clients update local React state
5. UI re-renders with new data

## Security Rules

Firebase security rules ensure:
- Only session participants can read/write session data
- Only session creator can upload CSV
- Only current turn holder can move tasks
- All participants can send chat messages

## Performance Considerations

- Lazy load chat messages (paginate old messages)
- Limit active sessions per user
- Clean up abandoned sessions after 24 hours
- Optimize drag-and-drop with React.memo
- Use Firebase indexes for queries

## Browser Requirements

- Modern browser with WebSocket support
- JavaScript enabled
- Minimum 1024px width recommended
- Supports drag-and-drop API

## Error Handling

- Network disconnection: Show reconnecting indicator
- Firebase errors: Display user-friendly messages
- CSV parsing errors: Validate and show specific issues
- Turn conflicts: Firebase transactions prevent race conditions
