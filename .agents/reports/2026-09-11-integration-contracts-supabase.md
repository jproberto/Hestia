# Contratos de Repositório contra Supabase Real (Efêmero) — Item 8

**Data:** 2026-09-11
**Origem:** backlog estrutural do Olympus (item 8 da lista de melhorias de CI/CD); decisão 57 (`fakes-only`) revisitada
**Relatórios anteriores:** `2026-09-10-project-health-assessment.md` (§4.6 TST-002), `2026-09-09-technical-debt-reassessment.md`
**Método:** inspeção direta dos 6 contracts em `__tests__/lib/pluto/repositories/contract-*.test.ts`, das interfaces em `lib/pluto/repositories/interfaces.ts`, das funções em `lib/pluto/repositories/*.ts` e do DDL em `utils/migrations/migration-*.sql`
**Status:** **Proposto** — desenho validado por inspeção; primeira execução real acontece no CI (sem Docker local para pré-validar)

> Este relatório não repete os anteriores: registra o buraco exato (contratos nunca executados contra o adapter real), a evidência de que o buraco já esconde bug, e o desenho de execução. O objetivo é responder: o que falta para a suite provar o caminho real até o banco?

---

## 1. Sumário Executivo

| Dimensão | Hoje | Com o item 8 | Comentário |
|---|---|---|---|
| Contratos vs fakes | ✅ 6 suites verdes | ✅ mantido | Nada muda na suite unitária |
| Contratos vs Supabase real | ❌ nunca executado | ✅ 6 suites no CI | Mesmo `define*Contract`, outro binding |
| Migrações validadas | ❌ nunca aplicadas do zero por máquina | ✅ aplicadas em Postgres efêmero a cada run | SQL quebrado aparece no PR, não em prod |
| RLS auditado | ❌ (SEC-001 adormecido) | ⚠️ parcial | `service_role` bypasta RLS; policies com anon key ficam para follow-up |
| Custo de CI | baseline atual | +2 a 4 min/run | Imagens Docker do Supabase no job `integration` |

**Veredito:** maior salto de confiança disponível para a suite; sem mudança na arquitetura de produção (só 1 `export` + 1 correção de bug real encontrada no desenho).

---

## 2. O Buraco (evidência)

### 2.1 [ALTO] **INT-001** — `initBudget` real reprovaria no próprio contrato
**Evidência:** `lib/pluto/repositories/budget.ts:19-34` faz insert cego; `FakeBudgetRepository.initBudget` retorna o id existente. O contrato (`contract-budget.test.ts:30-37`) exige idempotência (`init` 2× → mesmo id). Conclusão: a implementação real **falha no contrato que ambas deveriam satisfazer** — e ninguém sabe porque o contrato nunca rodou contra ela.
**Solução:** `initBudget` vira get-or-create (consulta `start_month = 1` antes de inserir). Comportamento para chamadores (`useBudgetOverview.handleStartBudget`) inalterado, só mais seguro.

### 2.2 [MÉDIO] **INT-002** — Seeds dos contratos usam IDs incompatíveis com o DDL real
**Evidência:** contracts semeiam IDs fixos (`"cat-1"`, `"acc-1"`, `"per-2026-3"`, `"mes-2026-03"`); todas as PKs/FKs no DDL são `UUID DEFAULT gen_random_uuid()` (`migration-feature-1.sql:3`, `migration-feature-4-checklist.sql:3-5`, `migration-feature-5.sql:11`, `migration-feature-5c-financial-accounts.sql:5`). Insert direto desses aliases falha com erro de sintaxe UUID no Postgres real.
**Solução:** binding de integração converte aliases em UUID v5 determinístico (mesmo input → mesmo UUID em todo run); saídas `month_id`/`parent_id` são remapeadas de volta para o alias (o contrato asserta `toBe(MONTH_ID)`). Nenhum contrato precisa de alteração.

