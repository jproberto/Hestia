# Ajuste de Orçamento Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

Use checkbox (`- [ ]`) para acompanhamento. Marque com o emoji ✅ quando a tarefa estiver concluída.

**Objetivo:** Permitir aos usuários revisar e ajustar os limites mensais previstos por categoria, preservando o histórico de meses anteriores através do controle de revisões e vigências mensais do banco de dados, com navegação e edição inline fluida.

**Arquitetura:** Criaremos a função `adjustBudgetItem` no backend para gerenciar a criação automática de revisões sob demanda e fazer o upsert do item. No frontend, a página de orçamento `/finance/budget` receberá um dropdown compacto de seleção de mês, exibirá os valores vigentes desse mês e trará suporte a edição inline direta na célula de valor (clique para editar, salva no Blur ou Enter), com bloqueio de meses anteriores ao mês aberto real (ou simulado via `?mockMonth=M` em ambiente de desenvolvimento).

**Tech Stack:** Next.js (App Router), Supabase JS Client, React, TypeScript, Vitest.

## Restrições Globais
*   **Vigência**: O ajuste de orçamento em um mês $M$ deve valer a partir dele em diante, sem afetar o histórico de meses $1$ a $M-1$.
*   **Segurança**: O commit de código deve passar pelo CLI do SDD para garantir segurança e validação de idioma.
*   **Prerequisito**: Não é permitido criar ajustes em meses $M > 1$ se o orçamento inicial (Janeiro, `start_month = 1`) do ano consultado não tiver sido inicializado.
*   **Mês Aberto**: A edição só é liberada no mês ativo (aberto) e meses futuros. Meses passados são somente-leitura.

---

### Tarefa 1: Desenvolver e Testar a Lógica do Serviço de Ajustes no Banco de Dados

**Arquivos:**
- Modificar: `lib/db/budget.ts`
- Testar: `__tests__/lib/db/budget.test.ts`

**Interfaces:**
- Produz: a nova função `adjustBudgetItem` com a seguinte assinatura:
```typescript
export async function adjustBudgetItem(
  supabase: SupabaseClient,
  year: number,
  month: number,
  categoryName: string,
  categoryType: "receita" | "despesa",
  amount: number,
  email: string
): Promise<void>
```

- [ ] **Passo 1: Escreva os testes que falham**
  Edite `__tests__/lib/db/budget.test.ts` e adicione os seguintes testes no bloco `describe("Serviço de Orçamento")`:
  ```typescript
  describe("adjustBudgetItem", () => {
    it("deve criar uma nova revisão e inserir o item se a revisão para o mês não existir", async () => {
      // Mock do Supabase simulando que maybeSingle() retorna null para a revisão do mês
      // Simular insert da revisão retornando id 'new-rev-123'
      // Simular upsert do budget_item retornando sucesso
    });

    it("deve usar a revisão existente e apenas fazer upsert do item se a revisão do mês já existir", async () => {
      // Mock do Supabase simulando que maybeSingle() retorna { id: 'existing-rev-123' }
      // Simular apenas upsert do budget_item retornando sucesso (sem chamar insert de revisão)
    });
  });
  ```

- [ ] **Passo 2: Execute o teste para garantir que ele falha**
  Run: `npx vitest run`
  Expected: FAIL (porque a função `adjustBudgetItem` não está exportada/definida em `lib/db/budget.ts`)

- [ ] **Passo 3: Escreva a implementação mínima**
  Edite `lib/db/budget.ts` para exportar a função `adjustBudgetItem`:
  ```typescript
  export async function adjustBudgetItem(
    supabase: SupabaseClient,
    year: number,
    month: number,
    categoryName: string,
    categoryType: "receita" | "despesa",
    amount: number,
    email: string
  ): Promise<void> {
    const categoryId = await getOrCreateCategory(supabase, categoryName, categoryType, email);

    // 1. Verificar se a revisão existe para o ano e o mês
    let { data: revision, error: selectError } = await supabase
      .from("budget_revisions")
      .select("id")
      .eq("year", year)
      .eq("start_month", month)
      .maybeSingle();

    if (selectError) throw selectError;

    let revisionId = revision?.id;

    // 2. Criar a revisão se não existir
    if (!revisionId) {
      const { data: newRev, error: insertError } = await supabase
        .from("budget_revisions")
        .insert({
          year,
          start_month: month,
          description: `Ajuste de Orçamento - ${month}/${year}`,
          created_by: email
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      revisionId = newRev.id;
    }

    // 3. Fazer upsert no budget_items
    const { error: upsertError } = await supabase
      .from("budget_items")
      .upsert({
        revision_id: revisionId,
        category_id: categoryId,
        amount,
        created_by: email
      }, { onConflict: "revision_id,category_id" });

    if (upsertError) throw upsertError;
  }
  ```

