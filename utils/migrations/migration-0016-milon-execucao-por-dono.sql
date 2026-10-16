-- Migracao Milon 07c (2026-10-15, R1): invariante 1 execucao aberta por dono, global
-- A tabela public.workout_executions passa a garantir no maximo uma execucao
-- aberta por dono (created_by, texto com e-mail), independente de programa ou
-- treino. Substitui o indice unico parcial por treino da 0011 pelo indice
-- unico parcial por dono. Sem tabela nova, sem coluna nova, sem backfill
-- automatico (YAGNI).
-- Pre-condicao manual (sem backfill): nenhum dono pode ter mais de uma aberta,
-- verificavel por agregacao por autoria filtrando abertas:
-- SELECT created_by, COUNT(*) FROM public.workout_executions
-- WHERE finished_at IS NULL GROUP BY created_by HAVING COUNT(*) > 1;
-- Resolucao pela UI existente de Finalizar ou Cancelar no Treino do Dia.
-- Incremental: nunca edita migracao aplicada.

-- 1. Remove o indice unico parcial por treino criado na 0011
DROP INDEX IF EXISTS public.idx_workout_executions_open_unique;

-- 2. Cria o indice unico parcial por dono (R1): uma aberta por created_by
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_executions_open_by_owner
  ON public.workout_executions (created_by) WHERE finished_at IS NULL;

-- Rollback em texto (aplicavel somente onde a 0016 ainda nao foi promovida;
-- nunca editar nem renomear arquivo aplicado):
-- DROP INDEX IF EXISTS public.idx_workout_executions_open_by_owner;
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_executions_open_unique
--   ON public.workout_executions (workout_id) WHERE finished_at IS NULL;

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

-- 4. Registro de Auditoria de Migracao em schema_migrations
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
  'milon-07c',
  'Troca com execução ativa',
  'migration-0016-milon-execucao-por-dono.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
