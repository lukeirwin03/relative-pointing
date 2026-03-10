CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  jira_base_url TEXT,
  skipped_participants TEXT,
  current_turn_user_id TEXT,
  turn_started_at DATETIME,
  stack_mode INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME
);
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, user_id)
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  jira_key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  issue_type TEXT,
  status TEXT,
  priority TEXT,
  column_id TEXT,
  assigned_by TEXT,
  assigned_at DATETIME,
  task_order INTEGER,
  metadata TEXT,
  color_tag TEXT,
  tag_id TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS columns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  column_order INTEGER,
  created_by TEXT,
  point_value REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_columns_session ON columns(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity_at);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_builtin INTEGER DEFAULT 0,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tags_session ON tags(session_id);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_session ON comments(session_id);
