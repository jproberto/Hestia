-- Migracao Milon 02: Tabela public.programs para Programas (container de treinos por dono)

-- 1. Criar a tabela public.programs
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'ativo', 'inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT NOT NULL
);

-- 2. Habilitar RLS e criar politica de acesso
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.programs;
CREATE POLICY "Permitir tudo para autenticados" ON public.programs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Indices para filtro por dono + ordenacao por data de criacao (mais novo primeiro)
CREATE INDEX IF NOT EXISTS idx_programs_owner_created ON public.programs (owner, created_at DESC);

-- 4. Indice parcial unico: no maximo um programa ativo por dono
CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_one_active_per_owner ON public.programs (owner) WHERE status = 'ativo';

-- 5. Self-bootstrap idempotente de public.schema_migrations
-- (o CI aplica por ordem lexicografica: 0007/0008 rodam antes das migration-feature-*
-- que criam schema_migrations; sem este bloco o INSERT abaixo falha com
-- ON_ERROR_STOP=1. Definicao de colunas identica a 2a; tudo IF NOT EXISTS.)
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    spec_id VARCHAR(50) NOT NULL,
    spec_name TEXT NOT NULL,
    script_name TEXT NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    executed_by TEXT
);

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.schema_migrations;
CREATE POLICY "Permitir tudo para autenticados" ON public.schema_migrations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Registro de Auditoria de Migracao em schema_migrations
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
  'milon-02',
  'Programas',
  'migration-0008-milon-programs.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
