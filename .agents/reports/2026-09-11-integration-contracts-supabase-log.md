# Log de Execução — Item 8: Contratos contra Supabase Real (Efêmero)

Relatório-mãe: `2026-09-11-integration-contracts-supabase.md` · Branch: `feature/hestia/06-integration-contracts-supabase` (de `develop` atualizada) · Backlog: item 6 em `.agents/modules/hestia/backlog.md`.

## Etapa 0 — Setup e achado prévio (2026-09-11)
- `develop` atualizada (contém merge do PR #22); branch criada a partir dela.
- Achado bloqueante antes de começar: o working tree continha edições locais **de outro autor** (renumeração das migrations 3↔4 + mensagens em `useMonthsData.ts` + 3 docs antigas), guardadas em stash e restauradas na branch nova com confirmação do dono.
- Decisão: renumeração é pré-requisito real do item 8 (nomes antigos quebrariam a aplicação em ordem alfabética num banco vazio: checklist referencia `monthly_periods` criada depois). Vai em commit separado (`chore`); item 8 por cima.
- Relatório-mãe §2.3 corrigido para os nomes novos (`1, 2a, 3, 4-checklist, 5, 5c`).

## Etapa 1 — Renumeração 3↔4 (commit separado)
- [x] `git add` dos renames + hook + docs antigas; baseline `tsc + testes` (63/378 verdes); commit `3384adf chore(db)` — git detectou renames R100/R097.

## Etapa 2 — Harness de integração (2026-09-11)
- [x] `lib/shared/supabaseClient.ts`: `export` em `SupabaseDatabaseClient` + `SupabaseLikeClient` (seam de integração).
- [x] `lib/pluto/repositories/budget.ts`: `initBudget` get-or-create (INT-001 corrigido no código real).
- [x] `__tests__/integration/supabase.ts`: env fail-fast, UUID v5 por alias, `AliasIds`, `resetDatabase` (truncate FK-seguro via client cru — `IDatabaseClient` não tem `neq` e não foi estendido).
- [x] `__tests__/integration/repositories.ts`: 6 wrappers por delegação + `createGate()` (contracts chamam reset/seed síncronos; chain lazy ordena).
- [x] 6 arquivos `*.test.ts` reutilizando os `define*Contract` existentes, label `"Supabase (integration)"`.
- [x] `vitest.integration.config.ts` (node, sem setupFiles) + `exclude` no `vitest.config.ts` + script `test:integration` + `supabase/` no `.gitignore`.
- [x] CI job `integration` (após `validate`, só-leitura): setup-cli → init/start → env → migrations via psql `ON_ERROR_STOP` → `test:integration`.

## Etapa 3 — Validação local (sem Docker: parcial)
- [x] `tsc` limpo (1 erro de `null|undefined` no unmap corrigido).
- [x] Suite unitária intacta: 63/378 (integração excluída corretamente).
- [x] `eslint` limpo nos arquivos novos.
- [x] `test:integration` sem env falha rápido com mensagem clara nos 6 arquivos (wiring provado; execução real só no CI).
- [ ] **Pendente: primeira execução real no CI** (risco declarado no relatório §5) — ver run do push.
