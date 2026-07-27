# Implementation Plan: Cadastro de Transações (Item 5 do Backlog)

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

**Objetivo:** Implementar o cadastro de transações (receitas e despesas reais), suporte a estornos/reembolsos via marcação `is_refund`, criação inline de contas e categorias, registro de saldo inicial e restrição estrita de lançamento em meses abertos (`monthly_periods`).

**Arquitetura:** 
- Tabela `public.accounts` e `public.transactions` no Supabase com RLS.
- Módulo `lib/db/accounts.ts` para gerenciamento e busca/criação inline de contas.
- Módulo `lib/db/categories.ts` estendido para suporte a busca/criação inline de categorias.
- Módulo `lib/db/transactions.ts` para criação e consulta de lançamentos com validação server-side de mês aberto.
- Rota e Interface Next.js App Router em `/finance/transactions` contendo seletor de mês, cards de resumo (Entradas, Saídas, Resultado) e modal de lançamento.

**Tech Stack:** Next.js, React, Supabase Client, TypeScript, Jest / React Testing Library, Tailwind CSS / CSS Vanilla.

## Restrições Globais
- Somente permitir salvar transações quando a data (ano/mês) estiver com status `'aberto'` em `monthly_periods`.
- Contas e Categorias desconhecidas devem ser criadas inline automaticamente no banco durante o lançamento.
- Estornos são lançados como despesas positivas marcadas com `is_refund = true` para reduzir o total de saídas da categoria sem inflar a receita bruta.
- Auditoria: Salvar o e-mail do usuário autenticado em `created_by`.

---

## Mapeamento de Arquivos

### Criar:
- `utils/migrations/migration-feature-5.sql`
- `lib/db/accounts.ts`
- `lib/db/transactions.ts`
- `__tests__/lib/db/accounts.test.ts`
- `__tests__/lib/db/transactions.test.ts`
- `app/finance/transactions/page.tsx`
- `__tests__/app/finance/transactions-page.test.tsx`

### Modificar:
- `lib/db/categories.ts` (se necessário para busca/criação inline)
- `package.json` (bump da versão minor)

---

## Tarefas de Implementação

### Tarefa 1: Script DDL de Migração do Banco de Dados
**Objetivo:** Criar a estrutura física das tabelas `accounts` e `transactions` com políticas de RLS e registro em `schema_migrations`.

**Arquivos:**
- Criar: `utils/migrations/migration-feature-5.sql`

**Interfaces:**
- Produz: Tabelas `public.accounts` e `public.transactions` no Supabase.

**Passos de Execução:**
1. Iniciar a tarefa no CLI do SDD:
   `node .agents/scripts/sdd.js task-start 1`
2. Criar o arquivo `utils/migrations/migration-feature-5.sql` contendo os comandos SQL DDL conforme especificado na spec `05-cadastro-transacoes-spec.md` (tabelas `accounts`, `transactions`, RLS policies e inserção auditável em `schema_migrations`).
3. Concluir a tarefa no CLI do SDD:
   `node .agents/scripts/sdd.js task-complete 1`
4. Commit:
   `git add utils/migrations/migration-feature-5.sql`
   `node .agents/scripts/sdd.js commit "feat(db): adicionar script de migracao da feature 05 cadastro de transacoes"`

---

### Tarefa 2: Camada de Acesso a Dados de Contas (`lib/db/accounts.ts`) e Categorias Inline
**Objetivo:** Desenvolver as funções para busca e criação inline de contas e suporte à busca/criação inline de categorias.

**Arquivos:**
- Criar: `lib/db/accounts.ts`
- Modificar: `lib/db/categories.ts`
- Criar: `__tests__/lib/db/accounts.test.ts`

**Interfaces:**
- Produz: Funções `getAccounts` e `findOrCreateAccount` em `lib/db/accounts.ts`.
- Produz: Função `findOrCreateCategory` em `lib/db/categories.ts`.

**Passos de Execução:**
1. Iniciar a tarefa no CLI do SDD:
   `node .agents/scripts/sdd.js task-start 2`
2. Criar arquivo de teste `__tests__/lib/db/accounts.test.ts` que valida a listagem de contas e a criação de conta nova ou reaproveitamento de conta existente por nome.
3. Executar o teste e confirmar falha (Red):
   `npx jest __tests__/lib/db/accounts.test.ts`
4. Implementar o módulo `lib/db/accounts.ts` com as funções tipadas e adicionar a busca/criação inline em `lib/db/categories.ts`.
5. Executar o teste e confirmar sucesso (Green):
   `npx jest __tests__/lib/db/accounts.test.ts`
6. Concluir a tarefa no CLI do SDD:
   `node .agents/scripts/sdd.js task-complete 2`
7. Commit:
   `git add lib/db/accounts.ts lib/db/categories.ts __tests__/lib/db/accounts.test.ts`
   `node .agents/scripts/sdd.js commit "feat(lib): adicionar abstracao de banco para contas e categorias inline"`

---

### Tarefa 3: Camada de Acesso a Dados de Transações e Lógica de Mês Aberto (`lib/db/transactions.ts`)
**Objetivo:** Implementar o cadastro e consulta de transações por mês, garantindo a trava de segurança que impede lançamentos em meses não abertos.

**Arquivos:**
- Criar: `lib/db/transactions.ts`
- Criar: `__tests__/lib/db/transactions.test.ts`

