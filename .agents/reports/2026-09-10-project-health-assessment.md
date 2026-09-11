# Avaliação de Saúde do Projeto — Héstia

**Data:** 2026-09-10
**Origem:** Verificação pós-ciclo 09-09 (épico 4, tasks 41–51 concluídas)
**Relatório anterior:** `2026-09-09-technical-debt-reassessment.md`
**Log de execução:** `2026-09-08-technical-debt-assessment-log.md`
**Método:** inspeção direta do código (imports, chamadores, barrels, testes, docs, gerador, prompts Olympus, CI), validações executadas como baseline (tsc + lint + vitest + `next build` + `build-storybook`)
**Status:** **Aberto** — pendências propostas como backlog (IDs 52+)

> Este relatório não repete o anterior: ele parte do estado pós-ciclo e registra o que é NOVO (achados desta avaliação) + o que restou pendente de antes. O objetivo é responder: o projeto está saudável e pronto para evoluir?

---

## 1. Sumário Executivo

| Dimensão | 09-09 | Agora | Comentário |
|---|---|---|---|
| Estrutura Modular | 9 | 9 | Padrão íntegro; gerador verificado ponta a ponta |
| Arquitetura (Camadas) | 5 | 8 | Camada morta fora; caminho único; singleton; tipos honestos |
| Build de Produção | não avaliado (🔴 oculto) | ✅ | `next build` estava vermelho desde a task 32; corrigido na 51 |
| SOLID / YAGNI | 6 | 8 | YAGNI restaurado; 2ª camada morta mapeada (52) |
| Qualidade de Código | 8 | 8 | Gods eliminados; `useTransactionModals` (400) é o próximo albo |
| Testes / Confiabilidade | 9 | 9 | 63 arqs / 418 testes + infra melhor; transientes residuais |
| Framework SDD (Olympus) | 7 | 8 | Mapa + Atena + gerador ok; 4 refs defasadas localizadas |
| Prontidão p/ Novos Módulos | 6 | 9 | Falta só higiene (pointer, docs) — nada estrutural |

**Veredito:** base **consistente e pronta para o módulo #2**. Nenhum débito ALTO restante além de concluídos; o backlog 52+ é higiene + 1 remoção cirúrgica (52) + riscos adormecidos documentados (RLS, contracts-vs-Supabase).

---

## 2. Baseline Validado (evidência executada nesta avaliação)

- `npx tsc --noEmit`: **0 erros**
- `npm run lint`: **0 erros** (36 warnings, todos de estilo pré-existentes: `<img>`, unused em testes antigos)
- `npm run test`: **63 arquivos / 418 testes, 100% verdes** (eram 51/371 no baseline do ciclo)
- `npm run build` (Turbopack, env placeholder como o CI): **verde, exit 0** (estava vermelho — ver §4.1)
- `npm run build-storybook`: **verde** (12 stories Pluto + exemplo do gerador)
- `git status`: limpo exceto `.idea/.name` (não ignorado — ver 56); HEAD = commit do ciclo (+ task 51 executada, sem commitar)

---

## 3. Consolidado no Ciclo (manter — resumo, detalhe no -log)

- Sem `use-cases/`, `schemas/`, `mappers.ts`, factories `createXService`, `zod` direto (41; rescan confirma zero resíduos em `lib/`)
- Single-flight do fetch (`usePlutoData`: 1 fetch/mount, request id) + teste que passava por acidente no flicker corrigido (45)
- Singleton de client por aba + caminho único UI→`db/*` + barrel morto deletado (47); auth como porta de sessão documentada (48)
- Budget 512→119, months 242→66, ChecklistCard 237→144, cada unidade com testes (46)
- `category_name` enriquecido no repositório; `categoryType` obrigatório; teste do repositório real com stub (50)
- Mock central no setup, `type Mock`, sem `user-event`/`addon-mcp`, `ChecklistItemWithAmount` removida, `hooks/index` 16/16 (49)
- Mapa de Camadas + Atena + template + gerador verificado de ponta a ponta com dummy (42/43/44)
- Server factory fora do bundle client; build verde (51)

---

## 4. Achados Novos (além dos relatórios anteriores)

