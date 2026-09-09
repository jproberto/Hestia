# Modularização: Módulo Pluto Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

**Objetivo:** Transformar o Héstia em guarda-chuva de sub-sistemas movendo todo o domínio financeiro (código, testes e documentação) para as pastas `<camada>/pluto/` e `.agents/pluto/`, renomeando as URLs `/finance/*` para `/pluto/*`, registrando o Pluto como primeiro módulo no backlog central e estendendo o CLI `sdd.js` para resolver artefatos de qualquer módulo — sem alterar nenhum comportamento funcional.

**Arquitetura:** Padrão "módulo por camada": dentro de cada namespace da raiz (`app`, `components`, `lib`, `__tests__`), tudo exclusivo do módulo entra em `<camada>/pluto/`; compartilhado permanece na raiz. Documentação do módulo vive em `.agents/pluto/{backlog.md, specs/, plans/, logs/}`; artefatos transversais permanecem na raiz de `.agents/`. Migração completa via `git mv` (preserva histórico), quebra limpa sem redirects, shims ou arquivos-ponte. O banco Supabase não é tocado.

**Tech Stack:** Next.js 16 (App Router), React 18, TypeScript 5, Tailwind CSS 4, Vitest 2 + Testing Library, ESLint 9 (flat config), Supabase JS, Node.js (script CommonJS `.agents/scripts/sdd.js`), Git.

## Restrições Globais

Copiadas da spec `.agents/specs/26-modularizacao-pluto-spec.md`. Toda task herda esta seção implicitamente.

1. **Quebra limpa, sem legado:** sem redirects de `/finance/*`, sem aliases, sem arquivos-ponte (reexport/wrapper/shim). As URLs antigas deixam de existir no mesmo commit da mudança de rotas.
2. **Zero mudança comportamental:** mesmas regras de negócio, mesmos dados, mesmas telas. Apenas caminhos, URLs e nomes de import mudam.
3. **Banco de dados intocado:** um único projeto Supabase; `utils/migrations/` permanece central; schemas, tabelas e colunas NÃO são renomeados (exceção deliberada da spec — nomes já são genéricos de domínio).
4. **Histórico Git:** toda movimentação de arquivo usa `git mv` (nunca delete + create), preservando autoria no histórico.
5. **Sem convivência dual:** ao final, qualquer artefato (código, teste, doc ou configuração) que referencie caminhos ou URLs antigas é falha da migração. Exceções explícitas à auditoria de resquícios (auto-referência histórica da própria migração): APENAS `.agents/specs/26-modularizacao-pluto-spec.md` e `.agents/plans/26-modularizacao-pluto-plan.md` podem conter os caminhos antigos, pois documentam a mudança em si.
6. **Interpretação operacional da auditoria final (Critério 8 da spec):** a busca por "finance" é aplicada como padrões de CAMINHO (`/finance`, `lib/db`, `lib\db`), conforme a própria spec define na mitigação de riscos ("resquícios de 'finance' em caminhos de código"). Palavras da língua portuguesa como "financeiro(a)" em prosa de documentos NÃO são alvo da auditoria e não devem ser reescritas. Links cruzados e referências técnicas a caminhos antigos EM DOCUMENTAÇÃO (incluindo specs/planos históricos e entradas antigas do CHANGELOG/README) SÃO atualizados mecanicamente pelas regras R1–R5 da Tarefa 4.
7. **Versionamento (SemVer):** o bump de versão no `package.json` NÃO faz parte deste plano. Ocorre exclusivamente no fim do ciclo de homologação/revisão, imediatamente antes do `git push`.
8. **Commits:** mensagens em português, via `node .agents/scripts/sdd.js commit "<mensagem>"`, somente após verificações verdes, nunca misturando tarefas independentes.
9. **Ambiente Windows/PowerShell:** comandos de busca usam `findstr` (nativo; `rg` não está disponível no shell). ATENÇÃO: ao buscar recursivamente, o findstr exige wildcard no diretório (`pasta\*.*`); um diretório passado sem `\*.*` é tratado como nome de arquivo literal e produz falso negativo silencioso — a ferramenta Grep do agente é alternativa equivalente (e preferível para auditorias) quando disponível. Não usar `Set-Content`/`Out-File` para editar arquivos existentes (risco de corromper encoding UTF-8 de arquivos com acentuação) — usar ferramenta de edição de arquivo.
10. **Verificações de gate por tarefa:** `npx eslint .` e `npx tsc --noEmit` são executados automaticamente por `node .agents/scripts/sdd.js task-complete N`; rodar `npm test` adicionalmente em toda tarefa que tocar código/testes. Baseline esperado: todas verdes ANTES de iniciar a Tarefa 1.

---

### Tarefa 1: Mover a lógica de domínio financeiro para `lib/pluto/`

**Arquivos:**
- Mover (git mv): `lib/checklist-budget.ts` → `lib/pluto/checklist-budget.ts`
- Mover (git mv): `lib/db/accounts.ts`, `lib/db/budget.ts`, `lib/db/categories.ts`, `lib/db/checklist.ts`, `lib/db/months.ts`, `lib/db/transactions.ts` → `lib/pluto/db/<mesmo-nome>`
- Modificar (imports internos): `lib/pluto/db/months.ts` (importa de `@/lib/db/checklist`)
- Modificar (imports): `app/finance/budget/page.tsx`, `app/finance/months/page.tsx`, `app/finance/transactions/page.tsx`, `components/finance/ChecklistCard.tsx`
- Mover (git mv) Testes: `__tests__/lib/checklist-budget.test.ts` → `__tests__/lib/pluto/checklist-budget.test.ts`; os 7 arquivos de `__tests__/lib/db/*.test.ts` (accounts, budget, categories, checklist, months-checklist, months, transactions) → `__tests__/lib/pluto/db/<mesmo-nome>`
- Modificar (imports de teste): todos os arquivos movidos acima + os 5 arquivos de `__tests__/app/finance/*.test.tsx` e os 2 de `__tests__/components/finance/*.test.tsx` que importam/mockam `@/lib/db/*`

**Interfaces:**
- Consome: nada (primeira tarefa de código; baseline verde).
- Produz: novos paths canônicos de import consumidos pelas Tarefas 2 e 3 — `@/lib/pluto/checklist-budget`, `@/lib/pluto/db/accounts`, `@/lib/pluto/db/budget`, `@/lib/pluto/db/categories`, `@/lib/pluto/db/checklist`, `@/lib/pluto/db/months`, `@/lib/pluto/db/transactions`. Exportações, assinaturas e tipos dos arquivos permanecem IDÊNTICOS aos atuais (nenhuma alteração além de caminhos de import).

