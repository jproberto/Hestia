# Plano de Implementação — Pluto 12: Navegação e Extrato (itens 12, 16, 17 e 18 + adições 1 e 2)

> Para Zeus: delegar via hefesto/minos task por task

**Feature:** `pluto/12-navegacao-extrato` (itens 12, 16, 17, 18 do backlog do Pluto + adição 1 ponto neutro `/pluto` + adição 2 norma de doc)
**Módulo:** Pluto (Finanças Familiares)
**Spec de referência:** `.agents/modules/pluto/12-navegacao-extrato/spec.md` (aprovada — checkpoint 1, **2º amend de 2026-11-14** re-aprovado via `approve-spec`: dois maps + roteamento por `account_id`)
**Branch:** `feature/pluto/12-navegacao-extrato`
**Data:** 2026-11-14
**Agente:** Atena (Planejamento — Olympus)

**Objetivo:** aplicar os quatro ajustes aprovados (Lançamentos como primeira aba; desempate do extrato por inclusão via `created_at`; contas antes dos cartões; extrato em coluna única) + as duas adições de 2026-11-14 (raiz `/pluto` como redirect com card da home apontando para ela; norma de criação de módulos pela Mnemósine na fase 7) + o **2º amend de 2026-11-14** (agrupamento em dois maps com roteamento por `account_id`, cenário 13 literal), sem tocar em banco, cálculos, repositórios ou qualquer outra tela.

**Arquitetura:** a mudança é toda de apresentação e de ordenação em memória — a ordem visível do extrato continua nascendo em um único ponto (`useAccountAggregation`), que passa a desempatar por `created_at` e a agrupar os blocos em **dois maps** (contas, depois cartões) com **roteamento de cada lançamento por `account_id`** e fallback de placeholder só no map de contas (partição estrutural por concatenação, sem filtro); a nav é reordenada no array literal do `PlutoLayout` (aba ativa segue derivada da URL pelo `ModuleLayout`, intocado); o ponto neutro `/pluto` é um server component mínimo só com `redirect`, no padrão exato de `app/milon/page.tsx`; o grid do extrato perde `md:grid-cols-2`. Nenhuma migração, nenhum schema novo — o inteiro `0020` permanece livre.

**Tech Stack:** Next.js 16 + React 18, Vitest 2 (unit + `vitest.integration.config.ts` no CI), Tailwind, Supabase (adapter único em `lib/shared`), Storybook (build como gate de props).

---

## Restrições Globais (valores exatos da spec — não redecidir)

1. **Nav em 3 abas, Lançamentos primeiro** (R1/D12): ordem exata Lançamentos → Orçamento Anual → Meses e Períodos; rótulos, hrefs, quantidade de abas e regra de aba ativa inalterados.
2. **Ordenação do extrato** (R2/R3/R4/D16/D16b): data crescente continua sendo o critério **principal** (spec 05a); `created_at` crescente entra **só como desempate** (mais antigo primeiro); `id` não participa da ordenação visível; `created_at` ausente em fixture não pode quebrar a tela; empate total em `created_at` preserva a ordem de entrada (sort estável) — ordenar por criação como critério principal segue rejeitado (05e).
3. **Agrupamento em dois maps + roteamento por `account_id`** (R5/R6/R11/D17/D17b/D17c): o hook mantém **dois maps** — primeiro o das **contas**, depois o dos **cartões** — cada um com chave interna = nome da conta em minúsculas; a separação é por `type === "cartao"` (o que não é cartão vai para o map de contas — cobre fixtures legadas sem o campo e os placeholders). Cada lançamento é roteado pelo `account_id` para o bloco da conta correspondente **no map do tipo da conta**; sem correspondência por id, o lançamento vai para um bloco placeholder tipo `conta` no map de contas identificado pelo nome minúsculo (`account_name`, ou "Sem Conta") — acumula se o nome já existir ali, nasce bloco à parte se o nome só existir entre os cartões; **um lançamento sem match por id jamais é injetado em bloco de cartão**. A lista final é a **concatenação** dos values do map de contas com os do map de cartões (partição estrutural — nenhum filtro de partição); ordem relativa interna de cada grupo preservada; blocos placeholder (inclusive "Sem Conta") nascem com tipo `conta` e existem **apenas no map de contas**.
4. **Extrato em coluna única** (R7/R8/D18): `md:grid-cols-2` removido **só** do grid de `AccountCardGrid.tsx`; o grid de 2 colunas Receitas/Despesas de `BudgetComparisonSection.tsx` permanece; conteúdo interno dos blocos idêntico.
5. **Ponto neutro `/pluto`** (R9/D12b/D12c/D12d): `app/pluto/page.tsx` é **só** `redirect("/pluto/transactions")`, server component sem conteúdo próprio (padrão `app/milon/page.tsx`); card de Pluto no dashboard passa para `href="/pluto"` (única mudança no dashboard); deep links `/pluto/budget`, `/pluto/months`, `/pluto/transactions` inalterados — nenhuma rota existente passa a redirecionar.
6. **Sem migração e sem regra de domínio nova** (§7.2/§7.3): nenhum arquivo novo em `utils/migrations/`; o inteiro `0020` permanece livre; `lib/pluto/types.ts`, `lib/pluto/repositories/transactions.ts` (`.order("date")` + `.order("id")`), `lib/pluto/repositories/fakes/fakeTransactionRepository.ts` e `lib/pluto/repositories/accounts.ts` (`.order("name")`) permanecem intocados (D16/§7.4/§7.6).
7. **Documentação** (R10/D-DOC/D-DOCb): a norma "raiz do módulo + redirect para a aba padrão (primeira aba da nav)" entra na orientação de criação de módulos pela **Mnemósine na fase 7**, com texto definido por ela; o gerador `.agents/scripts/new-module.js` fica fora de escopo (§7.11).
8. **Fora de escopo** (§7): itens 13, 14, 15, 19 e 20 do backlog; trocar a ordem de `getAccounts`; conteúdo/estilo interno dos blocos; qualquer mudança em checklist, orçamento, saldo ou conciliação; qualquer mudança em dashboard além do `href` do card de Pluto.
9. **Gates do Olympus:** RED de Minos antes do GREEN de Hefesto por incremento; suíte verde com `failed == 0` e cobertura **≥ 80%**; `npx tsc --noEmit`, `npx eslint .` e `npx storybook build` limpos; nenhum código antes de `approvals.plan === "approved"`.
10. **Proibido** criar `use-cases/`, `schemas/`, `mappers.ts`, `services/` ou factories `createXService`; proibido importar `@supabase/*` fora de `lib/shared/`; proibido reimplementar `AsyncState`.

