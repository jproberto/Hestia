# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

## [Não lançado]

### Adicionado
- **Mílon #1 — Biblioteca de exercícios (`/milon`):** tabela `public.exercises` via `utils/migrations/migration-0007-milon-exercises.sql`; tela com lista, filtro por músculo, busca por texto (a partir do 3º caractere), lotes de 20 com mostrar mais e controle "Ordenar por" (Músculo|Nome); modal único criar/editar com Salvar e Salvar e incluir outro; anti-duplicata nome+músculo com normalização; exclusão com confirmação; card Mílon no dashboard; adendo UX (lista compacta mobile, link "ver vídeo", ordenação). Suíte em 495 testes, review aprovado.
- **Testes de integração contra Supabase real (item 8):** `__tests__/integration/` reutiliza os 6 contracts via binding Supabase (`test:integration`, config própria sem mocks globais); job `integration` no CI sobe Supabase efêmero, aplica as migrations do zero e executa.
- **Mílon #2 — Programas (`/milon/programs`):** CRUD de programas por dono com ciclo de vida `rascunho` → `ativo` → `inativo` (nasce em rascunho; ativar/reativar exige confirmação e inativa automaticamente o programa ativo anterior do mesmo dono), ativação com guarda (exige ≥1 treino com exercício — na #2 a UI nasce sempre bloqueada, liberação na feature #3), exclusão só de rascunho, filtros por dono/status, ordenação mais novo → mais antigo e sugestões pré-preenchidas; tabela `public.programs` via `utils/migrations/migration-0008-milon-programs.sql` (Patch v1).
- **Navegação em abas do Mílon (Patch v3):** biblioteca passa para `/milon/exercises`, `/milon` redireciona para a aba padrão, barra de abas com aba ativa derivada da URL no `ModuleLayout` compartilhado (sem branching por módulo — vale também para o Pluto) e textos dos cards do dashboard atualizados.
- **Rota de detalhe do programa `/milon/programs/[id]` (Patch v4):** cabeçalho com título (`font-display`), dono, badge de status e data; "não encontrado" distinto de erro de carga; criar navega ao detalhe, editar permanece na lista; três origens de mensagem (`errorOrigin`: carga/operacao/bloqueio) com retry só na carga.
- **Estados de tela centralizados (Patch v5):** componente transversal `components/ui/AsyncState` (com stories e teste) cobrindo os 4 estados de lista — carregando, erro, vazio, no-results — com precedência fixa, banner de erro **acima** do conteúdo e "Tentar novamente" derivado de `errorOrigin`; união de origens em casa única `lib/shared`; adotado nas três telas do Mílon (Programas, biblioteca e detalhe). Norma registrada em `AGENTS.md` ("Onde ponho X?", D27/R31).
- **Link no título do programa → detalhe (Patch v6):** `Link` do Next.js dentro do `h3` de cada item da lista para `/milon/programs/<id>`, com afordância de mudança de cor no hover (Opção C), foco visível por teclado e sem sublinhado; ações (Editar/Ativar/Reativar/Excluir) permanecem fora do link.
- **Mílon #3 — Treinos + séries planejadas (`/milon/programs/[id]` + `/milon/programs/[id]/workouts/[workoutId]`):** detalhe do Programa lista os treinos (nome obrigatório/único com sugestão `Treino A…Z, AA, AB…` na primeira posição livre, subtítulo derivado dos músculos, ordem de criação, sem reordenação) e detalhe do treino lista exercícios reordenáveis por arrastar e soltar (Pointer Events nativas, sem dependência nova) com séries planejadas (quantidade digitada obrigatória ≥1, reps/tempo/carga/descanso nascendo vazios, vazio ≠ 0, unidade kg/libra por exercício escolhida na primeira digitação, descanso único por exercício, "aplicar a todas" re-executável); regras puras em `lib/milon/workout-utils.ts`, aggregate em `lib/milon/repositories/workouts.ts` + fake + barrel `lib/milon/db/workouts.ts`, hooks `useProgramWorkouts`/`useWorkoutDetail`; tabelas `public.workouts`/`workout_entries`/`workout_series` via `utils/migrations/migration-0009-milon-workouts.sql`. Suíte em 1118 testes, coverage 85%, review aprovado.
- **Mílon #4 — Treino do Dia v1 (`/milon/today`, primeira aba):** `/milon` redireciona para `/milon/today`; barra com 3 abas ordenadas (Treino do Dia → Programas → Exercícios); seleção via `lib/milon/hooks/useTodayWorkout.ts` (programa ativo do dono → primeiro treino por criação, troca restrita ao programa ativo, vazios orientadores "sem treino ativo" sem erro); detalhe compartilhado em `components/milon/WorkoutDetailSection.tsx` (manutenção vira wrapper fino, paridade total de dados/ações/validações/D14) com slots `headerActions`/`entryFooter`/`footer` nulos na v1 (reservados às features #5/#6/#7); sem migração (nenhum inteiro consumido). Suíte em 1183 testes / 105 arquivos, 0 falhas, coverage 84,35% lines / 83,52% branch, review aprovado.

