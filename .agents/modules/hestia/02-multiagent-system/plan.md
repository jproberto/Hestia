# 02-multiagent-system Implementation Plan (Olympus)

## Objetivo (atualizado — reflete implementação)

Entregar a **arquitetura completa do sistema multi-agentes Olympus**: 8 agentes (Zeus, Hera, Atena, Hefesto, Minos, Argos, Mnemósine, Caronte — Caronte é agente como os demais, único que commita), com estado persistente em `FEATURE_DIR=.agents/modules/<modulo>/<slug>/` + ponteiro `.agents/current`, system prompts em `.agents/olimpo/*.md` com frontmatter + anti-hallucination, diretório reorganizado por feature (sem `.agents/state/` nem `specs/`/`plans/` na raiz), `regression.md` por módulo, e `sdd.js` + skills SDD legadas arquivadas em `.agents/archive/`.

**Sem MVP, sem coexistência, sem migração gradual.** Entrega única do fluxo completo validado contra o fluxo skills anterior.

---

## Estrutura de Diretórios Alvo (Seção 7 da Spec — corrigida)

```
.agents/
├── modules/                      # Módulos registrados (hestia transversal + pluto)
│   ├── hestia/
│   │   ├── backlog.md            # Backlog guarda-chuva (movido de .agents/backlog.md)
│   │   ├── regression.md         # Acervo smokes transversais (promovido por Minos)
│   │   └── <slug>/               # FEATURE_DIR por feature (ex: 02-multiagent-system/)
│   │       ├── spec.md | plan.md | tasks.json | context.json | checkpoint.json
│   │       ├── diff.patch | test-report.json | review-report.json | test-scenarios.md
│   │       └── ...
│   └── pluto/
│       ├── backlog.md
│       ├── regression.md
│       └── <slug>/               # ex: 01-orcamento/, 02-ajuste-orcamento/
│           └── spec.md | plan.md | tasks.json | context.json | checkpoint.json ...
├── current                       # Ponteiro texto com FEATURE_DIR relativo
├── olimpo/                       # System prompts + config com frontmatter
│   ├── zeus.md                   # mode: primary, task: allow
│   ├── hera.md                   # mode: subagent, deny bash/task
│   ├── atena.md
│   ├── hefesto.md                # não escreve testes
│   ├── minos.md
│   ├── argos.md
│   ├── mnemosine.md
│   └── caronte.md                # Agente — único que commita (read/glob/grep/bash)
├── scripts/
│   └── migrate-skills.js         # One-shot: migra skills antigas → archive/skills/
└── archive/                      # Legado
    ├── skills/                   # .agents/skills/ movido
    └── scripts/
        └── sdd.js                # CLI legado movido — não coexiste mais
```

---

## Agentes (System Prompts em `.agents/olimpo/`)