**Passo 1: Criar branch, validar o plano e iniciar a tarefa**

```powershell
git checkout -b feature/26-modularizacao-pluto
node .agents/scripts/sdd.js start 26-modularizacao-pluto
node .agents/scripts/sdd.js task-start 1
```

Expected (start): `[INFO] Branch Git ativa válida: 'feature/26-modularizacao-pluto'`, `[INFO] Guardian: Spec correspondente encontrada.`, `[INFO] Status da feature 26 no backlog: 'Especificado'` (ou `'Em Desenvolvimento'`), `[INFO] Plano de tarefas '26-modularizacao-pluto' validado e pronto para desenvolvimento local.`

**Passo 2: Verificar baseline verde**

Run: `npm test`
Expected: PASS (suíte completa atual — 17 arquivos de teste).

**Passo 3: Mover os fontes e testes com git mv**

```powershell
New-Item -ItemType Directory -Force lib\pluto | Out-Null
git mv lib/checklist-budget.ts lib/pluto/checklist-budget.ts
git mv lib/db lib/pluto/db
New-Item -ItemType Directory -Force __tests__\lib\pluto | Out-Null
git mv __tests__/lib/checklist-budget.test.ts __tests__/lib/pluto/checklist-budget.test.ts
git mv __tests__/lib/db __tests__/lib/pluto/db
```

Expected: comandos concluem sem erro; `git status --porcelain` mostra apenas renames (`R`) desses arquivos.

**Passo 4: Atualizar imports afetados**

Em TODOS os arquivos abaixo, substituir mecanicamente os literais (apenas esses literais, nenhuma outra edição):

| Literal antigo | Literal novo |
|---|---|
| `@/lib/checklist-budget` | `@/lib/pluto/checklist-budget` |
| `@/lib/db/` | `@/lib/pluto/db/` |

Arquivos a editar:
1. `lib/pluto/db/months.ts` (import interno de `@/lib/db/checklist`)
2. `app/finance/budget/page.tsx`
3. `app/finance/months/page.tsx`
4. `app/finance/transactions/page.tsx`
5. `components/finance/ChecklistCard.tsx`
6. `__tests__/lib/pluto/checklist-budget.test.ts`
7. Os 7 arquivos em `__tests__/lib/pluto/db/*.test.ts`
8. Os 5 arquivos em `__tests__/app/finance/*.test.tsx` (imports diretos e chamadas `vi.mock("@/lib/db/...", ...)`)
9. Os 2 arquivos em `__tests__/components/finance/*.test.tsx`

**Passo 5: Confirmar que nenhum import antigo restou em código**

Run: `findstr /s /n /c:"@/lib/db/" app\*.* components\*.* lib\*.* __tests__\*.*`
Expected: nenhuma linha impressa.

Run: `findstr /s /n /c:"checklist-budget" app\*.* components\*.* lib\*.* __tests__\*.*`
Expected: TODAS as linhas retornadas contêm `@/lib/pluto/checklist-budget`; nenhuma linha pode conter o import antigo `@/lib/checklist-budget`.

**Passo 6: Rodar a suíte de testes**

Run: `npm test`
Expected: PASS — mesma quantidade de testes da baseline, agora resolvidos pelos novos paths.

