-- Migracao Milon 06: Timer de descanso auto + PWA push
-- Duas tabelas novas, somente de push: assinaturas de push por dispositivo
-- (push_subscriptions) e agendamentos de fim de descanso (rest_push_schedules).
-- Backfill vazio (feature nova, nenhum dado historico existe ou e derivado).
-- Nenhuma tabela ou coluna existente de execucao/template e alterada.
-- Incremental: nunca edita migracao aplicada (0001-0016).

-- 1. Tabela public.push_subscriptions (assinatura de push de um dispositivo)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT NOT NULL
);

-- 2. Tabela public.rest_push_schedules (um agendamento de fim de descanso;
--    id vem gerado no cliente, por sessao de cliente)
CREATE TABLE IF NOT EXISTS public.rest_push_schedules (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.push_subscriptions (id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL,
  fire_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendado'
    CHECK (status IN ('agendado', 'enviado', 'cancelado', 'erro')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT NOT NULL
);

-- 3. RLS padrao do modulo nas duas tabelas novas
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.push_subscriptions;
CREATE POLICY "Permitir tudo para autenticados" ON public.push_subscriptions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.rest_push_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.rest_push_schedules;
CREATE POLICY "Permitir tudo para autenticados" ON public.rest_push_schedules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Indices: busca por dono + status do agendamento e cascata da assinatura
CREATE INDEX IF NOT EXISTS idx_rest_push_schedules_owner_status
  ON public.rest_push_schedules (created_by, status);
CREATE INDEX IF NOT EXISTS idx_rest_push_schedules_subscription
  ON public.rest_push_schedules (subscription_id);

-- 5. Rollback em texto (nunca executado automaticamente; schedules antes de
--    subscriptions por causa da FK; nunca editar nem renomear arquivo aplicado):
-- DROP TABLE IF EXISTS public.rest_push_schedules;
-- DROP TABLE IF EXISTS public.push_subscriptions;

-- 6. Self-bootstrap idempotente de public.schema_migrations
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

-- 7. Registro de Auditoria de Migracao em schema_migrations
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
  'milon-06',
  'Timer de descanso auto + PWA push',
  'migration-0017-milon-timer-descanso-push.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
