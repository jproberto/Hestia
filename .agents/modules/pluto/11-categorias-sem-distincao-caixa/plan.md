# Plano de Implementação — Pluto 11: Categorias e Contas sem Distinção de Caixa e Acentos

> Para Zeus: delegar via hefesto/minos task por task

**Feature:** `pluto/11-categorias-sem-distincao-caixa` (item 11 do backlog do Pluto)
**Módulo:** Pluto (Finanças Familiares)
**Spec de referência:** `.agents/modules/pluto/11-categorias-sem-distincao-caixa/spec.md` (aprovada — checkpoint 1, 2026-11-07)
**Branch:** `feature/pluto/11-categorias-sem-distincao-caixa`
**Data:** 2026-11-07
**Agente:** Atena (Planejamento — Olympus)

**Objetivo:** a identidade de `categories` e de `financial_accounts` passa a ser **(nome normalizado, tipo)** — normalização que ignora caixa, acentos e a forma Unicode do texto digitado/colado — com retry de corrida no salvamento, fusão única das duplicatas legadas + troca das travas na migração 0019 e interface alinhada (sugestões casando com a regra, cópia da grafia homônima no blur), sem aviso novo e sem reescrita de nomes.

**Arquitetura:** uma regra pura única (`normalizeName` em `lib/pluto/utils.ts`) alimenta repositórios, fakes, hooks e componentes; a busca de identidade no repositório real passa a varrer as linhas do tipo pedido e comparar pelo nome normalizado (o `IDatabaseClient` não expõe filtro funcional), com re-leitura após falha de insert na corrida; a migração 0019 (arquivo único, transação tudo ou nada) funde duplicatas reapontando os quatro ponteiros e só então troca as travas de nome pelas travas de (nome normalizado, tipo) nas duas tabelas.

**Tech Stack:** Next.js 16 + React 18, Vitest 2 (unit + `vitest.integration.config.ts` no CI), Supabase (adapter único em `lib/shared`), Storybook (build como gate de props).

---

## Restrições Globais (valores exatos da spec — não redecidir)

1. **Nome salvo é o texto cru digitado** (D2/R3): nenhum filtro de Camel Case, nenhuma renomeação de legado fora da fusão (sobrevive a grafia da vencedora).
2. **Identidade = (nome normalizado, tipo)** (D4/D17/D19): comparação e consolidação só entre linhas do mesmo tipo; homônimas de tipos diferentes são linhas distintas e permitidas.
3. **Normalização = caixa + acentos ignorados + mesma forma Unicode** (D8/R1): "Alimentação" = "alimentação" = "ALIMENTAÇÃO"; é composto = é decomposto; trim das pontas mantido.
4. **Corrida: relê e devolve a já criada, sem erro visível** (D12/R4) — regra única para categorias e contas.
5. **Sem aviso novo embaixo de campo e sem aviso de homônima** (D5/D13); cópia da grafia homônima do outro tipo **no blur** (D6/R7).
6. **Migração única `0019`**: fundição ANTES da troca de trava (D11), transação tudo ou nada e re-executável (D16), unaccent tentado e **falha alta** se indisponível — **sem plano B previsto** (D15). **EMENDA 2026-11-11 (aprovada pelo humano, review CRITICAL):** como `unaccent(text)` é `STABLE` e o PostgreSQL exige `IMMUTABLE` em expressão de índice, a 0019 cria **dentro da própria transação** um wrapper `IMMUTABLE` da normalização (trim → caixa → remoção de marcas) usado pelas expressões dos índices únicos — função nova na migração, sem alterar função existente (premissa 14 preservada).
7. **Exclusão de verdade da perdedora** depois de reapontar tudo (D9); em colisão de `budget_items` prevalece a linha da sobrevivente (D3/R9); checklist entra no reapontamento (D18).
8. **YAGNI (spec seção 7):** sem coluna nova/soft delete, sem tela nova, sem sugestão de contas, sem mudança de cálculos/relatórios/RLS, sem renomeação em massa.
9. **Gates do Olympus:** RED de contrato/contenido por Minos antes do GREEN de Hefesto; suíte verde com `failed == 0` e cobertura **≥ 80%**; `npx tsc --noEmit` e `npx eslint .` limpos; build do Storybook verde; nenhum código antes de `approvals.plan === "approved"`.
10. **Proibido** criar `use-cases/`, `schemas/`, `mappers.ts`, `services/` ou factories `createXService`; proibido importar `@supabase/*` fora de `lib/shared/`.

---

## Mapeamento Schema → Código

