# AGENTS.md

## Visão Geral do Projeto
Héstia é uma ferramenta pessoal para controle de finanças e de lista de tarefas familiar. Arquitetura Olympus (multi-agentes) orquestra features via `FEATURE_DIR = .agents/modules/<modulo>/<slug>/` + ponteiro `.agents/current`.

## Estrutura do Projeto
- `.agents/`: Diretório do fluxo Olympus (agentes + estado por feature).
    - `modules/`: Módulos registrados — cada feature tem `modules/<modulo>/<slug>/` com `spec.md`, `plan.md`, `tasks.json`, `context.json`, `checkpoint.json`, `diff.patch`, `test-report.json`, `review-report.json`, `test-scenarios.md` + `backlog.md` e `regression.md` por módulo. Transversal em `modules/hestia/`.
    - `current`: Ponteiro texto com `FEATURE_DIR` relativo da feature ativa (resolvido por `Zeus` via `read`/`write`).
    - `olimpo/`: System prompts dos 8 agentes (`zeus.md` primary + 7 subagents) com frontmatter `mode/color/temperature/permission` e seção anti-hallucination.
    - `scripts/`: `migrate-skills.js` (one-shot, legado).
    - `archive/`: `skills/` + `scripts/sdd.js` legados (referência histórica, não coexistem).
- Código comum/transversal (na raiz das camadas): `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/login/`, `app/dashboard/`, `components/ui/`, `lib/utils.ts`, `utils/supabase/`, `utils/migrations/`.
- Módulo Pluto (financeiro): `app/pluto/`, `components/pluto/`, `lib/pluto/` (com `db/`) e testes espelhados em `__tests__/app/pluto/`, `__tests__/components/pluto/`, `__tests__/lib/pluto/`.

## Padrão de Módulos
Código específico de um módulo vive em `<camada>/<modulo>/` nas camadas `app`, `components`, `lib` e `__tests__`; o compartilhado permanece na raiz. Documentação de módulo vive em `.agents/modules/<modulo>/<slug>/` (spec/plan/tasks + context/checkpoint) com `backlog.md` e `regression.md` por módulo em `.agents/modules/<modulo>/`; transversal em `.agents/modules/hestia/`. Para registrar módulo: criar `.agents/modules/<modulo>/backlog.md` e linha em `modules/hestia/backlog.md` (tabela “Módulos Registrados”). Estado por feature é isolado em `FEATURE_DIR` e histórico permanece após `COMMITTED`. Não há `state/` global nem `specs/`/`plans/` na raiz.

## Mapeamento Olympus e Ciclo de Vida

Todo agente DEVE consultar seu prompt em `.agents/olimpo/<agente>.md` antes de agir. Orquestração via `Zeus` (guardian nativo valida `checkpoint.json.validTransitions` e `approvals`).

| Fase | Agente | Papel |
|---|---|---|
| 1. Discovery & Spec | **Hera** (`hera.md`) | Brainstorming 1 pergunta/turno (intenção→jornada→regras→YAGNI), 2-3 alternativas, escreve `spec.md` em `FEATURE_DIR`. |
| 2. Planejamento | **Atena** (`atena.md`) | Lê `spec.md`+codebase → `plan.md` + `tasks.json` (`{tasks:[]}`, DAG, criteria testáveis) em `FEATURE_DIR`. |
| 3. Implementação | **Hefesto** (`hefesto.md`) | Recebe teste RED de Minos → implementa mínimo para GREEN → refatora. Não escreve testes. |
| 4. Testes | **Minos** (`minos.md`) | Antes: testes de contrato RED; Depois: suite completa, coverage ≥80%, `test-report.json` + `test-scenarios.md` + promoção `regression.md`. |
| 5. Revisão | **Argos** (`argos.md`) | Avalia `diff.patch` (develop...HEAD) vs spec/plan em 5 eixos, `review-report.json` (approved/blocked + category). |
| 6. Homologação | Humano + `test-scenarios.md` | Executa cenários Dado/Quando/Então, aprova diff → `approve-review`. |
| 7. Documentação | **Mnemósine** (`mnemosine.md`) | Atualiza `AGENTS.md`, `CHANGELOG.md`, `README.md`, propõe melhorias. |
| 8. Commit | **Caronte** (`caronte.md`) | Agente transversal — único que commita: valida branch `feature/<modulo>/<slug>` (ou `feature/hestia/<slug>` se transversal), pre-commit, `git add <arquivos>` explícito, Conventional Commits PT-BR, push (Actions abre PR). |

### Agentes / Skills
- **Zeus** (`zeus.md`, primary): orquestrador, state machine 9 fases (`SPEC_DRAFT`→`COMMITTED`), guardian, delega via Task tool, resolve `FEATURE_DIR` via `.agents/current`, valida DAG `tasks.json`, gera `diff.patch`, persiste estado via `read`/`write`.
- **Hefesto** nunca escreve testes; **Minos** nunca corrige produção; **Argos** nunca corrige; **Mnemósine** nunca altera produção; **Caronte** único que commita.

## Regras Fundamentais de Execução (Garantia do Processo)

1. **Consulta Obrigatória Olympus:** Ler `.agents/olimpo/<agente>.md` correspondente antes de qualquer fase.
2. **Controle por FEATURE_DIR:** Estado em `modules/<modulo>/<slug>/context.json`+`checkpoint.json` via `.agents/current`; backlog por módulo (`modules/<modulo>/backlog.md`) e transversal (`modules/hestia/backlog.md`).
3. **Automação via Zeus:** Tarefas, transições, aprovações e commits orquestrados por `Zeus` via Task tool + `read`/`write`/`bash` (Caronte para git); sem CLI externo.
4. **Proibição de Código Sem Spec/Plano Aprovados:** Nenhum código antes de `approvals.spec === "approved"` (checkpoint 1).
5. **Parada Obrigatória (Stop & Wait):** Após gerar/alterar artefato (spec/plan/código) aguardar aprovação humana explícita antes de commitar ou avançar; 2 checkpoints humanos obrigatórios: `SPEC_APPROVED` (`approve-spec`) e `APPROVED` (`approve-review`).
6. **Commits Apenas por Caronte sob Autorização:** Nenhum commit sem `approve-spec`/`approve-review`; `git add <arquivos>` explícito, nunca `.env` real.
7. **Migrações Auditadas:** DDL em `utils/migrations/<timestamp>_<slug>.sql` + registro `schema_migrations`.
8. **Investigação sem Gambiarras (debug-first):** Em falha, `BLOCKED` com erro exato + hipóteses + tentativas + caminhos; após 3 hipóteses escala para humano.

<!-- Última atualização: 2026-08-27 (commit Olympus 0.9.0, docs corrigidas) -->