| Agent | Divindade | Papel | Responsabilidade Única | Ferramentas |
|-------|-----------|-------|------------------------|-------------|
| **Zeus** | Orquestrador | State machine em FEATURE_DIR + `.agents/current`, invoca via Task tool, valida `checkpoint.json.validTransitions` + `approvals` (guardian), frontmatter `mode: primary, task: allow` | read, write, edit, glob, grep, bash, task |
| **Hera** | Analista | Brainstorming estruturado (intenção→jornada→regras/edge→YAGNI), 1 pergunta/turno, 2-3 alternativas, escreve `spec.md` em `FEATURE_DIR` (proibição absoluta de código na spec) | read, write, edit, glob, grep |
| **Atena** | Arquiteta | Lê `spec.md` + codebase → produz `plan.md` + `tasks.json` (`{tasks:[]}`, DAG, criteria testáveis) em `FEATURE_DIR` | read, write, edit, glob, grep |
| **Hefesto** | Implementador | Recebe teste de contrato RED de Minos + `tasks.json`/`plan.md`; **não escreve testes** → implementa mínimo para GREEN → refatora → verifica lint/test/build. 1 task por vez | read, write, edit, bash |
| **Minos** | Testador | **Antes** (por task): testes de contrato RED; **Durante/Depois**: suite completa, cobertura ≥80%, `test-report.json` + `test-scenarios.md` (Dado/Quando/Então) + promoção de smoke para `regression.md`. Não corrige código | read, write, edit, glob, grep, bash |
| **Argos** | Revisor | Analisa `diff.patch` (develop...HEAD) vs `spec.md`+`plan.md`+padrões em 5 eixos, gera `review-report.json` aprovado/bloqueado com `blocker.category` para roteamento | read, write, glob, grep, bash |
| **Mnemósine** | Documentadora | Atualiza `AGENTS.md`, `CHANGELOG.md`, `README.md` + propõe melhorias de processo; lê todo `FEATURE_DIR` + diff; só atua em `APPROVED` | read, write, edit, glob, grep, bash |
| **Caronte** | Commitador (Agente) | **Único que commita** — valida branch `feature/<slug>` de `develop`, pre-commit, `git add <arquivos>` explícito, Conventional Commits PT-BR, push (Actions abre PR). Invocado por Zeus em Step 0, após Atena, após cada task, após Mnemósine, final | read, glob, grep, bash |

---

## State Machine (Fases + Checkpoints Humanos Obrigatórios — implementada)

```
┌─────────────┐
│ SPEC_DRAFT  │ ← Zeus cria FEATURE_DIR + .agents/current → delega Caronte (Step 0) → invoca Hera (brainstorming + feedback loop)
└──────┬──────┘
        │ Hera escreve spec.md em FEATURE_DIR
        ▼
┌──────────────────┐     HUMANO APROVA / FEEDBACK (Checkpoint 1: approve-spec)
│ SPEC_APPROVED    │ ◄────────────────────────────── Zeus valida checkpoint.json.validTransitions + approvals.spec==="approved"
└────────┬─────────┘
          │ Zeus valida → invoca Atena
          ▼
┌─────────────┐
│ PLAN_READY  │ ← Atena escreve plan.md + tasks.json ({tasks:[]}) em FEATURE_DIR
└──────┬──────┘
        │ Zeus valida tasks.json (schema, DAG acíclico, criteria)
        ▼
┌──────────────────┐
│ TASKS_READY      │ ← Tasks prontas para execução
└────────┬─────────┘
          │ Zeus invoca Minos (teste RED por task) → Hefesto (GREEN→refactor→lint/test/build) → Caronte commita por task
          ▼
┌─────────────┐
│ CODING      │ ← Loop por task em ordem de dependências (Minos RED → Hefesto GREEN)
│  (loop)     │ ← Minos valida; Hefesto não escreve testes
└──────┬──────┘
        │ Todos tasks done + testes da feature passando
        ▼
┌─────────────┐
│ TESTING     │ ← Minos suite completa + coverage ≥80% + test-report.json + test-scenarios.md + promoção regression.md
└──────┬──────┘
        │ Se falhas/gaps → volta CODING; se ok → Zeus invoca Argos
        ▼
┌─────────────┐
│ REVIEW      │ ← Argos diff develop...HEAD vs spec+plan → review-report.json (approved|blocked + category)
└──────┬──────┘
        │ Se blocked → Zeus roteia por category → CODING|TASKS_READY|PLAN_READY|SPEC_DRAFT; se approved → aguarda humano
        ▼
┌──────────────────┐     HUMANO TESTE MANUAL + APROVA (Checkpoint 2: approve-review)
│ APPROVED         │ ◄────────────────────────────── Zeus valida approvals.review==="approved"
└────────┬─────────┘
          │ Zeus invoca Mnemósine → Caronte
          ▼
┌─────────────┐
│ COMMITTED   │ ← Mnemósine docs → Caronte docs: + feat: concluída + push (PR via Actions). FEATURE_DIR permanece como histórico
└─────────────┘
Retornos: TESTING→CODING, REVIEW→CODING|TASKS_READY|PLAN_READY|SPEC_DRAFT, APPROVED→... (por blocker.category)
```