**Passo 7: Marcar a tarefa como concluída no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-complete 1`
Expected: `[INFO] Linter OK.`, `[INFO] TypeScript OK.`, `[INFO] Tarefa 1 marcada como Concluída no CLI.`

**Passo 8: Commit**

```powershell
git add lib __tests__ app components
node .agents/scripts/sdd.js commit "refatora: move logica de dominio financeiro para lib/pluto"
```

---

### Tarefa 2: Mover os componentes do módulo para `components/pluto/`

**Arquivos:**
- Mover (git mv): `components/finance/BudgetOverflowModal.tsx` e `components/finance/ChecklistCard.tsx` → `components/pluto/<mesmo-nome>`
- Mover (git mv) Testes: `__tests__/components/finance/BudgetOverflowModal.test.tsx` e `__tests__/components/finance/ChecklistCard.test.tsx` → `__tests__/components/pluto/<mesmo-nome>`
- Modificar (imports): `app/finance/transactions/page.tsx` (2 imports de `@/components/finance/*`) e os 2 arquivos de teste movidos

**Interfaces:**
- Consome: paths `@/lib/pluto/db/*` e `@/lib/pluto/checklist-budget` (Tarefa 1), já referenciados dentro dos componentes movidos.
- Produz: paths canônicos `@/components/pluto/BudgetOverflowModal` e `@/components/pluto/ChecklistCard`, consumidos pela Tarefa 3. Props e exports dos componentes permanecem IDÊNTICOS.

**Passo 1: Iniciar a tarefa**

Run: `node .agents/scripts/sdd.js task-start 2`
Expected: `[INFO] Tarefa 2 marcada como Em Andamento no CLI.`

**Passo 2: Mover os arquivos com git mv**

```powershell
New-Item -ItemType Directory -Force components\pluto, __tests__\components\pluto | Out-Null
git mv components/finance/BudgetOverflowModal.tsx components/pluto/BudgetOverflowModal.tsx
git mv components/finance/ChecklistCard.tsx components/pluto/ChecklistCard.tsx
git mv __tests__/components/finance/BudgetOverflowModal.test.tsx __tests__/components/pluto/BudgetOverflowModal.test.tsx
git mv __tests__/components/finance/ChecklistCard.test.tsx __tests__/components/pluto/ChecklistCard.test.tsx
```

**Passo 3: Rodar o teste e confirmar a falha esperada (RED)**

Run: `npm test __tests__/components/pluto/`
Expected: FAIL com erro de resolução de módulo (`Failed to resolve import "@/components/finance/ChecklistCard"` e `@/components/finance/BudgetOverflowModal`) nos 2 arquivos de teste — imports ainda apontam para o caminho antigo, que não existe mais. Esta é a falha esperada pelo motivo certo.

**Passo 4: Atualizar os imports (implementação mínima)**

Substituir o literal `@/components/finance/` por `@/components/pluto/` em:
1. `__tests__/components/pluto/ChecklistCard.test.tsx`
2. `__tests__/components/pluto/BudgetOverflowModal.test.tsx`
3. `app/finance/transactions/page.tsx` (imports de `ChecklistCard` e `BudgetOverflowModal`)

**Passo 5: Rodar o teste e confirmar que passa (GREEN)**

Run: `npm test __tests__/components/pluto/`
Expected: PASS (os 2 arquivos de teste).

Run: `npm test`
Expected: PASS — suíte completa verde.

**Passo 6: Marcar a tarefa como concluída no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-complete 2`
Expected: `[INFO] Linter OK.`, `[INFO] TypeScript OK.`, `[INFO] Tarefa 2 marcada como Concluída no CLI.`

**Passo 7: Commit**

```powershell
git add components __tests__ app
node .agents/scripts/sdd.js commit "refatora: move componentes do modulo financeiro para components/pluto"
```

---

### Tarefa 3: Mover as rotas para `app/pluto/` e atualizar todas as URLs do módulo

**Arquivos:**
- Mover (git mv): diretório `app/finance/` → `app/pluto/` (mantém `budget/page.tsx`, `months/page.tsx`, `transactions/page.tsx`)
- Mover (git mv) Testes: diretório `__tests__/app/finance/` → `__tests__/app/pluto/` (5 arquivos)
- Modificar (URLs internas): `app/pluto/budget/page.tsx` (3 Links do menu superior), `app/pluto/months/page.tsx` (3 Links), `app/pluto/transactions/page.tsx` (4 Links + 1 Link interno = 5 URLs), `components/pluto/BudgetOverflowModal.tsx` (1 `router.push("/finance/budget")`)
- Modificar: `app/dashboard/page.tsx` (card: `href="/finance/budget"` → `href="/pluto/budget"`; título `Héstia Financeira 💰` → `Pluto 💰`; descrição mantida)
- Modificar (imports de teste): os 5 arquivos movidos (`@/app/finance/...` → `@/app/pluto/...`)

**Interfaces:**
- Consome: `@/components/pluto/*` (Tarefa 2) e `@/lib/pluto/*` (Tarefa 1), já referenciados pelas páginas.
- Produz: superfície definitiva de URLs do módulo — `/pluto/budget`, `/pluto/months`, `/pluto/transactions` — e o ponto de integração núcleo→módulo no dashboard (href `/pluto/budget`). Consumido pela homologação manual (seção final deste plano) e pela auditoria da Tarefa 8. As URLs `/finance/*` deixam de existir neste commit (sem redirect).

**Passo 1: Iniciar a tarefa**

Run: `node .agents/scripts/sdd.js task-start 3`
Expected: `[INFO] Tarefa 3 marcada como Em Andamento no CLI.`

**Passo 2: Mover os diretórios de rota e teste com git mv**

```powershell
git mv app/finance app/pluto
git mv __tests__/app/finance __tests__/app/pluto
```

**Passo 3: Confirmar a falha esperada (RED)**

Run: `npm test __tests__/app/pluto/`
Expected: FAIL com erro de resolução de módulo para `@/app/finance/*/page` nos 5 arquivos de teste.

**Passo 4: Atualizar imports de teste e URLs da aplicação**

Substituir os literais (somente estes):

| Literal antigo | Literal novo |
|---|---|
| `@/app/finance/` | `@/app/pluto/` |
| `href="/finance/budget"` | `href="/pluto/budget"` |
| `href="/finance/months"` | `href="/pluto/months"` |
| `href="/finance/transactions"` | `href="/pluto/transactions"` |
| `router.push("/finance/budget")` | `router.push("/pluto/budget")` |

Arquivos a editar:
1. Os 5 arquivos em `__tests__/app/pluto/*.test.tsx` (literal `@/app/finance/`)
2. `app/pluto/budget/page.tsx` (3 hrefs)
3. `app/pluto/months/page.tsx` (3 hrefs)
4. `app/pluto/transactions/page.tsx` (5 ocorrências de URL: 3 do menu superior, 1 Link interno para months e as demais)
5. `components/pluto/BudgetOverflowModal.tsx` (1 router.push)

Em seguida, editar `app/dashboard/page.tsx`:
- Trocar `href="/finance/budget"` por `href="/pluto/budget"` no Link do card.
- Trocar o texto do título `Héstia Financeira 💰` por `Pluto 💰`.
- Manter a descrição do card como está.

**Passo 5: Rodar o teste e confirmar que passa (GREEN)**

Run: `npm test __tests__/app/pluto/`
Expected: PASS (5 arquivos).

Run: `npm test`
Expected: PASS — suíte completa.

**Passo 6: Confirmar que nenhuma URL antiga restou no código**

Run: `findstr /s /n /c:"/finance" app components lib`
Expected: nenhuma linha impressa.

**Passo 7: Marcar a tarefa como concluída no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-complete 3`
Expected: `[INFO] Linter OK.`, `[INFO] TypeScript OK.`, `[INFO] Tarefa 3 marcada como Concluída no CLI.`

**Passo 8: Commit**

```powershell
git add app components __tests__
node .agents/scripts/sdd.js commit "refatora: move rotas para app/pluto, atualiza urls para /pluto e card do dashboard"
```

---

### Tarefa 4: Migrar a documentação histórica via `git mv` e criar o backlog do módulo Pluto

**Arquivos:**
- Criar: `.agents/pluto/backlog.md`
- Criar diretórios: `.agents/pluto/specs/` e `.agents/pluto/plans/`
- Mover (git mv) 13 specs: `01-orcamento-spec.md`, `02-ajuste-orcamento-spec.md`, `02a-ajuste-orcamento-spec.md`, `03-checklist-contas-spec.md`, `03a-checklist-orcamento-spec.md`, `04-abertura-mes-spec.md`, `05-cadastro-transacoes-spec.md`, `05a-cadastro-transacoes-spec.md`, `05b-cadastro-transacoes-spec.md`, `05c-cadastro-transacoes-spec.md`, `05d-salvar-e-adicionar-outro-spec.md`, `08-edicao-exclusao-lancamentos-spec.md`, `10-saldo-mes-spec.md` → `.agents/pluto/specs/`
- Mover (git mv) 13 plans: `01-orcamento-plan.md`, `02-ajuste-orcamento-plan.md`, `02a-ajuste-orcamento-plan.md`, `03-checklist-contas-plan.md`, `03a-checklist-orcamento-plan.md`, `04-abertura-mes-plan.md`, `05-cadastro-transacoes-plan.md`, `05a-cadastro-transacoes-plan.md`, `05b-cadastro-transacoes-plan.md`, `05c-cadastro-transacoes-plan.md`, `05d-salvar-e-adicionar-outro-plan.md`, `08-edicao-exclusao-lancamentos-plan.md`, `10-saldo-mes-plan.md` → `.agents/pluto/plans/`
- Permanecem na raiz (transversais): specs `0-architecture-and-stack-spec.md`, `0-github-actions-automation-spec.md`, `0-github-actions-cd-and-release-spec.md`, `0-pagina-login-spec.md`, `0-sdd-tool-guardian-spec.md`, `26-modularizacao-pluto-spec.md`; plans `0-github-actions-automation-plan.md`, `0-github-actions-cd-and-release-plan.md`, `0-initial-project-setup-plan.md`, `0-pagina-login-plan.md`, `0-sdd-tool-guardian-plan.md`, `26-modularizacao-pluto-plan.md`
- Logs: `.agents/logs/` NÃO existe hoje (verificado) — nada a migrar; a pasta `.agents/pluto/logs/` será criada naturalmente pelo fluxo quando surgir o primeiro log (git não versiona diretório vazio; NÃO criar `.gitkeep`).
- Modificar (cross-links): todos os arquivos `.md` do repositório que referenciam os itens movidos (backlog central, specs/plans migrados entre si, CHANGELOG.md, README.md, skills), aplicando as regras R1–R5 do Passo 4.

**Interfaces:**
- Consome: nada de código (independente das Tarefas 1–3).
- Produz: estrutura `.agents/pluto/{backlog.md, specs/, plans/}` consumida pela Tarefa 5 (tabela de módulos referencia o backlog do Pluto) e pela Tarefa 7 (smoke test usa `.agents/pluto/specs/01-orcamento-spec.md` + `.agents/pluto/plans/01-orcamento-plan.md`).

**Passo 1: Iniciar a tarefa**

Run: `node .agents/scripts/sdd.js task-start 4`
Expected: `[INFO] Tarefa 4 marcada como Em Andamento no CLI.`

**Passo 2: Mover specs e plans com git mv**

```powershell
New-Item -ItemType Directory -Force .agents\pluto\specs, .agents\pluto\plans | Out-Null
git mv .agents/specs/01-orcamento-spec.md .agents/pluto/specs/
git mv .agents/specs/02-ajuste-orcamento-spec.md .agents/pluto/specs/
git mv .agents/specs/02a-ajuste-orcamento-spec.md .agents/pluto/specs/
git mv .agents/specs/03-checklist-contas-spec.md .agents/pluto/specs/
git mv .agents/specs/03a-checklist-orcamento-spec.md .agents/pluto/specs/
git mv .agents/specs/04-abertura-mes-spec.md .agents/pluto/specs/
git mv .agents/specs/05-cadastro-transacoes-spec.md .agents/pluto/specs/
git mv .agents/specs/05a-cadastro-transacoes-spec.md .agents/pluto/specs/
git mv .agents/specs/05b-cadastro-transacoes-spec.md .agents/pluto/specs/
git mv .agents/specs/05c-cadastro-transacoes-spec.md .agents/pluto/specs/
git mv .agents/specs/05d-salvar-e-adicionar-outro-spec.md .agents/pluto/specs/
git mv .agents/specs/08-edicao-exclusao-lancamentos-spec.md .agents/pluto/specs/
git mv .agents/specs/10-saldo-mes-spec.md .agents/pluto/specs/
git mv .agents/plans/01-orcamento-plan.md .agents/pluto/plans/
git mv .agents/plans/02-ajuste-orcamento-plan.md .agents/pluto/plans/
git mv .agents/plans/02a-ajuste-orcamento-plan.md .agents/pluto/plans/
git mv .agents/plans/03-checklist-contas-plan.md .agents/pluto/plans/
git mv .agents/plans/03a-checklist-orcamento-plan.md .agents/pluto/plans/
git mv .agents/plans/04-abertura-mes-plan.md .agents/pluto/plans/
git mv .agents/plans/05-cadastro-transacoes-plan.md .agents/pluto/plans/
git mv .agents/plans/05a-cadastro-transacoes-plan.md .agents/pluto/plans/
git mv .agents/plans/05b-cadastro-transacoes-plan.md .agents/pluto/plans/
git mv .agents/plans/05c-cadastro-transacoes-plan.md .agents/pluto/plans/
git mv .agents/plans/05d-salvar-e-adicionar-outro-plan.md .agents/pluto/plans/
git mv .agents/plans/08-edicao-exclusao-lancamentos-plan.md .agents/pluto/plans/
git mv .agents/plans/10-saldo-mes-plan.md .agents/pluto/plans/
```

Expected: 26 entradas de rename (`R`) em `git status --porcelain`.

**Passo 3: Criar `.agents/pluto/backlog.md`**

Montar o arquivo a partir do conteúdo atual de `.agents/backlog.md`, com esta estrutura exata:

```markdown
# Backlog — Módulo Pluto (Finanças Familiares)

## Contexto do módulo

[Copiar integralmente a seção "## Contexto do produto" do backlog central atual, incluindo as notas sobre stack, usuários, moeda, modelo de orçamento, categorias/contas inline, desacoplamento do checklist, apelidos, ciclo de vida do mês e ausência de integração bancária.]

---

## Backlog priorizado (MVP)

[Blocos 1 a 5 completos, copiados tal qual: títulos dos blocos, tabelas com colunas # / Feature / Descrição / Status / Specs / Planos, IDs 1–14 preservados com status, descrições e notas originais.]

---

## Backlog priorizado (V2)

[Tabela dos itens 15–21 preservando IDs, descrições e células vazias de status/spec/planos.]

---

## Backlog priorizado (V3)

[Tabela dos itens 22–25 preservando IDs, descrições e células vazias.]
```

Regras de montagem:
- Preservar IDs, títulos, descrições, status e notas de cada linha exatamente como estão hoje.
- Aplicar as regras R1–R5 (Passo 4) aos links `file:///p:/workspace/IA/hestia/.agents/...` das linhas, para apontarem aos novos locais.
- Itens 6 (Apelidos) e 7 (Compras parceladas) não têm spec/plano — manter as células vazias como hoje.
- NÃO incluir itens estruturais (26+) no backlog do módulo.

**Passo 4: Atualizar cross-links em toda a documentação**

Aplicar as substituições de literais abaixo em TODOS os arquivos `.md` do repositório (raiz: `README.md`, `CHANGELOG.md`, `AGENTS.md`; `.agents/**/*.md`, incluindo os recém-movidos e `.agents/skills/**`). NÃO aplicar aos isentos: `.agents/specs/26-modularizacao-pluto-spec.md` e `.agents/plans/26-modularizacao-pluto-plan.md`.

| Regra | Literal antigo | Literal novo |
|---|---|---|
| R1 | `/finance` | `/pluto` |
| R2 | `lib/db` | `lib/pluto/db` |
| R3 | `lib\db` | `lib\pluto\db` |
| R4 | `.agents/specs/01-orcamento-spec.md` e os demais 12 nomes de spec movidos (sempre precedidos de `.agents/specs/`) | mesmo nome precedido de `.agents/pluto/specs/` |
| R5 | `.agents/plans/01-orcamento-plan.md` e os demais 12 nomes de plan movidos (sempre precedidos de `.agents/plans/`) | mesmo nome precedido de `.agents/pluto/plans/` |

Notas:
- R1 cobre URLs (`/finance/budget` → `/pluto/budget`), imports citados em docs (`@/app/finance/...`, `@/components/finance/...`) e caminhos de código citados (`app/finance/...`, `components/finance/...`, `__tests__/app/finance/...`), pois todos contêm o substring `/finance`.
- R2/R3 cobrem citações técnicas de `lib/db/...`, `__tests__/lib/db/...` e variantes com barra invertida.
- R4/R5 restritas aos 26 nomes listados no Passo 2 — links para artefatos transversais (`0-*`, `26-*`) permanecem na raiz de `.agents/`.
- Aplicar UMA única vez (não idempotentes sob repetição).
- Prosa em português ("financeiro", "financeira", "Héstia Financeira") NÃO é alterada (Restrição Global 6).

**Passo 5: Verificar os cross-links**

Run: `findstr /s /n /c:"/finance" .agents\*.* *.md`
Expected: ocorrências APENAS nos 2 arquivos isentos. Nenhuma outra.

Run: `findstr /s /n /c:"lib/db" .agents\*.* *.md`
Expected: nenhuma linha impressa fora dos 2 isentos.

Run: `findstr /s /n /c:".agents/specs/" .agents\backlog.md .agents\pluto\backlog.md CHANGELOG.md README.md`
Expected: backlog central referenciando somente specs transversais (`0-*`, `26-*`); backlog do Pluto referenciando somente `.agents/pluto/specs/`.

Run: `findstr /s /n /c:".agents/plans/" .agents\backlog.md .agents\pluto\backlog.md CHANGELOG.md README.md`
Expected: mesma regra, para plans.

**Passo 6: Commit**

```powershell
git add .agents
node .agents/scripts/sdd.js commit "refatora: migra specs e planos do modulo Pluto via git mv e cria backlog do modulo"
```

---

### Tarefa 5: Reestruturar o backlog central e atualizar as convenções de processo (AGENTS.md e SKILL.mds)

**Arquivos:**
- Modificar: `.agents/backlog.md` (reescrita: guarda-chuva + tabela de módulos + item estrutural 26)
- Modificar: `AGENTS.md` (mapa de estrutura, URLs e padrão de módulos)
- Modificar: `.agents/skills/sdd-01-brainstorm/SKILL.md`, `.agents/skills/sdd-02-plan/SKILL.md`, `.agents/skills/sdd-03-implement/SKILL.md`, `.agents/skills/sdd-04-review/SKILL.md`, `.agents/skills/sdd-05-manual-test/SKILL.md`, `.agents/skills/sdd-05-manual-test/references/manual_tests.md`, `.agents/skills/sdd-writer-changelog/SKILL.md`
- Verificar (editar só se houver menção): `.agents/skills.md`
- Verificar sem alteração: `CLAUDE.md` (contém apenas `@AGENTS.md`; herda as mudanças automaticamente)

**Interfaces:**
- Consome: `.agents/pluto/backlog.md` existente (Tarefa 4).
- Produz: **contrato consumido pela Tarefa 7** — a seção "Módulos Registrados" do backlog central contém, em alguma linha, o link markdown `[.agents/pluto/backlog.md](...)`, âncora pela qual o `sdd.js` descobre módulos registrados (regex `\.agents\/([a-zA-Z0-9_-]+)\/backlog\.md` sobre o texto do backlog central).

**Passo 1: Iniciar a tarefa**

Run: `node .agents/scripts/sdd.js task-start 5`
Expected: `[INFO] Tarefa 5 marcada como Em Andamento no CLI.`

**Passo 2: Reescrever `.agents/backlog.md`**

Estrutura exata do novo backlog central:

```markdown
# Backlog — Héstia (Guarda-Chuva de Módulos)

## Contexto do produto-guarda-chuva

[Parágrafos curtos: Héstia é um guarda-chuva de sub-sistemas pessoais/familiares; stack comum Next.js na Vercel + um único projeto Supabase; padrão de organização módulo-por-camada — `<camada>/<modulo>/` no código e `.agents/<modulo>/` na documentação; o compartilhado fica na raiz da camada.]

## Módulos Registrados

| # | Módulo | Domínio | Pasta | Backlog do Módulo |
|---|---|---|---|---|
| 1 | **Pluto** | Finanças familiares: orçamento anual, meses operacionais, lançamentos, checklist de contas e saldo. | `pluto` | [.agents/pluto/backlog.md](.agents/pluto/backlog.md) |

---

## Backlog — Estrutural / Infraestrutura

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 26 | **Modularização: módulo Pluto** | [copiar a descrição atual da linha 26, preservando o status vigente ('Em Desenvolvimento' após a aprovação deste plano) e o link da spec `.agents/specs/26-modularizacao-pluto-spec.md`] | | | |
```

Regras:
- REMOVER do backlog central todos os blocos de domínio financeiro (MVP Blocos 1–5, V2 e V3) — vivem agora em `.agents/pluto/backlog.md`.
- PRESERVAR a linha do item 26 com status vigente e link da spec na raiz de `.agents/specs/`.
- Manter o formato da tabela de módulos acima (o parser da Tarefa 7 extrai a pasta do link `.agents/<pasta>/backlog.md`).

**Passo 3: Atualizar AGENTS.md**

Alterar apenas o que se segue:
1. Seção "Estrutura do Projeto": refletir o novo mapa — `.agents/pluto/{backlog.md, specs/, plans/, logs/}` nas docs; `app/pluto/`, `components/pluto/`, `lib/pluto/` (com `db/`) e `__tests__/**/pluto/` no código — mantendo as pastas comuns (`app/layout.tsx`/`page.tsx`/`globals.css`, `app/login/`, `app/dashboard/`, `components/ui/`, `lib/utils.ts`, `utils/supabase/`, `utils/migrations/`).
2. Acrescentar parágrafo curto "Padrão de Módulos": código específico de módulo em `<camada>/<modulo>/`; documentação de módulo em `.agents/<modulo>/`; artefatos transversais na raiz de `.agents/` e registrados na tabela de módulos do backlog central. O mesmo parágrafo inclui a nota procedural de registro (decisão aprovada pelo parceiro): **para registrar um novo módulo, criar `.agents/<modulo>/backlog.md` e adicionar sua linha na tabela "Módulos Registrados" do backlog central** (formato consumido pelo parser do `sdd.js`); sem scaffolding automático.
3. Atualizar menções a URLs de telas para `/pluto/*`, se existirem.
4. NÃO alterar a tabela de skills nem as regras fundamentais; nos comandos do CLI, apenas ajustar menções a caminhos de specs/plans para descrever a resolução por módulo (mesma redação do Passo 4).

**Passo 4: Atualizar convenções nos SKILL.mds**

Ajustar SOMENTE as frases que citam caminhos de specs/plans/backlog para descrever o padrão: features de um módulo registrado salvam/buscam artefatos em `.agents/<modulo>/specs|plans/` e transicionam status no `.agents/<modulo>/backlog.md`; features transversais usam a raiz de `.agents/` e o backlog central:

1. `.agents/skills/sdd-01-brainstorm/SKILL.md` — onde localizar a feature (backlog central OU backlog do módulo), onde salvar a spec e onde transicionar o status.
2. `.agents/skills/sdd-02-plan/SKILL.md` — "Onde salvar o plano" (`.agents/plans/` para transversais; `.agents/<modulo>/plans/` para módulos) e a instrução final de atualização de backlog.
3. `.agents/skills/sdd-03-implement/SKILL.md` — "Onde encontrar o plano": procurar também em `.agents/<modulo>/plans/` (consultar a tabela de módulos do backlog central).
4. `.agents/skills/sdd-04-review/SKILL.md` — regra do status `Concluído` passa a dizer "backlog correspondente (raiz para transversais; `.agents/<modulo>/backlog.md` para módulos)".
5. `.agents/skills/sdd-05-manual-test/SKILL.md` — mesma adaptação na menção de transição de status do backlog.
6. `.agents/skills/sdd-05-manual-test/references/manual_tests.md` — conferir que as URLs `/finance/*` viraram `/pluto/*` (coberto por R1 na Tarefa 4; corrigir aqui qualquer resquício).
7. `.agents/skills/sdd-writer-changelog/SKILL.md` — menção a `.agents/specs/...-spec.md` passa a indicar "spec da feature (raiz `.agents/specs/` ou `.agents/<modulo>/specs/`)".

Verificação de catálogo:
Run: `findstr /n /c:".agents/specs" .agents\skills.md`
Run: `findstr /n /c:".agents/plans" .agents\skills.md`
Expected: nenhuma ocorrência (nenhuma edição necessária); se houver, aplicar a mesma adaptação por módulo neste passo.

**Passo 5: Verificação objetiva**

Run: `findstr /n /c:"pluto" .agents\backlog.md`
Expected: a linha do módulo Pluto na tabela "Módulos Registrados" contendo `.agents/pluto/backlog.md`; e NENHUMA linha de feature de domínio financeiro (itens 1–25).

Run: `findstr /n /c:"| 26 |" .agents\backlog.md`
Expected: exatamente UMA linha — o item estrutural, com status vigente e link para `.agents/specs/26-modularizacao-pluto-spec.md`.

Run: `findstr /s /n /c:"/finance" .agents\skills\*.* .agents\backlog.md AGENTS.md`
Expected: nenhuma linha impressa.

**Passo 6: Marcar a tarefa como concluída no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-complete 5`
Expected: `[INFO] Linter OK.`, `[INFO] TypeScript OK.`, `[INFO] Tarefa 5 marcada como Concluída no CLI.`

**Passo 7: Commit**

```powershell
git add AGENTS.md .agents/backlog.md .agents/skills
node .agents/scripts/sdd.js commit "docs: reestrutura backlog central com tabela de modulos e ajusta convencoes de processo"
```

---

### Tarefa 6: Atualizar README.md e CHANGELOG.md

**Arquivos:**
- Modificar: `README.md`
- Modificar: `CHANGELOG.md`

**Interfaces:**
- Consome: URLs finais `/pluto/*` (Tarefa 3) e estrutura final de pastas (Tarefas 1–5).
- Produz: documentação pública coerente com o estado pós-migração; consumida pela revisão técnica (sdd-04) e pela homologação (sdd-05).

**Passo 1: Iniciar a tarefa**

Run: `node .agents/scripts/sdd.js task-start 6`
Expected: `[INFO] Tarefa 6 marcada como Em Andamento no CLI.`

**Passo 2: Atualizar README.md**

1. Conferir que as URLs de funcionalidades estão em `/pluto/budget`, `/pluto/months`, `/pluto/transactions` (R1 da Tarefa 4 deve ter coberto; corrigir resquício se houver).
2. Atualizar/adicionar a seção de estrutura refletindo: `app/pluto/`, `components/pluto/`, `lib/pluto/{db}`, `__tests__/**/pluto/`, `.agents/pluto/` e as pastas comuns.
3. Acrescentar nota breve de que o Pluto é o módulo financeiro do Héstia e o primeiro a seguir o padrão módulo-por-camada.

**Passo 3: Adicionar entrada no CHANGELOG.md**

Acrescentar nova entrada NO TOPO do arquivo, no formato das existentes, com cabeçalho `## [Não lançado] — 2026-08-22` (a numeração SemVer efetiva será aplicada no ciclo de release, fora deste plano). Conteúdo da entrada:

