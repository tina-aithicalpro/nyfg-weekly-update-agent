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

function renderDashboard(tasks) {
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
                        <td>${t.internal_blocked ? '⚠️ Yes' : 'No'}</td>
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
      ? `<div class="compliance-watch">⚠️ ${complianceWatch.length} task(s) marked On Hold - Client with no blocker note recorded. Review before the next client draft.</div>`
      : ''
  }

  <div class="counts-row">${countCards}</div>

  <h2>By Service Pillar</h2>
  <div class="ws-row">${workstreamSummary}</div>

  <h2>By Status</h2>
  ${statusSections}
</body>
</html>`;
}

module.exports = { renderDashboard };
