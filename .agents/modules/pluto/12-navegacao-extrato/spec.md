# Especificação — Navegação e Extrato de Pluto (itens 12, 16, 17 e 18)

**Status:** Em Especificação (SPEC_DRAFT — **2º amend de 2026-11-14**: agrupamento do extrato em dois maps com roteamento por `account_id`, decisão humana no chat — **pendente de novo `approve-spec`**)
**Itens do Backlog:** #12 (Lançamentos como primeira aba), #16 (Ordenação do extrato: desempate por inclusão), #17 (Contas antes dos cartões), #18 (Extrato em coluna única) + 2 adições aprovadas pelo humano em 2026-11-14 (após o primeiro envio para `approve-spec`): (1) ponto neutro `/pluto` com card da home — escopo transversal `app/dashboard/` registrado como **parte desta feature**, sem feature separada; (2) norma de documentação de criação de módulos (atualização pela Mnemósine) + **2º amend de 2026-11-14 (decisão humana no chat): agrupamento do extrato em dois maps (contas, depois cartões) com roteamento de lançamentos por `account_id`, tornando o cenário 13 literal alcançável**
**Feature:** `pluto/12-navegacao-extrato`
**Branch:** `feature/pluto/12-navegacao-extrato`
**Módulo:** Pluto (Finanças Familiares)
**Data:** 2026-11-12 (1º amend: 2026-11-14 — adições aprovadas; 2º amend: 2026-11-14 — dois maps + roteamento por `account_id`)
**Agente:** Hera (Discovery & Spec — Olympus)

---

## 1. Contexto e Problema Real

Quatro ajustes de uso pedidos em produção, agrupados por tocarem a mesma superfície (navegação do módulo e extrato agrupado por conta/cartão da tela de Lançamentos), mais duas adições aprovadas pelo humano em 2026-11-14 após o primeiro envio para `approve-spec`:

1. **Lançamentos é a tela do dia a dia**, mas hoje é a última aba da navegação (`components/layout/PlutoLayout.tsx`, linhas 13–17: Orçamento Anual → Meses e Períodos → Lançamentos) — o usuário precisa de dois cliques ou de digitar a URL para chegar ao que usa todos os dias.
2. **Desempate da ordenação do extrato**: os lançamentos de cada conta/cartão são ordenados pela data e, em empate de data, pelo `id` do registro (`lib/pluto/hooks/useAccountAggregation.ts`, linhas 45–49). O `id` não corresponde à ordem em que o registro foi realmente incluído — o usuário espera ver, no mesmo dia, os lançamentos na ordem em que os digitou (o 05e/ item 32 já rejeitou ordenar por criação como critério principal; aqui a inclusão entra **apenas** como desempate).
3. **Contas e cartões misturados**: o extrato lista os blocos na ordem alfabética de nome da conta (ordem de `getAccounts`, `lib/pluto/repositories/accounts.ts`, linha 11), intercalando contas e cartões — quem usa quer primeiro o que é conta-corrente/reserva (o "dinheiro real") e depois o que é fatura.
4. **Duas colunas no desktop**: o extrato renderiza os blocos lado a lado a partir do breakpoint `md` (`components/pluto/AccountCardGrid.tsx`, linha 56: `grid grid-cols-1 md:grid-cols-2 gap-6`) — com a largura máxima do layout (`max-w-4xl`), as tabelas de lançamentos ficam estreitas; o usuário pede um bloco abaixo do outro.
5. **Ponto neutro `/pluto` + card da home** (adição aprovada em 2026-11-14): o card de Pluto na home (`app/dashboard/page.tsx`, linha 11) aponta para `href="/pluto/budget"` (hard coded), enquanto o card de Mílon aponta para `href="/milon"` (linha 31) e `app/milon/page.tsx` faz `redirect("/milon/today")` (padrão da Mílon #4: "ponto neutro"). A adição cria `app/pluto/page.tsx` com redirect para a aba padrão `/pluto/transactions` e troca o card da home para `href="/pluto"`.
6. **Norma de documentação de criação de módulos** (adição aprovada em 2026-11-14): o humano determinou que o padrão "raiz do módulo + redirect para a aba padrão (primeira aba da nav)" vira orientação oficial de como criar um módulo — a **Mnemósine** atualiza a orientação documentada (`.agents/module-template.md` e/ou `AGENTS.md`) na fase de documentação desta feature. O que existe em disco hoje está registrado nas premissas 19–21 e em D-DOC (seção 2).

**Objetivo:** aplicar exatamente esses quatro ajustes e as duas adições aprovadas em 2026-11-14, sem tocar em cálculos, regras de domínio ou banco de dados, e sem mudar qualquer outra tela além das listadas na seção 8 (a adição 1 inclui o `href` do card de Pluto em `app/dashboard/page.tsx`).

---

## 2. Escopo Aprovado e Decisões Derivadas

O escopo abaixo foi **aprovado pelo humano** (repassado por Zeus na delegação de 2026-11-12) e não será expandido — exceto pelas duas adições que o próprio humano aprovou em 2026-11-14 (registradas abaixo como sub-item do 12 e como seção final) e pelo **2º amend de 2026-11-14**, decisão humana no chat (agrupamento em dois maps com roteamento por `account_id`, registrado no Item 17 como D17/D17b/D17c — este amend reabre a spec para `SPEC_DRAFT`, pendente de novo `approve-spec`), também sem margem para expansão posterior. As "decisões derivadas" são consequências de mínima mudança diretas do escopo aprovado + leitura do código real; ficam explícitas aqui para validação no `approve-spec`.

### Item 12 — Lançamentos como primeira aba
- **Regra:** a ordem da nav de `PlutoLayout` passa a ser **Lançamentos → Orçamento Anual → Meses e Períodos**.
- **Decisão derivada (D12):** apenas Lançamentos muda de posição; a ordem relativa entre Orçamento Anual e Meses e Períodos permanece (mudança mínima — "põe Lançamentos em primeiro", os demais não são citados).
- **Decisão derivada (D12b):** com a adição 1 (2026-11-14) a rota `/pluto` **passa a existir** como `app/pluto/page.tsx` com redirect para `/pluto/transactions` — no primeiro envio desta spec a decisão era "nenhuma mudança de rota/redirecionamento", porque `app/pluto/page.tsx` não existia (verificado em disco); o humano inverteu isso no amend. Reordenar a nav **segue não afetando a aba ativa**, porque esta é derivada da URL, não da posição (`components/layout/ModuleLayout.tsx`, linhas 68–70).
- **Adição 1 — Ponto neutro `/pluto` + card da home (aprovada pelo humano em 2026-11-14):**
  - **Regra:** criar `app/pluto/page.tsx` com `redirect("/pluto/transactions")` (aba padrão = primeira aba da nav — item 12; `Lançamentos` vive em `/pluto/transactions`, `PlutoLayout.tsx` linha 16) e trocar o card de Pluto da home (`app/dashboard/page.tsx`, linha 11) de `href="/pluto/budget"` para `href="/pluto"`.
  - **Decisão derivada (D12c):** a nova página é **só um redirect, sem conteúdo próprio** — mesmo padrão de `app/milon/page.tsx` (lido em disco: server component com `redirect` do `next/navigation` e comentário "Ponto neutro"). Deep links existentes (`/pluto/budget`, `/pluto/months`, `/pluto/transactions`) não mudam: nenhuma rota atual passa a redirecionar.
  - **Decisão derivada (D12d):** o card da home é escopo **transversal** (`app/dashboard/`, camada compartilhada) registrado como parte desta feature no cabeçalho — não abre feature separada; a única mudança nele é o `href`.

### Item 16 — Desempate por data/hora de inclusão
- **Regra:** dentro de cada bloco do extrato, a data do lançamento continua sendo o critério **principal** (ordem crescente, como hoje e como exige a spec 05a §2.3/§3.4 — "ordem cronológica crescente"); o **desempate** passa do `id` para `created_at` (data/hora interna de inclusão do registro), também crescente (mais antigo primeiro = ordem de inclusão).
- **Decisão derivada (D16):** a mudança acontece em `useAccountAggregation` (único ponto que define a ordem **visível** do extrato — o hook reordena os lançamentos de cada bloco inteiramente). A ordenação do repositório (`lib/pluto/repositories/transactions.ts`, linhas 25–26: `.order("date")` + `.order("id")`) e do fake (`fakeTransactionRepository.ts`, linhas 82–84) **permanece intocada**: ela não é visível no extrato (o hook reordena) e não tem outro consumidor visual (o único consumidor de `getTransactionsByMonth` é a página de Lançamentos, que passa por `useAccountAggregation`).
- **Decisão derivada (D16b):** `id` deixa de ser critério de ordenação do extrato. Empate também em `created_at` (praticamente impossível — precisão de microssegundos) preserva a ordem de entrada (sort estável), sem desempate adicional.

### Item 17 — Contas antes dos cartões (ampliado no 2º amend de 2026-11-14)
- **Regra:** no extrato agrupado, todos os blocos de tipo `conta` aparecem primeiro, seguidos de todos os blocos de tipo `cartao`.
- **Decisão derivada (D17 — reescrita no 2º amend, decisão humana no chat de 2026-11-14):** o agrupamento passa a usar **dois maps em memória** — primeiro o das **contas**, depois o dos **cartões** — cada um com chave interna = nome da conta em minúsculas; a separação é por `type === "cartao"` (o que não é cartão vai para o map de contas — cobre fixtures legadas sem o campo, premissa 25, e os placeholders, que são `conta`). A partição conta→cartão é **estrutural**: a lista final é a concatenação dos values do map de contas com os do map de cartões — ela nasce dos próprios maps e **elimina o filtro de partição estável** que seria necessário sobre um único map (abordagem planejada antes deste amend). Dentro de cada grupo a ordem relativa é preservada — os nomes vêm ordenados de `getAccounts` (`lib/pluto/repositories/accounts.ts`, linha 11, `.order("name")`) e os blocos "só de lançamento" nascem ao fim do map de contas (inserção posterior à semente). **Por que dois maps:** hoje existe um único map com chave = nome minúsculo (`lib/pluto/hooks/useAccountAggregation.ts`, linhas 20–27) e "Itaú" conta + "Itaú" cartão colapsam num bloco só — o `set` do cartão substitui o da conta (último registro vence) e **todos** os lançamentos daquele nome caem no bloco único, misturando conta e fatura (bug real de exibição). A Pluto 11 (migração 0019) fixou a identidade `(nome normalizado, tipo)`: Itaú-conta e Itaú-cartão são entidades distintas no banco — o extrato passa a refletir isso (cenário 13 literal).
- **Decisão derivada (D17b):** blocos placeholder (conta presente apenas nos lançamentos, inclusive o "Sem Conta") nascem com tipo `conta` (`useAccountAggregation.ts`, linha 37) e existem **apenas no map de contas** — consequência estrutural dos dois maps; o tipo `conta` já era atribuído hoje (comportamento existente), a modelagem nova é o par de maps, não o tipo.
- **Decisão derivada (D17c — roteamento por `account_id`, 2º amend):** cada lançamento é roteado pelo `account_id` (campo existente em `TransactionWithDetails`, `lib/pluto/types.ts`, linha 163) para o bloco da conta correspondente, no map do tipo da conta — um lançamento da conta "Itaú" nunca cai no bloco do cartão "Itaú", mesmo com `account_name` igual (cenário 26). Sem correspondência por id (lançamento sem conta, ou `account_id` desconhecido das contas carregadas), o lançamento vai para um bloco placeholder tipo `conta` no map de contas, identificado pelo nome minúsculo (`account_name`, ou "Sem Conta" quando ausente) — se já houver bloco com esse nome no map de contas, acumula nele (é o que mantém verdes as fixtures de `transactions-page.test.tsx`, que trazem lançamentos sem `account_id` — premissa 24); se o nome só existir entre os cartões, nasce um bloco placeholder à parte — um lançamento sem match por id jamais é injetado em bloco de cartão.

### Item 18 — Extrato em coluna única
- **Regra:** os blocos do extrato passam a ser exibidos um abaixo do outro em **qualquer** largura de tela (o `md:grid-cols-2` é removido; em telas pequenas já era uma coluna, então a mudança é visível apenas a partir de `md`).
- **Decisão derivada (D18):** a mudança é **só** no grid do extrato (`AccountCardGrid.tsx`, linha 56). O grid de 2 colunas do painel Orçado vs. Real (`components/pluto/BudgetComparisonSection.tsx`, linha 29 — Receitas/Despesas lado a lado, definido na spec 05a §2.2) **não é afetado**: item 18 fala em "contas/cartões lado a lado", que é o extrato.

### Adição 2 — Norma de documentação para criação de módulos (aprovada pelo humano em 2026-11-14)
- **Regra:** o padrão "raiz do módulo + redirect para a aba padrão (primeira aba da nav)" vira **orientação oficial de como criar um módulo**.
- **Decisão derivada (D-DOC):** quem atualiza a orientação é a **Mnemósine**, na fase de documentação (fase 7) desta feature, sobre o que existir em disco — `.agents/module-template.md` (existe; hoje prevê `app/<modulo>/page.tsx` como página do módulo e checklist "Criar página em `app/<modulo>/page.tsx`", sem norma de redirect — premissa 19) e/ou `AGENTS.md` (registra o redirect da Mílon #4 apenas como histórico da feature, sem norma de criação — premissa 21). Esta spec **não fixa o texto final** nem obriga um único arquivo: a escolha é da Mnemósine conforme o que existir em disco.
- **Decisão derivada (D-DOCb):** o gerador `.agents/scripts/new-module.js` entra aqui apenas como evidência do estado atual: ele scaffolda `app/<key>/page.tsx` com conteúdo placeholder de boas-vindas (linhas 107–124) e teste espelho desse placeholder (linhas 508–522) — **não** um redirect (premissa 20). Alterar o gerador está fora de escopo (§7.11); a norma entra como documentação.

---

## 3. Premissas Técnicas Validadas (evidência lida em disco, não inferida)

| # | Premissa | Confirmação | Evidência em disco |
|---|---|---|---|
| 1 | A nav do Pluto é um array literal em `PlutoLayout` na ordem Orçamento Anual → Meses e Períodos → Lançamentos | ✅ Sim | `components/layout/PlutoLayout.tsx`, linhas 13–17 |
| 2 | `ModuleLayout` renderiza `navItems` exatamente na ordem do array e marca aba ativa por URL (não por posição) | ✅ Sim | `components/layout/ModuleLayout.tsx`, linhas 67–86 (map) e 68–70 (isActive por `pathname`) |
| 3 | No primeiro envio não existia página/redirect em `/pluto`; a adição 1 (2026-11-14) manda criá-la — varredura refeita no amend, a página ainda não existe | ✅ Sim (reverificado em 2026-11-14) | varredura `app/pluto/**/page.tsx`: só `budget`, `months`, `transactions`; nenhum `app/pluto/page.tsx` |
| 4 | `TransactionWithDetails` possui `created_at: string` (obrigatório, não nulo) | ✅ Sim | `lib/pluto/types.ts`, linha 166 (interface `TransactionWithDetails`); `TransactionRow.created_at: string`, linha 43 |
| 5 | O repositório de transações seleciona `*`, então `created_at` chega ao hook sem mudança de leitura | ✅ Sim | `lib/pluto/repositories/transactions.ts`, linhas 16–26 (select `*` + order) |
| 6 | A ordenação visível do extrato é 100% determinada pelo hook (ele reordena os lançamentos de cada bloco) | ✅ Sim | `lib/pluto/hooks/useAccountAggregation.ts`, linhas 44–50 (`card.txs.sort` sobre cada bloco) |
| 7 | O desempate atual do extrato é por `id` | ✅ Sim | `useAccountAggregation.ts`, linha 48 (`(a.id \|\| "").localeCompare(b.id \|\| "")`) |
| 8 | `Account.type` é a união `"conta" \| "cartao"` | ✅ Sim | `lib/pluto/types.ts`, linha 183 (`Account`) e linha 60 (`AccountRow`) |
| 9 | A ordem dos blocos no extrato segue a ordem de inserção do(s) map(s) do hook: hoje um único mapa (contas de `getAccounts` ordenadas por nome + blocos só-de-lançamento); com o 2º amend, dois maps — primeiro o das contas, depois o dos cartões — mantendo a mesma ordem interna por grupo | ✅ Sim | `useAccountAggregation.ts`, linhas 20–43; `lib/pluto/repositories/accounts.ts`, linha 11 (`.order("name")`) |
| 10 | O grid de 2 colunas do extrato está em `AccountCardGrid` (`grid grid-cols-1 md:grid-cols-2 gap-6`) | ✅ Sim | `components/pluto/AccountCardGrid.tsx`, linha 56 |
| 11 | Existe um segundo grid de 2 colunas, do painel Orçado vs. Real, que **não** é o alvo do item 18 | ✅ Sim | `components/pluto/BudgetComparisonSection.tsx`, linha 29; spec 05a §2.2 (linha 29) |
| 12 | O único consumidor da página/da agregação é a tela de Lançamentos (nenhuma outra tela renderiza o extrato) | ✅ Sim | `app/pluto/transactions/page.tsx`, linha 34 (único importador de `useAccountAggregation` fora de testes) |
| 13 | Editar um lançamento **não** altera `created_at` (a coluna continua sendo "inclusão") | ✅ Sim | `lib/pluto/repositories/transactions.ts`, linhas 121–128 (payload de update sem `created_at`) |
| 14 | Nenhuma migração de banco é necessária nos 4 itens (colunas/tabelas já existem) | ✅ Sim | item 16 usa `created_at` já existente desde a feature 5; itens 12/17/18 são UI/ordenação em memória |
| 15 | Há fixtures de teste de página **sem** `created_at` em transações (uma delas com 2 lançamentos na mesma data) | ✅ Sim | `__tests__/app/pluto/transactions-page.test.tsx`, linhas 84–96, 165–177, 206–218, 250–276 (t1 e t2 ambos `date: "2026-03-15"`), 303–315 |
| 16 | O card de Pluto na home aponta para `/pluto/budget` (hard coded) e o de Mílon para `/milon` | ✅ Sim | `app/dashboard/page.tsx`, linha 11 (Pluto) e linha 31 (Mílon) — lido em disco no amend |
| 17 | `app/milon/page.tsx` existe como redirect "ponto neutro" para `/milon/today` e há teste desse contrato (padrão a seguir) | ✅ Sim | `app/milon/page.tsx`, linhas 1–10 (comentário "Ponto neutro"); `__tests__/app/milon/page.test.tsx` (mock de `redirect` com semântica NEXT_REDIRECT) |
| 18 | O teste do dashboard assere hoje `href="/pluto/budget"` no card de Pluto | ✅ Sim | `__tests__/app/dashboard/page.test.tsx`, linhas 76–80 |
| 19 | `.agents/module-template.md` existe e prevê `app/<modulo>/page.tsx` como página do módulo, **sem** norma de redirect para aba padrão | ✅ Sim | `.agents/module-template.md`, linhas 27–30 (estrutura `app/<modulo>/`) e 135 (checklist "Criar página em `app/<modulo>/page.tsx`") — nenhuma menção a redirect em todo o arquivo |
| 20 | O gerador `.agents/scripts/new-module.js` scaffolda `app/<key>/page.tsx` com placeholder de conteúdo (não redirect) e teste espelho do placeholder | ✅ Sim | `.agents/scripts/new-module.js`, linhas 107–124 (página "Módulo X criado com sucesso. Adicione suas páginas aqui.") e 508–522 (teste que asseri o placeholder) |
| 21 | `AGENTS.md` descreve o redirect da Mílon #4 apenas como histórico da feature, sem norma de criação de módulos | ✅ Sim | `AGENTS.md`, linha 15 ("`/milon` redireciona para `/milon/today`", no parágrafo Mílon #4); seção "Padrão de Módulos" não contém a norma |
| 22 | A nova rota `/pluto` não quebra a resolução de mascote: `ROUTE_TO_MASCOT` já mapeia `'/pluto'` com match exato e por prefixo | ✅ Sim | `lib/hestia/mascots.ts`, linhas 53–60 (entrada `'/pluto': 'pluto'`) e 62–67 (`isExactMatch`/`isPrefixMatch`) |
| 23 | `TransactionWithDetails` possui `account_id: string` (obrigatório no tipo) — o roteamento do 2º amend não exige nenhuma leitura nova de dados | ✅ Sim | `lib/pluto/types.ts`, linha 163 (interface `TransactionWithDetails`) |
| 24 | Os fixtures de transação de `transactions-page.test.tsx` **não** trazem `account_id` e a conta mockada é sempre `a1` "Itaú Corrente" (tipo `conta`) | ✅ Sim | grep `account_id` em `__tests__/app/pluto/transactions-page.test.tsx`: **0 ocorrências**; fixtures nos mesmos trechos da premissa 15 (linhas 84–96, 165–177, 206–218, 250–276, 303–315); conta mockada nas linhas 98, 139, 179, 220, 277, 317 |
| 25 | Há fixture de conta **sem** o campo `type` | ✅ Sim | `__tests__/app/pluto/transactions-checklist.test.tsx`, linha 89 (`id` "acc1", nome "Itaú", sem `type`) — por isso a partição do 2º amend separa pelo tipo `cartao` (o que não é cartão vai para o map de contas); hoje o mesmo campo vira badge "Conta" no grid (`AccountCardGrid.tsx`, linha 63, `isCard = account.type === "cartao"`) |
| 26 | Hoje um único map com chave = nome minúsculo colapsa homônimos: com "Itaú" conta e "Itaú" cartão, o `set` do cartão substitui o da conta e **todos** os lançamentos do nome caem no bloco único (bug de exibição que o 2º amend corrige) | ✅ Sim | `useAccountAggregation.ts`, linhas 20–27 (semente por `acc.name.toLowerCase()`) e 29–41 (roteamento por nome, `tx.account_name \|\| "Sem Conta"`) |

**Validada com Humano?** O escopo das seções 1–2 foi aprovado pelo humano (delegação de 2026-11-12 via Zeus, com instrução explícita de não expandir) e **ampliado em 2026-11-14** com duas adições aprovadas pelo próprio humano (ponto neutro `/pluto` + card da home; norma de documentação de criação de módulos) — incorporadas acima sem abertura de escopo além delas; e **reaberto no 2º amend de 2026-11-14** por decisão humana no chat para o agrupamento do extrato em dois maps com roteamento por `account_id` (D17/D17b/D17c) — premissas 23–26 lidas em disco para este amend —, ficando **pendente de novo `approve-spec`**. As premissas acima são leitura direta dos arquivos listados (Accuracy > Completeness) e a tabela integra o `approve-spec`.

---

## 4. Modelo de Domínio (diagrama textual de entidades)

**Entidade `transactions` (lançamento)** — `id` (chave), `date` (data do lançamento, exibida na tela), `created_at` (data/hora de inclusão, preenchida automaticamente e **nunca alterada por edição** — premissa 13), `description`, `amount`, `type` (`receita` | `despesa`), `is_refund`, `category_id`, `account_id`, `period_year`, `period_month`, `created_by`. *Sem alteração de schema nesta feature.*

**Entidade `financial_accounts` (conta/cartão)** — `id`, `name`, `type` (`conta` | `cartao`), `created_at`, `created_by`. *Sem alteração de schema.*

**Agrupamento do extrato (em memória, `useAccountAggregation` — 2º amend)** — `AccountCardData`: { `account`: Account, `txs`: lista de lançamentos daquele bloco }. Blocos são derivados de **dois maps** — primeiro o das contas, depois o dos cartões — cada um com chave interna = nome da conta em minúsculas (separação por `type === "cartao"`; o que não é cartão vai para o map de contas). Roteamento dos lançamentos por `account_id`: lançamento cujo id corresponde a uma conta conhecida cai no bloco dela, no map do tipo da conta; sem correspondência (lançamento sem conta ou id desconhecido), cria/acumula bloco placeholder com tipo `conta` no map de contas, identificado pelo nome minúsculo (`account_name`, ou "Sem Conta" quando ausente).

**Ordem de apresentação (duas camadas independentes):**

- **Nav do módulo** (`PlutoLayout` → `ModuleLayout`): lista ordenada de abas { `href`, `label` } — nova ordem: Lançamentos, Orçamento Anual, Meses e Períodos. A aba ativa deriva da URL, nunca da posição.
- **Ponto neutro do módulo** (`app/pluto/page.tsx`, adição 1): rota `/pluto` **sem conteúdo próprio** — apenas redirect para `/pluto/transactions` (primeira aba). O card de Pluto na home (`app/dashboard/page.tsx`) passa a apontar para `/pluto`. Não é entidade de dados; é rota de apresentação.
- **Extrato** (`AccountCardGrid` recebe `cards` já ordenados pelo hook): (1) partição **estrutural** — a lista é a concatenação do map de contas com o map de cartões (todos os `conta`, depois todos os `cartao`); (2) dentro de cada bloco, lançamentos por `date` crescente, desempate por `created_at` crescente.

**Relações:** `transactions.account_id` → `financial_accounts.id` (1:N, inalterado — identidade `(nome normalizado, tipo)` fixada pela Pluto 11, migração 0019); com o 2º amend, o hook usa essa mesma relação para rotear cada lançamento ao bloco certo (D17c); a página de Lançamentos compõe nav + extrato; nenhum outro módulo/tela consome essa ordem.

---

## 5. Regras de Negócio (comportamento)

- **R1 — Nav em três abas, Lançamentos primeiro (item 12).** A navegação do módulo Pluto exibe, nesta ordem: Lançamentos, Orçamento Anual, Meses e Períodos. Os rótulos, hrefs e a lógica de aba ativa não mudam.
- **R2 — Critério principal da ordenação do extrato continua sendo a data (item 16).** Dentro de cada bloco, os lançamentos aparecem em ordem cronológica crescente pela `date` (a data que aparece na tela) — idêntico ao comportamento atual e à spec 05a.
- **R3 — Desempate por inclusão (item 16).** Dois lançamentos com a mesma `date` no mesmo bloco são ordenados por `created_at` crescente (o mais antigo, ou seja, o incluído primeiro, aparece primeiro). `id` não participa mais da ordenação visível.
- **R4 — Tolerância a ausência de `created_at` (item 16).** Nenhum erro em tempo de execução quando um registro de teste/fixture não trouxer `created_at` — a comparação trata a ausência sem quebrar a tela (mesmo padrão defensivo já usado hoje para `id` na linha 48 do hook).
- **R5 — Contas primeiro, cartões depois (item 17 + 2º amend).** No extrato agrupado, todos os blocos de tipo `conta` são listados antes de qualquer bloco de tipo `cartao`. Com o 2º amend a partição é **estrutural**: o hook mantém dois maps — primeiro o das contas, depois o dos cartões — e a lista final é a concatenação deles (nenhum filtro de partição é necessário). A ordem relativa interna de cada grupo é preservada: os nomes vêm ordenados de `getAccounts` e os blocos placeholder/só-de-lançamento nascem ao fim do map de contas (D17).
- **R6 — Blocos placeholder são contas (item 17).** Blocos criados apenas a partir de lançamentos (inclusive "Sem Conta") têm tipo `conta` e existem **apenas no map de contas** — consequência estrutural dos dois maps; o tipo `conta` já era atribuído pelo hook (comportamento existente), a modelagem nova é o par de maps (D17b).
- **R7 — Extrato em coluna única (item 18).** Os blocos do extrato são empilhados verticalmente em qualquer largura; não há duas colunas de blocos a partir de `md`. O conteúdo interno de cada bloco (cabeçalho, tabela, rodapé, totais, ações) permanece idêntico.
- **R8 — Orçado vs. Real intocado (item 18).** O grid de 2 colunas Receitas/Despesas do `BudgetComparisonSection` não muda.
- **R9 — Ponto neutro `/pluto` (adição 1).** Acessar `/pluto` redireciona para `/pluto/transactions`, com "Lançamentos" como aba ativa (primeira aba da nav — derivada do item 12). O card de Pluto na home navega para `/pluto`. Deep links existentes (`/pluto/budget`, `/pluto/months`, `/pluto/transactions`) continuam funcionando sem mudança de comportamento.
- **R10 — Norma documental de criação de módulos (adição 2).** Na fase de documentação desta feature (fase 7), a Mnemósine atualiza a orientação de criação de módulos — `.agents/module-template.md` e/ou `AGENTS.md`, conforme o que existir em disco — para incluir o padrão "raiz do módulo + redirect para a aba padrão (primeira aba da nav)". O texto final da doc é da Mnemósine; esta spec não o fixa (D-DOC).
- **R11 — Roteamento de lançamentos por `account_id` (2º amend).** Cada lançamento é roteado pelo seu `account_id` para o bloco da conta correspondente, no map do tipo da conta: um lançamento da conta "Itaú" aparece somente no bloco da conta Itaú e um do cartão "Itaú" somente no bloco do cartão Itaú — nunca no bloco homônimo errado, mesmo com `account_name` igual (a rota é por id, não por nome). Sem correspondência por id (lançamento sem conta, ou `account_id` desconhecido), o lançamento vai para um bloco placeholder tipo `conta` no map de contas identificado pelo nome minúsculo (`account_name`, ou "Sem Conta" quando ausente); se já existir bloco com esse nome no map de contas, acumula nele; se o nome só existir entre os cartões, nasce bloco placeholder à parte — um lançamento sem match por id jamais é injetado em bloco de cartão (D17c/R6).

---

## 6. Cenários de Edge Case (Dado / Quando / Então)

### Item 12 (navegação)

1. **Nova ordem:** Dado que a nav do Pluto está renderizada, Quando o usuário abrir qualquer página do módulo, Então os links aparecem na ordem Lançamentos, Orçamento Anual, Meses e Períodos.
2. **Aba ativa por URL (deep link):** Dado acesso direto a `/pluto/budget`, Então "Orçamento Anual" é o único link com `aria-current="page"` e estilo ativo, independentemente de ser a segunda posição.
3. **Aba ativa sem histórico de clique:** Dado acesso direto a `/pluto/months`, Então "Meses e Períodos" é a única aba ativa (regra já coberta pelo `ModuleLayout` — sem mudança de comportamento).
4. **Espelho de teste:** Dado que `__tests__/components/layout/ModuleLayout.test.tsx` espelha a nav do `PlutoLayout` (comentário "navItems espelham components/layout/PlutoLayout.tsx", linhas 33–38), Quando a ordem real mudar, Então o espelho é atualizado para continuar fiel (mesma ordem da produção).

### Item 16 (desempate por inclusão)

5. **Empate de data:** Dado que uma conta tem dois lançamentos com a mesma `date` e `created_at` distintos (o segundo incluído depois), Quando o extrato renderizar, Então o incluído primeiro aparece antes, mesmo que o `id` dele seja maior.
6. **Critério principal preservado:** Dado que uma conta tem lançamentos em 10/03 (incluído depois) e 15/03 (incluído antes), Então 10/03 aparece primeiro — a data vence sobre a inclusão (regressão do 05e: ordenar por criação como critério principal continua rejeitado).
7. **Fixture sem `created_at`:** Dado um lançamento de teste sem o campo `created_at` (caso real: `transactions-page.test.tsx`, linhas 250–276, dois lançamentos na mesma data), Quando o hook ordenar, Então nenhum erro de execução é lançado e a tela renderiza (R4).
8. **Empate também em `created_at`:** Dado dois lançamentos com `date` e `created_at` idênticos, Então a ordem de entrada é preservada (sort estável), sem usar `id` como desempate.
9. **Edição não muda a posição de inclusão:** Dado um lançamento editado (valor/descrição alterados), Então `created_at` permanece o da criação e sua posição de desempate entre iguais não se altera (premissa 13).

### Item 17 (contas antes dos cartões)

10. **Mistura completa:** Dado extrato com 2 contas e 2 cartões (alfabeticamente intercalados, ex.: Itaú conta, Nubank cartão, Sicredi conta, Uber cartão), Então a ordem exibida é Itaú conta, Sicredi conta, Nubank cartão, Uber cartão.
11. **Só cartões:** Dado que só existem cartões, Então a lista é exibida na ordem atual (nenhum grupo de contas para antecipar) — sem mudança perceptível.
12. **Só contas:** Dado que só existem contas, Então a lista é exibida na ordem atual — sem mudança perceptível.
13. **Homônimos conta × cartão (literal alcançável — 2º amend):** Dado "Itaú" conta e "Itaú" cartão cadastradas (duas linhas válidas de `financial_accounts` — identidade `(nome normalizado, tipo)` fixada pela Pluto 11, migração 0019), Então o extrato exibe **DOIS blocos distintos ambos intitulados "Itaú"** — o da conta antes do do cartão — em vez do bloco único atual em que conta e fatura se misturam (bug do map único, premissa 26; D17).
14. **Placeholder "Sem Conta":** Dado um lançamento sem conta correspondente (bloco "Sem Conta", tipo `conta`), Então ele aparece no grupo das contas, não entre os cartões (R6).
15. **Bloco sem lançamentos:** Dado um cartão cadastrado sem lançamentos no mês, Então ele continua aparecendo (com aviso "Nenhum lançamento..."), agora após todas as contas.

### Item 18 (coluna única)

16. **Desktop:** Dado o extrato com vários blocos em tela larga (≥ `md`), Então cada bloco ocupa a largura total, um abaixo do outro — nenhuma linha com dois blocos lado a lado.
17. **Mobile:** Dado o extrato em tela estreita, Então o comportamento já existente (uma coluna) permanece idêntico — sem regressão.
18. **Conteúdo do bloco:** Dado um bloco renderizado em coluna única, Então cabeçalho (ícone, nome, tipo, total), tabela (Data/Descrição/Categoria/Valor/Ações), botões de editar/excluir e rodapé "+ Nova Transação" permanecem funcionais e inalterados visualmente.
19. **Painel Orçado vs. Real:** Dado a seção Receitas/Despesas acima do extrato, Então ela continua em 2 colunas (R8).

### Transversais

20. **Estado vazio:** Dado nenhum cartão/conta cadastrado, Então o CTA "Cadastrar Primeira Conta ou Cartão" aparece como hoje (inalterado pelos 4 itens).
21. **Estados de carregando/erro:** Dado a página carregando ou com erro, Então os estados (banner de erro, texto "Carregando contas e lançamentos...") permanecem idênticos — nenhum dos itens toca `AsyncState`/mensagens.

### Adição 1 — Ponto neutro `/pluto` + card da home (item 12)

22. **Redirect da raiz:** Dado acesso a `/pluto`, Quando a página carregar, Então o usuário é redirecionado para `/pluto/transactions` e "Lançamentos" é a aba ativa (primeira aba da nav).
23. **Card da home:** Dado o painel de ferramentas renderizado, Quando o usuário acionar o card de Pluto, Então a navegação segue para `/pluto` (mesmo padrão do card de Mílon, que vai para `/milon`) — não mais direto para `/pluto/budget`.
24. **Deep links preservados:** Dado acesso direto a `/pluto/budget` ou `/pluto/months`, Então as páginas continuam abrindo normalmente com a aba correspondente ativa (nenhuma rota existente muda ou passa a redirecionar).

### Adição 2 — Norma de documentação (Mnemósine)

25. **Atualização da orientação:** Dado que a fase de documentação (fase 7) desta feature é executada pela Mnemósine, Então `.agents/module-template.md` e/ou `AGENTS.md` passam a registrar a norma "raiz do módulo + redirect para a aba padrão (primeira aba da nav)" como orientação oficial de criação de módulos, com texto definido por ela (D-DOC).

### 2º amend (2026-11-14) — Agrupamento em dois maps e roteamento por `account_id` (Item 17)

26. **Roteamento por `account_id` entre homônimos:** Dado "Itaú" conta (linha `a-conta`) com um lançamento L1 e "Itaú" cartão (linha `a-cartao`) com um lançamento L2 — ambos os lançamentos com `account_name` "Itaú" —, Quando o extrato renderizar, Então L1 aparece somente no bloco da conta Itaú e L2 somente no bloco do cartão Itaú; nenhum dos dois é exibido no bloco homônimo errado (rota por `account_id`, não por nome — R11/D17c; cenário 13 cobre a existência dos dois blocos, este cobre a distribuição dos lançamentos).

---

## 7. Fora de Escopo (YAGNI)

1. **Itens 13, 14, 15, 19 e 20 do backlog de Pluto** (ordenação alfabética do Orçamento, toggle do checklist, mostrar/esconder lançamentos por conta, aba de manutenção de categorias, categorias alfabéticas nas caixas) — explicitamente não-objetivo desta feature.
2. **Qualquer migração de banco** — nenhum dos 4 itens nem o 2º amend altera schema (a chave de agrupamento nova é modelagem **em memória** do hook); o inteiro `0020` permanece livre.
3. **Qualquer regra de domínio nova** — identidade de categorias/contas no banco, ciclo de vida de mês, cálculo de saldo, apelidos, parcelamento: intocados. O 2º amend muda só a modelagem em memória do `useAccountAggregation` (dois maps, chave interna = nome minúsculo, roteamento por `account_id`) — sem DDL e sem regra de domínio nova: a identidade `(nome normalizado, tipo)` já foi fixada pela Pluto 11 (migração 0019) e este amend apenas a reflete no extrato.
4. **Ordenação do repositório de transações** (`.order("date")` + `.order("id")`) e do fake `fakeTransactionRepository` — permanece como está (D16); contrato "critério 5" continua válido.
5. **Grid de 2 colunas do painel Orçado vs. Real** (`BudgetComparisonSection`) — não faz parte do item 18 (D18).
6. **Trocar a ordem de `getAccounts`** (ex.: ordenar por tipo no repositório) — reordenaria também o select de contas do modal de lançamento e outros consumidores (efeito colateral indevido; ver §8).
7. **Rótulos, hrefs ou quantidade de abas** da nav — só a ordem muda.
8. **Conteúdo/estilo interno dos blocos do extrato** (totais, badges, ações, tokens `font-display`) — intocado.
9. **Reordenar por data de criação como critério principal** — continuaria rejeitado como no 05e; inclusão é apenas desempate (R2/R3).
10. **Qualquer mudança em dashboard além do `href` do card de Pluto** (`app/dashboard/page.tsx`, linha 11 — parte da adição 1, única alteração ali prevista), e qualquer mudança em checklist, orçamento, saldo ou conciliação.
11. **Alterar o gerador `.agents/scripts/new-module.js`** (ou o scaffold que ele gera) — a adição 2 cobre apenas a atualização da orientação documentada pela Mnemósine; o gerador entra nesta spec só como evidência do que existe hoje (D-DOCb).

---

## 8. Pontos de Impacto na Codebase (orientação de plano — sem decisão de implementação)

- `components/layout/PlutoLayout.tsx` — reordenação do array `plutoNavItems` (item 12).
- `app/pluto/page.tsx` — **novo arquivo** (adição 1): redirect de `/pluto` para `/pluto/transactions`, no padrão de `app/milon/page.tsx` (server component, sem conteúdo próprio — D12c).
- `app/dashboard/page.tsx` — linha 11 (adição 1): `href` do card de Pluto trocado de `/pluto/budget` para `/pluto`; camada compartilhada registrada como parte desta feature (D12d).
- `lib/pluto/hooks/useAccountAggregation.ts` — desempate por `created_at` no sort dos `txs` (item 16); e, no 2º amend (item 17), agrupamento em dois maps (contas, depois cartões) com roteamento de lançamentos por `account_id` e placeholder apenas no map de contas (D17/D17c). O comentário do hook (linhas 10–14) descreve ordenação "por data e id" e um agrupamento único por nome — fica desatualizado nos dois pontos.
- `components/pluto/AccountCardGrid.tsx` — remoção de `md:grid-cols-2` no grid do extrato (linha 56, item 18). Sem mudança para o 2º amend: o `key` de cada bloco já é `account.id || account.name` (linha 67), então os dois blocos homônimos têm chaves distintas.
- `__tests__/app/pluto/transactions-homonimas-flow.test.tsx` — com o 2º amend há **dois** blocos "Itaú" visíveis na página; os lookups atuais usam "Nubank" (nome único — `clickCardFooter`, linha 190) e a descrição do lançamento, então permanecem verdes — mas qualquer seleção de bloco homônimo passa a exigir desambiguação por tipo/id, nunca só por nome (detalhe na seção 9; cenários 13 e 26).
- `__tests__/components/layout/ModuleLayout.test.tsx` — espelho `plutoNavItems` (linhas 34–38) atualizado para a nova ordem (D12b/ cenário 4).
- `__tests__/lib/pluto/hooks/useAccountAggregation.test.ts` — caso "ordena transações do cartão por data e id" (linhas 84–96) passa a refletir desempate por `created_at`; novos casos: mesma data + `created_at` distinto, partição conta→cartão, tolerância a `created_at` ausente; e, no 2º amend, dois blocos homônimos, roteamento por `account_id` e adaptação do caso "case-insensitive por nome" (detalhe na seção 9).
- `__tests__/app/pluto/transactions-page.test.tsx` — fixtures de transação sem `created_at` (premissa 15): ou são completadas com o campo, ou a comparação defensiva (R4) as mantém verdes — o cenário 7 cobre o comportamento exigido.
- `__tests__/components/pluto/AccountCardGrid.test.tsx` — sem asserção de classe de grid hoje; ganha verificação do cenário 16 (coluna única) conforme planejado pela Atena.
- `__tests__/app/pluto/transactions/page.test.tsx` — asserções de presença da nav (linhas 163–173) permanecem válidas; pode ganhar asserção de ordem (cenário 1).
- `__tests__/app/dashboard/page.test.tsx` — asserção `href="/pluto/budget"` no card de Pluto (linhas 76–80) passa a asserir `/pluto` (adição 1; premissa 18).
- `__tests__/app/pluto/page.test.tsx` — **novo teste** do redirect da raiz, no padrão de `__tests__/app/milon/page.test.tsx` (mock de `redirect` que registra a chamada e lança — premissa 17).
- Documentação (fase 7 — Mnemósine): `.agents/module-template.md` e/ou `AGENTS.md` ganham a norma "raiz do módulo + redirect para a aba padrão" (adição 2; D-DOC/R10) — texto final definido pela Mnemósine.
- **Intocados por decisão:** `lib/pluto/repositories/transactions.ts`, `lib/pluto/repositories/fakes/fakeTransactionRepository.ts` (D16), `components/pluto/BudgetComparisonSection.tsx` (D18), `lib/pluto/types.ts`, `lib/pluto/repositories/accounts.ts`, `lib/hestia/mascots.ts` (entrada `'/pluto'` já existe em `ROUTE_TO_MASCOT` — premissa 22), `usePlutoData`, `useBudgetComparison`, modais, checklist, saldos, migrações.

---

## 9. Testes Existentes que Podem Ser Afetados (varredura em `__tests__/`)

| Arquivo | Relação | Ação esperada |
|---|---|---|
| `__tests__/lib/pluto/hooks/useAccountAggregation.test.ts` | Caso "ordena transações do cartão por data e id" (linhas 84–96); caso "agrupamento é case-insensitive por nome da conta" (linhas 72–82) — sob o roteamento por id, quando o `account_id` casa com a conta o nome nunca é consultado, então o caso fica verde mas deixa de exercitar o que seu nome promete | Atualizar/renomear o de ordenação (item 16); adaptar o case-insensitive ao novo contrato (vale para o placeholder sem match por id — D17c, ex.: nomes em caixas diferentes sem `account_id` equivalente → mesmo bloco); novos casos: homônimos → dois blocos com conta antes do cartão (cenário 13), roteamento por `account_id` (cenário 26), partição estrutural contas→cartões (itens 16/17 + 2º amend) |
| `__tests__/components/layout/ModuleLayout.test.tsx` | Espelho da nav do Pluto (linhas 33–38) | Atualizar ordem do espelho |
| `__tests__/components/pluto/AccountCardGrid.test.tsx` | 3 testes de loading/vazio/acoes; nenhum asserta grid | Manter verdes; ganhar cenário 16 |
| `__tests__/app/pluto/transactions/page.test.tsx` | Presença dos rótulos da nav (linhas 169–171) e aba ativa (212–232); fixture tem `account_id: 'a1'` casando com a conta `a1` tipo `conta` (linhas 119 e 128) | Permanecem válidas; opcionalmente ganhar asserção de ordem; sob o 2º amend o roteamento por id resolve normalmente |
| `__tests__/app/pluto/budget/page.test.tsx` / `months/page.test.tsx` | Presença da nav + aba ativa | Permanecem válidas (ordem não é assertada) |
| `__tests__/app/pluto/transactions-page.test.tsx` | Fixtures de transação **sem** `created_at` (premissa 15; caso com 2 datas iguais) e **também sem `account_id`** (5 fixtures — premissa 24), com conta `a1` "Itaú Corrente" tipo `conta` | Risco sob item 16 — coberto por R4/cenário 7; sob o 2º amend os lançamentos caem no placeholder que acumula por nome no map de contas (D17c) → permanecem verdes, conferir na implementação |
| `__tests__/app/pluto/transactions-homonimas-flow.test.tsx` | Fixture já traz o par homônimo (linhas 77–97) e `getAccounts` com as 3 linhas (linha 104); hoje os homônimos colapsam num bloco único — com o 2º amend existem **dois** headings "Itaú". Os lookups atuais usam "Nubank" (nome único, `clickCardFooter` linha 190) e a descrição do lançamento → permanecem verdes; o helper `cardFooterButton` é por nome de cabeçalho (linhas 126–131) e ficaria ambíguo chamado com "Itaú" | Permanece verde como está; **seleção de bloco homônimo só por tipo/id** (badge "Conta"/"Cartão" no cabeçalho), nunca por nome; ganhar asserção dos cenários 13 (dois blocos, conta antes do cartão) e 26 (lançamentos roteados por id) |
| `__tests__/app/pluto/transactions-account-flow.test.tsx` | Conta + cartão cadastrados (fixture **sem** homônimos: só um "Itaú", que é conta — linhas 74–87 —, e Nubank cartão); interações por nome | Permanece verde — `clickCardFooter("Itaú")` (linha 190) segue inambíguo; revisar durante implementação (lookup por nome, sem asserção de ordem aparente) |
| `__tests__/lib/pluto/repositories/fake-transaction.test.ts` (linhas 219+) e `contract-transactions.test.ts` (critério 5, linha 241) | Ordenação do **repositório** por data + `id` | Permanecem válidas — repositório intocado (D16) |
| `__tests__/app/pluto/critical-flows.test.tsx`, `transactions-checklist*.tsx` | Fixtures com `created_at` ou listas vazias; `transactions-checklist.test.tsx` tem conta **sem `type`** (linha 89) | Permanecem verdes — a partição do 2º amend separa por `type === "cartao"` (o que não é cartão vai para o map de contas, premissa 25); `critical-flows` usa `account_id: "a1"` casando com a conta `a1` tipo `conta` (linhas 79, 147, 171, 216) → roteamento por id resolve normalmente |
| `__tests__/app/dashboard/page.test.tsx` | Assere `href="/pluto/budget"` no card de Pluto (linhas 76–80) | **Atualizar para `/pluto`** (adição 1; premissa 18) |
| `__tests__/app/milon/page.test.tsx` | Contrato do redirect da raiz da Mílon (referência) | Não alterado — serve de padrão para o novo `__tests__/app/pluto/page.test.tsx` |
| `__tests__/lib/hestia/mascots.test.ts` e `MascotProvider.test.tsx` | Usam `/pluto/budget` como exemplo de rota do módulo | Permanecem verdes — `'/pluto'` já está em `ROUTE_TO_MASCOT` (premissa 22); a rota nova não altera resolução |

---

## 10. Alternativas Consideradas (trade-offs e escolha)

**Item 16 — onde aplicar o desempate:**
- **(A) Escolhida — só no hook `useAccountAggregation`:** é o único ponto que define a ordem visível do extrato; mudança mínima, zero churn em contratos/fakes. Custo: a ordenação "crua" do repositório fica diferente da visível (sem impacto observável — premissa 6/12).
- **(B) Rejeitada — hook + repositório + fake:** consistência total, mas alteraria o contrato "critério 5" e o fake sem benefício visível (nenhum outro consumidor lê a ordem crua) — expansão de escopo.
- **((C) Rejeitada — remover o sort do hook e confiar no repositório:** impossível — o repositório não agrupa por conta; o agrupamento exige reordenar cada bloco.

**Item 17 — onde aplicar a partição:**
- **(A) Escolhida — no hook, com dois maps (2º amend):** a ordem dos blocos já nasce lá (inserção dos maps — primeiro o das contas, depois o dos cartões); mesma camada do desempate do item 16; a concatenação dos dois maps dispensa qualquer filtro de partição.
- **(B) Rejeitada — no `AccountCardGrid`:** misturaria regra de apresentação com dados; o hook é a fonte da lista ordenada.
- **(C) Rejeitada — ordenar por tipo em `getAccounts`:** reordenaria também o select de contas do modal de lançamento e qualquer outro consumidor do repositório — efeito colateral indevido (fora de escopo §7.6).
- **(D) Rejeitada no 2º amend — filtro estável de partição sobre um único map (abordagem planejada antes deste amend):** resolvia só a ordem dos blocos, não o colapso de homônimos nem a mistura conta/fatura no bloco único; os dois maps corrigem ambos os problemas e eliminam o filtro.

**Item 18 — coluna única:**
- **(A) Escolhida — remover `md:grid-cols-2` do grid do extrato:** menor diff possível; `grid-cols-1` já cobre mobile.
- **(B) Rejeitada — trocar para flex-col:** mesmo resultado visual, diff maior sem ganho.

---

## 11. Riscos e Dependências

- **R1 (risco principal):** fixtures sem `created_at` em `transactions-page.test.tsx` (premissa 15) quebrarem com o novo desempate — mitigado por R4 (comparação tolerante) e/ou completude dos fixtures; cenário 7.
- **R2:** dessincronizar o espelho `plutoNavItems` do `ModuleLayout.test.tsx` — mitigado pelo cenário 4 (atualização obrigatória do espelho).
- **R3:** confundir o grid do extrato com o do Orçado vs. Real — mitigado por D18/R8 (escopo restrito a `AccountCardGrid`).
- **R4:** testes que assumam posição fixa de blocos (conta × cartão) — varredura da seção 9 não encontrou asserção de posição (lookups são por nome); revisar `transactions-account-flow` na implementação.
- **R5:** o teste do card do dashboard (`__tests__/app/dashboard/page.test.tsx`, linhas 76–80) ficar vermelho após trocar o `href` — mitigado pela atualização prevista na seção 9 (adição 1).
- **R6:** confundir a raiz `/pluto` com uma página de conteúdo (ou esquecer o redirect) — mitigado por R9/D12c (só redirect, sem conteúdo) e pelo precedente testado da Mílon (premissa 17).
- **R7:** a norma de criação de módulos ficar apenas nesta spec sem ir para a documentação — mitigado por R10 + critério de aceite da Mnemósine (fase 7).
- **R8 (2º amend):** lookup por nome em testes de homônimos ficar ambíguo — com dois blocos "Itaú" visíveis, `getByRole("heading", { name: "Itaú" })` falha por múltiplos matches — mitigado por seleção por tipo/id (seção 9; cenários 13 e 26); os lookups atuais de `transactions-homonimas-flow` usam "Nubank"/descrição de lançamento e não mudam.
- **R9 (2º amend):** fixtures de `transactions-page.test.tsx` sem `account_id` (premissa 24) caírem em blocos errados se o roteamento por id não tiver o fallback de placeholder por nome — mitigado por D17c (acumula no bloco de mesmo nome no map de contas) + premissa 25 (partição por `type === "cartao"`); conferir na implementação.
- **Dependências:** nenhuma feature bloqueante; não bloqueia nem é bloqueada por itens do Bloco 5/6; não usa o inteiro de migração `0020` (válido também para o 2º amend — modelagem só em memória, nenhuma migração consumida). Há apenas dependência de **processo**: a Mnemósine atualiza a orientação de criação de módulos na fase 7 desta feature (adição 2) — não bloqueia coding nem testes.

---

## 12. Critérios de Aceite

- [ ] A nav do Pluto exibe as abas na ordem Lançamentos → Orçamento Anual → Meses e Períodos, com hrefs, rótulos e regra de aba ativa inalterados.
- [ ] Em qualquer página do módulo, exatamente um link tem `aria-current="page"` (deep link para cada uma das 3 URLs continua correto).
- [ ] O espelho `plutoNavItems` em `ModuleLayout.test.tsx` reflete a nova ordem.
- [ ] No extrato, lançamentos da mesma data na mesma conta aparecem na ordem de inclusão (`created_at` crescente); datas diferentes continuam em ordem cronológica crescente (critério principal intacto).
- [ ] `id` não participa mais da ordenação visível do extrato (busca por dependência antiga retorna 0 em código vivo).
- [ ] Lançamento sem `created_at` em fixture não gera erro de execução na ordenação.
- [ ] No extrato agrupado, todos os blocos `conta` vêm antes de qualquer bloco `cartao`; ordem relativa interna de cada grupo preservada (partição estrutural dos dois maps).
- [ ] Blocos placeholder ("Sem Conta" e afins) aparecem no grupo das contas (existentes apenas no map de contas).
- [ ] (2º amend) "Itaú" conta e "Itaú" cartão renderizam **DOIS blocos distintos** com o mesmo título "Itaú", o da conta antes do do cartão — sem colapso em bloco único e sem mistura de conta com fatura (cenário 13).
- [ ] (2º amend) Cada lançamento aparece apenas no bloco do seu `account_id`: o lançamento da conta homônima não cai no bloco do cartão homônimo, e vice-versa (cenário 26; R11/D17c).
- [ ] O extrato exibe um bloco abaixo do outro em qualquer largura (não há dois blocos lado a lado a partir de `md`); conteúdo interno dos blocos inalterado.
- [ ] O painel Orçado vs. Real (Receitas/Despesas) continua em 2 colunas.
- [ ] Acessar `/pluto` redireciona para `/pluto/transactions`, com "Lançamentos" como aba ativa (R9); a página raiz não tem conteúdo próprio.
- [ ] O card de Pluto no dashboard aponta para `/pluto`, e o teste `__tests__/app/dashboard/page.test.tsx` foi atualizado de `/pluto/budget` para `/pluto` e está verde.
- [ ] Deep links `/pluto/budget` e `/pluto/months` continuam funcionando normalmente (nenhuma rota existente passa a redirecionar).
- [ ] Na fase de documentação (fase 7), a Mnemósine atualiza `.agents/module-template.md` e/ou `AGENTS.md` com a norma "raiz do módulo + redirect para a aba padrão (primeira aba da nav)" (R10/D-DOC).
- [ ] Itens 13, 14, 15, 19 e 20 do backlog permanecem sem alteração; nenhuma migração criada (nenhum inteiro consumido — `0020` segue livre, inclusive após o 2º amend); nenhuma regra de domínio nova.
- [ ] Spec em texto natural, sem blocos de código (gate do guardian) e sem pontos abertos.
- [ ] Suite completa verde com cobertura ≥ 80% (gate de TESTING → REVIEW).

---

## 13. Checklist de Discovery (dimensões)

| Dimensão | Confirmação |
|---|---|
| (a) Dor, usuário e cenário real | Confirmada — 4 ajustes de uso pedidos em produção (acesso rápido à tela diária, ordem de inclusão no mesmo dia, contas antes de faturas, leitura confortável em desktop) + 2 adições aprovadas em 2026-11-14: ponto neutro `/pluto` com card da home e norma de documentação de criação de módulos (seção 1) |
| (b) Jornada passo a passo | Confirmada — navegação reordenada e raiz `/pluto` como redirect para a aba padrão (adição 1); extrato lido de cima para baixo (contas → cartões), cada bloco em coluna única (seções 2 e 6) |
| (c) Regras de dados e validações | Confirmadas — data como critério principal, `created_at` só como desempate, tolerância a ausência, agrupamento em dois maps com partição estrutural e roteamento por `account_id` (R1–R4, R5–R6, R11) |
| (d) Destrutivas e cascata | Confirmadas — nenhum item é destrutivo; nenhuma exclusão/escrita nova; sem migração (§7.2, §7.3) |
| (e) Limites e ordenação | Confirmadas — 4 itens pontuais + 2 adições pontuais (2026-11-14); repositório, Orçado vs. Real e gerador de módulos fora (D16, D18, D-DOCb) |
| (f) YAGNI explícito | Confirmado — os 11 itens da seção 7 |
| (g) Modelo de domínio | Confirmado — diagrama da seção 4 (entidades reais lidas em `types.ts`/repositórios) |
| (h) Premissas técnicas | Validadas — tabela da seção 3 com evidência em disco (26 premissas; 16–22 no 1º amend e 23–26 no 2º amend, ambos de 2026-11-14) |
| (i) Cenários de edge case | Confirmados — seção 6 (26 cenários: empates, fixtures legados, placeholders, mobile/desktop, estados vazios, ponto neutro `/pluto`, norma documental, homônimos e roteamento por `account_id` — cenário 13 literal e cenário 26 do 2º amend) |

**Validada com Humano?** Escopo dos 4 itens aprovado pelo humano na delegação de 2026-11-12 (Zeus), com instrução explícita de não expandir; **ampliado em 2026-11-14** com duas adições aprovadas pelo próprio humano (ponto neutro `/pluto` + card da home; norma de documentação de criação de módulos via Mnemósine), incorporadas nas seções 1, 2, 3, 4, 5, 6, 7, 8, 9, 11 e 12; e **reaberto no 2º amend de 2026-11-14** por decisão humana no chat — agrupamento do extrato em dois maps (contas, depois cartões) com roteamento de lançamentos por `account_id`, tornando o cenário 13 literal alcançável (D17 reescrito, D17b, D17c, R11, premissas 23–26, cenários 13/26), incorporado nas seções 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 e 13 — **pendente de novo `approve-spec`**. As decisões derivadas D12, D12b, D12c, D12d, D16, D16b, D17, D17b, D17c, D18, D-DOC e D-DOCb são consequências de mínima mudança do escopo aprovado, apresentadas de forma explícita na seção 2 para refutação no `approve-spec`. Nenhuma hipótese aberta permanece nesta spec.
