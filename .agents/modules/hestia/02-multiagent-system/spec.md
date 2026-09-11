# Spec: Sistema Multi-Agentes Héstia (Olympus)

**ID:** 02
**Status:** Concluído

## 1. Objetivo

Substituir o fluxo SDD baseado em skills sequenciais (`sdd-01` a `sdd-05`, `sdd-tool-*`) por um **sistema de agentes colaborativos** orquestrados, com estado persistente, checkpoints explícitos e execução paralela.

O sistema permite que um humano descreva um objetivo de alto nível e obtenha código validado, testado, revisado e documentado através de uma equipe de agentes especializados.

---

## 2. Agentes (O Time Olímpico)

| Agente | Divindade | Papel | Ferramentas | Entrada Principal | Saída Principal |
|--------|-----------|-------|-------------|-------------------|-----------------|
| **Orquestrador** | **Zeus** | Coordena ciclo de vida, gerencia estado, invoca agentes, valida transições | `read, write, edit, glob, grep, bash, task` | Objetivo humano + `context.json` | Estado final, diff pronto para commit |
| **Analista** | **Hera** | Brainstorming humano↔IA, discovery, especificação funcional | `read, write, edit, glob, grep` | Objetivo + contexto do projeto | `spec.md` |
| **Arquiteta** | **Atena** | Design técnico, arquitetura, decomposição em tasks atômicas | `read, write, edit, glob, grep` | `spec.md` + codebase | `plan.md` + `tasks.json` |
| **Implementador** | **Hefesto** | Implementação via TDD, código + testes unitários | `read, write, edit, bash` | `tasks.json` + `plan.md` | Código + testes passando |
| **Testes** | **Minos** | Juiz binário: escreve/roda testes, valida cobertura, edge cases | `read, write, edit, glob, grep, bash` | Código + requisitos | `test-report.json` (pass/fail/coverage) |
| **Revisor** | **Argos** | Validação qualitativa: spec compliance, padrões, segurança, estilo | `read, write, glob, grep, bash` | Diff + `spec.md` + `plan.md` | `review-report.json` (aprovado/bloqueado + achados) |
| **Documentadora** | **Mnemósine** | Atualiza memória do projeto: AGENTS.md, CHANGELOG.md, README, skills | `read, write, edit, glob, grep, bash` | Contexto completo do ciclo | Arquivos de documentação atualizados |
| **Commitador** | **Caronte** | Agente — Git hygiene: branches, commit messages, push gates (único que commita) | `read, glob, grep, bash` | Diff validado + mensagem | Commit realizado |

---

## 3. Estado Compartilhado (`FEATURE_DIR = .agents/modules/<modulo>/<slug>/`)

> **Correção de arquitetura (implementada):** substitui `.agents/state/` efêmero por diretório por feature + ponteiro `.agents/current`. Cada feature tem estado isolado e histórico permanente — não há `state/` global nem arquivamento ao fim.

```
.agents/modules/<modulo>/<slug>/   # FEATURE_DIR — ex: .agents/modules/hestia/02-multiagent-system
├── context.json          # Objetivo, histórico, decisões, metadados da sessão
├── spec.md               # Spec aprovada (output Hera)
├── plan.md               # Plano arquitetural (output Atena)
├── tasks.json            # Tasks atômicas: {tasks: [{id, title, deps, status, assignee, acceptance}]}
├── diff.patch            # Diff gerado por Hefesto (git diff develop...HEAD)
├── test-report.json      # Resultado testes (output Minos)
├── test-scenarios.md     # Cenários Dado/Quando/Então para homologação humana (output Minos)
├── review-report.json    # Resultado review (output Argos)
└── checkpoint.json       # Estado da state machine: fase atual, transições válidas, histórico
.agents/current           # Ponteiro texto com FEATURE_DIR relativo (ex: .agents/modules/hestia/02-multiagent-system)
.agents/modules/<modulo>/regression.md   # Acervo permanente de smokes (≤3 passos) — promovido por Minos
.agents/modules/hestia/regression.md     # Idem para transversais
```

