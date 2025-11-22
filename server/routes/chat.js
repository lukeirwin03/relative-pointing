const express = require('express');
const { dbPromise } = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router({ mergeParams: true });

// Get chat messages
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

    const messages = await dbPromise.all(
      `SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
      [session.id]
    );

    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send chat message
router.post('/', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { userId, userName, message } = req.body;

    if (!userId || !userName || !message) {
      return res.status(400).json({ error: 'userId, userName, and message required' });
    }

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE room_code = ?`,
      [roomCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messageId = uuidv4();
    await dbPromise.run(
      `INSERT INTO chat_messages (id, session_id, user_id, user_name, message) VALUES (?, ?, ?, ?, ?)`,
      [messageId, session.id, userId, userName, message]
    );

    res.json({
      id: messageId,
      sessionId: session.id,
      userId,
      userName,
      message,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