- **Modularização — Módulo Pluto**: todo o domínio financeiro migra para `app/pluto/`, `components/pluto/`, `lib/pluto/` (com `db/`) e testes espelhados em `__tests__/**/pluto/`.
- **Novas URLs**: `/pluto/budget`, `/pluto/months`, `/pluto/transactions` — as rotas do prefixo anterior deixam de existir, sem redirect.
- **Card do dashboard**: passa a apontar para `/pluto/budget` e exibir o nome "Pluto".
- **Documentação**: specs, planos e backlog do domínio financeiro migrados para `.agents/pluto/` via `git mv`; backlog central ganha tabela de módulos registrados.
- **Tooling**: `sdd.js` resolve specs, planos e status de backlog dentro de `.agents/<modulo>/` usando a tabela de módulos do backlog central.
- Redigir SEM os literais `/finance`, `lib/db` ou `components/finance` (usar "prefixo de rota anterior"/"camada de banco do módulo" quando precisar referir-se ao estado antigo), mantendo a auditoria de resquícios limpa.

**Passo 4: Verificação objetiva**

Run: `findstr /n /c:"/finance" README.md CHANGELOG.md`
Expected: nenhuma linha impressa.

Run: `findstr /n /c:"/pluto/budget" README.md CHANGELOG.md`
Expected: ao menos uma ocorrência em cada arquivo.

