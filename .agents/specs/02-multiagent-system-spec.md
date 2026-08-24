# Spec: Sistema Multi-Agentes Héstia (Olympus)

**ID:** 02
**Status:** Em Especificação

## 1. Objetivo

Substituir o fluxo SDD baseado em skills sequenciais (`sdd-01` a `sdd-05`, `sdd-tool-*`) por um **sistema de agentes colaborativos** orquestrados, com estado persistente, checkpoints explícitos e execução paralela.

O sistema permite que um humano descreva um objetivo de alto nível e obtenha código validado, testado, revisado e documentado através de uma equipe de agentes especializados.

---

## 2. Agentes (O Time Olímpico)

| Agente | Divindade | Papel | Ferramentas | Entrada Principal | Saída Principal |
|--------|-----------|-------|-------------|-------------------|-----------------|
| **Orquestrador** | **Zeus** | Coordena ciclo de vida, gerencia estado, invoca agentes, valida transições | `read, write, glob, grep, bash, task` | Objetivo humano + `context.json` | Estado final, diff pronto para commit |
| **Analista** | **Hera** | Brainstorming humano↔IA, discovery, especificação funcional | `read, glob, grep, write` | Objetivo + contexto do projeto | `spec.md` |
| **Arquiteta** | **Atena** | Design técnico, arquitetura, decomposição em tasks atômicas | `read, glob, grep, write` | `spec.md` + codebase | `plan.md` + `tasks.json` |
| **Implementador** | **Hefesto** | Implementação via TDD, código + testes unitários | `read, write, edit, bash` | `tasks.json` + `plan.md` | Código + testes passando |
| **Testes** | **Minos** | Juiz binário: escreve/roda testes, valida cobertura, edge cases | `read, write, edit, bash` | Código + requisitos | `test-report.json` (pass/fail/coverage) |
| **Revisor** | **Argos** | Validação qualitativa: spec compliance, padrões, segurança, estilo | `read, glob, grep` | Diff + `spec.md` + `plan.md` | `review-report.json` (aprovado/bloqueado + achados) |
| **Documentadora** | **Mnemósine** | Atualiza memória do projeto: AGENTS.md, CHANGELOG.md, README, skills | `read, write, glob, grep` | Contexto completo do ciclo | Arquivos de documentação atualizados |
| **Commitador** | **Caronte** | *Skill compartilhada* — Git hygiene: branches, commit messages, push gates | `bash` (git) | Diff validado + mensagem | Commit realizado |

---

## 3. Estado Compartilhado (`.agents/state/`)

```
.agents/state/
├── context.json          # Objetivo, histórico, decisões, metadados da sessão
├── spec.md               # Spec aprovada (output Hera)
├── plan.md               # Plano arquitetural (output Atena)
├── tasks.json            # Tasks atômicas: [{id, title, deps, status, assignee, acceptance}]
├── diff.patch            # Diff gerado por Hefesto
├── test-report.json      # Resultado testes (output Minos)
├── review-report.json    # Resultado review (output Argos)
└── checkpoint.json       # Estado da state machine: fase atual, aprovações pendentes
```

**`context.json` schema:**
```json
{
  "sessionId": "uuid",
  "objective": "string",
  "currentPhase": "SPEC_DRAFT | SPEC_APPROVED | PLAN_READY | TASKS_READY | CODING | TESTING | REVIEW | APPROVED | COMMITTED",
  "history": [
    {"phase": "SPEC_DRAFT", "agent": "Hera", "timestamp": "iso", "summary": "..."}
  ],
  "decisions": [
    {"id": "dec-1", "question": "...", "options": [...], "chosen": "...", "rationale": "..."}
  ],
  "approvals": {
    "spec": {"status": "pending|approved|rejected", "humanFeedback": "..."},
    "review": {"status": "pending|approved|rejected", "humanFeedback": "..."}
  }
}
```

