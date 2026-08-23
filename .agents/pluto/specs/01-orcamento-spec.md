# Especificação: Orçamento Anual por Categoria (Feature 1)

## 1. Visão Geral e Objetivo

O orçamento anual por categoria é o ponto de partida do gerenciamento financeiro do Héstia. Antes que qualquer lançamento real de receita ou despesa exista no sistema, o usuário define quanto a família planeja arrecadar e gastar em cada categoria para o ano inteiro.

Esta especificação define o cadastro do orçamento inicial, a criação inline de categorias, as tabelas de banco de dados normalizadas com auditoria transparente e a interface do usuário em `/pluto/budget`.

## 2. Regras de Negócio

*   **Vigência por Revisões**: O orçamento não é definido individualmente mês a mês. Os valores planejados são preenchidos uma única vez para o ano inteiro (vigência a partir do mês 1). Alterações futuras (ajustes) em meses específicos serão tratadas como revisões de vigência em features posteriores.
*   **Banco de Dados Compartilhado**: Não há isolamento de família no banco de dados. Os dois usuários compartilham todas as tabelas de orçamento e categorias de maneira global.
*   **Cadastro Inline de Categorias**: Não existe uma tela ou fluxo separado de cadastro de categorias. As categorias são criadas automaticamente "inline" no momento em que o usuário insere um novo item de previsão e o nome digitado não corresponde a nenhuma categoria existente no banco de dados.
*   **Unicidade de Categoria**: O nome da categoria é único no banco de dados para evitar duplicidade. Uma categoria pode ser do tipo `receita` ou `despesa`.
*   **Restrições de Exclusão (Auditores/Integridade)**:
    *   Não é possível excluir uma revisão de orçamento (`budget_revisions`) se existirem registros de itens de orçamento (`budget_items`) apontando para ela.
    *   Não é possível excluir uma categoria (`categories`) se existirem registros de itens de orçamento (`budget_items`) associados a ela.
*   **Auditoria Transparente**: Todas as tabelas do banco de dados devem conter as colunas de auditoria `created_at`, `updated_at` (quando aplicável) e `created_by` (armazenando o email do usuário autenticado no formato TEXT para manter o histórico de auditoria caso o usuário seja excluído).

## 3. Modelagem de Dados (Supabase / PostgreSQL)

### 3.1. Tabela: `categories`
Armazena a lista de categorias do sistema.
```sql
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by TEXT
);
```

### 3.2. Tabela: `budget_revisions`
Armazena os marcos de vigência orçamentária para cada ano.
```sql
CREATE TABLE public.budget_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL CHECK (year >= 2026),
    start_month INTEGER NOT NULL CHECK (start_month BETWEEN 1 AND 12),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by TEXT,
    CONSTRAINT unique_year_start_month UNIQUE (year, start_month)
);
```

### 3.3. Tabela: `budget_items`
Vincula valores de previsão mensal para categorias a uma revisão orçamentária específica.
```sql
CREATE TABLE public.budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by TEXT,
    CONSTRAINT unique_revision_category UNIQUE (revision_id, category_id)
);
```

## 4. Fluxo e Lógica de Consulta (SQL)

Para carregar os valores do orçamento planejado vigente em um mês/ano específico:
```sql
SELECT DISTINCT ON (bi.category_id)
  bi.category_id,
  c.name AS category_name,
  c.type AS category_type,
  bi.amount,
  br.start_month
FROM public.budget_items bi
JOIN public.budget_revisions br ON bi.revision_id = br.id
JOIN public.categories c ON bi.category_id = c.id
WHERE br.year = $1 AND br.start_month <= $2
ORDER BY bi.category_id, br.start_month DESC;
```
*No escopo desta Feature 1, as previsões são salvas na revisão com `start_month = 1`, de modo que o cálculo sempre buscará o orçamento inicial de janeiro.*

## 5. Interface do Usuário (UI/UX)

### 5.1. Dashboard Principal (`/dashboard`)
*   Será adicionado um link ou card de atalho para a ferramenta financeira: **"Héstia Financeira"**, que redireciona para a rota `/pluto/budget`.

### 5.2. Página de Orçamento Anual (`/pluto/budget`)
A interface terá o seguinte fluxo de estados:

1.  **Escolha do Ano**: Um dropdown no topo com o ano selecionado (padrão é o ano atual).
2.  **Estado Sem Orçamento (Vazio)**:
    *   Se não houver nenhuma revisão em `budget_revisions` para o ano selecionado:
        *   Exibir uma mensagem: *"Nenhum orçamento cadastrado para o ano [Ano]."*
        *   Um botão proeminente **"Iniciar Orçamento de [Ano]"**.
        *   Ao clicar nesse botão, o sistema criará a primeira revisão (`start_month` = 1, `description` = "Orçamento Inicial [Ano]") e exibirá a visualização de grade abaixo.
