# Especificação: Ajuste de Orçamento ao Longo do Ano (Feature 2a - Correção/Patch)

## 1. Visão Geral e Objetivo

A família precisa revisar e ajustar as previsões orçamentárias de despesas e receitas ao longo do ano para refletir as mudanças do mundo real.

Para garantir a integridade do planejamento e a imutabilidade histórica do que já ocorreu, a interface organiza a visualização do orçamento em torno de **Ajustes** explícitos em vez de meses de calendário soltos. 

## 2. Linguagem Ubíqua (Nomenclatura e Refatoração)

*   **Orçamento Inicial**: A revisão de orçamento inicial cadastrada para o ano corrente (vigência a partir de Janeiro, `start_month = 1`).
*   **Ajuste**: Qualquer revisão subsequente criada em meses futuros (mês > 1) que altera o planejamento (ex: *"Ajuste de Outubro/2026"*).
*   **Criar Novo Ajuste**: Ação explícita do usuário de criar um marco orçamentário para o mês corrente.
*   *Refatoração Física de Banco de Dados*: Como estamos em fase inicial, o plano de implementação deve analisar e, se necessário, executar a renomeação das tabelas e chaves no Supabase para refletir a linguagem ubíqua:
    *   Renomear a tabela `budget_revisions` para `budget_adjustments` (ou similar).
    *   Renomear chaves estrangeiras como `revision_id` para `adjustment_id` na tabela `budget_items`.
    *   Refatorar os serviços do Next.js e variáveis locais para eliminar o termo genérico `revision` em prol de `adjustment` ou `budgetAdjustment`.

## 3. Regras de Negócio

*   **Vigência Acumulada (Herança)**: O valor planejado de uma categoria em um ajuste vigente no mês $M$ é o valor definido na revisão ativa mais recente que possua `start_month <= M`. O Ajuste exibe o orçamento consolidado (itens dele + itens herdados de ajustes de meses anteriores).
*   **Navegação por Linha do Tempo de Ajustes**: A UI não oferece um dropdown fixo de 12 meses para carregar meses arbitrários para edição. Em vez disso, exibe uma linha do tempo/seletor de **Ajustes cadastrados** para o ano (ex: *Orçamento Inicial*, *Ajuste de Agosto*, *Ajuste de Outubro*).
*   **Regra de Editabilidade Estrita**:
    *   Um **Ajuste** só é editável se o seu mês de início de vigência (`start_month`) for **igual ao mês corrente** do calendário do mundo real (ou ao `mockMonth` em ambiente de testes/desenvolvimento).
    *   Se o Ajuste selecionado na UI tiver vigência (`start_month`) diferente do mês corrente:
        *   Toda a tabela de orçamento é renderizada em **modo somente-leitura** (sem inputs inline, cursor padrão).
        *   O botão *"Adicionar Previsão"* fica oculto.
        *   O sistema exibe um botão proeminente **"Criar Novo Ajuste"** (apenas se ainda não houver um ajuste cadastrado para o mês corrente).
*   **Criação Explícita de Ajustes**:
    *   Ao clicar em **"Criar Novo Ajuste"**, o sistema cria imediatamente uma nova revisão associada ao `start_month = mês_corrente`, com descrição *"Ajuste de [Nome do Mês Atual]"* e o e-mail do usuário logado.
    *   A página recarrega automaticamente selecionando o novo ajuste, que agora estará editável por ter vigência igual ao mês corrente.
*   **Remoção de Planejamento (Zerar)**: Se o usuário editar o valor de uma categoria para `0`, o sistema salva o item com `amount = 0`. Categorias com valor `0` a partir daquele mês não são exibidas na tabela, mantendo a visualização limpa.
*   **Testabilidade em Desenvolvimento**: Para fins de validação visual e testes automatizados, em ambiente de desenvolvimento (`process.env.NODE_ENV === 'development'`) e de testes, a interface aceitará a injeção do query parameter `?mockMonth=M` na URL para forçar qual é o mês corrente (mês aberto).

## 4. Modelagem de Dados e API (Supabase)

A modelagem física final e queries SQL no Supabase devem ser alinhadas com as refatorações de nomenclatura do item 2.
Para carregar o orçamento de um Ajuste selecionado com vigência no mês `M`:
*   O frontend executa a consulta de agregação para carregar os itens vigentes até o mês `M` (herança automática).

### 4.1 Tabela de Controle de Migrações (`schema_migrations`)
Para fins de controle de consistência e auditoria de deploy entre ambientes (desenvolvimento vs produção), o banco expõe a tabela `public.schema_migrations`:
- `id` (SERIAL, PRIMARY KEY)
- `spec_id` (VARCHAR(50), ex: `"02a"`)
- `spec_name` (TEXT, nome da especificação)
- `script_name` (TEXT, UNIQUE, nome do script SQL de migração executado)
- `executed_at` (TIMESTAMP WITH TIME ZONE, data/hora da execução)
- `executed_by` (TEXT, e-mail ou identificador de quem rodou a migração)

## 5. Interface do Usuário (UI/UX)

*   **Seletor de Ajustes**: Um dropdown compacto no topo ao lado do Ano, listando todos os ajustes cadastrados no ano.
*   **Feedback de Bloqueio de Edição**:
    *   Quando a revisão/ajuste selecionada for de outro mês (somente-leitura), a ausência de sublinhado nas células e a presença do botão "Criar Novo Ajuste" servem como feedbacks suficientes de que a edição está desabilitada para aquele marco. Nenhuma badge extra de Aberto/Fechado é necessária.
*   **Edição Inline**: Clique na célula de valor abre o input numérico focado. Salva ao teclar `Enter` ou perder o foco (`onBlur`), prevenindo comportamentos de recarregamento e parando a propagação de eventos.

## 6. Critérios de Aceite

1.  A navegação da página de orçamentos ocorre através de um dropdown de Ajustes cadastrados, e não por meses fixos.
2.  Ao acessar a página, o Ajuste selecionado por padrão é o mais atual do ano.
3.  A edição inline e o formulário global só são habilitados se o Ajuste visualizado tiver `start_month` igual ao mês atual (ou `mockMonth`).
4.  Se o Ajuste visualizado for de outro mês, a tabela fica bloqueada e o botão "Criar Novo Ajuste" é exibido.
5.  Clicar em "Criar Novo Ajuste" insere no Supabase a revisão do mês atual, focando-a na UI e abrindo-a para edição.
6.  Definir um valor como `0` oculta a categoria da listagem dali em diante.
7.  As nomenclaturas de tabelas (opcional) e variáveis são atualizadas de `revisions` para `adjustments`.
8.  Todos os testes unitários e de UI passam com sucesso (`npm run test`).
9.  O banco de dados expõe a tabela `public.schema_migrations` registrando o histórico de scripts executados.
