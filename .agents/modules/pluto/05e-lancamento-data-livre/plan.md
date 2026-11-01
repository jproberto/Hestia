# Plano de Implementação — Patch 05e: Lançamento com Data Livre (Calendário sem Trava do Mês)

**Feature:** `pluto/05e-lancamento-data-livre` (patch da feature 5 — Cadastro de transações)
**Módulo:** Pluto (Finanças Familiares)
**Spec de referência:** `.agents/modules/pluto/05e-lancamento-data-livre/spec.md` (aprovada — checkpoint 1)
**Data:** 2026-11-01
**Agente:** Atena (Planejamento — Olympus)

---

## Visão Geral

O patch separa "data do lançamento" de "mês de cálculo". A coluna `date` de `public.transactions` passa a ser apenas atributo de exibição e ordenação (data do cartão/extrato); o mês de cálculo vira dado próprio do lançamento, persistido nas colunas novas `period_year` + `period_month`, fixadas no mês da tela onde o form foi aberto. A trava de "mês aberto" em criar/editar/excluir passa a avaliar o mês de cálculo gravado; a busca da tela passa a filtrar por `period_year` + `period_month` em vez de intervalo de `date`; o campo de data do modal perde `min`/`max` e o rótulo "Limitada a". Os cálculos (saldo, entradas/saídas, orçado × realizado, agregação por conta) herdam o novo filtro da lista sem nenhuma lógica própria nova — eles somam a lista que a página carrega.

Escopo exato da spec (seção 7 fora de escopo respeitada): nenhuma tela nova, nenhuma regra nova de checklist/mês/orçamento/conciliação/parceladas, nenhuma UI para mover lançamento de mês, nenhum modelo de conta novo.

---

## Mapeamento Schema → Código

| Tabela | Coluna | Migração | Repositório | Hook | Componente |
|---|---|---|---|---|---|
| public.transactions | period_year (inteiro, novo, obrigatório) | migration-0018-pluto-lancamento-data-livre.sql (criação + backfill + NOT NULL + auditoria) | lib/pluto/repositories/transactions.ts — create grava e valida por ela; getTransactionsByMonth filtra por ela; update/delete validam o valor gravado | lib/pluto/hooks/useTransactionForm.ts — envia selectedYear do mês da tela no create | components/pluto/TransactionModal.tsx — campo de data sem limites |
| public.transactions | period_month (inteiro, novo, obrigatório) | migration-0018-pluto-lancamento-data-livre.sql (criação + backfill + NOT NULL + auditoria) | lib/pluto/repositories/transactions.ts — mesmo fluxo de period_year | lib/pluto/hooks/useTransactionForm.ts — envia selectedMonth do mês da tela no create | components/pluto/TransactionModal.tsx — rótulo "Data" sem "Limitada a" |
| public.transactions | date (sem DDL; muda só de semântica: data do cartão/extrato) | nenhuma (coluna existente intacta) | lib/pluto/repositories/transactions.ts — validação de período sai de date; ordenação por date crescente mantida | lib/pluto/hooks/usePlutoData.ts — derivação minDateStr/maxDateStr removida | app/pluto/transactions/page.tsx — deixa de repassar limites ao modal |
| public.monthly_periods | year, month, status (sem DDL; única referência de trava, agora sobre o mês de cálculo) | nenhuma | lib/pluto/repositories/transactions.ts — checagem "aberto" em criar/editar/excluir usa period_year/period_month; mensagens preservadas | lib/pluto/hooks/useTransactionModals.ts — deps trocam minDateStr por selectedYear/selectedMonth | components/pluto/DeleteConfirmModal.tsx — fluxo intacto (só herda validação nova do repositório) |

Consequência derivada (sem decisão nova): `lib/pluto/hooks/useBudgetComparison.ts`, `lib/pluto/hooks/useAccountAggregation.ts` e o banner de saldo somam a lista `transactions` da tela — refletem o mês de cálculo automaticamente, sem alteração de código próprio.

