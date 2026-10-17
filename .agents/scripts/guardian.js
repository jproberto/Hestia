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
  PLAN_READY: ["PLAN_APPROVED", "SPEC_APPROVED"],
  PLAN_APPROVED: ["TASKS_READY", "PLAN_READY", "SPEC_DRAFT"],
  TASKS_READY: ["CODING", "PLAN_APPROVED", "PLAN_READY"],
  CODING: ["TESTING", "TASKS_READY"],
  TESTING: ["REVIEW", "CODING"],
  REVIEW: ["APPROVED", "CODING", "TASKS_READY", "PLAN_APPROVED", "PLAN_READY", "SPEC_DRAFT"],
  APPROVED: ["COMMITTED", "CODING", "TASKS_READY", "PLAN_APPROVED", "PLAN_READY", "SPEC_DRAFT"],
  COMMITTED: ["CODING", "TASKS_READY", "PLAN_APPROVED", "PLAN_READY", "SPEC_DRAFT"],
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

function validateSpecComplete(specPath) {
  const spec = read(specPath);
  if (!spec) fail("spec.md ausente");
  const requiredSections = ['Modelo de Domínio', 'Premissas Técnicas Validadas', 'Cenários de Edge Case'];
  for (const section of requiredSections) {
    if (!spec.includes(section)) {
      fail(`Spec incompleta: seção "${section}" ausente`);
    }
  }
  if (!spec.includes('Validada com Humano? ✅ Sim') && !spec.includes('Validada com Humano? Sim')) {
    fail('Premissas técnicas não validadas com humano');
  }
}

function validatePlanComplete(planPath) {
  const plan = read(planPath);
  if (!plan) fail("plan.md ausente");
  const requiredSections = ['Mapeamento Schema → Código', 'Contratos Completos', 'Migrações', 'Código Legado/Removível', 'Tasks'];
  for (const section of requiredSections) {
    if (!plan.includes(section)) {
      fail(`Plan incompleto: seção "${section}" ausente`);
    }
  }
  if (!plan.includes('Tabela | Coluna | Migração | Repositório | Hook | Componente')) {
    fail('Plan sem mapeamento Schema→Código');
  }
}

function validateRedComplete(taskFiles) {
  const { execSync } = require('child_process');
  for (const file of taskFiles) {
    if (!fs.existsSync(file)) {
      fail(`Arquivo de teste não encontrado: ${file}`);
    }
    try {
      const result = execSync(`npx vitest run ${file} --reporter=verbose`, { encoding: 'utf8', timeout: 60000 });
      if (!result.includes('FAIL') && !result.includes('failed')) {
        fail(`RED incompleto: ${file} não tem falhas esperadas`);
      }
      if (result.includes('SyntaxError') || result.includes('TS2')) {
        fail(`RED com erro de sintaxe/tipo em ${file}`);
      }
    } catch (e) {
      const output = e.stdout || e.message;
      if (output && (output.includes('SyntaxError') || output.includes('TS2'))) {
        fail(`RED com erro de sintaxe/tipo em ${file}`);
      }
      if (!output || (!output.includes('FAIL') && !output.includes('failed'))) {
        fail(`RED incompleto: ${file} não tem falhas esperadas`);
      }
    }
  }
}

