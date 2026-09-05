-- Every Google account is its own workspace: channels, posts and media belong to a user.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  picture TEXT,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL
);

ALTER TABLE channels ADD COLUMN user_id TEXT;
ALTER TABLE posts ADD COLUMN user_id TEXT;
ALTER TABLE media ADD COLUMN user_id TEXT;
ALTER TABLE oauth_states ADD COLUMN user_id TEXT;

CREATE INDEX IF NOT EXISTS channels_user ON channels(user_id);
CREATE INDEX IF NOT EXISTS posts_user ON posts(user_id, publish_at);