| Tabela | Coluna | Migração | Repositório | Hook | Componente |
|---|---|---|---|---|---|
| `public.categories` | `name`, `type` (identidade nova: nome normalizado + tipo; fusão das duplicatas + troca da trava de nome única global) | `utils/migrations/migration-0019-pluto-categorias-contas-normalizadas.sql` | `lib/pluto/repositories/categories.ts` — `getOrCreateCategory` busca normalizada filtrando por tipo + retry de corrida | `lib/pluto/hooks/useTransactionForm.ts` (salva via `lib/pluto/db/categories.ts` + blur), `lib/pluto/hooks/useBudgetItemEditor.ts` (sugestões + blur; salva via `adjustBudgetItem` → `getOrCreateCategory`) | `components/pluto/TransactionModal.tsx` (datalist pré-filtrado + `onCategoryBlur`), `components/pluto/BudgetForecastForm.tsx` (`onCategoryBlur`) |
| `public.financial_accounts` | `name`, `type` (mesma identidade nova; fusão + troca da trava) | mesma migração 0019 | `lib/pluto/repositories/accounts.ts` — `getOrCreateAccount` com o mesmo padrão (busca por tipo normalizado + retry) | `lib/pluto/hooks/useTransactionForm.ts` e `lib/pluto/hooks/useAccountForm.ts` (salvam via `lib/pluto/db/accounts.ts`) — **EMENDA 2026-11-11 (aprovada pelo humano): os call sites passam a enviar o tipo da conta coerente** — edição resolve por `account_id`, select sincroniza nome+tipo, prefill do checklist reseta o tipo | `components/pluto/TransactionModal.tsx` — select de conta ganha value discriminador por `account_id` (EMENDA 2026-11-11; formato geral inalterado — select quando há contas, texto livre quando não há; sem lista de sugestão, premissa 12) |
| `public.transactions` | `category_id`, `account_id` (reapontamento para a sobrevivente; FK `ON DELETE RESTRICT`) | migração 0019 (fusão) | indireto — nenhuma mudança de código | — | — |
| `public.budget_items` | `category_id` (reapontamento; colisão com `unique_adjustment_category` mantém a linha da sobrevivente) | migração 0019 (fusão) | indireto — `lib/pluto/repositories/budget.ts` continua chamando `getOrCreateCategory` | — | — |
| `public.checklist_items` | `category_id` (terceiro ponteiro, `ON DELETE RESTRICT`, sem trava de unicidade — D18) | migração 0019 (fusão) | indireto | — | `components/pluto/ChecklistItemFormModal.tsx` — **inalterado** (só seleciona por id, R11) |

Consequência derivada (sem decisão nova): `lib/pluto/hooks/useBudgetComparison.ts` e `lib/pluto/hooks/useAccountAggregation.ts` usam `toLowerCase()` como chave de agrupamento de **cálculo/relatório** — permanecem intactos pelo YAGNI 10 da spec ("sem mudança de cálculos, telas, relatórios").

---

## Contratos Completos

### Regra pura — `lib/pluto/utils.ts` (novo export; casa única da regra no cliente)

- **`normalizeName(text: string): string`** — comportamento: remove espaços das pontas (trim), iguala a forma Unicode do texto (composto e decomposto resultam no mesmo valor), remove os acentos (marcas combinantes) e reduz à caixa minúscula. É a única definição de "mesmo nome" no código cliente (repositórios, fakes, hooks, componentes). O texto **salvo** nunca passa por ela (D2).
- Nenhum tipo novo em `lib/pluto/types.ts` — `CategoryRow`, `Category`, `AccountRow`, `Account` permanecem como estão (nenhuma coluna nova, D9).

### Repositório real — `lib/pluto/repositories/categories.ts` (persistência e regra, nunca `@supabase/*`)

- **`getOrCreateCategory(db, name, type, email): Promise<string>`** — assinatura inalterada. Passos novos:
  1. Lê as linhas de `categories` com `type` igual ao informado (reutiliza a leitura de `getCategories(db, type)` ou consulta equivalente) e procura a linha cujo `name` tenha o mesmo `normalizeName` do nome de entrada.
  2. Encontrou → devolve o `id` da linha existente (sem inserir).
  3. Não encontrou → insere com o **texto cru** (`name` de entrada já com trim, como hoje) e o `type` informado.
  4. **Corrida (D12):** se o insert falhar, relê pelo mesmo critério (tipo + nome normalizado); se a linha já existir, devolve o `id` dela — sem lançar erro. Se a re-leitura também não encontrar a linha, propaga o erro original do insert (falha real não pode virar sucesso silencioso).
  5. **Erro de leitura** propaga (lança) — não cai no insert às cegas (alinhamento com o comportamento já existente em `categories.ts` linha 29; ver Decisões Técnicas DT-5).
- **`getCategories(db, type?)`** — inalterado (trim/nome cru/ordenação por nome).
- O filtro `.eq("name", ...)` deixa de existir (ver Código Legado).

### Repositório real — `lib/pluto/repositories/accounts.ts` (mesmo padrão — D14/D17)

