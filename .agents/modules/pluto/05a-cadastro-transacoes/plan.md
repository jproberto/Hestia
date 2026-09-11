# Plano de Implementação — Patch 05a: Refinamento de UX/UI da Tela de Transações (Orçado vs. Real & Extrato por Contas)

**Especificação de Origem:** [.agents/pluto/specs/05a-cadastro-transacoes-spec.md](file:///p:/workspace/IA/hestia/.agents/pluto/specs/05a-cadastro-transacoes-spec.md)  
**Status:** Aguardando Aprovação  

---

## 1. Escopo e Estrutura de Arquivos

### Modificações de Arquivos
- **[MODIFY]** `app/pluto/transactions/page.tsx`: Reestruturação completa da interface para exibir:
  1. Área Superior de Comparativo **Orçado vs. Real** (tabela dupla em grid: Receitas à esquerda, Despesas à direita).
  2. Área Inferior de **Extrato por Conta/Cartão** (tabelas separadas por cada conta existente, com ordenação por data em ordem crescente).
- **[MODIFY]** `__tests__/app/pluto/transactions-page.test.tsx`: Atualização e expansão dos testes automatizados de UI cobrindo o painel Orçado vs. Real e o extrato dividido por contas.

---

## 2. Tarefas de Implementação

### Tarefa 1: Integração de Dados e Estrutura de Comparativo Orçado vs. Real
- **Descrição:** Carregar os dados de orçamento vigentes para o ano/mês selecionados via `getBudgets` (ou serviço correspondente), calcular o total realizado de receitas e despesas por categoria a partir dos lançamentos do mês, e montar o layout da área superior de comparativo.
- **Validação / Testes:** Rodar os testes automatizados da página `npm run test __tests__/app/pluto/transactions-page.test.tsx`.
- **Commit:** Commit via `node .agents/scripts/sdd.js commit`.

### Tarefa 2: Agrupamento do Extrato por Conta / Cartão com Ordenação Cronológica Crescente
- **Descrição:** Agrupar a lista de transações registradas no mês pelo nome da Conta (`account_name`). Exibir um bloco/tabela exclusivo para cada conta com movimentação no mês, apresentando Data (`DD/MM/YYYY`), Descrição (com badge "Reembolso"), Categoria e Valor formatado em BRL (`R$ X.XXX,XX`) em ordem cronológica crescente.
- **Validação / Testes:** Rodar `npm run test __tests__/app/pluto/transactions-page.test.tsx`.
- **Commit:** Commit via `node .agents/scripts/sdd.js commit`.

### Tarefa 3: Validação Completa de Linters, Build e Testes da Aplicação
- **Descrição:** Executar toda a suíte de validação automatizada (`npm run test`, `npx eslint .`, `npx tsc --noEmit`) para garantir zero erros e zero regressões em todo o projeto.
- **Validação / Testes:** Suíte de testes 100% aprovada.
- **Commit:** Commit via `node .agents/scripts/sdd.js commit`.

---

## 3. Auto-Revisão e Validação do Plano

- [x] O plano refere-se estritamente à especificação aprovada `05a-cadastro-transacoes-spec.md`.
- [x] Não contém trechos ou blocos de código de implementação (mantendo o contrato estrito do SDD).
- [x] Todas as tarefas possuem passos claros de execução, testes e commits.