### 2.3 [MÉDIO] **INT-003** — Migrações nunca aplicadas do zero por máquina
**Evidência:** 6 arquivos `utils/migrations/migration-*.sql` aplicados historicamente à mão no projeto hospedado; nenhum job aplica em sequência num banco vazio. Ordem alfabética coincide com a cronológica (`1`, `2a`, `3`, `4-checklist`, `5`, `5c`).
**Solução:** job `integration` aplica em ordem com `psql ... -v ON_ERROR_STOP=1 -f` — qualquer SQL inválido quebra o run. (Nota pós-desenho: as migrations 3↔4 foram renumeradas — `3` = months, `4-checklist` — de modo que a ordem alfabética além de cronológica respeita a FK checklist→`monthly_periods`; antes, aplicar do zero em ordem alfabética falharia.)

---

## 3. Desenho de Execução

### 3.1 Código de teste (novo, sem tocar produção além do §3.3)
- `__tests__/integration/supabase.ts` (helper, sem `.test`): client `service_role` via `SUPABASE_INTEGRATION_URL`/`SUPABASE_SERVICE_ROLE_KEY`, UUID v5 por alias, `resetDatabase()` (truncate nas 7 tabelas em ordem FK-segura via client cru — `IDatabaseClient` não expõe `neq` e não será estendido para teste).
- `__tests__/integration/repositories.ts`: 6 wrappers finos implementando `I*Repository` por delegação às funções reais de `lib/pluto/repositories/*` (assinaturas 1:1 verificadas), com tradução alias↔UUID nos fluxos de transactions/checklist.
- `__tests__/integration/*.test.ts` (6 arquivos): importam os `define*Contract` existentes e instanciam com binding real. Truque obrigatório: os contracts chamam `build()` → `reset()` → `seed()` de forma **síncrona** no `beforeEach`, então o binding encadeia reset+seed numa promise lazy que cada método do wrapper aguarda antes de delegar (construção síncrona, execução ordenada — sem race).
- `vitest.integration.config.ts` (novo): só `__tests__/integration/**`, ambiente `node`, timeout 30s, **sem** `setupFiles` (os mocks globais da suite unitária não podem vazar para cá).
- `vitest.config.ts`: `exclude` ganha `__tests__/integration/**` (o `npm test` padrão não muda de comportamento).
- `package.json`: script `test:integration`.

### 3.2 Produção (mínimo)
- `lib/shared/supabaseClient.ts`: `export` em `SupabaseDatabaseClient` (seam de integração; cliente `supabase-js` real é estruturalmente compatível por desenho).
- `lib/pluto/repositories/budget.ts`: `initBudget` idempotente (INT-001).

### 3.3 CI — job `integration` (após `validate`, permissão só-leitura)
1. Checkout + Node + `npm ci`.
2. `supabase/setup-cli` + `supabase init` + `supabase start` (Docker do runner).
3. `supabase status -o env >> $GITHUB_ENV` (chaves locais, efêmeras).
4. Aplica migrações em ordem (`psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f` por arquivo).
5. `npm run test:integration` com `SUPABASE_INTEGRATION_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

---

## 4. Critérios de Aceite
- `npm test` continua excluindo `__tests__/integration/` (suite unitária inalterada: 63 arquivos / 378 testes).
- Job `integration` verde no CI executando os 6 contracts contra Postgres real (fakes continuam verdes em paralelo).
- `initBudget` real passa no teste de idempotência do contrato.
- Migração com erro de sintaxe proposital (teste de sabotagem local ou revisão) quebra o job.
- `getUserEmail()` e demais portas de sessão seguem fora dos contracts (não tocado).

## 5. Riscos e Limites Declarados
- **Primeira execução real é no CI** (sem Docker local): o run de estreia é o próprio teste do job; se migração antiga ranger no Postgres local (ex.: sintaxe específica da hospedagem), ajusta-se no primeiro feedback.
- **RLS não auditado aqui:** `service_role` bypasta policies por desenho — este item prova lógica e schema; policies com chave anônima são follow-up (reabre SEC-001 com escopo menor).
- **Tempo:** +2 a 4 min/run (pull das imagens na primeira vez; cache do runner ameniza seguintes).
- **`openMonthlyPeriod` instancia checklist global como efeito colateral** (`months.ts:54-56`): com globals vazios é no-op nos contracts; documentado para não confundir futura depuração do job.

---

## 6. Backlog
Item 6 na tabela estrutural de `.agents/modules/hestia/backlog.md` (Proposto) — executar este desenho.
