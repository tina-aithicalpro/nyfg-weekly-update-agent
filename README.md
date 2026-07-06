# NYFG Weekly Update Agent

Human-gated weekly task tracking and client-update-draft agent for New York
Flower Group (NYFG). Built per the Weekly Client Update Agent playbook.
Architecture: **Path B** — standalone service, agent-owned Postgres as the
authoritative write-store. ClickUp is read-only reference input, reconciled
by hand.

**This agent never sends anything to the client.** It drafts. Jay approves
(both human gates: status entry and draft approval are Jay for this
engagement). A human sends.

## Locked configuration (do not change without Jay's sign-off)

| Item | Value |
|---|---|
| Client | New York Flower Group (NYFG) |
| Approver | Jay |
| Service pillars | AI Visibility Program, Website Conversion Infrastructure, Social Media Management |
| Hard-stops | Standard set only (pricing, methodology, internal names, "guarantee/guaranteed") |
| Baseline | 1.3/10 &rarr; 8.0/10 across 6 AI engines |
| Datastore | Agent-owned Postgres (authoritative for writes). ClickUp = read-only input. |

## 1. Push to GitHub

```bash
cd nyfg-weekly-update-agent
git init
git add .
git commit -m "Initial commit: NYFG weekly update agent"
git remote add origin <your-empty-repo-url>
git branch -M main
git push -u origin main
```

## 2. Deploy to Railway

1. New Project → Deploy from GitHub repo → select this repo.
2. Add a Postgres plugin to the project (Railway provisions `DATABASE_URL`
   automatically as a service variable reference).
3. Set these service Variables (see `.env.example`):
   - `API_KEY` — generate a long random string
   - `ANTHROPIC_API_KEY` — your Anthropic API key
   - `DATABASE_URL` — reference the Postgres plugin's connection string
4. Railway auto-detects Node via Nixpacks. Start command is `npm start`,
   which runs `node src/server.js`. It binds `0.0.0.0` and Railway's
   injected `$PORT` — do not hardcode a port.
5. **First deploy will fail** if secrets aren't set yet — this is the app
   refusing to boot without `API_KEY`/`DATABASE_URL`, not a broken build.
   Add the variables, redeploy.
6. Run the schema **once, by hand**, in Railway's Postgres query box:
   paste the contents of `db/schema.sql`, run it.
7. Run the seed **once, by hand**, right after:
   paste the contents of `db/seed.sql`, run it.

No auto-migrations. Schema and seed are deliberate, one-time, manual steps.

## 3. Seed data — review before first client draft

`db/seed.sql` contains 61 tasks:
- **58 from a live ClickUp pull** (folder 90169623534, lists
  `901614956007` Aithical Team Actions and `901614956006` Client Actions —
  Chris & Cass), `origin = 'tracker'`, `external_ref` = ClickUp task ID.
- **3 from this Claude project's history**, Jay-confirmed as real distinct
  tasks not already in ClickUp, `origin = 'project'`:
  - Squarespace code injection to embed the AI chatbot widget
  - Testimonials About page mockup → Claude Design refinement → Chris/Cas approval
  - Reddit two-step strategy: Week 1 edits for Batch 1, execute Batch 2

**Two judgment calls made during seeding that Jay should review:**

1. **Workstream categorization.** Every tracker task was mapped to one of
   the three service pillars, or to a 4th catch-all bucket, `Operations`,
   for internal/admin items (access checklists, internal calls, WhatsApp
   follow-ups) that don't fit a client-facing pillar. This is a first-pass
   call by the build agent — correct via `POST /tasks/{id}` if wrong.
2. **`on_hold_client` inference.** Any task sitting in ClickUp's "Client
   Actions — Chris & Cass" list with status "Open" was seeded as
   `on_hold_client`, on the reasoning that list membership itself signals
   the action belongs to the client. This was inferred from list structure,
   not from an explicit per-task "awaiting approval" statement (which the
   playbook's own On-Hold Rule normally requires). Review these
   specifically — via `GET /tasks?status=on_hold_client` — before the
   first client draft goes out, since anything wrongly marked on-hold will
   surface in the "Waiting on your input" section of the draft.

## 4. Weekly workflow

**Stage 2/3 — intake + status grid (human gate 1, Jay):**
```
POST /tasks/parse
{ "rawText": "<paste this week's raw task list>" }
```
Returns a pre-filled grid. Jay reviews, then applies only the changed
statuses:
```
POST /tasks/{id}/status
{ "status": "in_progress" }
```

**Stage 4 — internal dashboard:**
```
GET /dashboard?key=<API_KEY>
```
Plain link, safe to bookmark for internal use. Shows every task, grouped
by status and by service pillar, the 1.3/10 → 8.0/10 baseline, and a
compliance-watch flag for any `on_hold_client` task missing a blocker
note.

**Stage 5 — client draft (human gate 2, Jay):**
```
POST /client-draft
Header: X-API-Key: <API_KEY>
```
Returns either:
- `200 { draft, approver: "Jay", note: "DRAFT ONLY..." }`
- `409 { refused: true, reason, violations }` if the fail-closed gate
  catches a hard-stop term, internal name, prohibited word, or em dash.

A `409` means: do not try to force it through. Either the source task
titles need cleaning (edit via `PATCH`-equivalent status update, or fix
the title at the source), or something in the LLM's phrasing needs
regenerating. Never bypass the gate.

## API reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | liveness |
| GET | `/tasks` | header | list, filter by `status`/`workstream`/`origin` |
| GET | `/tasks/:id` | header | single task |
| POST | `/tasks` | header | create an agent-origin task |
| POST | `/tasks/:id/status` | header | update status (auto-logs history) |
| POST | `/tasks/parse` | header | Stage 2 LLM parse of a pasted list (no DB write) |
| GET | `/completed?since=ISO` | header | tasks completed since date, from history |
| GET | `/dashboard` | header or `?key=` | internal HTML dashboard |
| POST | `/client-draft` | header only | redacted draft or 409 refusal |

## What this deliberately does NOT do

- Does not auto-send anything, ever, to anyone.
- Does not live-sync with ClickUp. ClickUp is a one-time import reference;
  ongoing reconciliation between ClickUp and this database is manual, using
  `external_ref` to avoid orphaning tracker-origin tasks.
- Does not support a second approver role. Jay is both human gates for this
  engagement.
- Does not add NYFG-specific hard-stop terms beyond the standard set —
  Jay confirmed standard set only (2026-07-07).

## Testing before first real use

See `test/manual-test-plan.md` for the required pre-deploy verification
steps (constraint rejection, auth rejection, fail-closed gate proof).
