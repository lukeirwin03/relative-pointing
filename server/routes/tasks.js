const express = require('express');
const { dbPromise } = require('../db');
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

    // Get session
    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE room_code = ?`,
      [roomCode]
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
          JSON.stringify(task.metadata || {})
        ]
      );
    }

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
      `SELECT * FROM sessions WHERE room_code = ?`,
      [roomCode]
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
        newOrder
      ]
    );

    res.json({
      success: true,
      task: {
        id: issueKey.trim(),
        title: title.trim(),
        description: description?.trim() || '',
        column_id: 'unsorted',
        task_order: newOrder
      }
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

    // Get session
    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE room_code = ?`,
      [roomCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Delete task
    await dbPromise.run(
      `DELETE FROM tasks WHERE id = ? AND session_id = ?`,
      [taskId, session.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
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

    // Get session
    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE room_code = ?`,
      [roomCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update task
    await dbPromise.run(
      `UPDATE tasks SET column_id = ?, assigned_by = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ? AND session_id = ?`,
      [columnId, assignedBy, taskId, session.id]
    );

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
      `SELECT * FROM sessions WHERE room_code = ?`,
      [roomCode]
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
        newOrder
      ]
    );

    res.json({
      success: true,
      task: {
        id: issueKey.trim(),
        title: title.trim(),
        description: description?.trim() || '',
        column_id: 'unsorted',
        task_order: newOrder
      }
    });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get tasks for session
router.get('/', async (req, res) => {
  try {
    const { roomCode } = req.params;

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE room_code = ?`,
      [roomCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const tasks = await dbPromise.all(
      `SELECT * FROM tasks WHERE session_id = ? ORDER BY task_order ASC`,
      [session.id]
    );

    const processed = tasks.map(task => ({
      ...task,
      metadata: task.metadata ? JSON.parse(task.metadata) : {}
    }));

    res.json(processed);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

module.exports = router;
