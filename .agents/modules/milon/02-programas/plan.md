# Programas (Mílon #2) Implementation Plan
> Para Zeus: delegar via hefesto/minos task por task, na ordem do DAG (TASK-001 → TASK-011)

**Objetivo:** Construir o container "Programa" com título, dono e status (rascunho/ativo/inativo), ciclo de vida com transições e guarda de ativação, tela própria com filtros select Dono + checks Status, pool de sugestões de título sorteada em runtime, e exclusão de rascunho com confirmação.
**Arquitetura:** UI em `app/milon/programs/page.tsx` consome `hooks/usePrograms` que consome barrels `db/programs` sobre `repositories/programs` via `IDatabaseClient`; regras puras de normalização/validação/sorteio vivem em `lib/milon/utils.ts` ou `lib/milon/program-utils.ts`; validação de formulário vive dentro do próprio modal; títulos de conteúdo usam token `font-display`.
**Tech Stack:** Next.js + React 18, Supabase via `IDatabaseClient` (`lib/shared`), Vitest + Testing Library, Storybook.

## Restrições Globais
- Programa tem dono (um dos 2 usuários), mas **qualquer um dos dois pode ver, criar, editar, transicionar e excluir** — dono é prioridade de exibição, não permissão.
- **Unicidade do ativo por dono:** no máximo um Programa ativo por dono; ativação/reativação desativa o anterior automaticamente. O mecanismo de concorrência que garante isso sob transações quase simultâneas **será definido neste plano** (repository com transação ou lock otimista).
- **Guarda de ativação:** ativar/reativar exige ≥1 treino com ≥1 exercício. Nesta feature o conteúdo não existe (feature 3), então a ação nasce **bloqueada com mensagem**; a mesma guarda será exercitada quando a feature 3 entregar conteúdo.
- **Exclusão só de rascunho:** ativo e inativo nunca têm ação de excluir.
- **Confirmação explícita** em ativar, reativar e excluir — modal no padrão existente (`components/pluto/DeleteConfirmModal.tsx`, `components/milon/DeleteExerciseConfirm.tsx`).
- **Título não-vazio** na criação e edição — bloqueio com mensagem visível, preserva digitado.
- **Pool de sugestões:** IA gera templates+pools uma vez → humano valida → sorteio combinatório em runtime (offline, sem serviço externo). A validação humana do material é task com critério "validado pelo humano".
- **Tela com filtros:** select Dono + checks Status; padrão dono próprio + todos status; ordenação criação desc (mais novo primeiro); reativar não altera posição por data de criação.
- Proibido criar `use-cases/`, `schemas/` (Zod), `mappers.ts`, `services/` ou factories `createXService`. Proibido importar `@supabase/*` fora de `lib/shared/`. Proibido importar o barrel `lib/milon/index.ts` — UI importa só via caminhos diretos `lib/milon/db/*`, `lib/milon/hooks/*`, `lib/milon/types.ts`.
- Contratos de repositório testados fakes-only (decisão 57): nenhum teste de contrato bate no banco real.
- Migração incremental nova em `utils/migrations/`, nunca editar migração já aplicada; registrar execução em `schema_migrations` com `spec_id`/`spec_name` linkando à feature-mãe.

## 1. Arquitetura
A feature segue o Mapa de Camadas pós-41/47/52 do AGENTS.md. A página `app/milon/programs/page.tsx` é enxuta (composição + modais) dentro de `MilonLayout`. Todo fetch/estado/operações vive em `lib/milon/hooks/usePrograms.ts` no padrão promise-chain + flag `cancelled`, consumindo standalones do barrel `lib/milon/db/programs.ts`, que re-exporta `lib/milon/repositories/programs.ts`. O repository recebe `IDatabaseClient`, ordena por data de criação desc no banco e aplica a regra de unicidade do ativo por dono como regra de persistência (transação ou lock otimista — decisão do plano). A normalização de título, validação de não-vazio, sorteio de sugestão e regras de transição vivem como funções puras em `lib/milon/program-utils.ts`, reutilizadas pelo hook e documentadas como contrato de dados para a feature #3. Os componentes (`ProgramList`, `ProgramModal`, `ProgramConfirmModal`) são presentacionais via props; o modal valida título obrigatório no próprio form. Cada componente novo ganha arquivo `.stories.tsx` ao lado.

