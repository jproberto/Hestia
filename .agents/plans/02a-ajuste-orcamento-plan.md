# Ajuste de Orçamento (Feature 2a - Correção/Patch) Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

Use checkbox (`- [ ]`) para acompanhamento. Marque com o emoji ✅ quando a tarefa estiver concluída.

**Objetivo:** Adaptar o Ajuste de Orçamento para funcionar centrado em "Ajustes/Orçamentos" explícitos em vez de meses de calendário soltos, aplicando a linguagem ubíqua e as regras de editabilidade pelo mês corrente.

**Arquitetura:** 
- Preservar o schema físico do Supabase (`budget_revisions`, `budget_items`) para manter compatibilidade com dados existentes e a Feature 1.
- Refatorar a camada de serviços (`lib/db/budget.ts`) e a interface Next.js para expor nomenclaturas limpas de linguagem ubíqua baseadas em "Ajustes".
- Controlar a navegação e a editabilidade com base na vigência da revisão ativa comparada ao mês atual (calendário real ou mockMonth).

**Tech Stack:** Next.js, Supabase JS client, Vitest, Testing Library.

## Restrições Globais
- Preservar a imutabilidade de meses anteriores ao mês corrente.
- Evitar placeholders no código.
- Seguir convenções de commits frequentes em Português.

---

### Tarefa 1: Refatoração da Camada de Serviços (`lib/db/budget.ts`) e Testes Unitários

**Arquivos:**
- Modificar: `lib/db/budget.ts`
- Testar: `__tests__/lib/db/budget.test.ts`

**Interfaces:**
- Produz: `getBudgetAdjustments(supabase, year)` que retorna todas as revisões cadastradas no ano.
- Produz: `createBudgetAdjustment(supabase, year, month, email)` que cria uma nova revisão física para o mês/ano.
- Produz: `adjustBudgetItem(...)` atualizado e com nomenclaturas de parâmetros semânticas baseadas em Ajustes.

- [ ] **Passo 1: Escrever testes unitários que falham**
  Adicionar em `__tests__/lib/db/budget.test.ts` testes para `getBudgetAdjustments` (garantindo ordenação por mês de início) e `createBudgetAdjustment`.
  Run: `npx vitest run __tests__/lib/db/budget.test.ts`
  Expected: FAIL (funções não existentes).

- [ ] **Passo 2: Implementar serviços em `lib/db/budget.ts`**
  Implementar as novas funções e atualizar as nomenclaturas internas de `revision` para `adjustment` nas variáveis de código locais, mantendo o mapeamento com as tabelas do Supabase.

- [ ] **Passo 3: Executar testes unitários**
  Run: `npx vitest run __tests__/lib/db/budget.test.ts`
  Expected: PASS.

- [ ] **Passo 4: Commit**
  ```bash
  git add lib/db/budget.ts __tests__/lib/db/budget.test.ts
  git commit -m "feat: refatora camada de servicos de orcamentos para nomenclatura de ajustes"
  ```

---

### Tarefa 2: Refatoração da UI (`app/finance/budget/page.tsx`) e Regras de Editabilidade

**Arquivos:**
- Modificar: `app/finance/budget/page.tsx`

**Interfaces:**
- Consome: `getBudgetAdjustments` e `createBudgetAdjustment` do banco.

- [ ] **Passo 1: Ajustar a navegação e carregar dados**
  Substituir o dropdown de 12 meses pelo dropdown dinâmico de Ajustes do ano. Ao abrir a página, carregar o ajuste mais atual.
  Adicionar botão "Criar Novo Ajuste" que chama `createBudgetAdjustment` usando o mês atual/mockMonth e recarrega.

- [ ] **Passo 2: Implementar editabilidade condicional**
  Verificar se o `start_month` do Ajuste selecionado é igual ao mês corrente (calendário ou query parameter `?mockMonth=M`).
  Se for igual, renderizar inputs inline interativos de valores e o botão "Adicionar Previsão".
  Se for diferente, renderizar apenas span de texto plano somente-leitura nas tabelas e ocultar o botão "Adicionar Previsão".

- [ ] **Passo 3: Validar a interface localmente**
  Executar `npm run dev` e checar visualmente que a navegação e regras de edição funcionam no navegador.

- [ ] **Passo 4: Commit**
  ```bash
  git add app/finance/budget/page.tsx
  git commit -m "feat: refatora UI de orcamentos com seletor de ajustes e bloqueio no mes corrente"
  ```

---

### Tarefa 3: Testes de UI Automatizados e Incremento de Versão (Patch)

**Arquivos:**
- Modificar: `__tests__/app/finance/budget-page.test.tsx`
- Modificar: `package.json`

- [ ] **Passo 1: Escrever teste de UI que falham**
  Atualizar os mocks do Next.js e Supabase para retornar a lista de revisões (Ajustes) e reescrever as asserções de navegação de testes baseadas na seleção de ajustes (Outubro aberto para edição / Janeiro somente-leitura com botão "Criar Novo Ajuste").
  Run: `npx vitest run __tests__/app/finance/budget-page.test.tsx`
  Expected: FAIL.