---

## Mapeamento Schema → Código

| Tabela | Coluna | Migração | Repositório | Hook | Componente |
|---|---|---|---|---|---|
| `public.transactions` | `date` (critério principal, já existente), `created_at` (desempate novo; coluna existe desde a feature 5, chega ao hook pelo `select *` — nenhuma leitura nova) e `account_id` (chave do roteamento por id — `TransactionWithDetails.account_id: string`, `lib/pluto/types.ts` linha 163, obrigatório no tipo; nenhuma leitura nova) | **Nenhuma** (sem alteração de schema — inteiro `0020` permanece livre) | `lib/pluto/repositories/transactions.ts` — **intocado** (D16: `.order("date")` + `.order("id")` permanecem; sem outro consumidor visual da ordem crua) | `lib/pluto/hooks/useAccountAggregation.ts` — sort de cada bloco passa a: `date` crescente → `created_at` crescente (tolerante à ausência) → ordem de entrada; `id` sai do comparador; e cada lançamento é roteado por `account_id` ao bloco da conta correspondente no map do tipo da conta (D17c) | `components/pluto/AccountCardGrid.tsx` (renderiza `txs` na ordem recebida) consumido por `app/pluto/transactions/page.tsx` |
| `public.financial_accounts` | `type` (`"conta"` \| `"cartao"` — separa os dois maps; tipo já existe em `AccountRow`/`Account`) | **Nenhuma** | `lib/pluto/repositories/accounts.ts` — **intocado** (`.order("name")` permanece; §7.6) | `useAccountAggregation.ts` — dois maps (contas, depois cartões) com chave interna = nome da conta em minúsculos; a lista devolvida é a concatenação dos values do map de contas com os do map de cartões (partição estrutural, sem filtro); blocos placeholder nascem `conta` e só entram no map de contas | `AccountCardGrid.tsx` (ordem dos blocos = ordem da lista) |
| — (sem tabela: rotas de apresentação) | — | **Nenhuma** | — | — | `components/layout/PlutoLayout.tsx` (ordem do array `plutoNavItems`), `app/pluto/page.tsx` (**novo** — redirect da raiz), `app/dashboard/page.tsx` (href do card), `components/layout/ModuleLayout.tsx` (**intocado** — aba ativa por URL) |

Consequência derivada (sem decisão nova): `lib/hestia/mascots.ts` já mapeia `'/pluto'` em `ROUTE_TO_MASCOT` com match exato e por prefixo (premissa 22) — a rota nova não altera resolução de mascote e o arquivo fica intocado.

---

## Contratos Completos

### Tipos — nenhum tipo novo

- `lib/pluto/types.ts` **intocado**: `TransactionWithDetails.created_at: string` (linha 166) e `TransactionRow.created_at: string` (linha 43) já existem e são obrigatórios no tipo — o desempate usa o campo como está; `Account.type` é a união `"conta" | "cartao"` (linha 183) e `AccountCardData` (`{ account, txs }`) não muda.
- Nenhuma coluna nova, nenhum Input/FormData novo, nenhuma interface de repositório nova.

### Hook — `lib/pluto/hooks/useAccountAggregation.ts` (único ponto da ordem visível)

