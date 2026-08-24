# Cruzamento Checklist × Orçamento por Categoria — Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

**Objetivo:** Implementar a validação de estouro de orçamento ao criar/editar itens do checklist de contas, diferenciando itens globais (bloqueio guiado com fluxo de ajuste) e itens pontuais (aviso informativo não-bloqueante).

**Arquitetura:** O cruzamento é calculado no frontend a partir de dados já carregados (`checklistItems` e `budgetItems` na página de transações). Para itens globais, a lógica de verificação consulta os itens globais ativos da categoria e compara com o orçamento vigente; se há estouro, um modal stepper bloqueia a gravação e guia o usuário a ajustar o orçamento. Para itens pontuais, a gravação acontece normalmente e um banner informativo é exibido no card quando a soma total (globais instanciados + pontuais) da categoria excede o orçamento. O fluxo de criação/reutilização do `budget_adjustment` do mês corrente já existe em `lib/pluto/db/budget.ts` via `createBudgetAdjustment` e `adjustBudgetItem`.

**Tech Stack:** Next.js (App Router), React, TypeScript, Supabase (PostgreSQL + RLS), Tailwind CSS, Lucide React, Vitest, @testing-library/react.

## Restrições Globais

- Não criar novas tabelas nem alterar schemas existentes — o patch usa tabelas `checklist_items`, `budget_adjustments` e `budget_items` como estão.
- Reutilizar funções existentes de `lib/pluto/db/budget.ts`: `getBudgets`, `createBudgetAdjustment`, `adjustBudgetItem`.
- Reutilizar funções existentes de `lib/pluto/db/checklist.ts`: `createChecklistItem`, `updateChecklistItem`, `getGlobalChecklistItems`.
- Convenção de testes: Vitest, diretório `__tests__/` espelhando a estrutura de código-fonte.
- Convenção visual: variáveis CSS do tema (`bg-card`, `text-card-foreground`, `border`), sem cores estáticas inline. Avisos em amber: `text-amber-700 dark:text-amber-400`.
- Moeda: BRL. Formatação: `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- O `mockMonth` pode afetar o mês corrente em dev — usar a mesma lógica já existente na página de transações para determinar ano/mês.
- Commits frequentes, mensagens em português, via `node .agents/scripts/sdd.js commit`.

---

### Tarefa 1: Função utilitária `checkBudgetOverflow` e testes unitários

**Arquivos:**
- Criar: `lib/checklist-budget.ts`
- Testar: `__tests__/lib/checklist-budget.test.ts`

**Interfaces:**
- Consome: `ChecklistItem` de `lib/pluto/db/checklist.ts` (`{ id, category_id, amount, month_id, is_active }`)
- Consome: `BudgetItem` de `lib/pluto/db/budget.ts` (`{ category_id, amount }`)
- Produz:
  ```typescript
  interface BudgetOverflowResult {
    isOverflow: boolean;
    categoryId: string;
    categoryName: string;
    totalChecklist: number;  // soma dos amounts globais ativos da categoria
    budgetAmount: number;    // orçamento vigente da categoria
  }

  function checkGlobalBudgetOverflow(
    globalItems: ChecklistItem[],
    budgetItems: BudgetItem[],
    targetCategoryId: string,
    targetAmount: number | null | undefined,
    excludeItemId?: string   // para edição: exclui o item sendo editado do cálculo
  ): BudgetOverflowResult

  function checkMonthBudgetOverflow(
    monthItems: ChecklistItem[],
    budgetItems: BudgetItem[],
    targetCategoryId: string
  ): BudgetOverflowResult
  ```

**Objetivo técnico:** Criar funções puras (sem side-effects, sem Supabase) que calculam se há estouro de orçamento. `checkGlobalBudgetOverflow` soma os `amount` de itens globais ativos (`month_id === null && is_active === true`) da mesma `category_id`, adicionando o `targetAmount` do item sendo criado/editado (e excluindo `excludeItemId` se for edição), e compara com o `amount` do `BudgetItem` correspondente. `checkMonthBudgetOverflow` soma todos os `amount` dos itens do mês (globais instanciados + pontuais) daquela categoria e compara com o orçamento vigente.

**Passo 1: Executar o início da tarefa no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-start 1`