**Passo 5: Marcar a tarefa como concluída no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-complete 6`
Expected: `[INFO] Linter OK.`, `[INFO] TypeScript OK.`, `[INFO] Tarefa 6 marcada como Concluída no CLI.`

**Passo 6: Commit**

```powershell
git add README.md CHANGELOG.md
node .agents/scripts/sdd.js commit "docs: atualiza readme e changelog com nova estrutura de modulos e urls /pluto"
```

### Tarefa 7: Estender o `sdd.js` para resolver artefatos de qualquer módulo

**Arquivos:**
- Modificar: `.agents/scripts/sdd.js`
- Testar: smoke tests manuais via CLI (o script é CommonJS sem suíte automatizada própria; a spec prescreve smoke test manual — verificação alternativa objetiva detalhada nos Passos 3–6)

**Interfaces:**
- Consome: contrato da Tarefa 5 — seção "Módulos Registrados" no `.agents/backlog.md` com link `[.agents/<pasta>/backlog.md](...)`; estrutura `.agents/<modulo>/{specs,plans}/` da Tarefa 4.
- Produz: comportamento multi-módulo do CLI — `node .agents/scripts/sdd.js start <slug>` resolve planos em `.agents/plans/` (transversal) E em `.agents/<modulo>/plans/`; a spec correspondente é buscada no diretório `specs/` irmão do plano encontrado; o status é lido do backlog do módulo quando o plano pertence a um módulo. Consumido pelo fluxo SDD de todas as features futuras.

**Comportamento alvo (especificação funcional das mudanças no script):**

1. Nova função `getRegisteredModules()`: lê `.agents/backlog.md` e extrai, via regex global `\.agents\/([a-zA-Z0-9_-]+)\/backlog\.md`, cada módulo registrado. Retorna array de `{ name, dir, backlogPath }`, onde `dir = path.join(AGENTS_DIR, name)` e `backlogPath = path.join(AGENTS_DIR, name, "backlog.md")`. Sem módulos registrados, retorna array vazio (degrada para o comportamento atual).
2. `findPlanFile(slug)` passa a procurar o plano em diretórios candidatos, nesta ordem: `.agents/plans/` (transversal) e, para cada módulo registrado, `<modulo.dir>/plans/`. Correspondência: arquivo com `startsWith(slug)` e sufixo `-plan.md`. Se houver correspondência em mais de um diretório, emitir `[WARN]` listando todos e usar a primeira. Retornar `{ path, module }` (`module = null` para transversal, senão o objeto do módulo).
3. `cmdStart(slug)`:
   - Erro de plano inexistente cita ambos os locais (raiz e `.agents/<modulo>/plans/`).
   - Spec correspondente derivada do diretório do plano encontrado: `path.join(path.dirname(planFound.path), "..", "specs", specName)` — resolve tanto na raiz (`.agents/plans/../specs`) quanto no módulo (`.agents/pluto/plans/../specs`).
   - Status lido de `planFound.module.backlogPath` quando o plano é de módulo; do backlog central caso contrário. Se o backlog do módulo não existir, `[WARN]` e seguir sem checagem de status.
   - Validação de branch, parse do ID pelo prefixo numérico do slug e lista de status aceitos (`Especificado`, `Em Desenvolvimento`, `Concluído`) permanecem inalterados.
4. `cmdTaskStart(taskId)`: o guard de docs não-commitados passa a bloquear QUALQUER caminho sob `.agents/` contendo os segmentos `/specs/` ou `/plans/` (cobre raiz e módulos), substituindo os literais fixos atuais.
5. Ajuda (`default` do dispatcher): linha do comando `start` menciona a resolução também em `.agents/<modulo>/plans/`.

**Passo 1: Iniciar a tarefa**

Run: `node .agents/scripts/sdd.js task-start 7`
Expected: `[INFO] Tarefa 7 marcada como Em Andamento no CLI.`

**Passo 2: Implementar as mudanças 1–5 em `.agents/scripts/sdd.js`**

Seguir estritamente o "Comportamento alvo". NÃO alterar os comandos `commit`, `guardian`, `task-complete`, `task-block` e `request-review` (não resolvem caminhos de specs/plans/backlog).

**Passo 3: Smoke test positivo — artefato transversal (regressão)**

Run: `node .agents/scripts/sdd.js start 26-modularizacao-pluto`
Expected: exit 0, com `[INFO] Plano de tarefas '26-modularizacao-pluto' validado e pronto para desenvolvimento local.`, spec encontrada em `.agents/specs/` e status lido do backlog central.

**Passo 4: Smoke test positivo — artefato dentro de `.agents/pluto/` (novo comportamento)**

Run: `node .agents/scripts/sdd.js start 01-orcamento`
Expected: exit 0, com logs equivalentes a:
- `[INFO] Inicializando fluxo de tracking para o plano: '01-orcamento'...`
- `[INFO] Branch Git ativa válida: 'feature/26-modularizacao-pluto'`
- `[INFO] Guardian: Spec correspondente encontrada.` (spec resolvida em `.agents/pluto/specs/01-orcamento-spec.md`)
- `[INFO] Status da feature 1 no backlog: 'Concluído'` (lido de `.agents/pluto/backlog.md`; status `Concluído` está na lista de aceites)

Run: `node .agents/scripts/sdd.js guardian sdd-02-plan plan`
Expected: exit 0, `[INFO] Guardian: Transição ... VALIDADA E APROVADA FISICAMENTE.`

**Passo 5: Smoke test negativo — slug inexistente**

Run: `node .agents/scripts/sdd.js start zz-inexistente`
Expected: exit 1, `[ERROR] Plano de implementação para o slug 'zz-inexistente' não foi encontrado em .agents/plans/` (mensagem atualizada citando também `.agents/<modulo>/plans/`), sem stack trace.

**Passo 6: Marcar a tarefa como concluída no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-complete 7`
Expected: `[INFO] Linter OK.`, `[INFO] TypeScript OK.`, `[INFO] Tarefa 7 marcada como Concluída no CLI.`