- **`useAccountAggregation(transactions: TransactionWithDetails[], accounts: Account[]): AccountCardData[]`** — assinatura inalterada. Comportamento pós-feature (três partes):
  1. **Agrupamento em dois maps (item 17 + 2º amend — D17/D17b/D17c):** existem **dois** `Map` em memória — primeiro o das **contas**, depois o dos **cartões** —, cada um com chave interna = nome da conta em minúsculas; a semente de cada map vem de `accounts` particionando por `type === "cartao"` (**o que não é cartão** vai para o map de contas — cobre fixtures legadas sem o campo, premissa 25, e os placeholders, que são `conta`). Cada lançamento é **roteado pelo `account_id`** para o bloco da conta correspondente **no map do tipo da conta** (um lançamento da conta "Itaú" nunca cai no bloco do cartão "Itaú" — cenário 26). Sem correspondência por id (lançamento sem conta ou `account_id` desconhecido), o lançamento vai para um bloco placeholder tipo `conta` **no map de contas**, identificado pelo nome minúsculo (`account_name`, ou "Sem Conta" quando ausente): se já houver bloco com esse nome no map de contas, acumula nele; se o nome só existir entre os cartões, nasce um bloco placeholder à parte no map de contas — **um lançamento sem match por id jamais é injetado em bloco de cartão** (D17c). A partição conta → cartão é **estrutural**: nasce dos próprios maps.
  2. **Ordenação interna de cada bloco (item 16):** `date` crescente como critério principal; em empate de `date`, `created_at` crescente (mais antigo = incluído primeiro aparece primeiro); `created_at` ausente é tratado como valor vazio nas duas pontas da comparação (nenhum erro em tempo de execução — R4, mesmo estilo defensivo do `id` atual); empate total preserva a ordem de entrada do array (sort estável — D16b); `id` não é citado em nenhum lugar do comparador.
  3. **Lista retornada (partição estrutural — item 17):** a lista final é a **concatenação** dos values do map de contas com os do map de cartões — todos os blocos `conta` antes de qualquer `cartao`, preservando a ordem relativa interna de cada grupo (inserção na ordem de `getAccounts`, `.order("name")`; blocos placeholder/só-de-lançamento nascem ao fim do map de contas). **Nenhum filtro de partição é necessário** (D17 — o filtro estável sobre map único foi eliminado pelo 2º amend).
- O comentário do hook (linhas 10–14) passa a descrever, **nos dois pontos atualizados**: (a) ordenação "por data e desempate por data/hora de inclusão (`created_at`)" — a frase "por data e id" deixa de existir; (b) o agrupamento em **dois maps com roteamento por `account_id`** (não mais um agrupamento único por nome).

### Componentes e páginas

- **`components/layout/PlutoLayout.tsx`** — o array local `plutoNavItems` fica com exatamente 3 entradas `{ href, label }` nesta ordem: `/pluto/transactions` (Lançamentos), `/pluto/budget` (Orçamento Anual), `/pluto/months` (Meses e Períodos). Nada mais muda no componente (D12: só a posição de Lançamentos muda; a ordem relativa Orçamento → Meses permanece).
- **`components/layout/ModuleLayout.tsx`** — **intocado**: renderiza `navItems` na ordem do array e deriva a aba ativa do `pathname` (linhas 68–70) — reordenar não afeta `aria-current` (D12b).
- **`app/pluto/page.tsx` (novo)** — server component com export default que importa `redirect` de `next/navigation`, tem comentário identificando "Ponto neutro", chama `redirect("/pluto/transactions")` e retorna `null`; **sem** `"use client"`, sem props, sem conteúdo, sem outro destino (D12c — estrutura idêntica em papel a `app/milon/page.tsx`).
- **`app/dashboard/page.tsx`** — o `Link` do card de Pluto passa a ter `href="/pluto"`; esta é a **única** alteração no arquivo (linha 11; D12d). Os textos do card (`Pluto`, `Módulo Orçamentário e Financeiro`) e o card de Mílon permanecem idênticos.
- **`components/pluto/AccountCardGrid.tsx`** — o contêiner dos blocos (linha 56) perde `md:grid-cols-2` e mantém `grid grid-cols-1 gap-6`; `AccountCardGridProps` inalterada; cabeçalho, tabela, ações, rodapé e estados de loading/vazio inalterados (R7).
- **`components/pluto/BudgetComparisonSection.tsx`** — **intocado** (D18): o grid `md:grid-cols-2` de Receitas/Despesas (linha 29) permanece exatamente como está.

### Testes — mapa completo (espelhando `app|components|lib`)

