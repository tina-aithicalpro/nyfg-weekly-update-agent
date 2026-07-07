const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-5';

// Stage 2: tolerant parsing of a messily-pasted task list into clean records.
// This is one of the two places the playbook says the LLM adds real value.
async function parsePastedTasks(rawText, approverName) {
  const prompt = `You are normalizing a messily-pasted weekly task list into structured records.

For each task, produce: title, a pre-filled status guess, and a one-line reason for that guess.

Pre-fill rule:
- Already-in-progress language -> "in_progress"
- A title naming an explicit approval/confirmation gate on ${approverName} or the client -> "on_hold_client"
- A title naming only an internal dependency (not a client approval) -> "in_progress" (tag as internally_blocked: true, this is NOT on-hold)
- Everything else -> "to_do"

Never invent due dates. Return ONLY a JSON array, no prose, no markdown fences:
[{"title": "...", "status": "to_do|in_progress|completed|on_hold_client|on_hold_internal", "internally_blocked": false, "reason": "..."}]

Raw pasted list:
${rawText}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find((b) => b.type === 'text')?.text || '[]';
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// Stage 5: rewrite redacted task clusters into outcome-level client language.
// The other place the LLM adds real value, per the playbook.
async function composeClientDraft(strippedTasks, approverName) {
  const prompt = `Write a weekly client update DRAFT for New York Flower Group from the task data below.

Rules, all mandatory:
- Outcome level only. Never name task titles, tools, directory names, or step mechanics verbatim. Map clusters of related tasks to a single outcome statement.
- Exactly three sections: "Completed this week" (be honest if empty, do not pad), "Ongoing work", "Waiting on your input" (ONLY tasks with status on_hold_client).
- Never mention any internal person's name, vendor name, pricing, methodology, or the word "guarantee" or "guaranteed" in any form.
- No em dashes. Use a spaced hyphen if needed.
- Do not use: streamline, leverage, unlock, game-changer, cutting-edge, seamless, robust, synergy, empower, delve.
- Speak as "our team," never naming individuals.
  - Header line: "DRAFT - route to the approver for approval, then a human sends." Do not name the approver.
- Do not offer to send it. Do not send it.
- Plain text only. Do not use markdown formatting anywhere (no asterisks, no bold, no italics, no bullet symbols, no headers). Write section titles as plain text followed by a colon, e.g. "Completed this week:". Use a plain hyphen and space for list items.

Task data (already stripped of internal fields):
${JSON.stringify(strippedTasks, null, 2)}

Return only the draft text, no additional commentary.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content.find((b) => b.type === 'text')?.text || '';
}

module.exports = { parsePastedTasks, composeClientDraft };
