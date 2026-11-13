# Especificação — Categorias e Contas sem Distinção de Caixa e Acentos

**Status:** Em Especificação (SPEC_DRAFT)
**Item do Backlog:** #11 — Categorias sem distinção de maiúsculas/minúsculas
**Feature:** `pluto/11-categorias-sem-distincao-caixa`
**Módulo:** Pluto (Finanças Familiares)
**Data:** 2026-11-07
**Agente:** Hera (Discovery & Spec — Olympus)

---

## 1. Dor e Objetivo

Na pressa, você digita "mercado" numa hora e "Mercado" noutra: o salvamento de categoria (e de conta) hoje só tira os espaços das pontas e compara o nome com igualdade exata (`lib/pluto/repositories/categories.ts`, linhas 22–27; `lib/pluto/repositories/accounts.ts`, linhas 26–33), então **caixa diferente vira categoria/conta nova**. O acento piora o caso — "Alimentação" e "alimentacao" nunca se encontram — e a colagem traz o "é" em forma composta ou decomposta, que o olho não distingue mas a igualdade exata distingue. As duplicatas se acumulam no orçamento, no extrato e no checklist, e a suite não pega o problema porque os fakes dos testes já comparam sem caixa (`lib/pluto/repositories/fakes/fakeCategoryRepository.ts`, linha 47; `fakeAccountRepository.ts`, linha 40; casos `ALIMENTAÇÃO`/`alimentação` e `ITAU`/`itau` em `__tests__/lib/pluto/repositories/fake-category.test.ts`, linhas 69–70, e `fake-account.test.ts`, linhas 57–58) — o backlog do módulo aponta isso como "esconde a duplicação da suite".

Há um segundo efeito colateral, do mesmo defeito: a busca por nome **não filtra o tipo**, então um nome idêntico ao de uma categoria do outro tipo devolve o id da linha errada (o lançamento recebe uma categoria de tipo trocado), e o banco — que hoje tem trava de nome única e global — simplesmente recusa a criação homônima com erro cru.

**Objetivo desta feature:** a identidade de `categories` e de `financial_accounts` passa a ser **(nome normalizado, tipo)**, com normalização que **ignora caixa, acentos e a forma Unicode do texto colado**; as duplicatas já existentes são **consolidadas uma única vez** em migração; a trava passa a valer essa mesma regra no banco; e a interface só se alinha a isso (sugestões que casam com a regra e a grafia da homônima copiada no blur) — **sem filtro de Camel Case, sem reescrita de nomes, sem aviso novo**.

---

## 2. Premissas Técnicas Validadas (evidência lida em disco, não inferida)

