const express = require('express');
const { dbPromise } = require('../db');

const router = express.Router({ mergeParams: true });

// Get current turn
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

    const turn = await dbPromise.get(
      `SELECT * FROM turns WHERE session_id = ?`,
      [session.id]
    );

    if (!turn) {
      return res.status(404).json({ error: 'Turn info not found' });
    }

    res.json({
      currentTurnUserId: turn.current_turn_user_id,
      turnOrder: JSON.parse(turn.turn_order)
    });
  } catch (err) {
    console.error('Error fetching turn:', err);
    res.status(500).json({ error: 'Failed to fetch turn' });
  }
});

// Advance turn
router.post('/advance', async (req, res) => {
  try {
    const { roomCode } = req.params;

    const session = await dbPromise.get(
      `SELECT * FROM sessions WHERE room_code = ?`,
      [roomCode]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const turn = await dbPromise.get(
      `SELECT * FROM turns WHERE session_id = ?`,
      [session.id]
    );

    if (!turn) {
      return res.status(404).json({ error: 'Turn info not found' });
    }

    const turnOrder = JSON.parse(turn.turn_order);
    if (turnOrder.length === 0) {
      return res.status(400).json({ error: 'No participants in turn order' });
    }

    // Find current turn index
    const currentIndex = turnOrder.indexOf(turn.current_turn_user_id);
    const nextIndex = (currentIndex + 1) % turnOrder.length;
    const nextUserId = turnOrder[nextIndex];

    await dbPromise.run(
      `UPDATE turns SET current_turn_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?`,
      [nextUserId, session.id]
    );

    res.json({
      currentTurnUserId: nextUserId,
      turnOrder
    });
  } catch (err) {
    console.error('Error advancing turn:', err);
    res.status(500).json({ error: 'Failed to advance turn' });
  }
});

module.exports = router;
