const express = require('express');
const { dbPromise, touchSessionByRoomCode } = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router({ mergeParams: true });

// Upload tasks to session
router.post('/', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { tasks, jiraBaseUrl } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'tasks must be an array' });
    }

    // Get session (case-insensitive for room code)
    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update jira_base_url if provided
    if (jiraBaseUrl) {
      await dbPromise.run(
        `UPDATE sessions SET jira_base_url = ? WHERE id = ?`,
        [jiraBaseUrl, session.id]
      );
    }

    // Insert tasks
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskId = uuidv4();

      await dbPromise.run(
        `INSERT INTO tasks (id, session_id, jira_key, title, description, issue_type, status, priority, column_id, task_order, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          session.id,
          task.jiraKey || null,
          task.title || '',
          task.description || '',
          task.issueType || '',
          task.status || '',
          task.priority || '',
          'unsorted',
          i,
          JSON.stringify(task.metadata || {}),
        ]
      );
    }

    // Update session activity
    await touchSessionByRoomCode(roomCode.toLowerCase());

    res.json({ success: true, tasksCreated: tasks.length });
  } catch (err) {
    console.error('Error uploading tasks:', err);
    res.status(500).json({ error: 'Failed to upload tasks' });
  }
});

// Create a new task
router.post('/create', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { issueKey, title, description } = req.body;

    if (!issueKey || issueKey.trim() === '') {
      return res.status(400).json({ error: 'Issue key is required' });
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get session
    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get the max task_order to add new task at the end
    const maxOrder = await dbPromise.get(
      `SELECT MAX(task_order) as max_order FROM tasks WHERE session_id = ?`,
      [session.id]
    );

    const taskId = uuidv4();
    const newOrder = (maxOrder?.max_order || 0) + 1;

    await dbPromise.run(
      `INSERT INTO tasks (id, session_id, jira_key, title, description, column_id, task_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        session.id,
        issueKey.trim(),
        title.trim(),
        description?.trim() || '',
        'unsorted',
        newOrder,
      ]
    );

    // Update session activity
    await touchSessionByRoomCode(roomCode.toLowerCase());

    res.json({
      success: true,
      task: {
        id: taskId,
        display_id: issueKey.trim(),
        title: title.trim(),
        description: description?.trim() || '',
        column_id: 'unsorted',
        task_order: newOrder,
      },
    });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Delete a task
