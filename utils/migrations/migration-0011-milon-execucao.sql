-- Migracao Milon 05: Execucao serie a serie (execucoes + realizadas, D1/D2/D3)
-- Duas tabelas novas; nenhum coluna nova no template (feito nunca vive no template).

-- 1. Tabela public.workout_executions (instancia da ida a academia; fim nulo = aberta, D2)
CREATE TABLE IF NOT EXISTS public.workout_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts (id) ON DELETE RESTRICT,
  program_id UUID NOT NULL REFERENCES public.programs (id) ON DELETE RESTRICT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT NOT NULL
);

-- 2. Tabela public.workout_execution_series (retrato do feito por serie, D3)
CREATE TABLE IF NOT EXISTS public.workout_execution_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workout_executions (id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.workout_entries (id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES public.workout_series (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  reps INTEGER,
  duration_seconds INTEGER,
  load NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT NOT NULL,
  CONSTRAINT uq_workout_execution_series_execution_series UNIQUE (execution_id, series_id)
);

-- 3. RLS padrao do modulo nas duas tabelas novas
ALTER TABLE public.workout_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.workout_executions;
CREATE POLICY "Permitir tudo para autenticados" ON public.workout_executions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.workout_execution_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.workout_execution_series;
CREATE POLICY "Permitir tudo para autenticados" ON public.workout_execution_series
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Indices: no maximo uma aberta por treino (parcial, D11 adaptado) + historico futuro + realizadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_executions_open_unique
  ON public.workout_executions (workout_id) WHERE finished_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workout_executions_program_started
  ON public.workout_executions (program_id, started_at);
CREATE INDEX IF NOT EXISTS idx_workout_execution_series_execution
  ON public.workout_execution_series (execution_id);

-- 5. Self-bootstrap idempotente de public.schema_migrations
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
  'milon-05',
  'Execução série a série',
  'migration-0011-milon-execucao.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
