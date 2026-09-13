-- Migracao Milon 01: Tabela public.exercises para a Biblioteca de Exercicios

-- 1. Criar a tabela public.exercises
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  muscle TEXT NOT NULL,
  video_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT NOT NULL
);

-- 2. Habilitar RLS e criar politica de acesso
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.exercises;
CREATE POLICY "Permitir tudo para autenticados" ON public.exercises
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Indices para a ordenacao por musculo e depois por nome
CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON public.exercises (muscle);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises (name);

-- 4. Self-bootstrap idempotente de public.schema_migrations
-- (o CI aplica por ordem lexicografica: 0007 roda antes da 2a que cria
-- schema_migrations; sem este bloco o INSERT abaixo falha com
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

-- 5. Registro de Auditoria de Migracao em schema_migrations
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
  'milon-01',
  'Biblioteca de Exercicios',
  'migration-0007-milon-exercises.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