### 4.1 [RESOLVIDO na 51] **BUILD-001** — `next build` vermelho desde a task 32
**Evidência:** `lib/shared/supabaseClient.ts` misturava factory browser + factory server (`next/headers`) no mesmo módulo; qualquer componente client no grafo de import envenenava o bundle → Turbopack abortava. `createServerDatabaseClient` tinha **zero chamadores** e `utils/supabase/server.ts` já cobre server-side: duplicação morta E quebrada.
**Lição registrada:** suíte verde ≠ shippable. `npm run build` passa a fazer parte da definição de pronto de qualquer task que toque `lib/shared`, barrels ou imports (o CI já o executa — falharia no push).
**Solução aplicada:** factory server deletada + imports `next/headers` removidos + re-export podado. Nada mais a fazer.

---

### 4.2 [MÉDIO] **DEAD-002** — Segunda camada morta: hooks legados + standalones + `services/`
**Evidência (grep por chamadores, verificado nesta avaliação):**
- Hooks sem nenhum consumidor (só definição + barrel): `useTransactions`, `useAccounts`, `useChecklist`, `useMonthlyPeriods`.
- Standalones sem nenhum chamador: `getTransactionsForMonth`, `getAvailableYearsAndMonths`, `computeMonthRange`, `getMonthChecklistItems`, `getGlobalItems`, `getOpenMonths`, `getOrCreateCategory` (wrapper; a do repository é viva), `getCategoriesForType`, `getOrCreateAccountByName`, `getAllAccounts`, `getBudgetAdjustment(s)`, `adjustBudgetItem` (wrappers; as de `db/*` são vivas) — 13 no total.
- Vivas em `services/*`: **apenas 2** — `getBudgetItemsWithCategories` e `getAllCategories`, via `useBudgets`/`useCategories` (usados por `useBudgetOverview`).
**Impacto:** o congelamento da 47 virou meia-medida documentada; o estado final honesto é migrar os 2 hooks vivos para `db/*` (troca de import, mesmo padrão dos demais hooks) e deletar `services/` por inteiro + os 4 hooks mortos.
**Solução:** task 52. **Critério de aceite:** `services/` some do repo; nenhum teste muda de resultado; grep por `services/` retorna só histórico/docs.

---

### 4.3 [MÉDIO] **GOD-002** — `useTransactionModals` (400 linhas) é o próximo god
**Evidência:** 3 responsabilidades no mesmo hook (modal de transação + modal de conta + modal de exclusão), maior arquivo de `lib/pluto/hooks/` após a 46.
**Solução:** mesma receita 27–29 (`useTransactionForm` + `useAccountForm` + `useDeleteConfirm`), testes por unidade. **Critério:** mesmos gates das Fases 1–3.

---

### 4.4 [BAIXO] **DOC-002** — 4 referências defasadas nos prompts Olympus + pointer obsoleto
**Evidência:**
- `zeus.md:100` referencia `olympus.js` fantasma (não existe; guardian real é via read/write).
- `caronte.md:152` cita `approve-plan` (checkpoint inexistente — são só `approve-spec`/`approve-review`).
- `hera.md:50` e `mnemosine.md:86` apontam `.agents/backlog.md` (migrado para `.agents/modules/`).
- `.agents/current` aponta para `03-visual-identity-mascots`, já COMMITTED (ponteiro obsoleto).
**Solução:** task 54 (só docs). **Critério:** grep por `olympus.js`, `approve-plan`, `.agents/backlog.md` retorna só histórico.

---

### 4.5 [INFORMATIVO] **HRN-001** — Guardian é contratual, não técnico (prova empírica)
**Evidência:** o histórico de `03-visual-identity-mascots/checkpoint.json` contém fase `REIMPLEMENTATION`, fora do mapa de `validTransitions` do `zeus.md` — a execução real desviou do state machine sem bloqueio, porque o "guardian nativo" é o próprio LLM se autovalidando.
**Leitura:** não é defeito bloqueante — a enforcement real do projeto é CI (lint+tsc+build+test+auto-PR) + 2 checkpoints humanos + `git add` explícito. Mas ninguém deve vender o guardian como trava técnica. Sem ação obrigatória; registrar para calibrar confiança (esta seção é o registro).