## 2. Componentes (Create/Modify/Test/Docs)
**Create:**
- `utils/migrations/migration-0008-milon-programs.sql` — DDL da tabela nova + RLS + registro de auditoria (TASK-001).
- `lib/milon/program-utils.ts` — regras puras: normalização/validação de título, sorteio de sugestão (templates+pools), regras de transição, guarda de ativação (TASK-002).
- **Validação humana do material de sugestões** — revisão de TEMPLATES_SUGESTAO e POOLS_SUGESTAO (TASK-003).
- `lib/milon/repositories/programs.ts` — acesso a dados via `IDatabaseClient` + regra de unicidade do ativo por dono (TASK-004).
- `lib/milon/repositories/fakes/fakeProgramRepository.ts` — fake em memória implementando a interface, com seed (TASK-004).
- `lib/milon/db/programs.ts` — barrel `export *` sobre o repository, caminho oficial da UI (TASK-005).
- `lib/milon/hooks/usePrograms.ts` — fetch, filtros, CRUD, transições, loading/erro/retry, guarda de ativação (TASK-006).
- `components/milon/ProgramList.tsx` — lista, filtros select Dono + checks Status, ordenação criação desc, estados vazia/loading/erro/sem-resultado (TASK-007).
- `components/milon/ProgramModal.tsx` — modal único criar/editar com título pré-preenchido por sugestão sorteada (TASK-008).
- `components/milon/ProgramConfirmModal.tsx` — confirmação unificada para ativar/reativar/excluir (TASK-009).
- `components/milon/ProgramList.stories.tsx`, `components/milon/ProgramModal.stories.tsx`, `components/milon/ProgramConfirmModal.stories.tsx` — uma por componente novo (TASK-007/008/009).

**Modify:**
- `lib/milon/types.ts` — adiciona tipos de linha, domínio e inputs do Programa (TASK-001).
- `lib/milon/repositories/interfaces.ts` — adiciona interface do repositório de Programas (TASK-004).
- `lib/milon/repositories/index.ts`, `lib/milon/hooks/index.ts` — adicionar re-exports de `programs` (TASK-004/005/006).
- `app/milon/programs/page.tsx` — tela de Programas: composição + modais + wiring do hook (TASK-010).

**Test (Minos cria; caminhos travados aqui):**
- `__tests__/lib/milon/program-utils.test.ts` (TASK-002).
- `__tests__/lib/milon/repositories/contract-programs.test.ts` fakes-only (TASK-004).
- `__tests__/lib/milon/db/programs.test.ts` (TASK-005).
- `__tests__/lib/milon/hooks/usePrograms.test.ts` (TASK-006).
- `__tests__/components/milon/ProgramList.test.tsx`, `ProgramModal.test.tsx`, `ProgramConfirmModal.test.tsx` (TASK-007/008/009).
- `__tests__/app/milon/programs/page.test.tsx` com factories de mock com defaults + helper `clickConnectedButton` (TASK-010).
- Suite final Minos cobre todos os paths acima + `npm run build-storybook` (TASK-011).

**Docs:** nenhum arquivo de documentação novo; `test-report.json` e `test-scenarios.md` da feature são produzidos por Minos na execução, fora deste plano.

