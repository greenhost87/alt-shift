CREATE TABLE application_generation_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX application_generation_slots_session_idx
  ON application_generation_slots (session_id, id);
