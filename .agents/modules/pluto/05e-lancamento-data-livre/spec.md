# Especificação — Patch 05e: Lançamento com Data Livre (Calendário sem Trava do Mês)

**Status:** Em Especificação (SPEC_DRAFT)
**Item do Backlog:** #26 — Lançamento com data livre (calendário sem trava do mês)
**Feature:** `pluto/05e-lancamento-data-livre` (patch da feature 5 — Cadastro de transações)
**Módulo:** Pluto (Finanças Familiares)
**Data:** 2026-11-01
**Agente:** Hera (Discovery & Spec — Olympus)

---

## 1. Dor e Objetivo (confirmado pelo humano)

Hoje, ao abrir o modal de lançamento em `/pluto/transactions`, o campo de data é travado ao mês da tela: o navegador nem deixa digitar outra data. Isso impede registrar lançamentos cujas datas são de outros períodos — o caso real é a **fatura do cartão de crédito**: você está na tela de Novembro lançando a fatura, mas as datas das compras são de Outubro (ou anteriores), e em compras parceladas podem ser até futuras.

**Objetivo desta feature:** remover a trava do calendário — **qualquer data passa a ser aceita** — mantendo o calendário **abrindo por padrão no mês que está sendo editado** e mantendo **todos os cálculos (saldo, resumo e orçado × realizado) presos ao mês da tela que está sendo editado**, nunca à data digitada.

O que muda, em uma frase: **a data vira apenas "data do cartão/extrato" (atributo de exibição e ordenação), enquanto o mês de cálculo passa a ser um dado próprio do lançamento, fixado no mês da tela onde ele foi criado.**

---

## 2. Premissas Técnicas Validadas (evidência de código lida, não inferida)

1. **A trava é apenas de interface.** O input de data do modal aplica `min` e `max` (`components/pluto/TransactionModal.tsx`, linhas 104–105), e o rótulo do campo exibe o texto "Data (Limitada a {mês}/{ano})" (linha 99 do mesmo arquivo).
2. **Os limites vêm do mês selecionado na tela.** `lib/pluto/hooks/usePlutoData.ts` (linha 183) deriva `minDateStr`/`maxDateStr` de `getMonthRange(selectedYear, selectedMonth)` e os repassa à página (`app/pluto/transactions/page.tsx`, linhas 169–170), que os injeta no modal.
3. **O formulário abre com o primeiro dia do mês da tela.** `lib/pluto/hooks/useTransactionForm.ts` (linha 59) inicializa a data com `minDateStr`.
4. **A validação de "mês aberto" hoje olha a data, não a tela.** `lib/pluto/repositories/transactions.ts` extrai ano/mês da data em criar (linha 40), editar (linha 92) e excluir (linha 152), e exige status `aberto` em `monthly_periods` para aquele ano/mês — mensagem: "Não é possível registrar transações no período {mês}/{ano} pois ele não está aberto."
5. **A agregação mensal hoje é por intervalo de datas.** `getTransactionsByMonth` (`lib/pluto/repositories/transactions.ts`) filtra pela coluna `date` entre o primeiro e o último dia do mês e ordena por `date` crescente.
6. **A tela só lista meses abertos.** `usePlutoData.ts` carrega os períodos via `getAllOpenMonthlyPeriods` e ajusta a seleção para um mês aberto — não há UI de lançamento sobre mês encerrado.
7. **O ciclo de vida do mês existe e permanece:** `monthly_periods` com status `aberto` ou `encerrado` (`lib/pluto/types.ts`; encerrar/reabrir em `lib/pluto/repositories/months.ts`).
8. **"Salvar e Adicionar Outro" (patch 05d) preserva a data** digitada e limpa descrição, valor, categoria e reembolso (`useTransactionForm.ts`).
9. **Prefill do checklist:** ao virar lançamento a partir do checklist, a data do vencimento é pré-preenchida no form (`useTransactionForm.ts`), hoje em conflito potencial com o `min`/`max` quando o vencimento cai fora do mês.
10. **O mês da tela alimenta tudo na página:** orçado × realizado (`useBudgetComparison`) e agregação por conta (`useAccountAggregation`) somam a lista de transações carregada para o mês selecionado (`app/pluto/transactions/page.tsx`) — ou seja, trocar o que a lista carrega troca automaticamente os totais.
11. **O fake espelha o repositório real:** `lib/pluto/repositories/fakes/fakeTransactionRepository.ts` reproduz filtro por intervalo e validação por data; `__tests__/integration/repositories.ts` delega ao repositório real.

