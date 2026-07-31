# Edição e Exclusão de Lançamentos Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

**Objetivo:** Implementar as funções de backend e a interface de usuário para permitir a edição e exclusão de lançamentos financeiros em meses com status aberto.

**Arquitetura:** Adicionar funções de atualização (`updateTransaction`) e exclusão (`deleteTransaction`) em `lib/db/transactions.ts` com validação de período aberto. Atualizar a página `app/finance/transactions/page.tsx` para incluir a coluna de Ações na tabela de lançamentos, integrar o modal de edição reutilizando o formulário existente e exibir um modal de confirmação antes de excluir.

**Tech Stack:** Next.js (App Router), React, TypeScript, Supabase Client, Vitest, Testing Library.

## Restrições Globais
- **Apenas Meses Abertos:** Lançamentos em meses não iniciados ou encerrados são travados contra edição e exclusão.
- **Restrição de Data:** Tanto na inclusão quanto na edição, a data fica restrita aos limites do mês exibido na tela.
- **Desacoplamento:** Edição e exclusão atuam sobre lançamentos individuais na tabela `transactions`.

---

## Estrutura de Arquivos

- Modificar: `lib/db/transactions.ts` (Adicionar `updateTransaction` e `deleteTransaction`)
- Modificar: `app/finance/transactions/page.tsx` (Adicionar coluna Ações, botões de Editar/Excluir, modal de edição e modal de confirmação de exclusão)
- Modificar: `package.json` (Bump de versão para `0.8.0`)
- Modificar: `.agents/backlog.md` (Atualizar nota na Feature 7 sobre geração individual de parcelas)
- Modificar/Criar Testes: `__tests__/lib/db/transactions.test.ts` e `__tests__/app/finance/transactions-page.test.tsx`

---

## Tarefas de Implementação

### Tarefa 1: Funções de Backend para Edição e Exclusão (`lib/db/transactions.ts`)

**Arquivos:**
- Modificar: `lib/db/transactions.ts`
- Modificar: `__tests__/lib/db/transactions.test.ts`

**Interfaces:**
- Consome: `SupabaseClient`, `TransactionInput`, `TransactionWithDetails`, tabela `monthly_periods`, tabela `transactions`.
- Produz: 
  - `updateTransaction(supabase: SupabaseClient, id: string, input: TransactionInput, email: string): Promise<TransactionWithDetails>`
  - `deleteTransaction(supabase: SupabaseClient, id: string, email: string): Promise<void>`

**Passo 1: Iniciar tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-start 1`

**Passo 2: Escrever testes unitários em `__tests__/lib/db/transactions.test.ts`**
- Testar se `updateTransaction` atualiza os campos com sucesso quando o mês da data do lançamento está aberto.
- Testar se `updateTransaction` lança erro quando o mês da data do lançamento não está aberto.
- Testar se `deleteTransaction` remove o lançamento com sucesso quando o mês está aberto.
- Testar se `deleteTransaction` lança erro quando o mês da transação não está aberto.

**Passo 3: Executar os testes e confirmar que falham (RED)**
Run: `npm run test`
Expected: FAIL informando que `updateTransaction` e `deleteTransaction` não existem.

**Passo 4: Implementar as funções em `lib/db/transactions.ts`**
- `updateTransaction`:
  1. Extrair ano e mês da nova data informada no `input`.
  2. Consultar `monthly_periods` para verificar se o mês está com `status === 'aberto'`. Se não estiver aberto, lançar erro informando que o período não permite edições.
  3. Executar o `.update(...)` na tabela `transactions` filtrando pelo `id`.
  4. Retornar a transação atualizada com detalhes da categoria e conta.
- `deleteTransaction`:
  1. Buscar a transação existente pelo `id` para obter a sua data.
  2. Extrair ano e mês da data da transação.
  3. Consultar `monthly_periods` para verificar se o mês está com `status === 'aberto'`. Se não estiver aberto, lançar erro.
  4. Executar o `.delete().eq("id", id)` na tabela `transactions`.

**Passo 5: Executar os testes e verificar se passam (GREEN)**
Run: `npm run test`
Expected: PASS para todas as suítes de teste de banco de dados.

**Passo 6: Concluir tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-complete 1`

**Passo 7: Commit**
```bash
git add lib/db/transactions.ts __tests__/lib/db/transactions.test.ts
node .agents/scripts/sdd.js commit "feat(db): adiciona funções updateTransaction e deleteTransaction com validação de mês aberto"
```

---

### Tarefa 2: Interface de Edição e Exclusão (`app/finance/transactions/page.tsx`)

**Arquivos:**
- Modificar: `app/finance/transactions/page.tsx`
- Modificar: `__tests__/app/finance/transactions-page.test.tsx`

**Interfaces:**
- Consome: `updateTransaction`, `deleteTransaction` de `lib/db/transactions.ts`, ícones de lápis (`Pencil`) e lixeira (`Trash2`) de `lucide-react`.
- Produz: Coluna de Ações na tabela de lançamentos, modal de edição e modal de confirmação de exclusão.

