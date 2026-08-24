# 02-multiagent-system Implementation Plan (Olympus)

## Objetivo

Substituir o fluxo SDD skills sequenciais por um **sistema de agentes Olympus** (Zeus, Hera, Atena, Hefesto, Minos, Argos, Mnemósine, Caronte), com estado persistente em `.agents/state/`, system prompts em `.agents/olimpo/*.md` e **Caronte** como único responsável por commits, branches e push.

O MVP inicial foca em Zeus + Hera (brainstorming → spec aprovada). A partir daí, adiciona-se Atena → Hefesto → Minos → Argos → Mnemósine → Caronte final.

## Arquitetura

```
.agents/
├── olimpo/              # System prompts + config de agentes
│   ├── zeus.md
│   ├── hera.md
│   ├── atena.md
│   ├── hefesto.md
│   ├── minos.md
│   ├── argos.md
│   ├── mnemosine.md
│   └── caronte.md
├── state/               # Estado persistente do ciclo ativo
│   ├── context.json
│   ├── spec.md
│   ├── plan.md
│   ├── tasks.json
│   ├── diff.patch
│   ├── test-report.json
│   ├── review-report.json
│   └── checkpoint.json
├── specs/               # Specs transversais
├── plans/               # Plans transversais
├── modules/             # Módulos registrados (pluto, etc.)
└── backlog.md
```

## Agentes (System Prompts em `.agents/olimpo/`)

| Agent | Papel | Responsabilidade Única |
|-------|-------|------------------------|
| **Zeus** | Orquestrador | State machine, invoca agentes via Task tool, valida transições, salva/lera `context.json` |
| **Hera** | Analista | Brainstorming estruturado (4 fases: intenção→jornada→regras→YAGNI), 1 pergunta/turno, escreve `spec.md` |
| **Atena** | Arquiteta | Lê `spec.md` + codebase → produz `plan.md` + `tasks.json` (tasks atômicas + acceptance criteria) |
| **Hefesto** | Implementador | Recebe `tasks.json`, implementa código TDD (red→green→refactor), **não escreve testes** |
| **Minos** | Testador | **Apenas** escreve testes (unitários + integration) baseados em `spec.md` + `tasks.json` + acceptance criteria. Escreve cenários para testes manuais. Mantém testes de regressão. Não implementa código. |
| **Argos** | Revisor | Analisa `diff.patch` vs `spec.md` + `plan.md` + padrões. Gera `review-report.json` (approved/blocked). |
| **Mnemósine** | Documentadora | Atualiza `.agents/olimpo/AGENTS.md`, `.agents/CHANGELOG.md`, `.agents/README.md`. |
| **Caronte** | Commitador | **ÚNICO responsável por commits**. Cria branches, valida working tree limpo, verifica PRs não aprovados, escreve mensagens Conventional Commits, faz push final. |

## State Machine (Fases + Checkpoints)

```
SPEC_DRAFT --(Zeus+Hera: brainstorming)--> SPEC_APPROVED --(Caronte: commit spec+plan)--> PLAN_READY
                                                                         |
                                                                         v
              Fase 4 (Hefesto+Minos): implementation + testes por task (paralelo)
                                                                         |
                                                                         v
              Fase 5 (Minos): suite completa + cobertura + cenários manuais
                                                                         |
                                                                         v
              Fase 6 (Argos): review diff vs spec+plan+padrões
                                                                         |-- blocked --> devolve para Hefesto/Minos (código) ou Atena (arquitetura) ou Hera (spec)
                                                                         |
                                                                         v (approved)
              Fase 7 (Mnemósine): documentação (AGENTS.md, CHANGELOG, README)
                                                                         |
                                                                         v
              Fase 8 (Caronte): commit final + push + PR
```

## Fluxo de Commits (Quem commita = SEMPRE Caronte)

| Momento | Action | Commit? | Mensagem Padrão |
|---------|--------|---------|-----------------|
| **Step 0 — Feature Start** | Caronte valida `git status` (clean), verifica PRs não aprovados em `develop`, cria branch `feature/<slug>` a partir de `develop` | **Sim** (inicial) | `feat: branch feature/<slug> iniciada — Olympus` |
| **After Fase 3** | Atena produziu `plan.md` + `tasks.json`. Caronte registra spec + plan. | **Sim** (obrigatório) | `feat: spec + plan registradas para feature <nome>` |
| **After cada Task Hefesto (Fase 4)** | Hefesto terminou task → Minos testes passaram. Caronte commita o incremento. | **Sim** (por task) | `feat: <descrição-da-task>` |
| **After Mnemósine docs (Fase 7)** | Docs atualizadas (AGENTS.md, CHANGELOG, README). | **Sim** (commit de documentação) | `docs: atualizar documentação da feature <nome>` |
| **Fase 8 — Push Final** | Caronte: `git add .`, commit final, `git push origin feature/<slug>` (abre PR). | **Sim** (único no final) | `feat: feature <nome> concluída — Olympus` |

**Nota:** Fases 5 (Minos suite) e 6 (Argos review) **não commiteiam** antecipadamente. Commit só acontece se houver blockers (correções necessárias) ou no final.

