# Backlog — Módulo Pluto (Finanças Familiares)

## Contexto do módulo

- **Stack:** Next.js hospedado na Vercel, banco de dados Supabase.
- **Usuários:** 2 (login individual já implementado, vinculado à mesma família).
- **Moeda:** somente BRL.
- **Modelo de orçamento:** planejamento anual por categoria, com acompanhamento mensal. Ajustes no orçamento valem a partir do mês editado em diante — meses passados nunca são alterados.
- **Categorias e Contas** não são features independentes: são agregadores simples (nome + auditoria automática de criação) que nascem "inline", dentro da primeira feature que precisa deles. Categoria nasce dentro do Orçamento anual; Conta nasce dentro do Cadastro de transações.
- **Cartão de crédito e conta corrente** são tratados da mesma forma: ambos são apenas "contas" (agrupadores de lançamentos), sem modelagem especial para cada tipo.
- **Checklist de contas a pagar** é independente de categoria e conta — funcionalidade separada do lançamento de transações (marcar como paga não gera transação automaticamente).
- **Apelidos:** genéricos, podem existir em lançamentos de qualquer conta/origem. O nome original (o que aparece na fatura/extrato) também é salvo, para reconhecimento nas próximas vezes.
- **Ciclo de vida do mês:** um mês é aberto, recebe lançamentos, passa por conciliação, tem o saldo destinado, e então é encerrado (fica travado para edição, disponível só para consulta). Existe uma opção de reabrir um mês encerrado para tratar exceções pontuais.
- **Sem integração bancária no MVP:** toda entrada de dado é manual, incluindo a conciliação de saldo (o usuário informa o saldo real para comparar com o calculado pela ferramenta).

Esta ordem reflete **dependência de construção** (o que precisa existir antes de outra coisa fazer sentido tecnicamente), não a ordem em que você usaria a ferramenta no dia a dia — essa ordem de uso já foi validada no exercício de discovery anterior e segue coerente com o que está descrito aqui.

---

## Backlog priorizado (MVP)

### Bloco 1 — Planejamento

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|--- |
| 1 | **Orçamento anual por categoria** | É o ponto de partida do produto: antes de qualquer lançamento existir, o usuário define quanto pretende receber e gastar em cada categoria, mês a mês, para o ano inteiro. É aqui que a Categoria nasce como conceito — ao informar a primeira previsão, se a categoria não existir, ela é criada na hora, só com um nome. Não existe tela de cadastro de categoria separada; ela é sempre consequência de uma ação dentro do orçamento. | Concluído | [.agents/modules/pluto/01-orcamento/spec.md](.agents/modules/pluto/01-orcamento/spec.md) | [.agents/modules/pluto/01-orcamento/plan.md](.agents/modules/pluto/01-orcamento/plan.md) |
| 2 | **Ajuste de orçamento ao longo do ano** | Complementa o item anterior: como a vida real diverge do planejado, o usuário precisa poder revisar os valores previstos de qualquer categoria. A regra de negócio importante aqui é que o adjustment vale a partir do mês em que está sendo feito em diante — meses que já passaram nunca são reescritos, preservando o histórico do que foi realmente planejado em cada momento. | Concluído | [.agents/modules/pluto/02-ajuste-orcamento/spec.md](.agents/modules/pluto/02-ajuste-orcamento/spec.md) (Original) <br> [.agents/modules/pluto/02a-ajuste-orcamento/spec.md](.agents/modules/pluto/02a-ajuste-orcamento/spec.md) (Patch/Correção) | [.agents/modules/pluto/02a-ajuste-orcamento/plan.md](.agents/modules/pluto/02a-ajuste-orcamento/plan.md) |