**Passo 2: Escrever os testes que falham**

Criar `__tests__/lib/checklist-budget.test.ts` com os seguintes cenários:

1. `checkGlobalBudgetOverflow` — retorna `isOverflow: false` quando soma prevista ≤ orçamento.
2. `checkGlobalBudgetOverflow` — retorna `isOverflow: true` quando soma prevista > orçamento.
3. `checkGlobalBudgetOverflow` — exclui item pelo `excludeItemId` no cálculo (cenário de edição).
4. `checkGlobalBudgetOverflow` — ignora itens com `amount` nulo.
5. `checkGlobalBudgetOverflow` — retorna `isOverflow: false` quando não há orçamento definido para a categoria (não bloqueia sem referência).
6. `checkGlobalBudgetOverflow` — filtra apenas itens com `month_id === null` e `is_active === true`.
7. `checkMonthBudgetOverflow` — retorna `isOverflow: true` quando soma de itens do mês excede orçamento.
8. `checkMonthBudgetOverflow` — retorna `isOverflow: false` quando soma ≤ orçamento.

Cada teste deve importar `checkGlobalBudgetOverflow` e `checkMonthBudgetOverflow` de `@/lib/checklist-budget`, criar dados de teste inline e verificar o resultado.

**Passo 3: Executar os testes para garantir que falham**

Run: `npx vitest run __tests__/lib/checklist-budget.test.ts`
Expected: FAIL — módulo `@/lib/checklist-budget` não encontrado.

**Passo 4: Implementar `lib/checklist-budget.ts`**

Criar o módulo com as duas funções puras. A lógica de `checkGlobalBudgetOverflow`:
- Filtrar `globalItems` por `category_id === targetCategoryId`, `month_id === null`, `is_active === true`.
- Excluir item com `id === excludeItemId` se fornecido.
- Somar os `amount` (ignorando nulos) e adicionar `targetAmount` (se não nulo).
- Buscar o `BudgetItem` da `targetCategoryId` em `budgetItems`.
- Se não existir `BudgetItem` para a categoria, retornar `isOverflow: false`.
- Comparar: `totalChecklist > budgetAmount`.

A lógica de `checkMonthBudgetOverflow`:
- Filtrar `monthItems` por `category_id === targetCategoryId`.
- Somar os `amount` (ignorando nulos).
- Buscar o `BudgetItem` da `targetCategoryId` em `budgetItems`.
- Se não existir `BudgetItem`, retornar `isOverflow: false`.
- Comparar: `totalChecklist > budgetAmount`.

**Passo 5: Executar os testes para garantir que passam**

Run: `npx vitest run __tests__/lib/checklist-budget.test.ts`
Expected: PASS — todos os 8 cenários verdes.

**Passo 6: Executar suíte completa de regressão**

Run: `npx vitest run`
Expected: PASS — sem regressões.

