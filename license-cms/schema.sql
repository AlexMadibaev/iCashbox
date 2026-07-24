CREATE TABLE IF NOT EXISTS points (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  license_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  max_activations INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activations (
  point_id TEXT NOT NULL REFERENCES points(id) ON DELETE CASCADE,
  installation_id TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  PRIMARY KEY (point_id, installation_id)
);

CREATE INDEX IF NOT EXISTS activations_point_id ON activations(point_id);