- **`getOrCreateAccount(db, name, email, accountType = "conta"): Promise<string>`** — assinatura inalterada; mesmos 5 passos acima com `financial_accounts` e `type` ∈ {`conta`, `cartao`} (hoje não filtra tipo — premissa 8). Erro de leitura passa a propagar (hoje `if (!error && data)` seguia para o insert em caso de erro — DT-5).
- **`getAccounts(db)`** — inalterado.

### Fakes — espelho obrigatório da regra completa

- **`lib/pluto/repositories/fakes/fakeCategoryRepository.ts`** — `getOrCreateCategory` compara por `normalizeName` + `type` (hoje só `toLowerCase` + tipo, linha 47); grava o nome cru.
- **`lib/pluto/repositories/fakes/fakeAccountRepository.ts`** — `getOrCreateAccount` passa a comparar por `normalizeName` **e por `accountType`** (hoje só `toLowerCase` sem tipo, linha 40).
- **`lib/pluto/repositories/fakes/fakeBudgetRepository.ts`** — o bloco interno de `adjustBudgetItem` que procura/cria categoria por `name.toLowerCase()` (linha 201) passa a usar `normalizeName` — é uma cópia local da mesma regra e precisa espelhá-la (derivado de R1/D14; o repositório real `budget.ts` já delega a `getOrCreateCategory`, que herda a regra nova).
- Interfaces em `lib/pluto/repositories/interfaces.ts` — **nenhuma assinatura muda** (`getOrCreateCategory(name, type, email)`, `getOrCreateAccount(name, email, accountType)` continuam retornando `Promise<string>`).

### Hooks

- **`lib/pluto/hooks/useTransactionForm.ts`** — novo handler exposto no retorno: **`handleCategoryBlur: () => void`**. Comportamento (R7): com `categoryInput` não vazio, procura em `categories` (chegam todas as duas tipos via `usePlutoData`, premissa 10) uma linha cujo `type` seja **diferente** do `type` atual do formulário e cujo `name` tenha o mesmo `normalizeName` do digitado; se achar, `setCategoryInput` com a grafia exata da linha existente (só quando difere da atual). Sem achar: nada muda. Sem aviso, sem estado novo de mensagem — a interface do hook ganha apenas `handleCategoryBlur`.
- **`lib/pluto/hooks/useTransactionModals.ts`** — expõe `handleCategoryBlur` do `txForm` no retorno (a página repassa ao modal), como já faz com `categoryInput`.
- **`lib/pluto/hooks/useBudgetItemEditor.ts`** —
  - `suggestions`: mantém o filtro por `c.type === categoryType`; a **inclusão** passa a ser `normalizeName(c.name)` contém `normalizeName(categoryName)` (hoje `toLowerCase().includes`, linha 64); a **exclusão** permanece exatamente a atual (`c.name.toLowerCase() !== categoryName.toLowerCase()`, linha 65) — edge 13 da spec: "mantida a exclusão atual do nome já digitado exatamente".
  - Novo **`handleCategoryBlur: () => void`** com a mesma regra R7, usando `categoryType` como tipo atual.
  - Demais retorno/handlers intactos (`handleSaveItem` continua chamando `adjustBudgetItem`, que herda a regra nova por `getOrCreateCategory`).
- **`lib/pluto/hooks/usePlutoData.ts`**, **`useCategories.ts`**, **`useBudgetOverview.ts`** — nenhuma mudança (já carregam as categorias sem filtro de tipo, premissas 10 e orçamento).

### Componentes e páginas

- **`components/pluto/TransactionModal.tsx`** —
  - `TransactionModalProps` ganha **`onCategoryBlur: () => void`**; o `Input` do campo Categoria ganha `onBlur={onCategoryBlur}`. Nenhum aviso/elemento novo é renderizado.
  - A `datalist` `categories-list` passa a renderizar só as opções cujo `name` tem `normalizeName` contido no `normalizeName(categoryInput)`; com `categoryInput` vazio, renderiza a lista completa (comportamento atual). O `value` de cada `<option>` continua sendo o nome **original** (escolher preenche a grafia existente — edge 12).
- **`components/pluto/BudgetForecastForm.tsx`** — `BudgetForecastFormProps` ganha **`onCategoryBlur: () => void`**; o input de Categoria ganha `onBlur`. Nada mais muda (a lista de sugestões continua vinda do hook, com `onPickSuggestion` preenchendo o nome original).
- **`components/pluto/TransactionModal.stories.tsx`** — args ganham `onCategoryBlur` (função vazia), sem mudança visual.
- **`app/pluto/transactions/page.tsx`** — repassa `onCategoryBlur={modals.handleCategoryBlur}` ao `TransactionModal`.
- **`app/pluto/budget/page.tsx`** — repassa `onCategoryBlur={editor.handleCategoryBlur}` ao `BudgetForecastForm`.
- **Intocados por decisão:** `components/pluto/ChecklistItemFormModal.tsx` (R11), `components/pluto/AccountModal.tsx` + `lib/pluto/hooks/useAccountForm.ts` (sem sugestão/blur de contas — a normalização chega a eles pela regra do repositório), `lib/pluto/db/*` (barrels `export *` absorvem sem mudança). **EMENDA 2026-11-11 (aprovada pelo humano):** o campo de conta do `TransactionModal` deixa de ser intocado no que toca à sincronia de tipo (value por `account_id` + `handleAccountInputChange` no form) — o restante do formato (select/texto livre, sem sugestão) permanece.