**Passo 7: Marcar a tarefa como concluída no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-complete 1`

**Passo 8: Commit**

```bash
git add lib/checklist-budget.ts __tests__/lib/checklist-budget.test.ts
node .agents/scripts/sdd.js commit "feat(03a): adicionar funções puras de verificação de estouro checklist×orçamento"
```

---

### Tarefa 2: Componente `BudgetOverflowModal` (modal de bloqueio guiado) e testes de componente

**Arquivos:**
- Criar: `components/pluto/BudgetOverflowModal.tsx`
- Testar: `__tests__/components/pluto/BudgetOverflowModal.test.tsx`

**Interfaces:**
- Consome: `BudgetOverflowResult` de `lib/checklist-budget.ts`
- Consome: `createBudgetAdjustment(supabase, year, month, email): Promise<string>` de `lib/pluto/db/budget.ts`
- Consome: `adjustBudgetItem(supabase, year, month, categoryName, categoryType, amount, email): Promise<void>` de `lib/pluto/db/budget.ts`
- Produz:
  ```typescript
  interface BudgetOverflowModalProps {
    isOpen: boolean;
    overflowData: {
      categoryId: string;
      categoryName: string;
      categoryType: "receita" | "despesa";
      totalChecklist: number;
      budgetAmount: number;
      operationLabel: string;  // "incluir" ou "alterar"
    };
    year: number;
    month: number;
    userEmail: string;
    onConfirm: (newBudgetValue: number) => void;
    onCancel: () => void;
  }
  ```

**Objetivo técnico:** Criar o modal stepper de 3 etapas descrito na Seção 4 da spec. Etapa 1: mensagem de bloqueio + botões "Ajustar Orçamento" / "Cancelar". Etapa 2 (automática): verificação/criação do ajuste (ocorre no handler do pai, não neste componente). Etapa 3: campo numérico pré-preenchido com a soma prevista do checklist (sugestão), label informativo, botões "Salvar Ajuste e Incluir Item" / "Cancelar". Etapa 4 (success): mensagem de sucesso + botões "Ir para a página de Orçamento" / "Continuar no Checklist". O componente usa variáveis CSS do tema. O campo de valor na Etapa 3 valida que o valor digitado ≥ totalChecklist. O componente não faz chamadas ao banco — delega via `onConfirm(newBudgetValue)`.

**Passo 1: Executar o início da tarefa no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-start 2`

**Passo 2: Escrever os testes que falham**

Criar `__tests__/components/pluto/BudgetOverflowModal.test.tsx` com cenários:

1. Não renderiza nada quando `isOpen = false`.
2. Renderiza a mensagem de bloqueio (Etapa 1) com nome da categoria, valores formatados em BRL, e botões "Ajustar Orçamento" e "Cancelar".
3. Ao clicar "Cancelar" na Etapa 1, chama `onCancel`.
4. Ao clicar "Ajustar Orçamento", avança para a Etapa 3 com campo numérico pré-preenchido com `totalChecklist`.
5. Na Etapa 3, o campo exibe label informativo com mês e nome da categoria.
6. Na Etapa 3, ao clicar "Cancelar", chama `onCancel`.
7. Na Etapa 3, ao digitar valor ≥ `totalChecklist` e clicar "Salvar Ajuste e Incluir Item", chama `onConfirm(valor)`.
8. Na Etapa 3, o campo não permite valor menor que `totalChecklist` — botão desabilitado ou validação visual.

Mockar `next/navigation` com `vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))`.

**Passo 3: Executar os testes para garantir que falham**

Run: `npx vitest run __tests__/components/pluto/BudgetOverflowModal.test.tsx`
Expected: FAIL — módulo não encontrado.

**Passo 4: Implementar `components/pluto/BudgetOverflowModal.tsx`**

Criar o componente React com state interno `step` (1 | 3 | 4) e `newBudgetValue` (number). Usar o mesmo padrão visual dos modais existentes no projeto (`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4`, `w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg`). Formatação de valores em BRL via `Intl.NumberFormat("pt-BR", ...)`. Etapa 4 (success) renderiza botão "Ir para a página de Orçamento" que usa `router.push("/pluto/budget")` e botão "Continuar no Checklist" que chama `onCancel` (fechamento).

**Passo 5: Executar os testes para garantir que passam**

Run: `npx vitest run __tests__/components/pluto/BudgetOverflowModal.test.tsx`
Expected: PASS.

**Passo 6: Executar suíte completa de regressão**

Run: `npx vitest run`
Expected: PASS — sem regressões.

