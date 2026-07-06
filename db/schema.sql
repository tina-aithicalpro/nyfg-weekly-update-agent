-- NYFG Weekly Update Agent - schema
-- Run this ONCE by hand in Railway's Postgres query box. No auto-migrations.

CREATE TYPE task_origin AS ENUM ('tracker', 'project', 'agent');
CREATE TYPE task_status AS ENUM ('to_do', 'in_progress', 'completed', 'on_hold_client', 'on_hold_internal');
CREATE TYPE task_type AS ENUM ('one_shot', 'recurring');

CREATE TABLE services (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id                  SERIAL PRIMARY KEY,
  origin              task_origin NOT NULL,
  external_ref        TEXT,                     -- ClickUp task id; NULL for project/agent-origin
  title               TEXT NOT NULL,
  status              task_status NOT NULL DEFAULT 'to_do',
  task_type           task_type NOT NULL DEFAULT 'one_shot',
  cadence             TEXT,                      -- e.g. 'weekly', 'biweekly'
  assignee            TEXT,                      -- plain text; promote to FK later if needed
  internal_blocked    BOOLEAN NOT NULL DEFAULT false,  -- dashboard-only sub-flag, independent of status
  blocker_note        TEXT,                      -- INTERNAL ONLY. Never passed to the client-draft prompt.
  duplicate_of        INTEGER REFERENCES tasks(id),
  workstream          TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_status_change  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cadence_required_if_recurring CHECK (
    (task_type = 'recurring' AND cadence IS NOT NULL) OR
    (task_type = 'one_shot' AND cadence IS NULL)
  )
);

CREATE TABLE status_history (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER NOT NULL REFERENCES tasks(id),
  old_status  task_status,
  new_status  task_status NOT NULL,
  changed_by  TEXT NOT NULL DEFAULT 'jay',
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stamp timestamps BEFORE the row is written (NEW is mutable pre-insert/update).
CREATE OR REPLACE FUNCTION stamp_task_timestamps() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
    NEW.last_status_change := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stamp_task_timestamps
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION stamp_task_timestamps();

-- Log status history AFTER the row exists (task_id must be present for the FK).
CREATE OR REPLACE FUNCTION log_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
    INSERT INTO status_history (task_id, old_status, new_status)
    VALUES (NEW.id, CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_status_change
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION log_status_change();

INSERT INTO services (name) VALUES
  ('AI Visibility Program'),
  ('Website Conversion Infrastructure'),
  ('Social Media Management');
