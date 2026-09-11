# Checklist de Contas a Pagar / Receber Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

**Objetivo:** Implementar a funcionalidade de Checklist de Contas a Pagar/Receber nos meses abertos, incluindo suporte a modelos globais recorrentes, instâncias de mês, alertas visuais de urgência baseados no vencimento e atalho conveniente para o modal de cadastro de transação.

**Arquitetura:** Tabela única `checklist_items` no Supabase com suporte a modelos globais (`month_id IS NULL`) e instâncias de mês (`month_id` vinculado a `monthly_periods`). Na abertura de um novo mês, o sistema clona automaticamente os modelos globais ativos (`is_active = true`). Na interface de transações do mês aberto, o componente `ChecklistCard` é renderizado para exibir os compromissos, calcular urgência visual (vermelho, amarelo, verde, cinza tachado) e disparar o modal de transação pré-preenchido sem acoplamento rígido.

**Tech Stack:** Next.js (App Router), React, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS, Lucide React, Jest / React Testing Library.

## Restrições Globais
- Banco de Dados Supabase: Script de migração salvo obrigatoriamente em `utils/migrations/migration-feature-4-checklist.sql` com auditoria na tabela `schema_migrations` pelo executor `joaopsroberto@gmail.com`.
- Row Level Security (RLS) habilitado para a nova tabela.
- NomenclaturaUbíqua: Usar nomes de campos equivalentes a `transactions` (`description`, `type`, `amount`, `category_id`, `created_at`, `created_by`).
- SemVer: A alteração da versão do projeto no `package.json` NÃO deve ocorrer nas tarefas do plano, ocorrendo apenas na revisão final.
- Sem código de implementação dentro das tarefas do plano.

---

### Tarefa 1: Criar o Script de Migração do Banco de Dados (`checklist_items`)

**Arquivos:**
- Criar: `utils/migrations/migration-feature-4-checklist.sql`

**Interfaces:**
- Consome: Tabela `public.monthly_periods` (Feature 04) e `public.categories` (Feature 01).
- Produz: Tabela `public.checklist_items` com chave primária UUID, auto-referência `parent_id`, chave estrangeira `month_id`, `day` (1-31), `description`, `type` ('receita'/'despesa'), `category_id`, `amount` (numeric nullable), `is_completed` (boolean default false), `is_active` (boolean default true), `created_at` e `created_by`, com políticas RLS ativas e registro na tabela `schema_migrations`.

**Passo 1: Executar o início da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-start 1`

**Passo 2: Escrever o script SQL de migração**
Crie o arquivo `utils/migrations/migration-feature-4-checklist.sql` contendo os comandos DDL para criação da tabela `public.checklist_items`, ativação do RLS, política de acesso total para autenticados e o comando `INSERT INTO public.schema_migrations` registrando a migração da spec `03`.

**Passo 3: Verificar a sintaxe e integridade do arquivo SQL**
Verifique se a instrução `CREATE TABLE IF NOT EXISTS public.checklist_items` contém todas as restrições `CHECK` (tipo 'receita'/'despesa', dia entre 1 e 31), chaves estrangeiras com `ON DELETE CASCADE` / `SET NULL` apropriados e o registro de auditoria em `schema_migrations`.

**Passo 4: Executar conclusão da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-complete 1`

**Passo 5: Commit**
Run: `git add utils/migrations/migration-feature-4-checklist.sql`
Run: `node .agents/scripts/sdd.js commit "feat(db): adiciona migracao da tabela checklist_items"`

---

### Tarefa 2: Criar a Camada de Banco de Dados (`lib/pluto/db/checklist.ts`) e Testes de Unidade

**Arquivos:**
- Criar: `lib/pluto/db/checklist.ts`
- Criar: `__tests__/lib/pluto/db/checklist.test.ts`

