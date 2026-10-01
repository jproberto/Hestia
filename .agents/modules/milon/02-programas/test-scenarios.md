# Cenários de Homologação — Mílon #2: Programas

Portão manual da feature (`SPEC_APPROVED` → `APPROVED`). Derivado exclusivamente de
`spec.md` §5 (Critérios de Aceite — 22 itens) + `tasks.json` (acceptanceCriteria) +
`plan.md` (contratos). Cenário por critério, na mesma ordem da spec.

- **Execução:** subir o app (`npm run dev`), logar e abrir `/milon/programs`.
- **Referência de teste:** cada cenário aponta o teste automatizado que o exercita
  (suíte `npm test`, **786 testes / 88 arquivos, 0 falhas** — suite final da
  TASK-045, v1 + Patch v3 + Patch v4 + Patch v5 + Patch v6).
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
- **Patch v5 (TASK-040):** a seção "Patch v5 — Estados de tela centralizados
  (AsyncState)" ao final do arquivo acrescenta os cenários Dado/Quando/Então do
  patch de estados centralizados (**CA-P5-1…9**, Cenários 43–51) — os 42
  cenários anteriores (22 v1 + 12 do Patch v3 + 8 do Patch v4) permanecem
  intactos. É o patch que **corrige o defeito do Cenário 5**: o erro passa a
  renderizar **acima** do conteúdo com a lista visível (CA-P5-1, Cenário 43),
  precedência fixa dos 4 estados (CA-P5-2), retry por origem (CA-P5-3),
  adoção nas 3 telas preservando CA-P3-13…16 (CA-P5-5), exclusão da biblioteca
  fechando em falha (CA-P5-6) e prova de herança (CA-P5-7). **Classificação dos
  9 novos:** 8 executáveis (43–49, 51) · **0 bloqueados pela feature #3** (o
  patch não toca ativação/ciclo de vida) · 1 handoff da fase 7 (Cenário 50,
  CA-P5-8) · +1 sub-bloco `[NÃO TESTÁVEL MANUAL]` (estado mockado
   programa+erro do detalhe). Contagem do arquivo: **51 cenários** (42 + 9).
- **Patch v6 (TASK-044):** a seção "Patch v6 — Link no título do item da lista
  (CA-P6-1…5)" ao final do arquivo acrescenta os cenários Dado/Quando/Então do
  patch de link no título (**CA-P6-1…5**, Cenário 52) — os 51 cenários
  anteriores (22 v1 + 12 do Patch v3 + 8 do Patch v4 + 9 do Patch v5) permanecem
  intactos. É o patch que **fecha o ponto que o Patch v4 deixou em aberto**
  (entrada na página de detalhe a partir da lista): título vira link com href
  exato `/milon/programs/<id>` por item (CA-P6-1), o clique navega ao cabeçalho
  do programa nos três status (CA-P6-2), as ações permanecem botões **fora** do
  link disparando os callbacks de sempre (CA-P6-3), a afordância é mudança de
  cor no hover **sem sublinhado** com foco visível (CA-P6-4, Alternativa C) e a
  semântica preserva heading `h3` + link com o **mesmo nome acessível**
  (CA-P6-5). **Classificação do novo cenário:** **1 executável** (52) · **0
  bloqueados pela feature #3** (o patch não toca ativação nem ciclo de vida —
  muda só a apresentação do título) · CA-P6-6 **sem cenário próprio** (gate de
  processo na TASK-045, spec T6). Contagem do arquivo: **52 cenários** (51 + 1).
  **Suite completa executada na TASK-045 (2026-10-01):** **786/786 em 88
  arquivos, 0 falhas**, coverage **84,51% lines / 84,51% statements / 88,45%
  branches / 88,29% functions** (todos ≥ 80) — gate **CA-P6-6 PASS**,
  `test-report.json` regenerado, `regression.md` atualizado e
  `npm run build-storybook` exit 0.

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
  arquivo: **786/786 em 88 arquivos, coverage 84,51% lines** (suite final da
  TASK-045 — v1 + Patches v3/v4/v5/v6).

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

## Patch v5 — Estados de tela centralizados (AsyncState) (CA-P5-1…9)

Cenários Dado/Quando/Então do **Patch v5 de estados centralizados** (spec §S2
decisões D18–D27, §S3 requisitos R22–R31, §S4 critérios CA-P5-1…9), acrescentados
na TASK-040 sem alterar nada dos 22 cenários do ciclo v1, dos 12 do Patch v3 nem
dos 8 do Patch v4 (Cenários 1–42 permanecem intactos). Mapeio 1:1 cada `CA-P5-x`
para um cenário e para o teste automatizado que o exercita (nomes conferidos em
disco).

