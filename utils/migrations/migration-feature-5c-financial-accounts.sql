-- Migração Feature 5c: Tabela public.financial_accounts para Contas e Cartões

-- 1. Criar a tabela public.financial_accounts
CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('conta', 'cartao')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by TEXT NOT NULL
);

-- 2. Habilitar RLS e criar política de acesso
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados em financial_accounts" ON public.financial_accounts;
CREATE POLICY "Permitir tudo para autenticados em financial_accounts" ON public.financial_accounts 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Remover a tabela antiga accounts caso exista no ambiente dev
DROP TABLE IF EXISTS public.accounts CASCADE;

-- 4. Limpar qualquer coluna duplicada de testes anteriores em transactions
ALTER TABLE public.transactions DROP COLUMN IF EXISTS financial_account_id;

-- 5. Vincular a FK account_id da tabela transactions diretamente para financial_accounts(id)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_account_id_fkey 
  FOREIGN KEY (account_id) REFERENCES public.financial_accounts(id) ON DELETE RESTRICT;

-- 6. Registro de Auditoria de Migração em schema_migrations
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
  '05c',
  'Substituição da tabela accounts por financial_accounts',
  'migration-feature-5c-financial-accounts.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
