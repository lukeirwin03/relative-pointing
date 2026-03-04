const express = require('express');
const { dbPromise, touchSessionByRoomCode } = require('../db');
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
    const roomCode = generateRoomCode();

    console.log(`[CREATE] Creating session with room code: ${roomCode}`);

    // Create session
    await dbPromise.run(
      `INSERT INTO sessions (id, room_code, creator_id, creator_name, last_activity_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [sessionId, roomCode, creatorId, creatorName]
    );

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
        `INSERT INTO tasks (id, session_id, jira_key, title, description, issue_type, status, priority, column_id, task_order, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    const normalizedCode = roomCode.toLowerCase();

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [normalizedCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
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

    // Get tasks
    const tasks = await dbPromise.all(
      `SELECT * FROM tasks WHERE session_id = ? ORDER BY task_order ASC`,
      [session.id]
    );

    // Parse metadata and use jiraKey as display id if available
    const processedTasks = tasks.map((task) => ({
      ...task,
      // Use jiraKey as the display id if available, otherwise use the UUID id
      id: task.jira_key || task.id,
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
    }));

    // Parse skipped_participants JSON
    const processedSession = {
      ...session,
      skipped_participants: session.skipped_participants
        ? JSON.parse(session.skipped_participants)
        : [],
    };

    // Update session activity (viewing the session counts as activity)
    await touchSessionByRoomCode(normalizedCode);

    res.json({
      session: processedSession,
      participants,
      columns,
      tasks: processedTasks,
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
    const { jira_base_url, skipped_participants } = req.body;

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

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(session.id);
    await dbPromise.run(
      `UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Update session activity
    await touchSessionByRoomCode(roomCode.toLowerCase());

    res.json({ success: true, jira_base_url, skipped_participants });
  } catch (err) {
    console.error('Error updating session:', err);
    res.status(500).json({ error: 'Failed to update session' });
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

module.exports = router;