### Testes — mapa completo (espelhando `app|components|lib`)

| Camada | Arquivo | Papel |
|---|---|---|
| regra pura | `__tests__/lib/pluto/utils.test.ts` (novo) | casos de `normalizeName`: caixa, acento, composto/decomposto, trim, caixa+acento juntos |
| contratos | `__tests__/lib/pluto/repositories/contract-categories.test.ts` | novos casos: caixa+acento mesmo tipo → mesmo id; é composto/decomposto → mesmo id; nome igual tipo diferente → id novo; "alimentacao"/"ALIMENTAÇÃO" → id de "Alimentação" |
| contratos | `__tests__/lib/pluto/repositories/contract-accounts.test.ts` | novos casos: caixa+acento mesmo tipo → mesmo id; nome igual `conta` vs `cartao` → ids distintos |
| repositório real (stub de `IDatabaseClient`, padrão de `__tests__/lib/pluto/db/checklist-create.test.ts`) | `__tests__/lib/pluto/repositories/categories.test.ts` (novo), `__tests__/lib/pluto/repositories/accounts.test.ts` (novo) | busca normalizada filtrando tipo; **corrida**: insert falha → re-leitura devolve o id já criado sem lançar; insert falha e re-leitura vazia → propaga o erro original; erro de leitura propaga |
| fakes | `__tests__/lib/pluto/repositories/fake-category.test.ts`, `fake-account.test.ts` | mantêm os casos de caixa atuais (linhas 69–70 e 57–58) e ganham acento, Unicode e tipo; `__tests__/lib/pluto/db/categories.test.ts` e `db/accounts.test.ts` ganham o caso espelho |
| fake de orçamento | `__tests__/lib/pluto/repositories/fake-budget.test.ts` | caso `adjustBudgetItem` com variante de acento reaproveita a categoria existente |
| hooks | `__tests__/lib/pluto/hooks/useTransactionForm.test.ts` | blur copia grafia homônima do outro tipo; não copia do mesmo tipo; entrada vazia não muda nada |
| hooks | `__tests__/lib/pluto/hooks/useTransactionModals.test.ts` | `handleCategoryBlur` exposto e repassado |
| hooks | `__tests__/lib/pluto/hooks/useBudgetItemEditor.test.ts` | sugestões casam por acento/caixa; exclusão atual preservada; blur com homônima do outro tipo |
| componentes | `__tests__/components/pluto/TransactionModal.test.tsx` | datalist renderiza "Alimentação" com entrada "alimentacao" (e a lista completa com entrada vazia); `onBlur` chama `onCategoryBlur`; nenhum aviso novo |
| componentes | `__tests__/components/pluto/BudgetForecastForm.test.tsx` | input chama `onCategoryBlur` no blur; nenhuma mudança visual |
| migração | `__tests__/lib/pluto/migration-0019.test.ts` (novo) | RED de conteúdo da 0019 no padrão exato de `__tests__/lib/pluto/migration-0018.test.ts` |
| integração (só CI) | `__tests__/integration/unique-normalized.test.ts` (novo) | trava real: insert bruto de variante no mesmo tipo é rejeitado; mesma grafia em tipos diferentes é aceita |

---

## Data Flow

**Salvar lançamento:** `TransactionModal` → `useTransactionForm.handleSaveTransaction` → `lib/pluto/db/accounts.getOrCreateAccount` + `lib/pluto/db/categories.getOrCreateCategory` → repositório: leitura por tipo → comparação por `normalizeName` → insert do texto corrido (ou devolve a existente) → em falha de insert, re-leitura e devolve a já criada → `createTransaction`/`updateTransaction` com o id retornado. Erro real cai no `catch` atual (`setErrorMsg(parseErrorMessage(err))`) — tratamento de rede inalterado (edge 15).

**Sugestão no lançamento:** `usePlutoData` carrega `categories` (sem filtro de tipo) → página repassa ao `TransactionModal` → datalist pré-filtra por `normalizeName` contra `categoryInput` → usuário escolhe → `onCategoryInputChange` preenche a grafia original.

**Blur no lançamento:** campo perde foco → `onCategoryBlur` → `useTransactionForm.handleCategoryBlur` → homônima do **outro tipo** sob `normalizeName` → `setCategoryInput(grafia existente)`; sem homônima, nada (sem aviso, sem bloqueio).

