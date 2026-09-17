CREATE TABLE generation_rate_limit_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_fingerprint TEXT NOT NULL,
  requested_at_ms INTEGER NOT NULL
);

CREATE INDEX generation_rate_limit_requests_requested_at_idx
  ON generation_rate_limit_requests (requested_at_ms, id);

CREATE INDEX generation_rate_limit_requests_client_requested_at_idx
  ON generation_rate_limit_requests (client_fingerprint, requested_at_ms, id);