**Interfaces:**
- Consome: `SupabaseClient` de `@supabase/supabase-js`, tabela `public.checklist_items`.
- Produz:
  - Tipo exportado `ChecklistItem` e `ChecklistItemInput`.
  - Função `getChecklistItemsByMonth(supabase: SupabaseClient, monthId: string): Promise<ChecklistItem[]>`
  - Função `getGlobalChecklistItems(supabase: SupabaseClient): Promise<ChecklistItem[]>`
  - Função `createChecklistItem(supabase: SupabaseClient, input: ChecklistItemInput, isGlobal: boolean, currentMonthId?: string): Promise<ChecklistItem>`
  - Função `updateChecklistItem(supabase: SupabaseClient, id: string, input: Partial<ChecklistItemInput>, updateGlobal: boolean): Promise<void>`
  - Função `deleteChecklistItem(supabase: SupabaseClient, id: string, deleteGlobal: boolean): Promise<void>`
  - Função `toggleChecklistItemCompletion(supabase: SupabaseClient, id: string, isCompleted: boolean): Promise<void>`
  - Função `instantiateGlobalChecklistItemsForMonth(supabase: SupabaseClient, monthId: string, email: string): Promise<void>`

**Passo 1: Executar o início da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-start 2`

**Passo 2: Escrever o teste unitário que falha (RED)**
Crie `__tests__/lib/pluto/db/checklist.test.ts` testando a estrutura de retorno das funções `getChecklistItemsByMonth`, `createChecklistItem`, `updateChecklistItem`, `deleteChecklistItem` e `instantiateGlobalChecklistItemsForMonth` utilizando mocks do Supabase.

**Passo 3: Executar o teste e verificar que falha**
Run: `npm test __tests__/lib/pluto/db/checklist.test.ts`
Expected: FAIL informando que a biblioteca `@/lib/pluto/db/checklist` ou suas funções não existem.

**Passo 4: Implementar a camada `lib/pluto/db/checklist.ts` (GREEN)**
Crie `lib/pluto/db/checklist.ts` exportando as interfaces e implementando as funções de consulta, criação, atualização, exclusão e instanciação com Supabase Client.

**Passo 5: Executar o teste e confirmar sucesso**
Run: `npm test __tests__/lib/pluto/db/checklist.test.ts`
Expected: PASS

**Passo 6: Executar conclusão da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-complete 2`

**Passo 7: Commit**
Run: `git add lib/pluto/db/checklist.ts __tests__/lib/pluto/db/checklist.test.ts`
Run: `node .agents/scripts/sdd.js commit "feat(db): implementa camada db e testes unitarios para checklist_items"`

---

### Tarefa 3: Integrar a Instanciação dos Modelos do Checklist na Abertura do Mês

**Arquivos:**
- Modificar: `lib/pluto/db/months.ts`
- Modificar ou Criar: `__tests__/lib/pluto/db/months-checklist.test.ts`

**Interfaces:**
- Consome: `instantiateGlobalChecklistItemsForMonth` de `lib/pluto/db/checklist.ts`, `openMonthlyPeriod` de `lib/pluto/db/months.ts`.
- Produz: Atualização em `openMonthlyPeriod` para que, após upsert na tabela `monthly_periods`, obtenha o `id` daquele período e invoque a cópia dos modelos globais ativos (`is_active = true`).

**Passo 1: Executar o início da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-start 3`

**Passo 2: Escrever o teste unitário que falha (RED)**
Crie ou altere `__tests__/lib/pluto/db/months-checklist.test.ts` verificando que a chamada a `openMonthlyPeriod` invoca a função de clonagem dos itens do checklist para o mês que foi aberto.

**Passo 3: Executar o teste e verificar que falha**
Run: `npm test __tests__/lib/pluto/db/months-checklist.test.ts`
Expected: FAIL pois a clonagem de modelos ainda não é chamada em `openMonthlyPeriod`.

**Passo 4: Modificar `lib/pluto/db/months.ts` (GREEN)**
Atualize `openMonthlyPeriod` para selecionar o ID do registro inserido/atualizado em `monthly_periods` e executar `instantiateGlobalChecklistItemsForMonth(supabase, monthId, email)`.

**Passo 5: Executar o teste e confirmar sucesso**
Run: `npm test __tests__/lib/pluto/db/months-checklist.test.ts`
Expected: PASS

**Passo 6: Executar conclusão da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-complete 3`