**`context.json` schema (implementado):**
```json
{
  "sessionId": "uuid | olympus-<timestamp>",
  "objective": "string",
  "module": "hestia | pluto | ...",
  "slug": "string",
  "currentPhase": "SPEC_DRAFT | SPEC_APPROVED | PLAN_READY | TASKS_READY | CODING | TESTING | REVIEW | APPROVED | COMMITTED",
  "history": [
    {"phase": "SPEC_DRAFT", "agent": "Hera | Zeus", "timestamp": "iso", "summary": "..."}
  ],
  "decisions": [
    {"id": "dec-1", "question": "...", "options": [...], "chosen": "...", "rationale": "..."}
  ],
  "approvals": {
    "spec": "pending|approved",
    "review": "pending|approved"
  }
}
```

**`checkpoint.json` schema (implementado):**
```json
{
  "currentPhase": "SPEC_DRAFT",
  "validTransitions": ["SPEC_APPROVED"],
  "phaseHistory": [{"phase": "SPEC_DRAFT", "timestamp": "iso", "trigger": "feature_start|phase_transition"}],
  "blockedTransitions": [],
  "lastUpdated": "iso"
}
```

**`tasks.json` schema (implementado):**
```json
{
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Criar migration schema_migrations",
      "description": "...",
      "dependencies": [],
      "status": "pending|in_progress|done|blocked",
      "assignee": "Hefesto",
      "acceptanceCriteria": ["Migration roda sem erro", "Tabela criada no Supabase"],
      "files": ["utils/migrations/<timestamp>_<slug>.sql", "lib/<modulo>/db/..."]
    }
  ]
}
```

---

## 4. State Machine (Fases + Checkpoints Humanos)

```
┌─────────────┐
│ SPEC_DRAFT  │ ← Zeus invoca Hera (pode iterar com feedback humano)
└──────┬──────┘
       │ Hera escreve spec.md
       ▼
┌──────────────────┐     HUMANO APROVA / FEEDBACK
│ SPEC_APPROVED    │ ◄──────────────────────────────
└────────┬─────────┘
         │ Zeus valida → invoca Atena
         ▼
┌─────────────┐
│ PLAN_READY  │ ← Atena escreve plan.md + tasks.json
└──────┬──────┘
       │ Zeus valida tasks.json
       ▼
┌──────────────────┐
│ TASKS_READY      │ ← Tasks prontas para execução
└────────┬─────────┘
         │ Zeus invoca Hefesto + Minos (paralelo)
         ▼
┌─────────────┐
│ CODING      │ ← Hefesto implementa tasks (TDD loop interno)
│  (loop)     │ ← Minos escreve/roda testes para cada task
└──────┬──────┘     (feedback loop até 100% pass)
       │ Todos tests passam
       ▼
┌─────────────┐
│ TESTING     │ ← Minos roda suite completa, gera test-report.json
└──────┬──────┘
       │ Zeus invoca Argos
       ▼
┌─────────────┐
│ REVIEW      │ ← Argos analisa diff vs spec+plan+padrões
└──────┬──────┘
       │ Argos aprova
       ▼
┌──────────────────┐     HUMANO TESTE MANUAL + APROVA
│ APPROVED         │ ◄──────────────────────────────
└────────┬─────────┘
         │ Zeus invoca Mnemósine + Caronte
         ▼
┌─────────────┐
│ COMMITTED   │ ← Documentação atualizada + commit realizado
└─────────────┘
```

**Checkpoints humanos obrigatórios:**
1. **SPEC_APPROVED** — Humano lê `spec.md`, aprova ou dá feedback → Hera refaz
2. **APPROVED** — Humano roda testes manuais, valida UX, aprova diff → Caronte commita

---

## 5. Contratos de Handoff

### Hera → Atena (`spec.md` → `plan.md` + `tasks.json`)
- Spec deve ter: problema, usuários, regras de negócio, critérios de aceite, fora de escopo
- Atena **não** altera spec; se ambígua, devolve para Zeus → Hera

### Atena → Hefesto/Minos (`tasks.json`)
- Tasks atômicas, independentes quando possível, ordenadas por dependência
- Cada task: acceptance criteria claros, arquivos alvo estimados