**Passo 7: Commit**

```powershell
git add .agents/scripts/sdd.js
node .agents/scripts/sdd.js commit "feat: sdd.js resolve specs, planos e backlog de modulos registrados"
```

---

### Tarefa 8: Auditoria final de quebra limpa e regressão completa

**Arquivos:**
- Nenhum arquivo novo. Eventuais correções de resquícios encontrados são feitas nesta task (voltando ao padrão da tarefa de origem do resquício) e commitadas aqui.

**Interfaces:**
- Consome: estado final das Tarefas 1–7.
- Produz: evidência objetiva dos Critérios de Aceite 1, 2, 6 e 8 da spec (saídas dos comandos abaixo), registradas na conversa/revisão para a skill `sdd-04-review`.

**Passo 1: Iniciar a tarefa**

Run: `node .agents/scripts/sdd.js task-start 8`
Expected: `[INFO] Tarefa 8 marcada como Em Andamento no CLI.`

**Passo 2: Auditoria de caminhos antigos em código, testes e configurações**

Run: `findstr /s /n /c:"/finance" app\*.* components\*.* lib\*.* utils\*.* __tests__\*.* *.json *.mjs *.ts proxy.ts`
Expected: nenhuma linha impressa.

Run: `findstr /s /n /c:"lib/db" app\*.* components\*.* lib\*.* utils\*.* __tests__\*.* *.json *.mjs *.ts proxy.ts`
Expected: nenhuma linha impressa.