## Fase a Fase (Tarefas Detalhadas)

### **Fase 1: Estrutura de Fundação**

| Tarefa | Descrição |
|--------|-----------|
| **Tarefa 1.1** | Criar pasta `.agents/olimpo/` |
| **Tarefa 1.2** | Criar `.agents/olimpo/zeus.md` (system prompt inicial — state machine, ferramentas, NÃO escreve código) |
| **Tarefa 1.3** | Criar `.agents/olimpo/hera.md` (system prompt inicial — discovery, 1 pergunta/turno) |
| **Tarefa 1.4** | Criar `.agents/state/` (pasta vazia) |
| **Tarefa 1.5** | Criar `.agents/state/context.json` (estado inicial: `currentPhase: "SPEC_DRAFT"`, `approvals: {"spec": "pending"}`) |

**Commits:**
- Após Tarefa 1.5: **Caronte** — `feat: fundação Olympus — estrutura de diretórios e state machine básica`

---

### **Fase 2: Bootstrap Zeus + Hera (MVP — Brainstorming)**

| Tarefa | Descrição |
|--------|-----------|
| **Tarefa 2.1** | Zeus valida Step 0: verify `git status` clean, no PRs abertos não aprovados em `develop`, cria branch `feature/<slug>` |
| **Tarefa 2.2** | Hera conduz brainstorming: faz UMA pergunta por turno, explora intenção → jornada → regras/edge cases → YAGNI. Respostas salvas em `context.json.history`. |
| **Tarefa 2.3** | Humano aprova spec → Zeus atualiza `context.json.approvals.spec = "approved"` |
| **Tarefa 2.4** | Zeus avança state machine para `SPEC_APPROVED` |

**Commits:**
- **Não há commit durante o loop** (apenas state.json é atualizado). O commit acontece após aprovação da spec (próxima fase).

---

### **Fase 3: Atena — Arquiteta (Plano de Implementação)**

| Tarefa | Descrição |
|--------|-----------|
| **Tarefa 3.1** | Atena lê `spec.md` + codebase (via glob/grep no codebase existente). |
| **Tarefa 3.2** | Produz `plan.md` (arquitetura, componentes, contratos, data flow, decisões de design). |
| **Tarefa 3.3** | Produz `tasks.json` (tasks atômicas: id, title, description, dependencies, acceptance criteria, assignee, files estimados). |
| **Tarefa 3.3** | Zeus valida `plan.json` → avança para `PLAN_READY`. |

**Commits (OBRIGATÓRIOS):**
- **Caronte** — `feat: spec + plan registradas para feature <nome>` (commita `.agents/state/spec.md` + `.agents/state/plan.md` + `.agents/state/tasks.json`).

---

### **Fase 4: Hefesto + Minos (Implementação + Testes TDD por Task)**

| Tarefa | Descrição |
|--------|-----------|
| **Tarefa 4.1** | Hefesto recebe `tasks.json`, começa pela Task 1. |
| **Tarefa 4.2** | Minos escreve teste unitário/integration para aquela task baseando-se em `acceptance criteria` + `spec.md`. **NÃO** vê código. |
| **Tarefa 4.3** | Hefesto implementa código mínimo para fazer o teste de Minos passar (red). |
| **Tarefa 4.4** | Executa teste → confirma falha (red). |
| **Tarefa 4.5** | Hefesto escreve implementação completa. |
| **Tarefa 4.6** | Executa teste → confirma passing (green). |
| **Tarefa 4.7** | Hefesto refatora (sem quebrar teste). |
| **Tarefa 4.8** | Hefesto marca task como concluída → **Caronte** commita: `feat: <descrição-da-task>` |

**Commits:**
- **Após cada task concluída:** **Caronte** — `feat: <descrição-da-task>` (ex: `feat: criar schema migration users`).

---

### **Fase 5: Minos — Suite Completa + Cobertura + Cenários Manuais + Regressão**

| Tarefa | Descrição |
|--------|-----------|
| **Tarefa 5.1** | Minos roda suite completa (todos testes das tasks da Fase 4). |
| **Tarefa 5.2** | Gera `test-report.json` (pass/fail por teste, cobertura %, lista de testes faltantes). |
| **Tarefa 5.3** | Escreve cenários para testes manuais (formato Dado/Quando/Então) baseados na spec + tasks.json. |
| **Tarefa 5.4** | Mantém/atualiza testes de regressão: adiciona casos de borda, remove testes obsoletos, garante estabilidade. |
| **Tarefa 5.5** | Se cobertura OK → avança. Se falhar → devolve para Hefesto com defeitos exatos → loop Hefesto→Minos até passar. |

**Commits:** **Não há commit** nesta fase (apenas reporte). Se houver ajuste significativo, Caronte commita ajuste menor na Fase 4 ou 7.

---

### **Fase 6: Argos — Revisão de Qualidade (Pode Devolver Para Qualquer Fase Anterior)**

