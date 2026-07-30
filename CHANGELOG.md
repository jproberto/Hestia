# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

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
- Módulos de banco de dados `lib/db/accounts.ts` e `lib/db/transactions.ts` com validação de mês aberto em `monthly_periods`, suporte a estornos/reembolsos via flag `is_refund` e busca/criação inline de contas e categorias.
- Nova rota e interface de usuário `/finance/transactions` com seletor de mês, cards de resumo financeiro (Total Entradas, Total Saídas e Resultado do Mês), modal/formulário de lançamentos e tabela de extrato.
- Testes automatizados unitários e de UI em `__tests__/lib/db/accounts.test.ts`, `__tests__/lib/db/transactions.test.ts` e `__tests__/app/finance/transactions-page.test.tsx`.
- Smoke test #5 em `.agents/skills/sdd-05-manual-test/references/manual_tests.md`.

### Alterado
- Incrementada a versão do projeto em `package.json` para `0.5.0` (SemVer Minor).

## [0.4.0] - 2026-07-27

### Adicionado
- Nova funcionalidade de **Abertura de Mês** (Feature 4).
- Nova tabela `public.monthly_periods` no Supabase com suporte a RLS e auditoria transparente para controle de períodos operacionais.
- Módulo de serviço de banco de dados `lib/db/months.ts` para consulta, abertura e encerramento de meses.
- Interface `/finance/months` com visualização em grid de 12 cards anuais, badges de status (Não Iniciado, Aberto, Encerrado), métricas de resumo anual e botões de ação contextualizados por mês.
- Menu de navegação por abas superiores em Héstia Financeira integrando as telas de "Orçamento Anual" (`/finance/budget`) e "Meses e Períodos" (`/finance/months`).
- Banner visual de feedback e tratamento amigável de erros de banco/autenticação na interface.
- Suíte completa de testes automatizados unitários e de UI em `__tests__/lib/db/months.test.ts` e `__tests__/app/finance/months-page.test.tsx`.

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