---

## Contratos Completos

### Tipos — `lib/pluto/types.ts` (fonte única)

- **`TransactionRow`** — campos atuais inalterados + `period_year: number` (obrigatório) + `period_month: number` (obrigatório).
- **`TransactionInput`** (entrada de criação) — campos atuais inalterados + `period_year: number` + `period_month: number` (obrigatórios).
- **`TransactionUpdateInput`** (novo) — apenas campos editáveis: `description: string`, `amount: number`, `type: "receita" | "despesa"`, `is_refund: boolean`, `date: string`, `category_id: string`, `account_id: string`. **Sem** campos de período — a edição não pode mover o lançamento de mês nem estruturalmente (garantia de tipo da decisão D6).
- **`TransactionWithDetails`** — campos atuais inalterados + `period_year: number` + `period_month: number`.
- **Remoção de tipos mortos** (sem importadores em código vivo hoje, verificados por busca): `CreateTransactionFormData`, `UpdateTransactionFormData`, `CreateTransactionDTO`, `UpdateTransactionDTO`. Mantê-los após a mudança criaria tipos desatualizados sem período.

### Contrato de repositório — `lib/pluto/repositories/interfaces.ts`

- `ITransactionRepository.updateTransaction(id: string, input: TransactionUpdateInput): Promise<TransactionWithDetails>` — assinatura muda de `TransactionInput` para `TransactionUpdateInput`.
- Demais métodos mantêm assinatura: `getTransactionsByMonth(year, month)`, `createTransaction(input: TransactionInput, email)`, `deleteTransaction(id)`.

### Repositório real — `lib/pluto/repositories/transactions.ts` (DDL/lógica de persistência aqui; nunca `@supabase/*` fora de `lib/shared`)

- **`getTransactionsByMonth(db, year, month)`** — remove o filtro `gte/lte` sobre `date` (e o uso de `getMonthRange`) e passa a filtrar por igualdade em `period_year` = year e `period_month` = month. Ordenação mantida: `date` crescente, desempate por `id` crescente. Enriquecimento de nomes inalterado.
- **`createTransaction(db, input, email)`** — remove `parseYearMonth(input.date)`; valida `monthly_periods` por `input.period_year`/`input.period_month` (mensagem preservada: "Não é possível registrar transações no período {mês}/{ano} pois ele não está aberto."); o `insert` passa a gravar também `period_year` e `period_month`.
- **`updateTransaction(db, id, input: TransactionUpdateInput)`** — passa a buscar a linha primeiro (seleciona `id, period_year, period_month`; linha ausente → erro "Transação não encontrada.", alinhando o repositório real ao fake); valida o período aberto pelo **mês de cálculo gravado** (mensagem preservada: "Não é possível alterar transações no período {mês}/{ano} pois ele não está aberto."); o `update` escreve apenas os campos editáveis — nunca `period_year`/`period_month`.
- **`deleteTransaction(db, id)`** — a busca inicial seleciona `id, period_year, period_month` em vez de `id, date`; a validação usa o mês de cálculo gravado (mensagem preservada: "Não é possível excluir transações no período {mês}/{ano} pois ele não está aberto."); o `delete` é inalterado.
- O arquivo deixa de importar `getMonthRange` e `parseYearMonth` (busca por `parseYearMonth` retorna 0 em `lib/pluto/repositories/transactions.ts`).

### Fake — `lib/pluto/repositories/fakes/fakeTransactionRepository.ts` (espelho obrigatório do contrato real)