### Bloco 2 — Contas a pagar

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 3 | **Checklist de contas a pagar** | Uma lista simples de compromissos financeiros do mês, com data de vencimento e um status de paga/não paga. É deliberadamente desacoplada do cadastro de transações — marcar uma conta como paga aqui não gera automaticamente um lançamento financeiro. Serve como um lembrete operacional, não como parte do cálculo de saldo. Por não depender de categoria nem de conta, pode ser construída em paralelo a qualquer outro bloco. | Concluído | [.agents/modules/pluto/03-checklist-contas/spec.md](.agents/modules/pluto/03-checklist-contas/spec.md) <br> [.agents/modules/pluto/03a-checklist-orcamento/spec.md](.agents/modules/pluto/03a-checklist-orcamento/spec.md) (Patch) | [.agents/modules/pluto/03-checklist-contas/plan.md](.agents/modules/pluto/03-checklist-contas/plan.md) <br> [.agents/modules/pluto/03a-checklist-orcamento/plan.md](.agents/modules/pluto/03a-checklist-orcamento/plan.md) (Patch) |

### Bloco 3 — Lançamentos

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 4 | **Abertura de mês** | Antes de qualquer lançamento real poder existir, um mês específico do orçamento anual precisa ser explicitamente aberto. É esse ato que habilita o usuário a começar a registrar receitas e despesas reais daquele período — sem essa etapa, não há "onde" lançar. *Nota de Integração: A abertura do mês também serve como balizador para o início de vigência de novos ajustes orçamentários (impedindo alterações em meses anteriores já fechados).* | Concluído | [.agents/modules/pluto/04-abertura-mes/spec.md](.agents/modules/pluto/04-abertura-mes/spec.md) | [.agents/modules/pluto/04-abertura-mes/plan.md](.agents/modules/pluto/04-abertura-mes/plan.md) |
| 5 | **Cadastro de transações** | O núcleo do produto: lançar receitas e despesas reais (valor, data, descrição, categoria, conta, quem lançou), incluindo coisas como saldo anterior, salários, aluguel recebido, débitos da conta corrente e itens da fatura do cartão de crédito. Permite o lançamento de estornos/reembolsos como valores negativos na categoria original de despesa para permitir o cálculo correto do custo líquido real sem inflar a receita bruta. É aqui que o conceito de Conta nasce — assim como categoria no orçamento, uma conta (corrente, cartão, reserva, etc.) é criada inline, só com um nome, na primeira vez que é referenciada num lançamento. | Concluído | [.agents/modules/pluto/05-cadastro-transacoes/spec.md](.agents/modules/pluto/05-cadastro-transacoes/spec.md) (Original) <br> [.agents/modules/pluto/05a-cadastro-transacoes/spec.md](.agents/modules/pluto/05a-cadastro-transacoes/spec.md) (Patch 05a) <br> [.agents/modules/pluto/05b-cadastro-transacoes/spec.md](.agents/modules/pluto/05b-cadastro-transacoes/spec.md) (Patch 05b) <br> [.agents/modules/pluto/05c-cadastro-transacoes/spec.md](.agents/modules/pluto/05c-cadastro-transacoes/spec.md) (Patch 05c) <br> [.agents/modules/pluto/05d-salvar-e-adicionar-outro/spec.md](.agents/modules/pluto/05d-salvar-e-adicionar-outro/spec.md) (Patch 05d) | [.agents/modules/pluto/05-cadastro-transacoes/plan.md](.agents/modules/pluto/05-cadastro-transacoes/plan.md) (Original) <br> [.agents/modules/pluto/05a-cadastro-transacoes/plan.md](.agents/modules/pluto/05a-cadastro-transacoes/plan.md) (Patch 05a) <br> [.agents/modules/pluto/05b-cadastro-transacoes/plan.md](.agents/modules/pluto/05b-cadastro-transacoes/plan.md) (Patch 05b) <br> [.agents/modules/pluto/05c-cadastro-transacoes/plan.md](.agents/modules/pluto/05c-cadastro-transacoes/plan.md) (Patch 05c) <br> [.agents/modules/pluto/05d-salvar-e-adicionar-outro/plan.md](.agents/modules/pluto/05d-salvar-e-adicionar-outro/plan.md) (Patch 05d) |
| 6 | **Apelidos de lançamento** | Uma extensão direta do cadastro de transações: permite associar um nome amigável a um nome que aparece na fatura ou extrato, muitas vezes difícil de reconhecer. O nome original continua salvo, então nas próximas vezes o sistema já sugere o apelido automaticamente, agilizando o lançamento. |
| 7 | **Compras parceladas** | Também uma extensão do cadastro de transações, voltada para o caso comum de compras no cartão que se repetem por vários meses. Em vez de lançar manualmente cada parcela todo mês, o usuário cadastra a compra uma única vez e o sistema replica automaticamente as parcelas futuras, já com valor e mês corretos. *Nota: A abertura de mês gerará cada parcela como um lançamento individual na tabela de transações, permitindo edição e exclusão pontual por parcela.* |
| 8 | **Edição e exclusão de lançamentos** | Cobre a correção de erros de digitação e remoção de duplicidades, incluindo o caso específico de precisar ajustar ou remover parcelas futuras de uma compra parcelada já cadastrada. | Concluído | [.agents/modules/pluto/08-edicao-exclusao-lancamentos/spec.md](.agents/modules/pluto/08-edicao-exclusao-lancamentos/spec.md) | [.agents/modules/pluto/08-edicao-exclusao-lancamentos/plan.md](.agents/modules/pluto/08-edicao-exclusao-lancamentos/plan.md) |
| 9 | **Transferência entre contas** | Permite mover valores entre contas (por exemplo, do saldo restante do mês para uma conta de reserva de emergência ou de investimento) sem que esse movimento seja tratado como uma despesa categorizada. É uma variação do lançamento comum, mas que não entra no cálculo de orçado x realizado por categoria. |
| 10 | **Saldo do mês** | A lógica central de agregação: soma todas as receitas e subtrai todas as despesas lançadas no mês para chegar à sobra ou déficit. Essa lógica de cálculo é a base para o Dashboard e a Conciliação (itens 21 e 22), por isso vem antes deles. | Concluído | [.agents/modules/pluto/10-saldo-mes/spec.md](.agents/modules/pluto/10-saldo-mes/spec.md) | [.agents/modules/pluto/10-saldo-mes/plan.md](.agents/modules/pluto/10-saldo-mes/plan.md) |