| Camada | Arquivo | Papel |
|---|---|---|
| página (RED) | `__tests__/app/pluto/transactions/page.test.tsx` | novo caso no describe "PlutoLayout wrapper": links do `role=navigation` na ordem Lançamentos → Orçamento Anual → Meses e Períodos (cenário 1) — RED contra a ordem atual |
| espelho (RED) | `__tests__/components/layout/ModuleLayout.test.tsx` | espelho `plutoNavItems` (linhas 34–38) atualizado para a nova ordem + **novo caso de fidelidade** que lê a fonte de `components/layout/PlutoLayout.tsx` (leitura de fonte com `fs.readFileSync`, padrão de `__tests__/app/milon/page.test.tsx`) e assera que a sequência de pares href+label da produção é igual ao espelho — RED enquanto a produção estiver na ordem antiga; automatiza o cenário 4 |
| raiz (RED) | `__tests__/app/pluto/page.test.tsx` (**novo**) | padrão exato de `__tests__/app/milon/page.test.tsx`: mock de `next/navigation` com `redirect` que registra a chamada e lança (semântica NEXT_REDIRECT), render tolerando o lançamento, asserções de destino único `/pluto/transactions` + contrato estático da fonte (sem `"use client"`, sem tokens de conteúdo, sem `/pluto/budget`) — RED porque `app/pluto/page.tsx` ainda não existe |
| dashboard (RED) | `__tests__/app/dashboard/page.test.tsx` | caso do card Pluto (linhas 76–80) passa a asserir `href="/pluto"` — RED contra o `/pluto/budget` atual |
| hook (RED) | `__tests__/lib/pluto/hooks/useAccountAggregation.test.ts` | caso "ordena transações do cartão por data e id" (linhas 84–96) atualizado para o novo contrato (mesma data + `created_at` distinto + `id` invertido → ordem de inclusão, e o mesmo caso falharia se `created_at` virasse critério principal); caso "agrupamento é case-insensitive por nome da conta" (linhas 72–82) adaptado ao novo contrato (sob roteamento por id o nome só é consultado no fallback — nomes em caixas diferentes **sem `account_id` equivalente** → mesmo bloco placeholder); novos casos: tolerância a `created_at` ausente, partição mista (cenário 10, R5 estrutural), placeholder "Sem Conta" (cenário 14), **cenário 13 literal** (dois blocos "Itaú" — conta antes do cartão), **cenário 26** (L1 só no bloco da conta, L2 só no bloco do cartão — roteamento por `account_id`), fixtures **sem `account_id`** (fallback por nome — espelho das 5 fixtures de `transactions-page.test.tsx`, premissa 24), conta **sem `type`** (espelho de `transactions-checklist.test.tsx:89` — premissa 25) e guardas só-contas/só-cartões |
| componente (RED) | `__tests__/components/pluto/AccountCardGrid.test.tsx` | novo caso do cenário 16: a saída renderizada não contém a classe `md:grid-cols-2` e mantém `grid-cols-1`; os 3 casos existentes permanecem verdes |
| homônimas (T6) | `__tests__/app/pluto/transactions-homonimas-flow.test.tsx` | permanece verde como está (lookups atuais usam "Nubank" — nome único — e a descrição do lançamento); na T6 ganha asserção dos **cenários 13 e 26** na página (dois headings "Itaú" com conta antes do cartão; L1/L2 roteados por id) com **seleção de bloco homônimo só por tipo/id** (badge "Conta"/"Cartão" no cabeçalho — `AccountCardGrid.tsx` linhas 75–82), nunca por nome (risco R8 da spec) |
| intocados (verdes) | `__tests__/app/pluto/budget/page.test.tsx`, `__tests__/app/pluto/months/page.test.tsx`, `__tests__/app/pluto/budget-page.test.tsx` (presença da nav + aba ativa por URL — ordem não é assertada), `__tests__/app/pluto/transactions-page.test.tsx` (fixtures sem `created_at` — premissa 15; cobertas por R4 — **e sem `account_id`** — premissa 24; caem no fallback por nome do map de contas, D17c → permanecem verdes, conferir na T6), `__tests__/app/pluto/transactions-account-flow.test.tsx` (sem homônimos — `clickCardFooter("Itaú")` inambíguo), `__tests__/app/pluto/critical-flows.test.tsx` (usa `account_id: "a1"` casando com conta `a1` tipo `conta` → roteamento por id resolve) e `__tests__/app/pluto/transactions-checklist.test.tsx` (conta **sem `type`** na linha 89 → vai para o map de contas por `type !== "cartao"`, premissa 25), `__tests__/lib/pluto/repositories/contract-transactions.test.ts` (critério 5, linha 241) e `__tests__/lib/pluto/repositories/fake-transaction.test.ts` (linha 219 — ordenação do repositório, intocada por D16), `__tests__/components/pluto/BudgetComparisonSection.test.tsx` (regra R8 da spec — Orçado vs. Real intocado, D18), `__tests__/lib/hestia/mascots.test.ts` e `__tests__/lib/hestia/MascotProvider.test.tsx` (usam `/pluto/budget` como exemplo — prefix match inalterado) |
| docs (fase 7) | `.agents/module-template.md` e/ou `AGENTS.md` | norma de criação de módulos — **handoff para a Mnemósine**, sem task (ver seção Handoffs; D-DOC/R10) |

---

## Data Flow

**Nav do módulo:** página em `/pluto/*` → `PlutoLayout` monta `plutoNavItems` na nova ordem (Lançamentos primeiro) → `ModuleLayout` renderiza os links na ordem do array e marca `aria-current="page"` pelo `pathname` (lógica intocada) → o usuário chega em Lançamentos com um clique; deep link direto para `/pluto/budget` ou `/pluto/months` ativa a aba correta pela URL, independente da posição.

**Ponto neutro:** card de Pluto no dashboard (`href="/pluto"`) → `GET /pluto` → `app/pluto/page.tsx` (server component) → `redirect("/pluto/transactions")` → página de Lançamentos renderiza com "Lançamentos" como aba ativa (primeira da nav). Deep links existentes continuam resolvendo direto para as próprias rotas, sem passar pela raiz.

**Extrato:** `app/pluto/transactions/page.tsx` → `usePlutoData` entrega `transactions` + `accounts` (sem mudança) → `useAccountAggregation` monta **dois maps** (contas, depois cartões; chave interna = nome minúsculo; semente particionada por `type === "cartao"`) → **roteia cada lançamento por `account_id`** ao bloco da conta correspondente no map do tipo da conta (fallback: placeholder tipo `conta` no map de contas, por nome minúsculo — nunca em bloco de cartão) → ordena os `txs` de cada bloco (data → inclusão) → devolve a **concatenação** dos values do map de contas com os do map de cartões (partição estrutural) → `AccountCardGrid` renderiza os blocos empilhados em coluna única na ordem recebida. O painel Orçado vs. Real segue por `useBudgetComparison` → `BudgetComparisonSection` (2 colunas, intocado).

---

## Migrações

**Nenhuma.** Esta feature não cria, edita nem consome arquivo em `utils/migrations/`:

