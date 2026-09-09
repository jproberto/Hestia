# Reavaliação de Arquitetura e Débitos Técnicos — Héstia

**Data:** 2026-09-09
**Origem:** Verificação pós-refatoração (tasks 27–40 concluídas)
**Relatório anterior:** `2026-09-08-technical-debt-assessment.md`
**Log de execução:** `2026-09-08-technical-debt-assessment-log.md`
**Método:** inspeção direta do código (imports, chamadores, barrels, testes, docs, gerador), suíte verde como baseline (51 arquivos / 371 testes)
**Status:** **Aberto** — itens propostos como backlog estrutural (IDs 41+)

---

## 1. Sumário Executivo

| Dimensão | Nota (0–10) | Variação vs 08/09 | Comentário |
|---|---|---|---|
| Estrutura Modular | 9 | = | Padrão `<camada>/<modulo>/` íntegro e provado |
| Arquitetura (Camadas) | **5** | **-3** | Três camadas mortas; dois caminhos concorrentes de acesso a dados |
| SOLID / YAGNI | 6 | -2 | YAGNI violado pelo código morto; DI ok onde é usado |
| Qualidade de Código | 8 | +1 | God components principais eliminados; restam 3 médios |
| Testes / Confiabilidade | 9 | +1 | 371 testes verdes + contratos + stories com build verificado |
| Framework SDD (Olympus) | 7 | -2 | Processo ok, mas docs-guia desatualizadas para as novas camadas |
| Prontidão p/ Novos Módulos | **6** | -3 | Gerador desatualizado; agente novo não sabe qual camada usar |

**Veredito:** a base está **sólida para expandir, com uma condição**: antes de criar o próximo módulo, resolver os itens **ALTOS** abaixo (estimativa: 1 ciclo curto). Sem isso, novos módulos vão nascer fora do padrão ou o padrão vai apodrecer — nos dois casos, o "emaranhado" volta pela porta dos fundos.

---

## 2. O Que Foi Genuinamente Consolidado (manter)

- Decomposição da TransactionsPage (1323 → 192 linhas) em hooks testados e componentes presentacionais com testes.
- `IDatabaseClient` + adapter + `db/*` como porta mockável; fakes em memória; contratos compartilhados por repositório.
- `types.ts` como fonte única; `BudgetLikeItem` como shape mínimo honesto.
- Testes de página com factories de mock com defaults; `clickConnectedButton` documentado.
- Storybook 10 com 12 stories e build verificado; `storybook-static/` fora do lint e do git.
- `tsc` 0 erros, `lint` 0 erros, suite 100% verde.

---

## 3. Débitos Restantes

### 3.1 [ALTO] **ARC-001** — Camada morta: use-cases + factories de services + schemas + mappers
**Localização:** `lib/pluto/use-cases/` (14 arquivos), `lib/pluto/services/*.ts` (funções `createXService`), `lib/pluto/schemas/` (7 arquivos), `lib/pluto/mappers.ts`
**Evidência:**
- Nenhum chamador em produção das factories (`createTransactionService` etc.) nem dos use-cases — grep retorna só definições.
- `schemas/` e `mappers.ts` são importados **exclusivamente** pelos services; `mappers.ts` não é importado por ninguém.
- **Zero testes** cobrem use-cases, schemas, mappers e factories.
- Consequência direta: a validação runtime Zod (headline da task 34) **nunca executa no caminho real** — pages e hooks chamam repositórios diretamente.
**Impacto:** código que apodrece (já apodreceu 1x: `created_by` ausente no schema, `params` não usado), confunde agentes ("qual camada eu uso?") e dobra a superfície de manutenção sem benefício.
**Solução (escolher UMA, sem meio-termo):**
- **Opção A (recomendada, YAGNI): remover** `use-cases/`, `mappers.ts`, factories `createXService` e schemas não utilizados; manter validação Zod **apenas** onde há boundary real (forms → services), se/quando services voltarem a ser usados.
- **Opção B (religar):** pages/hooks passam a chamar services (que validam via Zod e delegam a use-cases); repositórios deixam de ser importados por UI. Exige reescrever testes de página (mocks mudam de `db/*` para services) — custo alto, benefício discutível para app pessoal.
**Critério de aceite:** ou bem `grep use-cases` retorna chamadores reais + testes, ou bem os diretórios somem do repo. Estado intermediário é proibido.

---

### 3.2 [ALTO] **DOC-001** — AGENTS.md e skills não descrevem as camadas atuais
**Localização:** `AGENTS.md`, `.agents/skills/sdd-02-plan/`, `.agents/skills/sdd-03-implement/`
**Evidência:** AGENTS.md documenta só `<camada>/<modulo>/`; nenhuma menção a `repositories/`, `IDatabaseClient`, fakes, contratos, `schemas/`, stories ou às regras (ex.: "UI importa de `db/*`; nunca de `repositories/*` diretamente"? ou o contrário — **a decisão sequer está registrada**). A skill de plano não orienta qual camada criar.
**Impacto:** é exatamente assim que nasce spaghetti multi-agente: cada executor improvisa sua camada. O Guardian garante a ordem das fases, mas não a coerência arquitetural.
**Solução:** seção "Mapa de Camadas" no AGENTS.md (diagrama ASCII + tabela camada→responsabilidade→importa-de→testado-com) + 1 parágrafo na sdd-02-plan exigindo declarar as camadas tocadas. Atualizar junto o `module-template.md` se divergir.
**Critério de aceite:** um agente novo, lendo só AGENTS.md, acerta de primeira onde pôr um repository, um hook, um schema e um teste.

