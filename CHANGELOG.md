# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

## [Não lançado]

### Adicionado
- **Mapa de Camadas no `AGENTS.md`:** diagrama + tabela camada→responsabilidade→importa-de→testado-com + FAQ "Onde ponho X?" (fonte normativa; Atena exige declarar camadas no plano).
- **Testes novos:** single-flight do fetch, identidade do singleton de client, enriquecimento de `category_name`, contratos por unidade extraída (budget/months/checklist/modais) — suíte em 63 arquivos / 418 testes.
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