- Itens 12/17/18 são UI e ordenação em memória; o item 16 usa a coluna `created_at` de `public.transactions`, que já existe desde a feature 5 e já chega ao hook pelo `select *` do repositório (premissas 5 e 14).
- **O inteiro `0020` permanece livre** (§7.2) — nenhum número é consumido; `context.json.migrations` continua `{}`.
- Consequência: não há DDL, backfill, rollback nem auditoria a descrever; não há teste de migração; não há pendência de aplicação manual no Supabase; o CI não ganha passo novo.
- Se qualquer task tentar criar um arquivo em `utils/migrations/`, isso viola esta seção e o §7.2 da spec — critério de rejeição na revisão.

---

## Código Legado/Removível

Cada item com critério de busca zerada em código vivo (`app/`, `components/`, `lib/`), com escopo do grep declarado para não alcançar usos legítimos:

| Item | Critério de busca zerada (comando → esperado) | Arquivos afetados |
|---|---|---|
| Href antigo do card da home | busca literal `/pluto/budget` em `app/dashboard/page.tsx` **e** `__tests__/app/dashboard/page.test.tsx` → **0** em cada arquivo | `app/dashboard/page.tsx`, `__tests__/app/dashboard/page.test.tsx` |
| Desempate por `id` no extrato | busca literal `localeCompare(b.id` em `lib/pluto/hooks/useAccountAggregation.ts` → **0** | `lib/pluto/hooks/useAccountAggregation.ts`, `__tests__/lib/pluto/hooks/useAccountAggregation.test.ts` |
| Map único de agrupamento (2º amend) | busca literal `allAccountsMap` em `lib/pluto/hooks/useAccountAggregation.ts` → **0** (a variável do map único nomeia hoje o mapa que colapsa homônimos — premissa 26; é substituída pelo par de maps contas/cartões); guarda comportamental equivalente: o caso do cenário 13 em `__tests__/lib/pluto/hooks/useAccountAggregation.test.ts` só fica verde com dois blocos "Itaú" | `lib/pluto/hooks/useAccountAggregation.ts`, `__tests__/lib/pluto/hooks/useAccountAggregation.test.ts` |
| Comentário desatualizado do hook | busca literal `por data e id` em `lib/pluto/hooks/useAccountAggregation.ts` → **0**; o comentário (linhas 10–14) passa a mencionar desempate por `created_at` **e** os dois maps com roteamento por `account_id` — critério textual conferido na revisão (o ponto do agrupamento único é coberto estruturalmente pelo grep `allAccountsMap` → 0 acima) | `lib/pluto/hooks/useAccountAggregation.ts` |
| Duas colunas no extrato | busca literal `md:grid-cols-2` em `components/pluto/AccountCardGrid.tsx` → **0**; guarda cruzada: busca literal `md:grid-cols-2` em `components/pluto/BudgetComparisonSection.tsx` → **1** (inalterado) | `components/pluto/AccountCardGrid.tsx` |
| Ordem antiga da nav | critério **comportamental** (ordem não é greppável): o caso de ordem renderizada em `__tests__/app/pluto/transactions/page.test.tsx` e o caso de fidelidade fonte×espelho em `__tests__/components/layout/ModuleLayout.test.tsx` ficam verdes só com a sequência Lançamentos → Orçamento Anual → Meses e Períodos em `PlutoLayout.tsx`; o espelho local contém exatamente os 3 pares href+label nessa ordem | `components/layout/PlutoLayout.tsx`, `__tests__/components/layout/ModuleLayout.test.tsx`, `__tests__/app/pluto/transactions/page.test.tsx` |
| Raiz sem redirect (ou com destino errado) | busca literal `/pluto/budget` em `app/pluto/page.tsx` → **0**; o teste de fonte asseri que `/pluto/transactions` é o único destino da rota raiz | `app/pluto/page.tsx` (novo), `__tests__/app/pluto/page.test.tsx` (novo) |

**Decisões de permanência (buscas que NÃO devem zerar):** `/pluto/budget` permanece em `components/layout/PlutoLayout.tsx` (href da nav), em `components/pluto/BudgetOverflowModal.tsx` (deep link legítimo do modal, §7.10) e nos testes de rota/aba ativa de budget — o escopo do grep 1 é só o dashboard; `md:grid-cols-2` permanece em `BudgetComparisonSection.tsx` (D18); `.order("id")` permanece em `lib/pluto/repositories/transactions.ts` (D16) com seu contrato "critério 5" verde; `acc.name.toLowerCase()` permanece como **chave interna de cada um dos dois maps** (D17 — a chave por nome minúsculo não sai do hook, ela só deixou de ser única/global); `account_name` permanece como identificação do bloco placeholder no fallback por nome (D17c).

---

## Arquivos Afetados

**Produção — Create:**
- `app/pluto/page.tsx` (novo — só redirect)

**Produção — Modify:**
- `components/layout/PlutoLayout.tsx` (reordenação do array)
- `app/dashboard/page.tsx` (href do card de Pluto)
- `lib/pluto/hooks/useAccountAggregation.ts` (desempate + dois maps com roteamento por `account_id` + comentário nos dois pontos)
- `components/pluto/AccountCardGrid.tsx` (remoção de `md:grid-cols-2`)

**Testes — RED novo/ajuste:**
- `__tests__/app/pluto/page.test.tsx` (novo)
- `__tests__/app/pluto/transactions/page.test.tsx` (caso de ordem)
- `__tests__/components/layout/ModuleLayout.test.tsx` (espelho + fidelidade)
- `__tests__/app/dashboard/page.test.tsx` (href do card)
- `__tests__/lib/pluto/hooks/useAccountAggregation.test.ts` (desempate, tolerância, partição estrutural, cenário 13, cenário 26, fallback por nome, conta sem `type`)
- `__tests__/components/pluto/AccountCardGrid.test.tsx` (coluna única)

