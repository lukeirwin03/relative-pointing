const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Session inactivity timeout (15 minutes)
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

// Presence thresholds (configurable via env for testing)
const OFFLINE_THRESHOLD_S = parseInt(process.env.OFFLINE_THRESHOLD_S, 10) || 15;
const AUTO_SKIP_TURN_S = parseInt(process.env.AUTO_SKIP_TURN_S, 10) || 30;
const AUTO_TRANSFER_OWNER_S =
  parseInt(process.env.AUTO_TRANSFER_OWNER_S, 10) || 60;

const DB_PATH = path.join(__dirname, 'app.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database at', DB_PATH);
    initializeDatabase();
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

function initializeDatabase() {
  // Run migrations first to add any missing columns to existing tables
  runMigrations(() => {
    // Then run schema to create any missing tables/indexes
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

    // Split schema by statements and execute each one sequentially
    const statements = schema.split(';').filter((stmt) => stmt.trim());

    let index = 0;

    const executeNextStatement = () => {
      if (index >= statements.length) {
        console.log('Database schema initialized');
        // Start the cleanup job and presence check
        startSessionCleanup();
        startPresenceCheck();
        return;
      }

      const statement = statements[index];
      index++;

      db.run(statement + ';', (err) => {
        if (
          err &&
          !err.message.includes('already exists') &&
          !err.message.includes('no such column')
        ) {
          console.error('Error executing schema:', err);
        }
        executeNextStatement();
      });
    };

    executeNextStatement();
  });
}

