# Especificação Técnica: Cadastro de Transações (Item 5 do Backlog)

Esta especificação define o comportamento, as regras de negócio, o modelo de dados e os critérios de aceite para a funcionalidade de **Cadastro de Transações** do Héstia.

---

## 1. Problema e Contexto

No Héstia, os dois usuários da família precisam registrar suas receitas e despesas reais do dia a dia (salários, compras no cartão, pagamentos, estornos e saldo inicial) de forma simples, transparente e auditável.

As transações dependem do conceito de **Conta** (corrente, cartão, reserva), que nasce nesta funcionalidade, e reutilizam o conceito de **Categoria**, permitindo a criação de novas categorias *inline* durante o lançamento.

---

## 2. Decisões Tomadas e Alternativas Rejeitadas

* **Validação de Período Operacional:**
  * *Decisão:* Uma transação só pode ser salva em datas cujos meses correspondentes estejam com status `'aberto'` em `monthly_periods`.
  * *Alternativas Rejeitadas:* Permitir lançar em qualquer mês ou abrir meses automaticamente (rejeitado para manter o controle operacional consciente da Abertura de Mês - Feature 4).
* **Nascimento Inline de Contas e Categorias:**
  * *Decisão:* Se o usuário informar o nome de uma Conta ou Categoria que ainda não exista no banco, o sistema cria o registro automaticamente *inline*.
  * *Alternativas Rejeitadas:* Exigir cadastro prévio em telas separadas (rejeitado para evitar atrito no fluxo de lançamento).
* **Tratamento do Saldo Inicial:**
  * *Decisão:* Registrado como uma transação do tipo `receita` vinculada à categoria nativa `"Saldo Inicial"`.
  * *Alternativas Rejeitadas:* Criar um campo de saldo estático na tabela da conta (rejeitado para manter o histórico unificado na tabela de transações).
* **Estornos e Reembolsos (Marcação `is_refund`):**
  * *Decisão:* Lançados como despesa com valor positivo, ativando a opção/marcação **"Estorno / Reembolso"** (`is_refund = true`). O motor de cálculo abate o valor do gasto realizado daquela categoria sem inflar a receita bruta.
  * *Alternativas Rejeitadas:* Exigir digitação de valores negativos (rejeitado por UX contra-intuitiva) ou lançar como receita flexível em categoria de despesa (rejeitado por causar confusão visual no extrato).
* **Navegação e Interface:**
  * *Decisão:* Página dedicada `/finance/transactions` com seletor mensal, cards de resumo e modal de lançamento.
  * *Alternativas Rejeitadas:* Painel drawer embutido na tela de meses (rejeitado por limitar o espaço para tabelas de extrato longas).

---

## 3. Modelo de Banco de Dados

### 3.1 Tabela `public.accounts`
Representa as contas financeiras (corrente, cartão de crédito, investimentos/reserva).
* `id` (UUID, Primary Key)
* `name` (TEXT, NOT NULL, UNIQUE) — Nome da conta (ex: "Itaú", "Nubank").
* `created_at` (TIMESTAMP WITH TIME ZONE, DEFAULT now())
* `created_by` (TEXT, NOT NULL) — E-mail do usuário criador.

### 3.2 Tabela `public.transactions`
Armazena todos os lançamentos individuais de receitas e despesas.
* `id` (UUID, Primary Key)
* `description` (TEXT, NOT NULL) — Descrição do lançamento (ex: "Supermercado").
* `amount` (NUMERIC(12, 2), NOT NULL, CHECK (amount > 0)) — Valor positivo do lançamento.
* `type` (TEXT, CHECK (type IN ('receita', 'despesa'))) — Tipo do lançamento.
* `is_refund` (BOOLEAN, NOT NULL, DEFAULT false) — Flag indicando se é um estorno/reembolso.
* `date` (DATE, NOT NULL) — Data de competência do lançamento (YYYY-MM-DD).
* `category_id` (UUID, Foreign Key -> `categories.id`, ON DELETE RESTRICT)
* `account_id` (UUID, Foreign Key -> `accounts.id`, ON DELETE RESTRICT)
* `created_at` (TIMESTAMP WITH TIME ZONE, DEFAULT now())
* `created_by` (TEXT, NOT NULL) — E-mail do usuário que registrou.