**Orçamento:** `useBudgetOverview` carrega categorias (ambos os tipos) → `useBudgetItemEditor.suggestions` filtra por tipo + inclusão normalizada (exclusão atual preservada) → `BudgetForecastForm` renderiza; blur → `handleCategoryBlur`; salvar → `adjustBudgetItem` → `getOrCreateCategory` (mesma regra do repositório).

**Migração (execução única, manual, no Supabase):** 0019 abre transação → tenta habilitar a função de acento (indisponível → erro claro, nada aplicado) → para cada grupo de linhas do mesmo tipo com mesmo nome normalizado escolhe a sobrevivente (maior contagem de apontadores nas três tabelas; empate → menor `created_at`) → reaponta `transactions.category_id`, `budget_items.category_id` (descartando linhas colidentes da perdedora — prevalece a sobrevivente), `checklist_items.category_id` e `transactions.account_id` → exclui as perdedoras → substitui as travas de nome único pelas travas de (nome normalizado, tipo) nas duas tabelas → registra a auditoria → commit. Qualquer falha desfaz tudo (D16).

---

## Migrações

**Número reservado pela Atena:** `0019` (já registrado no `context.json` desta feature e no AGENTS.md; próximo inteiro livre após ela: `0020`).

**Arquivo:** `utils/migrations/migration-0019-pluto-categorias-contas-normalizadas.sql` — nome único, kebab-case, sem sufixo de versão; criado por Hefesto conforme esta seção. Vínculo com a feature-mãe: `spec_id` = `pluto-11`, `spec_name` = `Categorias e Contas sem Distinção de Caixa e Acentos`.

**Tipo:** migração DDL incremental de **fusão de dados + troca de trava** em `public.categories` e `public.financial_accounts`. Nenhuma tabela ou coluna nova; nenhum nome reescrito — só ponteiros mudam de destino e linhas perdedoras são excluídas. Diferente da 0018 (aditiva, sem transação), esta migração **abre transação própria e só confirma no final** (D16).

**Ordem obrigatória dentro da transação (D11/R10):**

1. **Pré-requisito de acento (D15):** tenta habilitar a função de remover acento no banco; se indisponível, aborta com erro claro antes de qualquer mudança — nada é aplicado e o humano decide o plano B na hora (nenhum plano B previsto nesta spec). A normalização das travas usa essa função combinada à normalização Unicode e à caixa minúscula, na mesma semântica de `normalizeName` no cliente.
2. **Fusão de `categories`:** identifica grupos por (nome normalizado, tipo); escolhe a sobrevivente pela maior contagem de linhas que apontam para ela em `transactions.category_id` + `budget_items.category_id` + `checklist_items.category_id`, com desempate pelo menor `created_at`; reaponta os três ponteiros para a sobrevivente — em `budget_items`, linhas da perdedora que colidirem com a trava de (ajuste, categoria) da sobrevivente são **descartadas** (a linha da sobrevivente permanece com o valor que já tinha; nada é somado); só então **exclui as perdedoras** (exclusão de verdade, D9 — o `DELETE` só passa depois do reapontamento porque as três FKs são `ON DELETE RESTRICT`). Nenhum campo além do ponteiro é alterado (R9).
3. **Fusão de `financial_accounts`:** mesmo critério de sobrevivência sobre a contagem de `transactions.account_id` (único referenciador), reaponta `transactions.account_id` e exclui as perdedoras.
4. **Troca das travas (D10/D19/R5):** nas duas tabelas, remove a trava de unicidade de `name` (trava implícita de coluna única, nome padrão do Postgres `categories_name_key` e `financial_accounts_name_key` — Hefesto confirma os nomes no catálogo antes de executar) e cria a trava de **(nome normalizado, tipo)** como índice único sobre a expressão de normalização + `type` (mecanismo do Postgres para chave com expressão — `ADD CONSTRAINT UNIQUE` aceita só colunas). Passa a ser impossível gravar duas linhas do mesmo tipo com mesmo nome normalizado e a passar a ser possível a mesma grafia em tipos diferentes, nas duas tabelas.
5. **Auditoria (regra 7 do AGENTS.md):** self-bootstrap idempotente de `public.schema_migrations` (mesmo bloco das migrações 0008/0016/0018: criação da tabela se não existir + RLS + política "Permitir tudo para autenticados") seguido do registro com `script_name` **idêntico ao nome do arquivo**, `spec_id` `pluto-11`, `spec_name` `Categorias e Contas sem Distinção de Caixa e Acentos`, `executed_by` `joaopsroberto@gmail.com` e conflito ignorado por `ON CONFLICT (script_name) DO NOTHING`.
6. **Commit** — só no fim; qualquer falha anterior desfaz tudo e o banco fica exatamente como estava, permitindo re-execução depois de corrigir.