**Passo 7: Marcar a tarefa como concluída no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-complete 2`

**Passo 8: Commit**

```bash
git add components/pluto/BudgetOverflowModal.tsx __tests__/components/pluto/BudgetOverflowModal.test.tsx
node .agents/scripts/sdd.js commit "feat(03a): criar componente BudgetOverflowModal com stepper de ajuste de orçamento"
```

---

### Tarefa 3: Integrar verificação de estouro no fluxo de criação/edição de itens globais (página de transações)

**Arquivos:**
- Modificar: `app/pluto/transactions/page.tsx`
- Testar: `__tests__/app/pluto/transactions-checklist.test.tsx` (adicionar cenários)

**Interfaces:**
- Consome: `checkGlobalBudgetOverflow(globalItems, budgetItems, categoryId, amount, excludeId?)` de `lib/checklist-budget.ts`
- Consome: `BudgetOverflowModal` de `components/pluto/BudgetOverflowModal.tsx` (props: `isOpen`, `overflowData`, `year`, `month`, `userEmail`, `onConfirm`, `onCancel`)
- Consome: `getGlobalChecklistItems(supabase)` de `lib/pluto/db/checklist.ts`
- Consome: `adjustBudgetItem(supabase, year, month, categoryName, categoryType, amount, email)` de `lib/pluto/db/budget.ts`
- Consome: `createChecklistItem(supabase, input, isGlobal, monthId)` de `lib/pluto/db/checklist.ts`
- Consome: `updateChecklistItem(supabase, id, input, updateGlobal, parentId)` de `lib/pluto/db/checklist.ts`

**Objetivo técnico:** Alterar os handlers `handleAddChecklistItem` e `handleEditChecklistItem` na página de transações para interceptar a gravação de itens globais com `amount` preenchido. Antes de gravar, chamar `checkGlobalBudgetOverflow` com os itens globais da categoria e o orçamento vigente. Se houver estouro, armazenar a operação pendente em state, exibir `BudgetOverflowModal` e aguardar a decisão do usuário. Se o usuário confirmar o ajuste (`onConfirm`), chamar `adjustBudgetItem` para gravar o novo valor no orçamento, depois completar a operação pendente (criar ou editar o item do checklist), atualizar os dados (`fetchData`) e avançar o modal para Etapa 4. Se o usuário cancelar, descartar a operação pendente.

Mudanças na página:
1. Novo state: `globalChecklistItems: ChecklistItem[]` — carregado em `fetchData` via `getGlobalChecklistItems(supabase)`.
2. Novo state: `overflowModalData` (dados do estouro + operação pendente) e `isOverflowModalOpen: boolean`.
3. Em `handleAddChecklistItem`: se `isGlobal && input.amount`, chamar `checkGlobalBudgetOverflow(globalChecklistItems, budgetItems, input.category_id, input.amount)`. Se `isOverflow`, armazenar a operação pendente e abrir o modal em vez de gravar. Se não, gravar normalmente.
4. Em `handleEditChecklistItem`: se `updateGlobal && input.amount alterado`, chamar `checkGlobalBudgetOverflow(globalChecklistItems, budgetItems, input.category_id, input.amount, itemId)`. Mesma lógica de intercepção.
5. Handler `handleOverflowConfirm(newBudgetValue)`: chamar `adjustBudgetItem`, depois executar a operação pendente (create ou update), depois `fetchData`.
6. Handler `handleOverflowCancel`: fechar modal, limpar state pendente.
7. Renderizar `<BudgetOverflowModal>` no JSX da página.

**Passo 1: Executar o início da tarefa no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-start 3`

**Passo 2: Escrever os testes que falham**

Adicionar ao arquivo `__tests__/app/pluto/transactions-checklist.test.tsx` (ou criar um novo `__tests__/app/pluto/transactions-checklist-overflow.test.tsx` se o arquivo existente for muito grande) os seguintes cenários:

1. Criar item global com `amount` que causa estouro: o item NÃO é gravado e o modal de bloqueio aparece.
2. Criar item global sem `amount`: o item é gravado normalmente (sem bloqueio).
3. Criar item global com `amount` dentro do orçamento: o item é gravado normalmente.
4. Editar item global alterando `amount` para causar estouro: modal de bloqueio aparece.
5. Ao confirmar ajuste no modal: `adjustBudgetItem` é chamado com o valor e o item do checklist é gravado.
6. Ao cancelar o modal: operação é descartada e nenhuma chamada de gravação ocorre.