**Checkpoints humanos obrigatórios (2 únicos):**
1. **SPEC_APPROVED** — humano aprova spec via conversa (Zeus valida `approvals.spec === "approved"` antes de transição)
2. **APPROVED** — humano aprova review via conversa (Zeus valida `approvals.review === "approved"` antes de transição)

---

## Fluxo de Commits (Apenas Caronte Commita)

| Momento | Ação | Commit? | Mensagem Padrão |
|---------|------|---------|-----------------|
| **Step 0 — Início Feature** | Caronte valida `git status` clean, sem PRs não aprovados em `develop`, cria branch `feature/<slug>` | **Sim** (inicial) | `feat: branch feature/<slug> iniciada — Olympus` |
| **Após Fase 3 (Atena)** | `plan.md` + `tasks.json` produzidos | **Sim** (obrigatório) | `feat: spec + plan registradas para feature <nome>` |
| **Após cada Task (Fase 4)** | Hefesto conclui task + Minos testes passam | **Sim** (por task) | `feat: <descrição-da-task>` |
| **Após Mnemósine (Fase 7)** | Docs atualizadas (AGENTS.md, CHANGELOG.md, README.md) | **Sim** | `docs: atualizar documentação da feature <nome>` |
| **Fase 8 — Final** | Caronte: `git add <arquivos exatos>` explícito (via `git status --porcelain` filtrando `.env`, nunca `git add .`), commit final, push, abre PR | **Sim** (final) | `feat: feature <nome> concluída — Olympus` |

**Nota:** Fases 5 (Minos suite) e 6 (Argos review) **não commiteiam** antecipadamente. Se houver blockers → loop de correção nas fases anteriores → Caronte commita a correção.

---

## Fases de Implementação (Tarefas Detalhadas)

### **Fase 1: Estrutura de Fundação (Diretórios + FEATURE_DIR + System Prompts Base — corrigida)**

| Tarefa | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| **T1.1** | Criar `.agents/olimpo/` | Pasta existe |
| **T1.2** | Criar `.agents/olimpo/zeus.md` com frontmatter `mode: primary, task: allow` + anti-hallucination + state machine FEATURE_DIR/current | Arquivo existe, prompt válido |
| **T1.3** | Criar `.agents/olimpo/hera.md` com frontmatter `mode: subagent` + brainstorming 4 etapas + proibição absoluta de código na spec | Arquivo existe, prompt válido |
| **T1.4** | Criar `.agents/olimpo/atena.md` com tasks.json schema `{tasks:[]}` + interfaces Consome/Produz | Arquivo existe, prompt válido |
| **T1.5** | Criar `.agents/olimpo/hefesto.md` com regra “não escreve nenhum teste” + RED→GREEN→refactor + verificação lint/test/build | Arquivo existe, prompt válido |
| **T1.6** | Criar `.agents/olimpo/minos.md` com testes de contrato RED antes + suite + coverage ≥80% + test-scenarios.md + promoção `regression.md` | Arquivo existe, prompt válido |
| **T1.7** | Criar `.agents/olimpo/argos.md` com rubrica 5 eixos + severidade + category routing | Arquivo existe, prompt válido |
| **T1.8** | Criar `.agents/olimpo/mnemosine.md` com atualização incremental AGENTS/CHANGELOG/README + marcador data/commit | Arquivo existe, prompt válido |
| **T1.9** | Criar `.agents/olimpo/caronte.md` como agente (read/glob/grep/bash, único que commita) + `git add <arquivos>` explícito + validação `.env` | Arquivo existe, prompt válido |
| **T1.10** | Criar `.agents/modules/hestia/` + `.agents/modules/pluto/` (reorganizar por slug) e `.agents/current` (ponteiro FEATURE_DIR) | Pastas + ponteiro existem |
| **T1.11** | Criar `FEATURE_DIR/context.json` inicial: `module/slug/currentPhase: SPEC_DRAFT`, `approvals: {spec: "pending", review: "pending"}` flat, `history/decisions: []` | JSON válido, schema §3 |
| **T1.12** | Criar `FEATURE_DIR/checkpoint.json` inicial: `currentPhase: SPEC_DRAFT`, `validTransitions: ["SPEC_APPROVED"]`, `phaseHistory/blockedTransitions` | JSON válido, schema §3 |
| **T1.13** | Mover `.agents/pluto/*` + `.agents/specs|plans` (raiz) → `.agents/modules/<modulo>/<slug>/spec.md\|plan.md` por feature; mover `.agents/backlog.md` → `.agents/modules/hestia/backlog.md` | Estrutura por slug, histórico preservado |
| **T1.14** | Criar `.agents/archive/skills/` + `.agents/archive/scripts/` e mover `.agents/skills/` → archive/skills + `.agents/scripts/sdd.js` → archive/scripts | Skills + CLI legado preservados, não coexistem |
| **T1.15** | Remover `.agents/skills.md` (catálogo obsoleto) | Arquivo não existe |