- **Execução:** subir o app (`npm run dev`), logar e abrir `/milon/programs`
  (lista + rota de detalhe) e `/milon/exercises` (biblioteca). Para as origens
  `carga`/`operacao`: DevTools → Network → **Offline**, mesmo protocolo dos
  Cenários 36–38.
- **Status:** conferência de disco de **2026-09-30** (Minos): `npx vitest run`
  nos **8 arquivos do Patch v5** → **176 testes, 0 falhas**. Suíte completa e
  regeneração de `test-report.json` executadas na **TASK-041 (CA-P5-9)**:
  **781/781 em 88 arquivos · coverage 84,48% lines · 0 falhas** — gate verde
  antes da review do Argos. **Reexecutadas na TASK-045 (CA-P6-6,
  2026-10-01):** os mesmos 176 testes do Patch v5 seguem verdes dentro da
  suíte completa de **786/786 em 88 arquivos · coverage 84,51% lines · 0
  falhas** — nada do Patch v5 quebrou com o Patch v6 (CA-P5-5 preservado).
- **Classificação (buckets do checklist acima):** os buckets da reexecução
  2026-09-30 referem-se aos **Cenários 1–42**; a classificação dos **43–51** está
  no quadro ao final desta introdução. **Nenhum cenário do Patch v5 depende da
  feature #3.**
- **Diferença em relação à TASK-040 (registrada):** o `description` da TASK-040
  pedia só CA-P5-1…7; a solicitação humana desta task pediu explicitamente
  também **CA-P5-8** (Cenário 50, handoff da fase 7) e **CA-P5-9** (Cenário 51,
  gate de processo — precedente do Cenário 34/CA-P3-12). Os 7 obrigatórios
  CA-P5-1…7 seguem um por critério, como manda o acceptanceCriteria.
- **Reexecução do Cenário 5:** o **Cenário 5** da homologação (executado com
  defeito — o banner substituía a lista) é **reexecutado pelo Cenário 43**,
  agora com o banner **acima** e a lista visível.

| # | Critério (spec §S4) | Decisão / req. | Automatizado em | Homologado |
|---|---|---|---|---|
| 43 | CA-P5-1 — banner ACIMA do conteúdo com a lista visível (Cenário 5 corrigido) | D19 · R24 · D21 | ver Cenário 43 | ☐ |
| 44 | CA-P5-2 — precedência fixa: carregando → erro → vazio → no-results | D19 · R23 | ver Cenário 44 | ☐ |
| 45 | CA-P5-3 — retry só em `carga`/origem ausente; `operacao`/`bloqueio` sem botão | D20 · R25 | ver Cenário 45 | ☐ |
| 46 | CA-P5-4 — contrato completo coberto; textos customizados via props; sem "Fechar ✕" | D18 · D22 · R22 | ver Cenário 46 | ☐ |
| 47 | CA-P5-5 — adoção preserva CA-P3-13/14/15/16 e os textos homologados | D21 · R26 | ver Cenário 47 | ☐ |
| 48 | CA-P5-6 — exclusão da biblioteca fecha a confirmação em falha, banner sem retry | D25 · R28 · D23/R27 | ver Cenário 48 | ☐ |
| 49 | CA-P5-7 — "Tentar novamente" só em `components/ui/AsyncState.tsx` | D21 · R30 · D24 | ver Cenário 49 | ☐ |
| 50 | CA-P5-8 — norma no "Onde ponho X?" do AGENTS.md | D27 · R31 | ver Cenário 50 (handoff fase 7) | ☐ |
| 51 | CA-P5-9 — suíte verde, coverage ≥ 80%, `test-report.json` regenerado | gate do processo | ver Cenário 51 | ☐ |

**Classificação dos Cenários 43–51:** **8 executáveis** (43, 44, 45, 46, 47, 48,
49, 51) · **0 `[BLOQUEADO — #3]`** (o patch não toca ativação, reativação nem
ciclo de vida — nenhuma exigência de conteúdo real de treinos) · **1
`[HANDOFF FASE 7]`** (50/CA-P5-8 — norma escrita pela Mnemósine, fora do diff de
código) · **+1 sub-bloco `[NÃO TESTÁVEL MANUAL]`** (estado mockado
"programa + erro" do detalhe dentro dos Cenários 43/44 — com o hook atual os
dois nunca coexistem em tela real; coberto pelos automatizados, plan §6 risco 5).

---

### Cenário 43: Banner de erro ACIMA do conteúdo com a lista visível (CA-P5-1 · R24 · D19/D21)