**Explicitamente não faz:** nenhuma remoção/renomeação de coluna ou tabela; nenhuma política RLS nova; nenhuma alteração de cálculos, views, funções ou triggers (premissa 14: não existem); nenhuma reescrita de `name` (D2); nenhum dado de `transactions`/`checklist_items` alterado além do ponteiro.

**Rollback (em comentário no rodapé do arquivo, padrão 0016/0018):** durante a execução o rollback é automático pela transação (D16); após aplicação bem-sucedida, a única reversão documentada é a troca de trava (remover os índices novos e recriar as travas de nome único originais) — **a fusão de dados é irreversível** (D9, exclusão de verdade sem desfazer). Nunca editar nem renomear arquivo já aplicado; correção exige arquivo novo.

**Verificação pós-aplicação (consultas documentadas em comentário no próprio script):** zero pares de linhas do mesmo tipo com nome normalizado coincidente nas duas tabelas; total de linhas em `transactions`, `budget_items` e `checklist_items` inalterado (exceto as linhas de `budget_items` descartadas por colisão); nenhum ponteiro órfão; contagem de apontadores por categoria/conta conservada antes/depois (só o ponteiro mudou).

**Ordem de CI:** o `ci.yml` aplica os `migration-feature-*` congelados e depois os scripts `migration-` numéricos em ordem lexicográfica — a 0019 roda por último, após a 0018. O harness de integração (`npm run test:integration`) só encontra as travas novas (e por isso o teste `unique-normalized.test.ts`) após a T1 existir; a aplicação **manual no Supabase de produção fica pendente para o humano** (mesmo fluxo das 0017/0018), auditada com `script_name` idêntico.

---

## Código Legado/Removível

Cada item com critério de busca zerada em código vivo (`lib/`, `app/`, `components/`):

1. **Filtro por igualdade exata de nome** — `.eq("name", ...)` em `lib/pluto/repositories/categories.ts` e `accounts.ts`. Critério: busca literal `.eq("name"` retorna **0** em `lib/pluto/repositories/`.
2. **Comparação por `toLowerCase` sem acento nos fakes** — `category.name.toLowerCase()` em `fakeCategoryRepository.ts` (linha 47), `account.name.toLowerCase()` em `fakeAccountRepository.ts` (linha 40) e `cat.name.toLowerCase()` em `fakeBudgetRepository.ts` (linha 201). Critério: busca literal `name.toLowerCase()` retorna **0** em `lib/pluto/repositories/fakes/` (o sort por `localeCompare` não usa `toLowerCase` e permanece).
3. **Inclusão/exclusão por `toLowerCase` nas sugestões do orçamento** — `lib/pluto/hooks/useBudgetItemEditor.ts` linhas 64–65. Critério de inclusão: busca por `toLowerCase()` retorna **0** em `useBudgetItemEditor.ts` (a exclusão é reescrita com o mesmo resultado semântico atual sobre `normalizeName` — ver DT-4, preservando o edge 13).

**Decisão de permanência (spec §7):** `toLowerCase()` de agrupamento em `useBudgetComparison.ts` e `useAccountAggregation.ts` **permanece** — é chave de cálculo/relatório, protegido pelo YAGNI 10 (sem mudança de cálculos); a busca por `toLowerCase()` nesses dois arquivos não precisa zerar.

---

## Arquivos Afetados

**Produção:**
- `utils/migrations/migration-0019-pluto-categorias-contas-normalizadas.sql` (novo)
- `lib/pluto/utils.ts`
- `lib/pluto/repositories/categories.ts`
- `lib/pluto/repositories/accounts.ts`
- `lib/pluto/repositories/fakes/fakeCategoryRepository.ts`
- `lib/pluto/repositories/fakes/fakeAccountRepository.ts`
- `lib/pluto/repositories/fakes/fakeBudgetRepository.ts`
- `lib/pluto/hooks/useTransactionForm.ts`
- `lib/pluto/hooks/useTransactionModals.ts`
- `lib/pluto/hooks/useBudgetItemEditor.ts`
- `components/pluto/TransactionModal.tsx`
- `components/pluto/TransactionModal.stories.tsx`
- `components/pluto/BudgetForecastForm.tsx`
- `app/pluto/transactions/page.tsx`
- `app/pluto/budget/page.tsx`

