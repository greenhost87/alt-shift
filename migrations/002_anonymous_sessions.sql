CREATE TABLE anonymous_sessions (
  id TEXT PRIMARY KEY,
  csrf_token_hash TEXT NOT NULL,
  expires_at_ms INTEGER NOT NULL
);

CREATE INDEX anonymous_sessions_expires_at_idx
  ON anonymous_sessions (expires_at_ms);