- [ ] **Passo 2: Ajustar asserções e seletores no teste**
  Garantir que os seletores de teste de UI buscam elementos usando as novas estruturas e textos.
  Run: `npx vitest run __tests__/app/finance/budget-page.test.tsx`
  Expected: PASS.

- [ ] **Passo 3: Incrementar a versão patch no package.json**
  Mudar a versão em `package.json` de `"0.3.0"` para `"0.3.1"`.

- [ ] **Passo 4: Validadores locais**
  Executar: `npx eslint .` e `npx tsc --noEmit` e `npx vitest run`.
  Expected: Tudo OK e passando.

- [ ] **Passo 5: Commit**
  ```bash
  git add __tests__/app/finance/budget-page.test.tsx package.json
  git commit -m "feat: atualiza testes de UI para o fluxo de ajustes e bump patch version 0.3.1"
  ```

---

### Tarefa 4: Refatoração Física das Tabelas do Supabase no Código Next.js

**Arquivos:**
- Modificar: `lib/db/budget.ts`
- Modificar: `app/finance/budget/page.tsx`
- Modificar: `__tests__/lib/db/budget.test.ts`
- Modificar: `__tests__/app/finance/budget-page.test.tsx`

**Lógica:**
- Modificar todas as chamadas de `.from("budget_revisions")` para `.from("budget_adjustments")`.
- Modificar referências de `revision_id` para `adjustment_id` na tabela `budget_items` em todas as queries e interfaces locais do código.

- [ ] **Passo 1: Aplicar a migração SQL localmente**
  Executar o script SQL criado no Dashboard do Supabase.

- [ ] **Passo 2: Atualizar o código em `lib/db/budget.ts`**
  Substituir todas as ocorrências de `.from("budget_revisions")` por `.from("budget_adjustments")` e a chave estrangeira `revision_id` por `adjustment_id`.

- [ ] **Passo 3: Atualizar as queries no front-end (`app/finance/budget/page.tsx`)**
  Garantir que as chamadas ao Supabase usam as tabelas e campos corretos.

- [ ] **Passo 4: Atualizar os arquivos de testes de unidade e UI**
  Substituir os mocks das tabelas antigas em `budget.test.ts` e `budget-page.test.tsx` para usar `budget_adjustments` e `adjustment_id`.

- [ ] **Passo 5: Validar a aplicação**
  Rodar testes locais: `npm run test` e checar linting/compilação.
  Expected: Tudo PASS.

- [ ] **Passo 6: Commit**
  ```bash
  git add lib/db/budget.ts app/finance/budget/page.tsx __tests__/
  git commit -m "feat: refatora nomenclatura de tabelas fisicas no banco de dados e codigo Next.js"
  ```

---

## Cenários de Teste Manuais de Aceitação

### Cenário 1: Visualização do Ajuste Mais Atual e Bloqueio Histórico
*   **Dado** que o mês atual do calendário real (ou `?mockMonth=10`) é Outubro.
*   **E** que existem cadastrados o "Orçamento Inicial" (Janeiro/mês 1) e o "Ajuste de Agosto" (mês 8).
*   **Quando** acesso `/finance/budget`.
*   **Então** a página carrega e seleciona por padrão o "Ajuste de Agosto" (por ser o mais atual do ano).
*   **E** a tabela exibe os valores orçados vigentes herdados.
*   **E** como a vigência do Ajuste selecionado (mês 8) é diferente do mês corrente (mês 10), toda a tabela de valores fica em modo somente-leitura.
*   **E** o botão *"Criar Novo Ajuste"* (para Outubro) é exibido no topo.

### Cenário 2: Criação de Novo Ajuste e Edição
*   **Dado** que estou visualizando o "Ajuste de Agosto" (somente-leitura) em Outubro (mês corrente 10).
*   **Quando** clico no botão *"Criar Novo Ajuste"*.
*   **Então** o sistema cria o ajuste de Outubro no Supabase, recarrega a página selecionando "Ajuste de Outubro" no dropdown.
*   **E** a tabela fica editável inline (o cursor vira pointer sobre as células).
*   **E** o botão *"Adicionar Previsão"* é exibido.
*   **Quando** altero um valor planejado clicando na célula e teclando Enter.
*   **Então** a célula exibe opacidade temporária e salva com sucesso sem recarregar/piscar a página.

### Cenário 3: Zerar e Ocultar Categoria
*   **Dado** que estou visualizando o "Ajuste de Outubro" (mês corrente 10 e editável).
*   **Quando** clico na célula de valor de uma despesa (ex: "Transporte" = `R$ 400.00`).
*   **E** altero o valor para `0` e pressiono Enter.
*   **Então** a categoria "Transporte" desaparece por completo da tabela de despesas de Outubro.
*   **E** ao selecionar um ajuste passado (ex: "Orçamento Inicial"), a categoria continua aparecendo com seu valor planejado original de `R$ 400.00` (preservando o histórico).