**Passo 7: Commit**
Run: `git add lib/pluto/db/months.ts __tests__/lib/pluto/db/months-checklist.test.ts`
Run: `node .agents/scripts/sdd.js commit "feat(db): integra instanciacao automatica do checklist na abertura de mes"`

---

### Tarefa 4: Criar o Componente `ChecklistCard` (Alertas de Cores, Modais de Ação e Disparo de Transação)

**Arquivos:**
- Criar: `components/pluto/ChecklistCard.tsx`
- Criar: `__tests__/components/pluto/ChecklistCard.test.tsx`

**Interfaces:**
- Consome: `ChecklistItem` de `@/lib/pluto/db/checklist`, `Category` de `@/lib/pluto/db/categories`, funções de CRUD do checklist.
- Produz: Componente React `ChecklistCard` que aceita os props:
  - `items: ChecklistItem[]`
  - `categories: Category[]`
  - `isMonthOpen: boolean`
  - `selectedYear: number`
  - `selectedMonth: number`
  - `onToggleItem: (id: string, isCompleted: boolean, item: ChecklistItem) => void`
  - `onAddItem: (input: ChecklistItemInput, isGlobal: boolean) => Promise<void>`
  - `onEditItem: (id: string, input: Partial<ChecklistItemInput>, updateGlobal: boolean) => Promise<void>`
  - `onDeleteItem: (id: string, deleteGlobal: boolean) => Promise<void>`
  - `onTriggerTransactionModal: (prefillData: { description: string; amount?: number; type: "receita" | "despesa"; category_id: string; date: string }) => void`

**Passo 1: Executar o início da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-start 4`

**Passo 2: Escrever o teste visual/interativo que falha (RED)**
Crie `__tests__/components/pluto/ChecklistCard.test.tsx` testando:
1. Renderização das faixas de urgência (vermelho para vencidos, amarelo para 0-3 dias, verde para 4+ dias, cinza tachado para marcados).
2. Clique no checkbox invocando `onToggleItem` e disparando `onTriggerTransactionModal` com a conta em branco.
3. Desabilitação de interações se `isMonthOpen` for falso.

**Passo 3: Executar o teste e verificar que falha**
Run: `npm test __tests__/components/pluto/ChecklistCard.test.tsx`
Expected: FAIL informando que `@/components/pluto/ChecklistCard` não existe.

**Passo 4: Criar o componente `components/pluto/ChecklistCard.tsx` (GREEN)**
Implemente o componente com tabela/cards de itens, ordenação por dia, badge de status/cor de urgência, checkbox de conclusão, botões de edição/exclusão com modal de confirmação de escopo ("Apenas neste mês" vs "No modelo global") e formulário modal de inclusão de novo item.

**Passo 5: Executar o teste e confirmar sucesso**
Run: `npm test __tests__/components/pluto/ChecklistCard.test.tsx`
Expected: PASS

**Passo 6: Executar conclusão da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-complete 4`

**Passo 7: Commit**
Run: `git add components/pluto/ChecklistCard.tsx __tests__/components/pluto/ChecklistCard.test.tsx`
Run: `node .agents/scripts/sdd.js commit "feat(ui): cria componente ChecklistCard com urgencia visual e modais de escopo"`

---

### Tarefa 5: Integrar o Checklist na Tela de Transações do Mês Aberto (`app/pluto/transactions/page.tsx`)

**Arquivos:**
- Modificar: `app/pluto/transactions/page.tsx`
- Criar ou Modificar: `__tests__/app/pluto/transactions-checklist.test.tsx`

**Interfaces:**
- Consome: `ChecklistCard` de `@/components/pluto/ChecklistCard`, funções de DB em `lib/pluto/db/checklist.ts`.
- Produz: Integração do card de checklist na página do mês aberto (`app/pluto/transactions/page.tsx`), buscando os itens do checklist do mês selecionado, permitindo adicionar/editar/deletar/marcar e abrindo o modal de transações com os dados pré-preenchidos (descrição, tipo, valor, categoria e data) mantendo o seletor de Conta em branco.

