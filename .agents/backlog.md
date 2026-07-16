# Backlog — Painel de Controle Financeiro e Orçamentário Familiar

## Contexto do produto

- **Stack:** Next.js hospedado na Vercel, banco de dados Supabase.
- **Usuários:** 2 (login individual já implementado, vinculado à mesma família).
- **Moeda:** somente BRL.
- **Modelo de orçamento:** planejamento anual por categoria, com acompanhamento mensal. Ajustes no orçamento valem a partir do mês editado em diante — meses passados nunca são alterados.
- **Checklist de contas a pagar:** funcionalidade separada do lançamento de transações (marcar como paga não gera transação automaticamente).
- **Apelidos:** genéricos, podem ser usados em lançamentos de qualquer conta/origem.

---

## Backlog priorizado (MVP)

| ID | Feature | Descrição | Status | Specs / Planos / Logs |
|---|---|---|---|---|
| 1 | **Contas/agrupamentos** | Cadastro de contas (cartão de crédito, conta corrente, outra conta) para vincular cada transação a uma origem | Pendente | - |
| 2 | **Categorias de gastos** | Categorias padrão + criação de categorias customizadas | Pendente | - |
| 3 | **Apelidos de lançamento** | Nome amigável associado a um nome que aparece na fatura/extrato, para reconhecimento rápido ao lançar. Pode ser usado em qualquer conta | Pendente | - |
| 4 | **Cadastro de transações** | Lançar receitas e despesas manualmente (valor, data, descrição, categoria, conta, quem lançou) | Pendente | - |
| 5 | **Compras parceladas** | Cadastro único de uma compra parcelada, com replicação automática das parcelas nos meses seguintes | Pendente | - |
| 6 | **Edição e exclusão de lançamentos** | Corrigir ou remover lançamentos, incluindo parcelas futuras de uma compra parcelada | Pendente | - |
| 7 | **Orçamento anual por categoria** | Planejamento do valor esperado por categoria, mês a mês, feito no início do ano | Pendente | - |
| 8 | **Ajuste de orçamento ao longo do ano** | Editar o planejado a partir do mês corrente em diante, sem alterar meses já passados | Pendente | - |
| 9 | **Checklist de contas a pagar** | Lista de contas com data de vencimento e marcação de paga/não paga, independente das transações | Pendente | - |
| 10 | **Dashboard: orçado vs. realizado (mês)** | Comparação entre planejado e realizado do mês corrente, por categoria | Pendente | - |
| 11 | **Saldo do mês** | Receitas − despesas = sobra/déficit do mês | Pendente | - |
| 12 | **Histórico de meses anteriores** | Consulta de orçamento planejado x realizado de meses/anos passados | Pendente | - |

---

## Backlog priorizado (V2)

| ID | Feature | Descrição | Status | Specs / Planos / Logs |
|---|---|---|---|---|
| 13 | **Transações recorrentes** | Marcar receita/despesa fixa (ex: aluguel, salário) para lançamento automático mensal | Pendente | - |
| 14 | **Alertas de estouro de orçamento** | Notificação ao ultrapassar X% do limite de uma categoria | Pendente | - |
| 15 | **Alertas de conta a vencer** | Lembrete de contas do checklist próximas do vencimento | Pendente | - |
| 16 | **Gráficos de tendência** | Evolução de gastos por categoria/conta ao longo dos meses | Pendente | - |
| 17 | **Divisão entre os dois usuários** | Ver quanto cada um lançou/contribuiu no mês | Pendente | - |
| 18 | **Metas de economia** | Definir uma meta (ex: "guardar R$500/mês") e acompanhar o progresso | Pendente | - |
| 19 | **Exportação de dados** | Exportar lançamentos em CSV/Excel | Pendente | - |

---

## Backlog priorizado (V3)

| ID | Feature | Descrição | Status | Specs / Planos / Logs |
|---|---|---|---|---|
| 20 | **Patrimônio e investimentos** | Acompanhar saldo de investimentos, não só fluxo de caixa | Pendente | - |
| 21 | **Importação de extratos (CSV/OFX)** | Reduzir entrada manual importando extratos do banco/cartão | Pendente | - |
| 22 | **Integração bancária (open finance)** | Sincronização automática de transações | Pendente | - |
| 23 | **Planejamento plurianual** | Comparar orçamento e realizado entre anos diferentes | Pendente | - |