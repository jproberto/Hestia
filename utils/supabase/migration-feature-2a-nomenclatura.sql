-- Script de Migração: Renomeia tabelas e chaves para a linguagem ubíqua ("Ajustes")
-- E cria a tabela de controle de migrações (schema_migrations)

-- 1. Criar a tabela de controle de migrações (se não existir)
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    spec_id VARCHAR(50) NOT NULL,
    spec_name TEXT NOT NULL,
    script_name TEXT NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    executed_by TEXT
);

-- Habilitar RLS nela
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura/escrita para autenticados
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.schema_migrations;
CREATE POLICY "Permitir tudo para autenticados" ON public.schema_migrations 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Inserir registro retroativo do primeiro script da Feature 1
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
    '01',
    'Orçamento Anual por Categoria',
    'migration-feature-1.sql',
    'system'
) ON CONFLICT (script_name) DO NOTHING;

-- 3. Remover as constraints antigas da tabela budget_items
ALTER TABLE IF EXISTS public.budget_items 
  DROP CONSTRAINT IF EXISTS budget_items_revision_id_fkey;

ALTER TABLE IF EXISTS public.budget_items 
  DROP CONSTRAINT IF EXISTS unique_revision_category;

-- 4. Renomear a tabela public.budget_revisions para public.budget_adjustments
ALTER TABLE IF EXISTS public.budget_revisions 
  RENAME TO budget_adjustments;

-- 5. Renomear a coluna revision_id na tabela public.budget_items para adjustment_id
ALTER TABLE IF EXISTS public.budget_items 
  RENAME COLUMN revision_id TO adjustment_id;

-- 6. Adicionar a nova restrição de chave estrangeira apontando para budget_adjustments
ALTER TABLE IF EXISTS public.budget_items 
  ADD CONSTRAINT budget_items_adjustment_id_fkey 
  FOREIGN KEY (adjustment_id) 
  REFERENCES public.budget_adjustments(id) 
  ON DELETE RESTRICT;

-- 7. Adicionar a nova restrição de unicidade (adjustment_id + category_id)
ALTER TABLE IF EXISTS public.budget_items 
  ADD CONSTRAINT unique_adjustment_category 
  UNIQUE (adjustment_id, category_id);

-- 8. Registrar a execução deste script do Patch 2a
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
    '02a',
    'Ajuste de Orçamento - Correção/Patch',
    'migration-feature-2a-nomenclatura.sql',
    'admin@hestia.com'
) ON CONFLICT (script_name) DO NOTHING;