- [ ] **Passo 4: Execute o teste para garantir que ele passa**
  Run: `npm run test`
  Expected: PASS

- [ ] **Passo 5: Commit local usando o SDD CLI**
  Antes de commitar, execute a conclusão da tarefa no CLI:
  Run: `node .agents/scripts/sdd.js task-complete 1`
  Run: `git add lib/db/budget.ts __tests__/lib/db/budget.test.ts`
  Run: `node .agents/scripts/sdd.js commit "feat: adiciona servico adjustBudgetItem com testes"`

---

### Tarefa 2: Atualizar a Interface do Orçamento e Incremento de Versão

**Arquivos:**
- Modificar: `app/finance/budget/page.tsx`
- Modificar: `package.json`

**Interfaces:**
- Consome: a nova função `adjustBudgetItem` do arquivo `lib/db/budget.ts`.

- [ ] **Passo 1: Preparar as modificações na interface do usuário**
  Modifique `app/finance/budget/page.tsx` para:
  1. Adicionar um estado para o mês selecionado (`month`, padrão é o mês atual: `new Date().getMonth() + 1`).
  2. Adicionar um dropdown de mês no topo (Janeiro a Dezembro) posicionado ao lado do dropdown de Ano.
  3. No `loadData`, buscar os itens do orçamento relativos ao mês selecionado:
     - `const items = await getBudgets(supabase, year, month);` (passar o mês dinâmico em vez do fixo 1).
     - Continuar buscando a revisão de Janeiro para saber se o orçamento do ano foi inicializado. Se `start_month = 1` não existir para o ano, a interface deve exibir a mensagem orientando a inicializar o orçamento.
  4. Determinar se o mês selecionado é editável (mês ativo ou futuro). Em desenvolvimento (`process.env.NODE_ENV === 'development'`), ler o query parameter `mockMonth` se presente para definir qual é o mês aberto.
     ```typescript
     // Fallback de mês aberto e leitura de mockMonth em desenvolvimento
     const getOpenMonth = () => {
       if (process.env.NODE_ENV === 'development') {
         const urlParams = new URLSearchParams(window.location.search);
         const mockMonthParam = urlParams.get("mockMonth");
         if (mockMonthParam) {
           const parsed = parseInt(mockMonthParam, 10);
           if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
             return parsed;
           }
         }
       }
       return new Date().getMonth() + 1;
     };
     const openMonth = getOpenMonth();
     const isEditable = month >= openMonth;
     ```
  5. Filtrar os orçamentos de receitas e despesas na listagem para ocultar aqueles com `amount === 0`:
     ```typescript
     const revenues = budgets.filter((b) => b.category_type === "receita" && b.amount > 0);
     const expenses = budgets.filter((b) => b.category_type === "despesa" && b.amount > 0);
     ```
  6. Implementar a edição inline direta na célula de valor na tabela:
     - Criar estados de controle de edição: `editingCategoryId` (string | null), `tempAmount` (string) e `savingCategoryId` (string | null).
     - Na célula do valor de cada categoria, se `isEditable` for verdadeiro, ao clicar, exibe um input numérico com foco automático (`autoFocus`).
     - Ao pressionar `Enter` ou no `onBlur` do input, disparar o salvamento:
       - Definir `savingCategoryId` para o ID da categoria correspondente (para desabilitar temporariamente o campo ou exibir feedback de processamento).
       - Chamar `adjustBudgetItem` passando o `month` atual selecionado:
         ```typescript
         await adjustBudgetItem(
           supabase,
           year,
           month, // mês ativo selecionado
           categoryName,
           categoryType,
           parseFloat(tempAmount) || 0,
           userEmail
         );
         ```
       - Após o salvamento, redefinir estados de edição e recarregar os dados via `loadData()`.
     - Se `isEditable` for falso, a célula permanece como texto e não reage a cliques (modo leitura).
  7. Atualizar a submissão do formulário global de "Adicionar Previsão" para chamar a nova função `adjustBudgetItem` passando o mês selecionado.

- [ ] **Passo 2: Validar visualmente a interface e linter**
  Execute: `npx eslint .` e `npx tsc --noEmit`
  Expected: Sem erros de digitação, compilação ou linter.

- [ ] **Passo 3: Atualizar versão no package.json**
  Modifique o arquivo `package.json` atualizando o campo `"version"` de `"0.2.0"` para `"0.3.0"`.

- [ ] **Passo 4: Concluir e Commitar a Tarefa 2**
  Execute a conclusão no SDD CLI e crie o commit correspondente:
  Run: `node .agents/scripts/sdd.js task-complete 2`
  Run: `git add app/finance/budget/page.tsx package.json`
  Run: `node .agents/scripts/sdd.js commit "feat: adiciona seletor de mes na UI de orcamento e edicao inline direta nas celulas"`
