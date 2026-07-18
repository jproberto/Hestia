# Backlog — Painel de Controle Financeiro e Orçamentário Familiar

## Contexto do produto

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

| # | Feature | Descrição | Status | Specs / Planos / Logs |
|---|---|---|---|---|
| 1 | **Orçamento anual por categoria** | É o ponto de partida do produto: antes de qualquer lançamento existir, o usuário define quanto pretende receber e gastar em cada categoria, mês a mês, para o ano inteiro. É aqui que a Categoria nasce como conceito — ao informar a primeira previsão, se a categoria não existir, ela é criada na hora, só com um nome. Não existe tela de cadastro de categoria separada; ela é sempre consequência de uma ação dentro do orçamento. | Concluído | [.agents/specs/01-orcamento-spec.md](file:///p:/workspace/IA/hestia/.agents/specs/01-orcamento-spec.md) <br> [.agents/plans/01-orcamento-plan.md](file:///p:/workspace/IA/hestia/.agents/plans/01-orcamento-plan.md) <br> [.agents/logs/01-orcamento-execution.log](file:///p:/workspace/IA/hestia/.agents/logs/01-orcamento-execution.log) |
| 2 | **Ajuste de orçamento ao longo do ano** | Complementa o item anterior: como a vida real diverge do planejado, o usuário precisa poder revisar os valores previstos de qualquer categoria. A regra de negócio importante aqui é que o adjustment vale a partir do mês em que está sendo feito em diante — meses que já passaram nunca são reescritos, preservando o histórico do que foi realmente planejado em cada momento. | Concluído | [.agents/specs/02-ajuste-orcamento-spec.md](file:///p:/workspace/IA/hestia/.agents/specs/02-ajuste-orcamento-spec.md) (Original) <br> [.agents/specs/02a-ajuste-orcamento-spec.md](file:///p:/workspace/IA/hestia/.agents/specs/02a-ajuste-orcamento-spec.md) (Patch/Correção) <br> [.agents/plans/02a-ajuste-orcamento-plan.md](file:///p:/workspace/IA/hestia/.agents/plans/02a-ajuste-orcamento-plan.md) <br> [.agents/logs/02a-ajuste-orcamento-tracker.md](file:///p:/workspace/IA/hestia/.agents/logs/02a-ajuste-orcamento-tracker.md) |

### Bloco 2 — Contas a pagar

| # | Feature | Descrição |
|---|---|---|
| 3 | **Checklist de contas a pagar** | Uma lista simples de compromissos financeiros do mês, com data de vencimento e um status de paga/não paga. É deliberadamente desacoplada do cadastro de transações — marcar uma conta como paga aqui não gera automaticamente um lançamento financeiro. Serve como um lembrete operacional, não como parte do cálculo de saldo. Por não depender de categoria nem de conta, pode ser construída em paralelo a qualquer outro bloco. |

### Bloco 3 — Lançamentos

| # | Feature | Descrição |
|---|---|---|
| 4 | **Abertura de mês** | Antes de qualquer lançamento real poder existir, um mês específico do orçamento anual precisa ser explicitamente aberto. É esse ato que habilita o usuário a começar a registrar receitas e despesas reais daquele período — sem essa etapa, não há "onde" lançar. *Nota de Integração: A abertura do mês também serve como balizador para o início de vigência de novos ajustes orçamentários (impedindo alterações em meses anteriores já fechados).* |
| 5 | **Cadastro de transações** | O núcleo do produto: lançar receitas e despesas reais (valor, data, descrição, categoria, conta, quem lançou), incluindo coisas como saldo anterior, salários, aluguel recebido, débitos da conta corrente e itens da fatura do cartão de crédito. Permite o lançamento de estornos/reembolsos como valores negativos na categoria original de despesa para permitir o cálculo correto do custo líquido real sem inflar a receita bruta. É aqui que o conceito de Conta nasce — assim como categoria no orçamento, uma conta (corrente, cartão, reserva, etc.) é criada inline, só com um nome, na primeira vez que é referenciada num lançamento. |
| 6 | **Apelidos de lançamento** | Uma extensão direta do cadastro de transações: permite associar um nome amigável a um nome que aparece na fatura ou extrato, muitas vezes difícil de reconhecer. O nome original continua salvo, então nas próximas vezes o sistema já sugere o apelido automaticamente, agilizando o lançamento. |
| 7 | **Compras parceladas** | Também uma extensão do cadastro de transações, voltada para o caso comum de compras no cartão que se repetem por vários meses. Em vez de lançar manualmente cada parcela todo mês, o usuário cadastra a compra uma única vez e o sistema replica automaticamente as parcelas futuras, já com valor e mês corretos. |
| 8 | **Edição e exclusão de lançamentos** | Cobre a correção de erros de digitação e remoção de duplicidades, incluindo o caso específico de precisar ajustar ou remover parcelas futuras de uma compra parcelada já cadastrada. |
| 9 | **Transferência entre contas** | Permite mover valores entre contas (por exemplo, do saldo restante do mês para uma conta de reserva de emergência ou de investimento) sem que esse movimento seja tratado como uma despesa categorizada. É uma variação do lançamento comum, mas que não entra no cálculo de orçado x realizado por categoria. |

### Bloco 4 — Motor de cálculo

| # | Feature | Descrição |
|---|---|---|
| 10 | **Saldo do mês** | A lógica central de agregação: soma todas as receitas e subtrai todas as despesas lançadas no mês para chegar à sobra ou déficit. Essa lógica de cálculo é a base para os dois itens seguintes, por isso vem antes deles. |
| 11 | **Dashboard: orçado vs. realizado (mês)** | Reaproveita a lógica de agregação do item anterior, mas agrupada por categoria e confrontada com o valor planejado no orçamento anual daquele mês. É a visão que responde "onde estou gastando mais ou menos do que planejei". |
| 12 | **Conciliação de saldo** | Também depende do Saldo do mês já calculado: compara esse valor com o saldo real que o usuário informa manualmente (já que não há integração bancária), apontando divergências. Ajuda a identificar lançamentos esquecidos antes de fechar o mês. |

### Bloco 5 — Fechamento

| # | Feature | Descrição |
|---|---|---|
| 13 | **Encerramento de mês** | Uma vez que a conciliação bate e o saldo já foi destinado, o mês é travado para novas edições e passa a existir apenas para consulta. Inclui uma opção de reabertura, pensada para exceções pontuais, mas que não deve ser o caminho padrão de uso. |
| 14 | **Histórico de meses anteriores** | A consulta de meses já encerrados — orçamento planejado x realizado, saldo final e destinação dada a ele. Depende de todos os blocos anteriores estarem funcionando, já que reaproveita os mesmos dados e cálculos, apenas em modo somente-leitura. |

---

## Backlog priorizado (V2)

| # | Feature | Descrição |
|---|---|---|
| 15 | **Transações recorrentes** | Permite marcar uma receita ou despesa como fixa (aluguel, salário) para que seja lançada automaticamente todo mês, reduzindo a repetição manual. |
| 16 | **Alertas de estouro de orçamento** | Notifica o usuário quando uma categoria ultrapassa um percentual definido do limite planejado, antecipando o problema antes do fim do mês. |
| 17 | **Alertas de conta a vencer** | Complementa o checklist de contas a pagar com lembretes automáticos para vencimentos próximos. |
| 18 | **Gráficos de tendência** | Mostra a evolução de gastos por categoria ou conta ao longo de vários meses, útil para identificar padrões que um único mês não revela. |
| 19 | **Divisão entre os dois usuários** | Mostra quanto cada um dos dois usuários lançou ou contribuiu no mês, útil para conversas sobre divisão de despesas. |
| 20 | **Metas de economia** | Permite definir uma meta de economia (ex: guardar R$500/mês) e acompanhar o progresso ao longo do tempo. |
| 21 | **Exportação de dados** | Exporta os lançamentos em CSV/Excel, para backup ou análise fora da ferramenta. |

---

## Backlog priorizado (V3)

| # | Feature | Descrição |
|---|---|---|
| 22 | **Patrimônio e investimentos** | Passa a acompanhar o rendimento e saldo de investimentos ao longo do tempo, não só o valor transferido para lá — um salto de fluxo de caixa para visão de patrimônio. |
| 23 | **Importação de extratos (CSV/OFX)** | Reduz a entrada manual permitindo importar extratos de banco ou cartão diretamente. |
| 24 | **Integração bancária (open finance)** | Automatiza a sincronização de transações, eliminando boa parte do lançamento manual. |
| 25 | **Planejamento plurianual** | Permite comparar orçamento e realizado entre anos diferentes, dando uma visão de longo prazo da evolução financeira da família. |