## 3. Contratos (descrições textuais, sem implementação)
- **Tipos (`lib/milon/types.ts`):** tipo de linha do banco com os campos id (UUID), título (texto), dono (texto — um dos 2 usuários), status (enum: rascunho/ativo/inativo), data de criação, auditoria de criador; tipo de domínio com os mesmos dados em convenção camelCase para status e data; input de criação com título, dono e status (default rascunho); input de atualização com título e status (dono não muda após criação).
- **Migração (`utils/migrations/migration-0008-milon-programs.sql`):** cria a tabela `public.programs` com identificador UUID gerado pelo banco, título texto obrigatório, dono texto obrigatório (um dos 2 emails conhecidos), status texto com check constraint para os 3 valores e default 'rascunho', data de criação com padrão de agora, coluna de auditoria de criador; habilita segurança de linha com política de permissão total para usuários autenticados; cria índice para dono e data de criação (ordenação desc); cria índice parcial único para garantir no máximo um ativo por dono (`WHERE status = 'ativo'`); insere registro de auditoria em `schema_migrations` com `spec_id='milon-02'`, `spec_name='Programas'`, `script_name='migration-0008-milon-programs.sql'`, conflito ignorado pelo nome do script.
- **Utilidades puras (`lib/milon/program-utils.ts`):** constante com templates de sugestão (array de strings com slots `{adj}`, `{substantivo}`, `{complemento}`); constante com pools de palavras por slot (adjetivos, substantivos, complementos — tom humor maromba, validados pelo humano); função de normalização de título (trim + colapso de espaços); função de validação de título não-vazio (retorna erro ou null); função de sorteio de sugestão que escolhe um template aleatório e preenche cada slot com palavra aleatória do pool correspondente; função que determina transições permitidas dado status atual (retorna array de ações possíveis); função de guarda de ativação que recebe flag `hasWorkoutWithExercise` e retorna erro se falso; função que aplica efeito colateral de ativação (dado lista de programas e dono do novo ativo, retorna lista com o anterior ativo desse dono virado inativo).
- **Interface do repositório (`lib/milon/repositories/interfaces.ts`):** operações de listar tudo ordenado por created_at desc, buscar por id, criar, atualizar por id (título e status), remover por id, buscar ativo por dono. Criação e atualização de status para 'ativo' executam em transação (ou lock otimista) que garante unicidade do ativo por dono: desativa o anterior ativo do mesmo dono e insere/atualiza o novo ativo atomicamente. Listagem ordena por created_at desc no próprio banco.
- **Fake (`repositories/fakes/fakeProgramRepository.ts`):** implementação em memória da interface com método de seed inicial, gerando ids sequenciais de fake; aplica a mesma regra de unicidade do ativo por dono na criação/atualização de status para 'ativo' (desativa anterior do mesmo dono); rejeita duplicados de título normalizado no mesmo dono se houver (opcional, não é regra de negócio).
- **Hook (`lib/milon/hooks/usePrograms.ts`):** estado de lista completa ordenada, filtro de dono (select), filtros de status (checks), indicador de carregamento, mensagem de erro com nova tentativa, aviso breve de sucesso, operações de salvar (criar ou atualizar título), ativar, reativar, remover (só rascunho), recarregar. Filtragem aplicada em memória: select de dono filtra por igualdade; checks de status filtram por inclusão; padrão ao montar: dono = usuário logado (via `getUserEmail()` do client), status = todos marcados. Guarda de ativação/reativação: antes de executar, verifica `hasWorkoutWithExercise` (flag passada pelo hook — na feature 2 sempre false, na feature 3 virá do conteúdo); se false, bloqueia com mensagem e não chama repository. Transições permitidas derivadas do status atual via `program-utils`. Confirmação antes de ativar/reativar/excluir via estado de modal de confirmação no hook.
- **ProgramList (props):** itens filtrados, opções de dono (array dos 2 emails), filtro de dono ativo, filtros de status ativos, estados de carregamento/erro/vazia/sem-resultado, callbacks de trocar filtro de dono, trocar checks de status, editar, ativar/reativar, excluir por item. Título de seção com token de título. Item mostra título, dono, status (badge), ações permitidas pelo status.
- **ProgramModal (props):** aberto/fechado, programa em edição ou nulo (criação), sugestão sorteada para pré-preencher título na criação, estado de gravação, mensagem de erro e mensagem de sucesso; callbacks de fechar e de salvar recebendo título. Comportamento: na criação, título vem pré-preenchido com sugestão; na edição, título vem do programa; validação de título não-vazio no submit; falha mantém aberto com erro visível e digitado preservado; botões desabilitados durante a gravação; cancelar fecha sem alterar nada.
- **ProgramConfirmModal (props):** aberto/fechado, ação alvo ('ativar' | 'reativar' | 'excluir'), título e dono do programa alvo, estado de processamento, callback de confirmar e de cancelar. Rótulo do botão de confirmar varia pela ação ("Ativar", "Reativar", "Excluir"); estado ocupado mostra "Ativando…"/"Reativando…"/"Excluindo…".
- **Página (`app/milon/programs/page.tsx`):** compõe `MilonLayout` com título da tela, `ProgramList` e os dois modais, ligada ao hook; edição abre `ProgramModal` preenchido a partir do item da lista; ativar/reativar/excluir abrem `ProgramConfirmModal` com dados do item.

