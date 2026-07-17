-- Script de Migração: Renomeia tabelas e chaves para a linguagem ubíqua ("Ajustes")

-- 1. Remover as constraints antigas da tabela budget_items
ALTER TABLE IF EXISTS public.budget_items 
  DROP CONSTRAINT IF EXISTS budget_items_revision_id_fkey;

ALTER TABLE IF EXISTS public.budget_items 
  DROP CONSTRAINT IF EXISTS unique_revision_category;

-- 2. Renomear a tabela public.budget_revisions para public.budget_adjustments
ALTER TABLE IF EXISTS public.budget_revisions 
  RENAME TO budget_adjustments;

-- 3. Renomear a coluna revision_id na tabela public.budget_items para adjustment_id
ALTER TABLE IF EXISTS public.budget_items 
  RENAME COLUMN revision_id TO adjustment_id;

-- 4. Adicionar a nova restrição de chave estrangeira apontando para budget_adjustments
ALTER TABLE IF EXISTS public.budget_items 
  ADD CONSTRAINT budget_items_adjustment_id_fkey 
  FOREIGN KEY (adjustment_id) 
  REFERENCES public.budget_adjustments(id) 
  ON DELETE RESTRICT;

-- 5. Adicionar a nova restrição de unicidade (adjustment_id + category_id)
ALTER TABLE IF EXISTS public.budget_items 
  ADD CONSTRAINT unique_adjustment_category 
  UNIQUE (adjustment_id, category_id);

-- O PostgreSQL propaga automaticamente as políticas de segurança de linha (RLS) 
-- para as tabelas renomeadas.