---

### 4.6 [MÉDIO] **TST-002** — Contracts rodam só contra fakes (seam Supabase nunca executada)
**Evidência:** `defineXRepositoryContract` registra só fakes; a impl Supabase "pronta para quando houver env de integração" nunca rodou em 2 ciclos.
**Solução (task 57):** decidir UMA — (a) job de integração com Supabase local/CI executando os contracts contra o adapter real, ou (b) documentar `fakes-only` como decisão e remover a promessa dos comentários. Estado intermediário (promessa sem execução) é o que apodrece. **Critério:** ou bem CI executa contracts contra Supabase, ou bem nenhum comentário promete isso.
**Resolvido na 57 (opção b):** sem infra Supabase local nem no CI (env placeholder, sem services) — integração exigiria decisão + segredos do humano. Fakes-only documentado (template, gerador, Mapa); gatilho de revisão: precisar testar SQL real (joins, RLS).

---

### 4.7 [BAIXO] **TST-003** — Flakiness residual em page tests antigos
**Evidência quantificada no ciclo:** ~1 falha transitória a cada 3–4 runs completos, sempre verde no rerun/isolado, sempre em page test com warnings `act(...)`. Causa provável: assentamento de múltiplos fetches/effects sob carga (o churn estrutural acabou na 45; o que resta é timing de teste).
**Solução (task 58):** monitorar, não caçar — intervir se a taxa subir ou se um teste fixar como flaky (candidato: migrar asserts para estados assentados + `findBy`, como feito na 45). **Critério:** taxa atual documentada; zero testes `skip`.

---

### 4.8 [MÉDIO] **DOC-003** — CHANGELOG/README silenciosos sobre o 09-09
**Evidência:** grep por `09-09|ciclo 09|single-flight` retorna só relatórios e log. Tradeoff aceito do loop leve (fase Mnemósine pulada; AGENTS.md foi atualizado).
**Solução (task 56):** rodada Mnemósine proporcional (CHANGELOG + README). **Critério:** ciclo 09-09 legível para humano sem abrir o -log.

---

### 4.9 [MÉDIO, adormecido] **SEC-001** — RLS/policies do Supabase nunca auditadas
**Evidência:** sem acesso ao banco em 3 ciclos; superfície server é zero (`use server` inexistente; tudo via anon key no browser). Carregado desde 3.12 sem mudança.
**Modelo de acesso (decisão explícita do dono, corrigida nesta avaliação — NÃO há isolamento por usuário):** ambos os usuários são admin; `created_by` é auditoria ("quem lançou", usado pela feature 19 de divisão), nunca controle de acesso — verificado: zero filtros por `created_by` nas leituras em `lib/pluto/repositories/`. O que a auditoria precisa garantir é mais simples: RLS habilitado em todas as tabelas + anônimos sem acesso + autenticados com acesso total. O risco residual real é acesso anônimo via anon key exposta, não vazamento entre os dois usuários.
**Solução (task 59):** auditar policies antes de qualquer rota server-side, job ou exposição nova. **Critério:** checklist de policies assinado ou risco aceito por escrito. Dormant até lá.
**Concluído por aceite de risco do dono (nesta sessão):** sem auditoria técnica executada (sem acesso ao banco) — aceite explícito de que o estado das policies é desconhecido, com o modelo admin/admin e o app pessoal como contexto. Reabre automaticamente se: exposição crescer (terceiros, rotas server, módulo novo sensível) ou surgir indício de acesso anônimo.

---

### 4.10 [BAIXO] Diversos
- `.idea/.name` untracked: `.gitignore` não cobre `.idea/` (task 55, trivial).
- 36 warnings de lint (estilo: `<img>`, unused em testes antigos) — oportunista, não dirt de saúde.
- `storybook-static/` regenerado pelos builds locais continua fora do git ✅ (confirmado via `git status` limpo).

---