## 4. Data Flow
Abrir a tela dispara o hook, que busca a lista ordenada via standalone do barrel `db/programs`, marcando carregamento e depois exibindo itens filtrados ou os estados de vazia/erro. Trocar filtro de dono ou checks de status atualiza o estado do hook, que refiltra em memória. Criar/editar abre o `ProgramModal`; na criação, o hook sorteia uma sugestão via `program-utils` e passa para o modal; confirmar salva via hook (cria ou atualiza título), recarrega a lista em segundo plano e fecha o modal. Ativar/reativar/excluir abrem o `ProgramConfirmModal`; confirmar executa a operação via hook (ativar/reativar checam guarda de ativação antes; excluir só permite se status === 'rascunho'), recarrega a lista e fecha o modal. Falhas de gravação mantêm o modal aberto com erro; falhas de busca mostram erro com nova tentativa. A feature #3 consumirá depois a listagem, o filtro, a busca do ativo por dono e a regra de unicidade deste contrato.

## 5. Decisões Técnicas
- **Unicidade do ativo por dono sob concorrência:** índice parcial único no banco (`CREATE UNIQUE INDEX idx_programs_one_active_per_owner ON public.programs (owner) WHERE status = 'ativo'`) + repository tenta inserir/atualizar em transação; se violação de índice único, relança erro amigável ("já existe um programa ativo para este dono — ative outro para substituir"). Esta é a garantia mais simples e robusta; o lock otimista em aplicação seria mais complexo sem ganho para 2 usuários.
- **Filtragem em memória no hook (não no banco):** o cliente de banco do projeto só expõe igualdade e ordenação simples; fazer no hook com funções puras testáveis mantém contrato reutilizável pela #3 e evita divergência. Custo: carrega a lista inteira; irrelevante para o volume de dois usuários.
- **`created_by` como auditoria NOT NULL** (padrão das tabelas do projeto), sem nunca filtrar por ela: preserva o padrão de auditoria.
- **Modal com estado de form interno** (não na página): a página fica só composição + modais conforme o mapa de camadas, e o contrato de "nunca fecha no erro + preserva digitado + foco" fica encapsulado e testável no componente.
- **Confirmação unificada em `ProgramConfirmModal`**: reusa o padrão visual/comportamental dos modais existentes (Pluto/Mílon 1) com rótulo e estado ocupado parametrizados; evita duplicação de código.
- **Sugestão sorteada no hook na criação**: o hook chama `sortearSugestao()` de `program-utils` ao abrir para criação; nova abertura = novo sorteio. O material (templates+pools) vive em `program-utils.ts` como constantes exportadas, validado pelo humano na task correspondente.
- **Contratos fakes-only**: segue a decisão 57 já aplicada no módulo; velocidade e determinismo dos testes de contrato.

## 6. Riscos e Mitigações
- **Condição de corrida na ativação simultânea dos dois usuários:** mitigada por índice parcial único no banco + tratamento de erro de violação no repository com mensagem orientadora.
- **Divergência entre validação de título no modal e no repository:** mitigada por função única `validarTitulo` em `program-utils.ts` usada pelos dois caminhos.
- **Regressão nos placeholders do scaffold:** não há placeholders novos nesta feature; a estrutura base já foi limpa na #1.
- **Quebra futura pela #3:** mitigada pelo contrato de dados estável (listar, filtrar, buscar ativo por dono, regra de unicidade) sem expor o modal como seletor; proteção de histórico declarada como responsabilidade da #3.
- **Material de sugestões com tom inadequado:** mitigado pela task de validação humana do material antes de entrar no produto; ajuste é trocar o material embarcado, não a arquitetura.
- **Migração conflitando com tabelas financeiras/exercises:** mitigada por tabela nova isolada `public.programs` sem chaves para outras tabelas.

## Cobertura spec → tasks
Cada item da spec seção 3 tem task: campos e tela própria (001/010), status e transições com efeito colateral (004/006), unicidade do ativo por dono (004 índice parcial + repository), guarda de ativação (002/006), edição por status (006/008), confirmação em ações (009/010), exclusão só rascunho (006/009/010), tela com filtros select+checks+padrão+ordenação (007/010), dono como prioridade de exibição (007/010 padrão do filtro), pool de sugestões IA+humano+runtime (002/003/008), título não-vazio (002/008). YAGNI da seção 4 é respeitado: nenhuma transição extra, nenhuma exclusão de ativo/inativo, nenhuma permissão restrita, nenhuma exibição prioritária fora desta tela, nenhum conteúdo de treino, nenhuma reordenação/gestão avançada.