| **T1.16** | Criar `.agents/scripts/migrate-skills.js` (stub one-shot) e `.agents/modules/*/regression.md` iniciais | Stubs + regression existem |

**Commit Fase 1 (atualizado):**
- **Caronte** — `feat: fundação Olympus — estrutura olimpo com frontmatter, FEATURE_DIR + current, modules por slug, archive/skills+scripts, regression.md`

---

### **Fase 2: Zeus — Orquestrador + State Machine + Guardian**

| Tarefa | Descrição | Critério de Aceite |
|--------|-----------|-------------------|

| **T2.1** | Zeus (via Task tool): lógica de invocação com validação de `checkpoint.json.validTransitions` + `approvals` antes de cada transição + roteamento por `blocker.category` | Guardian bloqueia pular fases e roteia retorno |
| **T2.6** | Zeus: persistência de `context.json` + `checkpoint.json` em `FEATURE_DIR` a cada mudança de fase (resolve via `.agents/current`) | Estado sobrevive a reinício |
| **T2.3** | Resiliência: Task tool (plataforma) trata timeout/retry de invocação; Caronte usa `git_retry` bash 3× exponencial para operações git remoto; Zeus mantém estado 100% em arquivos locais | Resiliência operacional sem CLI externo |

**Commit Fase 2:**
- **Caronte** — `feat: Zeus orquestrador + state machine + guardian nativo (sem CLI externo)`

---

### **Fase 3: Hera — Analista (Brainstorming + Spec)**

| Tarefa | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| **T3.1** | Hera (via Task tool): loop de brainstorming — 1 pergunta por turno, salva em `context.json.history` | Perguntas sequenciais, histórico persistido |
| **T3.2** | Hera: exploração estruturada — intenção → jornada → regras/edge cases → YAGNI | 4 etapas documentadas no histórico |
| **T3.3** | Hera: apresenta 2-3 alternativas com trade-offs antes de escrever spec | Alternativas no histórico |
| **T3.4** | Hera: escreve `spec.md` em `FEATURE_DIR` (proibição de código, estrutura 7 seções) | Spec completa, formato §5 |
| **T3.5** | Zeus: apresenta `spec.md` para aprovação humana via conversa, aguarda | Checkpoint 1 bloqueia se `approvals.spec !== "approved"` |
| **T3.6** | Se feedback: Zeus reinvoca Hera com feedback → loop até aprovação | Loop funcional |
| **T3.7** | Se aprovado: Zeus valida `validTransitions` inclui `SPEC_APPROVED` + `approvals.spec==="approved"` → atualiza `checkpoint.json`/`context.json` → invoca Atena | Transição válida |

**Commit Fase 3:**
- (Sem commit durante loop — apenas state atualizado. Commit obrigatório após Fase 4)

---

### **Fase 4: Atena — Arquiteta (Plan + Tasks)**

