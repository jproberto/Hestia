-- Migracao Milon 05 (aditamento 2026-10-09, D25): modo do exercicio (premissa do achado 3 + base do achado 1)
-- O modo (repeticao ou tempo) e a unidade de carga pertencem ao exercicio; card e modal de execucao herdam o rotulo dele.
-- Coluna textual anulavel (linhas antigas sem modo; leitura com fallback repeticao). Nenhuma coluna nova nas series (D26).
-- O inteiro 0012 NAO e reutilizado (arquivo excluido apos reversao so em desenvolvimento).

-- 1. Coluna nova na biblioteca: modo do exercicio (D25)
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS mode TEXT NULL CHECK (mode IN ('repeticao', 'tempo'));

-- 2. Self-bootstrap idempotente de public.schema_migrations
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
  'milon-05',
  'Execução série a série - modo do exercício',
  'migration-0013-milon-exercise-mode.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