Mockar `@/lib/pluto/db/budget`, `@/lib/pluto/db/checklist`, `@/utils/supabase/client` conforme padrão existente em `transactions-checklist.test.tsx`.

**Passo 3: Executar os testes para garantir que falham**

Run: `npx vitest run __tests__/app/pluto/transactions-checklist-overflow.test.tsx`
Expected: FAIL — lógica de intercepção não implementada.

**Passo 4: Implementar as alterações em `page.tsx`**

Modificar conforme descrito no objetivo técnico acima.

**Passo 5: Executar os testes para garantir que passam**

Run: `npx vitest run __tests__/app/pluto/transactions-checklist-overflow.test.tsx`
Expected: PASS.

**Passo 6: Executar suíte completa de regressão**

Run: `npx vitest run`
Expected: PASS — sem regressões, incluindo os testes existentes em `transactions-checklist.test.tsx`.

**Passo 7: Marcar a tarefa como concluída no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-complete 3`

**Passo 8: Commit**

```bash
git add app/pluto/transactions/page.tsx __tests__/app/pluto/transactions-checklist-overflow.test.tsx
node .agents/scripts/sdd.js commit "feat(03a): integrar bloqueio de estouro no fluxo de criação/edição de itens globais"
```

---

### Tarefa 4: Banner informativo não-bloqueante para itens pontuais no `ChecklistCard`

**Arquivos:**
- Modificar: `components/pluto/ChecklistCard.tsx`
- Modificar: `app/pluto/transactions/page.tsx` (passar `budgetItems` como nova prop)
- Testar: `__tests__/components/pluto/ChecklistCard.test.tsx` (adicionar cenários)

**Interfaces:**
- Consome: `checkMonthBudgetOverflow(monthItems, budgetItems, categoryId)` de `lib/checklist-budget.ts`
- Consome: `BudgetItem` de `lib/pluto/db/budget.ts` (`{ category_id, category_name, amount }`)
- Nova prop no `ChecklistCardProps`:
  ```typescript
  budgetItems: BudgetItem[];
  ```

**Objetivo técnico:** Adicionar ao `ChecklistCard` uma nova prop `budgetItems`. Após a lista de itens renderizada, agrupar os itens por `category_id` e, para cada categoria, usar `checkMonthBudgetOverflow` para detectar estouro. Se houver estouro, renderizar um banner/alerta persistente dentro do card:

> ⚠️ *"Atenção: O total previsto para '[Categoria]' neste mês (R$ X) excede o orçamento planejado (R$ Y)."*

O banner usa classes do tema: `text-amber-700 dark:text-amber-400`, `bg-amber-50 dark:bg-amber-950/30`, `border-amber-200 dark:border-amber-800`. Desaparece automaticamente quando a situação de estouro é resolvida (recalculado a cada render).

Na `page.tsx`, passar `budgetItems={budgetItems}` ao `<ChecklistCard>`.

**Passo 1: Executar o início da tarefa no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-start 4`

**Passo 2: Escrever os testes que falham**

Adicionar a `__tests__/components/pluto/ChecklistCard.test.tsx`:

1. Quando a soma de itens de uma categoria excede o orçamento, renderiza o banner de aviso com o texto correto formatado em BRL.
2. Quando a soma de itens de uma categoria NÃO excede o orçamento, o banner NÃO é renderizado.
3. Quando o orçamento não está definido para uma categoria, o banner NÃO é renderizado.
4. O banner exibe o nome correto da categoria, o total previsto e o orçamento planejado.
5. Múltiplos banners são exibidos se múltiplas categorias estiverem em estouro.

Fornecer os dados de `budgetItems` nos testes como nova prop.

**Passo 3: Executar os testes para garantir que falham**

Run: `npx vitest run __tests__/components/pluto/ChecklistCard.test.tsx`
Expected: FAIL — prop `budgetItems` não existe ainda.

**Passo 4: Implementar as alterações**