**`tasks.json` schema:**
```json
[
  {
    "id": "task-1",
    "title": "Criar migration schema_migrations",
    "description": "...",
    "dependencies": [],
    "status": "pending|in_progress|done|blocked",
    "assignee": "Hefesto",
    "acceptanceCriteria": ["Migration roda sem erro", "Tabela criada no Supabase"],
    "files": ["utils/migrations/001_schema_migrations.sql"]
  }
]
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
- **Modelo híbrido:** Minos escreve testes **baseados na spec + tasks.json** (contract tests, integration, e2e) **antes** de Hefesto codificar
- Hefesto implementa fazendo **testes unitários passarem** (TDD clássico) + satisfaz contratos de Minos
- Loop: Minos roda suite → falhas → Hefesto corrige → repete até 100% verde
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
Gerencia o ciclo de vida de features via state machine em .agents/state/.
Invoca agentes via Task tool. Valida transições (guardian nativo).
NÃO escreve código, specs, plans — apenas coordena.
Ferramentas: read, write, glob, grep, bash, task.
```

### Hera (Analista)
```
Você é Hera, rainha do Olimpo, parceira de Zeus.
Especialista em product discovery: faz UMA pergunta por vez, explora intenção,
mapeia jornada, antecipa edge cases, define YAGNI.
Escreve spec.md em .agents/state/. NÃO implementa.
Ferramentas: read, glob, grep, write.
```

### Atena (Arquiteta)
```
Você é Atena, deusa da sabedoria e estratégia.
Recebe spec.md + codebase. Produz plan.md (arquitetura, componentes, contratos)
e tasks.json (tasks atômicas, dependências, acceptance criteria).
Duas fases: DESIGN → DECOMPOSIÇÃO. NÃO codifica.
Ferramentas: read, glob, grep, write.
```

### Hefesto (Implementador)
```
Você é Hefesto, deus da forja, artesão divino.
Recebe tasks.json + plan.md. Implementa via TDD: escreve teste → faz passar → refatora.
Uma task por vez. Usa debug skill se travar. NÃO decide arquitetura.
Ferramentas: read, write, edit, bash.
```

### Minos (Testes)
```
Você é Minos, juiz do submundo. Pesa a alma do código.
Escreve testes de CONTRATO (integration, e2e, cenários de aceite) **baseados na spec + tasks.json** ANTES da implementação.
Roda suite completa, valida cobertura, edge cases, performance.
Gera test-report.json. Binário: passa ou falha. NÃO corrige código — só aponta onde quebra.
Ferramentas: read, write, edit, bash.
```

### Argos (Revisor)
```
Você é Argos, o vigilante de 100 olhos.
Analisa diff.patch contra spec.md + plan.md + padrões do projeto (AGENTS.md, eslint, etc).
Verifica: spec compliance, segurança, performance, estilo, breaking changes.
Gera review-report.json. NÃO corrige — apenas aponta.
Ferramentas: read, glob, grep.
```

### Mnemósine (Documentadora)
```
Você é Mnemósine, deusa da memória, mãe das Musas.
Atualiza AGENTS.md (mudanças arquiteturais), CHANGELOG.md (feat/fix/breaking),
README.md (guias), e propõe melhorias nos agentes/processo.
Lê todo contexto do ciclo. NÃO altera código de produção.
Ferramentas: read, write, glob, grep.
```

### Caronte (Committer — Skill)
```
Você é Caronte, barqueiro do Estige. Faz a travessia final.
Cria branch feature/<slug>, mensagem convencional (feat/fix/docs/chore/refactor),
valida pre-commit (lint, typecheck, testes), faz commit.
Invocado APENAS por Zeus na fase COMMITTED.
Ferramentas: bash (git).
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

### Proposta Nova
```
.agents/
├── backlog.md                    # Backlog guarda-chuva (manter)
├── specs/                        # Specs transversais (manter)
├── plans/                        # Plans transversais (manter)
├── modules/                      # Módulos registrados (renomear pluto/ → modules/pluto/)
│   └── pluto/
│       ├── backlog.md
│       ├── specs/
│       ├── plans/
│       └── logs/
├── state/                        # NOVO — Estado compartilhado do ciclo ativo
│   ├── context.json
│   ├── spec.md
│   ├── plan.md
│   ├── tasks.json
│   ├── diff.patch
│   ├── test-report.json
│   ├── review-report.json
│   └── checkpoint.json
├── agents/                       # NOVO — Definições dos agentes (system prompts + config)
│   ├── zeus.md                   # System prompt + config
│   ├── hera.md
│   ├── atena.md
│   ├── hefesto.md
│   ├── minos.md
│   ├── argos.md
│   ├── mnemosine.md
│   └── caronte.md                # Skill, não agente autônomo
├── scripts/
│   ├── olympus.js                # NOVO — CLI principal (substitui sdd.js)
│   └── migrate-skills.js         # One-shot: migra skills antigas → agents/
└── archive/                      # NOVO — Skills SDD antigas (referência histórica)
    └── skills/                   # Move .agents/skills/ para cá
