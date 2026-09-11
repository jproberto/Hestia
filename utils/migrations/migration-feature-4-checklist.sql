-- 1. Tabela de Checklist de Contas a Pagar / Receber
CREATE TABLE IF NOT EXISTS public.checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.checklist_items(id) ON DELETE SET NULL,
    month_id UUID REFERENCES public.monthly_periods(id) ON DELETE CASCADE,
    day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) CHECK (amount IS NULL OR amount > 0),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by TEXT NOT NULL
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- 3. Criar Política de Acesso para Usuários Autenticados
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.checklist_items;
CREATE POLICY "Permitir tudo para autenticados" ON public.checklist_items 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Registrar a execução do script na tabela de controle de migrações
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
    '03',
    'Checklist de contas a pagar',
    'migration-feature-4-checklist.sql',
    'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