**Dado** que a lista de Programas já carregou com itens e a pessoa aciona uma
ação que termina em **bloqueio de domínio** (guarda de ativação de um programa
sem treinos — caminho do Cenário 5)
**Quando** o bloqueio é apurado
**Então** o modal de confirmação **fecha**, o banner com a mensagem aparece
**acima** do conteúdo e a **lista de programas permanece visível e legível**
(título, dono, status e ações legíveis abaixo do banner) — **sem** botão
"Tentar novamente" (origem `bloqueio`) e sem substituição da lista pelo erro

**Dado** a mesma lista e uma **exclusão confirmada que falha** (DevTools →
Offline, mesmo protocolo do Cenário 36)
**Quando** a falha de operação é tratada
**Então** a confirmação **fecha**, o banner aparece **acima** da lista visível,
**sem** retry (origem `operacao`), e o status dos itens não muda — o defeito do
Cenário 5 (banner substituindo a lista) fica **corrigido**

**Dado** a rota de detalhe `/milon/programs/<id>` no estado mockado
"programa + erro" (cabeçalho carregado e falha de fetch ao mesmo tempo)
**Quando** a página renderiza
**Então** o banner aparece **acima** do cabeçalho, o cabeçalho permanece visível
e o retry aciona a recarga — **`[NÃO TESTÁVEL MANUAL]`**: em tela real o hook
atual nunca faz os dois coexistirem; asserção do contrato do componente (plan §6)

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "CA-P5-1 (Cenário 5): bloqueio na ativação => modal fecha, banner ACIMA e a lista permanece visível, sem retry" + "CA-P5-1: falha de operação na exclusão => modal fecha, banner ACIMA e a lista permanece visível, sem retry"; `__tests__/components/milon/ProgramList.test.tsx` → "CA-P5-1: error + 'bloqueio' com itens => banner ACIMA, lista visível e sem retry" + "CA-P5-1: error + 'operacao' com itens => banner ACIMA, lista visível e sem retry"; `__tests__/components/ui/AsyncState.test.tsx` → "erro com children: banner ACIMA da região e o conteúdo permanece visível (R24 / CA-P5-1)"; `__tests__/components/milon/ExerciseList.test.tsx` → "CA-P5-1: error + 'operacao' com itens => banner ACIMA, lista visível e sem retry" + "CA-P5-1/CA-P5-3: error de carga com itens => banner com 'Tentar novamente' ACIMA e a lista visível"; `__tests__/app/milon/programs/[id]/page.test.tsx` → "R24/CA-P5-1: programa + erro => banner ACIMA do cabeçalho, cabeçalho visível e 'Tentar novamente' aciona retry".

### Cenário 44: Precedência fixa dos 4 estados (CA-P5-2 · R23 · D19)

**Dado** o componente centralizado em qualquer tela que o adota (Programas,
biblioteca ou detalhe) com combinações de flags de estado
**Quando** a tela renderiza
**Então** a precedência é sempre **carregando → erro → vazio → no-results**:
com `carregando` verdadeiro **só** o texto de carregamento aparece (sem banner,
sem vazio, sem no-results, sem lista); havendo erro, o banner fica **acima** e o
conteúdo permanece (**sem** mensagem de vazio nem de no-results quando não há
conteúdo carregado); sem erro e sem registros, **vazio** (que **prevalece** sobre
no-results quando as duas flags vêm juntas); sem erro, com registros escondidos
por filtros ou busca, **no-results**; sem nenhuma flag, a região renderiza só o
conteúdo

Automatizado: `__tests__/components/ui/AsyncState.test.tsx` → describe "precedência fixa dos 4 estados - D19 / R23 / CA-P5-2" (7 casos: "loading verdadeiro mostra SOMENTE o loadingText: sem banner, sem vazio, sem no-results e sem children", "erro com children: banner ACIMA da região e o conteúdo permanece visível (R24 / CA-P5-1)", "erro SEM children mostra somente o banner - nunca mensagem de vazio nem de no-results sob erro (D19d)", "sem erro, empty e noResults simultâneos: o vazio prevalece sobre o no-results", "noResults só sem empty e sem erro: exibe título e texto de no-results, sem o vazio", "sem nenhuma flag e sem children a região fica vazia (nenhum estado renderizado)", "sem nenhuma flag com children: apenas o conteúdo é renderizado"); `__tests__/components/milon/ProgramList.test.tsx` → "precedência D19: loading verdadeiro vence erro e lista - só 'Carregando programas...'" + "precedência D19: empty prevalece sobre noResults quando não há erro"; `__tests__/components/milon/ExerciseList.test.tsx` → "precedência D19: loading verdadeiro vence erro - só 'Carregando exercícios...'"; `__tests__/app/milon/programs/[id]/page.test.tsx` → "precedência D19: carregando vence erro e cabeçalho - só o texto de carregamento" + "precedência D19: erro vence o vazio - program nulo + erro => banner com retry, nunca a faixa de não-encontrado".