```

### Mudanças Resumidas

| Item | Ação |
|------|------|
| `.agents/skills/` | Mover para `.agents/archive/skills/` |
| `.agents/skills.md` | Remover (catálogo obsoleto) |
| `.agents/scripts/sdd.js` | Substituir por `olympus.js` (Orchestrator CLI) |
| `.agents/pluto/` | Mover para `.agents/modules/pluto/` (padrão consistente) |
| `.agents/state/` | **Criar** — estado vivo do ciclo |
| `.agents/agents/` | **Criar** — system prompts dos 7 agentes + Caronte |

---

## 8. MVP (Fatia Vertical Inicial)

**Escopo:** Zeus + Hera + Estado + Checkpoint Humano (Spec)

**Entregáveis:**
1. `.agents/state/` criado com `context.json` + `spec.md`
2. `Zeus` (Orchestrator) invoca `Hera` via Task tool
3. `Hera` conduz brainstorming → escreve `spec.md`
4. `Zeus` apresenta `spec.md` para aprovação humana
5. Se aprovado: `Zeus` atualiza `checkpoint.json` → `SPEC_APPROVED` → **para**
6. Se feedback: `Zeus` reinvoca `Hera` com feedback

**Fora do MVP:** Atena, Hefesto, Minos, Argos, Mnemósine, Caronte, `olympus.js` completo.

---

## 9. Critérios de Aceite

1. **Estrutura de diretórios** reorganizada conforme seção 7
2. **7 agents** definidos em `.agents/agents/*.md` com system prompts
3. **Zeus + Hera** funcionando: humano → objetivo → spec.md → aprovação
4. **State machine** persiste em `.agents/state/` e sobrevive a reinício de sessão
5. **Checkpoint humano** bloqueia transição SPEC_DRAFT → SPEC_APPROVED sem aprovação
6. **Guardian nativo**: Zeus impede pular fases (valida `checkpoint.json`)
7. **Documentação** atualizada: AGENTS.md reflete nova arquitetura

---

## 10. Fora de Escopo (YAGNI)

- Execução paralela de tasks (Hefesto + Minos simultâneos)
- Auto-retry de tasks falhadas
- Integração com GitHub Actions / CI
- UI/Web dashboard para visualizar estado
- Agentes adicionais (Security, Performance, etc)
- Migração automática de skills antigas (script one-shot separado)

---

## 11. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Task tool invocation falha silenciosamente | Zeus valida retorno de cada agente; timeout + retry |
| Estado corrompido (concorrência) | Single-writer: só Zeus escreve `checkpoint.json`; agents leem |
| System prompts muito longos → token limit | Prompts modulares; Zeus passa apenas contexto relevante por agente |
| Humanos pulam checkpoints | Zeus **não avança** sem approval flag em `context.json` |
| Perda de conhecimento das skills antigas | Archive preserva; migração manual seletiva quando útil |
| **Modelos gratuitos: timeout, erro, lentidão** | **Retry exponencial (3x), fallback para modelo alternativo, circuit breaker por agente, timeout configurável por fase, logs detalhados para debug** |
| **Contexto perdido entre invocações Task** | **Estado 100% em arquivos (.agents/state/); Zeus reconstrói contexto a cada invocação; agents são stateless** |

---

## 13. Esclarecimentos de Arquitetura

### 13.1 `.agents/state/` vs Módulos vs Specs/Plans Transversais

| Local | Conteúdo | Ciclo de Vida |
|-------|----------|---------------|
| **`.agents/state/`** | **Estado VIVO do ciclo ATIVO** (context.json, spec.md, plan.md, tasks.json, diff.patch, reports, checkpoint.json) | **Efêmero** — criado no início de uma feature, arquivado/limpo no fim. UM por feature ativa. |
| **`.agents/specs/`** | Specs **aprovadas e versionadas** de features transversais (ex: `02-multiagent-system-spec.md`) | **Permanente** — histórico do projeto. |
| **`.agents/plans/`** | Plans **aprovados e versionados** de features transversais | **Permanente**. |
| **`.agents/modules/<modulo>/`** | Backlog, specs, plans, logs **do módulo** (ex: Pluto) | **Permanente por módulo**. |
| **`.agents/agents/`** | System prompts + config dos agentes olímpicos | **Permanente** — código do "framework". |

**Fluxo:** Zeus lê spec aprovada de `.agents/specs/02-...` → cria `.agents/state/` para ESTA execução → agentes leem/escrevem lá → no fim, Zeus arquiva `spec.md` + `plan.md` + `tasks.json` em `.agents/specs/` e `.agents/plans/` (se transversais) ou no módulo correspondente.

### 13.2 JSON vs Markdown no Estado

| Arquivo | Formato | Por quê |
|---------|---------|---------|
| `context.json`, `tasks.json`, `checkpoint.json`, `test-report.json`, `review-report.json` | **JSON** | Parsing programático, validação de schema, queries, automação (Zeus lê/escreve via código) |
| `spec.md`, `plan.md`, `diff.patch` | **Markdown** | Legibilidade humana, diff nativo no git, revisão em PR, ferramentas de docs |

**Regra:** Máquina lê JSON; Humano lê MD. Zeus faz a ponte.

### 13.3 Coexistência Skills + Agentes (Migração Gradual)

| Fase | Skills Ativas | Agentes Ativos | Como Testar |
|------|---------------|----------------|-------------|
| **0 (atual)** | Todas (sdd-01 a sdd-05, sdd-tool-*) | Nenhum | Fluxo atual funciona |
| **1 (MVP)** | sdd-02 a sdd-05, sdd-tool-* | **Zeus + Hera** | **Paralelo**: roda feature nova com Zeus+Hera; features existentes com skills |
| **2** | sdd-03 a sdd-05, sdd-tool-* | + Atena | Valida plan.md + tasks.json vs sdd-02-plan |
| **3** | sdd-04, sdd-05, sdd-tool-* | + Hefesto + Minos | Valida código + testes vs sdd-03-implement |
| **4** | sdd-05, sdd-tool-* | + Argos | Valida review vs sdd-04-review |
| **5** | sdd-tool-* | + Mnemósine + Caronte | Valida docs + commit vs sdd-05 + sdd-tool-commit |
| **6 (final)** | **Nenhuma** (movidas para `archive/`) | **Todos** | Fluxo 100% agentes |

**Validação do MVP (Zeus+Hera):**
1. Cria feature teste (ex: "página de configurações")
2. Roda **duas vezes**: uma via skills atuais (sdd-01), outra via Zeus+Hera
3. Compara: qualidade da spec, tempo, número de iterações, satisfação
4. Se Zeus+Hera ≥ skills → prossegue para Fase 2

### 13.4 Minos + Homologação Humana (Testes Manuais)

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

### 13.5 Hera: Brainstorming Obrigatório (Não Opcional)

Correção no State Machine: **SPEC_DRAFT** = Hera **deve** conduzir brainstorming estruturado:
1. Pergunta única por turno (regra estrita)
2. Explora: intenção → jornada → regras/edge cases → YAGNI
3. Apresenta 2-3 alternativas com trade-offs
4. **Só então** escreve `spec.md`
5. Humano aprova → `SPEC_APPROVED` ou dá feedback → loop

Zeus **bloqueia** transição se `context.json.approvals.spec.status !== "approved"`.

1. Aprovação desta spec
2. Plano de implementação (Atena → tasks.json)
3. Implementação MVP (Hefesto + Minos)
4. Review (Argos)
5. Testes manuais + commit (Caronte)
6. Documentação (Mnemósine)
7. Expansão incremental: Atena → Hefesto → Minos → Argos → Mnemósine → Caronte → olympus.js