1. Em `ChecklistCard.tsx`: adicionar `budgetItems: BudgetItem[]` à interface `ChecklistCardProps`. Importar `checkMonthBudgetOverflow` de `@/lib/checklist-budget` e `BudgetItem` de `@/lib/pluto/db/budget`. Calcular as categorias em estouro e renderizar os banners.
2. Em `page.tsx`: adicionar `budgetItems={budgetItems}` à invocação de `<ChecklistCard>`.

**Passo 5: Executar os testes para garantir que passam**

Run: `npx vitest run __tests__/components/pluto/ChecklistCard.test.tsx`
Expected: PASS.

**Passo 6: Executar suíte completa de regressão**

Run: `npx vitest run`
Expected: PASS — sem regressões.

**Passo 7: Marcar a tarefa como concluída no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-complete 4`

**Passo 8: Commit**

```bash
git add components/pluto/ChecklistCard.tsx app/pluto/transactions/page.tsx __tests__/components/pluto/ChecklistCard.test.tsx
node .agents/scripts/sdd.js commit "feat(03a): adicionar banner informativo de estouro por categoria para itens pontuais"
```

---

### Tarefa 5: Integrar verificação de estouro na edição com mudança de categoria

**Arquivos:**
- Modificar: `app/pluto/transactions/page.tsx`
- Testar: `__tests__/app/pluto/transactions-checklist-overflow.test.tsx` (adicionar cenários)

**Interfaces:**
- Consome: `checkGlobalBudgetOverflow(globalItems, budgetItems, categoryId, amount, excludeId?)` de `lib/checklist-budget.ts`
- Consome: mesmos handlers/componentes da Tarefa 3.

**Objetivo técnico:** Cobrir o caso descrito na spec (Regra 3.1): edição de item global que altera `category_id`. Quando o usuário edita um item global e muda a categoria, a verificação de estouro deve ser feita contra a **nova** categoria. Se o item muda de categoria A para categoria B, o `excludeItemId` não se aplica à categoria B (pois o item nunca fez parte dela), e o `targetAmount` é o novo amount do item. Ajustar `handleEditChecklistItem` para detectar a mudança de `category_id` comparando com o item original e usar os parâmetros corretos na chamada a `checkGlobalBudgetOverflow`.

**Passo 1: Executar o início da tarefa no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-start 5`

**Passo 2: Escrever os testes que falham**

Adicionar a `__tests__/app/pluto/transactions-checklist-overflow.test.tsx`:

1. Editar item global mudando `category_id` para uma categoria onde a soma resultante causa estouro: modal aparece.
2. Editar item global mudando `category_id` para uma categoria onde a soma não causa estouro: gravação normal.
3. Editar item global mudando apenas `category_id` (sem alterar amount): verificação é feita contra nova categoria com o amount existente.

**Passo 3: Executar os testes para garantir que falham**

Run: `npx vitest run __tests__/app/pluto/transactions-checklist-overflow.test.tsx`
Expected: FAIL — lógica de mudança de categoria não implementada.

**Passo 4: Implementar as alterações**

Ajustar o handler `handleEditChecklistItem` para receber ou consultar o item original (via `checklistItems` ou `globalChecklistItems` state), detectar se `input.category_id` difere do original, e chamar `checkGlobalBudgetOverflow` com `targetCategoryId = input.category_id`, `targetAmount = input.amount ?? item.amount`, `excludeItemId = undefined` (quando muda de categoria, o item não precisa ser excluído da nova categoria).

**Passo 5: Executar os testes para garantir que passam**

Run: `npx vitest run __tests__/app/pluto/transactions-checklist-overflow.test.tsx`
Expected: PASS.

**Passo 6: Executar suíte completa de regressão**

Run: `npx vitest run`
Expected: PASS.