| Tarefa | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| **T4.1** | Atena (via Task tool): lê `spec.md` + codebase (glob/grep no projeto) | Contexto carregado |
| **T4.2** | Atena: fase DESIGN — produz `plan.md`: arquitetura, componentes, contratos, data flow, decisões | Plan.md completo, decisões em `context.json.decisions` |
| **T4.3** | Atena: fase DECOMPOSIÇÃO — produz `tasks.json`: tasks atômicas, independentes, ordenadas por deps, acceptance criteria claros, assignee, files estimados | Tasks.json válido (schema seção 3), ≥ 3 tasks |
| **T4.4** | Zeus: valida `tasks.json` (schema, deps acíclicas, acceptance criteria não vazios) | Validação passa |
| **T4.5** | Zeus: `checkpoint.json.currentPhase = "PLAN_READY"` → `"TASKS_READY"` | Transição válida |

**Commit Fase 4 (OBRIGATÓRIO):**
- **Caronte** — `feat: spec + plan registradas para feature <nome>` (commita `FEATURE_DIR/spec.md` + `plan.md` + `tasks.json`)

---

### **Fase 5: Minos + Hefesto — Implementação TDD por Task (Loop Interno)**

| Tarefa | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| **T5.1** | Minos (via Task tool): para cada task em `tasks.json`, escreve testes de CONTRATO (integration/e2e/aceite) baseados em `spec.md` + `acceptance criteria` **antes** de Hefesto codificar. Salva em `__tests__/` espelhando estrutura. | Testes escritos antes do código |
| **T5.2** | Hefesto (via Task tool): pega task 1, roda teste de Minos → confirma falha (red) | Red confirmado |
| **T5.3** | Hefesto: implementa código mínimo para fazer teste passar (green) | Green confirmado |
| **T5.4** | Hefesto: refatora sem quebrar teste | Refatoração válida |
| **T5.5** | Hefesto: marca task `done` em `tasks.json`, Zeus atualiza `checkpoint.json` | Task marcada |
| **T5.6** | Caronte: commita incremento da task | Commit `feat: <task>` |
| **T5.7** | Repetir T5.1–T5.6 para **todas** tasks em ordem de dependência | Todas tasks `done`, commits por task |
| **T5.8** | Zeus: `checkpoint.json.currentPhase = "CODING"` → `"TESTING"` | Transição válida |

**Commits Fase 5:**
- **Caronte** — um commit por task concluída: `feat: <descrição-da-task>`

---

### **Fase 6: Minos — Suite Completa + Cobertura + Cenários Manuais + Regressão**

| Tarefa | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| **T6.1** | Minos: roda suite completa (todos testes das tasks + regressão) | Suite roda sem erro |
| **T6.2** | Minos: gera `test-report.json`: pass/fail por teste, cobertura %, gaps | JSON válido, cobertura ≥ 80% |
| **T6.3** | Minos: escreve `test-scenarios.md` (Dado/Quando/Então) baseado em spec + tasks.json para homologação manual | Cenários cobrem acceptance criteria |
| **T6.4** | Minos: mantém/atualiza testes de regressão (edge cases, remove obsoletos) | Regressão estável |
| **T6.5** | Se falhas/gaps → devolve para Hefesto (loop Fase 5) até 100% verde | Loop funcional |
| **T6.6** | Zeus: `checkpoint.json.currentPhase = "TESTING"` → `"REVIEW"` | Transição válida |

**Commit Fase 6:** Nenhum (apenas relatórios). Se correções → commit na Fase 5.

---

### **Fase 7: Argos — Revisão Qualitativa (Pode Devolver Para Qualquer Fase Anterior)**