**Testes — ajuste na T6 (sem produção):**
- `__tests__/app/pluto/transactions-homonimas-flow.test.tsx` (asserções dos cenários 13 e 26 com seleção de bloco homônimo por tipo/id)

**Docs (fase 7, handoff):**
- `.agents/module-template.md` e/ou `AGENTS.md` (Mnemósine — D-DOC/R10)

**Intocados por decisão:** `components/layout/ModuleLayout.tsx`, `components/pluto/BudgetComparisonSection.tsx` + seu teste, `components/pluto/BudgetOverflowModal.tsx`, `components/pluto/AccountCardGrid.stories.tsx` (nenhuma prop mudou), `lib/pluto/types.ts`, `lib/pluto/repositories/transactions.ts`, `lib/pluto/repositories/accounts.ts`, `lib/pluto/repositories/fakes/fakeTransactionRepository.ts`, `lib/pluto/hooks/usePlutoData.ts`, `lib/pluto/hooks/useBudgetComparison.ts`, modais/checklist/orçamento/saldos, `lib/hestia/mascots.ts`, `lib/hestia/MascotProvider.tsx`, `.agents/scripts/new-module.js`, `utils/migrations/` (nenhum arquivo novo), `app/dashboard` além do href.

---

## Decisões da Spec (derivadas — honradas neste plano) e Decisões Técnicas

**Mapeamento das decisões da spec:**

| Decisão | Como o plano a honra |
|---|---|
| **D12** (só Lançamentos muda de posição) | T0/T1 alteram exclusivamente a ordem das entradas do array em `PlutoLayout`; rótulos/hrefs/quantidade inalterados (critério: exatamente 3 entradas com os mesmos pares) |
| **D12b** (rota `/pluto` passa a existir; aba ativa segue por URL) | T2/T3 criam `app/pluto/page.tsx`; `ModuleLayout` intocado — o caso de fidelidade + os casos de aba ativa existentes provam que posição não afeta `aria-current` |
| **D12c** (redirect puro, sem conteúdo) | T3 cria só o redirect no padrão de `app/milon/page.tsx`; T2 cobre por teste de comportamento (destino único) e de fonte (sem `use client`, sem tokens de conteúdo, sem `/pluto/budget`) |
| **D12d** (dashboard transversal, só o href) | T3 lista apenas `app/dashboard/page.tsx` + `app/pluto/page.tsx`; critério "nenhum outro arquivo alterado" |
| **D16** (mudança só no hook; repositório/fake intocados) | T4/T5 tocam só `useAccountAggregation` e `AccountCardGrid`; T5 asseri que nenhum arquivo de repositório muda e que o contrato "critério 5" permanece |
| **D16b** (`id` fora; empate total = ordem de entrada) | comparador do hook descrito na seção Contratos; grep `localeCompare(b.id` → 0; caso de tolerância cobre ausência de `created_at` |
| **D17** (dois maps — contas, depois cartões; partição estrutural) | dois maps descritos em Contratos (chave interna = nome minúsculo; separação por `type === "cartao"`); a lista final é a concatenação deles, sem filtro; T4 cobre cenário 10 (mistura), 11/12 (só contas/só cartões) e 13 literal (dois blocos "Itaú", conta antes do cartão) |
| **D17b** (placeholder é `conta`, só no map de contas) | a criação de placeholder mantém `type: "conta"` e passa a existir apenas no map de contas (consequência estrutural dos dois maps); T4 cobre o cenário 14 ("Sem Conta" antes de cartão) |
| **D17c** (roteamento por `account_id` + fallback por nome) | roteamento descrito em Contratos; T4 cobre cenário 26 (L1 só na conta, L2 só no cartão), fixtures sem `account_id` (fallback por nome — premissa 24) e conta sem `type` (vai para o map de contas — premissa 25); T5 implementa; T6 confere os verdes de `transactions-page`/`critical-flows`/`transactions-checklist` |
| **D18** (só o grid do extrato) | T5 altera só `AccountCardGrid.tsx`; guarda cruzada: `md:grid-cols-2` → 0 no extrato e → 1 em `BudgetComparisonSection.tsx` |
| **D-DOC** (Mnemósine fase 7, texto dela) | sem task de docs — seção "Handoffs pós-approve-review" abaixo, padrão das features anteriores |
| **D-DOCb** (gerador só como evidência) | `.agents/scripts/new-module.js` consta em Intocados; §7.11 |

**Decisões Técnicas (registrar em `context.json.decisions` via Zeus):**

