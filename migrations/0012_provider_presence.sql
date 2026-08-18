ALTER TABLE users ADD COLUMN IF NOT EXISTS last_online_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;

CREATE INDEX IF NOT EXISTS users_provider_presence_idx
  ON users (is_provider, current_status, last_heartbeat_at)
  WHERE is_provider = true;