- `getTransactionsByMonth` filtra por `tx.period_year === year && tx.period_month === month` (mantém ordenação date/id).
- `createTransaction` valida o período aberto por `input.period_year`/`input.period_month` e grava os campos no registro criado.
- `updateTransaction(id, input: TransactionUpdateInput)` busca a existente primeiro (erro "Transação não encontrada."), valida pelo mês de cálculo gravado e não altera os campos de período.
- `deleteTransaction` valida pelo mês de cálculo gravado.
- Os helpers locais `function getMonthRange` e `function parseYearMonth` do fim do arquivo são removidos (busca por `parseYearMonth` retorna 0 em `lib/pluto/repositories/fakes/`).
- `seed()`/construtor continuam aceitando `TransactionWithDetails[]` — os fixtures ganham os campos de período (necessário para os cenários de update/delete em período encerrado).

### Harness de integração — `__tests__/integration/repositories.ts`

- `SupabaseTransactionRepository` adapta a nova assinatura de `updateTransaction` (delega sem mapeamento de período) e o `mapInput` mantém mapeamento de aliases de categoria/conta; `TransactionInput` com período passa direto. Nenhuma mudança de produção.

### Hooks — `lib/pluto/hooks/`

- **`usePlutoData.ts`** — remove `minDateStr`/`maxDateStr` da interface `PlutoData`, do retorno e da derivação via `getMonthRange` (linha 183); remove o import de `getMonthRange`. Todo o resto (single-flight, seleção de mês aberto, demais cargas) intacto. A chamada `getTransactionsByMonth(db, year, month)` não muda de forma — muda de semântica por baixo.
- **`useTransactionForm.ts`** — `UseTransactionFormOptions` troca `minDateStr: string` por `selectedYear: number` e `selectedMonth: number`. `handleOpenTxModal` pré-preenche `date` com o primeiro dia do mês da tela (via `getMonthRange(selectedYear, selectedMonth).startDate` — único uso vivo remanescente de `getMonthRange`, que portanto permanece em `lib/shared/date.ts`). Ambos os fluxos de criação (`handleSaveTransaction` e `handleSaveTransactionAndAddAnother`) enviam `period_year: selectedYear` e `period_month: selectedMonth` no input. O fluxo de edição envia `TransactionUpdateInput` (sem período). "Salvar e Adicionar Outro" preserva a data digitada e os resets do 05d intactos. Prefill do checklist inalterado (`setDate(prefill.date)` — sem limites para conflitar).
- **`useTransactionModals.ts`** — `TransactionModalsDeps` troca `minDateStr` por `selectedYear`/`selectedMonth` e repassa ao `useTransactionForm`; composição dos 3 modais intacta.
- **`useDeleteTransaction.ts`** — nenhuma mudança de código (herda a nova validação do repositório).

### Componente e página

- **`components/pluto/TransactionModal.tsx`** — `TransactionModalProps` remove `minDateStr`, `maxDateStr`, `selectedYear` e `selectedMonth` (todos usados só pelos limites/rótulo); rótulo do campo passa a ser "Data"; o `Input type="date"` perde `min` e `max`; remove o import de `MONTH_NAMES` (busca por `Limitada a` retorna 0 em `components/`, busca por `MONTH_NAMES` retorna 0 em `components/pluto/TransactionModal.tsx`). Demais campos/fluxos intactos.
- **`components/pluto/TransactionModal.stories.tsx`** e **`components/pluto/storybook.fixtures.ts`** — args/fixtures atualizados sem as props removidas; `storyTransactions` ganha `period_year`/`period_month`.
- **`app/pluto/transactions/page.tsx`** — deixa de desestruturar/repassar `minDateStr`/`maxDateStr`; passa `selectedYear`/`selectedMonth` ao `useTransactionModals`; demais composição e cálculos intactos.
- **`components/pluto/ChecklistCard.tsx`** — nenhuma mudança (o prefill já monta a data do vencimento; sem limites para conflitar).

### Mensagens preservadas (formato literal atual)

- "Não é possível registrar transações no período {mês}/{ano} pois ele não está aberto."
- "Não é possível alterar transações no período {mês}/{ano} pois ele não está aberto."
- "Não é possível excluir transações no período {mês}/{ano} pois ele não está aberto."
- "Transação não encontrada."
- "Transação salva com sucesso!" (05d intacto).

