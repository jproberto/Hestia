-- Migracao Milon 05 (aditamento 2026-10-10, D34): coluna unica de valor nas series
-- As duas colunas de valor das series planejadas (reps + duration_seconds,
-- migracao 0009 aplicada) viram UMA coluna unica chamada value (inteira, nula
-- permitida, com restricao de nao-negatividade permitindo nulo). O retrato da
-- execucao (workout_execution_series, migracao 0011 aplicada) acompanha com o
-- mesmo desenho para manter a paridade template-retrato. Trocar o modo da
-- entry entre Repeticoes e Tempo nunca muda o numero: cai da modelagem (uma so
-- coluna; so o rotulo deriva do modo da entry).
-- Incremental: nunca edita migracao aplicada. Nenhuma tabela nova.

-- 1. Coluna nova value nas duas tabelas de series (idempotente; nula permitida
-- com nao-negatividade; nulo significa vazio, nunca zero forcado)
ALTER TABLE public.workout_series
  ADD COLUMN IF NOT EXISTS value INTEGER CHECK (value IS NULL OR value >= 0);
ALTER TABLE public.workout_execution_series
  ADD COLUMN IF NOT EXISTS value INTEGER CHECK (value IS NULL OR value >= 0);

-- 2. Preenchimento das linhas existentes pela coalescencia das antigas (reps
-- primeiro, tempo como fallback — coerente com o fallback de leitura para
-- repeticoes). Guardado por existencia da coluna antiga para reexecucao
-- idempotente (apos o drop do passo 3 a guarda desvia o preenchimento).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workout_series' AND column_name = 'reps') THEN
    UPDATE public.workout_series
    SET value = COALESCE(reps, duration_seconds)
    WHERE value IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workout_execution_series' AND column_name = 'reps') THEN
    UPDATE public.workout_execution_series
    SET value = COALESCE(reps, duration_seconds)
    WHERE value IS NULL;
  END IF;
END $$;

-- 3. Remocao das duas colunas antigas nas duas tabelas, no mesmo arquivo (sem
-- duas fontes divergentes)
ALTER TABLE public.workout_series
  DROP COLUMN IF EXISTS reps,
  DROP COLUMN IF EXISTS duration_seconds;
ALTER TABLE public.workout_execution_series
  DROP COLUMN IF EXISTS reps,
  DROP COLUMN IF EXISTS duration_seconds;

-- 4. Self-bootstrap idempotente de public.schema_migrations
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
  'milon-05',
  'Execução série a série - valor único nas séries',
  'migration-0013-milon-series-valor-unico.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
