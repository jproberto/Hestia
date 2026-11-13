-- Migracao Pluto 11 (2026-11-08): Categorias e Contas sem Distincao de Caixa
-- e Acentos — fusao de duplicatas legadas + troca das travas de unicidade
-- (spec.md R8-R10 e secao 6; plan.md secao "Migracoes"; inteiro global 0019,
-- unico consumidor — proximo inteiro livre: 0020).
--
-- Ordem obrigatoria dentro da transacao propria (D11/D16):
--   1) tenta habilitar a funcao de remover acento (unaccent); se
--      indisponivel, falha alta com erro claro ANTES de qualquer trava ou
--      fusao — nada e aplicado, sem plano B neste script (D15); em
--      seguida cria o wrapper IMMUTABLE da normalizacao (funcao NOVA,
--      sem alterar nenhuma existente — premissa 14) usado pelas
--      expressoes dos indices unicos, porque unaccent(text) e STABLE no
--      proprio upstream e o CREATE INDEX exige IMMUTABLE (D10);
--   2) FUSAO primeiro: por grupo do mesmo type com nome normalizado
--      coincidente, sobrevive a mais usada — maior contagem de apontadores
--      (transactions + budget_items + checklist_items; para contas, via
--      transactions.account_id), empate => menor created_at (D3/D18);
--      reaponta os quatro ponteiros ANTES de qualquer exclusao; em colisao
--      de (ajuste, categoria) em budget_items prevalece a linha da
--      sobrevivente — a da perdedora e descartada, nao e somada (R9);
--      perdedoras excluidas por ultimo, exclusao de verdade (D9);
--   3) troca das travas DEPOIS de toda a fusao (D10/D11/D19): sai
--      categories_name_key / financial_accounts_name_key, entra indice
--      unico sobre (nome normalizado, type) nas duas tabelas (DT-6 —
--      ADD CONSTRAINT UNIQUE nao aceita expressao, por isso indice unico
--      sobre expressao);
--   4) auditoria em public.schema_migrations e COMMIT unico no final.
--
-- Nenhuma tabela ou coluna nova, nenhum nome reescrito, nenhuma politica RLS
-- nova (a politica de public.schema_migrations e o proprio bootstrap da
-- auditoria). Incremental: nunca edita migracao aplicada (0001-0018).

BEGIN;

-- 1. Pre-requisito de acento (D15): tenta habilitar a funcao de remover
--    acento. Se o CREATE EXTENSION falhar (extensao ausente) a transacao
--    aborta ali; se a funcao nao ficar visivel no search_path, o RAISE
--    EXCEPTION aborta com erro claro — em ambos os casos ANTES de qualquer
--    fusao ou troca de trava (falha alta, sem plano B: o humano decide na
--    hora).
CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$
BEGIN
  IF to_regprocedure('public.unaccent(text)') IS NULL THEN
    RAISE EXCEPTION 'unaccent indisponivel ou fora do search_path: migracao 0019 abortada antes de qualquer mudança (D15, sem plano B)';
  END IF;
END $$;