| # | Premissa | Confirmação | Evidência em disco |
|---|---|---|---|
| 1 | `categories.name` tem trava de unicidade **global** (vale para os dois tipos) e `type` é `receita`/`despesa` | ✅ Sim | `utils/migrations/migration-feature-1.sql`, linhas 4–5 |
| 2 | `financial_accounts.name` tem trava de unicidade **global** e `type` é `conta`/`cartao` | ✅ Sim | `utils/migrations/migration-feature-5c-financial-accounts.sql`, linhas 6–7 |
| 3 | `transactions.category_id` referencia `categories` com `ON DELETE RESTRICT` | ✅ Sim | `utils/migrations/migration-feature-5.sql`, linha 17 |
| 4 | `budget_items.category_id` referencia `categories` com `ON DELETE RESTRICT`, e existe trava de unicidade de (ajuste, categoria) | ✅ Sim | `migration-feature-1.sql`, linha 25; `migration-feature-2a-nomenclatura.sql`, linhas 54–56 (a trava antiga de (revisão, categoria) foi removida na linha 36) |
| 5 | `checklist_items.category_id` referencia `categories` com `ON DELETE RESTRICT` (terceiro ponteiro) e **não** tem trava de unicidade sobre categoria | ✅ Sim (D18) | `utils/migrations/migration-feature-4-checklist.sql`, linha 9; nenhuma trava única sobre essa coluna em `utils/migrations` |
| 6 | `transactions.account_id` referencia `financial_accounts` com `ON DELETE RESTRICT` — único referenciador de contas | ✅ Sim | `migration-feature-5c-financial-accounts.sql`, linhas 26–28; varredura de `REFERENCES` em `utils/migrations` |
| 7 | O salvamento de categoria faz trim + igualdade exata e **não filtra tipo** | ✅ Sim | `lib/pluto/repositories/categories.ts`, linhas 22–27 |
| 8 | O salvamento de conta faz trim + igualdade exata e **não filtra tipo** | ✅ Sim | `lib/pluto/repositories/accounts.ts`, linhas 26–33 |
| 9 | Os fakes de categoria e de conta já comparam sem caixa (e o de categoria filtra tipo), divergindo do repositório real | ✅ Sim | `fakeCategoryRepository.ts`, linha 47; `fakeAccountRepository.ts`, linha 40 |
| 10 | A datalist do modal de lançamento recebe a lista de categorias sem filtro de tipo | ✅ Sim | `components/pluto/TransactionModal.tsx`, linhas 207–211; `lib/pluto/hooks/usePlutoData.ts`, linha 133 (chamada sem tipo) |
| 11 | A lista de sugestões do orçamento filtra por tipo e exclui o nome já digitado por igualdade exata sem caixa | ✅ Sim | `lib/pluto/hooks/useBudgetItemEditor.ts`, linhas 61–66 |
| 12 | O campo de conta do lançamento é um select quando há contas e texto livre quando não há — **não existe lista de sugestão de contas** a alinhar | ✅ Sim | `TransactionModal.tsx`, linhas 105–129 |
| 13 | O formulário do checklist só **seleciona** categoria existente por id (não cria por texto) | ✅ Sim | `components/pluto/ChecklistItemFormModal.tsx`, linhas 151–152 |
| 14 | Nenhuma view, função ou trigger declarada em `utils/migrations` sobre as tabelas afetadas | ✅ Sim | varredura por `CREATE VIEW` / `CREATE FUNCTION` / `CREATE TRIGGER` em `utils/migrations` |
| 15 | Disponibilidade da função de remover acento no banco **não é assumida** | ✅ Sim (decisão D15) | — (por decisão: tentar habilitar na 0019 e falhar alto se indisponível) |

**Validada com Humano? Sim** — a tabela acima, o diagrama da seção 3 e o mapeamento das dimensões (a)–(i) das decisões D1–D17 foram apresentados como texto no chat e confirmados com a resposta verbatim "sim" em 2026-11-07 (repassada pelo Zeus), que também validou os dois pontos novos hoje fechados: **D18** (`checklist_items` no reapontamento) e **D19** (chave da trava = par nome normalizado + tipo).

---

## 3. Modelo de Domínio (diagrama textual de entidades)

**Entidade `categories`** — `id` (chave primária), `name` (texto, obrigatório), `type` (`receita` | `despesa`), `created_at` (padrão de agora), `created_by` (e-mail). *Identidade nova: (nome normalizado, tipo).*

**Entidade `financial_accounts`** — `id`, `name` (texto, obrigatório), `type` (`conta` | `cartao`), `created_at`, `created_by`. *Identidade nova: (nome normalizado, tipo).*

**Entidades que apontam para `categories`** (todas com restrição `RESTRICT`, ou seja, impedem o DELETE direto):

- `transactions` → `category_id` (1:N)
- `budget_items` → `category_id` (1:N), com trava de unicidade de (ajuste, categoria)
- `checklist_items` → `category_id` (1:N), sem trava de unicidade sobre a categoria

**Entidade que aponta para `financial_accounts`:**

- `transactions` → `account_id` (1:N)

**Relação de identidade (o cerne da feature):** duas linhas de `categories` são a **mesma categoria** quando o par (nome normalizado, tipo) coincide; idem para `financial_accounts` com `conta`/`cartao`. Nomes iguais com tipos diferentes **não** são a mesma linha — são homônimas permitidas (hoje a trava global de nome impede isso; a 0019 passa a permitir, e a UI trata a grafia — regra R7).

**Estado atual das travas (por que a migração é necessária):** hoje a trava é só do nome, global e sem normalização — mais estrita que a identidade em um eixo (impede homônimas de tipos diferentes) e mais frouxa em outro (deixa passar "Mercaria" e "mercaria" como linhas distintas).

---

## 4. Decisões Tomadas e Alternativas Rejeitadas