---

## 3. Modelo de Domínio (diagrama textual de entidades)

**Entidade `transactions` (tabela `public.transactions`)** — campos existentes (sem mudança de significado):

- `id` (UUID, chave primária)
- `description` (texto, obrigatório) — descrição do lançamento.
- `amount` (numérico, obrigatório, maior que zero) — valor sempre positivo.
- `type` (texto: `receita` ou `despesa`).
- `is_refund` (booleano, padrão falso) — marca estorno/reembolso.
- `date` (data, obrigatória) — **passa a ser tratada como data do cartão/extrato**: só exibição, ordenação e leitura; **não** determina o mês de cálculo.
- `category_id` (FK → `categories`, restrição `RESTRICT`).
- `account_id` (FK → `financial_accounts`, restrição `RESTRICT`).
- `created_at` (timestamp, padrão de agora) / `created_by` (e-mail do usuário).

**Novos campos de `transactions` (criados por esta feature):**

- `period_year` (inteiro, obrigatório) — ano do mês da tela onde o lançamento foi criado.
- `period_month` (inteiro, obrigatório) — mês (1 a 12) do mês da tela onde o lançamento foi criado.
- Juntos formam o **mês de cálculo** do lançamento: é por eles que a tela encontra, lista e soma os lançamentos. Todo lançamento precisa ter esse par preenchido (inclusive os já existentes — ver migração na seção 5).

**Entidade `monthly_periods`** (sem mudança): identifica o ciclo de vida de cada mês (`year`, `month`, `status` = `aberto` | `encerrado`). Passa a ser a **única** referência de trava ao salvar/editar/excluir, avaliando o **mês de cálculo**, e não mais a data.

**Entidades relacionadas sem mudança:** `categories`, `financial_accounts` (com tipo `conta`/`cartao`), `budget`/ajustes de orçamento, itens do checklist de contas a pagar.

**Relacionamentos descritos:**
`transactions` pertence a uma `category` (1:N, restrição) e a uma `financial_account` (1:N, restrição); cada lançamento referencia implicitamente um mês de `monthly_periods` pelo par `period_year` + `period_month` — sem chave estrangeira nova (o vínculo é lógico, validado na gravação).

---

## 4. Decisões Tomadas e Alternativas Rejeitadas

Todas as decisões abaixo foram confirmadas explicitamente pelo humano no discovery; nenhuma foi inferida pelo agente.

1. **Mês de cálculo = mês da tela** (não a data do lançamento).
   - *Alternativa rejeitada:* contabilizar pelo mês da data do lançamento — era o que o código faria naturalmente ao só remover o `min`/`max`, e foi descartada porque a fatura de Outubro lançada na tela de Novembro deve contar em Novembro.
2. **Persistência do mês de cálculo em duas colunas novas** (`period_year` + `period_month`).
   - *Alternativa rejeitada:* uma única coluna de data guardando o primeiro dia do mês da tela — rejeitada por exigir conversão de ano/mês em data a cada filtro.
3. **Qualquer data aceita; a trava de "mês aberto" migra da data para o mês da tela.**
   - *Alternativa rejeitada:* manter uma trava parcial (só datas de meses abertos) — rejeitada por contradizer o calendário livre; a fatura de Outubro estaria bloqueada se Outubro já estivesse encerrado.
4. **Data inicial do form = primeiro dia do mês da tela** (calendário abre no mês editado; comportamento atual preservado).
   - *Alternativas rejeitadas:* data de hoje (abriria o calendário num mês que pode divergir da tela) e campo vazio (obrigaria a escolha sempre e tiraria o mês inicial do calendário).
5. **Correção de mês errado = excluir e relançar na tela certa**; a edição não altera o mês de cálculo.
   - *Alternativa rejeitada:* permitir trocar o período na edição — rejeitada por ampliar a feature e criar novos casos de mês destino aberto/encerrado.
6. **Extrato ordenado por data crescente** (mantida a ordenação atual).
   - *Alternativa rejeitada:* ordenar por ordem de criação — rejeitada por quebrar a leitura cronológica do extrato.
7. **Backfill dos lançamentos existentes copiando ano/mês da própria `date`.**
   - *Alternativa rejeitada:* deixar pendente de revisão manual — rejeitada por manter saldos indefinidos após o deploy; com o backfill, os saldos numéricos atuais permanecem idênticos, porque hoje já se soma pelo mês da data.