> **Manual:** loading, vazio e no-results são observáveis diretos (Cenários 1,
> 15, 16, 24, 39); sob erro, usar o terminal de **bloqueio** (guarda) ou o
> **Offline** dos Cenários 36–37. O sub-bloco "programa + erro" do detalhe é
> `[NÃO TESTÁVEL MANUAL]` (ver Cenário 43).

### Cenário 45: Retry só em `carga`/origem ausente — `operacao` e `bloqueio` sem botão (CA-P5-3 · R25 · D20)

**Dado** o componente recebendo uma mensagem de erro com origem **`carga`**,
com a prop `errorOrigin` **ausente** ou com ela **nula** (a rota de detalhe não
informa origem — default exercido em tela real)
**Quando** a pessoa lê o banner
**Então** ele exibe "Tentar novamente" e o acionamento dispara o retry recebido
(recarregando a lista ou o programa)

**Dado** o mesmo componente com origem **`operacao`** ou **`bloqueio`**
**Quando** a pessoa lê o banner
**Então** a mensagem aparece **sem** o botão "Tentar novamente" — a decisão é do
componente, não de cada tela, mas a regra herdada de R13/R14 não muda

Automatizado: `__tests__/components/ui/AsyncState.test.tsx` → describe "retry derivado de errorOrigin - D20 / R25 / CA-P5-3" (5 casos: "origem 'carga': renderiza a mensagem e 'Tentar novamente', que dispara onRetry", "origem AUSENTE (prop não informada): tratada como 'carga' - com retry que dispara onRetry", "origem NULA (errorOrigin={null}): tratada como 'carga' - com retry que dispara onRetry", "origem 'operacao': exibe só a mensagem, SEM 'Tentar novamente'", "origem 'bloqueio': exibe só a mensagem, SEM 'Tentar novamente'"); `__tests__/components/milon/ProgramList.test.tsx` → "D20/CA-P5-3: errorOrigin NULO é tratado como carga - 'Tentar novamente' dispara onRetry" + os 4 casos do describe "origem da mensagem: retry exclusivo da carga (Patch v4, TASK-022 RED)"; `__tests__/components/milon/ExerciseList.test.tsx` → "CA-P5-3: error + 'carga' renderiza a mensagem e 'Tentar novamente', que dispara onRetry" + "D20/CA-P5-3: errorOrigin NULO é tratado como carga - 'Tentar novamente' dispara onRetry" + "CA-P5-3: error + 'operacao' renderiza a mensagem SEM o botão 'Tentar novamente'" + "CA-P5-3: error + 'bloqueio' renderiza a mensagem SEM o botão 'Tentar novamente'"; `__tests__/app/milon/programs/[id]/page.test.tsx` → "falha de fetch mostra banner com 'Tentar novamente' que aciona o retry (distinto do não-encontrado)" + "falha de fetch SEM conteúdo => somente o banner com 'Tentar novamente' (origem ausente ⇒ carga, default em tela real)".

> **Manual:** `carga` com DevTools → Offline (protocolo do Cenário 37);
> `bloqueio` pela guarda de ativação (sem rede); origem ausente abrindo a rota
> de detalhe em Offline.

### Cenário 46: Textos customizados via props e contrato completo do componente (CA-P5-4 · R22 · D18/D22)

**Dado** o componente centralizado nas três telas que o adotam (Programas,
biblioteca, detalhe)
**Quando** a pessoa observa cada um dos 4 estados em cada tela
**Então** o texto renderizado é **exatamente** o repassado por props e idêntico
ao homologado — Programas: `Carregando programas...` · `Nenhum programa ainda.` +
`Crie o primeiro programa para começar.` · `Nada encontrado para essa combinação.` +
`Ajuste os filtros para ver mais programas.`; biblioteca: `Carregando exercícios...` ·
`Nenhum exercício cadastrado ainda.` + `Crie o primeiro exercício da biblioteca para começar.` ·
`Nada encontrado para essa combinação.` + `Ajuste os filtros ou crie o exercício na biblioteca.`;
detalhe: `Carregando programa…` · `Programa não encontrado.` + `Este programa não existe ou foi removido. Volte para a lista e escolha outro programa.`
— e o banner **nunca** tem botão de fechar (D22): o único botão possível é o
retry, e só na origem `carga`