Todas abaixo foram confirmadas pelo humano no discovery (D1–D17 nos turnos 2–12 de 2026-11-06; D18–D19 com o "sim" de 2026-11-07). Nenhuma foi inferida pelo agente.

1. **Consolidação das duplicatas já existentes na migração** (D1) — reatribuir os lançamentos da perdedora para a vencedora e remover a que ficou fora do padrão. *Rejeitado:* deixar as duplicatas para limpeza manual.
2. **Sem filtro de Camel Case em nenhuma etapa; o nome salvo é o texto cru digitado** (D2) — inclui a correção das duplicatas já existentes em produção. *Rejeitado:* aplicar filtro Camel Case na criação ou reescrever o legado.
3. **Sobrevive a categoria mais usada, com desempate pelo menor `created_at` (mais antiga)** (D3) — linhas de `budget_items` da perdedora são reatribuídas; em colisão de unicidade, mantém a linha da sobrevivente. *Rejeitado:* outra ordem de precedência (a escolha humana foi a alternativa "mais usada").
4. **Identidade = nome + tipo; comparação e consolidação só entre linhas do mesmo tipo** (D4).
5. **Homonima do outro tipo: cópia automática da grafia no campo, sem aviso visível** (D5). *Rejeitado:* aviso/banner embaixo do campo.
6. **O momento da cópia da grafia é no blur do campo** (D6). *Rejeitado:* cópia a cada tecla (limaria o que o usuário digita) e cópia só ao salvar.
7. **Contas entram nesta versão** (D7, reforçado em D17).
8. **Comparação = caixa + acentos ignorados** (D8): "Alimentação" = "alimentação" = "ALIMENTAÇÃO"; "Salário" = "salario"; inclui o caso da colagem (é composto = é decomposto). As travas do banco passam a usar a mesma regra.
9. **Destino da perdedora = exclusão de verdade** (D9) — apagar a linha depois de reapontar os apontadores. *Rejeitado:* coluna nova marcando a perdedora (soft delete) — sem coluna nova e sem desfazer.
10. **Trava normalizando no banco** (D10) — a trava passa a comparar o nome já normalizado.
11. **Uma única migração 0019** (D11) — fundição e troca de trava na mesma ordem e no mesmo arquivo; fundição **antes** da trava, porque a trava nova falharia se ainda houvesse duplicatas. *Rejeitado:* duas migrações separadas.
12. **Corrida de inserção: tentar ler de novo** (D12) — se o insert perder por trava de duplicata (outra aba criou antes), relê e devolve a já criada; o usuário não percebe. *Rejeitado:* devolver erro ao usuário.
13. **UI: só alinhar as sugestões** (D13) — datalist do lançamento e lista do orçamento casam com a regra de caixa + acentos, então a variante aparece e o usuário escolhe o nome original. *Rejeitado:* aviso novo embaixo do campo.
14. **Contas e cartões com o mesmo padrão** (D14/D17): mesma regra de caixa + acentos, mesma troca de trava, mesma fundição das duplicatas, comparação por tipo no salvamento de conta — "um padrão só para tudo" entre `categories` e `financial_accounts`.
15. **Acento no banco: tentar na 0019 e falhar alto** (D15) — tenta habilitar a função de remover acento e cria a trava com ela; se o banco não tiver, a migração falha com erro claro e o humano decide o plano B na hora. *Rejeitado:* decidir um plano B antecipado.
16. **Rollback da 0019 = tudo ou nada** (D16) — transação própria que só confirma no final; qualquer falha desfaz tudo, sem estado meio-aplicado.
17. **Escopo final: contas e cartões** (D17).
18. **`checklist_items` entra no reapontamento da fundição** (D18) — terceiro ponteiro, também `RESTRICT`; sem ele, o DELETE da perdedora derruba a transação inteira.
19. **Chave da trava nova = (nome normalizado, tipo) nas duas tabelas** (D19). *Rejeitado:* trava global só do nome normalizado — colidiria com homônimas dos dois tipos (justo o caso que D5/D6 da UI pressupõe) e faria a própria 0019 falhar em pares cross-type existentes.

---

## 5. Regras de Negócio (comportamento)