### Hefesto → Minos (código ↔ testes)
- **Modelo híbrido fora-do-dentro (outside-in):** Minos escreve testes de **contrato** (integration, e2e, cenários de aceite) **baseados na spec + tasks.json + contratos do plano** **antes** de Hefesto codificar; teste deve falhar (RED) por motivo funcional
- Hefesto **não escreve nenhum teste** (nem unitário auxiliar) — recebe o teste RED de Minos e implementa o mínimo para GREEN → refatora com teste verde; se sentir falta de cobertura, solicita via Zeus (`REQUEST: Need test for <caso>`)
- Loop por task em ordem de DAG: Minos (RED) → Hefesto (GREEN → refatoração → verifica lint/test/build) → Caronte commita → próxima task
- Loop global: Minos suite completa → falhas/gaps → Hefesto corrige → repete até 100% verde e cobertura ≥80%
- Minos **não** corrige código; só aponta falhas e gaps de cobertura

### Hefesto/Minos → Argos (`diff.patch` + `test-report.json`)
- Argos recebe diff consolidado + relatório de testes
- Argos **não** roda testes; confia em `test-report.json`

### Argos → Zeus (`review-report.json`)
- `{"status": "approved|blocked", "findings": [...], "blockers": [...]}`
- Se blocked → Zeus devolve para Hefesto (code) ou Atena (arch)

---

## 6. System Prompts Base (Esqueleto)

### Zeus (Orquestrador)
```
Você é Zeus, rei do Olimpo, orquestrador do sistema Héstia.
Gerencia o ciclo de vida de features via state machine em .agents/modules/<modulo>/<slug>/ (FEATURE_DIR) + ponteiro .agents/current.
Invoca agentes via Task tool. Valida transições (guardian nativo) lendo checkpoint.json/validTransitions e approvals.spec/review.
NÃO escreve código, specs, plans — apenas coordena. Resolve FEATURE_DIR via .agents/current.
Ferramentas: read, write, edit, glob, grep, bash, task.
```

### Hera (Analista)
```
Você é Hera, rainha do Olimpo, parceira de Zeus.
Especialista em product discovery: faz UMA pergunta por vez, explora intenção,
mapeia jornada, antecipa edge cases, define YAGNI.
Escreve spec.md em FEATURE_DIR (.agents/modules/<modulo>/<slug>/). NÃO implementa.
Ferramentas: read, write, edit, glob, grep.
```

### Atena (Arquiteta)
```
Você é Atena, deusa da sabedoria e estratégia.
Recebe spec.md + codebase. Produz plan.md (arquitetura, componentes, contratos)
e tasks.json (tasks atômicas, dependências, acceptance criteria) em FEATURE_DIR.
Duas fases: DESIGN → DECOMPOSIÇÃO. NÃO codifica.
Ferramentas: read, write, edit, glob, grep.
```

### Hefesto (Implementador)
```
Você é Hefesto, deus da forja, artesão divino.
Recebe task + plan.md + teste de contrato RED de Minos. NÃO escreve testes — implementa mínimo para GREEN → refatora.
Uma task por vez. Usa debug-first se travar (relata erro+hipóteses+tentativas). NÃO decide arquitetura.
Ferramentas: read, write, edit, bash.
```

### Minos (Testes)
```
Você é Minos, juiz do submundo. Pesa a alma do código.
Escreve testes de CONTRATO (integration, e2e, cenários de aceite) **baseados na spec + tasks.json** ANTES da implementação.
Roda suite completa, valida cobertura, edge cases, performance.
Gera test-report.json. Binário: passa ou falha. NÃO corrige código — só aponta onde quebra.
Ferramentas: read, write, edit, glob, grep, bash.
```

### Argos (Revisor)
```
Você é Argos, o vigilante de 100 olhos.
Analisa diff.patch contra spec.md + plan.md + padrões do projeto (AGENTS.md, eslint, etc).
Verifica: spec compliance, segurança, performance, estilo, breaking changes.
Gera review-report.json. NÃO corrige — apenas aponta.
Ferramentas: read, write, glob, grep, bash.
```