**Interfaces:**
- Consome: `getMonthlyPeriods` de `lib/db/months.ts`, `accounts` e `categories`.
- Produz: Funções `getTransactionsByMonth` e `createTransaction` em `lib/db/transactions.ts`.

**Passos de Execução:**
1. Iniciar a tarefa no CLI do SDD:
   `node .agents/scripts/sdd.js task-start 3`
2. Criar arquivo de teste `__tests__/lib/db/transactions.test.ts` cobrindo os cenários:
   - Inserção de transação em mês com `status = 'aberto'` (sucesso).
   - Inserção de transação em mês sem status `'aberto'` ou não iniciado (deve lançar erro).
   - Cálculo de despesas normais vs despesas com `is_refund = true`.
3. Executar os testes e confirmar falha (Red):
   `npx jest __tests__/lib/db/transactions.test.ts`
4. Implementar as funções em `lib/db/transactions.ts` incluindo a verificação do estado do mês em `monthly_periods` antes da inserção.
5. Executar os testes e confirmar sucesso (Green):
   `npx jest __tests__/lib/db/transactions.test.ts`
6. Concluir a tarefa no CLI do SDD:
   `node .agents/scripts/sdd.js task-complete 3`
7. Commit:
   `git add lib/db/transactions.ts __tests__/lib/db/transactions.test.ts`
   `node .agents/scripts/sdd.js commit "feat(lib): adicionar operacoes de transacoes com validacao de mes aberto"`

---

### Tarefa 4: Interface do Usuário e Tela de Transações (`app/finance/transactions/page.tsx`)
**Objetivo:** Construir a página `/finance/transactions` com seletor mensal, resumo financeiro (Entradas, Saídas, Resultado), modal de formulário com suporte a criação inline e tabela de extrato.

**Arquivos:**
- Criar: `app/finance/transactions/page.tsx`
- Criar: `__tests__/app/finance/transactions-page.test.tsx`

**Interfaces:**
- Consome: `getTransactionsByMonth`, `createTransaction`, `getAccounts`, `findOrCreateAccount`, `findOrCreateCategory`.
- Produz: Interface responsiva em `/finance/transactions`.

**Passos de Execução:**
1. Iniciar a tarefa no CLI do SDD:
   `node .agents/scripts/sdd.js task-start 4`
2. Criar teste de UI `__tests__/app/finance/transactions-page.test.tsx` validando renderização da página, formulário e tratamentos de erro.
3. Executar o teste e confirmar falha (Red):
   `npx jest __tests__/app/finance/transactions-page.test.tsx`
4. Implementar a página `app/finance/transactions/page.tsx` garantindo a inclusão das abas de navegação, seletores, cards de resumo, formulário/modal com toggle `is_refund` e tabela de lançamentos.
5. Executar os testes e confirmar sucesso (Green):
   `npx jest __tests__/app/finance/transactions-page.test.tsx`
6. Concluir a tarefa no CLI do SDD:
   `node .agents/scripts/sdd.js task-complete 4`
7. Commit:
   `git add app/finance/transactions/page.tsx __tests__/app/finance/transactions-page.test.tsx`
   `node .agents/scripts/sdd.js commit "feat(ui): implementar pagina e formulario de cadastro de transacoes"`

---

### Tarefa 5: Atualização de Versão (SemVer) e Validação de Suíte Completa
**Objetivo:** Atualizar a versão minor no `package.json` e validar a suíte completa de testes, linter e build.

**Arquivos:**
- Modificar: `package.json`

**Passos de Execução:**
1. Iniciar a tarefa no CLI do SDD:
   `node .agents/scripts/sdd.js task-start 5`
2. Atualizar o campo `"version"` no `package.json` (incrementando minor para nova funcionalidade).
3. Executar as verificações obrigatórias de baseline do projeto:
   - `npm run test`
   - `npx eslint .`
   - `npx tsc --noEmit`
4. Concluir a tarefa no CLI do SDD:
   `node .agents/scripts/sdd.js task-complete 5`
5. Commit:
   `git add package.json`
   `node .agents/scripts/sdd.js commit "chore(release): bump de versao para cadastro de transacoes"`

---

## Cenários de Teste Manuais de Aceitação

### Cenário 1: Tentar Lançar em Mês Fechado / Não Iniciado
- **Dado** que o usuário está na página `/finance/transactions`.
- **Quando** ele tentar registrar uma transação com uma data cujo mês não está 'aberto'.
- **Então** o sistema deve bloquear o envio e exibir um alerta explicativo.

### Cenário 2: Lançamento com Sucesso e Criação Inline de Conta
- **Dado** que o mês corrente está 'aberto'.
- **Quando** o usuário preencher uma despesa e informar uma nova conta (ex: "Banco Inter") que não existia na lista.
- **Então** a transação deve ser salva com sucesso, a nova conta deve ser criada no banco e exibida no extrato.

### Cenário 3: Registro de Estorno / Reembolso
- **Dado** que o usuário seleciona Tipo "Despesa", informa o valor `R$ 50,00` e marca a opção "É um estorno/reembolso?".
- **Quando** ele salvar a transação.
- **Então** a transação é gravada com `is_refund = true` e o card de "Total Saídas" deve abater esse valor do total de despesas.