**Testes (RED novo/ajuste):**
- `__tests__/lib/pluto/migration-0019.test.ts` (novo)
- `__tests__/lib/pluto/utils.test.ts` (novo)
- `__tests__/lib/pluto/repositories/categories.test.ts` (novo)
- `__tests__/lib/pluto/repositories/accounts.test.ts` (novo)
- `__tests__/lib/pluto/repositories/contract-categories.test.ts`
- `__tests__/lib/pluto/repositories/contract-accounts.test.ts`
- `__tests__/lib/pluto/repositories/fake-category.test.ts`
- `__tests__/lib/pluto/repositories/fake-account.test.ts`
- `__tests__/lib/pluto/repositories/fake-budget.test.ts`
- `__tests__/lib/pluto/db/categories.test.ts`
- `__tests__/lib/pluto/db/accounts.test.ts`
- `__tests__/lib/pluto/hooks/useTransactionForm.test.ts`
- `__tests__/lib/pluto/hooks/useTransactionModals.test.ts`
- `__tests__/lib/pluto/hooks/useBudgetItemEditor.test.ts`
- `__tests__/components/pluto/TransactionModal.test.tsx`
- `__tests__/components/pluto/BudgetForecastForm.test.tsx`
- `__tests__/integration/unique-normalized.test.ts` (novo; roda só no CI)

**Intocados por decisão:** `components/pluto/ChecklistItemFormModal.tsx`, campo de conta do `TransactionModal`, `AccountModal.tsx`, `useAccountForm.ts`, `usePlutoData.ts`, `useCategories.ts`, `useBudgetOverview.ts`, `useBudgetComparison.ts`, `useAccountAggregation.ts`, `lib/pluto/db/*` (barrels), `lib/pluto/types.ts`, `lib/pluto/repositories/interfaces.ts`, `__tests__/integration/repositories.ts` (assinaturas inalteradas), checklist/orçamento/cálculos (YAGNI §7).

---

## Decisões Técnicas (arquitetura — registrar em `context.json.decisions` via Zeus)

- **DT-1 — Casa da regra:** `normalizeName` vive em `lib/pluto/utils.ts` (regra pura, mapa de camadas) e é importada por repositórios (`../utils`), fakes (`../../utils`), hooks e componentes (`@/lib/pluto/utils`) — uma implementação só, sem duplicação.
- **DT-2 — Busca client-side por varredura do tipo:** o `IDatabaseClient`/`IQueryBuilder` (lib/shared) não expõe filtro funcional (só `eq/gte/lte/order/is`), então o `getOrCreate` lê as linhas do tipo pedido e compara por `normalizeName` em memória — viável pelo volume doméstico (2 usuários), sem coluna de chave computada e sem dependência do unaccent no cliente.
- **DT-3 — Corrida sem depender de código de erro:** a `Error` da porta `IDatabaseClient` não tem `code` no contrato, então a detecção da corrida é "insert falhou → relê pelo mesmo critério → achou, devolve; não achou, propaga o erro original" (D12 sem acoplar a `23505`).
- **DT-4 — Exclusão do orçamento literal ao edge 13:** `suggestions` mantém a exclusão atual (igualdade sem caixa do nome digitado) e só troca a inclusão para normalizada; leitura literal de "mantida a exclusão atual do nome já digitado exatamente". Efeito derivado: digitando a variante só de caixa por extenso ("ALIMENTAÇÃO") a exclusão atual a suprime da lista do orçamento — a datalist do lançamento (sem exclusão) mostra a variante e o salvamento R4 nunca duplica; o exemplo explícito da R6 ("alimentacao") aparece nas duas listas.
- **DT-5 — Erro de leitura propaga nos dois repositórios:** sob R4 não é seguro criar quando a busca falhou; `accounts.ts` hoje seguiria para o insert em caso de erro de leitura — alinhar a lançar (o usuário vê a mesma mensagem de erro atual pelo `catch` do formulário).
- **DT-6 — Mecanismo da trava nova:** índice único sobre expressão (normalização + `type`), porque `ADD CONSTRAINT UNIQUE` aceita só colunas; a extensão/função de acento é tentada e falha alta (D15), sem plano B no arquivo.
- **DT-7 — Pré-filtro do datalist no componente:** o `TransactionModal` é quem tem `categoryInput` + `categories`, então o filtro das `<option>` é derivado ali (presenterational derivation), evitando trocar a prop `categories` por uma lista pré-calculada e churn na página/stories/testes (derivação presentacional mínima no componente).
- **DT-8 — Metadados da auditoria:** `spec_id` `pluto-11`, `spec_name` `Categorias e Contas sem Distinção de Caixa e Acentos`, `executed_by` `joaopsroberto@gmail.com` (padrão 0008/0016/0018); slug do arquivo `categorias-contas-normalizadas`.

---

## Tasks

DAG acíclico em 7 tasks (T0–T6 — espelho exato do `tasks.json`; RED por Minos antes do GREEN de Hefesto, conforme fluxo Olympus):

