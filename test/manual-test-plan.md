# Manual Test Plan

Run these against the real deployed service and real database before trusting
it with a real weekly cycle. "It ran without error" is not "it did the right
thing" — each step below has an explicit pass condition, not just an absence
of a red error.

## 1. Constraints reject bad data (prove by attempted insert)

In Railway's Postgres query box:
```sql
-- Should FAIL: recurring task with no cadence
INSERT INTO tasks (origin, title, workstream, task_type)
VALUES ('agent', 'test recurring no cadence', 'Operations', 'recurring');

-- Should FAIL: one_shot task with a cadence set
INSERT INTO tasks (origin, title, workstream, task_type, cadence)
VALUES ('agent', 'test one_shot with cadence', 'Operations', 'one_shot', 'weekly');
```
**Pass condition:** both inserts are rejected with a CHECK constraint
violation, not silently accepted.

## 2. Auth rejects no-key and wrong-key

```bash
# No key -- expect 401
curl -i https://<your-service>.up.railway.app/tasks

# Wrong key -- expect 401
curl -i -H "X-API-Key: wrong" https://<your-service>.up.railway.app/tasks

# Correct key -- expect 200
curl -i -H "X-API-Key: $API_KEY" https://<your-service>.up.railway.app/tasks
```
**Pass condition:** first two return 401. Third returns 200.

## 3. Status change auto-logs history (trigger verification, not app-code assumption)

```bash
curl -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' \
  https://<your-service>.up.railway.app/tasks/1/status
```
Then in the Postgres query box:
```sql
SELECT * FROM status_history WHERE task_id = 1 ORDER BY changed_at DESC LIMIT 1;
```
**Pass condition:** a new row exists with `new_status = 'in_progress'`,
`changed_at` close to now. This proves the DB trigger fired, not just that
the app didn't error.

## 4. Fail-closed gate blocks a poisoned draft

Temporarily insert a task with a hard-stop term in its title:
```sql
INSERT INTO tasks (origin, title, status, workstream, task_type)
VALUES ('agent', 'TEST ONLY: discuss pricing structure with Jay', 'to_do', 'Operations', 'one_shot');
```
Then:
```bash
curl -X POST -H "X-API-Key: $API_KEY" https://<your-service>.up.railway.app/client-draft
```
**Pass condition:** response is `409` with `refused: true` and a
`violations` array naming the hard-stop term or internal name that
tripped it. If it returns `200` instead, the gate is broken — stop and
fix before any real use.

Delete the test row afterward:
```sql
DELETE FROM tasks WHERE title LIKE 'TEST ONLY:%';
```

## 5. Dashboard convenience does not leak into the draft endpoint

```bash
# Dashboard with URL-param key -- expect 200
curl -i "https://<your-service>.up.railway.app/dashboard?key=$API_KEY"

# Client-draft with URL-param key instead of header -- expect 401
curl -i -X POST "https://<your-service>.up.railway.app/client-draft?key=$API_KEY"
```
**Pass condition:** dashboard succeeds via URL param; client-draft rejects
it and requires the header instead.

## 6. Recurring-task display sanity check (once a recurring task exists)

Manually mark one real weekly-recurring task as `task_type = 'recurring'`
with a `cadence`, mark it `completed`, then check `/dashboard`.
**Pass condition:** dashboard does not silently display it as permanently
"done" — confirm the current rendering matches expectations, and note this
as a known area to expand if Jay wants recurring-specific dashboard styling
beyond what v1 renders.

## 7. NULL vs blank check (before debugging a "missing" field)

If a field looks blank in a DB viewer, verify with:
```sql
SELECT id, blocker_note IS NULL AS is_null FROM tasks WHERE id = <id>;
```
Don't assume blank means NULL, or fix a bug that isn't actually there.
