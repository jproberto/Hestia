# AGENTS.md

## Visão Geral do Projeto
Héstia é uma ferramenta pessoal para controle de finanças e de lista de tarefas familiar. Arquitetura Olympus (multi-agentes) orquestra features via `FEATURE_DIR = .agents/modules/<modulo>/<slug>/` + ponteiro `.agents/current`.

## Estrutura do Projeto
- `.agents/`: Diretório do fluxo Olympus (agentes + estado por feature).
    - `modules/`: Módulos registrados — cada feature tem `modules/<modulo>/<slug>/` com `spec.md`, `plan.md`, `tasks.json`, `context.json`, `checkpoint.json`, `diff.patch`, `test-report.json`, `review-report.json`, `test-scenarios.md` + `backlog.md` e `regression.md` por módulo. Transversal em `modules/hestia/`.
    - `current`: Ponteiro texto com `FEATURE_DIR` relativo da feature ativa (resolvido por `Zeus` via `read`/`write`).
    - `olimpo/`: System prompts dos 8 agentes (`zeus.md` primary + 7 subagents) com frontmatter `mode/color/temperature/permission` e seção anti-hallucination.
    - `scripts/`: `new-module.js` (gerador de módulos — `node .agents/scripts/new-module.js <key> "<Nome>" "/mascots/<key>.png" "#cor"`) + `migrate-skills.js` (one-shot, legado).
    - `archive/`: `skills/` + `scripts/sdd.js` legados (referência histórica, não coexistem).