> **Não testável manualmente como clique:** "nenhum ramo do contrato sem
> asserção" (4 estados × 4 origens × presença/ausência de retry) é propriedade
> da **suíte**, verificada por `npm test`/coverage (Cenário 51/CA-P5-9); a parte
> observável manualmente são os **textos exatos** acima.

Automatizado: `__tests__/components/ui/AsyncState.test.tsx` → describe "sem botão de fechar - D22 / CA-P5-4" (2 casos: "erro de carga tem exatamente UM botão na região, e ele é o retry" + "nenhum estado renderiza botão de fechar (só o retry existe, e só na carga)") e describe "textos repassados literalmente pelas props - CA-P5-4 / CA-P5-5" (4 casos: loading, empty, noResults e error); `__tests__/components/milon/ProgramList.test.tsx` → "CA-P5-5: texto de carregamento idêntico ao de hoje" + "CA-P5-5: textos de vazio idênticos aos de hoje" + "CA-P5-5: textos de no-results idênticos aos de hoje"; `__tests__/components/milon/ExerciseList.test.tsx` → "CA-P5-5: os textos de carregamento, vazio e no-results permanecem literais"; `__tests__/app/milon/programs/[id]/page.test.tsx` → "CA-P5-5/R26: textos do detalhe idênticos aos de hoje nos 4 estados e noResults nunca aparece".

### Cenário 47: Adoção preserva a homologação CA-P3-13…16 (CA-P5-5 · R26 · D21)

**Dado** que a adoção do componente centralizado foi aplicada nas três telas
(ProgramList, ExerciseList e a rota de detalhe)
**Quando** a pessoa reexecuta os Cenários 35, 36, 37 e 38 (CA-P3-13, CA-P3-14,
CA-P3-15 e CA-P3-16) e as demais telas do Mílon
**Então** tudo continua verde: bloqueio fecha a confirmação e mostra banner
**sem** retry; falha de operação fecha a confirmação e preserva o status;
falha de carga exibe "Tentar novamente" que recarrega a lista; nenhuma mensagem
permanece atrás do modal; e os textos de carregamento, vazio e no-results de
todas as telas permanecem **idênticos** aos já homologados — mudança de
composição (banner acima), não de conteúdo

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → describe "Patch v4 - terminais da confirmação e navegação pós-salvar (TASK-024)" mantido verde ("CA-P3-13 + CA-P3-16: bloqueio da guarda na ativação fecha a confirmação e mostra banner sem retry", "CA-P3-14: falha de operação ao ativar/reativar/excluir fecha a confirmação e mostra banner sem retry", "CA-P3-15: erro de carga exibe 'Tentar novamente' e o acionamento recarrega a lista") + describe "Patch v5 - banner acima da lista na tela de Programas (TASK-034 RED)" ("CA-P5-5: falha de carga sem programas => somente o banner com retry, sem 'Nenhum programa ainda.'"); `__tests__/components/milon/ProgramList.test.tsx` → os 3 casos "CA-P5-5" (textos idênticos) + os 4 casos de origem do Patch v4; `__tests__/components/milon/ExerciseList.test.tsx` → "CA-P5-5: os textos de carregamento, vazio e no-results permanecem literais"; `__tests__/app/milon/programs/[id]/page.test.tsx` → "CA-P5-5/R26: textos do detalhe idênticos aos de hoje nos 4 estados e noResults nunca aparece".

### Cenário 48: Biblioteca — exclusão fecha a confirmação e banner sem retry (CA-P5-6 · R28 · D25/D23)

**Dado** que a pessoa confirma a exclusão de um exercício na biblioteca e a
operação falha (DevTools → Offline)
**Quando** a falha é tratada pela página
**Então** o modal `DeleteExerciseConfirm` **fecha**, a mensagem aparece em
banner **acima** da lista **sem** "Tentar novamente" (origem `operacao`) e o
exercício permanece na lista — o achado latente (b) (mensagem atrás do backdrop
`z-50`) fica corrigido

**Dado** a mesma confirmação no terminal de sucesso
**Quando** a exclusão é gravada
**Então** a confirmação também fecha e a mensagem de erro anterior zera