- **R1 — Normalização (D8).** Para comparar nomes de categoria e de conta, o texto é tratado ignorando **caixa** e **acentos**, e considerando a **mesma forma Unicode** independentemente de o texto ter sido digitado ou colado (é em forma composta e em forma decomposta são o mesmo nome). O texto **salvo** continua sendo o cru, digitado pelo usuário (D2).
- **R2 — Identidade (D4/D17/D19).** Duas linhas são a mesma quando (nome normalizado, tipo) coincide: `receita` com `receita`, `despesa` com `despesa`, `conta` com `conta`, `cartao` com `cartao`. Homônimas de tipos diferentes são linhas distintas e ambas válidas.
- **R3 — Nome salvo cru (D2).** Nenhum filtro de Camel Case em criação nem em reescrita de legado; nenhuma renomeação de dado existente fora da fusão.
- **R4 — Salvamento (getOrCreate) de categoria e de conta (D4/D8/D12/D17).** Primeiro procura linha existente com o mesmo **tipo** e o mesmo **nome normalizado**; se encontrar, devolve aquela linha; senão, cria com o texto cru e o tipo informado. Se a criação perder a corrida para outra aba (trava de duplicata), **relê e devolve a linha já criada**, sem erro visível — regra única para categorias e para contas.
- **R5 — Trava no banco (D10/D19).** Nas duas tabelas, a trava de unicidade de nome é substituída pela trava sobre **(nome normalizado, tipo)**: passa a ser impossível gravar duas linhas do mesmo tipo cujos nomes coincidam sob a normalização de R1, e passa a ser possível a mesma grafia em tipos diferentes.
- **R6 — Sugestões alinhadas (D13).** A datalist do campo de categoria do lançamento e a lista de sugestões do campo de categoria do orçamento passam a casar com a regra de R1: digitando uma variante ("alimentacao"), a categoria existente ("Alimentação") aparece entre as sugestões e, ao escolhê-la, o campo recebe o nome original. Nenhum aviso novo é adicionado abaixo do campo. Não há lista de sugestão de contas hoje e nenhuma é criada (o campo é select quando há contas, texto livre quando não há).
- **R7 — Homônima do outro tipo no blur (D5/D6).** Nos campos de categoria que aceitam texto livre (lançamento e orçamento), se ao perder o foco existir categoria do **outro tipo** com nome igual sob a normalização de R1, o campo assume automaticamente a grafia da linha existente — sem aviso, sem mensagem, sem bloqueio. O objetivo é as duas linhas terminarem com a mesma grafia.
- **R8 — Consolidação (D1/D3/D9/D18).** Na migração, para cada grupo de linhas do mesmo tipo com (nome normalizado) coincidente: **sobrevive a mais usada** — maior contagem de linhas que apontam para ela nas três tabelas dependentes (lançamentos, itens de orçamento, itens de checklist); **empate → vence a menor `created_at`** (mais antiga). Em seguida reaponta-se tudo para a sobrevivente e **exclui-se a perdedora** (exclusão de verdade, sem coluna nova e sem desfazer).
- **R9 — Reapontamento completo (D18/D9).** Antes de qualquer exclusão: `transactions.category_id`, `budget_items.category_id` e `checklist_items.category_id` apontam para a sobrevivente; para contas, `transactions.account_id`. Em `budget_items`, quando a reatribuição colidir com a trava de (ajuste, categoria), **prevalece a linha da sobrevivente** — a da perdedora não é reapontada nem somada. Nenhum outro campo (valor, data, descrição, tipo) é alterado.
- **R10 — Ordem e atomicidade da migração (D11/D15/D16).** Fundição primeiro, troca das travas depois, tudo numa única migração `0019` e numa única transação: ou aplica inteiro, ou aplica nada. Antes de criar a trava nova, tenta habilitar a função de remover acento; se indisponível, a migração **falha com erro claro** e nada é aplicado.
- **R11 — Checklist (D18).** O formulário do checklist continua apenas selecionando categoria existente; a única mudança que o atinge é o reapontamento da migração.

---

## 6. Migração de Banco de Dados (0019)