| Tarefa | Descrição |
|--------|-----------|
| **Tarefa 6.1** | Argos recebe `diff.patch` (gerado por Hefesto, consolidado de todas tasks) + `spec.md` + `plan.md`. |
| **Tarefa 6.2** | Analisa: spec compliance, segurança, performance, estilo, breaking changes. |
| **Tarefa 6.3** | Gera `review-report.json`: `{"status": "approved|blocked", "findings": [...], "blockers": [...]}`. |
| **Tarefa 6.4** | Se **blocked** → devolve para: Hefesto/Minos (código/testes), **ou** Atena (arquitetura/tasks.json), **ou** Hera (spec.md) — com feedback detalhado. Loop de correção na fase correspondente. Se **approved**, segue sem commit novo (já está tudo commiteado). |

**Commits:** **Somente se houver blockers** (correções necessárias). Caronte commita o ajuste.

---

### **Fase 7: Mnemósine — Documentação**

| Tarefa | Descrição |
|--------|-----------|
| **Tarefa 7.1** | Mnemósine lê todo contexto do ciclo: `.agents/state/` + `.agents/olimpo/` (todos system prompts + decisões). |
| **Tarefa 7.2** | Atualiza `.agents/olimpo/AGENTS.md` (quais agents ativos, versões, últimas mudanças). |
| **Tarefa 7.3** | Atualiza `.agents/CHANGELOG.md` (feat/fix/refactor/breaking da feature). |
| **Tarefa 7.4** | Atualiza `.agents/README.md` (guia rápido: como usar Olympus neste projeto). |
| **Tarefa 7.5** | Propõe melhorias nos prompts/processo baseadas no que foi aprendido (podem ser criadas issues ou registradas no backlog). |

**Commits:**
- **Caronte** — `docs: atualizar documentação da feature <nome>` (commita os 3 arquivos: AGENTS.md + CHANGELOG.md + README.md).

---

### **Fase 8: Caronte — Feature Finalization**

| Tarefa | Descrição |
|--------|-----------|
| **Tarefa 8.1** | Caronte verifica `git status` (working tree clean). |
| **Tarefa 8.2** | Verifica `git log` (nenhum PR aberto não aprovado em `develop`). |
| **Tarefa 8.3** | Cria branch `feature/<slug>` a partir de `develop` (se ainda não existir). |
| **Tarefa 8.4** | `git add .` de todos arquivos modificados (state, olimpo, codebase, docs). |
| **Tarefa 8.5** | **Caronte commita final**: `feat: feature <nome> concluída — Olympus`. |
| **Tarefa 8.6** | `git push origin feature/<slug>` (abre PR → revisão humana → merge em `develop`). |

**Commits:**
- **Caronte** — commit final local + push remoto.

---

## Critérios de Aceite

1. ✅ `.agents/olimpo/` criado com system prompts de todos os 8 agents
2. ✅ `.agents/state/` funcional com `context.json` + `spec.md` (Fase 2 MVP)
3. ✅ State machine persiste em arquivos JSON e sobrevive a reinício de sessão
4. ✅ Caronte valida Step 0 (branch, PRs, working tree) antes de qualquer coisa
5. ✅ Loop Zeus+Hera funciona: pergunta → resposta → spec → aprovação → Caronte commit
6. ✅ Após Fase 3: Caronte commit obrigatório registrando spec + plan
7. ✅ Fase 4: Minos escreve testes, Hefesto implementa código (TDD), Caronte commita a cada task
8. ✅ Fase 5: Minos roda suite completa, gera cenários manuais, mantém regressão
9. ✅ Fase 6: Argos review pode devolver para Hefesto/Minos, Atena, ou Hera
10. ✅ Fases 5 & 6 não commiteiam antecipadamente (somente se blockers)
11. ✅ Fase 7: Mnemósine commita documentação
12. ✅ Fase 8: Caronte push final + branch criada a partir de `develop`

---

## Como Implementar (Primeiros Passos)

### **Step 1: Estruturação (Fase 1)**
1. Executar Tarefas 1.1 a 1.5 (criar pastas + system prompts básicos + context.json)
2. **Caronte commita:** `feat: fundação Olympus — estrutura de diretórios e state machine básica`
3. Confirmar estrutura criada

### **Step 2: MVP Brainstorming (Fase 2)**
1. Executar loop Zeus+Hera (Tarefas 2.1 a 2.4)
2. Humano aprova spec
3. **Ponto de parada** — validar se Zeus+Hera conseguiram produzir uma spec aprovada em menos tempo/quatro que o fluxo skills antigo

### **Step 3: Prosseguir ou Não**
- Se MVP validado → prosseguir para Fase 3 (Atena) → Fase 4 (Hefesto+Minos) → Fase 5 (Minos suite) → Fase 6 (Argos) → Fase 7 (Mnemósine) → Fase 8 (Caronte)
- Se não validado → encerrar experiência com custo baixo (apenas 1 commit de fundação)

---

## Próximo Passo

**Confirmar este plano.** Se aprovado, inicio a execução da **Fase 1** (Tarefas 1.1 a 1.5), criando a estrutura base do Olympus.

**Concorda com este plano reescrito?** Se sim, inicio imediatamente.