-- User status workflow, audit logs, and MeterTrack window controls.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS consent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT,
  ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT;

ALTER TABLE month_config
  ADD COLUMN IF NOT EXISTS index_window_start_day INTEGER DEFAULT 25,
  ADD COLUMN IF NOT EXISTS index_window_end_day INTEGER DEFAULT 30;

ALTER TABLE index_readings
  ADD COLUMN IF NOT EXISTS late_submission BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  username TEXT,
  role TEXT,
  action TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