- **Tipo:** migração DDL incremental que faz **fusão de dados + troca de trava**, nas duas tabelas (`categories` e `financial_accounts`). Nenhuma tabela ou coluna nova; nenhum dado é renomeado ou reescrito — só ponteiros mudam de destino e linhas perdedoras são excluídas.
- **Arquivo:** `utils/migrations/migration-0019-pluto-<slug kebab-case>`, seguindo a convenção do AGENTS.md (inteiro global `0019`, chave do módulo `pluto`, sem sufixo de versão). O inteiro `0019` já está reservado e registrado no `context.json` desta feature; o slug descritivo é definido no plano pela Atena.
- **Ordem obrigatória (D11):** (1) fundir as duplicatas — reapontar `transactions.category_id`, `budget_items.category_id`, `checklist_items.category_id` e, para contas, `transactions.account_id`, depois excluir as perdedoras; (2) em seguida substituir a trava de unicidade do nome pelas travas de **(nome normalizado, tipo)** nas duas tabelas. A fundição vem antes porque a trava nova falharia se ainda existissem duplicatas.
- **Pré-requisito de acento (D15):** tenta habilitar a função de remover acento no banco; se não estiver disponível, aborta com erro claro e nada é aplicado — o humano decide o plano B na hora, sem plano B previsto nesta spec.
- **Atomicidade (D16):** transação própria que só confirma no final; qualquer falha desfaz tudo e o banco fica exatamente como estava, re-executável depois de corrigir.
- **Auditoria:** o script registra sua execução em `public.schema_migrations` com o nome de arquivo idêntico ao aplicado, conflito ignorado pelo nome do script (regra do AGENTS.md).
- **Verificação pós-aplicação:** nenhum par de linhas do mesmo tipo com (nome normalizado) coincidente nas duas tabelas; contagem de linhas por categoria/conta antes e depois idêntica (só o ponteiro mudou); nenhum ponteiro órfão; total de linhas em `transactions`, `budget_items` e `checklist_items` inalterado, exceto as linhas de `budget_items` descartadas por colisão (R9).

---

## 7. Fora de Escopo (YAGNI)

1. **Sem coluna nova, sem soft delete, sem desfazer a fusão** (D9) — a exclusão é definitiva.
2. **Sem aviso de homônima e sem aviso novo embaixo de campo** (D5, D13).
3. **Sem filtro de Camel Case e sem reescrita da grafia de nomes existentes** (D2) — a fusão muda ponteiro, não nome; sobrevive a grafia da linha vencedora.
4. **Sem plano B de acento decidido agora** (D15) — falha alta e decisão humana na hora.
5. **Sem estado meio-aplicado da migração** (D16).
6. **Sem regra nova para outras tabelas** além de `categories` e `financial_accounts` (D14 — um padrão só para essas duas).
7. **Sem alteração do fluxo do checklist** além do reapontamento da migração (D18).
8. **Sem lista de sugestão de contas nova** — não existe hoje e D13 listou só as duas listas de categoria.
9. **Sem ferramenta de fusão manual, sem tela nova, sem importação/exportação de categorias, sem renomeação em massa** — nenhum foi pedido e nenhum é necessário para resolver a dor.
10. **Sem mudança de cálculos, telas, relatórios ou RLS** — saldo, orçado × realizado, overflow e agregações continuam como estão.

---

## 8. Cenários de Edge Case (Dado / Quando / Então)