- **DT-1 — Casa única da ordem visível:** agrupamento, roteamento e desempate vivem juntos em `useAccountAggregation` (o hook é a fonte da lista que o grid renderiza); nada de regra no componente (evita misturar apresentação com dados) nem no repositório (evita efeito colateral em `getTransactionsByMonth`/modal — alternativa B/C rejeitadas na spec §10).
- **DT-2 — Comparador defensivo:** ausência de `created_at` é tratada como valor vazio **nas duas pontas** (mesmo estilo do `(a.id || "")` atual) — sem lançar erro (R4); empate total cai na estabilidade do `sort` nativo (ES2019+ garante estabilidade) e preserva a ordem de entrada do array, sem id como último recurso (D16b).
- **DT-3 — Partição estrutural por dois maps (2º amend):** o hook mantém dois `Map` (contas, depois cartões) com chave interna = nome minúsculo, semente particionada por `type === "cartao"`, e a lista final é a **concatenação** dos values do map de contas com os do map de cartões — a ordem `conta` → `cartao` nasce dos próprios maps e dispensa qualquer filtro de partição (o filtro duplo estável sobre map único, abordagem anterior, foi eliminado pelo amend — spec §10 alternativa D). Cada lançamento entra no map certo via `account_id`, com fallback de placeholder só no map de contas (D17c).
- **DT-4 — Espelho + fidelidade automatizada:** o espelho do `ModuleLayout.test.tsx` é atualizado no mesmo RED que cria o caso de fidelidade (leitura da fonte do `PlutoLayout` e comparação de pares href+label com o espelho) — resolve o risco R2 da spec (espelho dessincronizado), dá FAIL legítimo ao arquivo no RED e automatiza o cenário 4 para sempre.
- **DT-5 — Teste do ponto neutro no padrão Mílon:** `__tests__/app/pluto/page.test.tsx` replica o mock de `redirect` com semântica NEXT_REDIRECT e a leitura de fonte de `__tests__/app/milon/page.test.tsx` (premissa 17) — mesmo contrato testado, zero invento de harness.
- **DT-6 — Guarda do Orçado vs. Real por busca:** em vez de um caso novo em `BudgetComparisonSection.test.tsx` (que passaria antes e depois — RED sem poder de detecção), a garantia de D18/regra R8 da spec (Orçado vs. Real intocado) é a guarda cruzada de busca na T5 (`md:grid-cols-2` → 1 no painel) + os testes existentes do componente permanecendo verdes.
- **DT-7 — Escopo do grep do href antigo:** a busca por `/pluto/budget` → 0 é restrita a `app/dashboard/page.tsx` + seu teste; o href é legítimo na nav (`PlutoLayout`), no deep link do `BudgetOverflowModal` e nos testes de rota — grep global zeraria usos corretos (§7.10).
- **DT-8 — Task de documentação inexistente por padrão:** nenhuma feature anterior registrou task de docs em `tasks.json` (Mnemósine atua na fase 7 pós-`approve-review` — precedente em `.agents/modules/milon/02-programas/plan.md`, `05-execucao-series/plan.md`, `07b-rotacao-treino-dia/plan.md`); a adição 2 vira seção de handoff no plano, não task — o gate do R10 é o cenário 25 na homologação + a verificação da Mnemósine.

---

## Handoffs pós-approve-review (fase 7 — Mnemósine; fora do diff de código)