---

## Migrações

**Número reservado pela Atena:** `0018` (próximo livre após 0017, conforme AGENTS.md).
**Arquivo:** `utils/migrations/migration-0018-pluto-lancamento-data-livre.sql` — nome único, kebab-case, sem sufixo de versão; criado por Hefesto conforme conteúdo deste plano. Vínculo com a feature-mãe via `spec_id` = `pluto-05e` e `spec_name` = `Lançamento com Data Livre`.

**Tipo:** DDL incremental aditiva, em transação única, com quatro passos ordenados (a ordem importa — as colunas nascem anuláveis para o backfill poder rodar):

1. Criação das colunas: `ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS period_year integer;` e `ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS period_month integer;`
2. Backfill retroativo: `UPDATE public.transactions SET period_year = EXTRACT(YEAR FROM date), period_month = EXTRACT(MONTH FROM date) WHERE period_year IS NULL OR period_month IS NULL;` — com conversão explícita para integer nas atribuições. Copia o ano/mês da própria `date` (decisão D8): saldos numéricos permanecem idênticos, pois hoje já se soma pelo mês da data.
3. Obrigatoriedade: `ALTER TABLE public.transactions ALTER COLUMN period_year SET NOT NULL;` e o análogo para `period_month` — somente após o backfill.
4. Auditoria: self-bootstrap idempotente de `public.schema_migrations` (mesmo bloco das migrações 0008/0016: `CREATE TABLE IF NOT EXISTS` + RLS + política "Permitir tudo para autenticados") e `INSERT` com `spec_id` `pluto-05e`, `spec_name` `Lançamento com Data Livre`, `script_name` idêntico ao nome do arquivo (`migration-0018-pluto-lancamento-data-livre.sql`) e `executed_by` `joaopsroberto@gmail.com`, com conflito ignorado por `ON CONFLICT (script_name) DO NOTHING`.

**Explicitamente não faz:** nenhuma remoção/renomeação de coluna ou tabela; nenhuma política RLS nova em `transactions`; nenhum índice novo (tabela de uso doméstico com 2 usuários — YAGNI; reavaliar apenas se o volume crescer); nenhum CHECK de faixa em `period_month` (a única escrita vem do repositório, que envia o mês selecionado da tela, restrito a 1–12 pela UI de seleção).

**Rollback (em comentário no rodapé do arquivo, padrão 0016):** aplicável somente onde a 0018 ainda não foi promovida — `ALTER TABLE public.transactions DROP COLUMN IF EXISTS period_year;` e o análogo para `period_month`. Nunca editar nem renomear arquivo já aplicado; correção exige arquivo novo.

**Verificação pós-aplicação (consultas documentadas em comentário no próprio script):** contagem de linhas de `transactions` com `period_year` ou `period_month` nulo deve ser zero; comparação da soma de `amount` agrupada por ano/mês de `date` antes e depois do backfill deve mostrar diferença zero (saldos preservados).

**Ordem de CI:** o CI aplica `utils/migrations` em ordem lexicográfica; `migration-0018-*` roda após 0017. O binding de integração (`__tests__/integration/repositories.ts`) só passa a seedar/crudar transações com período após a coluna existir no banco de integração — por isso a task de repositório consome a task da migração.

---

## Código Legado/Removível

Cada remoção traz critério de verificação por busca (em código vivo = `app/`, `components/`, `lib/`):