1. **Caixa:** Dado que existe a categoria "Mercaria" (despesa), Quando o usuário criar "mercaria" (despesa), Então nenhuma linha nova é criada — o salvamento devolve a categoria "Mercaria" existente.
2. **Acento:** Dado que existe "Alimentação" (despesa), Quando o usuário criar "alimentacao" ou "ALIMENTAÇÃO" (despesa), Então é a mesma categoria; a linha gravada permanece com a grafia original "Alimentação".
3. **Colagem (Unicode):** Dado que existe "Alimentação" (despesa), Quando o usuário colar "Alimentação" com o "é" em outra forma de composição, Então é a mesma categoria — a normalização iguala as duas formas.
4. **Identidade por tipo:** Dado que existe "Salário" (receita), Quando o usuário criar "salário" como despesa, Então uma **nova** linha despesa é criada (não se reaproveita a receita) e a busca por nome considera o tipo.
5. **Homonima no blur:** Dado que existe "Mercado" (receita) e o campo de categoria do lançamento está em uma despesa com "mercado" digitado, Quando o campo perder o foco, Então ele assume a grafia "Mercado" automaticamente, sem aviso e sem bloqueio.
6. **Corrida entre abas:** Dado que duas abas criam a mesma categoria ao mesmo tempo, Quando o insert de uma delas perder para a trava de duplicata, Então ela relê, devolve a linha já criada e o salvamento segue normal — o usuário não vê erro.
7. **Fusão com três apontadores:** Dado que "Mercaria" e "mercaria" (despesa) existem e ambas têm lançamentos, itens de orçamento e itens de checklist, Quando a migração rodar, Então tudo passa a apontar para a vencedora e a perdedora é excluída — nenhum lançamento, item de orçamento ou item de checklist é perdido ou bloqueado pelo DELETE.
8. **Escolha da sobrevivente:** Dado um grupo com uma linha com 3 apontadores e outra com 5, Então sobrevive a de 5; Dado um grupo em que as duas têm a mesma contagem, Então sobrevive a de menor `created_at` (a mais antiga).
9. **Colisão no orçamento:** Dado que vencedora e perdedora têm item de orçamento no mesmo ajuste, Então a linha da sobrevivente permanece com o valor que já tinha e a da perdedora é descartada junto com ela (não é somada).
10. **Rollback:** Dado que qualquer etapa da migração falhar (inclusive por falta da função de acento), Quando a transação desfaz, Então `categories`, `financial_accounts` e todas as tabelas dependentes ficam exatamente como antes, sem linha excluída à metade e sem trava nova a meio caminho; a correção permite re-executar.
11. **Migração legada:** Dado o banco de produção com duplicatas por caixa/acentos, Quando a 0019 for aplicada, Então as duplicatas desaparecem, os nomes permanecem com a grafia da vencedora e nenhuma tela mostra item duplicado em seguida.
12. **Sugestões do lançamento:** Dado que existe "Alimentação" (despesa), Quando o usuário digitar "alimentacao" no campo de categoria do lançamento, Então "Alimentação" aparece na lista de sugestões e, ao escolhê-la, o campo recebe "Alimentação".
13. **Sugestões do orçamento:** Dado que existe "Alimentação" (despesa) e o usuário digita "alimen" no formulário de previsão, Então "Alimentação" aparece entre as sugestões (mesma regra de caixa + acentos), mantida a exclusão atual do nome já digitado exatamente.
14. **Estado vazio:** Dado que não há nenhuma categoria criada, Quando o usuário digitar um nome e salvar, Então a categoria é criada e aparece nas listas — comportamento de criação em branco inalterado.
15. **Falha de rede:** Dado que a busca inicial falhar por rede, Então o formulário mantém o tratamento de erro atual (mensagem visível e modal de lançamento não fecha em silêncio) — sem comportamento novo.
16. **Trava nova com homônimas:** Dado que existem "Mercado" (receita) e "Mercado" (despesa) após a migração, Quando qualquer uma for consultada, Então cada retorno respeita o tipo pedido, sem ambiguidade para a busca.

---

## 9. Pontos de Impacto na Codebase (orientação de plano — sem decisão de implementação)

- `lib/pluto/repositories/categories.ts` — busca do getOrCreate passa a normalizar e filtrar por tipo; tratamento da corrida (relê e devolve a já criada).
- `lib/pluto/repositories/accounts.ts` — mesmo padrão para contas.
- `lib/pluto/repositories/fakes/fakeCategoryRepository.ts` e `fakeAccountRepository.ts` — alinhamento à regra completa (caixa + acento + tipo), hoje parcial.
- `components/pluto/TransactionModal.tsx` — datalist do campo de categoria passa a casar com a regra de normalização.
- `components/pluto/BudgetForecastForm.tsx` + `lib/pluto/hooks/useBudgetItemEditor.ts` — lista de sugestões com a mesma regra; cópia da grafia homônima no blur do campo.
- `lib/pluto/hooks/useTransactionForm.ts` — ponto de aplicação da cópia no blur do campo de categoria.
- `utils/migrations/migration-0019-pluto-<slug>.sql` — nova (fusão + troca de travas, ordem da seção 6).
- `__tests__/lib/pluto/repositories/` — contratos e fakes espelhando a regra; casos já existentes de caixa (linhas 69–70 do fake-category e 57–58 do fake-account) permanecem válidos e ganham casos de acento, tipo e corrida.
- `lib/pluto/db/` — barreiras oficiais da UI continuam apontando para os repositórios; nenhum consumidor novo fora disso.