### Bloco 4 — Melhorias de uso (feedback)

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 11 | **Categorias sem distinção de maiúsculas/minúsculas** | O nome de categoria passa a ser comparado sem considerar caixa. Hoje `getOrCreateCategory` (`lib/pluto/repositories/categories.ts`) só remove os espaços das pontas e compara com igualdade exata, então "Mercaria" e "mercaria" viram duas categorias — e os fakes dos testes já comparam com `toLowerCase()`, o que esconde a duplicação da suite. Pontos a validar em discovery: como consolidar duplicatas já existentes e se a regra vale também para contas. | Concluído (2026-11-12 — identidade de categorias/contas = (nome normalizado, tipo) com normalização de caixa/acentos/Unicode em `normalizeName` (`lib/pluto/utils.ts`), nome salvo cru e corrida com re-leitura; sugestões do lançamento/orçamento e blur de homônima do outro tipo alinhados (sem aviso novo); select de conta resolve homônimas por tipo/`account_id`; migração `utils/migrations/migration-0019-pluto-categorias-contas-normalizadas.sql` com fusão de duplicatas (sobrevivente mais usada, desempate `created_at`, colisão de `budget_items` descartada) e índice único de (nome normalizado, tipo) nas duas tabelas — **aplicada pelo humano no Supabase em 2026-11-12**; suite 151 arquivos / 1965 testes, 0 falhas, coverage 85.88/84.54, review approved na 5ª re-review, 22 cenários homologados) | [.agents/modules/pluto/11-categorias-sem-distincao-caixa/spec.md](.agents/modules/pluto/11-categorias-sem-distincao-caixa/spec.md) | [.agents/modules/pluto/11-categorias-sem-distincao-caixa/plan.md](.agents/modules/pluto/11-categorias-sem-distincao-caixa/plan.md) |
| 12 | **Lançamentos como primeira aba** | A ordem da navegação do módulo muda para começar por Lançamentos. Hoje `components/layout/PlutoLayout.tsx` lista Orçamento Anual → Meses e Períodos → Lançamentos; a nova ordem põe Lançamentos em primeiro, por ser a tela de uso diário (feedback em produção). |
| 13 | **Ordenação alfabética no Orçamento Anual** | As listas de Receitas e Despesas exibidas na tela do Orçamento Anual passam a ser ordenadas em ordem alfabética. |
| 14 | **Checklist de contas a pagar: mostrar/esconder** | Um toggle mostra ou esconde a lista do checklist de contas a pagar; quando visível, a lista ganha barra de rolagem. |
| 15 | **Mostrar/esconder lançamentos por conta ou cartão** | Cada conta/cartão do extrato ganha um toggle para mostrar ou esconder os próprios lançamentos; a lista visível também usa barra de rolagem. |
| 16 | **Ordenação do extrato: data do lançamento com desempate por inclusão** | Os lançamentos de cada conta/cartão seguem ordenados pela data do lançamento (a data que aparece na tela) e o desempate passa a ser pela data/hora interna de inclusão do registro — hoje o desempate é por `id`. A data continua como critério principal: o 05e (item 32) manteve a ordenação por data e rejeitou ordenar por ordem de criação; aqui a inclusão entra apenas como desempate. |
| 17 | **Contas antes dos cartões** | No extrato agrupado por conta/cartão, as contas passam a ser listadas primeiro e os cartões depois. |
| 18 | **Extrato em coluna única** | O layout de contas/cartões lado a lado (grid de 2 colunas definido na spec do 05a) passa a exibir um bloco abaixo do outro — mudança sobre decisão de layout já homologada. |
| 19 | **Manutenção de categorias (aba própria)** | Uma aba para consultar, alterar e cadastrar categorias; a exclusão só é permitida quando nenhum lançamento nem linha de orçamento aponta para a categoria. Reverte a decisão registrada no contexto do módulo ("não existe tela de cadastro de categoria separada"): a criação inline no orçamento e no cadastro de transações continua, mas a categoria ganha tela própria de manutenção. |
| 20 | **Categorias em ordem alfabética nas caixas de Receita e Despesa** | As categorias exibidas nas caixas de Receita e Despesa da tela de Lançamentos passam a ser listadas em ordem alfabética (por nome). |

