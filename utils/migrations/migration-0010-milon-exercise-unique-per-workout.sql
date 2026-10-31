-- Migracao Milon 03 (parte 2): Alterar unicidade de exercicio de por Programa para por Treino (D14 corrigido)

-- 1. Remover indice unico antigo (por Programa)
DROP INDEX IF EXISTS idx_workout_entries_program_exercise;

-- 2. Criar indice unico novo (por Treino)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_entries_workout_exercise ON public.workout_entries (workout_id, exercise_id);

-- 3. Self-bootstrap idempotente de public.schema_migrations
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

-- 3. Registro de Auditoria de Migracao em schema_migrations
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
  'milon-03',
  'Treinos e séries planejadas - D14 unicidade por treino',
  'migration-0010-milon-exercise-unique-per-workout.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;