- **R10 / D-DOC (adição 2):** na fase de documentação desta feature, a Mnemósine atualiza `.agents/module-template.md` e/ou `AGENTS.md` — conforme o que existir em disco — para registrar a norma **"raiz do módulo + redirect para a aba padrão (primeira aba da nav)"** como orientação oficial de criação de módulos; o texto final é dela (a spec não o fixa). Estado atual em disco registrado nas premissas 19–21 (template sem norma de redirect; `AGENTS.md` só com o histórico da Mílon #4).
- **D-DOCb:** o gerador `.agents/scripts/new-module.js` **não** é alterado (§7.11) — entra na doc apenas como evidência do estado atual, se a Mnemósine julgar relevante.
- **Padrão de docs da fase 7 (invariante):** `AGENTS.md`, `CHANGELOG.md` e `README.md` são atualizados pela Mnemósine após homologação, como em todas as features — nenhum deles é alterado por Hefesto/Minos nesta feature.
- Sem task de documentação no `tasks.json` (DT-8); o aceite "norma registrada" é verificado no cenário 25 de `test-scenarios.md` e na revisão da documentação.

---

## Tasks

DAG acíclico em 7 tasks (T0–T6 — espelho exato do `tasks.json`; três trilhos paralelos de RED→GREEN + suíte final; RED por Minos antes do GREEN de Hefesto, conforme fluxo Olympus):

- **T0 — RED da ordem da navegação** (minos) — `__tests__/app/pluto/transactions/page.test.tsx` ganha o caso comportamental de ordem (cenário 1) e `__tests__/components/layout/ModuleLayout.test.tsx` recebe o espelho já na nova ordem + o caso de fidelidade fonte×espelho (DT-4). Ambos FAIL contra a produção atual. Consome: nada. Produz: `nav-pluto-red`.
- **T1 — GREEN da ordem da navegação** (hefesto) — reordena exclusivamente o array `plutoNavItems` em `components/layout/PlutoLayout.tsx` (Lançamentos → Orçamento Anual → Meses e Períodos; D12). Consome `nav-pluto-red`. Produz: `nav-pluto-green`.
- **T2 — RED do ponto neutro `/pluto` + card da home** (minos) — cria `__tests__/app/pluto/page.test.tsx` no padrão Mílon (DT-5; FAIL porque a página não existe) e atualiza o caso do card em `__tests__/app/dashboard/page.test.tsx` para `href="/pluto"` (FAIL contra a produção). Consome: nada. Produz: `ponto-neutro-red`.
- **T3 — GREEN do ponto neutro `/pluto` + card da home** (hefesto) — cria `app/pluto/page.tsx` (só redirect, D12c) e troca o href em `app/dashboard/page.tsx` (D12d). Consome `ponto-neutro-red`. Produz: `ponto-neutro-green`.
- **T4 — RED do extrato: desempate por inclusão, dois maps com roteamento por `account_id` e coluna única** (minos) — atualiza/cria os casos de `useAccountAggregation.test.ts` (itens 16 e 17 + 2º amend: cenário 13 literal, cenário 26, fixtures sem `account_id`, conta sem `type`) e o caso de grid de `AccountCardGrid.test.tsx` (item 18). Consome: nada. Produz: `extrato-red`.
- **T5 — GREEN do extrato** (hefesto) — desempate + dois maps com roteamento por `account_id` + comentário nos dois pontos em `useAccountAggregation.ts`; remoção de `md:grid-cols-2` em `AccountCardGrid.tsx`. Consome `extrato-red`. Produz: `extrato-green`.
- **T6 — Suíte completa, cobertura e relatórios** (minos) — `npm run test` `failed == 0`, cobertura ≥ 80%, `test-report.json` + `test-scenarios.md` (só cenários manuais), `tsc`/`eslint`/storybook limpos, revisão dos testes da seção 9 da spec (inclui asserções dos cenários 13/26 em `transactions-homonimas-flow.test.tsx` com seleção por tipo/id e a conferência dos verdes: `transactions-page` sem `account_id`, `transactions-checklist` sem `type`, `critical-flows` com `account_id: "a1"`). Consome `nav-pluto-green` + `ponto-neutro-green` + `extrato-green`. Produz: `testing-verde`.

Nada além destas tasks: sem migração, sem coluna nova, sem regra de domínio nova, sem alteração de repositório/fake, sem tocar em `BudgetComparisonSection`, `ModuleLayout`, checklist, orçamento, saldos ou o gerador de módulos.

---

## Riscos e Mitigações

- **Fixtures sem `created_at` quebrarem o sort (R1 da spec):** mitigado por R4/DT-2 (comparador tolerante à ausência) + caso RED específico na T4 (ids invertidos + campo ausente) + a T6 roda `transactions-page.test.tsx` (premissa 15) e mantém os fixtures como estão — nenhuma fixture precisa ser completada se o comparador for tolerante.
- **Espelho da nav dessincronizado (R2):** mitigado por DT-4 — o caso de fidelidade fonte×espelho na T0 falha enquanto produção ≠ espelho e volta a falhar se qualquer um dos dois mudar sozinho.
- **Mudar o grid errado (R3):** mitigado por D18/DT-6 — T5 lista só `AccountCardGrid.tsx` e a guarda cruzada exige `md:grid-cols-2` presente em `BudgetComparisonSection.tsx`.
- **Testes com asserção de posição de blocos (R4):** varredura da spec §9 não encontrou asserção de posição (lookups são por nome de cabeçalho em `cardFooterButton`); a T6 revisa `transactions-account-flow.test.tsx` e `transactions-homonimas-flow.test.tsx` na execução completa.
- **Dashboard vermelho após trocar o href (R5):** mitigado pela atualização do caso na T2 (RED intencional) antes do GREEN da T3.
- **Raiz `/pluto` virar página de conteúdo (R6):** mitigado por D12c/DT-5 — contrato estático da fonte (sem `use client`, sem tokens de conteúdo, destino único) + comportamento de redirect.
- **Norma de doc não materializar (R7):** mitigado por R10 + seção de handoff + cenário 25 no `test-scenarios.md` da T6 (a Mnemósine executa na fase 7).
- **Lookup por nome em testes de homônimos ficar ambíguo (R8 da spec, 2º amend):** com dois blocos "Itaú" visíveis, `getByRole("heading", { name: "Itaú" })` falha por múltiplos matches — mitigado por seleção de bloco homônimo **só por tipo/id** (badge "Conta"/"Cartão" no cabeçalho, `AccountCardGrid.tsx` linhas 75–82); os lookups atuais de `transactions-homonimas-flow.test.tsx` usam "Nubank" (nome único, `clickCardFooter` linha 190) e a descrição do lançamento, permanecem verdes, e a T6 adiciona as asserções dos cenários 13/26 com desambiguação por tipo/id.
- **Fixtures sem `account_id` caírem em bloco errado (R9 da spec, 2º amend):** os 5 blocos de fixture de `transactions-page.test.tsx` (premissa 24 — grep `account_id` = 0 no arquivo) não casam por id com a conta `a1` — mitigado por D17c (fallback: acumula no bloco de mesmo nome no map de contas) + premissa 25 (partição por `type === "cartao"`, cobre a conta sem `type` de `transactions-checklist.test.tsx:89`); T4 cobre os dois comportamentos no hook e a T6 confere os arquivos verdes na execução completa.
- **Colapso de homônimos no mapa único (bug corrigido pelo 2º amend):** o cenário 13 é agora **literal e alcançável** — dois maps (contas/cartões) com a mesma chave `itaú` em mapas distintos impedem que o `set` do cartão substitua o da conta (premissa 26); T4 cobre cenário 13 e cenário 26 como RED e o grep `allAccountsMap` → 0 garante que não sobrou o map único.
- **Paralelismo dos trilhos:** T0/T2/T4 são independentes e podem ser executados em qualquer ordem; T6 só após os três GREENs — nenhuma dependência cíclica (o `tasks.json` é acíclico por construção).

**Gates:** `node .agents/scripts/guardian.js .agents/modules/pluto/12-navegacao-extrato PLAN_APPROVED` após o `approve-plan` humano; guardian anti-código em `plan.md`/`tasks.json` na validação de forma do Zeus; RED por task sem SyntaxError/TS2 (validação do guardian em CODING); `npm run test`, `npx tsc --noEmit`, `npx eslint .` e `npx storybook build` verdes no fim.
