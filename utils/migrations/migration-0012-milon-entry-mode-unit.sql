-- Migracao Milon 05 (aditamento 2026-10-09, D29): modo e unidade na entry do treino
-- O modo (repeticao ou tempo) e a unidade da carga (kg ou libra) pertencem ao
-- exercicio NO TREINO (entry), junto de series e descanso. A biblioteca tem so
-- nome, grupo muscular e video; a coluna legada de unidade da biblioteca (0009)
-- permanece intocada e ignorada no treino (D30). Nenhuma coluna nova na
-- biblioteca nem nas series.
-- Reutiliza o inteiro 0012 com slug novo: o arquivo anterior do modo-na-biblioteca
-- foi revertido so em desenvolvimento e nunca foi aplicado em producao.

-- 1. Colunas novas na tabela de entradas do treino (idempotente, com padroes
-- para linhas futuras e restricao de valores permitidos)
ALTER TABLE public.workout_entries
  ADD COLUMN IF NOT EXISTS mode TEXT NULL DEFAULT 'repeticao' CHECK (mode IN ('repeticao', 'tempo'));
ALTER TABLE public.workout_entries
  ADD COLUMN IF NOT EXISTS load_unit TEXT NULL DEFAULT 'kg' CHECK (load_unit IN ('kg', 'libra'));

-- 2. Preenchimento das linhas existentes: modo ausente vira repeticao.
UPDATE public.workout_entries
SET mode = 'repeticao'
WHERE mode IS NULL;

-- 3. Preenchimento das linhas existentes: unidade ausente copia a unidade da
-- biblioteca do mesmo exercicio (public.exercises.load_unit) quando houver,
-- senao kg.
UPDATE public.workout_entries AS entry
SET load_unit = COALESCE(
  (SELECT ex.load_unit FROM public.exercises AS ex WHERE ex.id = entry.exercise_id),
  'kg'
)
WHERE entry.load_unit IS NULL;

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
  'Execução série a série - modo e unidade na entry',
  'migration-0012-milon-entry-mode-unit.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