3.  **Visualização do Orçamento Iniciado**:
    *   Duas seções bem definidas:
        *   **Receitas Previstas**: Tabela com colunas `Categoria` e `Valor Planejado Mensal`.
        *   **Despesas Previstas**: Tabela com colunas `Categoria` e `Valor Planejado Mensal`.
    *   **Resumo Geral**:
        *   Total Receitas: Soma de todos os valores planejados de receita.
        *   Total Despesas: Soma de todos os valores planejados de despesa.
        *   Saldo Planejado Mensal: `Total Receitas - Total Despesas`.
4.  **Cadastro Inline de Previsões**:
    *   Botão **"Adicionar Previsão"** que abre um formulário inline ou modal simples com:
        *   Dropdown de Tipo: `Receita` ou `Despesa`.
        *   Input de Categoria (autocompletar de categorias existentes. Se o usuário digitar um nome inexistente, a categoria é inserida no banco no momento do envio).
        *   Input de Valor Planejado Mensal.
    *   Ação de Salvar:
        *   Se a categoria for nova, cria em `categories`.
        *   Cria/atualiza o `budget_items` correspondente para a revisão inicial daquele ano.

## 6. Estratégia de Testes e TDD

Como o projeto ainda não possui nenhuma infraestrutura de testes implementada, o desenvolvimento desta feature será precedido pela configuração do ambiente de testes utilizando o **Vitest**.

### 6.1. Stack de Testes a Configurar
*   **Executor**: `vitest` (rápido e compatível nativamente com Next.js + TypeScript).
*   **DOM Environment**: `jsdom` (para testes de componentes React).
*   **React Testing**: `@testing-library/react` e `@testing-library/jest-dom` para asserções ricas do DOM.

### 6.2. Estratégia de TDD (Testes a Escrever Antes/Durante a Implementação)
Para garantir a integridade da lógica de negócios, os seguintes testes unitários e de integração são obrigatórios:

1.  **Lógica de Vigência de Orçamentos (Cálculo de Previsão Ativa)**:
    *   **Caso de Teste 1**: Dado um conjunto de revisões orçamentárias (ex: inicial no mês 1 de R$ 800 e ajuste no mês 4 de R$ 1000), o cálculo do orçamento para o mês 2 (Fevereiro) deve retornar R$ 800 (previsão inicial).
    *   **Caso de Teste 2**: Para o mesmo conjunto, o cálculo do orçamento para o mês 5 (Maio) deve retornar R$ 1000 (previsão ajustada).
    *   **Caso de Teste 3**: Se não houver revisões para o ano consultado, deve retornar zero ou vazio.
2.  **Criação Inline de Categorias**:
    *   **Caso de Teste 1**: Se o nome da categoria digitado já existe no banco de dados, o sistema deve associar a previsão à categoria existente (não criar duplicada).
    *   **Caso de Teste 2**: Se o nome não existe, o sistema deve registrar a nova categoria antes de criar a previsão.
3.  **UI da Página de Orçamento (`/pluto/budget`)**:
    *   **Caso de Teste 1**: Verificar se a tela renderiza corretamente o estado vazio caso não haja orçamento iniciado.
    *   **Caso de Teste 2**: Verificar se, após clicar em "Iniciar Orçamento", a grade de receitas/despesas e o formulário de inserção inline aparecem corretamente.
    *   **Caso de Teste 3**: Validar se o saldo planejado mensal atualiza dinamicamente conforme previsões são adicionadas.

## 7. Critérios de Aceite

*   O ambiente de testes Vitest está configurado e executando com sucesso através de `npm run test` ou `npx vitest`.
*   O usuário logado consegue visualizar e selecionar o ano do orçamento.
*   Se o ano não tiver orçamento, o botão "Iniciar Orçamento" cria um registro de revisão com `start_month = 1`.
*   O formulário de previsão adiciona novas categorias automaticamente de forma inline sem exigir navegação.
*   Todas as tabelas preenchem `created_by` de forma transparente com o email do usuário atualmente autenticado.
*   Exclusão de categorias ou revisões que possuem relacionamentos ativos são bloqueadas pelo banco de dados (`ON DELETE RESTRICT`).
*   O saldo planejado é recalculado dinamicamente na tela.
*   Todos os testes da estratégia descrita acima passam com sucesso.