| Tarefa | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| **T7.1** | Argos (via Task tool): recebe `diff.patch` consolidado + `spec.md` + `plan.md` | Contexto carregado |
| **T7.2** | Argos: analisa spec compliance, segurança, performance, estilo, breaking changes | Análise completa |
| **T7.3** | Argos: gera `review-report.json`: `{"status": "approved|blocked", "findings": [...], "blockers": [...]}` | JSON válido |
| **T7.4** | Se **blocked**: Zeus devolve para fase correspondente (Hefesto/Minos = código/testes, Atena = arquitetura/tasks, Hera = spec) com feedback detalhado. Loop de correção. | Loop para fase exata |
| **T7.5** | Se **approved**: Zeus `checkpoint.json.currentPhase = "REVIEW"` → `"APPROVED"` | Transição válida |

**Commit Fase 7:** Somente se blockers (correções). Caronte commita o ajuste.

---

### **Fase 8: Checkpoint 2 — Homologação Manual Humana**

| Tarefa | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| **T8.1** | Humano executa cenários de `test-scenarios.md` (gerado por Minos na Fase 6) | Cenários executados |
| **T8.2** | Humano valida UX, regras de negócio, edge cases na UI real | Validação confirmada |
| **T8.3** | Humano aprova diff → Zeus `context.json.approvals.review = "approved"`, `checkpoint.json.currentPhase = "APPROVED"` | Checkpoint 2 liberado |
| **T8.4** | Se rejeitado: feedback → Zeus devolve para fase apropriada (loop) | Loop funcional |

**Commit Fase 8:** Nenhum (apenas aprovação no state).

---

### **Fase 9: Mnemósine — Documentação (Antes do Commit Final)**

| Tarefa | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| **T9.1** | Mnemósine (via Task tool): lê todo contexto do ciclo (`FEATURE_DIR` + `.agents/olimpo/` + `diff.patch` + `regression.md`) | Contexto completo |
| **T9.2** | Atualiza `AGENTS.md` (estrutura FEATURE_DIR/current, olimpo com frontmatter) | AGENTS.md atualizado |
| **T9.3** | Atualiza `CHANGELOG.md` (Keep a Changelog + SemVer, feat/fix/docs) | CHANGELOG.md atualizado |
| **T9.4** | Atualiza `README.md` (guia rápido: Zeus orquestra via conversa) | README.md atualizado |
| **T9.5** | Propõe melhorias nos prompts/processo baseadas no ciclo (registra em `.agents/modules/<modulo>/backlog.md` + `context.json.decisions`) | Melhorias documentadas |
| **T9.6** | Zeus: valida `review-report.json: approved` + `approvals.review==="approved"` → `checkpoint.json: APPROVED → COMMITTED` | Transição válida |

**Commit Fase 9 (OBRIGATÓRIO):**
- **Caronte** — `docs: atualizar documentação da feature <nome>` (commita AGENTS.md + CHANGELOG.md + README.md)

---

### **Fase 10: Caronte — Finalização + Push + PR**

| Tarefa | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| **T10.1** | Caronte (via Task tool): verifica `git status` clean | Clean |
| **T10.2** | Verifica sem PRs não aprovados em `develop` | Validado |
| **T10.3** | `git add <arquivos exatos>` (olimpo, FEATURE_DIR, codebase, docs, testes — `.env` nunca) | Staged explícito |
| **T10.4** | Commit final: `feat: feature <nome> concluída — Olympus` (valida `package.json` SemVer bump por Mnemósine) | Commit criado |
| **T10.5** | `git push -u origin feature/<slug>` (se branch nova) ou `git push`; GitHub Actions abre PR para `develop` | PR aberta via Actions |
| **T10.6** | Zeus: atualiza `.agents/modules/<modulo>/backlog.md` para `Concluído` | Backlog atualizado |
| **T10.7** | Zeus: mantém `FEATURE_DIR` como histórico permanente (não limpa) + mantém `.agents/current` apontando | Histórico preservado |

**Commit Fase 10:**
- **Caronte** — commit final local + push remoto (PR aberta)

---

### **Fase 11: Validação Final da Arquitetura (Pós-Implementação)**