Automatizado: `__tests__/app/milon/exercises/page.test.tsx` → "CA-P5-6/S6(b): falha de exclusão FECHA a confirmação e mostra a mensagem no banner sem 'Tentar novamente'" + "terminal de sucesso: exclusão confirmada fecha a confirmação e zera o erro" + "CA-P5-6: origem 'operacao' crua do hook => banner ACIMA da lista visível, sem retry" + "CA-P3-15/CA-P5-5: origem 'carga' crua do hook => banner com 'Tentar novamente' que dispara retry" + "CA-P5-6/S6(b): 'Mantém a confirmação aberta' em app/milon/exercises/page.tsx => 0 ocorrências"; `__tests__/lib/milon/hooks/useExercises.test.ts` → describe "Mílon #2 - useExercises: origem da mensagem (Patch v5, TASK-038 RED)" ("rejeição do efeito de montagem grava errorOrigin 'carga' com a mensagem", "falha no fetchList (reload/retry) também grava origem 'carga'", "falha em remove grava origem 'operacao', preserva a lista e relança (S6(a))" + zeragem e save/saveAndNew); `__tests__/components/milon/ExerciseList.test.tsx` → "CA-P5-3: error + 'operacao' renderiza a mensagem SEM o botão 'Tentar novamente'".

### Cenário 49: Prova de herança — "Tentar novamente" só no componente centralizado (CA-P5-7 · R30 · D21/D24)

**Dado** o repositório na branch com a adoção aplicada
**Quando** a pessoa busca pela cadeia **`Tentar novamente`** em `app/` e em
`components/`
**Então** a ocorrência aparece **somente** em `components/ui/AsyncState.tsx` —
**zero** em `components/milon/ProgramList.tsx`, `components/milon/ExerciseList.tsx`,
`app/milon/programs/[id]/page.tsx` e em qualquer outra tela — e a busca por
`AsyncState` em `app/pluto/` e `components/pluto/` retorna **0** (Pluto intocado,
D24/R30)

Automatizado: `__tests__/components/milon/ExerciseList.test.tsx` → "CA-P5-7: 'Tentar novamente' em components/milon/ExerciseList.tsx => 0 ocorrências" + "CA-P5-7 (reafirmação): 'lib/milon' em components/ui/AsyncState.tsx => 0 ocorrências" + "D21/R26: ExerciseList compõe o AsyncState (import de '@/components/ui/AsyncState')"; `__tests__/app/milon/programs/[id]/page.test.tsx` → "CA-P5-7: 'Tentar novamente' em app/milon/programs/[id]/page.tsx => 0 ocorrências" + "D21/R26: a página compõe o AsyncState (import de '@/components/ui/AsyncState')" + "CA-P5-7 (reafirmação): 'lib/milon' em components/ui/AsyncState.tsx => 0 ocorrências". **Busca global** (a cadeia em `app/` + `components/`, a de `AsyncState` no Pluto e o zero do `ProgramList.tsx`) é reexecutada por Minos no gate da **TASK-041 (CA-P5-9)** e **reexecutada de
novo no gate da TASK-045 (CA-P6-6)** — conferência de disco de 2026-10-01
em verde: única ocorrência `components/ui/AsyncState.tsx:59`, zero em
`app/pluto/` e `components/pluto/` (detalhe no bloco `inheritanceProof` do
`test-report.json`).

> **Execução manual:** é verificação de **código** (grep/IDE no repositório),
> não fluxo de UI — mesmo formato do Cenário 32 (busca de textos antigos).

### Cenário 50: [HANDOFF FASE 7 — Mnemósine] Norma no "Onde ponho X?" do AGENTS.md (CA-P5-8 · R31 · D27)

**Dado** que a fase 7 (documentação) desta feature foi executada pela Mnemósine
**Quando** a pessoa abre a seção **"Onde ponho X?"** do `AGENTS.md` e busca o
texto normativo
**Então** a norma de D27 está escrita: estados de tela de lista (carregando,
erro, vazio, no-results) vão no componente centralizado
`components/ui/AsyncState.tsx`; mensagens com origem usam a união de origens de
`lib/shared`; retry é derivado de `errorOrigin` (`carga`/ausente com retry;
`operacao`/`bloqueio` sem)

**Status:** `[HANDOFF FASE 7]` — **não executável na homologação desta feature**:
é entregável documental fora do diff de código (D27/R31, spec §S9), na mesma
modalidade do registro D14/R12 do Patch v3 e do handoff do CA-P3-21 no Patch v4.
Conferência de disco de 2026-09-30: `AGENTS.md` **sem** ocorrência de
`AsyncState`/`errorOrigin` (esperado — a fase 7 ainda não rodou); perda do
handoff é a pendência de processo declarada em spec §S8.

Automatizado: — (gate documental por leitura + busca do texto no arquivo, como o
Cenário 21; verificação repetida na review do Argos/fase 7).

