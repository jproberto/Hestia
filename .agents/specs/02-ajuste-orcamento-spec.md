# Especificação: Ajuste de Orçamento ao Longo do Ano (Feature 2)

## 1. Visão Geral e Objetivo

A família precisa revisar e ajustar as previsões orçamentárias de despesas e receitas ao longo do ano para refletir as mudanças do mundo real.

A regra fundamental de negócios é que **o ajuste de orçamento vale a partir do mês em que está sendo feito em diante**. Meses passados (fechados/encerrados) nunca devem ser reescritos, preservando o histórico de planejamento original daquele período.

## 2. Regras de Negócio

*   **Vigência Acumulada**: O valor planejado de uma categoria em um mês específico $M$ é o valor definido na revisão ativa mais recente que possua `start_month <= M`.
*   **Imutabilidade do Histórico**: Ao realizar um ajuste no mês $M$:
    *   Se $M = 1$ (Janeiro), o valor ajustado é gravado na revisão inicial (`start_month = 1`).
    *   Se $M > 1$, e já houver uma revisão de orçamento para o ano com `start_month = M`, o item de orçamento (`budget_items`) correspondente à categoria ajustada é inserido/atualizado diretamente nela.
    *   Se $M > 1$, e não houver revisão para o ano com `start_month = M`, uma nova revisão é criada automaticamente para o ano selecionado e `start_month = M` antes de salvar o item de orçamento.
    *   Os meses anteriores a $M$ continuam apontando para as revisões com `start_month < M`, preservando seus valores antigos.
*   **Controle de Edição por Status de Mês**: A edição de previsões orçamentárias só é permitida no mês atualmente "aberto" e nos meses futuros. Meses que já foram encerrados são somente-leitura.
    *   *Nota de Implementação Progressiva*: Como as tabelas e rotinas de Abertura (Item 4) e Fechamento (Item 13) de meses ainda serão implementadas, o sistema usará temporariamente o mês corrente do calendário do mundo real como fallback para delimitar o "mês aberto" (ex: se estamos em Julho, meses anteriores a Julho são somente-leitura; Julho em diante são editáveis).
    *   *Testabilidade em Desenvolvimento*: Para viabilizar testes funcionais e de visualização, em ambiente de desenvolvimento (`process.env.NODE_ENV === 'development'`) e de testes, a interface aceitará a injeção do query parameter `?mockMonth=M` na URL para forçar qual é o mês ativo considerado "aberto" pelo sistema. Esta lógica será completamente ignorada em produção por questões de segurança.
*   **Remoção de Planejamento (Zerar)**: Se o usuário editar o valor de uma categoria para R$ 0 ou limpá-lo, o sistema salva o item com `amount = 0`.
    *   Para o mês do ajuste e subsequentes, categorias com orçamento vigente igual a R$ 0 serão filtradas e **não serão exibidas na tabela**, mantendo a visualização limpa.
    *   O usuário poderá restabelecer o planejamento dessa categoria a qualquer momento utilizando o formulário global de "Adicionar Previsão" no topo.
*   **Unicidade e Auditoria**: O sistema reutiliza a mesma revisão (`budget_revisions`) para todos os ajustes feitos no mesmo mês $M$, limitando a no máximo 12 revisões por ano. O campo `created_by` é preenchido de forma transparente com o email do usuário logado.

## 3. Modelagem de Dados (Supabase / PostgreSQL)

Não há necessidade de alterações nas tabelas criadas no Bloco 1, pois a modelagem atual suporta múltiplos marcos orçamentários (`budget_revisions` e `budget_items`).

## 4. Fluxo e Lógica de Consulta (SQL/JS)

### 4.1. Carregar Orçamento do Mês
O carregamento de itens do orçamento vigentes para o ano $Y$ e mês $M$ é feito consultando os itens de orçamento associados a revisões de $Y$ onde `start_month <= M`.
A ordenação em `getBudgets` resolve a vigência perfeitamente. Na listagem do frontend, filtramos para exibir na tabela apenas itens com `amount > 0`.

### 4.2. Fluxo de Ajuste
Ao salvar um ajuste para uma categoria no ano $Y$, mês $M$, valor $V$:
1.  Verificar se a revisão `R` com `year = Y` e `start_month = M` existe.
2.  Se não existir:
    *   Inserir em `budget_revisions`: `{ year: Y, start_month: M, description: 'Ajuste de Orçamento - Mês M', created_by: email }` e obter seu ID.
3.  Fazer upsert em `budget_items` para a revisão `R.id` e `category_id`: `{ revision_id: R.id, category_id: categoryId, amount: V, created_by: email }`.

## 5. Interface do Usuário (UI/UX)

A página de orçamento `/finance/budget` será atualizada:

### 5.1. Seleção de Mês e Ano
*   No topo, ao lado do dropdown de Ano, haverá um dropdown compacto para selecionar o Mês (de Janeiro a Dezembro), seguindo a Opção B de design aprovada.
*   Ao mudar o Mês ou o Ano, a página carrega dinamicamente o orçamento vigente do mês selecionado.

### 5.2. Edição Inline Direta na Célula (Opção B)
*   Na tabela de visualização de Receitas e Despesas, o valor planejado de cada categoria será interativo.
*   Ao clicar no valor, a célula se transforma em um campo de texto (`<input type="number">`).
*   O salvamento do ajuste é disparado automaticamente se o usuário pressionar `Enter` ou se o campo perder o foco (`onBlur`).
*   Durante a requisição para salvar, a célula exibe um feedback discreto (spinner ou opacity alterada) para indicar o processamento.
*   Se o mês selecionado for somente-leitura (passado), o clique não ativa o input e a célula permanece bloqueada.

## 6. Estratégia de Testes

### 6.1. Testes Unitários de Banco de Dados (`__tests__/lib/db/budget.test.ts`)
*   **Caso de Teste 1**: `getBudgets` deve retornar valores vigentes corretos com múltiplos meses/ajustes.
*   **Caso de Teste 2**: Adicionar testes para a nova lógica de ajustes em meses específicos e criação dinâmica de revisões.

### 6.2. Testes de Componente/Interface
*   Verificar se o dropdown de meses atualiza corretamente a listagem.
*   Validar que a célula de valor se transforma em input apenas nos meses editáveis e que dispara o salvamento no `onBlur` ou `Enter`.

## 7. Critérios de Aceite

*   Interface exibe seletor de Mês como um dropdown compacto ao lado do Ano.
*   A edição ocorre clicando diretamente na célula do valor orçado e é salva ao teclar Enter ou perder o foco.
*   Ajustar um orçamento em um mês $M > 1$ grava o item na revisão correspondente àquele mês, criando-a se ela não existir.
*   Alterações feitas no mês $M$ não alteram o valor exibido na consulta de meses anteriores a $M$.
*   Valores ajustados para `0` ocultam a categoria da tabela daquele mês em diante.
*   Meses passados em relação ao calendário do mundo real (fallback temporário) têm a edição de células desabilitada.
*   Todos os testes passam com sucesso (`npm run test`).