8. **Limites de data: livre total**, passado ou futuro, sem `min`/`max` e sem o rótulo "Limitada a".
   - *Alternativa rejeitada:* piso no passado (linha de corte antes do primeiro mês aberto) — rejeitada por criar uma exceção a lembrar.
9. **"Salvar e Adicionar Outro" preserva a data digitada** (comportamento do patch 05d mantido).
   - *Alternativa rejeitada:* resetar para o primeiro dia do mês da tela a cada item — rejeitada por obrigar a redigitar a data a cada item da mesma fatura.
10. **Fora de escopo conforme lista confirmada** (seção 7).

---

## 5. Regras de Negócio

1. **Data livre:** o campo de data do modal de lançamento não exibe `min` nem `max`, e o rótulo passa a ser simplesmente "Data". Qualquer data passada ou futura é aceita.
2. **Abertura do calendário:** ao abrir o modal para lançar, a data inicial é o primeiro dia do mês da tela; o calendário aparece aberto naquele mês. Ao trocar a data para outro mês, o calendário segue normalmente (comportamento nativo do campo de data).
3. **Gravação do mês de cálculo:** ao criar um lançamento, `period_year` e `period_month` recebem o ano e o mês **da tela onde o form foi aberto**, independentemente da data digitada.
4. **Trava de mês aberto (criar/editar/excluir):** a checagem de `monthly_periods` passa a avaliar o **mês de cálculo** gravado (hoje avalia a data). Como a tela só lista meses abertos, o lançamento normal é sempre permitido; o backend revalida de qualquer forma. A mensagem de erro mantém o formato atual, referenciando o mês de cálculo.
5. **Leitura do mês:** a lista da tela passa a buscar por `period_year` + `period_month` em vez de intervalo de `date`. Consequências já decididas: um lançamento datado de Outubro **aparece** na tela de Novembro e **não aparece** na tela de Outubro, mesmo que Outubro esteja aberto.
6. **Cálculos:** saldo do mês, cards de entradas/saídas, resultado, orçado × realizado e agregação por conta somam a lista da tela — portanto, todos passam a refletir o mês de cálculo, e **nunca** a data digitada. Nenhuma dessas telas recebe lógica própria nova.
7. **Ordenação do extrato:** por data crescente (a ordenação atual), com datas de meses diferentes convivendo na mesma tabela.
8. **Edição:** altera data, descrição, valor, tipo, reembolso, conta e categoria; o mês de cálculo **permanece o da tela onde o lançamento foi criado**. Mudar a data não move o lançamento de mês.
9. **Exclusão:** liberada para lançamentos da tela corrente, com a validação de mês de cálculo aberto.
10. **Salvar e Adicionar Outro:** preserva a data digitada; limpa descrição, valor, categoria e reembolso; foco volta ao campo descrição (05d intacto).
11. **Prefill do checklist:** a data de vencimento pré-preenchida passa a ser aceita sem conflito com limites do campo, mesmo quando cai fora do mês da tela; o mês de cálculo continua sendo o da tela.
12. **Dados existentes:** a migração preenche `period_year`/`period_month` de todos os lançamentos já gravados copiando o ano/mês da própria `date`, preservando integralmente os saldos atuais.
13. **Mês encerrado:** inalterado. A tela continua listando apenas meses abertos, e não existe caminho de UI para lançar em mês encerrado.

---

## 6. Migração de Banco de Dados

- **Tipo:** migração DDL incremental aditiva — cria as duas colunas obrigatórias em `public.transactions` e aplica o preenchimento retroativo (backfill) descrito na regra 12. Nenhuma coluna ou tabela existente é removida ou renomeada; nenhuma política RLS nova é necessária.
- **Arquivo:** `utils/migrations/migration-NNNN-pluto-<slug>.sql`, seguindo a convenção do AGENTS.md (sequência global em 4 dígitos, chave do módulo `pluto`, slug kebab-case). O AGENTS.md indica o próximo inteiro livre como `0018`; **a numeração é reservada pela Atena no `plan.md`** — esta spec não consome o inteiro.
- **Auditoria:** o script registra sua execução em `public.schema_migrations` com o nome idêntico ao do arquivo; conflito ignorado pelo nome do script.
- **Verificação pós-aplicação:** contagem de lançamentos com mês de cálculo nulo deve ser zero, e a comparação dos saldos por mês antes e depois da migração deve mostrar diferença zero.

---

## 7. Fora de Escopo (lista confirmada pelo humano)