### Alterado
- **Padrão de estados de tela centralizado:** novas telas usam `components/ui/AsyncState` em vez de reimplementar carregando/erro/vazio/no-results — proibido reimplementar (norma no `AGENTS.md`); retrofit dos banners do Pluto (`transactions`, `months`) registrado como item pendente no backlog do módulo (D24/R30).
- **Afordância de link no título (Opção C):** título de item da lista é link com mudança de cor no hover e foco visível, sem sublinhado em nenhum estado (antes: título texto puro, sem indicação de navegação).
- **Guarda de ativação com conteúdo real (Mílon #3):** `usePrograms()` perde a opção `hasWorkoutWithExercise` e passa a consultar `hasWorkoutWithExercise`/`hasWorkouts` no momento da ação — ativar/reativar libera com conteúdo mínimo, exclusão de Programa com treinos e de treino com exercícios passa a ser bloqueada com mensagem visível (D6).
- **Biblioteca de exercícios com soft delete (Mílon #3):** `deleteExercise` grava `deleted_at` em vez de remover a linha; `listExercises`/anti-duplicata enxergam só ativos, `listExercisesAll`/`setExerciseLoadUnit` novos para o contexto de treino.

### Corrigido
- **`initBudget` agora idempotente:** implementação real fazia insert cego e reprovaria no próprio contrato (que exige mesmo id em chamadas repetidas) — virou get-or-create, alinhada ao fake.
- **Cenário 5 da homologação (Mílon #2):** erro deixa de **substituir** a lista de programas — banner passa a aparecer **acima** com a lista visível (padrão de `transactions`), via `AsyncState` (Patch v5).
- **Modais de confirmação fecham em falha (Patch v4):** `ProgramConfirmModal` fecha em qualquer terminal da operação (sucesso, erro de operação ou bloqueio) em vez de ficar aberto sem feedback; `router.push` só na criação.
- **Retry só na carga:** "Tentar novamente" aparece exclusivamente para erro de carga (`errorOrigin: carga`); bloqueio de domínio e erro de operação exibem banner sem retry (Patch v4/v5).
- **Biblioteca de exercícios — exclusão com falha fecha a confirmação (Patch v5):** `DeleteExerciseConfirm` deixa de permanecer aberto no erro (mensagem caía atrás do backdrop `z-50`) — modal fecha e a mensagem aparece no banner, sem retry (origem `operacao`).
- **D14 — unicidade de exercício por treino (Mílon #3, spec corrigida em 2026-10-02):** índice único de `(program_id, exercise_id)` para `(workout_id, exercise_id)` via `utils/migrations/migration-0010-milon-exercise-unique-per-workout.sql`; produção lança `MSG_EXERCICIO_JA_NO_TREINO` ("Este exercício já está neste treino. Escolha outro exercício.") e `plan.md` (linha 10) alinhado à spec.

## [1.0.0] - 2026-09-10

Primeira versão de produção: módulo Pluto completo (orçamento anual com ajustes, meses operacionais, lançamentos com estorno, checklist com validação de overflow, saldo do mês) + framework multi-agentes Olympus + gerador de módulos.

### Adicionado
- **Token `font-display` (CaesarDressing) em `app/globals.css`:** títulos de conteúdo (`h1/h2/h3` em cards/seções/modais) usam o token central; `ModuleLayout` (nome do módulo + `pageTitle`) e gerador de módulos (exemplo) já saem no padrão; convenção registrada em `AGENTS.md` ("Onde ponho X?") e `.agents/module-template.md`.
- **Fonte auto-hospedada via `next/font/local`:** `@font-face` manual e preload manual removidos de `app/layout.tsx`/`globals.css` — o Next emite `@font-face` + preload da `CaesarDressing-Regular.ttf` (solução definitiva após fallback silencioso do `@font-face` manual).
- **Default do ajuste vigente no budget (`pickDefaultAdjustment` em `useBudgetOverview.ts`):** sem seleção, ativa o ajuste de maior `start_month <= mês corrente` (mesma regra de `getBudgets`), fallback para o mais recente; seleção manual prevalece; troca de ano reaplica o padrão.
- **Olympus conectado ao gerador:** Zeus classifica `módulo novo` e Atena planeja a primeira task via `node .agents/scripts/new-module.js` seguindo `.agents/module-template.md` (inclui convenção `font-display`); proibição de `services/` explicitada em Atena.
- **Mapa de Camadas no `AGENTS.md`:** diagrama + tabela camada→responsabilidade→importa-de→testado-com + FAQ "Onde ponho X?" (fonte normativa; Atena exige declarar camadas no plano).
- **Testes novos:** single-flight do fetch, identidade do singleton de client, enriquecimento de `category_name`, contratos por unidade extraída (budget/months/checklist/modais) — suíte em 63 arquivos / 378 testes.
- **Gerador `new-module.js` pós-arquitetura:** scaffolda `types` + `repositories`/`interfaces`/`fakes` + `db/` + `hooks` + contract + story + testes espelho (verificado de ponta a ponta com módulo dummy).

### Alterado
- **Single-flight do fetch inicial (`usePlutoData`):** 1 fetch por mount, seleção resolvida em memória, request id last-writer-wins no lugar da flag `cancelled`.
- **`createBrowserDatabaseClient()` singleton por aba;** caminho único de imports (UI via `db/*`); `getUserEmail()` documentado como porta de sessão.
- **Decomposições (sem mudança visual):** budget 512→119, months 242→66, `ChecklistCard` 237→144, `useTransactionModals` 400→3 hooks + compositor.
- **Tipos honestos:** `category_name` enriquecido no repositório; `categoryType` obrigatório nos resultados de overflow.
- **Higiene de testes:** mock central no setup, `Mock` como tipo, `hooks/index` completo, `ChecklistItemWithAmount` removida.
- **Hestia sem background:** wrapper `MascotBackground` removido de dashboard/login (referência: Pluto); página do dashboard ficou estática (fetch/logout mortos removidos).
- **Docs Olympus:** refs defasadas corrigidas (4 arquivos); contracts declarados `fakes-only`; backlog com épicos 4–5 concluídos/em andamento.

### Removido
- **Camada morta (41):** `use-cases/`, `schemas/` (Zod), `mappers.ts`, factories `createXService`, dep `zod`.
- **2ª camada morta (52):** `services/` por inteiro, hooks sem chamadores (`useTransactions`, `useAccounts`, `useChecklist`, `useMonthlyPeriods`).
- **Identidade visual revertida (61):** `MascotBackground`, `useMascotBackground`, `mascot-lqip`, tipo `MascotBgMode`, CSS associado.
- **Build:** factory server (`createServerDatabaseClient`) fora do bundle client — `next build` verde.
- **Deps órfãs:** `@testing-library/user-event`, `@storybook/addon-mcp`.

### Corrigido
- **Backlogs com links relativos e válidos:** `.agents/modules/pluto/backlog.md` apontava para `.agents/pluto/specs|plans` + URLs `file:///p:/...` (inexistentes fora da máquina de origem) — repointados para `.agents/modules/pluto/<slug>/{spec,plan}.md` (13 slugs verificados); mesmo tratamento em `.agents/modules/hestia/backlog.md` (+ "fluxo SDD" → "fluxo Olympus").
- **Headers `regression.md` com mojibake:** reescritos em UTF-8 com instrução de promoção via Minos.
- **Docs normativos sincronizados:** `AGENTS.md` registra `new-module.js`, path correto do backlog central, remoção de `services/` da tabela de camadas, convenção `font-display`, contrato de erro dos modais e padrão `migration-<slug>.sql` (antes `<timestamp>_<slug>.sql`, inexistente em disco).
- **Modal de checklist com feedback:** validações com mensagem visível (antes `return` silencioso) e handlers de `useChecklistCardModals` relançam o erro após registrar `errorMsg` — o modal permanece aberto no erro em vez de fechar/parar sem rastro (vale para escopo do mês e global).
- **Botões de months:** `Encerrar`/`Reabrir` recuperam o estilo de botão completo (estavam sem borda, parecendo labels) e labels enxutos para `Abrir`/`Encerrar`/`Reabrir`.
- **Build de produção vermelho (pré-existente desde a task 32):** `next/headers` no bundle client; `npm run build` passa.
- **Teste que passava por acidente** no flicker do duplo fetch (agora asserta o DOM assentado).

## [0.9.0] - 2026-08-27

### Adicionado
- **Sistema Multi-Agentes Olympus:** 8 agentes (`Zeus` primary + `Hera`, `Atena`, `Hefesto`, `Minos`, `Argos`, `Mnemósine`, `Caronte`) com system prompts em `.agents/olimpo/*.md` (frontmatter `mode/color/temperature/permission` + anti-hallucination), state machine 9 fases (`SPEC_DRAFT`→`COMMITTED`) com 2 checkpoints humanos (`approve-spec`/`approve-review`) e guardian nativo (`checkpoint.json.validTransitions`).
- **FEATURE_DIR + `.agents/current`:** estado por feature em `.agents/modules/<modulo>/<slug>/` (`spec.md`, `plan.md`, `tasks.json` `{tasks:[]}`, `context.json`, `checkpoint.json`, `diff.patch`, `test-report.json`, `review-report.json`, `test-scenarios.md`) isolado e permanente — substitui `.agents/state/` global e `specs/`/`plans/` na raiz (histórico preservado via `git mv`).
- **Orquestração via Task tool:** Zeus delega aos 7 especialistas via Task tool nativo da plataforma (resiliência nativa timeout/retry); Caronte usa `git_retry` bash 3× exponencial para operações git remoto.
- **`regression.md` por módulo:** acervo permanente de smokes manuais (≤3 passos) em `.agents/modules/<modulo>/regression.md` e `.agents/modules/hestia/regression.md` promovido por Minos a partir de `test-scenarios.md`.
- **`migrate-skills.js`:** script one-shot para migração `skills/` → `archive/`.

### Alterado
- **Estrutura de diretórios:** `.agents/backlog.md` → `.agents/modules/hestia/backlog.md`; `specs/`+`plans/` raiz e `pluto/specs|plans` reorganizados por slug (`01-orcamento/`, `02-ajuste-orcamento/`...); `.agents/current` como ponteiro `FEATURE_DIR`.
- **Hefesto:** nunca escreve testes — recebe teste de contrato RED de Minos (outside-in) → GREEN → refatora; debug-first com `BLOCKED` contendo erro+hipóteses+tentativas.
- **Orquestração:** sem CLI externo — Zeus coordena via Task tool + `read`/`write`/`bash`; Caronte executa git com `git_retry`.
- **Documentação:** `AGENTS.md` reescrito para mapeamento Olympus, padrão de módulos `modules/<modulo>/<slug>/` e fluxo conversacional Zeus; `README.md` com guia Olympus.

### Removido
- **Skills SDD legadas + `sdd.js`:** movidos para `.agents/archive/skills/` e `.agents/archive/scripts/sdd.js` (sem coexistência); `skills.md` removido.

## [0.8.0] - 2026-08-23

### Alterado
- **Modularização — Módulo Pluto:** todo o domínio financeiro migra para `app/pluto/`, `components/pluto/`, `lib/pluto/` (com acesso a dados em `lib/pluto/db/`) e testes espelhados em `__tests__/**/pluto/`. O Pluto é o primeiro módulo a seguir o padrão guarda-chuva *módulo por camada*.
- **Novas URLs:** `/pluto/budget`, `/pluto/months` e `/pluto/transactions` substituem as rotas do prefixo anterior, que deixam de existir no mesmo commit (sem redirect).
- **Card do dashboard:** passa a apontar para `/pluto/budget` e exibir o nome "Pluto".
- **Documentação:** specs, planos e backlog do domínio financeiro migrados para `.agents/pluto/` via `git mv` (histórico preservado); backlog central reestruturado com a tabela de módulos registrados.
- **Tooling:** `sdd.js` passa a resolver specs, planos e status de backlog dentro de `.agents/<modulo>/` usando a tabela de módulos do backlog central.

## [0.6.0] - 2026-07-30

### Adicionado
- Nova funcionalidade de **Edição e Exclusão de Lançamentos** (Feature 8).
- Novas funções de backend `updateTransaction` e `deleteTransaction` em `lib/pluto/db/transactions.ts` com validação de status de mês aberto no Supabase.
- Nova coluna de **Ações** na tabela de extrato da página `/pluto/transactions` com botões e ícones para **Editar** e **Excluir**.
- Modal de formulário reaproveitado para edição preenchido com os dados existentes da transação.
- Modal dialog de confirmação de exclusão com exibição clara do nome e valor da transação a ser removida.
- Restrição estrita de seleção de data no modal ao intervalo do mês visualizado na tela.
- Tom de vermelho suavizado no modal de confirmação de exclusão de lançamentos.
- Ordenação determinística de lançamentos por data (crescente) e ID interno (crescente) para desempate constante.
- Suíte de testes unitários e de componente cobrindo edição e exclusão em `__tests__/lib/pluto/db/transactions.test.ts` e `__tests__/app/pluto/transactions-page.test.tsx`.
- Smoke test #6 em `.agents/skills/sdd-05-manual-test/references/manual_tests.md`.

### Alterado
- Incrementada a versão do projeto em `package.json` para `0.6.0` (SemVer Minor).

## [0.7.0] - 2026-08-21

### Adicionado
- **Funcionalidade de Overflow Orçamentário em Checklist**: validação de estouro ao incluir/editar itens globais do checklist, com modal de bloqueio guiado para ajuste de orçamento mensal.
- **Banners Informativos de Orçamento**: exibição visual (rose-900 sobre rose-50) quando o total previsto de itens pontuais excede o orçamento planejado da categoria.
- **Edição Global com Mudança de Categoria**: lógica que verifica o amount existente contra a nova categoria ao mudar `category_id` em itens globais, sem excluir o item original.
- **Saldo do Mês em Destaque**: novo banner na página `/pluto/transactions` exibindo a diferença entre receitas e despesas do período, com cores condicionais (verde para saldo ≥ 0, vermelho para negativo) e oculto automaticamente quando nenhum mês está aberto (Feature 10).
- Testes automatizados cobrindo os estados do banner de saldo em `__tests__/app/pluto/transactions-page.test.tsx`.
- Smoke test #8 em `.agents/skills/sdd-05-manual-test/references/manual_tests.md`.

### Alterado
- Cores do banner de overflow ajustadas para melhor contraste (rose-900 em vez de amber sobre rose-50).
- Atualizada a lógica de `handleEditChecklistItem` para detectar mudança de `category_id` e aplicar overflow check contra nova categoria.
- **Tokens de cor centralizados**: criadas variáveis semânticas `success`/`danger` em `app/globals.css` com valores para modo claro e escuro; headers dos cards Receitas e Despesas migraram das classes utilitárias fixas (`emerald-*`/`rose-*`) para os novos tokens.
- Incrementada a versão do projeto em `package.json` para `0.7.0` (SemVer Minor).

### Corrigido
- Problema de contraste visual no aviso de estouro (combinação de cores âmbar/fundo cinza substituída por rose-900/rose-50).

## [0.5.1] - 2026-07-30

### Adicionado
- Nova funcionalidade de **Lançamento em Lote com Botão "Salvar e Adicionar Outro"** (Patch 05d).
- Novo modal exclusivo para cadastro de **Conta e Cartão** com opções puras de tipo e botão "Salvar" (Patch 05c).
- Nova tabela `public.financial_accounts` em substituição da antiga `accounts`, com FK única `account_id` em `transactions` e migração SQL `migration-feature-5c-financial-accounts.sql`.
- Botão `+ Nova Transação` fixado no rodapé da tabela de cada conta no grid de 2 colunas.
- Sincronização automática do calendário do modal de transação com o mês/ano selecionado nos filtros da página.

### Alterado
- Incrementada a versão do projeto em `package.json` para `0.5.1` (SemVer Patch).

## [0.5.0] - 2026-07-27

### Adicionado
- Nova funcionalidade de **Cadastro de Transações** (Feature 5).
- Novas tabelas `public.accounts` e `public.transactions` no Supabase com suporte a RLS e auditoria transparente (`created_by`).
- Script de migração SQL `utils/migrations/migration-feature-5.sql`.
- Módulos de banco de dados `lib/pluto/db/accounts.ts` e `lib/pluto/db/transactions.ts` com validação de mês aberto em `monthly_periods`, suporte a estornos/reembolsos via flag `is_refund` e busca/criação inline de contas e categorias.
- Nova rota e interface de usuário `/pluto/transactions` com seletor de mês, cards de resumo financeiro (Total Entradas, Total Saídas e Resultado do Mês), modal/formulário de lançamentos e tabela de extrato.
- Testes automatizados unitários e de UI em `__tests__/lib/pluto/db/accounts.test.ts`, `__tests__/lib/pluto/db/transactions.test.ts` e `__tests__/app/pluto/transactions-page.test.tsx`.
- Smoke test #5 em `.agents/skills/sdd-05-manual-test/references/manual_tests.md`.

### Alterado
- Incrementada a versão do projeto em `package.json` para `0.5.0` (SemVer Minor).

## [0.4.0] - 2026-07-27

### Adicionado
- Nova funcionalidade de **Abertura de Mês** (Feature 4).
- Nova tabela `public.monthly_periods` no Supabase com suporte a RLS e auditoria transparente para controle de períodos operacionais.
- Módulo de serviço de banco de dados `lib/pluto/db/months.ts` para consulta, abertura e encerramento de meses.
- Interface `/pluto/months` com visualização em grid de 12 cards anuais, badges de status (Não Iniciado, Aberto, Encerrado), métricas de resumo anual e botões de ação contextualizados por mês.
- Menu de navegação por abas superiores em Héstia Financeira integrando as telas de "Orçamento Anual" (`/pluto/budget`) e "Meses e Períodos" (`/pluto/months`).
- Banner visual de feedback e tratamento amigável de erros de banco/autenticação na interface.
- Suíte completa de testes automatizados unitários e de UI em `__tests__/lib/pluto/db/months.test.ts` e `__tests__/app/pluto/months-page.test.tsx`.

### Alterado
- Incrementada a versão do projeto em `package.json` para `0.4.0` (SemVer Minor).

## [0.3.1] - 2026-07-17

### Adicionado
- Criada a tabela de controle de migrações SQL `public.schema_migrations` no Supabase com suporte a RLS e registro retroativo automatizado.
- Criada a nova skill `sdd-tool-db-migration` para gerenciar migrações de banco no diretório `utils/migrations/`.
- Adicionada a badge visual "Histórico (Substituído)" na interface de orçamento para melhor feedback do usuário ao visualizar ajustes antigos e inativos.

### Modificado
- Refatoração completa da nomenclatura de banco físico de `budget_revisions` para `budget_adjustments` e de `revision_id` para `adjustment_id` na tabela `budget_items`, para aderir fielmente à linguagem ubíqua ("Ajustes").
- Ajustado o botão "Criar Novo Ajuste" para seguir o padrão visual de estilo do projeto.
- Movidas todas as migrações SQL do repositório para a pasta oficial `utils/migrations/`.
- Atualizado o script do CLI `.agents/scripts/sdd.js` para operar sem dependência de diários de bordo físicos.
- Ajustadas as skills `sdd-01-brainstorm` e `sdd-02-plan` para acomodar patches de especificação (ex: `02a`) e remover checkboxes dos templates de plano.

### Removido
- Removida a skill `sdd-tool-tracking` e a pasta de logs de execução `.agents/logs/` de dentro do projeto.

### Corrigido
- Corrigido bug de ordenação em `getBudgets` que mascarava a atualização de valores inline exibindo dados de Janeiro mesmo após salvar o Ajuste de Agosto. Resolvido com ordenação decrescente explícita no JavaScript.
- Resolvida concorrência de salvamento duplo inline (Enter + Blur) disparando a ação unicamente pelo `onBlur` via `blur()` do input.
- Removido o estado de loading de tela cheia em atualizações em lote (silent refresh no `loadData`) para evitar piscadas visuais ao salvar itens.
- Removida a trava de ambiente (`NODE_ENV`) para o parâmetro `mockMonth`, permitindo testes em qualquer perfil de build local.

## [0.3.0] - 2026-07-17

### Adicionado
- Nova funcionalidade de **Ajuste de orçamento ao longo do ano** (Feature 2).
- Navegação e visualização mensal de metas financeiras através de um seletor de Mês (dropdown compacto) ao lado do seletor de Ano.
- Edição inline direta nas células de valores orçados na tabela, com salvamento automático nos eventos de `onBlur` ou ao pressionar `Enter` com prevenção de recarregamentos indesejados.
- Regra de "Mês Aberto": bloqueio de edições em meses anteriores ao mês ativo (tornando as previsões somente-leitura) e liberação nos meses vigentes/futuros.
- Suporte à testabilidade do mês ativo em desenvolvimento e testes utilizando o query parameter `?mockMonth=M` (lido via hook `useSearchParams` do Next.js).
- Ocultação na tabela de categorias que tenham valor previsto igual a 0 a partir do mês em questão.
- Nova skill `sdd-writer-changelog` para automatizar a manutenção de CHANGELOG e README.
- Regra rígida Anti-Tentativa-e-Erro nas skills de depuração e execução de tarefas.