## Número de Migração Reservado
**0008** — verificado em `utils/migrations/`: existem 7 arquivos (6 legados `migration-feature-*` equivalentes a 0001–0006 + `migration-0007-milon-exercises.sql`). Próximo inteiro sequencial é 0008. Arquivo será `utils/migrations/migration-0008-milon-programs.sql` com `spec_id='milon-02'`, `spec_name='Programas'`.

---

# Patch v3 — Navegação em abas do Mílon (Aditivo ao Plano v1)

> **Objetivo do patch:** Implementar a navegação por abas no módulo Mílon (Exercícios ↔ Programas), redirect da raiz `/milon` para `/milon/programs`, destaque de aba ativa no `ModuleLayout` compartilhado (impacto transversal no Pluto), e atualização dos textos descritivos dos cards do dashboard. **Sem migração SQL** — patch é somente rotas/UI.

**Arquitetura do patch:** Segue o Mapa de Camadas do AGENTS.md. Mudanças confinadas a:
- `app/milon/page.tsx` → vira server component com `redirect('/milon/programs')` (R3).
- `app/milon/exercises/page.tsx` (novo) → recebe a composição da biblioteca (mesmo conteúdo/homologação da spec v2, só muda a URL) (R1).
- `components/milon/MilonLayout.tsx` → declara `navItems` com as duas abas (R5).
- `components/layout/ModuleLayout.tsx` → deriva aba ativa de `usePathname()` e marca visual/acessível (R8–R10, impacto transversal aceito D12).
- `app/dashboard/page.tsx` → substitui os dois parágrafos descritivos pelos textos exatos de D13 (R11).
- Testes espelhados movidos/atualizados conforme P6.

**Tech Stack:** Next.js App Router (`redirect` server-side), `usePathname` client-side, Vitest + Testing Library.

## Restrições Globais do Patch
- **Nenhuma migração SQL** — o patch não toca banco, hooks, repositories, tipos nem utils de `lib/milon/*`.
- **Pluto não é reestruturado** — rotas, ordem e rótulos das abas existentes permanecem; só recebe o destaque de aba ativa via `ModuleLayout` (D12).
- **Dashboard hrefs inalterados** — card Mílon continua em `/milon` (funciona via redirect), card Pluto continua em `/pluto/budget`.
- **Mascote sem impacto** — `lib/hestia/mascots.ts` resolve por prefixo `/milon` (cobre `/milon/exercises` e `/milon/programs`).
- **YAGNI P5 respeitado** — sem home feature 4, sem reestruturação Pluto, sem rota de treinos.

## 1. Arquitetura do Patch

### Rotas
- `/milon` (raiz): **server component** que executa `redirect('/milon/programs')` — funciona para digitação direta, refresh e navegação client-side via `<Link href="/milon">` do dashboard.
- `/milon/exercises`: **client component** (mesmo padrão de `app/milon/page.tsx` atual) — composição da biblioteca dentro de `MilonLayout` com `pageTitle="Biblioteca de exercícios"`, `pageSubtitle="Cadastre uma vez e reuse nos treinos"`.
- `/milon/programs`: **inalterado** — continua como `app/milon/programs/page.tsx` (client component, feature v1 homologada).

### Navegação (Abas)
- `MilonLayout.tsx` passa `navItems=[{href:"/milon/exercises",label:"Exercícios"},{href:"/milon/programs",label:"Programas"}]` para `ModuleLayout`.
- `ModuleLayout.tsx` (compartilhado) recebe `navItems`, usa `usePathname()` para determinar qual `href` casa com a URL atual (match exato ou prefixo), e renderiza a barra `<nav>` com links onde **exatamente um** tem `aria-current="page"` + estilo distinto (cor do módulo + sublinhado/negrito). Mesmo comportamento para Pluto (transversal).

### Dashboard
- `app/dashboard/page.tsx`: card Mílon → `"Módulo de Acompanhamento de Treinos e Evolução"`; card Pluto → `"Módulo Orçamentário e Financeiro"`. Títulos ("Mílon"/"Pluto"), hrefs, mascotes e layout permanecem.

## 2. Componentes (Create/Modify/Test/Docs) — Patch v3

**Create:**
- `app/milon/exercises/page.tsx` — tela da biblioteca na rota nova (mesma composição do `app/milon/page.tsx` atual).
- `__tests__/app/milon/exercises/page.test.tsx` — espelho do teste da biblioteca, movido da rota antiga + cenário de redirect.

