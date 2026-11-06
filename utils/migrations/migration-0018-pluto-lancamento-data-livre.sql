-- Migracao Pluto 05e (2026-11-01): Lancamento com Data Livre (mes de calculo)
-- Separa "data do lancamento" de "mes de calculo": as colunas period_year e
-- period_month nascem obrigatorias em public.transactions, com backfill
-- retroativo copiando ano/mes da propria coluna date (decisao D8 — saldos
-- numericos permanecem identicos, pois hoje ja se soma pelo mes da data).
-- Nenhuma coluna ou tabela existente e removida ou renomeada; nenhuma
-- politica RLS nova em transactions; nenhum indice novo (tabela domestica,
-- YAGNI; reavaliar apenas se o volume crescer).
-- Incremental: nunca edita migracao aplicada (0001-0017).

-- 1. Criacao das colunas (ANULAVEIS: o backfill precisa rodar antes da
--    obrigatoriedade)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS period_year integer;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS period_month integer;

-- 2. Backfill retroativo (passo 2 ANTES do SET NOT NULL do passo 3):
--    copia ano/mes da propria coluna date com conversao explicita para
--    integer; protege apenas linhas ainda sem periodo calculado (idempotente)
UPDATE public.transactions
SET period_year = EXTRACT(YEAR FROM date)::integer,
    period_month = EXTRACT(MONTH FROM date)::integer
WHERE period_year IS NULL OR period_month IS NULL;

-- 3. Obrigatoriedade somente apos o backfill
ALTER TABLE public.transactions ALTER COLUMN period_year SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN period_month SET NOT NULL;

-- Rollback em texto (aplicavel somente onde a 0018 ainda nao foi promovida;
-- nunca editar nem renomear arquivo aplicado — correcao exige arquivo novo):
-- ALTER TABLE public.transactions DROP COLUMN IF EXISTS period_year;
-- ALTER TABLE public.transactions DROP COLUMN IF EXISTS period_month;

-- Verificacao pos-aplicacao (consultas documentadas; saldos preservados):
-- Contagem de linhas de transactions com periodo de calculo nulo deve ser zero:
--   SELECT count(*) FROM public.transactions
--   WHERE period_year IS NULL OR period_month IS NULL;  -- deve ser 0 (zero)
-- Comparacao da soma de amount agrupada por ano/mes de date ANTES e DEPOIS do
-- backfill deve mostrar diferenca zero (extrato antes da migracao vs. agrupado
-- por period_year/period_month depois da migracao):
--   ANTES:  SELECT EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date),
--                  sum(amount) FROM public.transactions
--           GROUP BY 1, 2;
--   DEPOIS: SELECT period_year, period_month, sum(amount)
--           FROM public.transactions GROUP BY 1, 2;
-- A diferenca entre as duas somas por mes deve ser zero.

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
  'pluto-05e',
  'Lançamento com Data Livre',
  'migration-0018-pluto-lancamento-data-livre.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