### Cenário 51: Portão — suíte verde, coverage ≥ 80% e `test-report.json` regenerado (CA-P5-9 · gate do processo)

**Dado** que todas as tasks do patch v5 (TASK-030…039) foram implementadas
**Quando** a suíte completa é executada com coverage
**Então** nenhum teste existente quebra (baseline `117e968` mantida), os testes
novos do Patch v5 passam, `test-report.json` é regenerado com `failed = 0` e
coverage **≥ 80%** (lines/functions/branches/statements), junto com a prova de
herança global do Cenário 49 — mantendo verde o gate antes da review do Argos

Automatizado: suíte completa `npm test` + `npx vitest run --coverage` com os
`--coverage.include` do protocolo do `test-report.json` + gate
`.agents/modules/milon/02-programas/test-report.json` (regenerado na TASK-041,
antes da review). **Resultado da TASK-041 (2026-09-30):** suíte **781/781 em
88 arquivos, 0 falhas** (exit 0), coverage **84,48% lines / 84,48% statements /
88,44% branches / 88,28% functions** (todos ≥ 80), `test-report.json`
regenerado com `failed = 0`, `npm run build-storybook` **exit 0** e prova de
herança do Cenário 49 reexecutada em verde (1 ocorrência — só
`components/ui/AsyncState.tsx`).
**Reexecução na TASK-045 (2026-10-01, gate CA-P6-6):** o mesmo protocolo
reexecutado após o Patch v6 → suíte **786/786 em 88 arquivos, 0 falhas**,
coverage **84,51% lines / 84,51% statements / 88,45% branches / 88,29%
functions** (todos ≥ 80), `test-report.json` regenerado com `failed = 0` e a
prova de herança do Cenário 49 mantida em verde.

---

## Patch v6 — Link no título do item da lista (CA-P6-1…5)

Cenários Dado/Quando/Então do **Patch v6 de link no título** (spec §T2 decisões
D28–D32, §T3 requisitos R32–R37, §T4 critérios CA-P6-1…6), acrescentados na
TASK-044 sem alterar nem renumerar nada dos 22 cenários do ciclo v1, dos 12 do
Patch v3, dos 8 do Patch v4 nem dos 9 do Patch v5 (Cenários 1–51 permanecem
intactos). Um bloco Dado/Quando/Então por critério (CA-P6-1 a CA-P6-5), no
mesmo formato das seções dos Patches v4 e v5, citando os testes automatizados
que o exercita (nomes conferidos em disco).

- **Execução:** subir o app (`npm run dev`), logar e abrir `/milon/programs` —
  a página de detalhe `/milon/programs/<id>` já existe desde o Patch v4; este
  patch só cria o link que aponta para ela (nenhuma rota nova).
- **Status:** conferência de disco de **2026-10-01** (Minos): `npx vitest run
  __tests__/components/milon/ProgramList.test.tsx` → **33 testes, 0 falhas**
  (describe "Patch v6 — título é link para o detalhe (TASK-042 RED)" verde
  desde a TASK-043/GREEN). **Suite completa e regeneração de
  `test-report.json` EXECUTADAS na TASK-045 (CA-P6-6, 2026-10-01), antes da
  review do Argos: 786/786 em 88 arquivos, 0 falhas, coverage 84,51% lines —
  gate PASS** (detalhe no bloco "Suite completa executada na TASK-045" no
  início deste arquivo e em `test-report.json`).
- **Classificação (buckets do checklist acima):** **executável** — **0
  `[BLOQUEADO — #3]`**: o patch não toca ativação, reativação nem ciclo de
  vida (muda só a apresentação do título), então nada aqui depende de conteúdo
  real de treinos nem de status `ativo`/`inativo` alcançáveis. **Ressalva:**
  com dados reais, até a feature #3 a lista só tem itens em `rascunho`
  (mesma ressalva do Cenário 16) — o clique, a afordância e a acessibilidade
  exercitam-se nele; a cobertura dos três status fica nos automatizados
  (CA-P6-2) e nos testes de contrato.
- **CA-P6-6 não vira cenário:** é gate de processo verificado pela TASK-045
  (`test-report.json` com `failed = 0` e coverage ≥ 80%), conforme spec T6 —
  precedente dos Cenários 34 (CA-P3-12) e 51 (CA-P5-9).