1. **`minDateStr` e `maxDateStr`** — em `PlutoData` (usePlutoData), `UseTransactionFormOptions`/`useTransactionForm`, `TransactionModalsDeps`/`useTransactionModals`, `TransactionModalProps`/`TransactionModal` e `page.tsx`. Critério: busca por `minDateStr` retorna 0 em código vivo; busca por `maxDateStr` retorna 0 em código vivo.
2. **Atributos de limite e rótulo** — `min={minDateStr}`, `max={maxDateStr}` e o texto "Limitada a" no modal. Critério: busca por `Limitada a` retorna 0 em código vivo (inclusive `__tests__/`).
3. **Helpers locais do fake** — `function getMonthRange` e `function parseYearMonth` em `fakeTransactionRepository.ts`. Critério: busca por `parseYearMonth` retorna 0 em `lib/pluto/repositories/fakes/`.
4. **Uso de `parseYearMonth`/`getMonthRange` no repositório real** — Critério: busca por `parseYearMonth` retorna 0 em `lib/pluto/repositories/transactions.ts`.
5. **Tipos mortos** — `CreateTransactionFormData`, `UpdateTransactionFormData`, `CreateTransactionDTO`, `UpdateTransactionDTO` em `lib/pluto/types.ts` (hoje sem nenhum importador, verificado por busca). Critério: busca por `CreateTransactionDTO` retorna 0 em código vivo (já vale antes da remoção — a remoção evita tipos obsoletos sem período).
6. **Import de `MONTH_NAMES` no modal** — Critério: busca por `MONTH_NAMES` retorna 0 em `components/pluto/TransactionModal.tsx`.

**Decisão de permanência (spec seção 9):** `getMonthRange` permanece em `lib/shared/date.ts` (com re-exports em `lib/pluto/utils.ts` e `lib/pluto/types.ts`) porque `useTransactionForm` passa a usá-lo para o primeiro dia do mês da tela. `parseYearMonth` permanece exportado em `lib/shared/date.ts` com seus re-exports — a spec determina verificar usos, não remover a utilidade compartilhada; após este patch ela não tem uso vivo, o que fica registrado aqui.

---

## Arquivos Afetados

**Produção:**
- `utils/migrations/migration-0018-pluto-lancamento-data-livre.sql` (novo)
- `lib/pluto/types.ts`
- `lib/pluto/repositories/interfaces.ts`
- `lib/pluto/repositories/transactions.ts`
- `lib/pluto/repositories/fakes/fakeTransactionRepository.ts`
- `lib/pluto/hooks/usePlutoData.ts`
- `lib/pluto/hooks/useTransactionForm.ts`
- `lib/pluto/hooks/useTransactionModals.ts`
- `components/pluto/TransactionModal.tsx`
- `components/pluto/TransactionModal.stories.tsx`
- `components/pluto/storybook.fixtures.ts`
- `app/pluto/transactions/page.tsx`

**Testes (ajuste do comportamento atual + fixtures com campos de período):**
- `__tests__/lib/pluto/repositories/contract-transactions.test.ts`
- `__tests__/lib/pluto/repositories/fake-transaction.test.ts`
- `__tests__/lib/pluto/db/transactions.test.ts`
- `__tests__/integration/repositories.ts`
- `__tests__/lib/pluto/hooks/usePlutoData.test.ts`
- `__tests__/lib/pluto/hooks/useTransactionForm.test.ts`
- `__tests__/lib/pluto/hooks/useTransactionModals.test.ts`
- `__tests__/lib/pluto/hooks/useDeleteTransaction.test.ts` (fixtures)
- `__tests__/lib/pluto/hooks/useAccountAggregation.test.ts` (fixtures)
- `__tests__/lib/pluto/hooks/useBudgetComparison.test.ts` (fixtures)
- `__tests__/components/pluto/TransactionModal.test.tsx`
- `__tests__/components/pluto/AccountCardGrid.test.tsx` (fixtures)
- `__tests__/components/pluto/DeleteConfirmModal.test.tsx` (fixtures)
- `__tests__/app/pluto/transactions-page.test.tsx`
- `__tests__/app/pluto/transactions/page.test.tsx`
- `__tests__/app/pluto/transactions-checklist.test.tsx`
- `__tests__/app/pluto/critical-flows.test.tsx`