### 3.3 Script de Migração DDL (`utils/migrations/migration-feature-5.sql`)

```sql
-- 1. Tabela de Contas
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by TEXT NOT NULL
);

-- 2. Tabela de Transações
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
    is_refund BOOLEAN NOT NULL DEFAULT false,
    date DATE NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by TEXT NOT NULL
);

-- 3. RLS Policies
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.accounts;
CREATE POLICY "Permitir tudo para autenticados" ON public.accounts 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.transactions;
CREATE POLICY "Permitir tudo para autenticados" ON public.transactions 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Registro de Auditoria de Migração
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
    '05',
    'Cadastro de Transações',
    'migration-feature-5.sql',
    'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
```

---

## 4. Requisitos Funcionais e Regras de Negócio

1. **Bloqueio de Período Fechado:**
   - Ao salvar uma transação, o sistema extrai o ano e o mês da data do lançamento.
   - O lançamento é bloqueado se não existir um registro em `monthly_periods` para o ano/mês com `status = 'aberto'`.
   - Se o mês for 'encerrado' ou não tiver sido iniciado, o sistema exibe uma mensagem de erro clara.

2. **Criação Inline de Contas e Categorias:**
   - Durante o preenchimento, se o usuário informar um nome de conta ou categoria não cadastrado previamente, o sistema deve criá-lo automaticamente no banco de dados com auditoria do usuário logado.

3. **Cálculos e Exibição do Resumo Mensal:**
   - **Total Entradas:** Soma de todas as transações com `type = 'receita'`.
   - **Total Saídas:** `(Soma das despesas onde is_refund = false) - (Soma das despesas onde is_refund = true)`.
   - **Resultado do Mês:** `Total Entradas - Total Saídas`.

---

## 5. Interface do Usuário (UI/UX)

- Rota: `/finance/transactions`
- **Cabeçalho:** Barra de navegação financeira com atalhos para *Orçamento*, *Meses* e *Lançamentos*.
- **Controles Superiores:** Seletor de Ano e Mês para filtrar a exibição dos lançamentos.
- **Cards de Resumo:** 3 cards destacados exibindo Entradas (Verde), Saídas (Vermelho) e Resultado do Mês.
- **Botão de Ação:** Botão "+ Nova Transação" que exibe o formulário de lançamento.
- **Formulário de Lançamento:**
  - Data (Input Date, validado contra meses abertos).
  - Descrição (Input Text).
  - Tipo (Toggle: Receita / Despesa).
  - Valor em R$ (Input Numeric positivo).
  - Checkbox/Toggle: **"É um estorno/reembolso?"** (visível quando Tipo = Despesa).
  - Seleção de Conta (Dropdown com busca/criação inline).
  - Seleção de Categoria (Dropdown com busca/criação inline).
- **Tabela de Extrato:** Exibição cronológica dos lançamentos contendo Data, Descrição, Categoria, Conta, Usuário que lançou, Tipo, Marcação de Estorno e Valor formatado em BRL.

---

## 6. Critérios de Aceite e Testes

1. **Validação de Mês Aberto:**
   - *Dado* que o mês de Março/2026 está 'encerrado' ou não iniciado.
   - *Quando* o usuário tentar salvar uma transação com data em 15/03/2026.
   - *Então* o sistema deve rejeitar o salvamento e exibir uma mensagem de erro informando que o período não está aberto.

2. **Sucesso no Lançamento em Mês Aberto:**
   - *Dado* que o mês de Abril/2026 está com `status = 'aberto'`.
   - *Quando* o usuário salvar uma transação válida.
   - *Então* a transação é gravada no banco com o `created_by` do usuário autenticado e exibida na tabela.

3. **Criação Inline:**
   - *Dado* que a conta "Itaú" não existe na tabela `accounts`.
   - *Quando* o usuário digitar "Itaú" no formulário e salvar a transação.
   - *Então* o registro é criado na tabela `accounts` e a transação é vinculada ao ID dessa nova conta.

4. **Tratamento de Estornos (`is_refund = true`):**
   - *Dado* uma despesa de R$ 50,00 marcada com `is_refund = true` na categoria "Saúde".
   - *Quando* o resumo do mês for calculado.
   - *Então* o total de saídas da categoria "Saúde" é reduzido em R$ 50,00 e o total de receitas permanece inalterado.