| # | Critério (spec §T4) | Decisão / req. | Automatizado em | Homologado |
|---|---|---|---|---|
| 52 | CA-P6-1 — título é link com href exato `/milon/programs/<id>` por item | D28 · R32 | ver Cenário 52 (bloco 1) | ☐ |
| 52 | CA-P6-2 — clique no título navega ao detalhe (rascunho, ativo, inativo) | D28 · R33 | ver Cenário 52 (bloco 2) | ☐ |
| 52 | CA-P6-3 — ações por status intactas e fora do link; ação nunca navega | D31 · R36 | ver Cenário 52 (bloco 3) | ☐ |
| 52 | CA-P6-4 — cor no hover + foco visível, sem sublinhado em qualquer estado | D30 · R35 | ver Cenário 52 (bloco 4) | ☐ |
| 52 | CA-P6-5 — heading `h3` e link com o mesmo nome acessível, foco visível | D29/D32 · R34, R37 | ver Cenário 52 (bloco 5) | ☐ |

---

### Cenário 52: Título do programa é link para a página de detalhe (CA-P6-1…5)

**Dado** (CA-P6-1) a lista de Programas renderizada com itens nos três status
(rascunho, ativo e inativo), cada um com seu id
**Quando** a pessoa olha o título de cada item
**Então** o título é um link (`Link` do Next.js) com href exatamente
`/milon/programs/<id>` **daquele item** — um link por item, sem barra final,
sem query e sem id de outro programa — nos três status

**Dado** (CA-P6-2) a mesma lista com o título de um item já renderizado como
link
**Quando** a pessoa clica no título
**Então** ela navega para `/milon/programs/<id>` **daquele programa** e vê o
cabeçalho dele (título, dono, status) — o caminho vale para rascunho, ativo e
inativo; a rota de destino é a mesma do Patch v4 (nenhuma rota nova nasce aqui)

**Dado** (CA-P6-3) a lista com as ações de cada status — rascunho: Editar,
Ativar e Excluir; ativo: Editar; inativo: Reativar
**Quando** a pessoa aciona uma dessas ações
**Então** o botão permanece à direita, **fora** do link, dispara o callback de
sempre (mesmo rótulo, mesma condição por status) e **nunca navega** para o
detalhe; dono e selo de status continuam texto simples não clicáveis e a linha
inteira não é clicável

**Dado** (CA-P6-4) o título em repouso, depois com o mouse sobre ele e depois
alcançado por teclado (Tab)
**Quando** a pessoa passa o mouse sobre o título ou navega até o link
**Então** em repouso a cor é o marrom `#B7602B` **sem sublinhado**; no hover a
cor muda para outro tom do marrom com transição (padrão dashboard,
Alternativa C) e **continua sem sublinhado**; com foco por teclado o foco é
**visível** (contorno na cor do módulo) e também sem sublinhado — **zero**
marcação de sublinhado em qualquer estado

**Dado** (CA-P6-5) a lista renderizada, com o título sendo heading de nível 3
e o link dentro dele
**Quando** a pessoa percorre os itens por teclado ou uma tecnologia assistiva
anuncia a tela
**Então** o título é identificado como **heading `h3`** com nome acessível
igual ao texto do programa e o elemento interno é identificado como **link
com o mesmo nome**, alcançável por teclado com foco visível — a hierarquia de
headings (h2 da seção → h3 por item) não muda e a linha não vira link

Automatizado: `__tests__/components/milon/ProgramList.test.tsx` → describe
"Patch v6 — título é link para o detalhe (TASK-042 RED)" (conferido verde em
2026-10-01, 33/33 no arquivo; **suite completa da TASK-045: 786/786 em 88
arquivos, 0 falhas**) → "CA-P6-1: cada título é link com href exatamente
'/milon/programs/<id>' do próprio item (1 link por item)" (bloco 1);
"CA-P6-2: o link está presente nos três status (rascunho, ativo, inativo) com
destino asserido pelo href exato" (bloco 2 — na suíte o caminho é asserido pelo
href exato; a **passagem real do clique** é a verificação manual deste cenário,
spec T4); "CA-P6-3: ações por status intactas e FORA do link — clique dispara o
callback; dono e selo seguem texto simples" (bloco 3); "CA-P6-4: afordância —
cor no hover com transição, foco visível e ZERO sublinhado em qualquer estado"
(bloco 4); "CA-P6-5: heading h3 e link com o MESMO nome acessível; o link é
âncora com href (alcançável por teclado)" (bloco 5).

---

## Fora do escopo confirmado pela spec (não homologar aqui)

- Conteúdo de treinos dentro do Programa (feature 3), "treino do dia"/rotação (feature 4),
  exclusão de ativo/inativo, transições `rascunho → inativo` e `ativo → rascunho`,
  permissões por usuário, IA em tempo de uso — todos em spec §4 (YAGNI).