**Passo 1: Executar o início da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-start 5`

**Passo 2: Escrever o teste de integração que falha (RED)**
Crie `__tests__/app/pluto/transactions-checklist.test.tsx` simulando o fluxo de carregar a página de transações, carregar o checklist do mês, marcar um item do checklist e verificar se o modal de transação abre com a descrição, valor e categoria preenchidos, deixando a conta vazia.

**Passo 3: Executar o teste e verificar que falha**
Run: `npm test __tests__/app/pluto/transactions-checklist.test.tsx`
Expected: FAIL informando que o checklist não é renderizado na página de transações.

**Passo 4: Modificar `app/pluto/transactions/page.tsx` (GREEN)**
Adicione a busca de `checklistItems` na função de carregamento da página, renderize o `ChecklistCard` acima ou ao lado das transações e conecte o handler de marcação do checklist para abrir o modal de nova transação preenchendo os estados correspondentes do formulário com a conta zerada/em branco.

**Passo 5: Executar o teste e confirmar sucesso**
Run: `npm test __tests__/app/pluto/transactions-checklist.test.tsx`
Expected: PASS

**Passo 6: Executar a suíte completa de testes para garantir que nada quebrou**
Run: `npm test`
Expected: ALL PASS

**Passo 7: Executar conclusão da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-complete 5`

**Passo 8: Commit**
Run: `git add app/pluto/transactions/page.tsx __tests__/app/pluto/transactions-checklist.test.tsx`
Run: `node .agents/scripts/sdd.js commit "feat(ui): integra checklist de contas a pagar na tela de transacoes"`

---

## Cenários de Teste Manuais de Aceitação

### Cenário 1: Automação na Abertura de Novo Mês
- **Dado** que existem 2 modelos globais cadastrados no checklist (ex: "Aluguel" dia 10 e "Salário" dia 05).
- **Quando** o usuário abre um novo mês no sistema (ex: Agosto/2026).
- **Então** o sistema deve criar automaticamente 2 itens no checklist daquele mês, copiando a descrição, dia, tipo, categoria e valor de cada modelo global.

### Cenário 2: Indicador Visual de Urgência
- **Dado** um mês aberto com data atual igual ao dia 15.
- **Quando** o usuário visualiza o card do checklist.
- **Então**:
  - Um item do dia 10 (não concluído) deve exibir indicador **vermelho** (vencida).
  - Um item do dia 16 (não concluído) deve exibir indicador **amarelo** (vence em 1 dia).
  - Um item do dia 25 (não concluído) deve exibir indicador **verde** (faltam 10 dias).
  - Um item concluído deve exibir formato **cinza tachado**, independente do dia.

### Cenário 3: Atalho do Checklist para Modal de Transação
- **Dado** um item no checklist: "Aluguel", Despesa, R$ 2.000,00, dia 10.
- **Quando** o usuário clica para marcar o item como concluído.
- **Então**:
  - O item no checklist assume o estado concluído (cinza tachado).
  - O modal de cadastro de transação abre com Descrição ("Aluguel"), Tipo ("despesa"), Categoria e Valor (R$ 2.000,00) preenchidos, com a Data no formato "2026-08-10".
  - O campo Conta/Cartão permanece **em branco/sem seleção**.

### Cenário 4: Cancelamento do Modal Preserva Marcação
- **Dado** que o modal de transação foi aberto a partir de uma marcação do checklist.
- **Quando** o usuário clica em "Cancelar" ou fecha o modal de transação sem salvar.
- **Então** o item do checklist **continua marcado como concluído**.

### Cenário 5: Inclusão / Edição com Confirmação de Escopo
- **Dado** que o usuário está adicionando ou editando um item do checklist na tela do mês aberto.
- **Quando** salva a operação.
- **Então** o sistema exibe a opção de salvar **"Apenas neste mês"** ou **"No modelo global"**, aplicando a persistência correta conforme escolhido.