### Mnemósine (Documentadora)
```
Você é Mnemósine, deusa da memória, mãe das Musas.
Atualiza AGENTS.md (mudanças arquiteturais), CHANGELOG.md (feat/fix/breaking),
README.md (guias), e propõe melhorias nos agentes/processo.
Lê todo contexto do ciclo. NÃO altera código de produção.
Ferramentas: read, write, edit, glob, grep, bash.
```

### Caronte (Commitador)
```
Você é Caronte, barqueiro do Estige. Faz a travessia final.
Cria branch `feature/<modulo>/<slug>` (ou `feature/hestia/<slug>` se transversal), mensagem convencional (feat/fix/docs/chore/refactor),
valida pre-commit (lint, typecheck, testes), faz git add <arquivos> explícito + commit + push.
Invocado por Zeus em todo commit do ciclo (Step 0, após Atena, após cada task, após Mnemósine, final).
Ferramentas: read, glob, grep, bash.
```

---

## 7. Reorganização do Diretório `.agents/`

### Atual (Problemática)
```
.agents/
├── backlog.md
├── skills.md              # Catálogo de skills (obsoleto)
├── skills/                # Skills SDD (obsoletas → substituídas por agentes)
│   ├── sdd-01-brainstorm/
│   ├── sdd-02-plan/
│   ├── sdd-03-implement/
│   ├── sdd-04-review/
│   ├── sdd-05-manual-test/
│   ├── sdd-tool-commit/
│   ├── sdd-tool-db-migration/
│   ├── sdd-tool-debug/
│   ├── sdd-tool-guardian/
│   ├── sdd-writer-agents/
│   ├── sdd-writer-changelog/
│   └── sdd-writer-skills/
├── scripts/
│   └── sdd.js             # CLI guardian + automações (simplificar)
├── specs/                 # Specs transversais (manter)
├── plans/                 # Plans transversais (manter)
├── pluto/                 # Módulo Pluto (manter padrão)
│   ├── backlog.md
│   ├── specs/
│   ├── plans/
│   └── logs/
└── logs/                  # Logs transversais (manter)
```

### Proposta Nova (implementada — corrige divergência)
```
.agents/
├── modules/                      # Módulos registrados (hestia transversal + pluto)
│   ├── hestia/
│   │   ├── backlog.md            # Backlog guarda-chuva (movido de .agents/backlog.md)
│   │   ├── regression.md         # Acervo permanente de smokes transversais
│   │   └── <slug>/               # FEATURE_DIR por feature (ex: 02-multiagent-system/)
│   │       ├── spec.md | plan.md | tasks.json | context.json | checkpoint.json
│   │       ├── diff.patch | test-report.json | review-report.json | test-scenarios.md
│   │       └── ...
│   └── pluto/
│       ├── backlog.md
│       ├── regression.md
│       └── <slug>/               # ex: 01-orcamento/, 02-ajuste-orcamento/
│           └── spec.md | plan.md | tasks.json | context.json | checkpoint.json ...
├── current                       # Ponteiro texto com FEATURE_DIR relativo (resolvido por Zeus via read/write)
├── olimpo/                       # Definições dos agentes (system prompts + config com frontmatter)
│   ├── zeus.md                   # System prompt + config (mode: primary, permission task: allow)
│   ├── hera.md                   # mode: subagent, deny bash/task
│   ├── atena.md
│   ├── hefesto.md
│   ├── minos.md
│   ├── argos.md
│   ├── mnemosine.md
│   └── caronte.md                # Agente — único que commita (read/glob/grep/bash)
├── scripts/
│   └── migrate-skills.js         # One-shot: migra skills antigas → archive/skills/
└── archive/                      # Skills + CLI legado (referência histórica)
    ├── skills/                   # Move .agents/skills/ para cá
    └── scripts/
        └── sdd.js                # CLI legado movido de .agents/scripts/sdd.js
```

### Mudanças Resumidas (atualizadas)

