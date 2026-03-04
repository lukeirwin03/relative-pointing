const express = require('express');
const { dbPromise, touchSessionByRoomCode } = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router({ mergeParams: true });

// Get comments for a task
router.get('/', async (req, res) => {
  try {
    const { roomCode, taskId } = req.params;

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const comments = await dbPromise.all(
      `SELECT * FROM comments WHERE task_id = ? AND session_id = ? ORDER BY created_at ASC`,
      [taskId, session.id]
    );

    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add a comment to a task
router.post('/', async (req, res) => {
  try {
    const { roomCode, taskId } = req.params;
    const { userId, userName, content } = req.body;

    if (!userId || !userName || !content) {
      return res
        .status(400)
        .json({ error: 'userId, userName, and content required' });
    }

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const commentId = uuidv4();
    await dbPromise.run(
      `INSERT INTO comments (id, task_id, session_id, user_id, user_name, content) VALUES (?, ?, ?, ?, ?, ?)`,
      [commentId, taskId, session.id, userId, userName, content.trim()]
    );

    await touchSessionByRoomCode(roomCode.toLowerCase());

    res.json({
      id: commentId,
      task_id: taskId,
      session_id: session.id,
      user_id: userId,
      user_name: userName,
      content: content.trim(),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