---

### 3.3 [ALTO] **DX-001** — Gerador de módulos congelado na arquitetura antiga
**Localização:** `.agents/scripts/new-module.js`, `.agents/module-template.md`
**Evidência:** o gerador (escrito antes das tasks 30–38) não scaffolda `use-cases/`, `fakes/`, `*.stories.*`, contract tests nem registra os padrões novos (grep por esses termos retorna vazio, exceto `types.ts`).
**Impacto:** o próximo módulo nasce **fora do padrão** — exatamente o retrabalho que o gerador deveria evitar. O "alicerce reaproveitável" hoje é copiado à mão.
**Solução:** estender o gerador (e o template) com: `repositories/` + `I*Repository`, `fakes/` + factory, `hooks/`, `schemas/`, 1 story de exemplo, 1 contract de exemplo, `index.ts` com exports explícitos; **após** decidir ARC-001 (não faz sentido scaffoldar camada que será removida).
**Critério de aceite:** `node new-module.js <modulo>` gera estrutura que compila, testa (fakes) e documenta (story) sem edição manual além do domínio.

---

### 3.4 [ALTO] **PRC-001** — Backlog central sem os itens 27–40
**Localização:** `.agents/backlog.md` (só contém o item 26)
**Evidência:** 14 tasks executadas e marcadas ✅ apenas no `-log`; a tabela estrutural central nunca as recebeu — violação da regra 2 do AGENTS.md ("Controle pelo Backlog Central").
**Impacto:** rastreabilidade quebrada; histórico do projeto conta só metade da história; futuros `guardian`/`start` não encontram os planos.
**Solução:** registrar 27–40 como `Concluído` (com links para specs/planos/logs onde existirem) e abrir 41+ deste relatório como pendentes.
**Critério de aceite:** `backlog.md` reflete o estado real do repo.

---

### 3.5 [ALTO] **ARC-002** — Duplo fetchData no mount (churn real + flakiness)
**Localização:** `lib/pluto/hooks/usePlutoData.ts` (seleção ano/mês → `fetchData` muda de identidade → effect re-executa)
**Evidência:** testes mostram `getAccounts` chamado 2x por mount; nós do DOM substituídos entre commits (findBy resolve nó destacado; `clickConnectedButton` existe como workaround); `loading` alterna e desmonta/remonta o grid.
**Impacto:** em produção: 2x leituras no Supabase a cada abertura de página + risco de clique perdido em rede lenta. Em testes: fragilidade estrutural mascarada por workaround.
**Solução:** estabilizar a seleção antes do fetch (ex.: resolver ano/mês a partir de `allOpen` em memória no primeiro fetch, sem segundo ciclo) ou single-flight com cancelamento real (AbortController) em vez de flag `cancelled` que não cancela a rede.
**Critério de aceite:** 1 fetch por mount em cenário estável (assert em teste) + remoção do workaround ou sua justificativa registrada.

---

### 3.6 [MÉDIO] **GOD-001** — God components restantes
| Arquivo | Linhas | Alvo |
|---|---|---|
| `app/pluto/budget/page.tsx` | 478 | hooks + seções (mesmo playbook 27–29) |
| `app/pluto/months/page.tsx` | 223 | hooks + grid |
| `components/pluto/ChecklistCard.tsx` | 216 | <150 (extrair lista/ordenção p/ hook — sobra do plano original) |
**Critério de aceite:** mesmos gates das Fases 1–3 (testes por unidade extraída, sem mudança visual).

---

### 3.7 [MÉDIO] **ARC-003** — Proliferação de clients Supabase
**Evidência:** 15+ call sites de `createBrowserDatabaseClient()` (cada standalone de service, cada hook de repositório, cada page) — cada um instancia um GoTrue client.
**Solução:** singleton memoizado por aba (ex.: `getBrowserDatabaseClient()` com cache) ou client único via context/MascotProvider-like; callers continuam recebendo `IDatabaseClient`.
**Critério de aceite:** 1 instância por sessão + testes inalterados.

---

### 3.8 [MÉDIO] **ARC-004** — Barrel `lib/pluto/index.ts` obsoleto + 3 estilos de import
**Evidência:** alega ser "único ponto de entrada" mas pages usam `db/*`, hooks usam `services/*`, services usam `repositories/*`; não exporta 7 dos 13 hooks; conflitos resolvidos à mão com comentário frágil (`adjustBudgetItem` existe em dois lugares com assinaturas diferentes).
**Solução:** decidir e documentar (ver DOC-001) UM caminho recomendado por consumidor (ex.: UI → `db/*` + `hooks/*`; domínio → `repositories/*`); podar o index ao que é público de verdade ou regenerá-lo completo.
**Critério de aceite:** zero ambiguidade documentada + nenhum import fora do caminho recomendado.

