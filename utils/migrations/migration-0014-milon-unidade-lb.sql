-- Migracao Milon 05 (aditamento 2026-10-10, D38): unidade abreviada NO BANCO
-- O banco passa a gravar so kg ou lb — nunca libra por extenso; a interface
-- exibe o valor direto, sem transformacao (decisao humana "sem transformacao
-- a toa; exibe o que ta no banco; vamos salvar abreviado", que substitui a
-- D35; nenhuma funcao de abreviacao existe nem e criada).
-- Incremental: nunca edita as migracoes aplicadas 0009 (coluna legada em
-- exercises) nem 0012 (coluna em workout_entries) — regra 7. Nenhuma tabela
-- nova, nenhuma coluna nova: so troca de valores permitidos + conversao.

-- 1. Remocao das restricoes antigas (nomes padrao gerados na criacao das
-- colunas pelas migracoes 0009/0012) + da nova com nome explicito (para
-- reexecucao idempotente). A remocao vem antes da conversao porque a regra
-- antiga nao admite o valor novo.
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_load_unit_check;
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_load_unit_kg_lb_check;
ALTER TABLE public.workout_entries DROP CONSTRAINT IF EXISTS workout_entries_load_unit_check;
ALTER TABLE public.workout_entries DROP CONSTRAINT IF EXISTS workout_entries_load_unit_kg_lb_check;

-- 2. Conversao dos dados existentes: libra vira lb nas duas tabelas. Nulos
-- preservados — leitura de nulo trata como kg (fallback vigente mantido) e
-- novas entries nascem com kg.
UPDATE public.exercises SET load_unit = 'lb' WHERE load_unit = 'libra';
UPDATE public.workout_entries SET load_unit = 'lb' WHERE load_unit = 'libra';

-- 3. Restricoes novas com nome explicito: so kg ou lb (nulos seguem admitidos)
ALTER TABLE public.exercises ADD CONSTRAINT exercises_load_unit_kg_lb_check CHECK (load_unit IN ('kg', 'lb'));
ALTER TABLE public.workout_entries ADD CONSTRAINT workout_entries_load_unit_kg_lb_check CHECK (load_unit IN ('kg', 'lb'));

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
  'Execução série a série - unidade abreviada no banco',
  'migration-0014-milon-unidade-lb.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