**Passo 1: Iniciar tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-start 2`

**Passo 2: Escrever/atualizar testes de interface em `__tests__/app/finance/transactions-page.test.tsx`**
- Testar se os botões de editar e excluir aparecem para cada linha da tabela de transações.
- Testar se clicar no botão de editar abre o modal de formulário preenchido com os dados atuais.
- Testar se enviar o formulário de edição chama `updateTransaction` e recarrega os dados.
- Testar se clicar no botão de excluir abre o modal de confirmação exibindo o nome e valor da transação.
- Testar se confirmar a exclusão chama `deleteTransaction` e remove o item da lista.

**Passo 3: Executar os testes e confirmar que falham (RED)**
Run: `npm run test`
Expected: FAIL informando que os botões/modais de ação não foram encontrados.

**Passo 4: Implementar os componentes e modais em `app/finance/transactions/page.tsx`**
1. **Coluna de Ações na Tabela:**
   - Adicionar o cabeçalho `<th>Ações</th>` e a célula `<td>` contendo os botões de Editar (lápis) e Excluir (lixeira) em cada linha.
2. **Modal de Edição (Reutilização do Formulário):**
   - Manter estado `editingTransaction: TransactionWithDetails | null`.
   - Ao clicar em Editar, preencher os estados dos inputs (`description`, `amount`, `type`, `is_refund`, `date`, `category_id`, `account_id`) com os dados da transação selecionada e abrir o modal.
   - Garantir que a propriedade `min` e `max` do input de data restrinjam a seleção ao intervalo de datas do mês que está sendo visualizado.
   - Tratar o salvamento chamando `updateTransaction` quando `editingTransaction` estiver definido ou `createTransaction` caso contrário.
3. **Modal de Confirmação de Exclusão:**
   - Manter estado `deletingTransaction: TransactionWithDetails | null`.
   - Exibir diálogo/modal simples com título "Excluir lançamento", corpo exibindo *"Tem certeza que deseja excluir o lançamento '[descrição]' no valor de R$ [valor]?"*.
   - Botões "Cancelar" (fecha modal) e "Excluir" (chama `deleteTransaction`, recarrega lista e exibe notificação).

**Passo 5: Executar testes de linter, tipos e vitest (GREEN)**
Run: `npx eslint . && npx tsc --noEmit && npm run test`
Expected: PASS com zero erros de compilação, tipo ou testes.

**Passo 6: Concluir tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-complete 2`

**Passo 7: Commit**
```bash
git add app/finance/transactions/page.tsx __tests__/app/finance/transactions-page.test.tsx
node .agents/scripts/sdd.js commit "feat(ui): adiciona coluna de ações, modal de edição e modal de exclusão de lançamentos"
```

---

### Tarefa 3: SemVer Bump e Atualização do Backlog

**Arquivos:**
- Modificar: `package.json`
- Modificar: `.agents/backlog.md`

**Passo 1: Iniciar tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-start 3`

**Passo 2: Atualizar versão em `package.json`**
- Alterar `"version": "0.5.1"` para `"version": "0.8.0"`.

**Passo 3: Atualizar nota da Feature 7 em `.agents/backlog.md`**
- Adicionar observação na descrição da Feature 7 (Compras Parceladas): *"Nota: A abertura de mês gerará cada parcela como um lançamento individual na tabela de transações, permitindo edição e exclusão pontual por parcela."*

**Passo 4: Executar validações gerais**
Run: `npx eslint . && npx tsc --noEmit && npm run test`
Expected: PASS.

**Passo 5: Concluir tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-complete 3`

**Passo 6: Commit**
```bash
git add package.json .agents/backlog.md
node .agents/scripts/sdd.js commit "chore: bump version para 0.8.0 e atualiza notas no backlog"
```

---

## Cenários de Teste Manuais de Aceitação

### Cenário 1: Edição de um Lançamento Existente no Mês Aberto
- **Dado** que o usuário está navegando no mês atual (ex: 07/2026 com status `aberto`) e existe o lançamento "Mercado" no valor de R$ 150,00.
- **Quando** o usuário clica no ícone de lápis (Editar) na linha do lançamento.
- **Então** o modal de lançamento abre preenchido com todos os dados atuais do "Mercado".
- **E Quando** o usuário altera a descrição para "Supermercado Extra" e o valor para R$ 180,00 e clica em Salvar.
- **Então** o modal fecha, a tabela exibe "Supermercado Extra" com R$ 180,00 e os totais do mês são recarregados e atualizados.

### Cenário 2: Exclusão de um Lançamento com Confirmação
- **Dado** que o usuário está visualizando a lista de lançamentos de um mês aberto.
- **Quando** o usuário clica no ícone de lixeira (Excluir) de um lançamento de R$ 50,00.
- **Então** um modal de confirmação é exibido perguntando *"Tem certeza que deseja excluir o lançamento..."* apresentando o valor de R$ 50,00.
- **E Quando** o usuário clica em "Excluir".
- **Então** o modal fecha, o lançamento desaparece da tabela e o saldo total do mês é recalculado imediatamente.

### Cenário 3: Restrição de Seleção de Data
- **Dado** que o usuário abriu o modal de inclusão ou de edição no mês de 07/2026.
- **Quando** o usuário tenta selecionar uma data fora do intervalo do mês (ex: 05/08/2026).
- **Então** o campo de data impede a seleção de datas fora do mês 07/2026.
