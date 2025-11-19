# Claude Code Development Guide

This guide provides instructions for continuing development of the Relative Pointing App using Claude Code.

## Project Status

This project currently contains:
- ✅ Complete documentation (SETUP, ARCHITECTURE, FIREBASE_SETUP, DEPLOYMENT)
- ✅ Project structure and configuration files
- ✅ Code stubs for all major components
- ✅ Utility functions (CSV parsing, room codes, Jira URLs)
- ✅ Custom React hooks (useSession, useChat, useTurnManager)
- ⏳ Component implementations (partially complete)
- ⏳ Firebase integration (needs testing)
- ⏳ Drag-and-drop functionality (not implemented)
- ⏳ Real-time synchronization (basic structure only)

## Next Steps for Development

### Phase 1: Firebase Setup and Testing
1. Follow `docs/FIREBASE_SETUP.md` to create Firebase project
2. Add credentials to `.env.local`
3. Test basic Firebase connection in `src/services/firebase.js`
4. Verify session creation and joining works

### Phase 2: Complete Core Components

#### SessionJoin Component
Location: `src/components/SessionJoin.jsx`
Tasks:
- Implement join logic with Firebase
- Validate room code exists
- Add user to participants list
- Store user info in localStorage
- Handle errors (room not found, etc.)

#### TaskBoard Component
Location: `src/components/TaskBoard.jsx`
Tasks:
- Fetch and display tasks from Firebase
- Render dynamic columns
- Implement task filtering
- Add loading states
- Handle session not found

#### Column Component
Location: `src/components/Column.jsx` (currently in ComponentStubs.jsx)
Tasks:
- Extract to separate file
- Implement drop zone detection
- Handle task reordering within column
- Add column creation between existing columns
- Show suggested point values

#### TaskCard Component
Location: `src/components/Column.jsx` (currently in ComponentStubs.jsx)
Tasks:
- Extract to separate file
- Make draggable (use @dnd-kit)
- Show task metadata
- Add hover states
- Display task description in tooltip

### Phase 3: Drag-and-Drop Implementation

Use @dnd-kit library (already in package.json):

```javascript
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
```

Key features to implement:
1. Draggable task cards
2. Droppable columns
3. Drop zone detection between columns
4. Visual feedback during drag
5. Update Firebase on drop
6. Optimistic UI updates

### Phase 4: CSV Upload Integration

Complete `CSVUploader` component:
1. Parse CSV using existing utility
2. Create task objects
3. Upload to Firebase `sessions/{roomCode}/tasks`
4. Extract and store Jira base URL
5. Show progress feedback
6. Handle errors gracefully

### Phase 5: Chat Implementation

Complete `Chat` component:
1. Use `useChat` hook for messages
2. Display messages in chronological order
3. Auto-scroll to newest message
4. Show user avatars/colors
5. Add timestamp display
6. Implement message sending
7. Add emoji support (optional)

### Phase 6: Turn Management

Integrate turn system:
1. Complete `useTurnManager` hook implementation
2. Update UI based on current turn
3. Only allow active user to drag tasks
4. Show whose turn it is prominently
5. Auto-advance turn after task placement
6. Add manual turn skip option

### Phase 7: Session Completion

Complete `SessionComplete` component:
1. Display final column layout
2. Show task counts per column
3. Let scrum master assign point values to columns
4. Implement bulk tab opening
5. Handle browser popup blockers
6. Add export options (CSV, JSON)

## Code Examples

### Firebase Task Upload

```javascript
import { ref, set, push } from 'firebase/database';

async function uploadTasks(roomCode, tasks) {
  const tasksRef = ref(database, `sessions/${roomCode}/tasks`);
  
  const taskPromises = tasks.map(task => {
    const taskRef = push(tasksRef);
    return set(taskRef, {
      id: task.id,
      title: task.title,
      description: task.description,
      columnId: 'unsorted',
      order: 0,
      metadata: task.metadata,
    });
  });
  
  await Promise.all(taskPromises);
}
```

### Drag and Drop Handler

```javascript
function handleDragEnd(event) {
  const { active, over } = event;
  
  if (!over) return;
  
  const taskId = active.id;
  const targetColumnId = over.id;
  
  // Update Firebase
  const taskRef = ref(database, `sessions/${roomCode}/tasks/${taskId}`);
  await update(taskRef, {
    columnId: targetColumnId,
    assignedBy: currentUserId,
    assignedAt: Date.now(),
  });
  
  // Advance turn
  await nextTurn();
}
```

### Create Column Between Existing Columns

```javascript
async function createColumnBetween(leftColumn, rightColumn) {
  const newOrder = (leftColumn.order + rightColumn.order) / 2;
  const newColumnRef = push(ref(database, `sessions/${roomCode}/columns`));
  
  await set(newColumnRef, {
    id: newColumnRef.key,
    name: 'New Column',
    order: newOrder,
    createdBy: currentUserId,
    createdAt: Date.now(),
  });
}
```

## Testing Strategy

### Manual Testing Checklist
- [ ] Create session and get room code
- [ ] Join session from different browser/tab
- [ ] Upload sample CSV file
- [ ] Drag task to column
- [ ] Create new column by dragging between columns
- [ ] Verify turn advances after placement
- [ ] Send chat messages
- [ ] Complete session and open Jira tabs
- [ ] Test with 5+ participants

### Unit Tests
Priority files for testing:
1. `utils/roomCodeGenerator.js`
2. `utils/csvParser.js`
3. `utils/jiraUrlBuilder.js`
4. `hooks/useSession.js`
5. `hooks/useTurnManager.js`

### Integration Tests
Test flows:
1. Session creation → Join → Upload CSV → Point tasks
2. Multi-user turn rotation
3. Real-time synchronization across clients

## Common Issues and Solutions

### Issue: Firebase Permission Denied
Solution: Check security rules in Firebase console. For development, use open rules (see FIREBASE_SETUP.md)

### Issue: React Hook Dependency Warnings
Solution: Add all dependencies to useEffect arrays, or use useCallback for functions

### Issue: Drag and Drop Not Working
Solution: Ensure @dnd-kit is properly initialized with DndContext wrapper

### Issue: Multiple Tabs Not Opening
Solution: Add popup permission prompt and delay between tab opens (see jiraUrlBuilder.js)

### Issue: Real-time Updates Delayed
Solution: Check Firebase connection status and network latency

## Performance Optimization

Once core features work:
1. Add React.memo to TaskCard components
2. Implement virtual scrolling for large task lists
3. Paginate chat messages
4. Debounce Firebase writes
5. Add optimistic UI updates
6. Lazy load non-critical components

## Deployment

Once development is complete:
1. Test thoroughly in development
2. Build production version: `npm run build`
3. Follow `docs/DEPLOYMENT.md` for S3/CloudFront setup
4. Configure environment variables for production
5. Set up Firebase security rules
6. Test in production environment

## Additional Features (Future)

Ideas for v2:
- Anonymous voting mode
- Timer for each turn
- Historical session archive
- Custom point scales (Fibonacci, T-shirt sizes)
- Export session summary as PDF
- Integrate with Jira API directly
- Voice chat integration
- Mobile responsive improvements
- Keyboard shortcuts
- Undo/redo functionality

## Resources

- [React Documentation](https://react.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [dnd-kit Documentation](https://docs.dndkit.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [PapaParse](https://www.papaparse.com)

## Getting Help

1. Review existing documentation in `/docs`
2. Check component stubs for TODO comments
3. Look at utility functions for examples
4. Test in isolation before integration
5. Use browser DevTools for debugging

---

**Remember**: This is a collaborative tool. Test with real users early and iterate based on feedback!