- Código comum/transversal (na raiz das camadas): `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/login/`, `app/dashboard/`, `components/ui/`, `lib/utils.ts`, `utils/supabase/`, `utils/migrations/`.
- Módulo Pluto (financeiro): `app/pluto/`, `components/pluto/`, `lib/pluto/` (com `db/`) e testes espelhados em `__tests__/app/pluto/`, `__tests__/components/pluto/`, `__tests__/lib/pluto/`.
- Módulo Mílon (academia): `app/milon/`, `components/milon/`, `lib/milon/` (com `db/`) e testes espelhados em `__tests__/app/milon/`, `__tests__/components/milon/`, `__tests__/lib/milon/` (mesmo padrão do Pluto, a partir da feature #1 biblioteca de exercícios).

## Padrão de Módulos
Código específico de um módulo vive em `<camada>/<modulo>/` nas camadas `app`, `components`, `lib` e `__tests__`; o compartilhado permanece na raiz. Documentação de módulo vive em `.agents/modules/<modulo>/<slug>/` (spec/plan/tasks + context/checkpoint) com `backlog.md` e `regression.md` por módulo em `.agents/modules/<modulo>/`; transversal em `.agents/modules/hestia/`. Para registrar módulo: criar `.agents/modules/<modulo>/backlog.md` e linha em `.agents/modules/hestia/backlog.md` (tabela “Módulos Registrados”). Estado por feature é isolado em `FEATURE_DIR` e histórico permanece após `COMMITTED`. Não há `state/` global nem `specs/`/`plans/` na raiz.

## Mapa de Camadas (pós-41, fonte: Pluto)

> Decisões registradas: task 41 removeu `use-cases/`, `schemas/` (Zod), `mappers.ts` e factories `createXService` (Opção A, YAGNI) — não recriar sem religar consumidores. Regras de persistência vivem nos repositories; validação runtime vive nos forms (boundary real). Task 47: caminho recomendado UI → `db/*` + `hooks/*`, domínio → `repositories/*`; `createBrowserDatabaseClient()` é singleton por aba; barrel `lib/pluto/index.ts` removido (sem importadores). Task 52: `services/` removido por inteiro (2 standalones vivas migradas para `db/*`; 4 hooks legados deletados) — proibido recriar (ver Atena). Task 48: `getUserEmail()` aceito em `IDatabaseClient` como porta de sessão do app cliente (4 usos, todos na UI, sempre junto ao fluxo de dados p/ `created_by`; separar em `IAuthSession` seria churn sem ganho — revisitar se surgir 2º consumidor de auth). Correções homologadas (2026-09-10): budget seleciona por padrão o ajuste vigente (`pickDefaultAdjustment` em `useBudgetOverview.ts`: maior `start_month <= mês`, fallback mais recente); modais de checklist nunca fecham no erro — handlers de `useChecklistCardModals` relançam após registrar `errorMsg` e o form valida com mensagem visível (sem `return` silencioso); botões de months são `Abrir`/`Encerrar`/`Reabrir` com estilo de botão completo.

```
app/<modulo>/*/page.tsx ──▶ hooks/* ──▶ db/* ──▶ repositories/* ──▶ IDatabaseClient ──▶ Supabase
        │                      │            ▲ mock (vi.mock)       ▲ fakes (contratos)
        ▼                      ▼            │
components/<modulo>/* ◀── props ── stories ── __tests__/**/espelho
lib/<modulo>/types.ts ◀── fonte única (todos importam daqui)
```

| Camada | Responsabilidade | Importa de | Testado com |
|---|---|---|---|
| `app/<modulo>/` | Pages enxutas: só composição + modais | `hooks/*`, `db/*`, `components/<modulo>/*` | testes de página: factories de mock **com defaults**, `clickConnectedButton` p/ clique pós-fetch |
| `components/<modulo>/` | Presentacionais (props), `*.stories.*` p/ novos | `types.ts`, ui compartilhado | `__tests__/components/` + build do Storybook |
| `lib/<modulo>/hooks/` | Fetch+estado+operações (promise-chain + flag `cancelled`) | `db/*`, `types.ts` | `__tests__/lib/<modulo>/hooks/` |
| `lib/<modulo>/db/` | Barrels `export *` sobre `repositories/` — **caminho oficial da UI** | `repositories/*` | `vi.mock` nos testes de página/hooks |
| `lib/<modulo>/repositories/` | Dados + regras de persistência (ex.: período aberto); `I*Repository`, `fakes/` | `IDatabaseClient` (`lib/shared`), `types.ts` — **nunca `@supabase/*`** | contracts+fakes (`contract-*.test.ts`, fakes-only — decisão 57), `__tests__/lib/<modulo>/db/` |
| `lib/<modulo>/types.ts` | Fonte única: Row/Input/Domain/FormData | — | compilação (tsc) |
| `lib/<modulo>/{checklist-budget,utils}.ts` | Regras puras (overflow, agregações, datas) | `types.ts` | testes unitários diretos |
| `lib/shared/` | `IDatabaseClient` (+`getUserEmail` como porta de sessão) + adapter Supabase (único lugar que conhece `@supabase/*`) | `@supabase/*` | mocks nos testes |

**Onde ponho X?** repository → `repositories/<entidade>.ts` + fake + contract; hook → `hooks/useX.ts`; tipo → `types.ts` (nunca duplicar); regra pura → `utils.ts` ou `<dominio>-*.ts`; validação de form → no próprio form/modal (não há `schemas/`); teste → `__tests__/` espelhando o path; story → ao lado do componente; título de conteúdo (`h1/h2/h3` em cards/seções/modais) → token central `font-display` (CaesarDressing em `app/globals.css`; `ModuleLayout` já aplica em nome do módulo e `pageTitle`); estado assíncrono de tela (carregando/erro/vazio/no-results) → componente centralizado `components/ui/AsyncState` — **proibido reimplementar**, inclusive o texto "Tentar novamente"; mensagens com origem usam a união de origens de `lib/shared` e o retry deriva de `errorOrigin` (`carga`/ausente com retry; `operacao`/`bloqueio` sem) (Mílon #2, Patch v5 — norma D27/R31).

## Mapeamento Olympus e Ciclo de Vida

Todo agente DEVE consultar seu prompt em `.agents/olimpo/<agente>.md` antes de agir. Orquestração via `Zeus` (guardian nativo valida `checkpoint.json.validTransitions` e `approvals`).

| Fase | Agente | Papel |
|---|---|---|
| 1. Discovery & Spec | **Hera** (`hera.md`) | Discovery como Product Lead 1 pergunta/turno (intenção→jornada→regras→YAGNI): aprofunda com julgamento (sem cota de perguntas), descobre o não-dito, sabe parar (YAGNI vale p/ discovery), responde interrupções, 2-3 alternativas, escreve `spec.md` sem código em `FEATURE_DIR`. |
| 2. Planejamento | **Atena** (`atena.md`) | Lê `spec.md`+codebase → `plan.md` + `tasks.json` (`{tasks:[]}`, DAG, criteria testáveis) em `FEATURE_DIR`; task de substituição exige critério "busca por `<placeholder>` retorna 0 em código vivo" (remove ou justifica). |
| 3. Implementação | **Hefesto** (`hefesto.md`) | Recebe teste RED de Minos → implementa mínimo para GREEN → refatora. Não escreve testes. |
| 4. Testes | **Minos** (`minos.md`) | Antes: testes de contrato RED; Depois: suite completa, coverage ≥80%, `test-report.json` + `test-scenarios.md` + promoção `regression.md`; re-executa suite + coverage e atualiza `test-report.json` antes de cada review do Argos. |
| 5. Revisão | **Argos** (`argos.md`) | Avalia `diff.patch` (develop...HEAD) vs spec/plan em 5 eixos, `review-report.json` (approved/blocked + category). |
| 6. Homologação | Humano + `test-scenarios.md` | Executa cenários Dado/Quando/Então, aprova diff → `approve-review`. |
| 7. Documentação | **Mnemósine** (`mnemosine.md`) | Atualiza `AGENTS.md`, `CHANGELOG.md`, `README.md`, propõe melhorias. |
| 8. Commit | **Caronte** (`caronte.md`) | Agente transversal — único que commita: valida branch `feature/<modulo>/<slug>` (ou `feature/hestia/<slug>` se transversal), pre-commit, `git add <arquivos>` explícito, Conventional Commits PT-BR, push quando aprovado. Nunca abre PR, nunca mergeia, nunca decide sobre CI — a partir do push, o humano assume (PR, merge, CI). |

### Agentes / Skills
- **Zeus** (`zeus.md`, primary): orquestrador, state machine 12 fases (`SPEC_DRAFT`→`RELEASED`, com `COMMITTED`→`MERGED`→`VERIFIED`→`RELEASED` no fechamento), guardian, delega via Task tool para subagentes registrados em `.opencode/agents/` (sessão filha limpa por delegação), anuncia `[Zeus → <agente>] <fase>:` a cada troca, resolve `FEATURE_DIR` via `.agents/current`, valida DAG `tasks.json` + gates (`test-report.failed==0`, `coverage≥80`, anti-código em spec/plan via `node .agents/scripts/guardian.js`), gera `diff.patch`, persiste estado via `read`/`write`, vira cada task para `completed` em `tasks.json` no commit do Caronte daquela task (não em lote nos docs).
- **Hefesto** nunca escreve testes; **Minos** nunca corrige produção; **Argos** nunca corrige; **Mnemósine** nunca altera produção; **Caronte** único que commita.

## Regras Fundamentais de Execução (Garantia do Processo)

1. **Consulta Obrigatória Olympus:** Ler `.agents/olimpo/<agente>.md` correspondente antes de qualquer fase.
2. **Controle por FEATURE_DIR:** Estado em `modules/<modulo>/<slug>/context.json`+`checkpoint.json` via `.agents/current`; backlog por módulo (`modules/<modulo>/backlog.md`) e transversal (`modules/hestia/backlog.md`).
3. **Automação via Zeus:** Tarefas, transições, aprovações e commits orquestrados por `Zeus` via Task tool + `read`/`write`/`bash` (Caronte para git); sem CLI externo.
4. **Proibição de Código Sem Spec/Plano Aprovados:** Nenhum código antes de `approvals.spec === "approved"` (checkpoint 1).
5. **Parada Obrigatória (Stop & Wait):** Após gerar/alterar artefato (spec/plan/código) aguardar aprovação humana explícita antes de commitar ou avançar; 2 checkpoints humanos obrigatórios: `SPEC_APPROVED` (`approve-spec`) e `APPROVED` (`approve-review`).
6. **Commits Apenas por Caronte sob Autorização:** Nenhum commit sem `approve-spec`/`approve-review`; `git add <arquivos>` explícito, nunca `.env` real.
7. **Migrações Auditadas:** DDL incremental em `utils/migrations/migration-NNNN-<modulo>-<slug>.sql`, onde `NNNN` é sequência global com 4 dígitos e zeros à esquerda, `<modulo>` é a chave do módulo (`pluto`, `milon`, ou `hestia` para transversal) e `<slug>` é descrição curta em kebab-case sem sufixos de versão tipo `2a`/`5c` (cada arquivo consome um inteiro; o vínculo com a feature-mãe vai em `spec_id`/`spec_name`). Atena reserva o número no `plan.md`; Hefesto cria o arquivo; quem integra por segundo renomeia o arquivo ainda-não-aplicado. Nunca editar nem renomear migração já aplicada em qualquer ambiente; correção exige arquivo novo. Os 6 scripts `migration-feature-*` anteriores a 2026-09-13 ficam congelados com seus nomes originais e equivalem aos inteiros `0001`–`0006`; o script da Mílon #1 é renomeado uma única vez para `migration-0007-milon-exercises.sql` antes da primeira aplicação. Todo script registra sua execução em `public.schema_migrations` com o nome do arquivo idêntico ao valor auditado e conflito ignorado pelo nome do script. Divergência conhecida e congelada: o arquivo `migration-feature-3.sql` audita o nome `migration-feature-4.sql`. A Mílon #2 consumiu o inteiro `0008` com `utils/migrations/migration-0008-milon-programs.sql` (tabela `public.programs`), **aplicada em 2026-09-30 pelo humano** e auditada em `public.schema_migrations` (ver `.agents/modules/milon/02-programas/test-scenarios.md`). A Mílon #3 consumiu os inteiros `0009` (`utils/migrations/migration-0009-milon-workouts.sql`: tabelas `public.workouts`, `public.workout_entries`, `public.workout_series` + colunas `load_unit`/`deleted_at` em `exercises` com soft delete) e `0010` (`utils/migrations/migration-0010-milon-exercise-unique-per-workout.sql`: correção D14 — índice único de `(program_id, exercise_id)` para `(workout_id, exercise_id)`, unicidade de exercício por treino).
8. **Investigação sem Gambiarras (debug-first):** Em falha, `BLOCKED` com erro exato + hipóteses + tentativas + caminhos; após 3 hipóteses escala para humano.
9. **Verde pós-merge (feature só 100% com develop verde):** após o push final, o **humano** abre/acompanha o PR, mergeia no GitHub e avalia o CI (inclusive qualquer falha — ele decide o que fazer). O Caronte **nunca** cria PR, mergeia, arma auto-merge ou monitora CI para decidir merge; em falha, apenas reporta `BLOCKED: <link>`. Só com `develop` verde o ambiente é liberado para a próxima feature (humano sincroniza `develop` local). Fases: `COMMITTED` (publicado) → `MERGED` (humano mergeou e avisou) → `VERIFIED` (humano confirmou CI verde) → `RELEASED` (terminal, ambiente livre).

<!-- Última atualização: 2026-10-03 (Mílon #3 Treinos + séries: migrações 0009/0010 registradas na regra 7 — D14 unicidade por treino) -->
