-- Migração Mílon 01: Tabela public.exercises para a Biblioteca de Exercícios

-- 1. Criar a tabela public.exercises
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  muscle TEXT NOT NULL,
  video_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT NOT NULL
);

-- 2. Habilitar RLS e criar política de acesso
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.exercises;
CREATE POLICY "Permitir tudo para autenticados" ON public.exercises
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Índices para a ordenação por músculo e depois por nome
CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON public.exercises (muscle);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises (name);

-- 4. Registro de Auditoria de Migração em schema_migrations
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
  'milon-01',
  'Biblioteca de Exercícios',
  'migration-milon-01-exercises.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
