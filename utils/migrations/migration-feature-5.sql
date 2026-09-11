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