Run: `findstr /s /n /c:"components\finance" app\*.* components\*.* lib\*.* __tests__\*.*`
Expected: nenhuma linha impressa.

**Passo 3: Auditoria de caminhos antigos em documentação**

Run: `findstr /s /n /c:"/finance" .agents\*.* *.md`
Expected: ocorrências SOMENTE nos isentos `.agents\specs\26-modularizacao-pluto-spec.md` e `.agents\plans\26-modularizacao-pluto-plan.md`.

Run: `findstr /s /n /c:"lib/db" .agents\*.* *.md`
Expected: ocorrências somente nos mesmos isentos.

**Passo 4: Verificar que só restam testes de código comum fora de pluto**

Run: `dir /s /b __tests__\*.test.*`
Expected: fora de `__tests__\app\pluto\`, `__tests__\components\pluto\` e `__tests__\lib\pluto\`, existem APENAS `__tests__\sanity.test.ts` (e o helper `__tests__\setup.ts`). Nenhum teste de domínio financeiro fora do espelho pluto.

**Passo 5: Regressão completa**

Run: `npx eslint .`
Expected: sem erros.

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm test`
Expected: PASS — todos os arquivos de teste, nos novos paths.

Run: `npm run build`
Expected: build conclui sem erro, gerando as rotas `/pluto/budget`, `/pluto/months`, `/pluto/transactions` e SEM rotas `/finance/*` (conferir a listagem de rotas do output).