- **T0 — RED do conteúdo da migração 0019** (minos) — `__tests__/lib/pluto/migration-0019.test.ts` no padrão da 0018: transação tudo ou nada; unaccent tentado com falha alta antes das travas; fusão (4 ponteiros, sobrevivente mais usada com desempate `created_at`, descarte de colisão de `budget_items` antes do `DELETE` da perdedora) ANTES da troca de trava; drop das travas de nome + índice único de (nome normalizado, tipo) nas duas tabelas; auditoria com `script_name` idêntico; rollback em texto; verificações pós-aplicação; negativos (sem `DROP TABLE`/`DROP COLUMN`/`RENAME`, sem RLS nova) e nenhum arquivo de produção tocado.
- **T1 — Migração 0019** (hefesto) — cria `utils/migrations/migration-0019-pluto-categorias-contas-normalizadas.sql` conforme a seção Migrações; consome T0.
- **T2 — RED do domínio (regra + repositórios + fakes + contratos + integração da trava)** (minos) — novos casos de acento/caixa/Unicode/tipo nos contracts e fakes; `utils.test.ts` de `normalizeName`; testes de repositório real com stub (busca normalizada por tipo, corrida, erros); `__tests__/integration/unique-normalized.test.ts`. Tudo RED contra o código atual.
- **T3 — GREEN do domínio** (hefesto) — `normalizeName` em `lib/pluto/utils.ts`; `categories.ts`/`accounts.ts` com busca normalizada por tipo + retry; os três fakes alinhados; roda T2 verde. Consome T1+T2 (T0 entra via T1).
- **T4 — RED da UI e dos hooks** (minos) — blur em `useTransactionForm`/`useTransactionModals`/`useBudgetItemEditor`, sugestões normalizadas, datalist do `TransactionModal` e `onCategoryBlur` nos dois componentes: testes RED. Consome T3.
- **T5 — GREEN da UI e dos hooks** (hefesto) — hooks + componentes + stories + páginas conforme Contratos Completos; roda T4 verde. Consome T3+T4.
- **T6 — Suíte completa, cobertura e relatórios** (minos) — `npm run test` `failed == 0`, cobertura ≥ 80%, `test-report.json` + `test-scenarios.md` (só cenários manuais), `tsc`/`eslint` limpos; consome T1+T3+T5.

Nada além destas tasks: sem tela nova, sem coluna nova, sem sugestão de contas, sem alteração de checklist/cálculos/relatórios (YAGNI conforme spec seção 7).

---

## Riscos e Mitigações

- **unaccent indisponível no banco (D15):** a migração falha alto e nada é aplicado — é o comportamento exigido; o humano decide o plano B na hora. No CI, o job `integration` usa `supabase init/start` local com contrib extensions; se a extensão não puder ser habilitada lá, o job falha na 0019 com o erro claro (mesmo caminho de decisão humana).
- **Divergência JS × SQL na normalização:** `normalizeName` (cliente) e a expressão da trava (servidor: normalização Unicode + remoção de acento + caixa) precisam concordar sobre o que colide; casos PT-BR estão nos contracts/testes e a prova da trava é o `__tests__/integration/unique-normalized.test.ts` (CI, pós-0019) + o cenário manual de homologação da spec (aceite "a trava do banco impede/permite").
- **Filtro nativo do `datalist` pelo user agent:** a HTML Standard só *incentiva* o UA a filtrar (Unicode/case são "should/may", acento é "may") e o comportamento é fora do controle do app. Mitigação: o pré-filtro React garante que a variante esteja entre as opções renderizadas (e é superconjunto do filtro esperado do UA); mesmo que um UA oculte a opção, R4 impede duplicata no salvamento e R7 corrige a grafia no blur. O resultado visual é verificado no cenário manual do edge 12/13 pela homologação.
- **Corrida entre abas:** retry só devolve linha já existente do **mesmo tipo**; erro genuine de insert (fora corrida) continua visível — o `catch` atual do formulário preserva o edge 15.
- **Migração em produção com duplicatas legadas:** fusão dentro de transação única, verificação contábil antes/depois documentada no script e re-execução possível após correção; a exclusão é irreversível por decisão (D9) e o rodapé de rollback deixa isso explícito.
- **Nomes implícitos das travas antigas:** dependem da nomenclatura padrão do Postgres (`categories_name_key`, `financial_accounts_name_key`); Hefesto confirma no catálogo durante a T1 e a verificação pós-aplicação cobre qualquer remanescente (aceite: homônimas cross-type passam a ser graváveis).
- **Integração x unidade:** os contracts de cross-type homonym só passam no binding Supabase com a 0019 aplicada — a T3 consome T1 justamente para o banco de integração já ter a trava nova.

**Gates:** `node .agents/scripts/guardian.js .agents/modules/pluto/11-categorias-sem-distincao-caixa PLAN_APPROVED` após o `approve-plan` humano; guardian anti-código em `plan.md`/`tasks.json` na validação de forma do Zeus; RED por task sem SyntaxError/TS2 (validação do guardian em CODING); `npm run test`, `npx tsc --noEmit`, `npx eslint .` e `npx storybook build` verdes no fim.