**Modify:**
- `app/milon/page.tsx` — **substituição total**: vira server component com `redirect('/milon/programs')` (remove "use client", remove toda composição da biblioteca).
- `components/milon/MilonLayout.tsx` — `navItems` deixa de ser array vazio e passa a declarar as duas abas.
- `components/layout/ModuleLayout.tsx` — adiciona lógica de aba ativa derivada de `usePathname()`; marca `aria-current="page"` no link ativo; estilo visual distinto (cor do módulo + `font-display` + sublinhado/negrito).
- `app/dashboard/page.tsx` — substitui os dois parágrafos `text-sm text-muted-foreground` pelos textos exatos de D13.

**Test (Minos cria; caminhos travados aqui):**
- `__tests__/app/milon/exercises/page.test.tsx` — migração do `__tests__/app/milon/page.test.tsx` (mesmos ~15 cenários, agora na rota nova) + **teste novo** cobrindo redirect `/milon` → `/milon/programs` (server component, testa via `render` + `waitFor` URL ou mock de `redirect`).
- `__tests__/app/dashboard/page.test.tsx` — atualiza asserções dos textos dos cards (CA-P3-08, CA-P3-10); renomeia teste "renders Milon card linking to the exercise library" para refletir destino real (Programas).
- `__tests__/app/pluto/budget/page.test.tsx`, `__tests__/app/pluto/months/page.test.tsx`, `__tests__/app/pluto/transactions/page.test.tsx` — **adicionam asserções** de aba ativa: em cada página, o link da nav correspondente à URL tem `aria-current="page"` e estilo ativo (CA-P3-07).
- `.agents/modules/milon/02-programas/test-scenarios.md` — ganha cenários Dado/Quando/Então de navegação (redirect raiz, duas abas, aba ativa, textos dashboard).
- `.agents/modules/milon/02-programas/test-report.json` — regenerado por Minos (rota nova + arquivo de teste espelhado alteram contagens/cobertura).

**Docs:** registro da norma D14 na documentação transversal é handoff para Mnemósine (fora deste plano).

## 3. Contratos (descrições textuais, sem implementação)

- **Redirect server-side (`app/milon/page.tsx`):** exporta `default function MilonRootPage()` sem `"use client"`; importa `redirect` de `next/navigation`; executa `redirect('/milon/programs')`. Nenhum JS client-side enviado para esta rota.
- **Página de exercícios (`app/milon/exercises/page.tsx`):** client component (`"use client"`), mesma estrutura do `app/milon/page.tsx` atual: usa `useExercises`, `MilonLayout` com `pageTitle="Biblioteca de exercícios"`, `pageSubtitle="Cadastre uma vez e reuse nos treinos"`, `ExerciseList`, `ExerciseModal`, `DeleteExerciseConfirm`. Props e wiring idênticos.
- **MilonLayout (`components/milon/MilonLayout.tsx`):** `navItems` constante com dois objetos `{href,label}`; passa para `ModuleLayout` inalterado.
- **ModuleLayout (`components/layout/ModuleLayout.tsx`):** recebe `navItems` (opcional, default `[]`); usa `usePathname()`; para cada item, determina `isActive = pathname === item.href || pathname.startsWith(item.href + '/')`; renderiza `<Link>` com `aria-current={isActive ? "page" : undefined}` e classe condicional de estilo ativo (ex.: `border-b-2 font-semibold` na cor do módulo). **Sem regra por módulo** — mesmo código serve Mílon e Pluto.
- **Dashboard (`app/dashboard/page.tsx`):** dois `<p className="text-sm text-muted-foreground">` substituídos literalmente pelos textos de D13.

## 4. Data Flow do Patch

1. Usuário acessa `/milon` (digitação, refresh, ou clica card do dashboard) → server component `app/milon/page.tsx` executa `redirect('/milon/programs')` → browser navega para `/milon/programs` → `ProgramsPage` renderiza com aba "Programas" ativa.
2. Usuário acessa `/milon/exercises` diretamente → client component `app/milon/exercises/page.tsx` renderiza biblioteca com aba "Exercícios" ativa.
3. Usuário em `/milon/exercises` clica aba "Programas" → `<Link href="/milon/programs">` → navegação client-side → `ProgramsPage` renderiza com aba "Programas" ativa.
4. Qualquer URL do Pluto (`/pluto/budget`, `/pluto/months`, `/pluto/transactions`) → `ModuleLayout` deriva `pathname` → marca aba correspondente como ativa (transversal).