| Item | Ação | Nota |
|------|------|------|
| `.agents/skills/` | Mover para `.agents/archive/skills/` | Feito — T1.14 |
| `.agents/skills.md` | Remover (catálogo obsoleto) | Feito |
| `.agents/scripts/sdd.js` | Mover para `.agents/archive/scripts/sdd.js` | Feito — não coexiste mais com CLI externo |
| `.agents/backlog.md` | Mover para `.agents/modules/hestia/backlog.md` | Ajuste: guarda-chuva agora é módulo `hestia` |
| `.agents/specs/` + `.agents/plans/` (raiz) | Remover — substituídos por `modules/<modulo>/<slug>/spec.md\|plan.md` por feature | Correção: elimina duplicação com `state/` |
| `.agents/state/` | **Não criar** — substituído por `FEATURE_DIR` + `.agents/current` | Correção: estado por feature, permanente, não efêmero global |
| `.agents/olimpo/` | **Criar** — system prompts com frontmatter `description/mode/color/temperature/permission` + anti-hallucination | Feito |
| `.agents/current` | **Criar** — ponteiro FEATURE_DIR | Novo |
| `.agents/modules/*/regression.md` | **Criar** — acervo de smokes (≤3 passos) promovido por Minos | Novo — item 4 |

---

## 8. Critérios de Aceite (atualizados)

1. **Estrutura de diretórios** reorganizada conforme seção 7 (`.agents/olimpo/`, `FEATURE_DIR=.agents/modules/<modulo>/<slug>/`, `.agents/current`, `.agents/archive/skills/`+`scripts/`, `regression.md`) — sem `.agents/state/` nem `specs/`/`plans/` na raiz
2. **8 agentes** definidos em `.agents/olimpo/*.md` com frontmatter `description/mode/color/temperature/permission` + seção anti-hallucination e prompts completos prontos para produção
3. **Todos os 8 agentes** (Zeus, Hera, Atena, Hefesto, Minos, Argos, Mnemósine, Caronte) funcionando em conjunto via `Task` tool (Caronte é agente como os demais, único que commita)
4. **State machine** completa persiste em `FEATURE_DIR` (`context.json`+`checkpoint.json`) e sobrevive a reinício de sessão via `.agents/current`
5. **Checkpoints humanos** obrigatórios: SPEC_APPROVED e APPROVED bloqueiam transição (`approvals.spec/review !== "approved"`)
6. **Guardian nativo**: Zeus impede pular fases (valida `checkpoint.json.validTransitions` + mapeamento de retorno por `category`)
7. **Documentação** atualizada: AGENTS.md, CHANGELOG.md, README.md refletem nova arquitetura (olimpo/Zeus/FEATURE_DIR)
8. **Skills + sdd.js legados** arquivados em `.agents/archive/skills/` e `.agents/archive/scripts/sdd.js` (sem coexistência)
9. **Ciclo completo** validado: objetivo humano → spec → plan → tasks → código → testes → review → testes manuais → **documentação → commit**
10. **Resiliência**: Task tool (plataforma) trata timeout/retry de agentes; Caronte usa `git_retry` bash 3× para operações git remoto
11. **FEATURE_DIR** + `.agents/current` criados no início do brainstorming (SPEC_DRAFT), não após aprovação; mantido como histórico permanente

---

## 9. Fora de Escopo (YAGNI)

- Execução paralela de tasks (Hefesto + Minos simultâneos)
- Auto-retry de tasks falhadas
- Integração com GitHub Actions / CI
- UI/Web dashboard para visualizar estado
- Agentes adicionais (Security, Performance, etc)
- Migração automática de skills antigas (script one-shot separado)

---