function validateMigrationOrder(plannedMigrations) {
  const migrationsDir = path.join(process.cwd(), 'utils', 'migrations');
  if (!fs.existsSync(migrationsDir)) return;
  const files = fs.readdirSync(migrationsDir).filter(f => f.startsWith('migration-') && f.endsWith('.sql'));
  const applied = files
    .map(f => parseInt(f.match(/migration-(\d+)-/)?.[1] || '0', 10))
    .filter(n => n > 0)
    .sort((a, b) => a - b);
  const maxApplied = applied.length > 0 ? Math.max(...applied) : 0;
  for (const m of plannedMigrations) {
    const id = parseInt(m.id, 10);
    if (id <= maxApplied && !m.allowReapply) {
      fail(`Migração ${m.id} já aplicada ou conflito de ordem (max aplicado: ${maxApplied})`);
    }
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
  if (/\b(TBD|TODO)\b/.test(spec)) fail("spec.md contém TBD/TODO");
  validateSpecComplete(path.join(dir, "spec.md"));
}
if (next === "PLAN_APPROVED") {
  if (!ctx || ctx.approvals?.plan !== "approved") fail("checkpoint 2 pendente: approvals.plan !== approved (approve-plan)");
  const plan = read(path.join(dir, "plan.md"));
  if (!plan) fail("plan.md ausente");
  if (/^```(ts|tsx|js|jsx|sql|py)\s*$/m.test(plan)) fail("plan.md contém código de implementação — só contratos textuais");
  if (/\b(TBD|TODO)\b/.test(plan)) fail("plan.md contém TBD/TODO");
  validatePlanComplete(path.join(dir, "plan.md"));
  // Validate migration order if plan includes migrations
  const planContent = read(path.join(dir, "plan.md"));
  const migrationMatches = planContent.matchAll(/migration-(\d+)-/g);
  const plannedMigrations = [...migrationMatches].map(m => ({ id: m[1] }));
  if (plannedMigrations.length > 0) {
    validateMigrationOrder(plannedMigrations);
  }
}
if (next === "TASKS_READY") {
  const tasks = readJSON(path.join(dir, "tasks.json"));
  if (!tasks || !Array.isArray(tasks.tasks) || tasks.tasks.length < 3) fail("tasks.json inválido: exige ≥3 tasks");
  for (const t of tasks.tasks) {
    if (!t.id || !t.title || !t.assignee || !Array.isArray(t.acceptanceCriteria) || t.acceptanceCriteria.length === 0)
      fail(`task inválida: ${t.id || "?"}`);
  }
  const plan = read(path.join(dir, "plan.md"));
  if (!plan) fail("plan.md ausente (exigido para TASKS_READY)");
  if (/^```(ts|tsx|js|jsx|sql|py)\s*$/m.test(plan)) fail("plan.md contém código de implementação — só contratos textuais");
}
if (next === "CODING") {
  const tasks = readJSON(path.join(dir, "tasks.json"));
  if (tasks && Array.isArray(tasks.tasks)) {
    const currentTask = tasks.tasks.find(t => t.status === "in_progress" || t.status === "pending");
    if (currentTask && currentTask.files && currentTask.files.length > 0) {
      validateRedComplete(currentTask.files);
    }
  }
}
if (next === "REVIEW") {
  const rep = readJSON(path.join(dir, "test-report.json"));
  if (!rep) fail("test-report.json ausente");
  if ((rep.summary?.failed ?? 1) > 0) fail(`suite com falhas: ${rep.summary.failed} failed — corrija antes do review`);
  if ((rep.summary?.coverage ?? 0) < 80) fail(`coverage ${rep.summary?.coverage} < 80`);
  // Trava anti-mistura (decisão 2026-10-16): test-scenarios.md é SÓ para homologação manual.
  const scenarios = read(path.join(dir, "test-scenarios.md"));
  if (scenarios) {
    if (/\[Automatizado\]/i.test(scenarios)) fail("test-scenarios.md contém tag [Automatizado] — arquivo é só para homologação manual; cobertura automatizada vive em test-report.json");
    if (/__tests__\//.test(scenarios)) fail("test-scenarios.md contém path __tests__/ — arquivo é só para homologação manual; referências a testes automatizados ficam em test-report.json");
  }
}
if (next === "APPROVED") {
  if (!ctx || ctx.approvals?.review !== "approved") fail("checkpoint 3 pendente: approvals.review !== approved");
  const rev = readJSON(path.join(dir, "review-report.json"));
  if (!rev) fail("review-report.json ausente");
  if (rev.status === "blocked") fail("review-report blocked — devolva para fase exata");
}
console.log(`[guardian OK] ${cur} → ${next}`);