## 5. Decisões Técnicas do Patch

- **Redirect server-side vs client-side:** Escolhido server component com `redirect()` de `next/navigation` — funciona para todos os cenários (digitação, refresh, `<Link>`), sem flash de conteúdo errado, sem depender de `useEffect`/`useRouter`. Alternativa client-side (`useRouter().push`) descartada: piscaria a biblioteca antes de redirecionar.
- **Match de aba ativa:** `pathname === href || pathname.startsWith(href + '/')` — cobre rota exata e rotas filhas futuras (ex.: `/milon/exercises/novo` manteria "Exercícios" ativa). Mesmo algoritmo para Mílon e Pluto.
- **Estilo de aba ativa:** `border-b-2` na `color` do módulo + `font-semibold` + `aria-current="page"` — acessível e visualmente claro, sem novo token CSS.
- **Busca por placeholder da rota antiga:** Critério de substituição — `grep -r "app/milon/page" --include="*.tsx" | grep -v "exercises" | grep -v "programs"` deve retornar 0 ocorrências de composição da biblioteca na rota raiz (apenas o redirect permanece).

## 6. Riscos e Mitigações do Patch

- **Flash de conteúdo no redirect:** Mitigado por server-side redirect (nenhum HTML da biblioteca é enviado para `/milon`).
- **Quebra de testes existentes da biblioteca:** Mitigado movendo o arquivo de teste para o novo caminho espelhado (`__tests__/app/milon/exercises/page.test.tsx`) e mantendo os mesmos mocks/cenários — só a importação da página muda.
- **Pluto muda visualmente (aba ativa):** Aceito explicitamente pelo humano (D12); declarado para Argos avaliar como mudança aprovada. Testes de Pluto ganham asserções de aba ativa para travar regressão.
- **Dashboard card Mílon aponta para `/milon` mas cai em Programas:** Comportamento intencional (D11); único link interno afetado verificado por busca (só `app/dashboard/page.tsx`).
- **Ordem visual das abas do Mílon:** Não especificada no patch (P5); implementação segue a ordem declarada no `navItems` (Exercícios primeiro, Programas segundo) — se humano quiser inverter, é ajuste de uma linha no `MilonLayout`.

## Cobertura Patch v3 → Tasks Novas (TASK-012 em diante)

| Requisito | Task(s) |
|---|---|
| R1 (biblioteca em `/milon/exercises`) | TASK-013 (página), TASK-017 (teste espelho) |
| R2 (`/milon/programs` inalterado) | — (nenhuma task, apenas regressão) |
| R3 (redirect `/milon` → `/milon/programs`) | TASK-012 (redirect), TASK-017 (teste redirect) |
| R4 (nenhum link interno para rota antiga) | TASK-012 (critério busca retorna 0) |
| R5/R6/R7 (duas abas, não substitui header, links navegáveis) | TASK-014 (MilonLayout navItems), TASK-015 (ModuleLayout aba ativa) |
| R8/R9/R10 (aba ativa única, derivada da URL, transversal Pluto) | TASK-015 (ModuleLayout), TASK-019 (testes Pluto aba ativa) |
| R11/R12 (textos dashboard, norma D14) | TASK-016 (dashboard textos), TASK-018 (testes dashboard) |
| P6 (impactos de teste) | TASK-017, TASK-018, TASK-019, TASK-020 (test-scenarios) |
| Regressão suite completa | TASK-021 (suite final Minos) |

## Critérios de Substituição (regra Atena)

- **TASK-012:** `grep -r "Biblioteca de exercícios" app/milon/page.tsx` retorna 0 (a página raiz não compõe mais a biblioteca).
- **TASK-013:** `app/milon/exercises/page.tsx` existe e exporta component client com `pageTitle="Biblioteca de exercícios"`.
- **TASK-014:** `components/milon/MilonLayout.tsx` exporta `navItems` com exatamente 2 itens: `href="/milon/exercises" label="Exercícios"` e `href="/milon/programs" label="Programas"`.
- **TASK-015:** `components/layout/ModuleLayout.tsx` renderiza `navItems` com `aria-current="page"` no item ativo derivado de `usePathname()`; busca por `aria-current` no componente retorna ocorrências.
- **TASK-016:** `app/dashboard/page.tsx` contém exatamente `"Módulo de Acompanhamento de Treinos e Evolução"` e `"Módulo Orçamentário e Financeiro"`; busca pelos textos antigos retorna 0.