-- 1.1 Wrapper IMMUTABLE da normalizacao (EMENDA 2026-11-11, review CRITICAL:
--     unaccent() STABLE em expressao de indice). O PostgreSQL exige funcao
--     IMMUTABLE em CREATE INDEX ("functions in index expression must be
--     immutable") e unaccent(text) e STABLE no proprio upstream, entao as
--     expressoes dos indices usam esta funcao NOVA — mesma semantica da
--     normalizacao (trim -> caixa -> remocao de marcas), mesmo dicionario
--     unaccent, criada DENTRO desta transacao sem alterar funcao existente
--     (premissa 14; D10 ja sancao a funcao de remover acento no banco).
--     Nas CTEs da fusao o unaccent() STABLE continua valido: a restricao e
--     apenas de expressao de indice. CREATE OR REPLACE da propria funcao
--     nova mantem o script re-executavel. O corpo qualifica public.unaccent:
--     no PG16+ a resolucao desqualificada falha quando a funcao roda em
--     contexto de CREATE INDEX (review 2026-11-11, findings[0]) — mesma
--     qualificacao usada pela guarda do passo 1 e pelas CTEs da fusao.
CREATE OR REPLACE FUNCTION pluto_normalize_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$ SELECT public.unaccent(lower(btrim(p_name))) $$;

-- 2. FUSAO DE CATEGORIES (R8/R9/D3/D18): para cada grupo do mesmo type com
--    nome normalizado coincidente (mesma expressao da trava nova), escolhe a
--    sobrevivente = maior contagem de apontadores nas TRES tabelas
--    (transactions.category_id + budget_items.category_id +
--    checklist_items.category_id), empate desempatado pelo menor created_at
--    (mais antiga; id como desempate final para determinismo).

-- 2.1 Reaponta transactions.category_id para a sobrevivente (R9) — feito
--     ANTES de qualquer exclusao (as tres FKs sao ON DELETE RESTRICT).
WITH ponteiros AS (
    SELECT c.id,
           lower(public.unaccent(btrim(c.name))) AS nome_normalizado,
           c.type,
           c.created_at,
           (SELECT count(*) FROM public.transactions t
             WHERE t.category_id = c.id) +
           (SELECT count(*) FROM public.budget_items b
             WHERE b.category_id = c.id) +
           (SELECT count(*) FROM public.checklist_items k
             WHERE k.category_id = c.id) AS usos
      FROM public.categories c
),
classificacao AS (
    SELECT p.id,
           row_number() OVER w AS posicao,
           first_value(p.id) OVER w AS sobrevivente
      FROM ponteiros p
    WINDOW w AS (PARTITION BY p.nome_normalizado, p.type
                 ORDER BY p.usos DESC, p.created_at ASC, p.id ASC)
),
mapa AS (
    SELECT id AS perdedora_id, sobrevivente
      FROM classificacao
     WHERE posicao > 1
)
UPDATE public.transactions t
   SET category_id = m.sobrevivente
  FROM mapa m
 WHERE t.category_id = m.perdedora_id;

-- 2.2 Reaponta budget_items.category_id para a sobrevivente (R9), pulando as
--     linhas da perdedora que colidem com a linha ja existente da sobrevivente
--     no mesmo (ajuste, categoria): essas colidentes NAO sao reapontadas aqui
--     — em colisao prevalece a linha da sobrevivente, a da perdedora e
--     descartada no passo 2.5, sem soma de valores (nao e somada). Quando
--     dois perdedores do mesmo grupo tem linha no mesmo ajuste e a
--     sobrevivente nao tem, apenas uma (menor id) e reapontada; as demais
--     colidem com ela e sao descartadas — tambem sem soma. A linha-alvo e a
--     de menor id escolhida com ORDER BY l.id LIMIT 1 (o agregado min nao
--     existe para uuid — review 2026-11-11, findings[0]).
WITH ponteiros AS (
    SELECT c.id,
           lower(public.unaccent(btrim(c.name))) AS nome_normalizado,
           c.type,
           c.created_at,
           (SELECT count(*) FROM public.transactions t
             WHERE t.category_id = c.id) +
           (SELECT count(*) FROM public.budget_items b
             WHERE b.category_id = c.id) +
           (SELECT count(*) FROM public.checklist_items k
             WHERE k.category_id = c.id) AS usos
      FROM public.categories c
),
classificacao AS (
    SELECT p.id,
           row_number() OVER w AS posicao,
           first_value(p.id) OVER w AS sobrevivente
      FROM ponteiros p
    WINDOW w AS (PARTITION BY p.nome_normalizado, p.type
                 ORDER BY p.usos DESC, p.created_at ASC, p.id ASC)
),
mapa AS (
    SELECT id AS perdedora_id, sobrevivente
      FROM classificacao
     WHERE posicao > 1
)
UPDATE public.budget_items b
   SET category_id = m.sobrevivente
  FROM mapa m
 WHERE b.category_id = m.perdedora_id
   AND NOT EXISTS (
       SELECT 1
         FROM public.budget_items k
        WHERE k.adjustment_id = b.adjustment_id
          AND k.category_id = m.sobrevivente
   )
   AND b.id = (
       SELECT l.id
         FROM public.budget_items l
         JOIN mapa lm ON lm.perdedora_id = l.category_id
        WHERE l.adjustment_id = b.adjustment_id
          AND lm.sobrevivente = m.sobrevivente
        ORDER BY l.id
        LIMIT 1
   );

-- 2.3 Reaponta checklist_items.category_id para a sobrevivente (R9/D18).
WITH ponteiros AS (
    SELECT c.id,
           lower(public.unaccent(btrim(c.name))) AS nome_normalizado,
           c.type,
           c.created_at,
           (SELECT count(*) FROM public.transactions t
             WHERE t.category_id = c.id) +
           (SELECT count(*) FROM public.budget_items b
             WHERE b.category_id = c.id) +
           (SELECT count(*) FROM public.checklist_items k
             WHERE k.category_id = c.id) AS usos
      FROM public.categories c
),
classificacao AS (
    SELECT p.id,
           row_number() OVER w AS posicao,
           first_value(p.id) OVER w AS sobrevivente
      FROM ponteiros p
    WINDOW w AS (PARTITION BY p.nome_normalizado, p.type
                 ORDER BY p.usos DESC, p.created_at ASC, p.id ASC)
),
mapa AS (
    SELECT id AS perdedora_id, sobrevivente
      FROM classificacao
     WHERE posicao > 1
)
UPDATE public.checklist_items ci
   SET category_id = m.sobrevivente
  FROM mapa m
 WHERE ci.category_id = m.perdedora_id;

-- 3. FUSAO DE FINANCIAL_ACCOUNTS (D14): mesmo criterio, mas o unico
--    referenciador e transactions.account_id — a contagem usa essa coluna.
--    Reaponta transactions.account_id para a sobrevivente ANTES de qualquer
--    exclusao (FK ON DELETE RESTRICT).

-- 3.1 Reaponta transactions.account_id.
WITH ponteiros AS (
    SELECT a.id,
           lower(public.unaccent(btrim(a.name))) AS nome_normalizado,
           a.type,
           a.created_at,
           (SELECT count(*) FROM public.transactions t
             WHERE t.account_id = a.id) AS usos
      FROM public.financial_accounts a
),
classificacao AS (
    SELECT p.id,
           row_number() OVER w AS posicao,
           first_value(p.id) OVER w AS sobrevivente
      FROM ponteiros p
    WINDOW w AS (PARTITION BY p.nome_normalizado, p.type
                 ORDER BY p.usos DESC, p.created_at ASC, p.id ASC)
),
mapa AS (
    SELECT id AS perdedora_id, sobrevivente
      FROM classificacao
     WHERE posicao > 1
)
UPDATE public.transactions t
   SET account_id = m.sobrevivente
  FROM mapa m
 WHERE t.account_id = m.perdedora_id;

-- 4. DESCARTE DAS COLIDENTES EM BUDGET_ITEMS (R9) — ANTES de excluir as
--    perdedoras: em (ajuste, categoria) com linha ja existente da
--    sobrevivente prevalece a linha da sobrevivente; a linha colidente da
--    perdedora e descartada (DELETE, nao e somada — nenhuma soma de valores).
WITH ponteiros AS (
    SELECT c.id,
           lower(public.unaccent(btrim(c.name))) AS nome_normalizado,
           c.type,
           c.created_at,
           (SELECT count(*) FROM public.transactions t
             WHERE t.category_id = c.id) +
           (SELECT count(*) FROM public.budget_items b
             WHERE b.category_id = c.id) +
           (SELECT count(*) FROM public.checklist_items k
             WHERE k.category_id = c.id) AS usos
      FROM public.categories c
),
classificacao AS (
    SELECT p.id,
           row_number() OVER w AS posicao,
           first_value(p.id) OVER w AS sobrevivente
      FROM ponteiros p
    WINDOW w AS (PARTITION BY p.nome_normalizado, p.type
                 ORDER BY p.usos DESC, p.created_at ASC, p.id ASC)
),
mapa AS (
    SELECT id AS perdedora_id, sobrevivente
      FROM classificacao
     WHERE posicao > 1
)
DELETE FROM public.budget_items b
USING mapa m
WHERE b.category_id = m.perdedora_id
  AND EXISTS (
      SELECT 1
        FROM public.budget_items k
       WHERE k.adjustment_id = b.adjustment_id
         AND k.category_id = m.sobrevivente
  );

-- 5. EXCLUSAO DAS PERDEDORAS (D9): so agora, com os quatro ponteiros
--    reapontados e as colidentes descartadas, as FKs ON DELETE RESTRICT
--    nao impedem nada. Exclusao de verdade, sem coluna nova e sem desfazer.
WITH ponteiros AS (
    SELECT c.id,
           lower(public.unaccent(btrim(c.name))) AS nome_normalizado,
           c.type,
           c.created_at,
           (SELECT count(*) FROM public.transactions t
             WHERE t.category_id = c.id) +
           (SELECT count(*) FROM public.budget_items b
             WHERE b.category_id = c.id) +
           (SELECT count(*) FROM public.checklist_items k
             WHERE k.category_id = c.id) AS usos
      FROM public.categories c
),
classificacao AS (
    SELECT p.id,
           row_number() OVER w AS posicao,
           first_value(p.id) OVER w AS sobrevivente
      FROM ponteiros p
    WINDOW w AS (PARTITION BY p.nome_normalizado, p.type
                 ORDER BY p.usos DESC, p.created_at ASC, p.id ASC)
),
mapa AS (
    SELECT id AS perdedora_id, sobrevivente
      FROM classificacao
     WHERE posicao > 1
)
DELETE FROM public.categories c
 WHERE c.id IN (SELECT perdedora_id FROM mapa);

-- 5.1 Exclusao das perdedoras de financial_accounts (D9/D14).
WITH ponteiros AS (
    SELECT a.id,
           lower(public.unaccent(btrim(a.name))) AS nome_normalizado,
           a.type,
           a.created_at,
           (SELECT count(*) FROM public.transactions t
             WHERE t.account_id = a.id) AS usos
      FROM public.financial_accounts a
),
classificacao AS (
    SELECT p.id,
           row_number() OVER w AS posicao,
           first_value(p.id) OVER w AS sobrevivente
      FROM ponteiros p
    WINDOW w AS (PARTITION BY p.nome_normalizado, p.type
                 ORDER BY p.usos DESC, p.created_at ASC, p.id ASC)
),
mapa AS (
    SELECT id AS perdedora_id, sobrevivente
      FROM classificacao
     WHERE posicao > 1
)
DELETE FROM public.financial_accounts a
 WHERE a.id IN (SELECT perdedora_id FROM mapa);

-- 6. TROCA DAS TRAVAS (D10/D11/D19/DT-6) — so DEPOIS de toda a fusao:
--    sai a unicidade global de name (travas implicitas de coluna UNIQUE do
--    Postgres) e entra o indice unico sobre (nome normalizado, type) nas
--    DUAS tabelas: a mesma grafia passa a valer em tipos diferentes, e
--    variantes de caixa/acento do mesmo tipo passam a ser a mesma linha.
--    As expressoes usam o wrapper IMMUTABLE do passo 1.1
--    (pluto_normalize_name): unaccent() direto nao passaria no CREATE INDEX.
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE public.financial_accounts DROP CONSTRAINT IF EXISTS financial_accounts_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS categories_name_type_normalized_key
    ON public.categories (pluto_normalize_name(name), type);

CREATE UNIQUE INDEX IF NOT EXISTS financial_accounts_name_type_normalized_key
    ON public.financial_accounts (pluto_normalize_name(name), type);

-- 7. Self-bootstrap idempotente de public.schema_migrations (mesmo bloco das
--    0008/0016/0018: tabela se nao existir + RLS + politica "Permitir tudo
--    para autenticados"). A politica usa guarda via pg_policies em vez de
--    DROP POLICY (o contrato desta feature proibe DROP POLICY executavel
--    fora de comentarios) — sem a guarda, re-execucao apos sucesso falharia
--    em CREATE POLICY ja existente.
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    spec_id VARCHAR(50) NOT NULL,
    spec_name TEXT NOT NULL,
    script_name TEXT NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    executed_by TEXT
);

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'schema_migrations'
         AND policyname = 'Permitir tudo para autenticados'
  ) THEN
    CREATE POLICY "Permitir tudo para autenticados" ON public.schema_migrations
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. Registro de Auditoria de Migracao em schema_migrations (regra 7 do
--    AGENTS.md): script_name identico ao nome do arquivo, conflito
--    ignorado pelo nome do script.
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
  'pluto-11',
  'Categorias e Contas sem Distinção de Caixa e Acentos',
  'migration-0019-pluto-categorias-contas-normalizadas.sql',
  'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verificacao pos-aplicacao (consultas documentadas; rode ANTES e DEPOIS da
