const { scanForViolations } = require('../config/hardstops');

// Strip internal-only fields BEFORE the task data ever reaches the LLM prompt.
// The fail-closed gate below is the backstop, not the primary defense -- if a
// name never enters the prompt, it can't leak into the output.
function stripForClientPrompt(tasks) {
  return tasks.map((t) => ({
    title: t.title,
    status: t.status,
    workstream: t.workstream,
    // Deliberately omitted: assignee, blocker_note, external_ref, id, duplicate_of
  }));
}

// Fail-closed gate. Scans the LLM's finished draft. If ANY hard-stop, internal
// name, prohibited vocab word, or em dash appears, refuse to return it.
// This is non-negotiable per the playbook: a compliance leak blocks the
// response rather than shipping a redacted-but-imperfect draft.
function failClosedCheck(draftText) {
  const violations = scanForViolations(draftText);
  return {
    passed: violations.length === 0,
    violations,
  };
}

module.exports = { stripForClientPrompt, failClosedCheck };
