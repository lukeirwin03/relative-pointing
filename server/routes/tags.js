const express = require('express');
const { dbPromise, touchSessionByRoomCode } = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router({ mergeParams: true });

// Get all tags for a session
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

    const tags = await dbPromise.all(
      `SELECT * FROM tags WHERE session_id = ? ORDER BY is_builtin DESC, created_at ASC`,
      [session.id]
    );

    res.json(tags);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Create a custom tag
router.post('/', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { name, color } = req.body;

    if (!name || !color) {
      return res.status(400).json({ error: 'name and color required' });
    }

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const tagId = uuidv4();
    await dbPromise.run(
      `INSERT INTO tags (id, session_id, name, color, is_builtin) VALUES (?, ?, ?, ?, 0)`,
      [tagId, session.id, name.trim(), color]
    );

    await touchSessionByRoomCode(roomCode.toLowerCase());

    res.json({
      id: tagId,
      session_id: session.id,
      name: name.trim(),
      color,
      is_builtin: 0,
    });
  } catch (err) {
    console.error('Error creating tag:', err);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Delete a custom tag (non-builtin only)
router.delete('/:tagId', async (req, res) => {
  try {
    const { roomCode, tagId } = req.params;

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE LOWER(room_code) = ?`,
      [roomCode.toLowerCase()]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const tag = await dbPromise.get(
      `SELECT * FROM tags WHERE id = ? AND session_id = ?`,
      [tagId, session.id]
    );

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    if (tag.is_builtin) {
      return res.status(400).json({ error: 'Cannot delete built-in tags' });
    }

    // Clear tag_id from tasks using this tag
    await dbPromise.run(
      `UPDATE tasks SET tag_id = NULL WHERE tag_id = ? AND session_id = ?`,
      [tagId, session.id]
    );

    await dbPromise.run(`DELETE FROM tags WHERE id = ? AND session_id = ?`, [
      tagId,
      session.id,
    ]);

    await touchSessionByRoomCode(roomCode.toLowerCase());

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting tag:', err);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

module.exports = router;