### Bloco 5 — Motor de cálculo

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 21 | **Dashboard: orçado vs. realizado (mês)** | Reaproveita a lógica de agregação do Saldo do mês (item 10), mas agrupada por categoria e confrontada com o valor planejado no orçamento anual daquele mês. É a visão que responde "onde estou gastando mais ou menos do que planejei". |
| 22 | **Conciliação de saldo** | Também depende do Saldo do mês já calculado: compara esse valor com o saldo real que o usuário informa manualmente (já que não há integração bancária), apontando divergências. Ajuda a identificar lançamentos esquecidos antes de fechar o mês. |

### Bloco 6 — Fechamento

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 23 | **Encerramento de mês** | Uma vez que a conciliação bate e o saldo já foi destinado, o mês é travado para novas edições e passa a existir apenas para consulta. Inclui uma opção de reabertura, pensada para exceções pontuais, mas que não deve ser o caminho padrão de uso. | |  |  |
| 24 | **Histórico de meses anteriores** | A consulta de meses já encerrados — orçamento planejado x realizado, saldo final e destinação dada a ele. Depende de todos os blocos anteriores estarem funcionando, já que reaproveita os mesmos dados e cálculos, apenas em modo somente-leitura. | |  |  |

---

## Backlog priorizado (V2)

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 25 | **Transações recorrentes** | Permite marcar uma receita ou despesa como fixa (aluguel, salário) para que seja lançada automaticamente todo mês, reduzindo a repetição manual. | |  |  |
| 26 | **Alertas de estouro de orçamento** | Notifica o usuário quando uma categoria ultrapassa um percentual definido do limite planejado, antecipando o problema antes do fim do mês. | |  |  |
| 27 | **Alertas de conta a vencer** | Complementa o checklist de contas a pagar com lembretes automáticos para vencimentos próximos. | |  |  |
| 28 | **Gráficos de tendência** | Mostra a evolução de gastos por categoria ou conta ao longo de vários meses, útil para identificar padrões que um único mês não revela. | |  |  |
| 29 | **Divisão entre os dois usuários** | Mostra quanto cada um dos dois usuários lançou ou contribuiu no mês, útil para conversas sobre divisão de despesas. | |  |  |
| 30 | **Metas de economia** | Permite definir uma meta de economia (ex: guardar R$500/mês) e acompanhar o progresso ao longo do tempo. | |  |  |
| 31 | **Exportação de dados** | Exporta os lançamentos em CSV/Excel, para backup ou análise fora da ferramenta. | |  |  |
| 32 | **Lançamento com data livre (calendário sem trava do mês)** | Mudança de regra sobre o cadastro de transações (item 5, patch candidato `05e`): hoje a data do lançamento é travada ao mês selecionado — `components/pluto/TransactionModal.tsx` aplica `min`/`max` no input de data, calculados em `lib/pluto/hooks/usePlutoData.ts` via `getMonthRange(selectedYear, selectedMonth)`, e o form abre com a data default em `minDateStr`. A mudança remove essa restrição: o calendário continua **abrindo por padrão no mês que está sendo editado**, mas **permite lançar em qualquer data**. Pontos a validar em discovery (Hera): em qual mês um lançamento datado em outro período é contabilizado no saldo/mês e no orçado vs. realizado; interação com meses encerrados/reabertos; default de data continua no mês selecionado? | Concluído (2026-11-05 — calendário sem `min`/`max` e sem "Limitada a"; mês de cálculo próprio em `period_year`/`period_month` fixado no mês da tela, preservado na edição; busca e trava de mês aberto (criar/editar/excluir) avaliam o mês de cálculo; backfill pela `date` na `utils/migrations/migration-0018-pluto-lancamento-data-livre.sql` com aplicação manual pendente; branch `feature/pluto/05e-lancamento-data-livre`, HEAD `39528d5`; suite 141 arquivos / 1886 testes, 0 falhas, coverage 85.30/84.18, review approved) | [.agents/modules/pluto/05e-lancamento-data-livre/spec.md](.agents/modules/pluto/05e-lancamento-data-livre/spec.md) | [.agents/modules/pluto/05e-lancamento-data-livre/plan.md](.agents/modules/pluto/05e-lancamento-data-livre/plan.md) |