1. Checklist de contas a pagar — nenhuma mudança de regra (só deixa de sofrer o efeito da trava na data pré-preenchida).
2. Encerramento/reabertura de mês (item 23) e histórico de meses (item 24) — ciclo de vida do mês intacto.
3. Conciliação de saldo (item 22) — não entra.
4. Compras parceladas (item 7) e transações recorrentes (item 25) — não entra.
5. Orçamento anual e ajustes (itens 1 e 2) — continuam vigendo por mês de calendário.
6. Dashboard orçado × realizado (item 21) — nenhuma alteração de código própria (só passa a receber a lista do mês de cálculo).
7. Mover lançamento de mês pela UI — descartado (correção por exclusão + relançamento).
8. Sem telas novas, sem modelo novo de contas (corrente/cartão), sem integração bancária.

---

## 8. Cenários de Edge Case (Dado / Quando / Então)

1. **Fatura de mês anterior:** Dado que a tela está em Novembro/2026 e Outubro está encerrado, Quando o usuário salvar uma despesa com data 20/10/2026, Então o lançamento é gravado com mês de cálculo Novembro/2026 e aparece no extrato, no saldo e no orçado × realizado de Novembro — sem nenhum erro por Outubro estar encerrado.
2. **Lançamento não vaza para outro mês:** Dado que Outubro também está aberto e existe um lançamento gravado pela tela de Novembro com data 05/10/2026, Quando o usuário abrir a tela de Outubro, Então aquele lançamento **não** aparece em Outubro nem em nenhum total dele.
3. **Data futura:** Dado que a tela está em Novembro/2026, Quando o usuário salvar um lançamento com data 15/03/2027, Então o lançamento é gravado e soma em Novembro/2026, com o campo de data sem nenhuma mensagem de restrição.
4. **Data muito antiga:** Dado que a tela está em Novembro/2026, Quando o usuário salvar um lançamento com data de anos anteriores ao plano, Então é aceito normalmente (livre total) e soma em Novembro/2026.
5. **Edição não move de mês:** Dado um lançamento com mês de cálculo Novembro/2026 e data 20/10/2026 exibido na tela de Novembro, Quando o usuário editá-lo e mudar a data para 25/10/2026, Então o mês de cálculo continua Novembro/2026 e o lançamento permanece na tela de Novembro.
6. **Correção de tela errada:** Dado um lançamento que deveria ser de Outubro mas foi gravado pela tela de Novembro, Quando o usuário o excluir e abrir um novo lançamento na tela de Outubro (se ela estiver aberta), Então o novo lançamento nasce com mês de cálculo Outubro/2026.
7. **Trava de mês fechado preservada:** Dado que nenhum mês está aberto ou a tela está num cenário em que o mês de cálculo não está aberto, Quando tentar salvar, Então o sistema rejeita com a mensagem atual de período não aberto, referenciando o mês de cálculo.
8. **Ordem do extrato:** Dado a tela de Novembro com lançamentos datados de 28/10, 01/11 e 05/11, Então a tabela exibe 28/10 primeiro, depois 01/11 e 05/11 (data crescente).
9. **Salvar e Adicionar Outro:** Dado o modal aberto em Novembro com data digitada 20/10/2026, Quando o usuário salvar e adicionar outro, Então o modal permanece aberto com a data ainda em 20/10/2026 e descrição/valor/categoria/reembolso limpos.
10. **Abrir do modal:** Dado a tela de Novembro/2026, Quando o usuário clicar em novo lançamento, Então o campo de data vem com 01/11/2026 e o calendário aparece aberto em Novembro/2026.
11. **Prefill do checklist:** Dado um item do checklist com vencimento em data de outro mês, Quando o usuário gerar o lançamento a partir dele, Então a data vêm pré-preenchida sem conflito com limites do campo e o mês de cálculo é o da tela.
12. **Backfill sem mudança de saldo:** Dado o banco com lançamentos existentes, Quando a migração for aplicada, Então todos recebem mês de cálculo igual ao ano/mês da sua data e os totais por mês permanecem numericamente idênticos aos de antes.
13. **Exclusão:** Dado um lançamento na tela de Novembro, Quando o usuário excluí-lo, Então a exclusão é validada pelo mês de cálculo (Novembro aberto) e remove o registro.

---

## 9. Pontos de Impacto na Codebase (para orientar o plano — sem decisão de implementação)