**Passo 7: Marcar a tarefa como concluída no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-complete 5`

**Passo 8: Commit**

```bash
git add app/pluto/transactions/page.tsx __tests__/app/pluto/transactions-checklist-overflow.test.tsx
node .agents/scripts/sdd.js commit "feat(03a): verificar estouro ao alterar category_id de item global"
```

---

## Cenários de Teste Manuais de Aceitação

### Cenário 1: Bloqueio ao Incluir Item Global com Estouro

- **Dado** que o orçamento vigente da categoria "Contas" é R$ 500,00 e já existe um item global "Conta de Luz" com R$ 200,00.
- **Quando** o usuário adiciona um novo item global "Conta de Água" com R$ 400,00 na categoria "Contas" (escopo "No modelo global").
- **Então** o sistema exibe o modal de bloqueio com a mensagem: *"Não é possível incluir este item pois o total previsto da categoria **Contas** no checklist (R$ 600,00) ultrapassa o orçamento planejado para o mês (R$ 500,00)."*
- **E** o modal exibe os botões "Ajustar Orçamento" e "Cancelar".

### Cenário 2: Fluxo de Ajuste de Orçamento via Modal

- **Dado** que o modal de bloqueio está exibido (cenário 1).
- **Quando** o usuário clica em "Ajustar Orçamento".
- **Então** o modal avança para a etapa de definição de novo valor, com campo pré-preenchido com R$ 600,00 (soma prevista = sugestão mínima).
- **E** o label informa: *"Ajuste de [Mês Atual]: defina o novo orçamento para Contas."*
- **Quando** o usuário mantém R$ 600,00 (ou digita um valor maior) e clica "Salvar Ajuste e Incluir Item".
- **Então** o sistema grava o ajuste de orçamento e o item do checklist, exibindo tela de sucesso com opções "Ir para a página de Orçamento" e "Continuar no Checklist".

### Cenário 3: Cancelamento em Qualquer Etapa

- **Dado** que o modal de bloqueio está exibido em qualquer etapa (Etapa 1, Etapa 3 ou Etapa 4).
- **Quando** o usuário clica em "Cancelar".
- **Então** o modal fecha, nenhum ajuste de orçamento é gravado e o item do checklist **não é salvo**.

### Cenário 4: Item Pontual com Estouro — Aviso Informativo

- **Dado** que o orçamento vigente da categoria "Mercado" é R$ 800,00 e os itens do mês somam R$ 700,00.
- **Quando** o usuário adiciona um item pontual ("Apenas neste mês") com R$ 200,00 na categoria "Mercado".
- **Então** o item é gravado normalmente (sem bloqueio).
- **E** um banner amarelo aparece no card do checklist: *"Atenção: O total previsto para 'Mercado' neste mês (R$ 900,00) excede o orçamento planejado (R$ 800,00)."*

### Cenário 5: Desaparecimento Automático do Banner

- **Dado** que o banner de estouro está exibido para "Mercado" (R$ 900 > R$ 800).
- **Quando** o usuário exclui um item pontual de R$ 200,00 da categoria "Mercado" (reduzindo para R$ 700,00).
- **Então** o banner de estouro desaparece imediatamente.

### Cenário 6: Edição de Item Global com Mudança de Categoria

- **Dado** que existe um item global "Gás" na categoria "Contas" com R$ 100,00.
- **E** o orçamento da categoria "Serviços" é R$ 150,00, com soma existente de R$ 100,00.
- **Quando** o usuário edita "Gás" mudando a categoria de "Contas" para "Serviços" e mantendo R$ 100,00.
- **Então** o sistema verifica estouro na categoria "Serviços" (soma ficaria R$ 200,00 > R$ 150,00).
- **E** o modal de bloqueio é exibido referenciando a categoria "Serviços".

### Cenário 7: Item Global sem Amount — Sem Verificação

- **Dado** qualquer estado de orçamento/checklist.
- **Quando** o usuário cria um item global sem valor previsto (amount em branco).
- **Então** o item é gravado normalmente, sem verificação de estouro.

### Cenário 8: Ajuste do Mês Já Existente — Reutilização

- **Dado** que já existe um `budget_adjustment` para o mês corrente.
- **Quando** o fluxo de ajuste via modal é executado.
- **Então** o sistema reutiliza o ajuste existente (sem criar duplicata), apenas atualizando o valor da categoria.
