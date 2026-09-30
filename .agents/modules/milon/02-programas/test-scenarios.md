# Cenários de Homologação — Mílon #2: Programas

Portão manual da feature (`SPEC_APPROVED` → `APPROVED`). Derivado exclusivamente de
`spec.md` §5 (Critérios de Aceite — 22 itens) + `tasks.json` (acceptanceCriteria) +
`plan.md` (contratos). Cenário por critério, na mesma ordem da spec.

- **Execução:** subir o app (`npm run dev`), logar e abrir `/milon/programs`.
- **Referência de teste:** cada cenário aponta o teste automatizado que o exercita
  (suíte `npm test`, 647 testes, 0 falhas).
- **Status:** os testes automatizados estão verdes; a coluna "Homologado" fica para
  o humano marcar ao executar (gate `approve-review`).
- **Patch v3 (TASK-020):** a seção "Patch v3 — Navegação em abas (CA-P3-01…12)"
  ao final do arquivo acrescenta os cenários Dado/Quando/Então da navegação em
  abas — os 22 cenários do ciclo v1 acima permanecem intactos.
- **Patch v4 (TASK-028):** a seção "Patch v4 — Origem de mensagem, detalhe e
  navegação (CA-P3-13…20)" ao final do arquivo acrescenta os cenários
  Dado/Quando/Então do patch de origem de mensagem, rota de detalhe e navegação
  pós-salvar — os 34 cenários anteriores (22 v1 + 12 do Patch v3) permanecem
  intactos.
- **Reexecução manual (2026-09-30):** feedback do humano aplicado a este arquivo
  — **só** títulos/prefixos, a seção de checklist e notas; **nenhum texto
  Dado/Quando/Então foi alterado**. Contagem resultante: **35 executáveis · 5
  bloqueados · 2 não testáveis manualmente** (detalhe no checklist abaixo).
- **Patch v5 (em análise):** correção do **defeito do Cenário 5** (banner de erro
  substitui a lista) com **estados centralizados** — banner acima + lista
  visível, no padrão do Pluto.

---

## Checklist de homologação manual (reexecução 2026-09-30)

Reclassificação dos **42 cenários** para a reexecução manual pedida em 2026-09-30
("os cenários ainda contemplam coisas que eu não consigo testar ainda"). Quatro
buckets na origem: **EXECUTÁVEL_AGORA** (roda já, sem nada aplicar),
**PRÉ-CONDIÇÃO** (roda assim que a migração 0008 for aplicada — não é bloqueio de
feature), **BLOQUEADO** (não roda nesta feature; liberador registrado em
`.agents/modules/milon/backlog.md` → "Regra — cenários de teste bloqueados por
dependência") e **NÃO TESTÁVEL MANUALMENTE** (bucket criado nesta reexecução: a
indução da falha derruba a sessão/app inteiro — ver (iv)). **Nenhum texto
Dado/Quando/Então foi alterado**; apenas títulos/prefixos e notas — cenários
inteiramente bloqueados com `[BLOQUEADO — #N]`, sub-bloco de ativação bloqueado
com `[BLOQUEADO-PARCIAL — #N]` e não testáveis manualmente com
`[NÃO TESTÁVEL MANUAL]`.

**Atualização 2026-09-30 (migração):** o humano **aplicou** a migração
`utils/migrations/migration-0008-milon-programs.sql` no Supabase — a
pré-condição de ambiente do bucket **PRÉ-CONDIÇÃO** está **SATISFEITA** e os seus
**24 cenários** passaram a **EXECUTÁVEIS** (seções (ii) e (iii) unidas numa tabela
só; cada linha liberada carrega a nota **"migração aplicada 2026-09-30"** na
coluna Ressalva).

**Atualização 2026-09-30 (feedback da reexecução):** o humano executou a
reexecução e devolveu o veredito por cenário. Os ajustes abaixo foram aplicados
apenas em títulos/prefixos, nesta seção e em notas:

- **Cenário 5 — executado com DEFEITO confirmado:** o banner de erro está
  **substituindo** a lista (`ProgramList.tsx:90`, ternário); o padrão do projeto
  é banner **acima** com a lista visível (Pluto `transactions/page.tsx:89`).
  Correção em análise no **Patch v5** (estados centralizados). O cenário em si
  (mensagem de guarda visível) foi executado → **executado com defeito**.
- **Cenários 9 e 11 — parcialmente bloqueados [`BLOQUEADO-PARCIAL — #3`]:** só o
  sub-bloco de **ativação** é bloqueado; **o resto foi executável**.
- **Cenário 13 — BLOQUEADO [`BLOQUEADO — #3`]:** sai dos executáveis para o
  bucket de bloqueados — exige ativação com conteúdo real e o ciclo de vida com
  status `ativo`/`inativo` só nasce na **#3**.
- **Cenários 19 e 20 — NÃO TESTÁVEIS MANUALMENTE:** a falha de rede derruba a
  **sessão/app inteiro** e não isola o estado de erro da lista → saem dos
  executáveis. **Dispensados** do teste manual: cobertos pelos testes
  automatizados (**CA-P3-15/P3-16** e afins); **gap de testabilidade manual
  registrado para backlog**.
- **Cenários 14 e 22 — executados, redundantes:** dispensados de reexecução
  separada (14 redundante com o 9; 22 redundante com outros).
- **Cenário 15 — executado com nota:** exibe **email** porque não existe campo de
  nome/apelido no produto (grep confirmou: só `getUserEmail()`) — pendência de
  produto registrada no backlog.

**Contagem: 35 executáveis · 5 bloqueados · 2 não testáveis manualmente
(+7 blocos parciais pós-ativação).**

### Status geral da reexecução 2026-09-30

| Situação | Cenários | Qtd |
|---|---|---|
| ✅ **Executados** (sem ressalva no feedback) | 1–4, 10, 16–18, 21, 23–42 | 29 |
| ⚠️ **Executados com defeito** (banner de erro substitui a lista → Patch v5) | 5 | 1 |
| ⚠️ **Executados parcialmente** — só o sub-bloco de ativação `[BLOQUEADO-PARCIAL — #3]` | 9, 11 | 2 |
| ℹ️ **Executados com nota** (redundância / pendência de produto — sem reexecução separada) | 14, 15, 22 | 3 |
| ⛔ **Bloqueados** `[BLOQUEADO — #3]` (não rodam nesta feature) | 6, 7, 8, 12, 13 | 5 |
| 🚫 **Não testáveis manualmente** (`[NÃO TESTÁVEL MANUAL]` — dispensados; cobertos por automatizados) | 19, 20 | 2 |
| **Total** | | **42** |

- **Humano ainda precisa rodar:** **nada restou** desta reexecução — os 35
  executáveis foram cobertos. Reexecuções futuras: **Cenário 5** após o fix do
  **Patch v5**; sub-bloco de ativação de **5, 9, 10, 11, 17, 22, 25** e os
  **5 bloqueados (6, 7, 8, 12, 13)** quando a **feature #3** liberar.
- **Já executados:** 35 (29 sem ressalva + **5** com defeito + **9, 11**
  parciais + **14, 15, 22** com nota).
- **Bloqueados:** 5 (`6, 7, 8, 12, 13`) + 7 sub-blocos parciais pós-ativação.
- **Dispensados:** 2 (`19, 20` — não testáveis manualmente; CA-P3-15/16 e afins
  cobrem o comportamento nos automatizados) + reexecução separada de `14` e `22`
  (redundantes).

### (i) Pré-condições ANTES de qualquer execução

1. **✅ Migração `utils/migrations/migration-0008-milon-programs.sql` APLICADA em
   2026-09-30 pelo humano** — pré-condição **SATISFEITA**. Sem ela não existia a
   tabela `public.programs`: a tela de Programas abria em **erro de carregamento**
   (banner + "Tentar novamente") e toda criação/edição/ativação/exclusão falhava;
   com ela aplicada, a tela carrega e as operações gravam no banco. É
   pré-condição de ambiente, **não** bloqueio de feature. O achado #5 do backlog
   (`executed_by` hardcoded no script) segue registrado como achado histórico;
   scripts futuros seguem auditados em `public.schema_migrations` pelo nome do
   arquivo (nunca editar nem renomear migração já aplicada).
2. Branch `feature/milon/02-programas`, dependências instaladas e **dev server**
   em pé (`npm run dev`).
3. Login de **dois** membros do casal (Cenários 10 e 22 pedem o outro login).
4. DevTools → Network → **Offline** para induzir as falhas dos Cenários 36, 37 e
   38 (sem isso essas falhas não acontecem sozinhas). **Cenários 19 e 20 saíram
   desta lista** — a indução derruba a sessão/app inteiro e por isso são
   **NÃO TESTÁVEIS MANUALMENTE** (ver (iv)).