**Passo 6: Tratar resquícios (se houver)**

Se qualquer verificação dos Passos 2–5 apontar resquício, corrigir seguindo as regras da tarefa de origem (R1–R5 para docs; mapeamento de imports para código) e reexecutar a verificação até zerar. Resquício não corrigido BLOQUEIA a conclusão desta tarefa (é falha da migração, não exceção aceitável).

**Passo 7: Marcar a tarefa como concluída no CLI do SDD**

Run: `node .agents/scripts/sdd.js task-complete 8`
Expected: `[INFO] Linter OK.`, `[INFO] TypeScript OK.`, `[INFO] Tarefa 8 marcada como Concluída no CLI.`

**Passo 8: Commit (somente se houve correção)**

```powershell
git add -A
node .agents/scripts/sdd.js commit "chore: corrige resquicios de caminhos antigos na auditoria final"
```

Se nenhuma correção foi necessária, não há commit nesta tarefa.

---

## Cenários de Teste Manuais de Aceitação

Validar localmente com `npm run dev` e login válido (homologação guiada pela `sdd-05-manual-test`).

### CT-01 — Card do dashboard aponta para o módulo Pluto
- **Dado** que estou autenticado na página `/dashboard`,
- **Quando** inspeciono o card de ferramentas,
- **Então** o título exibido é "Pluto 💰" e o link aponta para `/pluto/budget`;
- **Quando** clico no card,
- **Então** sou levado à página `/pluto/budget` e ela carrega normalmente.

### CT-02 — Novas URLs funcionam autenticado
- **Dado** que estou autenticado,
- **Quando** acesso diretamente `/pluto/budget`, `/pluto/months` e `/pluto/transactions`,
- **Então** cada página carrega com seus dados habituais (orçamento anual, grid de meses, lançamentos do mês aberto).

### CT-03 — Quebra limpa das URLs antigas
- **Dado** que estou autenticado,
- **Quando** acesso diretamente `/finance/budget` (ou `/finance/months`, `/finance/transactions`),
- **Então** NÃO há redirecionamento nem página — retorno 404 (sem redirect, conforme spec).

### CT-04 — Navegação interna entre telas do módulo
- **Dado** que estou em qualquer uma das três telas do módulo,
- **Quando** uso as abas superiores ("Orçamento Anual", "Meses e Períodos", "Lançamentos"),
- **Então** a navegação ocorre entre `/pluto/budget`, `/pluto/months` e `/pluto/transactions`, com a aba ativa destacada.

### CT-05 — Regressão de orçamento
- **Dado** um ano com categorias previstas,
- **Quando** abro `/pluto/budget` e edito uma previsão criando ajuste a partir do mês corrente,
- **Então** o comportamento é idêntico ao atual: valores aplicam-se do mês em diante, meses anteriores intactos.

### CT-06 — Regressão de meses
- **Dado** um ano visível em `/pluto/months`,
- **Quando** abro um mês não iniciado e depois o encerro,
- **Então** badges/métricas e ações comportam-se como antes (Aberto → Encerrado, travando edição).

### CT-07 — Regressão de lançamentos e checklist
- **Dado** um mês Aberto,
- **Quando** crio, edito e excluo uma transação; marco/desmarco um item do checklist; tento gravar item que estoura o orçamento da categoria,
- **Então** tudo funciona como antes: extrato atualiza, saldo do mês recalcula, modal de estouro bloqueia e orienta o ajuste.

### CT-08 — Fluxo SDD multi-módulo (tooling)
- **Dado** o repositório pós-migração em branch de feature,
- **Quando** executo `node .agents/scripts/sdd.js start 01-orcamento`,
- **Então** o CLI encontra o plano em `.agents/pluto/plans/`, valida a spec em `.agents/pluto/specs/` e lê o status "Concluído" do `.agents/pluto/backlog.md`, terminando com sucesso (exit 0).
