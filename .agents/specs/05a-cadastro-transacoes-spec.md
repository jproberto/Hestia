# Especificação Técnica — Patch 05a: Refinamento de UX/UI da Tela de Transações e Visão Orçado vs. Real

**Status:** Em Especificação  
**Item do Backlog:** Feature 5 — Cadastro de transações (Patch de Refinamento Visual e Arquitetural 05a)  
**Data:** 2026-07-28  
**Autor:** Agente SDD / Antigravity  

---

## 1. Visão Geral e Objetivos

Este refinamento tem como objetivo transformar a página de Lançamentos (`/finance/transactions`) em um painel integrado de **Acompanhamento Orçado vs. Real** e **Extrato por Contas/Cartões**, atendendo rigorosamente à linguagem visual do projeto Héstia (Tailwind CSS + componentes padrão).

---

## 2. Requisitos Funcionais e Layout da Interface

### 2.1. Cabeçalho de Navegação e Seletores Restritos
1. **Barra de Navegação Superior:** Manter o menu com as abas *"Orçamento Anual"*, *"Meses e Períodos"* e a aba ativa *"Lançamentos"*.
2. **Seletor de Ano:** Exibir no dropdown de anos **apenas os Anos que possuam pelo menos 1 mês com status `'aberto'`** na tabela `monthly_periods`.
3. **Seletor de Mês:** Exibir no dropdown de meses **apenas os Meses abertos** para o Ano selecionado.
4. **Formulário de Novo Lançamento (Modal):**
   - O campo de data deve ter restrição física nos atributos `min` e `max`, travando a escolha do usuário exclusivamente dentro do Mês e Ano selecionados.
   - O checkbox de marcação de estorno deve ter o rótulo **"Reembolso"**.

---

### 2.2. Área Superior: Painel Orçado vs. Real por Categoria
Exibir duas áreas dispostas lado a lado (grid responsivo de 2 colunas):

#### A) Tabela de Receitas (Esquerda)
- **Origem dos Dados:** Busca as categorias de tipo `receita` cadastradas no orçamento ativo para o período.
- **Colunas:**
  1. `Categoria`: Nome da categoria de receita.
  2. `Previsto`: Valor orçado/planejado para a categoria no orçamento vigente (`R$`).
  3. `Real`: Somatório das transações de receita registradas naquela categoria dentro do mês.

#### B) Tabela de Despesas (Direita)
- **Origem dos Dados:** Busca as categorias de tipo `despesa` cadastradas no orçamento ativo para o período.
- **Colunas:**
  1. `Categoria`: Nome da categoria de despesa.
  2. `Previsto`: Valor orçado/planejado para a categoria no orçamento vigente (`R$`).
  3. `Real`: Custo líquido real da categoria no mês = (Soma das despesas normais) - (Soma dos reembolsos/estornos da categoria).

---

### 2.3. Área Inferior: Extrato de Transações Detalhado Agrupado por Conta/Cartão
1. **Agrupamento por Conta/Cartão:** As transações do mês são divididas e exibidas em blocos/tabelas independentes para cada Conta/Cartão existente que possua transações no período (ex: *"Itaú Corrente"*, *"Nubank Cartão"*, *"Carteira"*).
2. **Colunas de Cada Tabela de Conta:**
   - `Data`: Formato brasileiro `DD/MM/YYYY`.
   - `Descrição`: Descrição do lançamento, com badge azul estilizada **"Reembolso"** caso seja estorno.
   - `Categoria`: Nome da categoria associada.
   - `Valor`: Formatado em Moeda Brasileira (`R$ 1.500,00`), ordenado por data em ordem crescente (do dia mais antigo ao mais recente do mês).

---

## 3. Regras de Negócio e Validações

1. **Cálculo do Valor Real das Categorias:**
   - Para Receitas: $\text{Real} = \sum \text{Transações de Receita da Categoria}$.
   - Para Despesas: $\text{Real} = \sum \text{Despesas Normais da Categoria} - \sum \text{Reembolsos da Categoria}$.
2. **Consistência de Mês Aberto:**
   - Lançamentos continuam sendo estritamente validados contra `monthly_periods` no backend e no frontend.
3. **Ordenação:**
   - Todas as listas de transações dentro de cada conta são apresentadas em **ordem cronológica crescente** (data `ASC`).

---

## 4. Critérios de Aceite

- [ ] A página `/finance/transactions` segue o padrão visual Tailwind CSS / Héstia igual a `/finance/budget` e `/finance/months`.
- [ ] O dropdown de Anos exibe apenas os anos com meses abertos.
- [ ] O dropdown de Meses exibe apenas os meses abertos do ano escolhido.
- [ ] O formulário limita o seletor de data estritamente aos dias do mês selecionado.
- [ ] O checkbox de estorno chama-se "Reembolso".
- [ ] Exibe a área superior dividida entre Receitas (Previsto vs. Real) e Despesas (Previsto vs. Real).
- [ ] Exibe a área inferior com tabelas de transações agrupadas individualmente por Conta/Cartão.
- [ ] Os lançamentos em cada conta estão ordenados por data em ordem crescente.
- [ ] Todos os valores financeiros estão formatados como `R$ X.XXX,XX` e todas as datas como `DD/MM/YYYY`.
- [ ] 100% dos testes automatizados passam sem erros.