5. **Nota — bug em investigação:** card Mílon em branco no dashboard (causa não
   confirmada). Os Cenários 23, 30, 31 e 32 passam por lá: **executar normalmente**
   e registrar a ocorrência do bug em anexo, sem travar a homologação.

### (ii) EXECUTÁVEL — 35 cenários (14 já executáveis + 24 liberados pela migração 0008 − 3 removidos na reexecução)

Tabela única dos cenários que **rodam nesta reexecução**. Os 24 que estavam no
bucket **PRÉ-CONDIÇÃO** foram para cá com a aplicação de
`migration-0008-milon-programs.sql` em **2026-09-30 (humano)** e cada um deles
carrega a nota **"migração aplicada 2026-09-30"** na coluna **Ressalva**; nas
demais linhas essa coluna traz o **sub-bloco** que continua bloqueado mesmo depois
da migração (feature #3), o modo de induzir a falha ou a nota da reexecução — ver
também "Observações". **Removidos da tabela na reexecução 2026-09-30:** Cenário
**13** (→ bloqueado, `BLOQUEADO — #3`) e Cenários **19** e **20** (→ não
testáveis manualmente, seção (iv)).

| # | Cenário | Título | Seção | Ressalva |
|---|---|---|---|---|
| 1 | Cenário 1 | Tela vazia orienta a criar o primeiro | v1 | **migração aplicada 2026-09-30** |
| 2 | Cenário 2 | Sugestão pré-preenchida no formulário de criação | v1 | — |
| 3 | Cenário 3 | Título apagado na criação é bloqueado | v1 | — |
| 4 | Cenário 4 | Título esvaziado na edição é bloqueado | v1 | **migração aplicada 2026-09-30** |
| 5 | Cenário 5 | Guarda de ativação nasce bloqueada com mensagem | v1 | **migração aplicada 2026-09-30** · **EXECUTADO COM DEFEITO** — banner de erro substitui a lista (`ProgramList.tsx:90`); correção em análise no **Patch v5** (estados centralizados) · só o **1º** Dado/Quando/Então (bloqueio); o **2º** (guarda liberada) é BLOQUEADO #3 |
| 6 | Cenário 9 | **[BLOQUEADO-PARCIAL — #3]** Rascunho e ativo são editáveis | v1 | **migração aplicada 2026-09-30** · **executado parcialmente**: só o sub-bloco de ativação (parte "ativo") BLOQUEADO #3; o resto foi executável |
| 7 | Cenário 10 | Qualquer um do casal mexe no Programa do outro | v1 | **migração aplicada 2026-09-30** · editar/excluir rascunho do outro ok; ativar/reativar BLOQUEADO #3 |
| 8 | Cenário 11 | **[BLOQUEADO-PARCIAL — #3]** Confirmação explícita antes de ativar/reativar/excluir | v1 | **migração aplicada 2026-09-30** · **executado parcialmente**: abrir modal + cancelar ok em todos; só **confirmar** ativar/reativar BLOQUEADO #3 (confirmar exclusão ok) |
| 9 | Cenário 14 | Exclusão de rascunho com confirmação | v1 | **migração aplicada 2026-09-30** · **redundante com o Cenário 9** — não requer reexecução separada |
| 10 | Cenário 15 | Padrão de abertura da tela | v1 | **migração aplicada 2026-09-30** · exibe o **email** do usuário porque não existe campo de nome/apelido no produto (grep: só `getUserEmail()`) — pendência de produto no backlog |
| 11 | Cenário 16 | Filtros refinam e ampliam a lista | v1 | **migração aplicada 2026-09-30** · com dados reais só há status `rascunho` até a #3 |
| 12 | Cenário 17 | Ordenação por data de criação é estável | v1 | **migração aplicada 2026-09-30** · 2º Dado/Quando/Então ("reativar não move para o topo") BLOQUEADO #3 |
| 13 | Cenário 18 | Identificação do item sem abrir o Programa | v1 | **migração aplicada 2026-09-30** · badge de status observável só para `rascunho` |
| 14 | Cenário 21 | Material de sugestões validado antes de entrar no produto | v1 | — |
| 15 | Cenário 22 | Lista única da família com logins individuais | v1 | **migração aplicada 2026-09-30** · **redundante** — não requer reexecução separada · editar/excluir ok; ativar BLOQUEADO #3 |
| 16 | Cenário 23 | Raiz do módulo redireciona para Programas (CA-P3-01) | Patch v3 | — |
| 17 | Cenário 24 | Biblioteca em rota explícita, mesmo conteúdo (CA-P3-02) | Patch v3 | — |
| 18 | Cenário 25 | Tela de Programas permanece idêntica (CA-P3-03) | Patch v3 | **migração aplicada 2026-09-30** · transições de ativação BLOQUEADO #3 |
| 19 | Cenário 26 | Barra do módulo tem exatamente duas abas com rotas exatas (CA-P3-04) | Patch v3 | — |
| 20 | Cenário 27 | Exatamente uma aba ativa em cada tela (CA-P3-05) | Patch v3 | — |
| 21 | Cenário 28 | URL direta ou refresh chega com a aba já correta (CA-P3-06) | Patch v3 | — |
| 22 | Cenário 29 | Pluto ganha destaque de aba ativa pela mesma regra (CA-P3-07) | Patch v3 | — |
| 23 | Cenário 30 | Cards do dashboard com as redações exatas (CA-P3-08) | Patch v3 | — |
| 24 | Cenário 31 | Atalhos do dashboard continuam com destino original (CA-P3-09) | Patch v3 | — |
| 25 | Cenário 32 | Textos antigos do dashboard não existem mais (CA-P3-10) | Patch v3 | — |
| 26 | Cenário 33 | Alternar abas permanece dentro do módulo (CA-P3-11) | Patch v3 | — |
| 27 | Cenário 34 | Suíte completa verde com coverage ≥ 80% (CA-P3-12) | Patch v3 | — |
| 28 | Cenário 35 | Bloqueio de domínio fecha a confirmação e não oferece retry (CA-P3-13) | Patch v4 | **migração aplicada 2026-09-30** · **não** é bloqueio de feature — é justamente a guarda que a #2 entrega |
| 29 | Cenário 36 | Falha de operação fecha a confirmação e preserva o estado (CA-P3-14) | Patch v4 | **migração aplicada 2026-09-30** · terminal em **exclusão** (Offline); ativar/reativar BLOQUEADO #3 |
| 30 | Cenário 37 | Erro de carga é a única origem com "Tentar novamente" (CA-P3-15) | Patch v4 | **migração aplicada 2026-09-30** · induzir com DevTools Offline |
| 31 | Cenário 38 | Mensagem legível — o cenário 5 da homologação fica resolvido (CA-P3-16) | Patch v4 | **migração aplicada 2026-09-30** · terminal de bloqueio (guarda) ou de exclusão |
| 32 | Cenário 39 | Detalhe do programa com cabeçalho completo; id desconhecido explicado (CA-P3-17) | Patch v4 | **migração aplicada 2026-09-30** · id real exige programa criado |
| 33 | Cenário 40 | Criação salva navega ao detalhe do programa novo (CA-P3-18) | Patch v4 | **migração aplicada 2026-09-30** · grava no banco |
| 34 | Cenário 41 | Edição salva permanece na lista (CA-P3-19) | Patch v4 | **migração aplicada 2026-09-30** · grava no banco |
| 35 | Cenário 42 | Detalhe sem placeholder de treinos (CA-P3-20) | Patch v4 | **migração aplicada 2026-09-30** · estado "com programa" exige programa criado |

Observações para rodar agora:

- **Cenário 5 (reexecução):** executado com **DEFEITO confirmado** — o banner de
  erro **substitui** a lista (`ProgramList.tsx:90`, ternário); o padrão do projeto
  é banner **acima** com a lista visível (Pluto `transactions/page.tsx:89`).
  Correção em análise no **Patch v5** (estados centralizados); reexecutar o
  cenário após o fix.
- **Cenários 9 e 11 (reexecução):** executados **parcialmente** — prefixo
  `[BLOQUEADO-PARCIAL — #3]`; só o sub-bloco de ativação ficou pendente.
- **Cenários 14 e 22 (reexecução):** executados e **redundantes** (14 com o 9;
  22 com outros) — dispensam reexecução separada.
- **Cenário 15:** exibe o **email** do usuário porque o produto **não** tem campo
  de nome/apelido (grep confirmou: só `getUserEmail()`) — pendência de produto
  registrada no backlog.
- **Cenários 2 e 3:** o botão "Novo programa" fica **fora** de `ProgramList`
  (sempre visível) e a validação de título é local (bloqueia antes do
  repository) — o modal valida sem depender do carregamento da lista (com a
  migração aplicada em 2026-09-30 o fundo da tela carrega normalmente).
- **Cenário 21:** gate documental — conferir `tasks.json` TASK-003 (`completed`,
  assignee `humano`) + o material em `lib/milon/` (não toca banco).
- **Cenário 33 (CA-P3-11):** a parte de **histórico do navegador / botão voltar**
  na alternância de abas **não exercitável em jsdom** — é exatamente o que só o
  navegador faz; executar clicando nas abas e apertando "voltar" (apontamento do
  Argos).
- **Cenário 24:** depende da tabela da **feature #1** (`public.exercises`,
  migração 0007 já aplicada) — independe da 0008.
- **Cenário 34:** rodar `npm test` (sem banco — a suíte usa fakes) e conferir
  `test-report.json` (`failed = 0`, `coverage ≥ 80`). Referência atual do
  arquivo: **706/706, coverage 85,32%**.

### (iii) PRÉ-CONDIÇÃO — absorvido por (ii)

Os **24 cenários** deste bucket foram movidos para a tabela de executáveis em
**2026-09-30**, quando o humano aplicou
`utils/migrations/migration-0008-milon-programs.sql` no Supabase (linhas
marcadas com **"migração aplicada 2026-09-30"**). Nenhum deles depende de feature
futura; a coluna "Ressalva" continua marcando o **sub-bloco** repassado à
feature #3.

### (iv) NÃO TESTÁVEIS MANUALMENTE — 2 cenários (dispensados nesta reexecução)

Bucket criado no feedback da reexecução 2026-09-30: os dois cenários pediam
indução de **falha de rede**, mas no app real a falha de rede derruba a
**sessão/app inteiro** (Supabase auth + fetch morrem juntos) — **não isola o
estado de erro da lista** que os cenários querem observar. Saíram da tabela de
executáveis; **não** são bloqueio de feature e **não** precisam ser rodados
manualmente.

| # | Cenário | Título | Seção | Motivo / cobertura |
|---|---|---|---|---|
| 1 | Cenário 19 | [NÃO TESTÁVEL MANUAL] Falha de carregamento tem "tentar de novo" | v1 | falha de rede derruba a sessão/app inteiro; **coberto pelos testes automatizados (CA-P3-15/16 e afins)** — gap de testabilidade manual registrado no backlog |
| 2 | Cenário 20 | [NÃO TESTÁVEL MANUAL] Falha em ação não muda estado nem fecha telas | v1 | idem — a falha não isola o estado de erro da lista; **coberto pelos testes automatizados (CA-P3-15/16 e afins)** — gap de testabilidade manual registrado no backlog |

**Liberador:** melhoria de testabilidade/observabilidade (registro em
`.agents/modules/milon/backlog.md`); enquanto isso, o comportamento é garantido
pela suíte automatizada.

### (v) BLOQUEADOS — 5 cenários (não executar nesta reexecução)

Nenhum roda até a **feature #3 — Treinos + séries planejadas** (registrado em
`.agents/modules/milon/backlog.md` → "Regra — cenários de teste bloqueados por
dependência"). Motivo comum: a UI chama `usePrograms()` **sem opções**
(`app/milon/programs/page.tsx`) → `hasWorkoutWithExercise` fica `false` →
**toda ativação/reativação é bloqueada na tela**; por isso nem o status `ativo`
nem o `inativo` (efeito colateral da ativação) são alcançáveis pela interface.

| # | Cenário | Título | Seção | Liberador |
|---|---|---|---|---|
| 1 | Cenário 6 | [BLOQUEADO — #3] Ativação troca o Programa vigente do dono (efeito colateral: anterior do dono fica inativo) | v1 | **#3** |
| 2 | Cenário 7 | [BLOQUEADO — #3] Reativação devolve a vigência ao Programa antigo | v1 | **#3** |
| 3 | Cenário 8 | [BLOQUEADO — #3] Programa inativo é somente leitura (só reativar) | v1 | **#3** — status `inativo` só nasce como efeito colateral da ativação |
| 4 | Cenário 12 | [BLOQUEADO — #3] Ativo e inativo nunca oferecem "Excluir" (critérios 12 e 14) | v1 | **#3** — precisa de itens `ativo`/`inativo` na lista |
| 5 | Cenário 13 | [BLOQUEADO — #3] Ciclo de vida fechado — só as transições do MVP | v1 | **#3** — **movido dos executáveis na reexecução 2026-09-30**: exige ativação com conteúdo real; o ciclo de vida com status `ativo`/`inativo` só nasce na #3 |

**Blocos parciais bloqueados dentro de cenários que rodam** (a parte
pós-ativação é repassada à feature #3, conforme a regra do backlog):
Cenário 5 (2º Dado/Quando/Então — guarda liberada com
`hasWorkoutWithExercise = true`), Cenário 9 (parte "ativo"), Cenário 10
(ativar/reativar), Cenário 11 (confirmar ativar/reativar), Cenário 17 (2º
Dado/Quando/Então — reativar não move para o topo), Cenário 22 (ativar) e
Cenário 25 (transições de ativação) — **7 blocos** (o do Cenário 13 saiu daqui
quando o cenário inteiro foi reclassificado como bloqueado).

> **O que NÃO é bloqueio:** a **mensagem de guarda** de ativação (Cenário 5,
> 1º bloco) e o **Cenário 35** (bloqueio fecha a confirmação, banner sem retry)
> são plenamente executáveis — a guarda é entregue pela própria feature #2.
> **Porém:** no Cenário 5 a execução de 2026-09-30 confirmou **defeito** (o
> banner de erro **substitui** a lista, `ProgramList.tsx:90` — ver (ii) e o
> cenário), cuja correção está em análise no **Patch v5**.

---

| # | Critério (spec §5) | Automatizado em | Homologado |
|---|---|---|---|
| 1 | Tela vazia → mensagem amigável, sem erro | ver Cenário 1 | ☐ |
| 2 | Sugestão pré-preenchida e re-sorteável | ver Cenário 2 | ☐ |
| 3 | Título vazio na criação → bloqueio + digitado preservado | ver Cenário 3 | ☐ |
| 4 | Título vazio na edição → mesmo bloqueio | ver Cenário 4 | ☐ |
| 5 | Guarda de ativação bloqueia com mensagem; libera com conteúdo | ver Cenário 5 | ☐ |
| 6 | Ativação: anterior do mesmo dono fica inativo (nunca 2 ativos) | ver Cenário 6 | ☐ |
| 7 | Reativação: inativo vira ativo e o anterior fica inativo | ver Cenário 7 | ☐ |
| 8 | Inativo é somente leitura (só reativar) | ver Cenário 8 | ☐ |
| 9 | Rascunho e ativo são editáveis (com bloqueio de título vazio) | ver Cenário 9 | ☐ |
| 10 | Qualquer um transiciona o Programa do outro | ver Cenário 10 | ☐ |
| 11 | Confirmação padrão (título+dono), cancelar não muda nada | ver Cenário 11 | ☐ |
| 12 | Ativo/inativo não oferecem ação de excluir | ver Cenário 12 | ☐ |
| 13 | Excluir rascunho: confirmar some da lista, cancelar preserva | ver Cenário 14 | ☐ |
| 14 | Nenhuma tela tem caminho de exclusão de ativo/inativo | ver Cenário 12 | ☐ |
| 15 | Padrão de abertura: dono próprio, todos os status, mais novo→antigo | ver Cenário 15 | ☐ |
| 16 | Limpar dono vê a família; desmarcar status some os itens | ver Cenário 16 | ☐ |
| 17 | Mais recentes primeiro; reativar não move para o topo | ver Cenário 17 | ☐ |
| 18 | Item identifica título/dono/status + ações permitidas | ver Cenário 18 | ☐ |
| 19 | Falha de carregamento → erro com "tentar de novo" | ver Cenário 19 | ☐ |
| 20 | Falha em ativar/reativar/excluir → erro visível, nada muda | ver Cenário 20 | ☐ |
| 21 | Material de sugestões validado por humano antes de entrar | ver Cenário 21 | ☐ |
| 22 | Outro casal vê e pode mexer no mesmo Programa | ver Cenário 10 + 22 | ☐ |

---

### Cenário 1: Tela vazia orienta a criar o primeiro (critério 1)

**Dado** que não existe nenhum Programa cadastrado
**Quando** a pessoa abre a tela de Programas
**Então** vê mensagem amigável orientando a criar o primeiro Programa, **sem** mensagem de erro nem orientação de filtros

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "estado de fetch: sem programas orienta a criar o primeiro, sem erro"; `__tests__/components/milon/ProgramList.test.tsx` → "empty orienta a criar o primeiro programa, sem erro nem orientação de filtros".

### Cenário 2: Sugestão pré-preenchida no formulário de criação (critério 2)

**Dado** que a pessoa abre o formulário de criação
**Quando** o formulário é exibido
**Então** o campo de título já vem preenchido com uma sugestão sorteada da combinação templates + pools, sem slots residuais `{adj}`/`{substantivo}`/`{complemento}`, e a pessoa pode substituí-la por qualquer texto; ao fechar e abrir de novo, o sorteio pode resultar em outra sugestão

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "criar: abre ProgramModal com suggestion de sortearSugestao e grava via hook"; `__tests__/components/milon/ProgramModal.test.tsx` → "criação pré-preenche o título com a sugestão"; `__tests__/lib/milon/program-utils.test.ts` → "retorna string preenchida, não vazia e sem slots residuais" + "cada sorteio deriva de um template com slots preenchidos pelo pool correspondente".

### Cenário 3: Título apagado na criação é bloqueado (critério 3)

**Dado** o formulário de criação com a sugestão pré-preenchida
**Quando** a pessoa apaga tudo e tenta salvar
**Então** o salvamento é bloqueado com mensagem de título vazio, o formulário permanece aberto e o que foi digitado é preservado

Automatizado: `__tests__/components/milon/ProgramModal.test.tsx` → "título vazio bloqueia o submit com erro visível (validarTitulo) e não fecha o modal" + "título só com espaços em branco também é bloqueado com erro visível"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → "título vazio é bloqueado antes de qualquer chamada ao repository".

### Cenário 4: Título esvaziado na edição é bloqueado (critério 4)

**Dado** um Programa existente em rascunho
**Quando** a pessoa edita o título para vazio (ou só espaços) e tenta salvar
**Então** o salvamento é bloqueado com a mesma mensagem, os dados permanecem e o modal não fecha

Automatizado: `__tests__/components/milon/ProgramModal.test.tsx` → "título vazio bloqueia o submit com erro visível (validarTitulo) e não fecha o modal" (caso edição) + `__tests__/lib/milon/program-utils.test.ts` → "título vazio retorna mensagem de erro" / "título só com espaços retorna mensagem de erro".

### Cenário 5: Guarda de ativação nasce bloqueada com mensagem (critério 5)

**Dado** um Programa em rascunho sem conteúdo (a feature 3 ainda não entregou treinos)
**Quando** a pessoa tenta ativá-lo
**Então** a ação aparece bloqueada com mensagem explicando que é preciso de pelo menos um treino com exercícios, e a ativação **não** acontece (o repository não é chamado)

**Dado** que a existência desse conteúdo é simulada (flag `hasWorkoutWithExercise = true`, futuro da feature 3)
**Quando** a pessoa confirma a ativação
**Então** a mesma guarda libera a ativação e o Programa passa a ativo

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "activate bloqueia com a mensagem exata e não chama o repository" + "reactivate bloqueia com a mensagem exata e não chama o repository" + "guarda também bloqueia quando o pedido vem pelo fluxo de confirmação" + "activate chama repository, desativa o anterior do mesmo dono e preserva o ativo de outro dono"; `__tests__/lib/milon/program-utils.test.ts` → "sem conteúdo (false) retorna mensagem de erro" / "com conteúdo (true) retorna null".

> **Reexecução 2026-09-30 — executado com DEFEITO confirmado:** o banner de erro
> está **substituindo** a lista (`ProgramList.tsx:90`, ternário) — já foi dito
> anteriormente que isso **não segue o padrão do projeto**. Padrão correto: banner
> **acima** com a **lista visível** (referência: Pluto `transactions/page.tsx:89`).
> Correção em análise no **Patch v5** (estados centralizados). O cenário em si
> (mensagem de guarda visível) **foi executado**; o 2º bloco (guarda liberada)
> segue `[BLOQUEADO-PARCIAL — #3]`. **Reexecutar após o fix do Patch v5.**

### Cenário 6: [BLOQUEADO — #3] Ativação troca o Programa vigente do dono (critério 6)

**Dado** um Programa em rascunho do dono A e outro Programa já ativo do mesmo dono A (mais um ativo do dono B)
**Quando** a pessoa confirma a ativação do rascunho de A
**Então** ele passa a ativo, o anterior ativo de A fica inativo automaticamente, o ativo de B permanece ativo e nunca há dois ativos do mesmo dono ao mesmo tempo

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "activate chama repository, desativa o anterior do mesmo dono e preserva o ativo de outro dono"; `__tests__/lib/milon/repositories/contract-programs.test.ts` → "update para 'ativo' desativa o anterior ativo do mesmo dono (outro dono e não-ativos intactos)"; `__tests__/lib/milon/repositories/programs-client.test.ts` → "createProgram 'ativo' desativa o anterior do mesmo dono (outro dono intacto)" + "updateProgram para 'ativo' desativa o anterior do mesmo dono antes de gravar"; `__tests__/lib/milon/program-utils.test.ts` → "desativa apenas o programa ativo do mesmo dono; demais ficam intactos".

### Cenário 7: [BLOQUEADO — #3] Reativação devolve a vigência ao Programa antigo (critério 7)

**Dado** dois Programas do mesmo dono — um ativo e um inativo — com conteúdo mínimo
**Quando** a pessoa reativa o inativo
**Então** ele fica ativo e o Programa que estava ativo fica inativo

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "reactivate chama repository, desativa o anterior do mesmo dono e preserva o ativo de outro dono" + "confirm executa a reativação pendente quando a guarda libera"; `__tests__/lib/milon/repositories/contract-programs.test.ts` → "ativar um programa antigo não altera a ordenação por data de criação".

### Cenário 8: [BLOQUEADO — #3] Programa inativo é somente leitura (critério 8)

**Dado** um Programa inativo na lista
**Quando** a pessoa olha as ações disponíveis dele
**Então** não há como alterar título nem conteúdo — a única ação disponível é **Reativar**

Automatizado: `__tests__/components/milon/ProgramList.test.tsx` → "inativo é somente leitura: única ação é reativar (sem editar nem excluir)"; `__tests__/app/milon/programs/page.test.tsx` → "reativar: inativo é somente leitura e abre ProgramConfirmModal com ação/título/dono".

### Cenário 9: [BLOQUEADO-PARCIAL — #3] Rascunho e ativo são editáveis (critério 9)

**Dado** Programas em rascunho e ativo
**Quando** a pessoa edita o título de cada um
**Então** a edição é permitida nos dois, e em ambos o salvamento com título vazio é bloqueado pela mesma mensagem

Automatizado: `__tests__/components/milon/ProgramList.test.tsx` → "rascunho oferece editar, ativar e excluir" + "ativo oferece somente editar (sem excluir, ativar ou reativar)"; `__tests__/app/milon/programs/page.test.tsx` → "editar: abre ProgramModal com os dados do item e salva com o id"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → "edita pelo id: normaliza o título, manda só o id+título e recarrega".

> **Reexecução 2026-09-30 — PARCIALMENTE BLOQUEADO [`BLOQUEADO-PARCIAL — #3`]:**
> só o sub-bloco de **ativação** (parte "ativo") é bloqueado — **o resto foi
> executável** (edição de rascunho + validação de título vazia).

### Cenário 10: Qualquer um do casal mexe no Programa do outro (critério 10)

**Dado** um Programa pertencente à pessoa B (dono = B) e a pessoa A logada
**Quando** A transiciona (ativa/reativa/exclui) esse Programa
**Então** a transição é permitida — "dono" não restringe nada

Automatizado: `__tests__/lib/milon/repositories/contract-programs.test.ts` → contrato `IProgramRepository` (nenhum teste filtra por sessão; dono é campo de dados, não de permissão) + `__tests__/components/milon/ProgramList.test.tsx` → "lista mista mostra exatamente as ações permitidas por cada status" (ações não variam por sessão). Ver também Cenário 22.

### Cenário 11: [BLOQUEADO-PARCIAL — #3] Confirmação explícita antes de ativar/reativar/excluir (critério 11)

**Dado** um Programa em rascunho
**Quando** a pessoa pede ativação, reativação ou exclusão
**Então** um modal de confirmação no padrão do projeto aparece informando **título** e **dono**; ao **cancelar**, nada muda (nenhuma chamada ao repository); ao **confirmar**, a ação é executada

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "ativar: rascunho abre ProgramConfirmModal com ação/título/dono e só executa na confirmação" + "excluir: só o rascunho tem a ação e abre ProgramConfirmModal com ação/título/dono" + "cancelar a confirmação vinda do hook não executa nada e fecha o modal"; `__tests__/components/milon/ProgramConfirmModal.test.tsx` → describes "rótulo do botão de confirmar por action", "estado processing", "callbacks onConfirm/onCancel", "programa alvo informado"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → "requestConfirm guarda ação+programa sem executar; cancelConfirm descarta".

> **Reexecução 2026-09-30 — PARCIALMENTE BLOQUEADO [`BLOQUEADO-PARCIAL — #3`]:**
> só o sub-bloco de **ativação** é bloqueado (não consigo ativar um programa para
> testar) — **o resto foi executável**: abrir modal + cancelar em todos os casos
> e **confirmar** exclusão.

### Cenário 12: [BLOQUEADO — #3] Ativo e inativo nunca oferecem "Excluir" (critérios 12 e 14)

**Dado** Programas em status ativo e inativo na lista
**Quando** a pessoa procura a ação de excluir
**Então** ela não existe — nenhum botão de excluir para esses itens, em nenhuma tela

Automatizado: `__tests__/components/milon/ProgramList.test.tsx` → "ativo oferece somente editar (sem excluir, ativar ou reativar)" + "inativo é somente leitura: única ação é reativar (sem editar nem excluir)" + "lista mista mostra exatamente as ações permitidas por cada status"; `__tests__/app/milon/programs/page.test.tsx` → "excluir: só o rascunho tem a ação" (assert de 1 único botão Excluir).

### Cenário 13: [BLOQUEADO — #3] Ciclo de vida fechado — só as transições do MVP (apoio ao critério 6/7)

**Dado** um Programa em qualquer status
**Quando** a pessoa consulta as transições possíveis
**Então** `rascunho → ativo`, `inativo → ativo` (reativação) e exclusão apenas em rascunho existem; **não** existem `rascunho → inativo` nem `ativo → rascunho`

Automatizado: `__tests__/lib/milon/program-utils.test.ts` → describe "transicoesPermitidas (spec §3 - ciclo de vida fechado)" (3 casos: rascunho, ativo, inativo).

> **Reexecução 2026-09-30 — TOTALMENTE BLOQUEADO [`BLOQUEADO — #3`]:** saiu da
> lista de executáveis para o bucket de bloqueados (ver (v)) — **exige ativação
> com conteúdo real** e o ciclo de vida com status `ativo`/`inativo` **só nasce
> na feature #3**.

### Cenário 14: Exclusão de rascunho com confirmação (critério 13)

**Dado** um rascunho com confirmação pendente de exclusão
**Quando** a pessoa confirma
**Então** o Programa some da lista

**Dado** a mesma confirmação pendente
**Quando** a pessoa cancela
**Então** o Programa permanece intacto

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "excluir: só o rascunho tem a ação e abre ProgramConfirmModal com ação/título/dono"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → "confirm executa a exclusão pendente e limpa confirmAction" + "remove de rascunho chama repository e some da lista" + "requestConfirm guarda ação+programa sem executar; cancelConfirm descarta"; `__tests__/lib/milon/repositories/programs-client.test.ts` → "deleteProgram remove o registro e propaga erro do banco".

> **Reexecução 2026-09-30 — executado (com nota):** está certo, porém
> **redundante com o Cenário 9 — não requer reexecução separada**.

### Cenário 15: Padrão de abertura da tela (critério 15)

**Dado** que a pessoa abre a tela de Programas com seu login
**Quando** a lista carrega
**Então** o select de Dono vem no próprio usuário logado, os três checks de Status vêm todos marcados e a lista está ordenada do Programa mais novo para o mais antigo por data de criação

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "padrão ao montar: dono = getUserEmail() e todos os status marcados" + "abre em loading, exibe a lista na ordem do repositório e sai do loading sem erro"; `__tests__/components/milon/ProgramList.test.tsx` → "select de dono mostra as ownerOptions, a opção de limpar e reflete selectedOwner" + "renderiza os três checks de status marcados"; `__tests__/lib/milon/repositories/contract-programs.test.ts` → "listAll ordena por created_at desc (mais novo primeiro)".

> **Reexecução 2026-09-30 — executado (com nota):** está ok, mas está exibindo o
> **email** do usuário. **Não existe campo de nome/apelido no produto** (grep
> confirmou: só `getUserEmail()`) — não é defeito de tela; **pendência de produto
> registrada no backlog**.

### Cenário 16: Filtros refinam e ampliam a lista (critério 16)

**Dado** Programas de ambos os donos e nos três status
**Quando** a pessoa limpa o filtro de Dono
**Então** vê a família inteira

**Dado** o mesmo cenário
**Quando** a pessoa desmarca um status
**Então** os Programas daquele status somem da lista (e remarcando voltam; desmarcar tudo não é erro)

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "filtro de dono por igualdade: limpar vê a família inteira e trocar vê o outro dono" + "checks de status por inclusão: desmarcar some, marcar devolve e vazio não é erro"; `__tests__/app/milon/programs/page.test.tsx` → "filtros: select de dono e checks de status refletem no hook".

### Cenário 17: Ordenação por data de criação é estável (critério 17)

**Dado** vários Programas do mesmo dono com status misturados
**Quando** a pessoa consulta com o padrão
**Então** os mais recentes aparecem primeiro mesmo misturando status

**Dado** um Programa antigo inativo reativado
**Quando** a lista recarrega
**Então** ele **não** salta para o topo — a posição continua a da sua data de criação

Automatizado: `__tests__/lib/milon/repositories/contract-programs.test.ts` → "listAll ordena por created_at desc (mais novo primeiro)" + "ativar um programa antigo não altera a ordenação por data de criação"; `__tests__/lib/milon/repositories/programs-client.test.ts` → "listPrograms ordena por created_at desc e converte row → domínio".

### Cenário 18: Identificação do item sem abrir o Programa (critério 18)

**Dado** um Programa na lista
**Quando** a pessoa vê o item
**Então** identifica título, dono e status sem abrir o Programa e vê somente as ações permitidas pelo status

Automatizado: `__tests__/components/milon/ProgramList.test.tsx` → "lista itens com título, dono e badge de status" + "lista mista mostra exatamente as ações permitidas por cada status" + "título da seção usa o token font-display".

### Cenário 19: [NÃO TESTÁVEL MANUAL] Falha de carregamento tem "tentar de novo" (critério 19)

**Dado** que o carregamento da lista falha (rede/banco indisponível)
**Quando** a pessoa vê a tela
**Então** aparece mensagem simples de erro com opção de tentar de novo, e a nova tentativa recupera a lista

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "erro de carregamento mostra retry que dispara o hook"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → "falha de carregamento vira errorMsg visível e reload (tentar de novo) recupera" + "reload com falha expõe a mensagem e uma nova tentativa recupera"; `__tests__/components/milon/ProgramList.test.tsx` → "error mostra a mensagem e o tentar-novamente dispara onRetry".

> **Reexecução 2026-09-30 — NÃO TESTÁVEL MANUALMENTE:** "não tem como testar —
> se algo falhar, tudo falha": a falha de rede derruba a **sessão/app inteiro** e
> **não isola o estado de erro da lista**. **Coberto pelos testes automatizados
> (CA-P3-15/P3-16 e afins)**; **gap de testabilidade manual registrado para
> backlog**. Saiu dos executáveis (ver (iv)) — dispensado do teste manual.

### Cenário 20: [NÃO TESTÁVEL MANUAL] Falha em ação não muda estado nem fecha telas (critério 20)

**Dado** uma ativação, reativação ou exclusão que falha no repository
**Quando** a pessoa tenta a ação
**Então** a mensagem de erro fica visível, o status na lista não muda, nenhuma tela fecha silenciosamente e a pessoa pode tentar de novo; no modal de criação/edição, o que foi digitado é preservado

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "falha em remove mantém lista e filtros e expõe a mensagem" + "falha em activate preserva os status e expõe a mensagem" + "erro do repository é relançado ao modal sem alimentar o errorMsg da lista" + "recarga pós-exclusão falha: o item sai da lista em memória"; `__tests__/app/milon/programs/page.test.tsx` → "erro de save mantém o modal aberto com a mensagem visível e o digitado preservado" + "erro de save sem formato de Error vira a mensagem padrão no modal"; `__tests__/components/milon/ProgramModal.test.tsx` → "erro de gravação mantém o modal aberto com erro visível e o digitado preservado"; `__tests__/lib/milon/repositories/programs-client.test.ts` → "deleteProgram remove o registro e propaga erro do banco" + "createProgram: erro que não é de unicidade é relançado como está".

> **Reexecução 2026-09-30 — NÃO TESTÁVEL MANUALMENTE:** "não tem como testar —
> se algo falhar, tudo falha": a falha de rede derruba a **sessão/app inteiro** e
> **não isola o estado de erro da lista**. **Coberto pelos testes automatizados
> (CA-P3-15/P3-16 e afins)**; **gap de testabilidade manual registrado para
> backlog**. Saiu dos executáveis (ver (iv)) — dispensado do teste manual.

### Cenário 21: Material de sugestões validado antes de entrar no produto (critério 21)

**Dado** que templates e pools foram gerados uma única vez por IA
**Quando** o material entra no produto (TASK-003)
**Então** o humano o revisa e aprova antes do uso — só material revisado compõe a pool de sorteio, e ele não é alterado depois sem nova validação

Automatizado (estrutura do material): `__tests__/lib/milon/program-utils.test.ts` → describe "material de sugestões (templates + pools)" (3 casos: array não vazio, pools por categoria, slots válidos). A **aprovação humana** em si é o registro da TASK-003 em `tasks.json` (status `completed`, assignee `humano`) — gate não automatizável.

### Cenário 22: Lista única da família com logins individuais (critério 22)

**Dado** que a pessoa criou um Programa com seu login
**Quando** o outro casal abre a tela com o próprio login
**Então** vê o mesmo Programa e pode editá-lo, ativá-lo ou excluí-lo (se for rascunho)

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "padrão ao montar: dono = getUserEmail() e todos os status marcados" (lista bruta é a família; o filtro é refino) + "filtro de dono por igualdade: limpar vê a família inteira"; `__tests__/lib/milon/repositories/contract-programs.test.ts` → nenhum critério do contrato depende da sessão (`listAll` devolve a família inteira).

> **Reexecução 2026-09-30 — executado (com nota):** está ok, porém **redundante
> — não requer reexecução separada** (o sub-bloco de ativar segue
> `[BLOQUEADO-PARCIAL — #3]`).

---

## Patch v3 — Navegação em abas (CA-P3-01…12)

Cenários Dado/Quando/Então do **Patch v3 de navegação** (spec §P2 decisões D9–D14,
§P3 requisitos R1–R12, §P4 critérios CA-P3-01…12), acrescentados na TASK-020
sem alterar os 22 cenários do ciclo v1 acima. Mapeio 1:1 cada `CA-P3-xx` para um
cenário e para o teste automatizado que o exercita (nomes conferidos em disco).

- **Execução:** subir o app (`npm run dev`), logar e navegar pelas rotas indicadas.
- **Status:** os testes automatizados estão verdes; a coluna "Homologado" fica para
  o humano marcar ao executar (gate `approve-review`).

| # | Critério (spec §P4) | Decisão / req. | Automatizado em | Homologado |
|---|---|---|---|---|
| 23 | CA-P3-01 — `/milon` termina em `/milon/programs`, sem biblioteca | D9, D11 · R3 | ver Cenário 23 | ☐ |
| 24 | CA-P3-02 — biblioteca em `/milon/exercises`, conteúdo homologado | D9, D10 · R1 | ver Cenário 24 | ☐ |
| 25 | CA-P3-03 — `/milon/programs` sem mudança observável | R2 | ver Cenário 25 | ☐ |
| 26 | CA-P3-04 — barra com exatamente 2 links com rotas exatas | D10 · R5 | ver Cenário 26 | ☐ |
| 27 | CA-P3-05 — exatamente uma aba ativa em cada tela | R8 | ver Cenário 27 | ☐ |
| 28 | CA-P3-06 — URL direta/refresh já chega com aba ativa correta | R9 | ver Cenário 28 | ☐ |
| 29 | CA-P3-07 — abas do Pluto também destacam a atual | D12 · R10 | ver Cenário 29 | ☐ |
| 30 | CA-P3-08 — textos exatos dos cards Mílon e Pluto | D13 · R11 | ver Cenário 30 | ☐ |
| 31 | CA-P3-09 — hrefs preservados; card Mílon chega a Programas | D11 · R4, R11 | ver Cenário 31 | ☐ |
| 32 | CA-P3-10 — textos antigos com zero ocorrências | D13 · R11 | ver Cenário 32 | ☐ |
| 33 | CA-P3-11 — alternar abas permanece no layout do módulo | R6, R7 | ver Cenário 33 | ☐ |
| 34 | CA-P3-12 — suíte verde e coverage ≥ 80% mantidos | gate do processo | ver Cenário 34 | ☐ |

---

### Cenário 23: Raiz do módulo redireciona para Programas (CA-P3-01 · R3 · D9/D11)

**Dado** que a pessoa acessa `/milon` — digitando no navegador, dando refresh ou clicando no card do dashboard
**Quando** a rota raiz é resolvida
**Então** ela termina na tela de Programas em `/milon/programs`, com a aba "Programas" ativa, e a biblioteca de exercícios **não** aparece nesse caminho

Automatizado: `__tests__/app/milon/page.test.tsx` → "acessar /milon chama redirect('/milon/programs')" + "a biblioteca não aparece no caminho da raiz (sem 'Novo exercício' nem título)" + "não compõe a biblioteca: 0 ocorrências dos tokens da tela antiga".

### Cenário 24: Biblioteca em rota explícita, mesmo conteúdo (CA-P3-02 · R1 · D9/D10)

**Dado** que a pessoa acessa `/milon/exercises` diretamente
**Quando** a tela carrega
**Então** vê a biblioteca com título "Biblioteca de exercícios" (token `font-display`) e as mesmas funcionalidades homologadas da spec v2 — lista, filtro de músculo, busca, ordenação, mostrar mais, criar/editar/excluir com modais — mudando **só** a URL

Automatizado: `__tests__/app/milon/exercises/page.test.tsx` → describe "ExercisesPage /milon/exercises - Biblioteca de exercícios (CA-P3-02 / TASK-013)" (16 casos: "abre em MilonLayout com lista, filtro, busca e lotes ligados ao hook", "pageTitle 'Biblioteca de exercícios' no token font-display com o subtítulo (TASK-013)", "trocar filtro por músculo delega ao hook", "digitar busca delega ao hook", "mostrar-mais delega ao hook", "controle 'Ordenar por' ligado ao hook: exibe ordem atual e troca dispara setSortOrder", "criar via Salvar fecha o modal e grava na lista", "editar abre o modal preenchido a partir da lista e salva com o id", "excluir pede confirmação com nome e músculo antes de sumir da lista").

### Cenário 25: Tela de Programas permanece idêntica (CA-P3-03 · R2)

**Dado** que a pessoa acessa `/milon/programs` (URL existente da spec v2)
**Quando** a tela carrega e ela interage com lista, filtros, criação, edição e transições
**Então** tudo responde exatamente como descrito na spec v2 — nenhuma mudança observável em relação ao ciclo v1 (Cenários 1–22 continuam válidos)

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "renderização inicial: MilonLayout, título de tela e lista filtrada do hook" + a suíte completa do arquivo (20 casos do ciclo v1: estados de fetch, criar, editar, ativar, reativar, excluir, filtros, erros).

### Cenário 26: Barra do módulo tem exatamente duas abas com rotas exatas (CA-P3-04 · R5 · D10)

**Dado** que a pessoa está em qualquer uma das telas `/milon/exercises` ou `/milon/programs`
**Quando** ela olha a barra de navegação do módulo
**Então** há exatamente dois links — "Exercícios" com destino `/milon/exercises` e "Programas" com destino `/milon/programs` — sem itens adicionais, sem placeholder e sem link para rota antiga

Automatizado: `__tests__/components/milon/MilonLayout.test.tsx` → "exibe exatamente 2 links na navegação do módulo, sem itens extras" + "cada link é navegável com rótulo e rota exatos (Exercícios e Programas)".

### Cenário 27: Exatamente uma aba ativa em cada tela (CA-P3-05 · R8)

**Dado** que a pessoa abre `/milon/exercises` e depois `/milon/programs`
**Quando** cada tela é renderizada
**Então** em `/milon/exercises` a aba "Exercícios" aparece marcada como ativa (estilo distinto + `aria-current="page"`) e "Programas" não; em `/milon/programs` o inverso — **sempre exatamente uma** aba ativa, identificável por tecnologia assistiva

Automatizado: `__tests__/components/layout/ModuleLayout.test.tsx` → "em /milon/exercises, Exercícios tem aria-current='page' + estilo ativo e Programas não" + "em /milon/programs, Programas é a única aba ativa (URL direta, sem clique anterior)" + "em /milon/exercises, exatamente um link da nav fica com aria-current='page'" + "a aba ativa é identificável por tecnologia assistiva via aria-current='page'".

### Cenário 28: URL direta ou refresh chega com a aba já correta (CA-P3-06 · R9)

**Dado** que a pessoa chega em qualquer URL do módulo por digitação ou refresh, sem nenhum clique anterior
**Quando** a página renderiza
**Então** a marca de aba ativa já corresponde à URL — `/milon/programs` mostra "Programas" ativa, `/milon/exercises` mostra "Exercícios" ativa (inclusive em subcaminho como `/milon/exercises/abc`, por match de prefixo)

Automatizado: `__tests__/components/layout/ModuleLayout.test.tsx` → "em /milon/programs, Programas é a única aba ativa (URL direta, sem clique anterior)" + "match por prefixo + '/': pathname /milon/exercises/abc mantém Exercícios ativa".

### Cenário 29: Pluto ganha destaque de aba ativa pela mesma regra (CA-P3-07 · R10 · D12)

**Dado** que a pessoa acessa `/pluto/budget`, `/pluto/months` ou `/pluto/transactions` diretamente
**Quando** a tela renderiza
**Então** a aba correspondente à URL ("Orçamento Anual", "Meses e Períodos" ou "Lançamentos") é a única marcada com estilo ativo e `aria-current="page"` — mesmo comportamento do Mílon, sem código condicional por módulo (impacto transversal aceito em D12); rotas, ordem e rótulos do Pluto não mudam

Automatizado: `__tests__/components/layout/ModuleLayout.test.tsx` → describe "Pluto — transversal, sem código condicional por módulo (CA-P3-07 / D12)" (`it.each` nos 3 caminhos: "em %s, o link %s é o único ativo, pela mesma regra do Mílon"); `__tests__/app/pluto/budget/page.test.tsx` → "em /pluto/budget, 'Orçamento Anual' é a única aba com aria-current='page' + estilo ativo"; `__tests__/app/pluto/months/page.test.tsx` → "em /pluto/months, 'Meses e Períodos' é a única aba com aria-current='page' + estilo ativo"; `__tests__/app/pluto/transactions/page.test.tsx` → "em /pluto/transactions, 'Lançamentos' é a única aba com aria-current='page' + estilo ativo".

### Cenário 30: Cards do dashboard com as redações exatas (CA-P3-08 · R11 · D13)

**Dado** que o dashboard está renderizado
**Quando** a pessoa olha os cards dos módulos
**Então** o card Mílon exibe exatamente "Módulo de Acompanhamento de Treinos e Evolução" e o card Pluto exibe exatamente "Módulo Orçamentário e Financeiro"; títulos, hrefs e demais elementos permanecem

Automatizado: `__tests__/app/dashboard/page.test.tsx` → "renders Milon card with D13 text linking to the Mílon module" + "renders Pluto card with D13 text linking to the budget" (asserções `getByText` dos textos exatos de D13).

### Cenário 31: Atalhos do dashboard continuam com destino original (CA-P3-09 · R4, R11 · D11)

**Dado** que o dashboard está renderizado
**Quando** a pessoa clica no card Mílon e, em outra sessão, no card Pluto
**Então** o card Mílon mantém o destino `/milon` e chega a **Programas** via redirect (Cenário 23), sem passar pela biblioteca; o card Pluto mantém o destino `/pluto/budget` — e nenhum outro link interno aponta para rota antiga da biblioteca além desse card

Automatizado: `__tests__/app/dashboard/page.test.tsx` → "renders Milon card with D13 text linking to the Mílon module" (href `/milon`) + "renders Pluto card with D13 text linking to the budget" (href `/pluto/budget`); `__tests__/app/milon/page.test.tsx` → "acessar /milon chama redirect('/milon/programs')" (o destino `/milon` do card funciona via redirect).

### Cenário 32: Textos antigos do dashboard não existem mais (CA-P3-10 · R11 · D13)

**Dado** que o dashboard está renderizado (e a raiz do módulo foi reescrita como redirect)
**Quando** a pessoa procura as redações antigas
**Então** "Acesse a biblioteca de exercícios da academia." e "Acesse o controle de orçamento anual, categorias de receitas e despesas previstas." não aparecem em nenhuma tela — zero ocorrências no código renderizado/produção

Automatizado: `__tests__/app/dashboard/page.test.tsx` → `queryByText` de cada texto antigo retorna `null` nas asserções "renders Milon card with D13 text linking to the Mílon module" e "renders Pluto card with D13 text linking to the budget"; `__tests__/app/milon/page.test.tsx` → "não compõe a biblioteca: 0 ocorrências dos tokens da tela antiga".

### Cenário 33: Alternar abas permanece dentro do módulo (CA-P3-11 · R6, R7)

**Dado** que a pessoa está em `/milon/exercises` com a barra de abas visível
**Quando** ela clica em "Programas" (e depois volta clicando em "Exercícios")
**Então** a navegação troca de tela permanecendo no layout do módulo — mascote e título "Mílon" visíveis nas duas telas, `pageTitle` próprio de cada tela preservado ("Biblioteca de exercícios" na biblioteca, "Programas" na tela de programas) — e o botão de voltar do navegador, numa troca simples de aba, não a tira do módulo

Automatizado (composição + destinos das duas telas): `__tests__/app/milon/exercises/page.test.tsx` → "abre em MilonLayout com lista, filtro, busca e lotes ligados ao hook" + "pageTitle 'Biblioteca de exercícios' no token font-display com o subtítulo (TASK-013)"; `__tests__/app/milon/programs/page.test.tsx` → "renderização inicial: MilonLayout, título de tela e lista filtrada do hook"; `__tests__/components/milon/MilonLayout.test.tsx` → "cada link é navegável com rótulo e rota exatos (Exercícios e Programas)". A parte de **histórico do navegador (botão voltar)** não tem como ser exercitada no jsdom — é verificação **manual** na homologação.

### Cenário 34: Suíte completa verde com coverage ≥ 80% (CA-P3-12 · gate do processo)

**Dado** que todas as tasks do patch v3 (TASK-012…020) foram implementadas
**Quando** a suíte completa é executada
**Então** nenhum teste existente quebra (baseline `3c26daa` mantida), `test-report.json` é regenerado com `failed = 0` e coverage ≥ 80%, mantendo verde o gate antes da review do Argos

Automatizado: suíte completa `npm test` (todos os arquivos citados nos Cenários 23–33, além dos 666 testes da baseline) + gate `test-report.json` em `.agents/modules/milon/02-programas/` (regenerado na TASK-021 antes da review).

> **D14 · R12 (norma para novos módulos):** o padrão "rotas explícitas por aba + raiz
> com redirect para a aba padrão + barra de abas com aba ativa visível" é norma
> **documental** para novos módulos — não é tela homologável nesta feature; o
> registro na documentação transversal é handoff para Mnemósine (spec §P7).

---

## Patch v4 — Origem de mensagem, detalhe e navegação (CA-P3-13…20)

Cenários Dado/Quando/Então do **Patch v4** (spec §Q2 decisões D15–D17, §Q3
requisitos R13–R21, §Q4 critérios CA-P3-13…20), acrescentados na TASK-028 sem
alterar nada dos 22 cenários do ciclo v1 nem dos 12 do Patch v3 (Cenários 1–34
permanecem intactos). Mapeio 1:1 cada `CA-P3-xx` para um cenário e para o teste
automatizado que o exercita (nomes conferidos em disco).

- **Execução:** subir o app (`npm run dev`), logar e abrir `/milon/programs`
  (e `/milon/programs/<id>` para o detalhe).
- **Status:** os testes automatizados estão verdes; a coluna "Homologado" fica para
  o humano marcar ao executar (gate `approve-review`).
- **Sem cenário para CA-P3-21** (gate de processo — regeneração de
  `test-report.json` com `failed = 0` e coverage ≥ 80%, coberto na TASK-029) nem
  para o handoff da Q7 (cenários repassados à feature 3 se registram em
  `backlog.md` — responsabilidade do Mnemósine), conforme `tasks.json` TASK-028.

| # | Critério (spec §Q4) | Decisão / req. | Automatizado em | Homologado |
|---|---|---|---|---|
| 35 | CA-P3-13 — bloqueio fecha a confirmação, banner sem retry, status intacto | D15 · R15 | ver Cenário 35 | ☐ |
| 36 | CA-P3-14 — falha de operação fecha a confirmação, banner sem retry, status anterior | D15 · R16 | ver Cenário 36 | ☐ |
| 37 | CA-P3-15 — erro de carga com "Tentar novamente" (única origem com retry) | R14 | ver Cenário 37 | ☐ |
| 38 | CA-P3-16 — sem modal aberto sobre a mensagem (cenário 5 da homologação resolvido) | D15 · R17 | ver Cenário 38 | ☐ |
| 39 | CA-P3-17 — detalhe com título/dono/status; id desconhecido explicado | D16 · R18, R19 | ver Cenário 39 | ☐ |
| 40 | CA-P3-18 — criação salva navega ao detalhe do programa novo | D17 · R20 | ver Cenário 40 | ☐ |
| 41 | CA-P3-19 — edição salva permanece na lista | D17 · R21 | ver Cenário 41 | ☐ |
| 42 | CA-P3-20 — detalhe sem placeholder de treinos | D16 · R18, Q5 | ver Cenário 42 | ☐ |

---

### Cenário 35: Bloqueio de domínio fecha a confirmação e não oferece retry (CA-P3-13 · R15 · D15)

**Dado** que a pessoa confirma a ativação de um Programa sem conteúdo mínimo (a guarda de ativação desta feature apura o bloqueio)
**Quando** o bloqueio é apurado
**Então** o modal de confirmação **fecha**, a mensagem do bloqueio aparece em banner no corpo da página **sem** botão "Tentar novamente", o status do Programa permanece o de antes e o repositório de atualização não é chamado

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "CA-P3-13 + CA-P3-16: bloqueio da guarda na ativação fecha a confirmação e mostra banner sem retry"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → "guarda de ativação bloqueando grava origem 'bloqueio' sem chamar o repositório" + "guarda de reativação bloqueando grava origem 'bloqueio' sem chamar o repositório" + "regra de exclusão de não-rascunho grava origem 'bloqueio' com a mensagem exata e sem chamar o repositório"; `__tests__/components/milon/ProgramList.test.tsx` → "error + errorOrigin 'bloqueio' renderiza a mensagem SEM o botão 'Tentar novamente'".

### Cenário 36: Falha de operação fecha a confirmação e preserva o estado (CA-P3-14 · R16 · D15)

**Dado** uma ativação, reativação ou exclusão confirmada que falha no repositório (ex.: rede)
**Quando** a falha de operação ocorre
**Então** o modal de confirmação **fecha**, a mensagem aparece em banner **sem** "Tentar novamente" e a lista mantém o status anterior — nenhum status muda

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "CA-P3-14: falha de operação ao ativar fecha a confirmação e mostra banner sem retry" + "CA-P3-14: falha de operação ao reativar fecha a confirmação e mostra banner sem retry" + "CA-P3-14: falha de operação ao excluir fecha a confirmação e mostra banner sem retry"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → `it.each` "falha de repositório em %s grava origem 'operacao' preservando o status" (activate, reactivate) + "falha de delete em remove grava origem 'operacao' preservando a lista"; `__tests__/components/milon/ProgramList.test.tsx` → "error + errorOrigin 'operacao' renderiza a mensagem SEM o botão 'Tentar novamente'".

### Cenário 37: Erro de carga é a única origem com "Tentar novamente" (CA-P3-15 · R14)

**Dado** que o fetch da lista falha (rede/banco indisponível)
**Quando** a pessoa vê a tela e aciona "Tentar novamente"
**Então** o banner exibe o botão "Tentar novamente" e o acionamento recarrega a lista — retry presente **somente** nesta origem de erro

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "CA-P3-15: erro de carga exibe 'Tentar novamente' e o acionamento recarrega a lista" + "erro de carregamento mostra retry que dispara o hook"; `__tests__/components/milon/ProgramList.test.tsx` → "error + errorOrigin 'carga' renderiza a mensagem e 'Tentar novamente', que dispara onRetry (CA-P3-15)"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → "fetch de carga falhando na montagem grava errorMsg não nulo com origem 'carga'" + "falha no fetchList (reload) também grava origem 'carga'".

### Cenário 38: Mensagem legível — o cenário 5 da homologação fica resolvido (CA-P3-16 · R17 · D15)

**Dado** que uma confirmação termina em bloqueio ou falha de operação (achado registrado como cenário 5 da homologação manual: a mensagem ficava atrás do backdrop fixo `z-50` do modal, porque a confirmação permanecia aberta)
**Quando** o terminal da confirmação é tratado
**Então** **nenhum** modal de confirmação permanece aberto sobre a tela e a mensagem está legível no corpo da página, sem sobreposição — inclusive no terminal de sucesso, em que a confirmação também fecha

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "CA-P3-13 + CA-P3-16: bloqueio da guarda na ativação fecha a confirmação e mostra banner sem retry" + "CA-P3-14: falha de operação ao ativar fecha a confirmação e mostra banner sem retry" + "terminal de sucesso: exclusão de rascunho confirmada fecha a confirmação" (todos assertam a confirmação fechada com a mensagem no corpo da página).

### Cenário 39: Detalhe do programa com cabeçalho completo; id desconhecido explicado (CA-P3-17 · R18, R19 · D16)

**Dado** que a pessoa acessa `/milon/programs/<id>` de um programa existente (navegação pós-criação, digitação no navegador ou refresh)
**Quando** a página carrega
**Então** ela exibe título, dono e status daquele programa dentro do layout do Mílon (aba "Programas" ativa) e **não** exibe qualquer seção ou texto de treinos

**Dado** um endereço que não corresponde a nenhum programa
**Quando** a busca pelo id resolve sem resultado
**Então** a tela mostra "Programa não encontrado." com explicação — sem programa errado, sem tela em branco e sem confundir com erro de carga

Automatizado: `__tests__/app/milon/programs/[id]/page.test.tsx` → "cabeçalho exibe título, dono e status do programa buscado pelo id da rota (CA-P3-17)" + "id desconhecido: 'Programa não encontrado.' com explicação, sem erro de carga nem loading (R19)" + "renderiza dentro de MilonLayout com exatamente as duas abas e 'Programas' ativa (R18)" + "estado de carregamento exibe 'Carregando programa…' e nenhum programa"; `__tests__/lib/milon/hooks/useProgramDetail.test.ts` → "sucesso: programa preenchido, loading false e error nulo" + "id desconhecido (R19): standalone resolve nulo ⇒ program nulo E error nulo com loading false".

### Cenário 40: Criação salva navega ao detalhe do programa novo (CA-P3-18 · R20 · D17)

**Dado** que a pessoa criou um programa e o salvou com sucesso
**Quando** o salvamento termina
**Então** ela é navegada para `/milon/programs/<id>` do programa recém-criado (o destino usa o id devolvido por `save()`), vendo o cabeçalho dele — a lista não é o destino desse caminho, e o modal de criação também fecha

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "CA-P3-18: salvar um programa novo navega para /milon/programs/<id> do programa criado" (asserção de `router.push` com o id devolvido por `save()`).

### Cenário 41: Edição salva permanece na lista (CA-P3-19 · R21 · D17)

**Dado** que a pessoa salvou a edição de um programa existente
**Quando** o salvamento termina
**Então** ela permanece em `/milon/programs` com a lista atualizada — **nenhuma** navegação para a página de detalhe — e o modal de edição fecha

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "CA-P3-19: salvar a edição permanece na lista — nenhuma navegação e modal fecha" (`router.push` não é chamado).

### Cenário 42: Detalhe sem placeholder de treinos (CA-P3-20 · R18 · D16 / Q5)

**Dado** que a página de detalhe está em qualquer um dos seus estados (carregando, com programa, não encontrada ou erro de fetch)
**Quando** a pessoa observa a tela
**Então** não há mensagem do tipo "Treinos em breve", nem seção de treinos, nem lista vazia de treinos — a tela contém só o cabeçalho do programa (conteúdo de treinos é da feature 3)

Automatizado: `__tests__/app/milon/programs/[id]/page.test.tsx` → "nenhum dos quatro estados da página menciona treinos (CA-P3-20)".

---

## Fora do escopo confirmado pela spec (não homologar aqui)

- Conteúdo de treinos dentro do Programa (feature 3), "treino do dia"/rotação (feature 4),
  exclusão de ativo/inativo, transições `rascunho → inativo` e `ativo → rascunho`,
  permissões por usuário, IA em tempo de uso — todos em spec §4 (YAGNI).
