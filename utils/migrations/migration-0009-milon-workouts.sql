-- Migracao Milon 03: Treinos e series planejadas (treinos, entradas e series + unidade/soft delete)

-- 1. Criar a tabela public.workouts (ordem de criacao + desempate deterministico por id)
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs (id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT NOT NULL
);

-- 2. Criar a tabela public.workout_entries (program_id denormalizado p/ checagem D14 em 1 consulta)
CREATE TABLE IF NOT EXISTS public.workout_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts (id) ON DELETE RESTRICT,
  program_id UUID NOT NULL REFERENCES public.programs (id) ON DELETE RESTRICT,
  exercise_id UUID NOT NULL REFERENCES public.exercises (id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,
  rest_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT NOT NULL
);

-- 3. Criar a tabela public.workout_series (rede de seguranca: CASCADE cobre falha no meio da remocao)
CREATE TABLE IF NOT EXISTS public.workout_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.workout_entries (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  reps INTEGER,
  duration_seconds INTEGER,
  load NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT NOT NULL
);

-- 4. Colunas novas na biblioteca: unidade de carga (D10) + soft delete do historico
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS load_unit TEXT NULL CHECK (load_unit IN ('kg', 'libra'));
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

-- 5. Habilitar RLS e criar politicas de acesso nas 3 tabelas novas
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.workouts;
CREATE POLICY "Permitir tudo para autenticados" ON public.workouts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.workout_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.workout_entries;
CREATE POLICY "Permitir tudo para autenticados" ON public.workout_entries
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.workout_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.workout_series;
CREATE POLICY "Permitir tudo para autenticados" ON public.workout_series
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Indices: busca por Programa com ordenacao de criacao + unicidade D14 + posicoes
CREATE INDEX IF NOT EXISTS idx_workouts_program_created ON public.workouts (program_id, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_entries_program_exercise ON public.workout_entries (program_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_entries_workout_position ON public.workout_entries (workout_id, position);
CREATE INDEX IF NOT EXISTS idx_workout_series_entry_position ON public.workout_series (entry_id, position);

-- 7. Self-bootstrap idempotente de public.schema_migrations
-- (o CI aplica por ordem lexicografica: migration-0009-* roda antes das
-- migration-feature-* que criam schema_migrations; sem este bloco o INSERT
-- abaixo falha com ON_ERROR_STOP=1. Definicao de colunas identica a 0008;
-- tudo IF NOT EXISTS.)
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

-- 8. Registro de Auditoria de Migracao em schema_migrations
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
  'milon-03',
  'Treinos e séries planejadas',
  'migration-0009-milon-workouts.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