---

## Backlog priorizado (V3)

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|-|---|---|
| 33 | **Patrimônio e investimentos** | Passa a acompanhar o rendimento e saldo de investimentos ao longo do tempo, não só o valor transferido para lá — um salto de fluxo de caixa para visão de patrimônio. | |  |  |
| 34 | **Importação de extratos (CSV/OFX)** | Reduz a entrada manual permitindo importar extratos de banco ou cartão diretamente. | |  |  |
| 35 | **Integração bancária (open finance)** | Automatiza a sincronização de transações, eliminando boa parte do lançamento manual. | |  |  |
| 36 | **Planejamento plurianual** | Permite comparar orçamento e realizado entre anos diferentes, dando uma visão de longo prazo da evolução financeira da família. | |  |  |

---

## Itens de retrofit (handoff da fase 7 — Mílon #2, Patch v5, D24/R30)

| # | Item | Descrição | Status |
|---|---|---|---|
| T1 | **Retrofit dos banners de erro para `components/ui/AsyncState`** | Migrar `app/pluto/transactions/page.tsx` e `app/pluto/months/page.tsx` para o componente centralizado de estados de tela (carregando/erro/vazio/no-results; norma em `AGENTS.md` → "Onde ponho X?"). **Antes:** classificar a origem de cada mensagem — os `errorMsg`/`errorMessage` atuais são **mistos, sem origem rotulada** (vários fluxos alimentam o mesmo banner indistintamente); migrar exigiria inventar decisões de classificação (carga × operação × bloqueio) em código homologado, então a classificação de origem **precede** a migração. Origem: decisão D24 (spec do Patch v5 da Mílon #2, `.agents/modules/milon/02-programas/spec.md`). | Pendente |