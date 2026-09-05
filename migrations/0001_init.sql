CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  external_id TEXT,
  credentials TEXT NOT NULL,      -- AES-GCM encrypted JSON (tokens / bot token / app password)
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,          -- one cross-post = one group, one row per channel
  channel_id TEXT NOT NULL,
  parts TEXT NOT NULL,             -- JSON string[]: root, then thread replies
  media TEXT NOT NULL DEFAULT '[]',-- JSON {id,path,type}[]
  publish_at INTEGER NOT NULL,
  state TEXT NOT NULL,             -- DRAFT | QUEUE | PUBLISHING | PUBLISHED | ERROR
  release_id TEXT,
  release_url TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS posts_due ON posts(state, publish_at);
CREATE INDEX IF NOT EXISTS posts_group ON posts(group_id);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS metrics (
  subject TEXT NOT NULL,           -- channel:<id> | post:<id>
  metric TEXT NOT NULL,            -- followers | views | likes | replies | reposts | ...
  day TEXT NOT NULL,               -- YYYY-MM-DD (UTC)
  value REAL NOT NULL,
  PRIMARY KEY (subject, metric, day)
);

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  verifier TEXT,
  created_at INTEGER NOT NULL
);