## 10. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Task tool invocation falha silenciosamente | Zeus valida retorno de cada agente; timeout + retry |
| Estado corrompido (concorrência) | Single-writer: só Zeus escreve `checkpoint.json`; agents leem |
| System prompts muito longos → token limit | Prompts modulares; Zeus passa apenas contexto relevante por agente |
| Humanos pulam checkpoints | Zeus **não avança** sem approval flag em `context.json` |
| Perda de conhecimento das skills antigas | Archive preserva; migração manual seletiva quando útil |
| **Modelos gratuitos: timeout, erro, lentidão** | **Resiliência na camada de orquestração**: Task tool (plataforma) trata timeout/retry de invocação; Caronte usa `git_retry` bash 3× exponencial para operações git remoto; Zeus mantém estado 100% em arquivos locais |
| **Contexto perdido entre invocações Task** | **Estado 100% em arquivos (FEATURE_DIR + .agents/current); Zeus reconstrói contexto a cada invocação; agents são stateless** |

---

## 11. Esclarecimentos de Arquitetura

### 11.1 `FEATURE_DIR` vs Módulos vs Backlog vs Regressão (corrigido)

| Local | Conteúdo | Ciclo de Vida |
|-------|----------|---------------|
| **`FEATURE_DIR = .agents/modules/<modulo>/<slug>/`** | **Estado VIVO e HISTÓRICO da feature** (context.json, spec.md, plan.md, tasks.json, diff.patch, test-report.json, review-report.json, test-scenarios.md, checkpoint.json) | **Criado no início do brainstorming (SPEC_DRAFT)** via Zeus (`write` context.json/checkpoint.json + `.agents/current`), mantido durante ciclo e **preservado como histórico permanente** após COMMITTED (não arquivado/limpo). Um por feature. |
| **`.agents/current`** | Ponteiro texto com FEATURE_DIR relativo | **Efêmero global** — sobrescrito a cada nova feature por Zeus |
| **`.agents/modules/hestia/backlog.md`** | Backlog guarda-chuva (movido de `.agents/backlog.md`) | **Permanente** — tabela de módulos + estrutural |
| **`.agents/modules/<modulo>/backlog.md`** | Backlog do módulo (ex: Pluto) | **Permanente por módulo** |
| **`.agents/modules/<modulo>/regression.md`** / `.agents/modules/hestia/regression.md` | Acervo de smokes manuais (≤3 passos) promovidos por Minos | **Permanente** — caminho feliz essencial |
| **`.agents/olimpo/`** | System prompts + config dos agentes olímpicos (com frontmatter) | **Permanente** — código do "framework" |

**Fluxo (implementado):** Zeus cria `FEATURE_DIR` + `context.json`/`checkpoint.json` + grava `.agents/current` (SPEC_DRAFT) → Hera escreve `spec.md` lá → humano `approve-spec` → Atena escreve `plan.md` + `tasks.json` lá → Caronte commita spec+plan → Hefesto/Minos/Argos/Mnemósine leem/escrevem lá → Mnemósine atualiza docs → Caronte finaliza + push; FEATURE_DIR permanece, backlog atualizado para `Concluído`.

### 11.2 JSON vs Markdown no Estado

| Arquivo | Formato | Por quê |
|---------|---------|---------|
| `context.json`, `tasks.json` (`{tasks:[]}`), `checkpoint.json` (`phaseHistory/validTransitions/blockedTransitions`), `test-report.json`, `review-report.json` | **JSON** | Parsing programático, validação de schema, queries, automação (Zeus lê/escreve via código) |
| `spec.md`, `plan.md`, `diff.patch`, `test-scenarios.md` | **Markdown** | Legibilidade humana, diff nativo no git, revisão em PR, ferramentas de docs |

**Regra:** Máquina lê JSON; Humano lê MD. Zeus faz a ponte. `tasks.json` envolto em `{tasks: []}` (não array puro) para validação DAG.

### 11.3 Estratégia de Implementação: Direto ao Fluxo Completo

**Não haverá coexistência nem migração gradual.** A implementação desta spec entrega **8 agentes (Zeus, Hera, Atena, Hefesto, Minos, Argos, Mnemósine, Caronte)** operacionais de uma vez. Skills SDD atuais (`sdd-01` a `sdd-05`, `sdd-tool-*`) serão movidas para `.agents/archive/skills/` **após** validação completa do novo fluxo.

