-- Migracao Milon 07b (2026-10-14, D2): ordem propria dos treinos no programa
-- A tabela public.workouts ganha a coluna position (inteira, anulavel): a
-- criacao define a ordem inicial e a reordenacao manual define a ordem
-- vigente. Nulo significa linha gravada antes desta migracao e ordena por
-- ultimo, com desempate por criacao (created_at asc, id asc) — o que equivale
-- a ordem inicial igual a criacao exigida pela spec.
-- Incremental: nunca edita migracao aplicada. Nenhuma tabela nova.

-- 1. Coluna nova position (idempotente; anulavel para aplicar sobre base com
-- treinos existentes sem violar restricao — DDLT1 do plano)
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS position INTEGER;

-- 2. Backfill: numeracao sequencial a partir de um dentro de cada programa,
-- ordenando as linhas existentes por created_at ascendente e id ascendente;
-- cobre todas as linhas, inclusive programas com um unico treino.
-- Deterministico: a reexecucao recalcula os mesmos valores (idempotente).
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY program_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.workouts
)
UPDATE public.workouts w
SET position = ranked.rn
FROM ranked
WHERE w.id = ranked.id;

-- 3. Indice da leitura ordenada por programa mais posicao
CREATE INDEX IF NOT EXISTS idx_workouts_program_position
  ON public.workouts (program_id, position);

-- Rollback em texto (aplicavel somente onde a 0015 ainda nao foi promovida;
-- nunca editar nem renomear arquivo aplicado):
-- DROP INDEX IF EXISTS public.idx_workouts_program_position;
-- ALTER TABLE public.workouts DROP COLUMN IF EXISTS position;

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
  'milon-07b',
  'Rotação do Treino do Dia por histórico',
  'migration-0015-milon-workout-position.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
