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
    'migration-feature-4.sql',
    'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