router.delete('/:taskId', async (req, res) => {
  try {
    const { roomCode, taskId } = req.params;

    // Get session (case-insensitive for room code)
    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Find task by either database id or jira_key (since frontend sends display id)
    const task = await dbPromise.get(
      `SELECT id FROM tasks WHERE session_id = ? AND (id = ? OR jira_key = ?)`,
      [session.id, taskId, taskId]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Delete task using actual database id
    await dbPromise.run(`DELETE FROM tasks WHERE id = ? AND session_id = ?`, [
      task.id,
      session.id,
    ]);

    console.log(`[DELETE] Task ${taskId} deleted`);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Update task color tag
router.patch('/:taskId/color', async (req, res) => {
  try {
    const { roomCode, taskId } = req.params;
    const { colorTag } = req.body;

    // Get session (case-insensitive for room code)
    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Find task by either database id or jira_key
    const task = await dbPromise.get(
      `SELECT id FROM tasks WHERE session_id = ? AND (id = ? OR jira_key = ?)`,
      [session.id, taskId, taskId]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update color tag (null to clear)
    await dbPromise.run(`UPDATE tasks SET color_tag = ? WHERE id = ?`, [
      colorTag || null,
      task.id,
    ]);

    // Update session activity
    await touchSessionByRoomCode(roomCode.toLowerCase());

    res.json({ success: true, colorTag: colorTag || null });
  } catch (err) {
    console.error('Error updating task color:', err);
    res.status(500).json({ error: 'Failed to update task color' });
  }
});

// Move task to column
router.put('/:taskId', async (req, res) => {
  try {
    const { roomCode, taskId } = req.params;
    const { columnId, assignedBy } = req.body;

    if (!columnId) {
      return res.status(400).json({ error: 'columnId required' });
    }

    // Get session (case-insensitive for room code)
    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Turn enforcement: only current turn user can move tasks
    // Skip enforcement when assignedBy is not a valid participant UUID (e.g. 'system' or null)
    const isValidParticipantId =
      assignedBy &&
      assignedBy.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );

    if (
      session.current_turn_user_id &&
      isValidParticipantId &&
      assignedBy !== session.current_turn_user_id
    ) {
      return res.status(403).json({ error: 'It is not your turn' });
    }

    // Reject moves from disabled/skipped participants
    if (isValidParticipantId) {
      const skippedList = JSON.parse(session.skipped_participants || '[]');
      if (skippedList.includes(assignedBy)) {
        return res
          .status(403)
          .json({ error: 'You are currently disabled and cannot move tasks' });
      }
    }

    // Find task by either database id or jira_key (since frontend sends display id)
    const task = await dbPromise.get(
      `SELECT id, column_id FROM tasks WHERE session_id = ? AND (id = ? OR jira_key = ?)`,
      [session.id, taskId, taskId]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Only update if the task is actually being moved to a different column
    if (task.column_id !== columnId) {
      await dbPromise.run(
        `UPDATE tasks SET column_id = ?, assigned_by = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ? AND session_id = ?`,
        [columnId, assignedBy, task.id, session.id]
      );
      console.log(
        `[MOVE] Task ${taskId} moved from ${task.column_id} to ${columnId}`
      );

      // Update session activity
      await touchSessionByRoomCode(roomCode.toLowerCase());
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error moving task:', err);
    res.status(500).json({ error: 'Failed to move task' });
  }
});

// Create a new task
router.post('/create-task', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { issueKey, title, description } = req.body;

    if (!issueKey || issueKey.trim() === '') {
      return res.status(400).json({ error: 'Issue key is required' });
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get session
    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get the max task_order to add new task at the end
    const maxOrder = await dbPromise.get(
      `SELECT MAX(task_order) as max_order FROM tasks WHERE session_id = ?`,
      [session.id]
    );

    const taskId = uuidv4();
    const newOrder = (maxOrder?.max_order || 0) + 1;

    await dbPromise.run(
      `INSERT INTO tasks (id, session_id, jira_key, title, description, column_id, task_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        session.id,
        issueKey.trim(),
        title.trim(),
        description?.trim() || '',
        'unsorted',
        newOrder,
      ]
    );

    // Update session activity
    await touchSessionByRoomCode(roomCode.toLowerCase());

    res.json({
      success: true,
      task: {
        id: taskId,
        display_id: issueKey.trim(),
        title: title.trim(),
        description: description?.trim() || '',
        column_id: 'unsorted',
        task_order: newOrder,
      },
    });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Skip top unsorted task (move to bottom of unsorted)
router.post('/skip-top', async (req, res) => {
  try {
    const { roomCode } = req.params;

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Find the unsorted task with lowest task_order
    const topTask = await dbPromise.get(
      `SELECT * FROM tasks WHERE session_id = ? AND column_id = 'unsorted' ORDER BY task_order ASC LIMIT 1`,
      [session.id]
    );

    if (!topTask) {
      return res.status(400).json({ error: 'No unsorted tasks to skip' });
    }

    // Get the max task_order among unsorted tasks
    const maxOrder = await dbPromise.get(
      `SELECT MAX(task_order) as max_order FROM tasks WHERE session_id = ? AND column_id = 'unsorted'`,
      [session.id]
    );

    const newOrder = (maxOrder?.max_order || 0) + 1;

    await dbPromise.run(`UPDATE tasks SET task_order = ? WHERE id = ?`, [
      newOrder,
      topTask.id,
    ]);

    // Update session activity
    await touchSessionByRoomCode(roomCode.toLowerCase());

    res.json({ success: true, skippedTaskId: topTask.id });
  } catch (err) {
    console.error('Error skipping top task:', err);
    res.status(500).json({ error: 'Failed to skip task' });
  }
});

// Get tasks for session
router.get('/', async (req, res) => {
  try {
    const { roomCode } = req.params;

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const tasks = await dbPromise.all(
      `SELECT * FROM tasks WHERE session_id = ? ORDER BY task_order ASC`,
      [session.id]
    );

    const processed = tasks.map((task) => ({
      ...task,
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
    }));

    res.json(processed);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

module.exports = router;
