-- 1. Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by TEXT NOT NULL
);

-- 2. Tabela de Revisões Orçamentárias
CREATE TABLE IF NOT EXISTS public.budget_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL CHECK (year >= 2026),
    start_month INTEGER NOT NULL CHECK (start_month BETWEEN 1 AND 12),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by TEXT NOT NULL,
    CONSTRAINT unique_year_start_month UNIQUE (year, start_month)
);

-- 3. Tabela de Itens de Orçamento (ON DELETE RESTRICT)
CREATE TABLE IF NOT EXISTS public.budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by TEXT NOT NULL,
    CONSTRAINT unique_revision_category UNIQUE (revision_id, category_id)
);

-- 4. Habilitar RLS em todas
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- 5. Criar Políticas para permitir operações apenas a usuários autenticados
CREATE POLICY "Permitir tudo para autenticados" ON public.categories 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir tudo para autenticados" ON public.budget_revisions 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir tudo para autenticados" ON public.budget_items 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