**Validação Final (Pós-Implementação):**
1. Cria feature teste real (ex: "página de configurações do usuário")
2. Executa **ciclo completo via agentes**: Zeus → Hera → Atena → Hefesto+Minos → Argos → Mnemósine → Caronte
3. Compara resultado com execução anterior via skills (referência histórica)
4. Critérios: qualidade da spec/plano/código/testes/review/docs, tempo total, robustez, zero intervenção manual no meio do ciclo
5. Se agentes ≥ skills em todos os critérios → **skills arquivadas, fluxo 100% agentes ativado**

### 11.4 Minos + Homologação Humana (Testes Manuais)

Minos **gera** `test-scenarios.md` (cenários de teste manual) baseado na spec + tasks.json:
```markdown
# Cenários de Homologação Manual — Feature X

## Cenário 1: Fluxo Principal
- **Dado** usuário logado com perfil admin
- **Quando** acessa `/settings`
- **Então** vê abas: Perfil, Notificações, Integrações

## Cenário 2: Edge Case — Sem Permissão
- **Dado** usuário logado com perfil viewer
- **Quando** tenta acessar `/settings`
- **Então** redirecionado para dashboard com toast "Acesso negado"

## Cenário 3: Validação de Dados
- **Dado** formulário de integração
- **Quando** submete URL inválida
- **Então** erro inline "URL deve ser HTTPS válida"
```
Humano executa cenários na fase **APPROVED** (checkpoint 2). Argos valida se cenários cobrem acceptance criteria.

### 11.5 Hera: Brainstorming Obrigatório (Não Opcional)

Correção no State Machine: **SPEC_DRAFT** = Hera **deve** conduzir brainstorming estruturado:
1. Pergunta única por turno (regra estrita)
2. Explora: intenção → jornada → regras/edge cases → YAGNI
3. Apresenta 2-3 alternativas com trade-offs
4. **Só então** escreve `spec.md`
5. Humano aprova → `SPEC_APPROVED` ou dá feedback → loop

Zeus **bloqueia** transição se `context.json.approvals.spec !== "approved"` (flat string, não objeto) e `approvals.review !== "approved"` no checkpoint 2; `checkpoint.json.validTransitions` valida todas as transições, incluindo retornos `REVIEW → CODING|TASKS_READY|PLAN_READY|SPEC_DRAFT` por `blocker.category`.

**Entregas desta spec (Arquitetura Completa — atualizada):**
1. Aprovação desta spec
2. Plano de implementação (Atena → tasks.json em FEATURE_DIR)
3. Implementação completa (Hefesto + Minos — 8 agentes, Hefesto sem escrever testes)
4. Review (Argos) com `review-report.json` + diff `develop...HEAD`
5. Testes manuais (`test-scenarios.md` de Minos) + commit (Caronte)
6. Documentação (Mnemósine) + `regression.md` (smokes ≤3 passos) promovido por Minos
7. Skills + `sdd.js` legados arquivados em `.agents/archive/skills/` e `.agents/archive/scripts/sdd.js`

### 11.6 Nota de Migração — Pendências Dispensadas (2026-08-27)

> **Fluxo Olympus ainda em construção — não 100% válido. Os dois pontos abaixo são esperados e NÃO precisam ser completados nesta fase.**
>
> 1. **FEATURE_DIR incompleto** (`FEATURE_DIR=.agents/modules/hestia/02-multiagent-system` com apenas `spec.md/plan.md/context.json/checkpoint.json`): `tasks.json`, `diff.patch`, `test-report.json`, `review-report.json` e `test-scenarios.md` só são gerados após `approve-spec` → Atena (`PLAN_READY/TASKS_READY`) → Hefesto/Minos (`CODING/TESTING`) → Argos (`REVIEW`). `currentPhase: SPEC_DRAFT` e `approvals: pending` são o estado correto agora.
> 2. **`git status` com `D` (deleted) + `??` (untracked)**: `D .agents/specs|plans|skills|state` e `?? .agents/modules/... / .agents/archive/...` refletem o `git mv` da migração para a nova estrutura (`§7`). O commit consolidador de Caronte (`git add <arquivos>` explícito) ainda não foi executado — pendência intencionalmente dispensada até o fluxo estar estabilizado.