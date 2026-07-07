const { BASELINE } = require('../config/baseline');
const { SERVICES } = require('../config/services');

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
}

const STATUS_LABELS = {
  to_do: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold_client: 'On Hold - Client',
  on_hold_internal: 'On Hold - Internal',
};

const STATUS_ORDER = ['on_hold_client', 'in_progress', 'to_do', 'on_hold_internal', 'completed'];

function renderDashboard(tasks, key) {
  key = key || '';
  const counts = {};
  for (const s of STATUS_ORDER) counts[s] = 0;
  for (const t of tasks) counts[t.status] = (counts[t.status] || 0) + 1;

const complianceWatch = tasks.filter(
  (t) => t.status === 'on_hold_client' && !t.blocker_note
  );

const groupedByStatus = STATUS_ORDER.map((status) => ({
  status,
  label: STATUS_LABELS[status],
  tasks: tasks.filter((t) => t.status === status),
}));

const groupedByWorkstream = [...SERVICES, 'Operations'].map((ws) => ({
  workstream: ws,
  tasks: tasks.filter((t) => t.workstream === ws),
}));

const workstreamOptions = [...SERVICES, 'Operations']
  .map((ws) => `<option value="${escapeHtml(ws)}">${escapeHtml(ws)}</option>`)
  .join('');

const countCards = STATUS_ORDER.map(
  (s) => `<div class="count-card"><div class="count-num">${counts[s]}</div><div class="count-label">${STATUS_LABELS[s]}</div></div>`
  ).join('');

const statusSections = groupedByStatus
  .map(
    (group) => `
    <section class="status-group">
    <h3>${group.label} <span class="badge">${group.tasks.length}</span></h3>
    ${
      group.tasks.length === 0
      ? '<p class="empty">None</p>'
      : `<table>
      <thead><tr><th>Title</th><th>Workstream</th><th>Assignee</th><th>Internal Blocked</th><th>Blocker Note</th><th>Origin</th></tr></thead>
      <tbody>
      ${group.tasks
        .map(
          (t) => `<tr>
          <td>${escapeHtml(t.title)}</td>
          <td>${escapeHtml(t.workstream)}</td>
          <td>${escapeHtml(t.assignee) || '<em>Unassigned</em>'}</td>
          <td>${t.internal_blocked ? 'Yes' : 'No'}</td>
          <td>${escapeHtml(t.blocker_note) || ''}</td>
          <td>${escapeHtml(t.origin)}${t.external_ref ? ` (${escapeHtml(t.external_ref)})` : ''}</td>
          </tr>`
          )
        .join('')}
        </tbody>
        </table>`
    }
    </section>`
    )
  .join('');

const workstreamSummary = groupedByWorkstream
  .map(
    (g) => `<div class="ws-card"><h4>${escapeHtml(g.workstream)}</h4><div class="ws-count">${g.tasks.length} tasks</div></div>`
    )
  .join('');

return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>NYFG Weekly Update Agent - Internal Dashboard</title>
<style>
body { font-family: -apple-system, sans-serif; background: #F5F2EC; color: #1C1C1E; margin: 0; padding: 32px; }
h1 { font-size: 24px; margin-bottom: 4px; }
.subtitle { color: #6b6b6b; margin-bottom: 24px; }
.baseline-card { background: #1C1C1E; color: #F5F2EC; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px; }
.baseline-card .score { font-size: 32px; font-weight: bold; color: #B8A06A; }
.counts-row { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.count-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 12px 20px; text-align: center; min-width: 100px; }
.count-num { font-size: 24px; font-weight: bold; color: #B8A06A; }
.count-label { font-size: 12px; color: #6b6b6b; }
.ws-row { display: flex; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; }
.ws-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 12px 20px; }
.ws-card h4 { margin: 0 0 4px 0; font-size: 13px; }
.ws-count { color: #6b6b6b; font-size: 12px; }
.status-group { background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; border: 1px solid #ddd; }
.status-group h3 { margin-top: 0; }
.badge { background: #B8A06A; color: white; border-radius: 12px; padding: 2px 10px; font-size: 13px; }
table { width: 100%; border-collapse: collapse; margin-top: 8px; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
th { color: #6b6b6b; font-weight: 600; }
.empty { color: #999; font-style: italic; }
.compliance-watch { background: #fff3cd; border: 1px solid #ffe08a; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; }
.panel { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
.panel h2 { margin-top: 0; }
.add-task-form { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.add-task-form input, .add-task-form select { padding: 6px 8px; border: 1px solid #ccc; border-radius: 6px; font-size: 13px; }
.add-task-form button, .panel button { background: #1C1C1E; color: #F5F2EC; border: none; border-radius: 6px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.form-status { margin-top: 8px; font-size: 13px; }
.draft-box { background: #F5F2EC; border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; margin-top: 12px; white-space: pre-wrap; font-size: 13px; }
.draft-refused { background: #fdecea; border: 1px solid #f5b7b1; border-radius: 8px; padding: 12px 16px; margin-top: 12px; font-size: 13px; }
</style>
</head>
<body>
<h1>NYFG Weekly Update Agent</h1>
<div class="subtitle">Internal dashboard. Not for client viewing.</div>
<div class="baseline-card">
<div>${escapeHtml(BASELINE.label)}</div>
<div class="score">${BASELINE.current} / ${BASELINE.scale} <span style="font-size:16px; font-weight:normal;">&rarr; target ${BASELINE.target}</span></div>
<div style="font-size:12px; opacity:0.8; margin-top:4px;">${escapeHtml(BASELINE.guaranteeNote)} &middot; last verified ${escapeHtml(BASELINE.lastVerified)}</div>
</div>

${
  complianceWatch.length > 0
  ? `<div class="compliance-watch">${complianceWatch.length} task(s) marked On Hold - Client with no blocker note recorded. Review before the next client draft.</div>`
  : ''
}

<div class="counts-row">${countCards}</div>

<div class="panel">
<h2>Add Task</h2>
<form id="add-task-form" class="add-task-form">
<input type="text" id="task-title" placeholder="Task title" required>
<select id="task-workstream" required>
<option value="">Workstream...</option>
${workstreamOptions}
</select>
<select id="task-type">
<option value="one_shot">One-shot</option>
<option value="recurring">Recurring</option>
</select>
<input type="text" id="task-cadence" placeholder="Cadence (recurring only)">
<input type="text" id="task-assignee" placeholder="Assignee (optional)">
<button type="submit">Add Task</button>
</form>
<div id="add-task-status" class="form-status"></div>
</div>

<div class="panel">
<h2>Client Draft</h2>
<p class="subtitle" style="margin-bottom:12px;">Generates a redacted draft for Jay to review. This never sends anything to the client -- a human must copy, review, and send it.</p>
<button id="generate-draft-btn" type="button">Generate Client Draft</button>
<div id="draft-output"></div>
</div>

<h2>By Service Pillar</h2>
<div class="ws-row">${workstreamSummary}</div>

<h2>By Status</h2>
${statusSections}

<script>
(function () {
var API_KEY = ${JSON.stringify(key)};

function escapeClient(str) {
if (str === undefined || str === null) return '';
var div = document.createElement('div');
div.innerText = typeof str === 'string' ? str : JSON.stringify(str);
return div.innerHTML;
}

var taskTypeEl = document.getElementById('task-type');
var cadenceEl = document.getElementById('task-cadence');
taskTypeEl.addEventListener('change', function () {
cadenceEl.style.display = taskTypeEl.value === 'recurring' ? 'inline-block' : 'none';
});
cadenceEl.style.display = 'none';

document.getElementById('add-task-form').addEventListener('submit', function (e) {
e.preventDefault();
var statusEl = document.getElementById('add-task-status');
statusEl.textContent = 'Adding...';

var type = taskTypeEl.value;
var body = {
title: document.getElementById('task-title').value,
origin: 'dashboard',
workstream: document.getElementById('task-workstream').value,
task_type: type,
assignee: document.getElementById('task-assignee').value || undefined,
};
if (type === 'recurring') {
body.cadence = cadenceEl.value;
}

fetch('/tasks', {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
body: JSON.stringify(body),
})
.then(function (res) {
return res.json().then(function (data) {
return { ok: res.ok, data: data };
});
})
.then(function (result) {
if (!result.ok) {
statusEl.textContent = 'Error: ' + (result.data.error || 'request failed');
} else {
statusEl.textContent = 'Added task #' + result.data.id + '. Reload the page to see it grouped.';
document.getElementById('add-task-form').reset();
cadenceEl.style.display = 'none';
}
})
.catch(function (err) {
statusEl.textContent = 'Request failed: ' + err.message;
});
});

document.getElementById('generate-draft-btn').addEventListener('click', function () {
var out = document.getElementById('draft-output');
out.innerHTML = '<div class="form-status">Generating...</div>';

fetch('/client-draft', {
method: 'POST',
headers: { 'X-API-Key': API_KEY },
})
.then(function (res) {
return res.json().then(function (data) {
return { status: res.status, ok: res.ok, data: data };
});
})
.then(function (result) {
if (result.status === 409) {
out.innerHTML =
'<div class="draft-refused"><strong>Refused:</strong> ' +
escapeClient(result.data.reason) +
'<br>Violations: ' +
escapeClient(JSON.stringify(result.data.violations)) +
'</div>';
} else if (!result.ok) {
out.innerHTML = '<div class="draft-refused">Error: ' + escapeClient(result.data.error || result.status) + '</div>';
} else {
out.innerHTML =
'<div class="draft-box"><strong>DRAFT ONLY -- route to ' +
escapeClient(result.data.approver) +
' for approval. A human must send this.</strong><br><br>' +
escapeClient(result.data.draft) +
'</div>';
}
})
.catch(function (err) {
out.innerHTML = '<div class="draft-refused">Request failed: ' + escapeClient(err.message) + '</div>';
});
});
})();
</script>
</body>
</html>`;
}

module.exports = { renderDashboard };