| Tarefa | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| **T11.1** | Criar feature teste real: "página de configurações do usuário" | Feature definida |
| **T11.2** | Executar ciclo completo via agentes: Zeus → Hera → Atena → Hefesto+Minos → Argos → Mnemósine → Caronte | Ciclo roda sem intervenção manual no meio |
| **T11.3** | Comparar com execução anterior via skills (referência histórica): qualidade spec/plano/código/testes/review/docs, tempo total, robustez | Agentes ≥ skills em todos os critérios |
| **T11.4** | Se validado: confirmar skills arquivadas, fluxo 100% agentes ativado | Transição completa |

---

## Critérios de Aceite Globais (Seção 8 da Spec — atualizados)

1. ✅ Estrutura reorganizada (`.agents/olimpo/` com frontmatter, `FEATURE_DIR=.agents/modules/<modulo>/<slug>/`, `.agents/current`, `.agents/archive/skills/`+`scripts/sdd.js`, `regression.md`) — sem `.agents/state/` nem `specs/`/`plans/` raiz
2. ✅ 8 agentes (Zeus, Hera, Atena, Hefesto, Minos, Argos, Mnemósine, Caronte) em `.agents/olimpo/*.md` com frontmatter `description/mode/color/temperature/permission` + anti-hallucination completos
3. ✅ Todos os 8 agentes funcionando em conjunto via Task tool (Caronte é agente como demais, único que commita — Hefesto nunca escreve testes)
4. ✅ State machine persiste em `FEATURE_DIR` (`context.json`/`checkpoint.json` + `phaseHistory/validTransitions`) e sobrevive via `.agents/current`
5. ✅ Checkpoints humanos: `approve-spec` (SPEC_APPROVED) e `approve-review` (APPROVED) bloqueiam (`approvals.* !== "approved"`) + `validTransitions` inclui retornos por `category`
6. ✅ Guardian nativo: Zeus valida `checkpoint.json` + mapeamento `code→CODING, tasks→TASKS_READY, spec→SPEC_DRAFT`
7. ✅ Documentação atualizada: AGENTS.md (olimpo/Zeus/FEATURE_DIR), CHANGELOG.md (Keep a Changelog + SemVer), README.md (guia Zeus)
8. ✅ Skills + `sdd.js` arquivados em `.agents/archive/skills/` e `.agents/archive/scripts/sdd.js` (sem coexistência)
9. ✅ (sem CLI externo — Zeus orquestra via Task tool + read/write/bash)
10. ✅ Ciclo completo validado: objetivo → spec → plan → tasks → código (Minos RED → Hefesto GREEN) → testes (coverage ≥80% + test-scenarios) → review → homologação → docs → commit
11. ✅ Resiliência: Task tool (plataforma) trata timeout/retry de invocação; Caronte usa `git_retry` bash 3× exponencial para operações git remoto; Zeus mantém estado 100% em arquivos locais
12. ✅ `FEATURE_DIR` + `.agents/current` criados no início do brainstorming (SPEC_DRAFT), não após aprovação; mantido como histórico permanente

---

## Nota de Migração — Pendências Dispensadas (2026-08-27)

> **Fluxo Olympus ainda em construção — não 100% válido. Os dois pontos abaixo são esperados e NÃO precisam ser completados nesta fase.**
>
> 1. **FEATURE_DIR incompleto** (`hestia/02-multiagent-system` com só `spec.md/plan.md/context.json/checkpoint.json`): `tasks.json` e artefatos de `CODING/TESTING/REVIEW` (`diff.patch`, `test-report.json`, etc) só existirão após `approve-spec` e execução das Fases 3-7. Fase `SPEC_DRAFT` é o correto agora.
> 2. **`git status` com `D` + `??`**: `D .agents/specs|plans|skills/state` e `?? .agents/modules/...` são o `git mv` da migração `§7` ainda não commitado por Caronte — dispensado até estabilização do fluxo.

---

## Próximo Passo

**Confirmar este plano.** Se aprovado, inicio a execução da **Fase 1** (Tarefas T1.1 a T1.17), criando a estrutura base do Olympus.

**Concorda com este plano reescrito?** Se sim, inicio imediatamente.