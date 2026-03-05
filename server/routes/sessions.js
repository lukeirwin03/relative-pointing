const express = require('express');
const {
  dbPromise,
  touchSessionByRoomCode,
  touchParticipant,
  OFFLINE_THRESHOLD_S,
} = require('../db');
const { generateRoomCode } = require('../utils/roomCodeGenerator');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Create a new session
router.post('/', async (req, res) => {
  try {
    const { creatorId, creatorName } = req.body;

    // Validate input
    if (!creatorId || !creatorName) {
      return res
        .status(400)
        .json({ error: 'creatorId and creatorName required' });
    }

    if (typeof creatorId !== 'string' || typeof creatorName !== 'string') {
      return res.status(400).json({ error: 'Invalid input types' });
    }

    // Validate UUID format
    if (
      !creatorId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      console.warn(
        `[SECURITY] Invalid creatorId format attempted: ${creatorId}`
      );
      return res.status(400).json({ error: 'Invalid creator ID format' });
    }

    // Validate name length
    if (creatorName.trim().length < 1 || creatorName.trim().length > 100) {
      return res
        .status(400)
        .json({ error: 'Name must be between 1 and 100 characters' });
    }

    const sessionId = uuidv4();

    // Retry with new room codes on collision (small namespace ~2500 combinations)
    let roomCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      roomCode = generateRoomCode();
      console.log(`[CREATE] Creating session with room code: ${roomCode}`);
      try {
        await dbPromise.run(
          `INSERT INTO sessions (id, room_code, creator_id, creator_name, current_turn_user_id, turn_started_at, last_activity_at, stack_mode) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)`,
          [sessionId, roomCode, creatorId, creatorName, creatorId]
        );
        break;
      } catch (err) {
        if (
          err.message.includes(
            'UNIQUE constraint failed: sessions.room_code'
          ) &&
          attempt < 4
        ) {
          console.log(
            `[CREATE] Room code collision on "${roomCode}", retrying...`
          );
          continue;
        }
        throw err;
      }
    }

    // Add creator as first participant
    const participantId = uuidv4();
    console.log(
      `[CREATE] Adding creator as participant: ${creatorId} (${creatorName})`
    );

    await dbPromise.run(
      `INSERT INTO participants (id, session_id, user_id, user_name) VALUES (?, ?, ?, ?)`,
      [participantId, sessionId, creatorId, creatorName]
    );

    console.log(`[CREATE] Session created successfully`);

    // Seed built-in tags
    const builtinTags = [
      { name: 'Needs Updates', color: 'yellow' },
      { name: 'Ready for Dev', color: 'green' },
      { name: 'Blocked', color: 'red' },
    ];

    let defaultTagId = null;
    for (const tag of builtinTags) {
      const tagId = uuidv4();
      await dbPromise.run(
        `INSERT INTO tags (id, session_id, name, color, is_builtin, created_by) VALUES (?, ?, ?, ?, 1, ?)`,
        [tagId, sessionId, tag.name, tag.color, creatorId]
      );
      if (tag.name === 'Ready for Dev') {
        defaultTagId = tagId;
      }
    }

    // Note: Columns are created dynamically when tasks are dragged to new locations
    // No default columns are created - start with blank work area

    // Add sample default tasks
    const sampleTasks = [
      {
        jiraKey: 'PROJ-123',
        title: 'Implement user authentication',
        description: 'Add login and signup functionality with OAuth support',
        issueType: 'Story',
        status: 'To Do',
        priority: 'High',
      },
      {
        jiraKey: 'PROJ-124',
        title: 'Design homepage mockup',
        description: 'Create visual design for landing page with modern UI',
        issueType: 'Story',
        status: 'To Do',
        priority: 'Medium',
      },
      {
        jiraKey: 'PROJ-125',
        title: 'Set up CI/CD pipeline',
        description: 'Configure automated deployment with GitHub Actions',
        issueType: 'Task',
        status: 'To Do',
        priority: 'High',
      },
      {
        jiraKey: 'PROJ-126',
        title: 'Write API documentation',
        description: 'Document all REST endpoints with examples',
        issueType: 'Task',
        status: 'To Do',
        priority: 'Low',
      },
      {
        jiraKey: 'PROJ-127',
        title: 'Add error logging',
        description: 'Implement error tracking system with Sentry',
        issueType: 'Story',
        status: 'To Do',
        priority: 'Medium',
      },
      {
        jiraKey: 'PROJ-128',
        title: 'Optimize database queries',
        description: 'Improve query performance for user dashboard',
        issueType: 'Task',
        status: 'In Progress',
        priority: 'High',
      },
    ];

    for (let i = 0; i < sampleTasks.length; i++) {
      const task = sampleTasks[i];
      const taskId = uuidv4();

      await dbPromise.run(
        `INSERT INTO tasks (id, session_id, jira_key, title, description, issue_type, status, priority, column_id, task_order, metadata, tag_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          sessionId,
          task.jiraKey,
          task.title,
          task.description,
          task.issueType,
          task.status,
          task.priority,
          'unsorted',
          i,
          JSON.stringify({
            priority: task.priority,
            issueType: task.issueType,
          }),
          defaultTagId,
        ]
      );
    }

    res.json({
      sessionId,
      roomCode,
      creatorId,
      creatorName,
    });
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session by room code
router.get('/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { userId } = req.query;
    const normalizedCode = roomCode.toLowerCase();

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [normalizedCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update participant presence if userId provided (heartbeat via polling)
    if (userId) {
      await touchParticipant(session.id, userId);
    }

    // Get participants
    const participants = await dbPromise.all(
      `SELECT * FROM participants WHERE session_id = ? ORDER BY joined_at ASC`,
      [session.id]
    );

    // Get columns
    const columns = await dbPromise.all(
      `SELECT * FROM columns WHERE session_id = ? ORDER BY column_order ASC`,
      [session.id]
    );

    // Get tasks with comment counts
    const tasks = await dbPromise.all(
      `SELECT t.*, COALESCE(c.cnt, 0) as comment_count
       FROM tasks t
       LEFT JOIN (SELECT task_id, COUNT(*) as cnt FROM comments GROUP BY task_id) c ON c.task_id = t.id
       WHERE t.session_id = ?
       ORDER BY t.task_order ASC`,
      [session.id]
    );

    // Get tags
    const tags = await dbPromise.all(
      `SELECT * FROM tags WHERE session_id = ? ORDER BY is_builtin DESC, created_at ASC`,
      [session.id]
    );

    // Parse metadata; keep UUID as id, expose jira_key as display_id
    const processedTasks = tasks.map((task) => ({
      ...task,
      display_id: task.jira_key || task.id,
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
    }));

    // Parse skipped_participants JSON and normalize turn fields
    const processedSession = {
      ...session,
      skipped_participants: session.skipped_participants
        ? JSON.parse(session.skipped_participants)
        : [],
      stack_mode: !!session.stack_mode,
    };

    // Update session activity (viewing the session counts as activity)
    await touchSessionByRoomCode(normalizedCode);

    res.json({
      session: processedSession,
      participants,
      columns,
      tasks: processedTasks,
      tags,
      config: {
        offlineThresholdSeconds: OFFLINE_THRESHOLD_S,
      },
    });
  } catch (err) {
    console.error('Error fetching session:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Join a session
router.post('/:roomCode/join', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const normalizedCode = roomCode.toLowerCase();
    const { userId, userName } = req.body;

    // Validate input
    if (!userId || !userName) {
      return res.status(400).json({ error: 'userId and userName required' });
    }

    if (typeof userId !== 'string' || typeof userName !== 'string') {
      return res.status(400).json({ error: 'Invalid input types' });
    }

    // Validate room code format (should be 2-3 words separated by dashes)
    if (
      !roomCode ||
      typeof roomCode !== 'string' ||
      !roomCode.match(/^[a-z0-9]+-[a-z0-9]+(-[a-z0-9]+)?$/i)
    ) {
      console.warn(
        `[SECURITY] Invalid room code format attempted: ${roomCode}`
      );
      return res.status(400).json({ error: 'Invalid room code format' });
    }

    // Validate userName length
    if (userName.trim().length < 1 || userName.trim().length > 100) {
      return res
        .status(400)
        .json({ error: 'Username must be between 1 and 100 characters' });
    }

    // Validate userId format (should be UUID)
    if (
      !userId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      console.warn(`[SECURITY] Invalid userId format attempted: ${userId}`);
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    console.log(
      `[JOIN] Attempting to join session: ${roomCode} (normalized: ${normalizedCode}) as user: ${userName} (${userId})`
    );

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [normalizedCode]
    );

    if (!session) {
      console.log(`[JOIN] Session not found with room code: ${normalizedCode}`);
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`[JOIN] Found session: ${session.id}`);

    // Check if user already in session
    const existing = await dbPromise.get(
      `SELECT * FROM participants WHERE session_id = ? AND user_id = ?`,
      [session.id, userId]
    );

    if (existing) {
      console.log(`[JOIN] User already in session`);
      return res.json({ success: true, sessionId: session.id });
    }

    // Check if username is already taken in this session
    const usernameTaken = await dbPromise.get(
      `SELECT * FROM participants WHERE session_id = ? AND LOWER(user_name) = LOWER(?)`,
      [session.id, userName]
    );

    if (usernameTaken) {
      console.log(`[JOIN] Username already taken: ${userName}`);
      return res
        .status(400)
        .json({ error: 'That username is already taken in this session' });
    }

    // Add participant
    const participantId = uuidv4();
    console.log(
      `[JOIN] Adding participant: ${participantId} to session ${session.id}`
    );

    await dbPromise.run(
      `INSERT INTO participants (id, session_id, user_id, user_name) VALUES (?, ?, ?, ?)`,
      [participantId, session.id, userId, userName]
    );

    // Update session activity
    await touchSessionByRoomCode(normalizedCode);

    console.log(`[JOIN] Successfully added participant`);

    res.json({ success: true, sessionId: session.id });
  } catch (err) {
    console.error('Error joining session:', err);
    res.status(500).json({ error: 'Failed to join session' });
  }
});

// Update session settings (Jira base URL, skipped participants)
router.patch('/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const {
      jira_base_url,
      skipped_participants,
      current_turn_user_id,
      turn_started_at,
      stack_mode,
    } = req.body;

    // Get session
    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = LOWER(?)`,
      [roomCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Build dynamic update query based on what's provided
    const updates = [];
    const values = [];

    if (jira_base_url !== undefined) {
      updates.push('jira_base_url = ?');
      values.push(jira_base_url);
    }

    if (skipped_participants !== undefined) {
      updates.push('skipped_participants = ?');
      // Store as JSON string
      values.push(JSON.stringify(skipped_participants));
    }

    if (current_turn_user_id !== undefined) {
      updates.push('current_turn_user_id = ?');
      values.push(current_turn_user_id);
    }

    if (turn_started_at !== undefined) {
      updates.push('turn_started_at = ?');
      values.push(turn_started_at);
    }

    if (stack_mode !== undefined) {
      updates.push('stack_mode = ?');
      values.push(stack_mode ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(session.id);
    await dbPromise.run(
      `UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // If skipped_participants changed, check if current turn user is now skipped
    if (skipped_participants !== undefined) {
      const updatedSession = await dbPromise.get(
        `SELECT * FROM sessions WHERE id = ?`,
        [session.id]
      );
      const skippedList = skipped_participants || [];
      if (
        updatedSession.current_turn_user_id &&
        skippedList.includes(updatedSession.current_turn_user_id)
      ) {
        // Auto-advance turn
        const participants = await dbPromise.all(
          `SELECT * FROM participants WHERE session_id = ? ORDER BY joined_at ASC`,
          [session.id]
        );
        const rotation = participants.filter(
          (p) => !skippedList.includes(p.user_id)
        );
        if (rotation.length > 0) {
          const currentIndex = rotation.findIndex(
            (p) => p.user_id === updatedSession.current_turn_user_id
          );
          const nextIndex =
            currentIndex === -1 ? 0 : (currentIndex + 1) % rotation.length;
          await dbPromise.run(
            `UPDATE sessions SET current_turn_user_id = ?, turn_started_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [rotation[nextIndex].user_id, session.id]
          );
        } else {
          // All participants are disabled — clear the turn so nobody can act
          await dbPromise.run(
            `UPDATE sessions SET current_turn_user_id = NULL, turn_started_at = NULL WHERE id = ?`,
            [session.id]
          );
        }
      }

      // If turn is currently null (all were disabled) and we now have active participants,
      // assign the turn to the first active participant
      const currentSession = await dbPromise.get(
        `SELECT current_turn_user_id FROM sessions WHERE id = ?`,
        [session.id]
      );
      if (!currentSession.current_turn_user_id) {
        const participants = await dbPromise.all(
          `SELECT * FROM participants WHERE session_id = ? ORDER BY joined_at ASC`,
          [session.id]
        );
        const activeRotation = participants.filter(
          (p) => !skippedList.includes(p.user_id)
        );
        if (activeRotation.length > 0) {
          await dbPromise.run(
            `UPDATE sessions SET current_turn_user_id = ?, turn_started_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [activeRotation[0].user_id, session.id]
          );
        }
      }
    }

    // Update session activity
    await touchSessionByRoomCode(roomCode.toLowerCase());

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating session:', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// End current turn and advance to next participant
router.post('/:roomCode/end-turn', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = LOWER(?)`,
      [roomCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Auth: allow if userId is the current turn user or the creator
    if (
      userId !== session.current_turn_user_id &&
      userId !== session.creator_id
    ) {
      return res.status(403).json({
        error: 'Only the current turn user or session creator can end the turn',
      });
    }

    // Get participants ordered by joined_at, filter out skipped
    const participants = await dbPromise.all(
      `SELECT * FROM participants WHERE session_id = ? ORDER BY joined_at ASC`,
      [session.id]
    );

    const skippedList = session.skipped_participants
      ? JSON.parse(session.skipped_participants)
      : [];
    const rotation = participants.filter(
      (p) => !skippedList.includes(p.user_id)
    );

    if (rotation.length === 0) {
      return res
        .status(400)
        .json({ error: 'No active participants in rotation' });
    }

    // Find current turn index and advance
    const currentIndex = rotation.findIndex(
      (p) => p.user_id === session.current_turn_user_id
    );
    const nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + 1) % rotation.length;
    const nextUserId = rotation[nextIndex].user_id;

    await dbPromise.run(
      `UPDATE sessions SET current_turn_user_id = ?, turn_started_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [nextUserId, session.id]
    );

    // Update session activity
    await touchSessionByRoomCode(roomCode.toLowerCase());

    res.json({
      success: true,
      current_turn_user_id: nextUserId,
      turn_started_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error ending turn:', err);
    res.status(500).json({ error: 'Failed to end turn' });
  }
});

// Transfer session ownership to another participant
router.post('/:roomCode/transfer-ownership', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { userId, newOwnerId } = req.body;

    if (!userId || !newOwnerId) {
      return res.status(400).json({ error: 'userId and newOwnerId required' });
    }

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = LOWER(?)`,
      [roomCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Only the current owner can transfer ownership
    if (userId !== session.creator_id) {
      return res
        .status(403)
        .json({ error: 'Only the session owner can transfer ownership' });
    }

    // Validate new owner is a participant
    const newOwner = await dbPromise.get(
      `SELECT * FROM participants WHERE session_id = ? AND user_id = ?`,
      [session.id, newOwnerId]
    );

    if (!newOwner) {
      return res
        .status(400)
        .json({ error: 'New owner must be a participant in the session' });
    }

    // Cannot transfer to yourself
    if (newOwnerId === session.creator_id) {
      return res
        .status(400)
        .json({ error: 'You are already the session owner' });
    }

    await dbPromise.run(
      `UPDATE sessions SET creator_id = ?, creator_name = ? WHERE id = ?`,
      [newOwnerId, newOwner.user_name, session.id]
    );

    // Update session activity
    await touchSessionByRoomCode(roomCode.toLowerCase());

    console.log(
      `[TRANSFER] Ownership transferred in session ${roomCode}: ${session.creator_name} -> ${newOwner.user_name}`
    );

    res.json({ success: true, newOwnerId, newOwnerName: newOwner.user_name });
  } catch (err) {
    console.error('Error transferring ownership:', err);
    res.status(500).json({ error: 'Failed to transfer ownership' });
  }
});

// Create a new column in a session
router.post('/:roomCode/columns', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { columnId, name, order } = req.body;

    if (!columnId || !name) {
      return res.status(400).json({ error: 'columnId and name required' });
    }

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if column already exists
    const existing = await dbPromise.get(
      `SELECT * FROM columns WHERE id = ? AND session_id = ?`,
      [columnId, session.id]
    );

    if (existing) {
      return res.json({ success: true, column: existing });
    }

    // Create new column
    const newOrder = order !== undefined ? order : Date.now();
    await dbPromise.run(
      `INSERT INTO columns (id, session_id, name, column_order, created_by) VALUES (?, ?, ?, ?, ?)`,
      [columnId, session.id, name, newOrder, 'system']
    );

    res.json({
      success: true,
      column: {
        id: columnId,
        name: name,
        column_order: newOrder,
      },
    });
  } catch (err) {
    console.error('Error creating column:', err);
    res.status(500).json({ error: 'Failed to create column' });
  }
});

// Delete a column from a session
router.delete('/:roomCode/columns/:columnId', async (req, res) => {
  try {
    const { roomCode, columnId } = req.params;

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Delete the column
    await dbPromise.run(`DELETE FROM columns WHERE id = ? AND session_id = ?`, [
      columnId,
      session.id,
    ]);

    res.json({
      success: true,
      message: 'Column deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting column:', err);
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

// End a session (leader only)
router.post('/:roomCode/end', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = LOWER(?)`,
      [roomCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (userId !== session.creator_id) {
      return res
        .status(403)
        .json({ error: 'Only the session creator can end the session' });
    }

    if (session.ended_at) {
      return res.status(400).json({ error: 'Session already ended' });
    }

    // Set ended_at
    await dbPromise.run(
      `UPDATE sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [session.id]
    );

    // Auto-assign Fibonacci point values to columns in column_order
    const columns = await dbPromise.all(
      `SELECT * FROM columns WHERE session_id = ? ORDER BY column_order ASC`,
      [session.id]
    );

    const fibonacci = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    for (let i = 0; i < columns.length; i++) {
      const pointValue =
        i < fibonacci.length ? fibonacci[i] : fibonacci[fibonacci.length - 1];
      await dbPromise.run(`UPDATE columns SET point_value = ? WHERE id = ?`, [
        pointValue,
        columns[i].id,
      ]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error ending session:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Get session report
router.get('/:roomCode/report', async (req, res) => {
  try {
    const { roomCode } = req.params;

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = LOWER(?)`,
      [roomCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.ended_at) {
      return res.status(400).json({ error: 'Session has not ended yet' });
    }

    const participants = await dbPromise.all(
      `SELECT * FROM participants WHERE session_id = ? ORDER BY joined_at ASC`,
      [session.id]
    );

    const columns = await dbPromise.all(
      `SELECT * FROM columns WHERE session_id = ? ORDER BY column_order ASC`,
      [session.id]
    );

    const tasks = await dbPromise.all(
      `SELECT * FROM tasks WHERE session_id = ? ORDER BY task_order ASC`,
      [session.id]
    );

    const comments = await dbPromise.all(
      `SELECT * FROM comments WHERE session_id = ? ORDER BY created_at ASC`,
      [session.id]
    );

    const tags = await dbPromise.all(
      `SELECT * FROM tags WHERE session_id = ? ORDER BY is_builtin DESC, created_at ASC`,
      [session.id]
    );

    // Nest comments per task
    const commentsByTask = {};
    for (const comment of comments) {
      if (!commentsByTask[comment.task_id]) {
        commentsByTask[comment.task_id] = [];
      }
      commentsByTask[comment.task_id].push(comment);
    }

    const processedTasks = tasks.map((task) => ({
      ...task,
      display_id: task.jira_key || task.id,
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
      comments: commentsByTask[task.id] || [],
    }));

    res.json({
      session: {
        ...session,
        skipped_participants: session.skipped_participants
          ? JSON.parse(session.skipped_participants)
          : [],
      },
      participants,
      columns,
      tasks: processedTasks,
      tags,
    });
  } catch (err) {
    console.error('Error fetching report:', err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Update a column's point value
router.patch('/:roomCode/columns/:columnId/point-value', async (req, res) => {
  try {
    const { roomCode, columnId } = req.params;
    const { userId, pointValue } = req.body;

    if (!userId || pointValue === undefined) {
      return res.status(400).json({ error: 'userId and pointValue required' });
    }

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = LOWER(?)`,
      [roomCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (userId !== session.creator_id) {
      return res
        .status(403)
        .json({ error: 'Only the session creator can update point values' });
    }

    await dbPromise.run(
      `UPDATE columns SET point_value = ? WHERE id = ? AND session_id = ?`,
      [pointValue, columnId, session.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating column point value:', err);
    res.status(500).json({ error: 'Failed to update point value' });
  }
});

// Apply a scale preset to all columns
router.post('/:roomCode/columns/apply-scale', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { userId, scale } = req.body;

    if (!userId || !scale) {
      return res.status(400).json({ error: 'userId and scale required' });
    }

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = LOWER(?)`,
      [roomCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (userId !== session.creator_id) {
      return res
        .status(403)
        .json({ error: 'Only the session creator can apply scales' });
    }

    const columns = await dbPromise.all(
      `SELECT * FROM columns WHERE session_id = ? ORDER BY column_order ASC`,
      [session.id]
    );

    const scales = {
      fibonacci: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
      powers_of_2: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
      tshirt: [1, 2, 3, 5, 8, 13],
      linear: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    };

    const scaleValues = scales[scale];
    if (!scaleValues) {
      return res.status(400).json({
        error: 'Invalid scale. Use: fibonacci, powers_of_2, tshirt, linear',
      });
    }

    for (let i = 0; i < columns.length; i++) {
      const pointValue =
        i < scaleValues.length
          ? scaleValues[i]
          : scaleValues[scaleValues.length - 1];
      await dbPromise.run(`UPDATE columns SET point_value = ? WHERE id = ?`, [
        pointValue,
        columns[i].id,
      ]);
    }

    // Return updated columns
    const updatedColumns = await dbPromise.all(
      `SELECT * FROM columns WHERE session_id = ? ORDER BY column_order ASC`,
      [session.id]
    );

    res.json({ success: true, columns: updatedColumns });
  } catch (err) {
    console.error('Error applying scale:', err);
    res.status(500).json({ error: 'Failed to apply scale' });
  }
});

module.exports = router;