### 4.11 [MÉDIO, BUG visual reportado pelo usuário] **VIS-001** — Páginas Hestia com background que não deveria existir
**Relato:** dashboard e login exibem imagem de background; referência correta é o Pluto (sem background).
**Causa-raiz (verificada):** `HestiaLayoutContent` (`components/layout/HestiaLayout.tsx:18`) embrulha o `ModuleLayout` em `<MascotBackground mode={...}>` (modo via `useMascotBackground(dataState)`); `PlutoLayout` não tem o wrapper — só o header `<img>` do `ModuleLayout`. Páginas afetadas: exatamente as 2 consumidoras de `HestiaLayout` em `app/` (dashboard, login).
**Histórico:** o wrapper é sobra da feature `03-visual-identity-mascots` (commits `3c206e7`, `3ac97c7`, `7fdffff` neste branch): o próprio `context.json` da feature registra o pivô de "mascotes como BACKGROUND" para "header inline images (400x400) por pedido do usuário" — mas o wrapper ficou ligado no HestiaLayout.
**Solução (task 61):** remover o wrapper `MascotBackground` do `HestiaLayoutContent` (manter `ModuleLayout` + header). Verificar antes se `MascotProvider`/`useMascotBackground` têm outro consumidor vivo; se não, remover junto (componente, hook, LQIP só usado por ele, coeficiente CSS). **Atenção:** há teste consagrando o background (`login/page.test.tsx > renders prominent background`) + testes de `MascotBackground`/`MascotProvider`/`useMascotBackground` + stories que precisarão de rework/remoção. **Critério de aceite:** dashboard e login sem camada `.mascot-background` no DOM (assert em teste) + suíte verde + sem resíduos de LQIP/background no bundle das páginas Hestia.

---

## 5. Backlog Proposto (IDs 52+)

| ID | Item | Sev. | Depende de | Aceite |
|---|---|---|---|---|
| 52 | Remover 2ª camada morta (4 hooks + 13 standalones + `services/`) | Médio | — | `services/` some; testes inalterados |
| 53 | Decompor `useTransactionModals` (400) | Médio | — | gates das Fases 1–3 |
| 54 | Higiene docs Olympus (4 refs + pointer) | Baixo | — | greps só retornam histórico |
| 55 | `.idea/` no `.gitignore` | Baixo | — | `git status` limpo |
| 56 | Mnemósine do ciclo 09-09 (CHANGELOG/README) | Médio | — | ciclo legível sem o -log |
| 57 | Contracts vs Supabase: integrar ou documentar fakes-only | Médio | — | sem promessa sem execução |
| 58 | Monitorar flakiness residual | Baixo | — | taxa documentada; zero skip |
| 59 | Auditoria RLS antes de server-side | Médio | — | checklist assinado ou risco aceito |
| 60 | Warnings de lint oportunistas | Baixo | — | reduzir quando tocar nos arquivos |
| 61 | [BUG visual] Remover background indevido de dashboard/login (VIS-001) | Médio | — | sem `.mascot-background` no DOM + suíte verde |

---

## 6. Prontidão (resposta direta)

**Para o módulo #2, hoje:** ✅ `node .agents/scripts/new-module.js <modulo>` gera árvore que compila, testa (contract+fakes) e documenta (story) — verificado com dummy na 43. ✅ Mapa diz onde cada coisa vai; Atena exige declarar camadas. ✅ Backlog rastreia. ✅ Dados via `IDatabaseClient` + fakes replicáveis. Pendência zero estrutural; fazer 54+55 antes é higiene de 15 minutos, não pré-requisito.
**Para evoluir o Pluto:** ✅ pages finas, hooks testados, tipos honestos; próximos alvos conhecidos e dimensionados (53, 52). Riscos adormecidos com dono e gatilho (57, 59, 58).

---

## 7. Notas de Método

- Baseline deste relatório foi executado, não herdado: tsc, lint, vitest (63/418), `next build` e `build-storybook` rodados na árvore atual.
- O achado mais grave (build vermelho) veio de onde ninguém olhava: a DoD do ciclo cobria tsc+lint+vitest+storybook, mas não `next build`. Corrigido o código (51) e registrada a lição em §4.1.
- Anti-padrão evitado de novo: arquivo sem chamador nem teste é passivo — aplicado a hooks (4), standalones (13) e factory server (1), todos com grep como prova, não intuição.
- Workaround mantido (`clickConnectedButton`) segue justificado e inofensivo; sua causa-raiz sumiu na 45.