-- 0019 e compare — tudo deve fechar):
--
-- a) Zero pares do mesmo type com nome normalizado coincidente nas duas
--    tabelas (contagem = 0; resultado esperado: zero linhas em cada uma):
--    SELECT lower(public.unaccent(btrim(name))), type, count(*)
--      FROM public.categories
--     GROUP BY 1, 2 HAVING count(*) > 1;                    -- = 0 (zero)
--    SELECT lower(public.unaccent(btrim(name))), type, count(*)
--      FROM public.financial_accounts
--     GROUP BY 1, 2 HAVING count(*) > 1;                    -- = 0 (zero)
--
-- b) Total de transactions, budget_items e checklist_items inalterado entre
--    ANTES e DEPOIS (diferenca zero), exceto as linhas de budget_items
--    descartadas por colisao de (ajuste, categoria) — R9 (nao somadas):
--    ANTES:  SELECT (SELECT count(*) FROM public.transactions),
--                   (SELECT count(*) FROM public.budget_items),
--                   (SELECT count(*) FROM public.checklist_items);
--    DEPOIS: SELECT (SELECT count(*) FROM public.transactions),
--                   (SELECT count(*) FROM public.budget_items),
--                   (SELECT count(*) FROM public.checklist_items);
--    transactions e checklist_items sempre identicos (diferenca zero); em
--    budget_items a diferenca corresponde exatamente as colidentes
--    descartadas (zero se nao houve colisao).
--
-- c) Nenhum ponteiro orfao (count = 0 em cada consulta):
--    SELECT count(*) FROM public.transactions t
--     WHERE t.category_id IS NOT NULL
--       AND NOT EXISTS (SELECT 1 FROM public.categories c
--                        WHERE c.id = t.category_id);        -- = 0 (zero)
--    SELECT count(*) FROM public.budget_items b
--     WHERE b.category_id IS NOT NULL
--       AND NOT EXISTS (SELECT 1 FROM public.categories c
--                        WHERE c.id = b.category_id);        -- = 0 (zero)
--    SELECT count(*) FROM public.checklist_items k
--     WHERE k.category_id IS NOT NULL
--       AND NOT EXISTS (SELECT 1 FROM public.categories c
--                        WHERE c.id = k.category_id);        -- = 0 (zero)
--    SELECT count(*) FROM public.transactions t
--     WHERE t.account_id IS NOT NULL
--       AND NOT EXISTS (SELECT 1 FROM public.financial_accounts a
--                        WHERE a.id = t.account_id);         -- = 0 (zero)
--
-- d) Contagem de apontadores por categoria/conta conservada entre ANTES e
--    DEPOIS (so o ponteiro mudou de dono na fusao; nenhuma linha nova nas
--    tres tabelas apontadoras):
--    ANTES:  SELECT category_id, count(*) FROM public.transactions
--             GROUP BY 1;  (idem budget_items, checklist_items e, via
--             account_id, transactions por conta)
--    DEPOIS: SELECT category_id, count(*) FROM public.transactions
--             GROUP BY 1;
--    Depois de fundir os ids na mao, a soma dos contagens dos ids fundidos
--    deve ser igual a contagem ANTES do id sobrevivente — contagem total
--    inalterada; o mesmo vale para budget_items, checklist_items e para a
--    contagem de apontadores de financial_accounts via account_id.
--
-- Rollback (apenas a troca de trava; aplicavel somente onde a 0019 ainda nao
-- foi promovida — nunca editar nem renomear arquivo aplicado, correcao exige
-- arquivo novo). Durante a execucao o rollback e o proprio rollback
-- automatico da transacao (D16); apos aplicacao bem-sucedida a unica
-- reversao documentada e a troca de travas — remover os indices novos (e o
-- wrapper pluto_normalize_name que eles usam, por ultimo) e recriar as
-- travas de nome unico originais. A FUSAO de dados e
-- IRREVERSIVEL (D9: exclusao de verdade, sem desfazer):
--   DROP UNIQUE INDEX IF EXISTS categories_name_type_normalized_key;
--   DROP UNIQUE INDEX IF EXISTS financial_accounts_name_type_normalized_key;
--   DROP FUNCTION IF EXISTS pluto_normalize_name(text);   -- wrapper novo da 0019 (depois dos indices dele)
--   ALTER TABLE public.categories
--     ADD CONSTRAINT categories_name_key UNIQUE (name);
--   ALTER TABLE public.financial_accounts
--     ADD CONSTRAINT financial_accounts_name_key UNIQUE (name);
