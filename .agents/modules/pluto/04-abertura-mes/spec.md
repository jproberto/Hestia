# Especificação técnica: Abertura de Mês (Item 4 do Backlog)

Esta especificação define a arquitetura técnica e o comportamento da funcionalidade de **Abertura de Mês** no projeto Héstia.

---

## 1. Problema e Contexto

No fluxo de controle financeiro do Héstia, receitas e despesas reais não devem ser registradas em períodos arbitrários sem planejamento operacional prévio. 
Antes de qualquer lançamento real ser efetuado (Feature 5), o respectivo mês precisa ser explicitamente **Aberto**. 
Esse ato demarca o início das operações de lançamentos e atua como um portão de segurança, permitindo o isolamento de períodos passados e impedindo modificações em períodos já encerrados (Feature 13).

---

## 2. Modelagem do Banco de Dados

Criaremos a tabela `public.monthly_periods` para armazenar o estado operacional de cada mês.

### Script de Migração: `utils/migrations/migration-feature-3.sql`

```sql
-- 1. Criar a tabela de controle de períodos mensais
CREATE TABLE IF NOT EXISTS public.monthly_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL CHECK (year >= 2026),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    status TEXT NOT NULL CHECK (status IN ('aberto', 'encerrado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by TEXT NOT NULL,
    CONSTRAINT unique_year_month UNIQUE (year, month)
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.monthly_periods ENABLE ROW LEVEL SECURITY;

-- 3. Criar Política de Acesso para Usuários Autenticados
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.monthly_periods;
CREATE POLICY "Permitir tudo para autenticados" ON public.monthly_periods 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Registrar a execução do script na tabela de controle de migrações
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
    '04',
    'Abertura de Mês',
    'migration-feature-3.sql',
    'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
```

---

## 3. Abstração de Acesso a Dados (`lib/pluto/db/months.ts`)

Encapsularemos as operações do banco de dados relativas aos períodos mensais nas seguintes funções:

```typescript
import { SupabaseClient } from "@supabase/supabase-js";

export interface MonthlyPeriod {
  id: string;
  year: number;
  month: number;
  status: 'aberto' | 'encerrado';
  created_at: string;
  created_by: string;
}

/**
 * Busca todos os períodos mensais cadastrados para um determinado ano.
 */
export async function getMonthlyPeriods(
  supabase: SupabaseClient,
  year: number
): Promise<MonthlyPeriod[]> {
  const { data, error } = await supabase
    .from("monthly_periods")
    .select("*")
    .eq("year", year)
    .order("month", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Abre ou reabre um determinado mês do ano.
 */
export async function openMonthlyPeriod(
  supabase: SupabaseClient,
  year: number,
  month: number,
  email: string
): Promise<void> {
  const { error } = await supabase
    .from("monthly_periods")
    .upsert({
      year,
      month,
      status: "aberto",
      created_by: email
    }, { onConflict: "year,month" });

  if (error) throw error;
}

/**
 * Encerra um determinado mês do ano.
 */
export async function closeMonthlyPeriod(
  supabase: SupabaseClient,
  year: number,
  month: number,
  email: string
): Promise<void> {
  const { error } = await supabase
    .from("monthly_periods")
    .upsert({
      year,
      month,
      status: "encerrado",
      created_by: email
    }, { onConflict: "year,month" });

  if (error) throw error;
}
```

---

## 4. Interface do Usuário (`app/pluto/months/page.tsx`)

Criaremos uma nova página `/pluto/months` com um design premium e responsivo.

### Funcionalidades da Tela:
1. **Seletor de Ano:** Um dropdown contendo opções (2026, 2027, 2028), inicializado no ano corrente.
2. **Resumo Anual:** Exibição do total de meses abertos, encerrados e não iniciados para o ano selecionado.
3. **Grid Anual (12 Cards):** Uma coleção de 12 cards, organizados visualmente por ordem cronológica (Janeiro a Dezembro).
4. **Estados Visuais de cada Card:**
   * **Não Iniciado (Cinza):** O período não existe no banco de dados. Exibe um botão **"Abrir Mês"**.
   * **Aberto (Verde):** Período com `status = 'aberto'`. Exibe badge verde e um botão **"Encerrar Mês"** (para suportar o ciclo de vida futuro).
   * **Encerrado (Vermelho/Escuro):** Período com `status = 'encerrado'`. Exibe badge correspondente e um botão **"Reabrir Mês"**.
5. **Navegação Integrada:** Adição de abas de atalho rápido no cabeçalho financeiro para transição fluida entre:
   * **Metas de Orçamento (`/pluto/budget`)**
   * **Meses e Períodos (`/pluto/months`)**

---

## 5. Critérios de Aceite e Testes

### Regras de Negócio e Validações
* A abertura de qualquer mês é livre e independente (sem dependência cronológica estrita).
* O e-mail do usuário autenticado no Supabase é gravado em `created_by` nas auditorias transparentes.
* O estado é alterado dinamicamente na UI com feedbacks de carregamento local por card para evitar "flashes" de tela inteira.

### Plano de Testes Automatizados
* **Testes de Integração de Banco (`__tests__/lib/pluto/db/months.test.ts`):**
  * Verificar inserção de um período aberto.
  * Verificar alteração de status para encerrado.
  * Verificar comportamento de unicidade de `(year, month)`.
  * Garantir leitura por ano.
* **Testes de Interface (`__tests__/app/pluto/months-page.test.tsx`):**
  * Verificar renderização dos 12 meses do ano selecionado.
  * Validar cliques em "Abrir Mês", "Encerrar Mês" e "Reabrir Mês" disparando as respectivas chamadas à API do banco.