- `components/pluto/TransactionModal.tsx` — remoção dos atributos de limite do campo de data e do rótulo "Limitada a"; revisão das propriedades de limites/rótulo que deixam de ter uso.
- `lib/pluto/hooks/usePlutoData.ts` — a derivação dos limites de data para a UI deixa de ser usada; a busca do mês passa a refletir o mês de cálculo.
- `lib/pluto/hooks/useTransactionForm.ts` — envio do mês da tela junto ao salvamento; validações de campo permanecem; data inicial e preservação no "Salvar e Adicionar Outro" inalteradas.
- `lib/pluto/repositories/transactions.ts` — busca do mês por mês de cálculo em vez de intervalo de data; validação de `monthly_periods` sobre o mês de cálculo em criar/editar/excluir.
- `lib/pluto/repositories/fakes/fakeTransactionRepository.ts` e `__tests__/integration/repositories.ts` — espelhamento do mesmo contrato (fakes e contrato mudam em conjunto).
- `app/pluto/transactions/page.tsx` — deixa de repassar limites de data ao modal; totais e agregações herdam a nova lista sem lógica própria.
- Testes existentes que fixam o comportamento atual (`__tests__/lib/pluto/repositories/contract-transactions.test.ts`, `fake-transaction.test.ts`, `db/transactions.test.ts`, `usePlutoData.test.ts`, `useTransactionForm.test.ts`, `__tests__/app/pluto/transactions*`, `critical-flows.test.tsx`) — ajustados para o novo contrato pelo plano.
- `lib/shared/date.ts` (`getMonthRange`, `parseYearMonth`) — verificar no plano quais usos restam após a mudança; nenhuma remoção é determinada por esta spec.

---

## 10. Critérios de Aceite

- [ ] O campo de data do modal não tem `min` nem `max`, e nenhuma mensagem de limitação aparece no rótulo.
- [ ] Abrir o modal pela tela de um mês pré-preenche o primeiro dia desse mês e o calendário abre nele.
- [ ] É possível gravar lançamento com data de qualquer mês, passado ou futuro, pela tela de qualquer mês aberto.
- [ ] Ao criar, `period_year`/`period_month` recebem o ano/mês da tela, independentemente da data digitada.
- [ ] A lista da tela e todos os totais (entradas, saídas, resultado, saldo, orçado × realizado, agregação por conta) refletem o mês de cálculo, nunca a data.
- [ ] Um lançamento datado em outro mês não aparece na tela do mês da sua data.
- [ ] A validação de "mês aberto" em criar/editar/excluir usa o mês de cálculo e mantém a mensagem atual.
- [ ] A edição não altera o mês de cálculo; não há UI para mover lançamento de mês.
- [ ] O extrato segue ordenado por data crescente, com datas de meses diferentes na mesma tabela.
- [ ] "Salvar e Adicionar Outro" preserva a data digitada; demais resets do 05d intactos.
- [ ] O prefill do checklist não sofre conflito de limites de data.
- [ ] A migração cria as duas colunas, preenche todos os lançamentos existentes a partir da `date` e audita em `public.schema_migrations`; saldo por mês idêntico antes e depois.
- [ ] Mês encerrado segue inacessível para lançamento pela UI; ciclo de vida do mês intocado.
- [ ] Spec 100% em texto natural, sem blocos de código (gate do guardian).
- [ ] Suite completa verde com cobertura ≥ 80% (gate de TESTING → REVIEW).

---

## 11. Checklist de Discovery (todas as dimensões confirmadas pelo humano)

| Dimensão | Confirmação |
|---|---|
| Dor / usuário | Confirmada — trava do calendário impede lançar faturas/extratos com datas de outros períodos; cálculos devem ficar no mês da tela |
| Jornada | Confirmada — abrir modal com 1º dia do mês da tela, digitar qualquer data, salvar, ver no extrato/totais do mês da tela; "Salvar e Adicionar Outro" preserva data; correção por excluir e relançar |
| Validações | Confirmadas — qualquer data aceita; trava de mês aberto só sobre o mês de cálculo, mantida no banco |
| Destrutivas / cascata | Confirmadas — migração aditiva com backfill que preserva saldos; nenhuma exclusão/renomeação de dado; RLS intacta; exclusão de lançamento validada pelo mês de cálculo |
| Limites | Confirmados — livre total (qualquer data); sem telas novas; sem modelo de conta novo; sem integração bancária |
| YAGNI | Confirmado — os 8 pontos da seção 7 fora de escopo; nenhuma regra nova além das seções 4 e 5 |

**Validada com Humano? Sim** — as 6 dimensões do checklist acima e as 10 decisões da seção 4 foram confirmadas pelo humano, uma por turno, no discovery encerrado em 2026-11-01; nenhuma confirmação adicional foi inventada nesta spec.