// Add missing columns to existing databases
function runMigrations(callback) {
  // Migration 1: Add last_activity_at column if it doesn't exist
  db.run(`ALTER TABLE sessions ADD COLUMN last_activity_at DATETIME`, (err) => {
    if (err && err.message.includes('duplicate column')) {
      console.log('Migration: last_activity_at column already exists');
    } else if (!err) {
      console.log('Migration: Added last_activity_at column to sessions');
      db.run(`UPDATE sessions SET last_activity_at = CURRENT_TIMESTAMP`, () => {
        console.log(
          'Migration: Updated existing sessions with current timestamp'
        );
      });
    }

    // Migration 2: Add color_tag column to tasks if it doesn't exist
    db.run(`ALTER TABLE tasks ADD COLUMN color_tag TEXT`, (err2) => {
      if (err2 && err2.message.includes('duplicate column')) {
        console.log('Migration: color_tag column already exists');
      } else if (!err2) {
        console.log('Migration: Added color_tag column to tasks');
      }

      // Migration 3: Add skipped_participants column to sessions if it doesn't exist
      db.run(
        `ALTER TABLE sessions ADD COLUMN skipped_participants TEXT`,
        (err3) => {
          if (err3 && err3.message.includes('duplicate column')) {
            console.log(
              'Migration: skipped_participants column already exists'
            );
          } else if (!err3) {
            console.log(
              'Migration: Added skipped_participants column to sessions'
            );
          }

          // Migration 4: Add current_turn_user_id column
          db.run(
            `ALTER TABLE sessions ADD COLUMN current_turn_user_id TEXT`,
            (err4) => {
              if (err4 && err4.message.includes('duplicate column')) {
                console.log(
                  'Migration: current_turn_user_id column already exists'
                );
              } else if (!err4) {
                console.log(
                  'Migration: Added current_turn_user_id column to sessions'
                );
              }

              // Migration 5: Add turn_started_at column
              db.run(
                `ALTER TABLE sessions ADD COLUMN turn_started_at DATETIME`,
                (err5) => {
                  if (err5 && err5.message.includes('duplicate column')) {
                    console.log(
                      'Migration: turn_started_at column already exists'
                    );
                  } else if (!err5) {
                    console.log(
                      'Migration: Added turn_started_at column to sessions'
                    );
                  }

                  // Migration 6: Add stack_mode column
                  db.run(
                    `ALTER TABLE sessions ADD COLUMN stack_mode INTEGER DEFAULT 1`,
                    (err6) => {
                      if (err6 && err6.message.includes('duplicate column')) {
                        console.log(
                          'Migration: stack_mode column already exists'
                        );
                      } else if (!err6) {
                        console.log(
                          'Migration: Added stack_mode column to sessions'
                        );
                      }

                      // Migration 7: Add last_seen_at column to participants
                      db.run(
                        `ALTER TABLE participants ADD COLUMN last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
                        (err7) => {
                          if (
                            err7 &&
                            err7.message.includes('duplicate column')
                          ) {
                            console.log(
                              'Migration: last_seen_at column already exists'
                            );
                          } else if (!err7) {
                            console.log(
                              'Migration: Added last_seen_at column to participants'
                            );
                            db.run(
                              `UPDATE participants SET last_seen_at = CURRENT_TIMESTAMP`,
                              () => {
                                console.log(
                                  'Migration: Initialized last_seen_at for existing participants'
                                );
                              }
                            );
                          }

                          // Migration 8: Add tag_id column to tasks
                          db.run(
                            `ALTER TABLE tasks ADD COLUMN tag_id TEXT`,
                            (err8) => {
                              if (
                                err8 &&
                                err8.message.includes('duplicate column')
                              ) {
                                console.log(
                                  'Migration: tag_id column already exists'
                                );
                              } else if (!err8) {
                                console.log(
                                  'Migration: Added tag_id column to tasks'
                                );
                              }

                              // Migration 9: Add ended_at column to sessions
                              db.run(
                                `ALTER TABLE sessions ADD COLUMN ended_at DATETIME`,
                                (err9) => {
                                  if (
                                    err9 &&
                                    err9.message.includes('duplicate column')
                                  ) {
                                    console.log(
                                      'Migration: ended_at column already exists'
                                    );
                                  } else if (!err9) {
                                    console.log(
                                      'Migration: Added ended_at column to sessions'
                                    );
                                  }

                                  // Migration 10: Add point_value column to columns
                                  db.run(
                                    `ALTER TABLE columns ADD COLUMN point_value REAL`,
                                    (err10) => {
                                      if (
                                        err10 &&
                                        err10.message.includes(
                                          'duplicate column'
                                        )
                                      ) {
                                        console.log(
                                          'Migration: point_value column already exists'
                                        );
                                      } else if (!err10) {
                                        console.log(
                                          'Migration: Added point_value column to columns'
                                        );
                                      }

                                      if (callback) callback();
                                    }
                                  );
                                }
                              );
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
}

// Clean up expired sessions (inactive for more than SESSION_TIMEOUT_MS)
function cleanupExpiredSessions() {
  // Format cutoff time to match SQLite's CURRENT_TIMESTAMP format (YYYY-MM-DD HH:MM:SS)
  const cutoffDate = new Date(Date.now() - SESSION_TIMEOUT_MS);
  const cutoffTime = cutoffDate
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');

  db.run(
    `DELETE FROM sessions WHERE last_activity_at IS NOT NULL AND last_activity_at < ? AND ended_at IS NULL`,
    [cutoffTime],
    function (err) {
      if (err) {
        console.error('Error cleaning up expired sessions:', err);
      } else if (this.changes > 0) {
        console.log(`Cleaned up ${this.changes} expired session(s)`);
      }
    }
  );
}

// Start periodic cleanup job (runs every minute)
function startSessionCleanup() {
  // Delay first cleanup by 5 seconds to allow migrations to complete
  setTimeout(() => {
    cleanupExpiredSessions();
    // Then run every minute
    setInterval(cleanupExpiredSessions, 60 * 1000);
    console.log(
      `Session cleanup job started (timeout: ${SESSION_TIMEOUT_MS / 1000 / 60} minutes)`
    );
  }, 5000);
}

// Update session activity timestamp
function touchSession(sessionId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [sessionId],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      }
    );
  });
}

// Update session activity by room code
function touchSessionByRoomCode(roomCode) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE LOWER(room_code) = LOWER(?)`,
      [roomCode],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      }
    );
  });
}

// Update participant last_seen_at timestamp
function touchParticipant(sessionId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE participants SET last_seen_at = CURRENT_TIMESTAMP WHERE session_id = ? AND user_id = ?`,
      [sessionId, userId],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      }
    );
  });
}

// Periodic presence check: auto-skip turns and auto-transfer ownership
function startPresenceCheck() {
  setInterval(async () => {
    try {
      const now = new Date();
      const skipCutoff = new Date(now.getTime() - AUTO_SKIP_TURN_S * 1000)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, '');
      const transferCutoff = new Date(
        now.getTime() - AUTO_TRANSFER_OWNER_S * 1000
      )
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, '');
      const onlineCutoff = new Date(now.getTime() - OFFLINE_THRESHOLD_S * 1000)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, '');

      // Get recently active sessions only (active within the last hour)
      const sessions = await dbPromise.all(
        `SELECT * FROM sessions WHERE last_activity_at > datetime('now', '-1 hour')`
      );

      for (const session of sessions) {
        const participants = await dbPromise.all(
          `SELECT * FROM participants WHERE session_id = ? ORDER BY joined_at ASC`,
          [session.id]
        );

        if (participants.length === 0) continue;

        const skippedList = session.skipped_participants
          ? JSON.parse(session.skipped_participants)
          : [];

        // --- Auto-skip turn if turn holder is offline ---
        if (session.current_turn_user_id) {
          const turnHolder = participants.find(
            (p) => p.user_id === session.current_turn_user_id
          );
          if (
            turnHolder &&
            turnHolder.last_seen_at &&
            turnHolder.last_seen_at < skipCutoff
          ) {
            // Turn holder has been offline for > AUTO_SKIP_TURN_S
            const rotation = participants.filter(
              (p) =>
                !skippedList.includes(p.user_id) &&
                p.last_seen_at &&
                p.last_seen_at >= onlineCutoff
            );

            if (rotation.length > 0) {
              const currentIndex = rotation.findIndex(
                (p) => p.user_id === session.current_turn_user_id
              );
              const nextIndex =
                currentIndex === -1 ? 0 : (currentIndex + 1) % rotation.length;
              await dbPromise.run(
                `UPDATE sessions SET current_turn_user_id = ?, turn_started_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [rotation[nextIndex].user_id, session.id]
              );
              console.log(
                `[PRESENCE] Auto-skipped turn in session ${session.room_code}: ${turnHolder.user_name} -> ${rotation[nextIndex].user_name}`
              );
            } else {
              // No online, non-skipped participants — clear the turn
              await dbPromise.run(
                `UPDATE sessions SET current_turn_user_id = NULL, turn_started_at = NULL WHERE id = ?`,
                [session.id]
              );
              console.log(
                `[PRESENCE] Cleared turn in session ${session.room_code} — no online active participants`
              );
            }
          }
        }

        // Re-read session to get fresh state after potential turn changes above
        const freshSession = await dbPromise.get(
          `SELECT * FROM sessions WHERE id = ?`,
          [session.id]
        );

        // If turn is null but there are online active participants, assign one
        if (!freshSession.current_turn_user_id) {
          const onlineActive = participants.filter(
            (p) =>
              !skippedList.includes(p.user_id) &&
              p.last_seen_at &&
              p.last_seen_at >= onlineCutoff
          );
          if (onlineActive.length > 0) {
            await dbPromise.run(
              `UPDATE sessions SET current_turn_user_id = ?, turn_started_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [onlineActive[0].user_id, session.id]
            );
            console.log(
              `[PRESENCE] Assigned turn in session ${session.room_code} to ${onlineActive[0].user_name} (was null)`
            );
          }
        }

        // --- Auto-transfer ownership if creator is offline ---
        const creator = participants.find(
          (p) => p.user_id === freshSession.creator_id
        );
        if (
          creator &&
          creator.last_seen_at &&
          creator.last_seen_at < transferCutoff
        ) {
          // Creator has been offline for > AUTO_TRANSFER_OWNER_S
          // Find the next eligible owner: earliest-joined, online, non-skipped participant
          const candidates = participants.filter(
            (p) =>
              p.user_id !== freshSession.creator_id &&
              !skippedList.includes(p.user_id) &&
              p.last_seen_at &&
              p.last_seen_at >= onlineCutoff
          );

          if (candidates.length > 0) {
            const newOwner = candidates[0]; // earliest joined due to ORDER BY joined_at ASC
            await dbPromise.run(
              `UPDATE sessions SET creator_id = ?, creator_name = ? WHERE id = ?`,
              [newOwner.user_id, newOwner.user_name, session.id]
            );
            console.log(
              `[PRESENCE] Auto-transferred ownership in session ${session.room_code}: ${creator.user_name} -> ${newOwner.user_name}`
            );
          }
        }
      }
    } catch (err) {
      console.error('[PRESENCE] Error in presence check:', err);
    }
  }, 10 * 1000); // Run every 10 seconds

  console.log(
    `Presence check started (offline: ${OFFLINE_THRESHOLD_S}s, auto-skip: ${AUTO_SKIP_TURN_S}s, auto-transfer: ${AUTO_TRANSFER_OWNER_S}s)`
  );
}

// Helper functions for common operations
const dbPromise = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  },

  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },
};

module.exports = {
  db,
  dbPromise,
  touchSession,
  touchSessionByRoomCode,
  touchParticipant,
  SESSION_TIMEOUT_MS,
  OFFLINE_THRESHOLD_S,
};