**Intocados por decisão:** `components/pluto/ChecklistCard.tsx`, `lib/pluto/hooks/useDeleteTransaction.ts`, `lib/pluto/hooks/useBudgetComparison.ts`, `lib/pluto/hooks/useAccountAggregation.ts`, `lib/shared/date.ts`, `lib/pluto/db/transactions.ts` (barrel `export *` absorve as novas assinaturas sem mudança).

---

## Tasks

DAG acíclico em 8 tasks (espelho exato do `tasks.json`; RED primeiro por Minos, implementação por Hefesto, conforme fluxo Olympus):

- **T1 — Migração 0018** (hefesto) — cria o arquivo da migração com DDL/backfill/auditoria/rollback conforme seção Migrações. Independentepadrão.
- **T2 — Contrato RED de transações** (minos) — atualiza `contract-transactions.test.ts`, `fake-transaction.test.ts` e `db/transactions.test.ts` para o novo contrato (período de cálculo, data livre, edição não move mês) e os faz falhar contra o fake atual.
- **T3 — Tipos + repositório real + fake GREEN** (hefesto) — types, interfaces, `repositories/transactions.ts`, `fakeTransactionRepository.ts` e harness de integração; remove tipos mortos e helpers legados; roda T2 verde. Consome T1 (integração exige colunas no banco) e T2.
- **T4 — Contrato RED dos hooks** (minos) — atualiza `usePlutoData.test.ts`, `useTransactionForm.test.ts` e `useTransactionModals.test.ts` para o novo contrato de opções/retorno e os faz falhar contra os hooks atuais. Consome T3.
- **T5 — Hooks GREEN** (hefesto) — implementa as mudanças nos 3 hooks; roda T4 verde; `minDateStr`/`maxDateStr` zerados em `lib/pluto/hooks/`.
- **T6 — Contrato RED da UI + fixtures** (minos) — atualiza testes de componente/página (`TransactionModal.test.tsx`, `critical-flows.test.tsx`, `transactions-page`, `transactions/page`, `transactions-checklist`) e os fixtures `TransactionWithDetails` dos demais testes; RED documentado. Consome T3.
- **T7 — UI GREEN** (hefesto) — `TransactionModal.tsx` + stories/fixtures + `page.tsx`; roda T6 verde e `tsc --noEmit` limpo. Consome T5 e T6.
- **T8 — Suíte completa e cobertura** (minos) — suíte unitária verde, coverage ≥ 80%, `test-report.json` (`failed` 0) e `test-scenarios.md` (só cenários manuais). Consome T1, T5 e T7.

Nada além destas tasks: sem telas novas, sem índice novo, sem CHECK novo, sem alteração de checklist/mês/orçamento/dashboard, sem UI de mover mês (YAGNI conforme spec seção 7).

---

## Verificação e Riscos

- **Gates:** guardian `node .agents/scripts/guardian.js .agents/modules/pluto/05e-lancamento-data-livre PLAN_APPROVED` após o `approve-plan` humano; RED por task sem erro de sintaxe/tipo (validação do guardian em CODING); `npm run test`, `npx tsc --noEmit`, `npx eslint .` verdes; build do Storybook verde após mudança de props do modal.
- **Risco de migração x deploy:** entre aplicar a migração e deployar o código, inserts antigos (sem período) falhariam por NOT NULL — irrelevante aqui pois o backfill cobre o histórico e o deploy é atômico com o novo código; o reorder dos passos (backfill antes do NOT NULL) torna a migração segura para dados existentes.
- **Edição em mês reaberto:** validação pelo mês gravado permite editar lançamento antigo quando o mês dele foi reaberto — comportamento desejado (ciclo de vida do mês intacto, spec regra 13).
- **Integração:** `__tests__/integration/transactions.test.ts` roda só no CI (`npm run test:integration`) com migrações aplicadas; T3 consome T1 justamente para o banco de integração ter as colunas.
