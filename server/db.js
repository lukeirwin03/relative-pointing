const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Session inactivity timeout (15 minutes)
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

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
        // Start the cleanup job
        startSessionCleanup();
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

          if (callback) callback();
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
    `DELETE FROM sessions WHERE last_activity_at IS NOT NULL AND last_activity_at < ?`,
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
  SESSION_TIMEOUT_MS,
};
