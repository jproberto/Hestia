#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Guardian físico do Olympus — valida transição de fase antes de promover.
// Uso: node .agents/scripts/guardian.js <FEATURE_DIR> <nextPhase>
// Exit 0 = permitido; exit 1 = bloqueado (mensagem em stdout).
// Completa o "guardian nativo via raciocínio" do zeus.md com checagem executável.
const fs = require("fs");
const path = require("path");

const TRANSITIONS = {
  SPEC_DRAFT: ["SPEC_APPROVED"],
  SPEC_APPROVED: ["PLAN_READY", "SPEC_DRAFT"],
  PLAN_READY: ["TASKS_READY", "SPEC_APPROVED"],
  TASKS_READY: ["CODING", "PLAN_READY"],
  CODING: ["TESTING", "TASKS_READY"],
  TESTING: ["REVIEW", "CODING"],
  REVIEW: ["APPROVED", "CODING", "TASKS_READY", "PLAN_READY", "SPEC_DRAFT"],
  APPROVED: ["COMMITTED", "CODING", "TASKS_READY", "PLAN_READY", "SPEC_DRAFT"],
  COMMITTED: ["MERGED", "CODING", "TASKS_READY", "PLAN_READY", "SPEC_DRAFT"],
  MERGED: ["VERIFIED", "CODING", "TASKS_READY", "PLAN_READY", "SPEC_DRAFT"],
  VERIFIED: ["RELEASED", "CODING", "TASKS_READY", "PLAN_READY", "SPEC_DRAFT"],
  RELEASED: [],
};

const CODE_FENCE = /^```(ts|tsx|js|jsx|sql|py|css|html|jsonc?)\s*$/m;

function fail(msg) {
  console.log(`[guardian BLOCKED] ${msg}`);
  process.exit(1);
}
function read(p) {
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}
function readJSON(p) {
  const t = read(p);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    fail(`JSON inválido: ${p}`);
  }
}

const [dir, next] = process.argv.slice(2);
if (!dir || !next) fail("uso: guardian.js <FEATURE_DIR> <nextPhase>");
const cp = readJSON(path.join(dir, "checkpoint.json"));
const ctx = readJSON(path.join(dir, "context.json"));
if (!cp) fail(`checkpoint.json ausente em ${dir}`);
const cur = cp.currentPhase;
if (!TRANSITIONS[cur] || !TRANSITIONS[cur].includes(next)) {
  fail(`transição não permitida: ${cur} → ${next} (válidas: ${(TRANSITIONS[cur] || []).join(", ")})`);
}
if (next === "SPEC_APPROVED") {
  if (!ctx || ctx.approvals?.spec !== "approved") fail("checkpoint 1 pendente: approvals.spec !== approved");
  const spec = read(path.join(dir, "spec.md"));
  if (!spec) fail("spec.md ausente");
  if (CODE_FENCE.test(spec)) fail("spec.md contém bloco de código — proibição absoluta (hera.md)");
  if (/TBD|TODO/i.test(spec)) fail("spec.md contém TBD/TODO");
}
if (next === "TASKS_READY") {
  const tasks = readJSON(path.join(dir, "tasks.json"));
  if (!tasks || !Array.isArray(tasks.tasks) || tasks.tasks.length < 3) fail("tasks.json inválido: exige ≥3 tasks");
  for (const t of tasks.tasks) {
    if (!t.id || !t.title || !t.assignee || !Array.isArray(t.acceptanceCriteria) || t.acceptanceCriteria.length === 0)
      fail(`task inválida: ${t.id || "?"}`);
  }
  const plan = read(path.join(dir, "plan.md"));
  if (plan && /^```(ts|tsx|js|jsx|sql|py)\s*$/m.test(plan)) fail("plan.md contém código de implementação — só contratos textuais");
}
if (next === "REVIEW") {
  const rep = readJSON(path.join(dir, "test-report.json"));
  if (!rep) fail("test-report.json ausente");
  if ((rep.summary?.failed ?? 1) > 0) fail(`suite com falhas: ${rep.summary.failed} failed — corrija antes do review`);
  if ((rep.summary?.coverage ?? 0) < 80) fail(`coverage ${rep.summary?.coverage} < 80`);
}
if (next === "APPROVED") {
  if (!ctx || ctx.approvals?.review !== "approved") fail("checkpoint 2 pendente: approvals.review !== approved");
  const rev = readJSON(path.join(dir, "review-report.json"));
  if (!rev) fail("review-report.json ausente");
  if (rev.status === "blocked") fail("review-report blocked — devolva para fase exata");
}
console.log(`[guardian OK] ${cur} → ${next}`);