---

## 10. Critérios de Aceite

- [ ] Criar "mercaria" com "Mercaria" já existente (mesmo tipo) devolve a categoria existente; nenhuma linha nova é criada.
- [ ] Criar "alimentacao" com "Alimentação" existente devolve a existente; idem para "ALIMENTAÇÃO" e para o "é" colado em forma diferente.
- [ ] Nome igual com tipo diferente cria linha própria (não devolve a categoria do outro tipo).
- [ ] O nome gravado é sempre o texto cru digitado, sem filtro de Camel Case e sem reescrita de legado.
- [ ] A trava do banco impede duas linhas do mesmo tipo com nomes iguais sob a normalização, e permite a mesma grafia em tipos diferentes — nas duas tabelas.
- [ ] Corrida de criação: o insert perdedor relê e devolve a linha já criada, sem erro visível (categorias e contas).
- [ ] Ao digitar uma variante da grafia, a datalist do lançamento e a lista do orçamento mostram a categoria existente e a escolha preenche o nome original; nenhum aviso novo aparece abaixo do campo.
- [ ] No blur de um campo de categoria com homônima do outro tipo, o campo assume a grafia da existente, sem aviso.
- [ ] A migração 0019 funde duplicatas das duas tabelas reapontando `transactions`, `budget_items` e `checklist_items` (e `transactions.account_id` para contas), escolhendo a mais usada com desempate mais antiga, e só então troca as travas.
- [ ] Em colisão de unicidade no orçamento prevalece a linha da sobrevivente.
- [ ] A migração é tudo ou nada: qualquer falha deixa o banco exatamente como estava e ela é re-executável.
- [ ] Sem a função de acento disponível, a migração falha com erro claro e nada é aplicado.
- [ ] Após a migração: zero pares do mesmo tipo com (nome normalizado) coincidente; contagem de linhas dependentes inalterada (exceto colisão de orçamento descrita).
- [ ] Formulário do checklist inalterado; contas e cartões seguem o mesmo padrão de categorias.
- [ ] Spec em texto natural, sem blocos de código (gate do guardian) e sem pontos abertos.
- [ ] Suite completa verde com cobertura ≥ 80% (gate de TESTING → REVIEW).

---

## 11. Checklist de Discovery (dimensões confirmadas pelo humano)

| Dimensão | Confirmação |
|---|---|
| (a) Dor, usuário e cenário real | Confirmada — na pressa o usuário digita variações de caixa/acentos e cria duplicatas; as já existentes precisam ser consolidadas (D1/D2) |
| (b) Jornada passo a passo | Confirmada — digita no campo de categoria/conta do lançamento ou do orçamento, sugestões casam com a regra, blur copia a grafia homônima, salva sem erro (D5/D6/D13) |
| (c) Regras de dados e validações | Confirmadas — identidade (nome normalizado, tipo), texto cru salvo, retry na corrida (D4/D8/D12/D17) |
| (d) Destrutivas e cascata | Confirmadas — exclusão de verdade da perdedora depois de reapontar `transactions`, `budget_items` e `checklist_items`; transação tudo ou nada (D9/D16/D18) |
| (e) Limites e ordenação | Confirmadas — uma migração `0019` só, fundição antes da trava, sobrevivente mais usada com desempate mais antiga (D3/D11) |
| (f) YAGNI explícito | Confirmado — os 10 itens da seção 7 |
| (g) Modelo de domínio | Confirmado — diagrama da seção 3 apresentado e aprovado com o "sim" de 2026-11-07 |
| (h) Premissas técnicas | Validadas — tabela da seção 2 com evidência em disco, aprovada com o "sim" de 2026-11-07 |
| (i) Cenários de edge case | Confirmados — seção 8 (estados vazios, erros, concorrência, migração legada, rollback) |

**Validada com Humano? Sim** — as 9 dimensões acima, as 19 decisões da seção 4 e os dois pontos novos (D18 e D19) foram confirmados pelo humano com a resposta verbatim "sim" em 2026-11-07; nenhuma confirmação adicional foi inventada nesta spec.