---

### 3.9 [MÉDIO] **TYP-001** — `getUserEmail()` dentro de `IDatabaseClient`
**Evidência:** `lib/shared/database.ts` mistura auth na abstração de dados porque as pages precisavam de email.
**Solução:** aceitar documentado como "porta de sessão do app cliente" OU separar `IAuthSession` injetada à parte. Baixo custo de qualquer jeito; o problema é estar implícito.
**Critério de aceite:** decisão registrada em DOC-001.

---

### 3.10 [MÉDIO] **TST-001** — Infra de testes com duplicação e restos
- Factory mock de `supabaseClient` copiada em **7 arquivos** de teste → centralizar no `__tests__/setup.ts`.
- `Mock` importado como valor em ~15 arquivos (`import { ..., Mock }`) → `import type`.
- `@testing-library/user-event` instalado e **sem nenhum uso** (migrei para fireEvent) → remover dep ou adotar de verdade.
- `checklist-budget.ts` aceita objetos parciais (`ChecklistItemWithAmount`) — foi o que permitiu fixtures inválidas por tanto tempo; estreitar para `ChecklistItem[]`/`BudgetLikeItem[]` (quebra testes antigos de propósito: fixtures devem ser completas).
- `hooks/index.ts` exporta 6 de 13 hooks.
- `addon-mcp` no Storybook sem uso declarado → remover se não houver plano.

---

### 3.11 [MÉDIO] **TYP-002** — `as unknown as` (14x) e retornos sem `category_name`
**Evidência:** concentrados na fronteira Supabase (aceitável), exceto `checklist.ts` (3x) que afirma `ChecklistItem` sobre linhas **sem** `category_name` — divergência real entre tipo e runtime, hoje mascarada por cast.
**Solução:** enriquecer no repositório (join como nas listagens) ou afrouxar o tipo com honestidade (`category_name?: string` + fallback no consumo).
**Critério de aceite:** nenhum cast escondendo campo obrigatório ausente.

---

### 3.12 [BAIXO] — Diversos
- 48 warnings de lint (pré-existentes: `<img>` vs `<Image />`, unused em testes antigos).
- `BudgetOverflowResult.categoryType?` opcional no tipo, obrigatório no uso — alinhar.
- RLS/policies do Supabase **não auditadas** neste ciclo (sem acesso ao banco) — registrar verificação pendente antes de expor qualquer rota server-side nova.

---

## 4. Prontidão Para Novos Módulos (matriz)

| Requisito | Estado | Falta |
|---|---|---|
| Estrutura de pastas padrão | ✅ | — |
| Layouts/UI kit compartilhados | ✅ | — |
| `IDatabaseClient` + fakes + contratos | ✅ | decidir ARC-001 antes de replicar |
| Gerador cria tudo sozinho | ❌ | DX-001 |
| Agente sabe onde pôr cada coisa | ❌ | DOC-001 |
| Backlog rastreia o trabalho | ❌ | PRC-001 |
| Testes de página sem flakiness estrutural | 🟡 | ARC-002 |

**Leitura:** dá para criar o próximo módulo **hoje** copiando Pluto à mão com qualidade — mas o caminho "fácil e certo" (gerador + docs) ainda não existe. É exatamente o que separa "base sólida" de "base sólida que escala com agentes".

---

## 5. Plano Sugerido (backlog 41+)

| ID | Item | Severidade | Depende de |
|---|---|---|---|
| 41 | Decidir destino da camada morta (remover × religar) e executar | Alto | — |
| 42 | Mapa de Camadas no AGENTS.md + skills | Alto | 41 |
| 43 | Atualizar gerador + module-template | Alto | 41, 42 |
| 44 | Registrar 27–40 e abrir 41+ no backlog central | Alto | — |
| 45 | Single-flight do fetch inicial (fim do churn) | Alto | — |
| 46 | Decompor budget/months pages + ChecklistCard<150 | Médio | 42 |
| 47 | Singleton de client + unificar caminho de imports | Médio | 42 |
| 48 | Separar/documentar auth na porta de dados | Médio | 42 |
| 49 | Higiene de testes (setup central, type Mock, user-event, items) | Médio | — |
| 50 | Honestidade de tipos (casts, category_name, categoryType) | Médio | — |

---

## 6. Notas de Método (para o documento de arquitetura futuro)

- A evidência que sustenta este relatório é reproduzível: `grep` por chamadores (não por definições), suíte verde como baseline, `git status` sem deleções, medição de linhas.
- Anti-padrão detectado e evitado: validar camada pela existência de arquivos em vez de por chamadores e testes. Arquivo sem chamador nem teste é passivo, não ativo.
- Workarounds de teste (`clickConnectedButton`, settles) são sintomas: registrar a causa-raiz (ARC-002) em vez de normalizar o workaround.
