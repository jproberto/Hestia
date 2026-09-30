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

---

# Patch v4 — Origens de mensagem, rota de detalhe e navegação pós-salvar (Aditivo ao Plano v1 + Patch v3)

> **Objetivo do patch:** (B) separar as três origens de mensagem da tela de Programas — carga continua com banner + "Tentar novamente"; bloqueio de domínio e erro de operação fecham o `ProgramConfirmModal` e exibem banner **sem** retry (D15/R13–R17); (C) criar a rota `/milon/programs/[id]` exibindo **apenas o cabeçalho** do programa (D16/R18/R19) e navegar para ela ao **criar**, permanecendo na lista ao **editar** (D17/R20/R21). **Sem migração SQL, sem bump de versão.**

**Arquitetura do patch:** Continua o Mapa de Camadas pós-41/47/52. O canal de origem entra como **segundo campo de estado** em `lib/milon/hooks/usePrograms.ts` (o `errorMsg` homologado mantém nome e tipo) e vira uma prop obrigatória em `components/milon/ProgramList.tsx`, que passa a decidir o retry pela origem. O fechamento do modal sai do catch "Mantém a confirmação aberta" e passa a ocorrer em **todos** os terminais de confirmação em `app/milon/programs/page.tsx`, que também consome o `Program` devolvido por `save()` para navegar na criação. A página de detalhe é uma rota nova client component com fetch em hook dedicado `useProgramDetail(id)` sobre o standalone `findProgramByIdStandalone` já existente no barrel `db/programs`.

**Tech Stack:** inalterada — Next.js 16 App Router (client components; `useParams`/`useRouter` de `next/navigation`), React 18, Vitest + Testing Library, Storybook. Nenhum toque em banco.

## Restrições Globais do Patch v4
- **Nenhuma migração SQL nova:** o patch só lê o modelo já existente (`id`, `title`, `owner`, `status`, `created_at`, `created_by`); nenhum arquivo em `utils/migrations/` é criado ou editado.
- **Sem task de bump (SemVer):** nenhuma alteração de versão de pacote ou de contrato público de lib.
- **`components/milon/ProgramConfirmModal.tsx` inalterado** — D15 muda *quem* fecha o modal (a página), não o componente: mesmos rótulos, títulos, estados de processamento e backdrop.
- **Spec v2 e Patch v3 íntegros:** ciclo de vida rascunho→ativo⇄inativo, unicidade do ativo por dono, guarda de ativação, edição por status, confirmações, exclusão de rascunho, filtros, ordenação, sugestões, D9–D14 e as duas abas permanecem; nenhuma aba nova e nenhuma rota além de `/milon/programs/[id]` é acrescentada.
- **`save()` não muda de contrato:** já devolve o `Program` criado (`UseProgramsReturn.save`), portanto R20 consome o retorno existente sem alterar assinatura.
- **Formulário de criação/edição intocado:** validação de título não-vazio, sugestão sorteada e mensagem de erro dentro do modal seguem como homologado (erro de save continua não alimentando a lista).
- **Erro de carga da lista mantido exatamente:** banner + "Tentar novamente" + recarregar (R14/CA-P3-15).
- **Nenhum texto de treinos em `/milon/programs/[id]`** — sem placeholder, sem seção, sem "Treinos em breve" (CA-P3-20); a feature 3 é quem traz treinos.
- **Sem entrada na lista para o detalhe (Q5):** `ProgramList.tsx` não ganha link, href nem clique que navegue para `/milon/programs/<id>`; as únicas entradas do detalhe são a navegação pós-criação (R20) e o acesso direto por endereço (R18). Editar/ativar/reativar/excluir a partir do detalhe também ficam fora — as ações continuam na lista.
- Proibições do Mapa de Camadas seguem valendo: sem `use-cases/`, `schemas/` (Zod), `mappers.ts`, `services/` ou factories `createXService`; sem `@supabase/*` fora de `lib/shared/`; UI consome dados só via `lib/milon/db/*`; tipos só via `lib/milon/types.ts`.

## 1. Arquitetura do Patch v4

### Item B — três origens de mensagem (D15, R13–R17)
- `lib/milon/hooks/usePrograms.ts` mantém `errorMsg: string | null` e ganha `errorOrigin: ProgramErrorOrigin | null`, com quatro pontos de gravação já mapeados no código: efeito de montagem e `fetchList` (hoje linhas 81–99 e 137–149) → origem `carga`; bloqueio da guarda de ativação/reativação (hoje 205–208) e regra "somente rascunho pode excluir" (hoje 241–246) → origem `bloqueio`; falha de repositório em ativar/reativar (hoje 222–226) e em excluir (hoje 250–254) → origem `operacao`; todo caminho de sucesso zera os dois campos. `save()` continua fora desse canal (erro fica no modal).
- `lib/milon/types.ts` recebe o tipo union `ProgramErrorOrigin` com exatamente três valores literais: `carga`, `operacao`, `bloqueio` — fonte única consumida pelo hook e pelo componente.
- `components/milon/ProgramList.tsx` ganha a prop obrigatória `errorOrigin` e deixa de mostrar retry para toda mensagem (hoje 93–97): o botão "Tentar novamente" só é renderizado quando há erro **e** a origem é `carga`; para `operacao` e `bloqueio` só a mensagem, no mesmo banner do corpo da página.
- `app/milon/programs/page.tsx` repassa `errorOrigin` do hook ao `ProgramList` e fecha a confirmação em **todos** os terminais de `handleConfirm` (sucesso, bloqueio e falha), substituindo o comentário "Mantém a confirmação aberta" — assim a mensagem nunca fica atrás do backdrop `z-50` (R17/CA-P3-16).

### Item C — rota de detalhe e navegação (D16/D17, R18–R21)
- **Create** `lib/milon/hooks/useProgramDetail.ts` — hook dedicado de um único registro (não reutiliza `usePrograms`, que carrega lista inteira, filtros e estado de confirmação): recebe `id`, busca via `findProgramByIdStandalone` do barrel `lib/milon/db/programs.ts`, devolve `program`, `loading`, `error`, `retry`, no padrão promise-chain + flag `cancelled`.
- **Create** `app/milon/programs/[id]/page.tsx` — client component; lê o parâmetro com `useParams` de `next/navigation` (Next 16 entrega `params` como Promise em client components; `useParams` é o caminho síncrono e já aparece mockado nos testes do projeto); compõe `MilonLayout` com `pageTitle="Programa"` e renderiza **só** o cabeçalho: título com token `font-display`, dono e badge de status. Quatro estados mutuamente exclusivos: carregando, falha de fetch (banner com "Tentar novamente", mesmo padrão de carga do módulo), id desconhecido (estado de erro/estado vazio do padrão do módulo, com explicação) e cabeçalho do programa.
- `app/milon/programs/page.tsx` — na criação, captura o retorno de `save()` e faz `push` para `/milon/programs/<id>`; na edição, não navega (permanece na lista, CA-P3-19).
- A aba "Programas" já fica ativa na rota de detalhe pela regra de prefixo do Patch v3 (`pathname.startsWith(item.href + '/')` em `components/layout/ModuleLayout.tsx`) — nenhuma mudança é necessária nesse arquivo.

## 2. Componentes (Create/Modify/Test/Docs) — Patch v4

**Create:**
- `lib/milon/hooks/useProgramDetail.ts` — fetch de um programa por id (TASK-027).
- `app/milon/programs/[id]/page.tsx` — página de detalhe com cabeçalho (TASK-027).

**Modify:**
- `lib/milon/types.ts` — adiciona `ProgramErrorOrigin` (TASK-023).
- `lib/milon/hooks/usePrograms.ts` — estado `errorOrigin` + gravação nas quatro origens (TASK-023).
- `components/milon/ProgramList.tsx` — prop `errorOrigin`, retry exclusivo da carga, import de `STATUS_LABEL` (TASK-023).
- `components/milon/ProgramList.stories.tsx` — stories de erro por origem (TASK-023).
- `lib/milon/program-utils.ts` — exporta `STATUS_LABEL` (rascunho/ativo/inativo), que passa a ser a única fonte dos rótulos de status (TASK-023).
- `app/milon/programs/page.tsx` — fecha a confirmação em todos os terminais, repassa `errorOrigin`, navega na criação (TASK-025).
- `lib/milon/hooks/index.ts` — re-exporta `useProgramDetail` (TASK-027).

**Inalterado (declaração explícita):** `components/milon/ProgramConfirmModal.tsx`, `components/milon/ProgramModal.tsx`, `components/milon/MilonLayout.tsx`, `components/layout/ModuleLayout.tsx`, `app/milon/exercises/page.tsx`, `app/dashboard/page.tsx`, `lib/milon/repositories/*`, `lib/milon/db/*`, `utils/migrations/*`.

**Test (Minos cria; caminhos travados aqui):**
- `__tests__/lib/milon/hooks/usePrograms.test.ts` — origem da mensagem nas 4 gravações (TASK-022).
- `__tests__/components/milon/ProgramList.test.tsx` — banner com retry só na carga (TASK-022).
- `__tests__/app/milon/programs/page.test.tsx` — modal fecha + navegação pós-criação/edição (TASK-024).
- `__tests__/lib/milon/hooks/useProgramDetail.test.ts` (TASK-026).
- `__tests__/app/milon/programs/[id]/page.test.tsx` (TASK-026).
- `.agents/modules/milon/02-programas/test-scenarios.md` — ganha os cenários Dado/Quando/Então do Patch v4 (TASK-028).
- `.agents/modules/milon/02-programas/test-report.json` — regenerado por Minos (rota nova + testes novos mudam contagens/cobertura) (TASK-029).

**Docs:** registro do handoff dos cenários de treino para a feature 3 (spec Q7, `.agents/modules/milon/backlog.md`) é **fora deste plano** — Mnemósine o faz na fase de documentação; não gera task nem gate aqui.

## 3. Contratos do Patch v4 (descrições textuais, sem implementação)

- **Tipo de origem (`lib/milon/types.ts`):** union de string literal exportada como `ProgramErrorOrigin` com exatamente três valores: `carga`, `operacao`, `bloqueio` (sem acento, ASCII). Nenhum quarto valor.
- **Hook `usePrograms` (estado):** `UseProgramsReturn` ganha o campo `errorOrigin: ProgramErrorOrigin | null`, nulo quando não há mensagem. Regras de gravação: falha do fetch da lista (montagem e `fetchList`) grava mensagem com origem `carga`; bloqueio da guarda de ativação/reativação e regra de exclusão de não-rascunho grava origem `bloqueio`; falha de repositório em ativar, reativar e excluir grava origem `operacao`; qualquer sucesso zera `errorMsg` e `errorOrigin`; `save()` não grava em nenhum dos dois (relança para o modal). Mensagens atuais preservadas literalmente.
- **ProgramList (props):** acrescenta `errorOrigin: ProgramErrorOrigin | null` (obrigatória, nullable) ao contrato já existente. Renderização do banner: a mensagem continua no mesmo bloco do corpo; o botão "Tentar novamente" aparece **somente** quando houver `error` e `errorOrigin` for `carga`; para `operacao` ou `bloqueio` renderiza apenas a mensagem. Demais props e estados (loading, empty, noResults, filtros, ações) inalterados.
- **Rótulos de status (`lib/milon/program-utils.ts`):** exporta o mapa de rótulos de status (`Rascunho`, `Ativo`, `Inativo`) indexado por `ProgramStatus`; `ProgramList` e a página de detalhe importam dele — a constante local deixa de existir em `ProgramList.tsx`.
- **Página de lista (`app/milon/programs/page.tsx`):** `handleConfirm` encerra com o fechamento da confirmação em **qualquer** terminal — sucesso, bloqueio de domínio ou falha de operação — limpendo o estado local de confirmação e o estado do hook, e devolvendo o processamento a falso; a mensagem permanece no banner do corpo via `errorMsg`/`errorOrigin`. `handleModalSave` na criação usa o `Program` devolvido por `save(title)` e navega para `/milon/programs/` concatenado com o `id` desse programa; na edição (`save(title, editingProgram.id)`) não navega. A página repassa `errorOrigin` do hook para a prop homônima do `ProgramList`. Uso de `useRouter` vindo de `next/navigation`.
- **Hook `useProgramDetail` (`lib/milon/hooks/useProgramDetail.ts`):** função `useProgramDetail(id: string)` devolvendo `program: Program | null`, `loading: boolean`, `error: string | null` e `retry: () => Promise<void>`. Busca por `findProgramByIdStandalone` do barrel `lib/milon/db/programs` (já exportado em `lib/milon/repositories/programs.ts`). Estados: id desconhecido (standalone resolve nulo) ⇒ `program` nulo **e** `error` nulo (não-confusão entre "não existe" e "falha de rede"); falha do fetch ⇒ `error` com mensagem e `retry` recarregando; sucesso ⇒ `program` preenchido. Padrão promise-chain com flag `cancelled`; não lê nem escreve estado de `usePrograms`.
- **Página de detalhe (`app/milon/programs/[id]/page.tsx`):** client component; id obtido via `useParams`; compõe `MilonLayout` com `pageTitle="Programa"` (sem subtítulo) e quatro estados mutuamente exclusivos: carregando ("Carregando programa…"), falha de fetch (banner rose com "Tentar novamente" ligado ao `retry`), id desconhecido ("Programa não encontrado." no cartão de estado vazio do padrão do módulo) e cabeçalho do programa (título com token `font-display`, dono e badge de status via `STATUS_LABEL`). Não importa `ProgramList`, `ProgramModal` nem `ProgramConfirmModal`; não contém qualquer seção, título, mensagem ou placeholder de treinos; nenhuma ação de editar/ativar/excluir aqui.
- **Navegação pós-salvar:** destino da criação = `/milon/programs/<id>` com o cabeçalho do programa recém-criado; destino da edição = permanecer em `/milon/programs` com a lista atualizada.

## 4. Data Flow do Patch v4

1. **Carga falha:** fetch da lista rejeita → hook grava `errorMsg` + `errorOrigin='carga'` → página repassa aos dois campos → `ProgramList` renderiza banner com "Tentar novamente" → acionar chama `retry`/`reload` e a origem volta a ser `carga` no novo fetch.
2. **Confirmação com bloqueio de domínio:** pessoa confirma no modal → hook avalia `guardaAtivacao` → grava `errorMsg` + `errorOrigin='bloqueio'` e lança → `handleConfirm` encerra **fechando** a confirmação (local e do hook) → banner legível no corpo, sem retry, status e lista intactos; nova tentativa só pela ação normal da lista.
3. **Confirmação com falha de operação:** mesmo caminho do item 2, com origem `operacao` vinda do catch do repositório → modal fecha, banner sem retry, estado anterior preservado.
4. **Sucesso da confirmação:** repositório grava → efeito colateral aplicado em memória → confirmação fecha (já fechava) → `errorMsg`/`errorOrigin` nulos.
5. **Criação:** modal salva → `save()` devolve o `Program` criado → página fecha o modal e faz `push` para `/milon/programs/<id>` → a rota nova busca o registro por id e renderiza só o cabeçalho com a aba "Programas" ativa.
6. **Edição:** `save(title, id)` devolve o programa atualizado → sem `push` → lista já refletindo o dado.
7. **Acesso direto/refresh ao detalhe:** `useParams` lê o id → `useProgramDetail` busca no standalone → sucesso renderiza cabeçalho; id desconhecido renderiza o estado de não-encontrado; falha renderiza banner com retry.

## 5. Decisões Técnicas do Patch v4 (para `context.json.decisions` via Zeus)

- **Canal de origem = segundo campo (`errorOrigin`), não objeto nem código de erro (D15, caminho B):** alternativas rejeitadas — (a) *um campo objeto* `{ mensagem, origem }` substituindo `errorMsg`: quebraria o contrato homologado e toda a base de testes que lê `errorMsg` (CA-P3-21 exige suíte verde); (b) *código de erro embutido no texto* (prefixo/sufixo): acopla render a texto, é frágil a troca de mensagem e esbarra em acentuação; (c) *booleano `canRetry`*: colapsaria `operacao` e `bloqueio` em duas classes visíveis e não atenderia R13, que exige três classes na tela. Custo aceito: um estado e uma prop a mais — o menor canal que satisfaz R13 sem over-engineering.
- **O modal fecha em qualquer terminal da confirmação:** como os três desfechos pós-confirmação (sucesso, bloqueio, falha) encerram com o modal fechado (D15/R15/R16), a página não precisa distinguir origem para decidir o fechamento — a distinção é necessária **só** para o retry do banner. Menor lógica possível, e a mensagem continua vinda do hook.
- **`ProgramConfirmModal` não recebe nenhuma prop nova:** o componente continua puro de apresentação; mover o fechamento para a página mantém o contrato "processando/cancelar" intocado e evita re-testar o componente.
- **Hook dedicado `useProgramDetail` em vez de reaproveitar `usePrograms`:** `usePrograms` carrega lista completa, filtros, confirmação e efeito colateral — semântica e custo errados para um registro único, e reusá-lo criaria estado fantasma na rota de detalhe. Fetch direto na página foi descartado por violar "page enxuta" do Mapa de Camadas.
- **Cabeçalho inline na página (sem componente novo + story):** há um único consumidor e a página é limite de composição; criar `ProgramDetailHeader` exigiria story e props sem segunda utilização (YAGNI).
- **`STATUS_LABEL` extraído para `program-utils.ts`:** dois consumidores (lista e detalhe) passam a ler o mesmo mapa de rótulos — fonte única, função pura testável; evita que a feature 3 troque rótulo em uma tela e não na outra.
- **`useParams` para ler o id:** em Next 16 o client component recebe `params` como Promise; `useParams` devolve o valor síncrono, é o padrão do App Router e já é mockado nos testes do projeto via `vi.mock("next/navigation")`.
- **Navegação por `router.push` de `next/navigation`:** mesmo precedente de `components/pluto/BudgetOverflowModal.tsx` e `app/login/login-form.tsx` — descartado `window.location` (recarrega a página inteira) e `<Link>` programático (não é navegação imperativa).
- **Retry também na falha de carga do detalhe:** R19 amarra o detalhe ao "padrão de erro/estado vazio já usado no módulo", e esse padrão de carga é banner + "Tentar novamente" (R14). Não cria um segundo padrão.
- **Aba "Programas" ativa sem código novo:** decorre da regra de prefixo já homologada no Patch v3; o patch só a trava com teste.

## 6. Riscos e Mitigações do Patch v4

- **Mudança de propósito de comportamento homologado:** o modal permanecia aberto no erro por decisão de implementação e D15 inverte isso — declarado para o Argos avaliar o diff como mudança aprovada, não regressão (spec Q9).
- **Testes/stories existentes de `ProgramList` montados sem a prop nova:** a prop é obrigatória; Minos ajusta os defaults na própria task RED (TASK-022) e Hefesto ajusta as stories (TASK-023). Nenhum comportamento homologado muda — a origem `carga` continua exibindo retry.
- **Mensagem sem retry parecer "travada":** mitigado por R15/R17 — a ação se repete pela via normal da lista e a mensagem permanece visível; se a homologação pedir retry também na operação, é decisão nova, não ambiguidade desta spec (spec Q9).
- **Colchete no caminho `[id]` em glob/filtro de teste:** o diretório literal `[id]` é aceito por NTFS e pelo include padrão do Vitest; os comandos de teste do patch usam o prefixo do diretório `__tests__/app/milon/programs/` para que nenhum shell interprete colchete como classe de caracteres.
- **Id desconhecido exibir programa errado ou tela vazia sem explicação:** R19 amarra aos quatro estados mutuamente exclusivos do detalhe; `findProgramByIdStandalone` devolve nulo e o estado de não-encontrado é distinto do erro de fetch (testado separadamente).
- **"Treinos em breve" ou menção a treinos entrando por hábito:** travado por critério de busca com retorno 0 na página e no repositório (CA-P3-20).
- **Conflito de edição em `ProgramList.tsx` entre B e C:** a extração de `STATUS_LABEL` acontece na TASK-023 e a TASK-027 apenas a consome, com dependência explícita no DAG.
- **Cobertura cair com arquivos novos:** mitigado pela TASK-029 (suite completa, coverage ≥ 80%, `test-report.json` regenerado antes da review — CA-P3-21).

## Cobertura Patch v4 → Tasks Novas (TASK-022 em diante)

| Requisito / CA | Task(s) |
|---|---|
| R13 (três classes de origem) | TASK-022 (RED), TASK-023 (origem no hook/na lista) |
| R14 / CA-P3-15 (carga com retry) | TASK-022 (banner), TASK-023 (retry só na carga), TASK-024/025 (página repassa origem) |
| R15 / CA-P3-13 (bloqueio: modal fecha, sem retry) | TASK-024 (RED), TASK-025 (fecha em todos os terminais) |
| R16 / CA-P3-14 (falha de operação: modal fecha, sem retry) | TASK-024 (RED), TASK-025 (fecha em todos os terminais) |
| R17 / CA-P3-16 (mensagem legível, sem backdrop) | TASK-024 (RED), TASK-025 (fechamento fora do catch) |
| R18 / CA-P3-17 (rota de detalhe com cabeçalho) | TASK-026 (RED), TASK-027 (hook + página) |
| R19 (id desconhecido com explicação) | TASK-026 (RED), TASK-027 (estado de não-encontrado) |
| R20 / CA-P3-18 (criação vai ao detalhe) | TASK-024 (RED), TASK-025 (push pós-save) |
| R21 / CA-P3-19 (edição permanece na lista) | TASK-024 (RED), TASK-025 (sem push na edição) |
| CA-P3-20 (sem placeholder de treinos) | TASK-026 (RED), TASK-027 (busca retorna 0) |
| P6/Q8 (test-scenarios e test-report) | TASK-028 (cenários), TASK-029 (suite + report) |
| CA-P3-21 (suite verde, coverage ≥ 80%) | TASK-029 |
| Q7 (handoff de cenários de treino para a feature 3) | fora do plano — Mnemósine, na documentação |

## Critérios de Substituição do Patch v4 (regra Atena)

- **TASK-023:** busca por `const STATUS_LABEL` em `components/milon/ProgramList.tsx` retorna 0 (constante movida para `program-utils.ts`); busca por `errorOrigin` em `lib/milon/hooks/usePrograms.ts` retorna ocorrências.
- **TASK-025:** busca por `Mantém a confirmação aberta` em `app/milon/programs/page.tsx` retorna 0.
- **TASK-027:** busca case-insensitive por `treino` em `app/milon/programs/[id]/page.tsx` retorna 0; busca por `Treinos em breve` no repositório retorna 0.

---

# Patch v5 — Estados de tela centralizados / AsyncState (Aditivo ao Plano v1 + Patch v3 + Patch v4)

> **Objetivo do patch:** (D18–D20, R22–R25) criar o componente transversal `components/ui/AsyncState.tsx` — presentacional, com stories e teste — cobrindo os **4 estados de tela de lista** (carregando, erro, vazio, no-results) com **precedência fixa**, banner de erro renderizado **ACIMA** do conteúdo (reparo do Cenário 5) e "Tentar novamente" **derivado de `errorOrigin` dentro do componente** (origem ausente ⇒ `carga`); (D21/D23/D25, R26–R28) adotá-lo nas **três telas do Mílon** (`ProgramList`, `ExerciseList`, `app/milon/programs/[id]/page.tsx`), dar `errorOrigin` ao `useExercises` (busca ⇒ `carga`, exclusão ⇒ `operacao`) e **fechar `DeleteExerciseConfirm` em falha** de exclusão; (D26, R29) mover a união de origens para **casa única em `lib/shared`** com `ProgramErrorOrigin` virando apelido. **Sem migração SQL, sem bump de versão, sem nenhum arquivo do Pluto.**

**Arquitetura do patch:** o componente vive em `components/ui/` e importa o tipo de origem **só** de `@/lib/shared` (nunca de um módulo); as telas continuam decidindo *qual* estado têm (flags `loading`/`error`/`empty`/`noResults` vindas dos hooks já existentes) e repassam os **textos exatos de hoje** por props + o conteúdo (lista/cabeçalho) como `children` — a **lógica de precedência e do retry sai das telas e passa a ser do componente**. O Mílon adota nas três telas de D21; `usePrograms` e `useProgramDetail` **não mudam** (só `useExercises` ganha origem); a página de Programas deixa de normalizar origem (o `?? "carga"` da linha 198 sai — o default passa a ser interno ao componente, D20).

**Tech Stack:** inalterada — Next.js 16 App Router (client components), React 18, Vitest + Testing Library, Storybook, `Button` de `components/ui/button.tsx`. Nenhum toque em banco, nem em `lib/shared/supabaseClient.ts`/`database.ts`.

## Restrições Globais do Patch v5
- **Nenhuma migração SQL nova** — nenhum arquivo em `utils/migrations/` é criado ou editado; nenhum repository, tabela ou coluna muda (spec S1).
- **Sem bump de versão (SemVer)** — nenhuma alteração de versão de pacote.
- **`components/ui/` só ganha o `AsyncState`** — `button.tsx`, `input.tsx` e `label.tsx` inalterados (confirmado em disco: são os 3 únicos arquivos do diretório hoje).
- **`AsyncState` não importa de `lib/milon/*` nem de `components/<modulo>/*`** — só `@/lib/shared` (tipo) e `@/components/ui/button` (retry) (R29).
- **Adoção limitada às 3 telas de D21** — qualquer outra tela do Mílon ou do Pluto fica fora (spec S5); Pluto **zero-arquivo** (D24/R30).
- **Textos idênticos aos de hoje** — os 12 textos dos 4 estados estão literais na §3; mudança é composição (banner acima), não conteúdo (CA-P5-5).
- **Modais inalterados:** `ProgramConfirmModal.tsx` e `ProgramModal.tsx` (D15 vige na página), `DeleteExerciseConfirm.tsx` (D25 muda **quem** fecha, não o componente).
- **Spec v2 + Patch v3 + Patch v4 íntegros:** R1–R21, D9–D17, CA-P3-1…CA-P3-21 permanecem; nenhuma regra de ciclo de vida, filtro, confirmação ou guarda muda.
- **Sem "Fechar ✕" no banner** (D22, YAGNI descartado).
- Proibições do Mapa de Camadas seguem valendo: sem `use-cases/`, `schemas/` (Zod), `mappers.ts`, `services/` ou factories `createXService`; sem `@supabase/*` fora de `lib/shared/`; UI do Mílon consome dados só via `lib/milon/db/*` e tipos só via `lib/milon/types.ts`.
- **Sem task de documentação nesta patch** — norma do AGENTS.md (D27/R31) e retrofit do Pluto no backlog (D24/R30) são **handoffs da fase 7** (ver seção final).

## 1. Arquitetura do Patch v5

### Casa da união de origens (D26, R29)
- **Create** `lib/shared/error-origin.ts` — união de string literal `ErrorOrigin` com exatamente três valores ASCII (`carga`, `operacao`, `bloqueio`), exportada pelo **barrel** `lib/shared/index.ts` (linha nova de re-export). Mesmo padrão do tipo `ItemUrgency` já exportado por `lib/shared/utils.ts`.
- `lib/milon/types.ts` (hoje linha 38) — `ProgramErrorOrigin` deixa de repetir a definição literal e vira **apelido** do tipo de `@/lib/shared` (precedente: `lib/pluto/types.ts` já importa do barrel `@/lib/shared`). Nenhum importador muda: `usePrograms`, `ProgramList`, stories e testes seguem importando `ProgramErrorOrigin` de `lib/milon/types.ts`.

### Componente centralizado (D18–D20, R22–R25)
- **Create** `components/ui/AsyncState.tsx` — componente presentacional único dos 4 estados. Props: flags de estado + `errorOrigin` opcional + `onRetry` + textos por estado + `children` (região de conteúdo). Precedência fixa D19 (detalhada na §3): carregando → erro → vazio → no-results; erro como **banner acima**; retry interno só para `carga`/origem ausente.
- **Create** `components/ui/AsyncState.stories.tsx` — padrão do projeto (arquivo ao lado, `title: "UI/AsyncState"`), cobrindo os 4 estados e as 4 entradas de origem.
- **Create** `__tests__/components/ui/AsyncState.test.tsx` — contrato completo (CA-P5-2, CA-P5-3, CA-P5-4).

### Adoção no Mílon (D21, D23, D25 — R26, R27, R28)
- `components/milon/ProgramList.tsx` — substitui a cadeia das **linhas 86–116** (hoje: ternário que troca a lista pela mensagem de erro) pela composição do `AsyncState`; mantém todas as props atuais (`errorOrigin` obrigatório nullable já existe); remove o bloco próprio de retry (hoje linhas 93–97).
- `app/milon/programs/page.tsx` — **linha 198**: `errorOrigin` passa a ser repassado **cru** do hook (o `?? "carga"` sai; normalização vira interna ao componente, D20).
- `app/milon/programs/[id]/page.tsx` — substitui a cadeia das **linhas 21–47** (carregamento, erro, não-encontrado) pela composição do `AsyncState`; o **não-encontrado continua distinto de falha de carga** (R19): falha ⇒ banner com retry (origem ausente ⇒ `carga`); id desconhecido ⇒ faixa de vazio com "Programa não encontrado." **sem** retry.
- `lib/milon/hooks/useExercises.ts` — `UseExercisesReturn` ganha `errorOrigin`: rejeição do efeito de montagem e do `fetchList` (hoje linhas 121 e 138) ⇒ `carga`; catch do `remove` (hoje linhas 252–255) ⇒ `operacao`; `applyList` e os pontos que hoje zeram `error` zeram os dois campos; `save`/`saveAndNew` não tocam no canal (relançam para o modal).
- `components/milon/ExerciseList.tsx` — ganha prop obrigatória `errorOrigin` e substitui a cadeia a **partir da linha 95** (hoje sempre mostra retry, linhas 102–104) pela composição do `AsyncState`.
- `app/milon/exercises/page.tsx` — `handleDeleteConfirm` (hoje linhas 108–119) **fecha `DeleteExerciseConfirm` em falha**, removendo o comentário "Mantém a confirmação aberta" (linhas 114–116); a página repassa `errorOrigin` do hook ao `ExerciseList`.
- Stories: `components/milon/ProgramList.stories.tsx` (contrato de props não muda — só verificação de build) e `components/milon/ExerciseList.stories.tsx` (ganha `errorOrigin` com as três origens).

## 2. Componentes (Create/Modify/Test/Docs) — Patch v5

**Create:**
- `lib/shared/error-origin.ts` — união `ErrorOrigin` (TASK-031).
- `components/ui/AsyncState.tsx` — 4 estados, precedência, banner acima, retry por origem (TASK-033).
- `components/ui/AsyncState.stories.tsx` — stories dos 4 estados e origens (TASK-033).

**Modify:**
- `lib/shared/index.ts` — re-export do arquivo novo (TASK-031).
- `lib/milon/types.ts` — linha 38 vira apelido de `ErrorOrigin` (TASK-031).
- `components/milon/ProgramList.tsx` — cadeia 86–116 vira composição do `AsyncState` (TASK-035).
- `app/milon/programs/page.tsx` — repassa `errorOrigin` cru (linha 198) (TASK-035).
- `components/milon/ProgramList.stories.tsx` — verificação de contrato/build (TASK-035).
- `app/milon/programs/[id]/page.tsx` — cadeia 21–47 vira composição do `AsyncState` (TASK-037).
- `lib/milon/hooks/useExercises.ts` — `errorOrigin` nas gravações mapeadas (TASK-039).
- `components/milon/ExerciseList.tsx` — prop `errorOrigin` + cadeia 95–123 vira `AsyncState` (TASK-039).
- `components/milon/ExerciseList.stories.tsx` — contrato com `errorOrigin` (TASK-039).
- `app/milon/exercises/page.tsx` — repassa origem e fecha a confirmação em falha (TASK-039).

**Inalterado (declaração explícita):** `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/milon/ProgramConfirmModal.tsx`, `components/milon/ProgramModal.tsx`, `components/milon/DeleteExerciseConfirm.tsx`, `lib/milon/hooks/usePrograms.ts`, `lib/milon/hooks/useProgramDetail.ts`, `lib/milon/repositories/*`, `lib/milon/db/*`, `lib/milon/program-utils.ts`, `lib/milon/utils.ts`, `app/milon/programs/page.tsx` (fora da linha 198), `utils/migrations/*` e **todo** `app/pluto/`, `components/pluto/`, `lib/pluto/`.

**Test (Minos cria/adapta; caminhos travados aqui):**
- `__tests__/lib/milon/types.test.ts` — apelido e identidade com o tipo de `lib/shared` (TASK-030).
- `__tests__/components/ui/AsyncState.test.tsx` — contrato completo (TASK-032).
- `__tests__/components/milon/ProgramList.test.tsx` + `__tests__/app/milon/programs/page.test.tsx` — CA-P5-1 e CA-P5-5 (TASK-034).
- `__tests__/app/milon/programs/[id]/page.test.tsx` — banner acima do cabeçalho + estados preservados (TASK-036).
- `__tests__/lib/milon/hooks/useExercises.test.ts` + `__tests__/components/milon/ExerciseList.test.tsx` + `__tests__/app/milon/exercises/page.test.tsx` — D23/D25, CA-P5-6 (TASK-038).
- `.agents/modules/milon/02-programas/test-scenarios.md` — cenários do Patch v5 + reexecução do Cenário 5 (TASK-040).
- `.agents/modules/milon/02-programas/test-report.json` — regenerado por Minos (TASK-041).

**Docs:** nenhum arquivo de documentação — norma do AGENTS.md e item do backlog do Pluto são handoff da fase 7 (seção final).

## 3. Contratos do Patch v5 (descrições textuais, sem implementação)

- **Tipo compartilhado (`lib/shared/error-origin.ts`):** exporta a união `ErrorOrigin` de string literal com exatamente três valores (`carga`, `operacao`, `bloqueio` — ASCII, sem acento, nenhum quarto valor); re-exportada pelo barrel `lib/shared/index.ts`. `lib/milon/types.ts` exporta `ProgramErrorOrigin` como **apelido** (`=`) desse tipo — mesmos valores, mesmo nome, nenhum importador quebra.
- **`AsyncState` (props):** `loading` (booleano), `error` (string anulável), `errorOrigin` (tipo de `lib/shared`, **opcional** — ausente ou nulo tratado como `carga`), `empty` (booleano), `noResults` (booleano), `onRetry` (função), `loadingText`, `emptyTitle`, `emptyText`, `noResultsTitle`, `noResultsText` (strings com os textos exatos da tela), `children` (região de conteúdo: lista ou cabeçalho).
- **`AsyncState` (precedência fixa — D19):** (1) `loading` verdadeiro ⇒ a região mostra **somente** `loadingText` — sem banner, sem vazio, sem no-results, sem `children`; (2) havendo `error` ⇒ banner com a mensagem renderizado **ACIMA** da região, com botão "Tentar novamente" ligado a `onRetry` **somente** quando a origem for `carga` **ou ausente/nula** (`operacao` e `bloqueio` exibem só a mensagem); (3) região de conteúdo: `children` quando fornecido (sob erro o conteúdo permanece visível — CA-P5-1); **sem** `children` e com erro ⇒ somente o banner (nunca mensagem de vazio/no-results sob erro — D19d); sem erro ⇒ `empty` (prevalece) ⇒ cartão vazio; senão `noResults` ⇒ cartão no-results; senão, região vazia. O componente **nunca** substitui o conteúdo por mensagem de erro (R24) e **não** tem botão de fechar (D22).
- **Textos exatos (props por tela — invariáveis):** Programas: `Carregando programas...` / `Nenhum programa ainda.` + `Crie o primeiro programa para começar.` / `Nada encontrado para essa combinação.` + `Ajuste os filtros para ver mais programas.` Exercícios: `Carregando exercícios...` / `Nenhum exercício cadastrado ainda.` + `Crie o primeiro exercício da biblioteca para começar.` / `Nada encontrado para essa combinação.` + `Ajuste os filtros ou crie o exercício na biblioteca.` Detalhe: `Carregando programa…` (reticência horizontal, como hoje) / faixa de vazio `Programa não encontrado.` + `Este programa não existe ou foi removido. Volte para a lista e escolha outro programa.`; `noResults` fixo nessa tela. Mensagens de erro continuam vindo dos hooks via prop; rótulo de retry é único: `Tentar novamente`.
- **`ProgramList` (mudança de contrato interno):** props **inalteradas** (inclui `errorOrigin` obrigatório anulável e `onRetry`); a cadeia de estados 86–116 é substituída pela composição do `AsyncState` repassando as flags, os 5 textos exatos e a `<ul>` dos itens filtrados como `children` quando houver itens; filtros (select de dono, checks de status) e cabeçalho da seção ficam **fora** do componente; o botão "Tentar novamente" deixa de existir no arquivo.
- **Página de Programas:** repassa `errorOrigin` do hook **sem** fallback (linha 198); demais wiring (modais, confirmação, navegação pós-criação do Patch v4) intocado.
- **Página de detalhe:** compõe `AsyncState` dentro de `MilonLayout` sem informar `errorOrigin` (ausente ⇒ `carga` ⇒ retry na falha de fetch, exercitando o default em tela real); `empty` = id desconhecido (programa nulo e sem erro); `children` = cabeçalho (título com `font-display`, dono, badge `STATUS_LABEL`); `noResults` nunca verdadeiro.
- **`useExercises` (estado):** `UseExercisesReturn` ganha `errorOrigin` anulável. Gravações: rejeição do efeito de montagem e do `fetchList` ⇒ `carga`; falha em `remove` ⇒ `operacao`; `applyList`, o início de `fetchList`/`remove` e qualquer sucesso zeram `error` **e** `errorOrigin` juntos; `save`/`saveAndNew` não alteram nenhum dos dois. Formato idêntico ao contrato de `usePrograms` (R27).
- **`ExerciseList` (mudança de contrato interno):** ganha prop obrigatória `errorOrigin` anulável; cadeia 95–123 substituída pelo `AsyncState` com `empty = isEmpty`, `noResults = não vazio && nenhum item visível`, `children` = `<ul>` + botão "Mostrar mais" quando houver itens; botão próprio de retry removido.
- **Página da biblioteca:** repassa `errorOrigin` ao `ExerciseList`; `handleDeleteConfirm` fecha a confirmação em **todos** os terminais (sucesso e falha — D25), sem o comentário "Mantém a confirmação aberta"; a mensagem permanece no banner da lista com origem `operacao`, sem retry.
- **Stories novos/ajustados:** `AsyncState.stories.tsx` cobre carregando, erro (4 origens), vazio, no-results e lista sob erro; `ExerciseList.stories.tsx` passa a exercitar as três origens; `ProgramList.stories.tsx` mantém as stories atuais (props não mudam).

## 4. Data Flow do Patch v5

1. **Carga da lista de Programas falha:** `usePrograms` grava `errorMsg` + origem `carga` → página repassa cru → `ProgramList` → `AsyncState` renderiza banner **acima**; sem itens (`children` ausente) ⇒ **só** o banner (sem "Nenhum programa ainda."); "Tentar novamente" chama `onRetry` → recarrega.
2. **Bloqueio/falha na tela de Programas:** modal fecha (Patch v4, intocado) → origem `bloqueio`/`operacao` → banner **sem** retry **acima da lista visível** (CA-P5-1 — defeito do Cenário 5 corrigido).
3. **Detalhe — falha de fetch:** `useProgramDetail` rejeita → `error` sem origem → `AsyncState` trata como `carga` → banner com retry que aciona `retry()`; id desconhecido segue pela faixa de vazio (sem retry), distinto da falha (R19).
4. **Biblioteca — busca falha:** `useExercises` grava `carga` → banner com retry (comportamento homologado mantido).
5. **Biblioteca — exclusão confirmada falha:** `remove` grava `operacao` e a mensagem → a página **fecha** `DeleteExerciseConfirm` → banner **sem** retry acima da lista, exercício mantido (CA-P5-6; achado latente (b) corrigido).
6. **Estados sem erro:** `loading` sozinho; base sem registros ⇒ vazio; registros escondidos por filtros/busca ⇒ no-results; vazio prevalece sobre no-results.

## 5. Decisões Técnicas do Patch v5 (para `context.json.decisions` via Zeus)

- **Nome do tipo compartilhado `ErrorOrigin` (a spec fixa casa e apelido em D26/R29, mas não o identificador):** escolhido o nome curto espelhando a prop `errorOrigin`. Descartados `ProgramErrorOrigin` no shared (nomenclatura de módulo em casa transversal) e repetir a união em dois arquivos (violaria casa única).
- **Textos por props de string (não slots/ReactNode por estado):** mantém o markup centralizado — a alternativa "só um FeedbackBanner"/slots por estado foi descartada na spec (S10) porque deixaria carregando/vazio/no-results duplicados nas três telas e fecharia mal a precedência. Custo: 5 props de texto — o menor contrato que preserva os textos homologados (CA-P5-5).
- **Markup unificado dos estados dentro do componente (padrão de cartão das listas):** as listas e a faixa de não-encontrado já usam o mesmo cartão (`rounded-lg border bg-card p-8`); o parágrafo de carregamento do detalhe passa a usar o padrão centralizado — **texto idêntico**, classe convergida (risco registrado na §6).
- **`children` como região de conteúdo:** genérico para lista (`<ul>`) e cabeçalho do detalhe; evita props de itens acopladas ao domínio no componente transversal.
- **`errorOrigin` opcional só no `AsyncState`; props dos membros seguem obrigatórias:** `ProgramList` mantém o contrato do Patch v4 (`errorOrigin` obrigatório anulável) e `ExerciseList` o recebe obrigatório — o default "ausente ⇒ `carga`" existe **no componente transversal**; a página de detalhe não informa origem (exercita o default). Descartado mover a obrigatoriedade para opcional nas telas: quebraria a distinção de origem já homologada no Programas.
- **Remoção do `?? "carga"` da linha 198:** endereça o item 6 do backlog do Mílon e o apontamento do `review-report` (fallback mascarava a ausência de origem); o comportamento observado não muda porque o default passou a ser interno ao componente. Marcar o backlog é ato documental da fase 7, sem task aqui.
- **`ProgramErrorOrigin` como apelido mantém o código interno do Mílon estável:** hooks, componentes e stories do módulo seguem importando de `lib/milon/types.ts`; só o `AsyncState` (e o futuro retrofit do Pluto) importam de `lib/shared` — zero churn nos consumidores existentes.
- **Pares RED→GREEN por incremento, um commit por par:** precedente dos Patches v3/v4 (commits `TASK-022/023`, `TASK-024/025`, `TASK-026/027`) — separar o par deixaria a baseline vermelha; `TASK-040` e `TASK-041` (documentação de teste e gate) são commits própios (precedente `TASK-028`, `TASK-029`).

## 6. Riscos e Mitigações do Patch v5

- **Comportamento homologado muda (declarado):** o erro deixa de substituir a lista (Cenário 5, D19) e a exclusão da biblioteca fecha a confirmação em falha (D25) — o Argos avalia o diff como mudança aprovada, não regressão (spec S8).
- **Componente transversal novo:** adoção acidental fora do escopo — mitigada por D21 (3 telas explícitas), prova de herança (CA-P5-7) e norma de D27.
- **Regressão textual/visual:** os 12 textos estão literais nos criteria das tasks (CA-P5-5); a única troca de classe aceita é o parágrafo de carregamento do detalhe convergindo ao padrão centralizado (texto idêntico).
- **Prova de herança sensível a texto:** qualquer tela nova que escreva "Tentar novamente" fora do componente quebra CA-P5-7 — proposital (spec S8).
- **Testes/stories existentes com contrato novo:** `ExerciseList` ganha prop obrigatória e `useExercises` campo novo — Minos ajusta defaults/ factories na própria task RED (precedente TASK-022); nenhum comportamento homologado muda (origem `carga` segue com retry).
- **Estado mockado "programa + erro" no detalhe (TASK-036):** com o hook atual os dois nunca coexistem; o cenário trava a regra de composição R24 (erro nunca substitui o conteúdo) no nível da tela — se o Argos questionar, é asserção do contrato do componente, não cenário de produto.
- **Cobertura cair com arquivos novos:** mitigado pela TASK-041 (suite completa, coverage ≥ 80%, `test-report.json` regenerado — CA-P5-9).
- **Handoffs da fase 7 (D24 e D27):** se a Mnemósine não registrar a norma nem o item do backlog do Pluto, ambos se perdem — única pendência de processo (spec S9).
- **Dependências:** herda do Patch v4 (R13–R21, D15–D17); nenhuma dependência de banco ou de outra feature.

## Cobertura Patch v5 → Tasks Novas (TASK-030 em diante)

| Requisito / CA | Task(s) |
|---|---|
| R22 (componente + stories + teste) | TASK-032 (RED), TASK-033 (GREEN) |
| R23 / CA-P5-2 (precedência dos 4 estados) | TASK-032 (RED), TASK-033 (GREEN) |
| R24 / CA-P5-1 (banner acima, conteúdo visível) | TASK-034/035 (Programas), TASK-036/037 (detalhe), TASK-038/039 (biblioteca) |
| R25 / CA-P5-3 (retry por origem; ausente ⇒ carga) | TASK-032 (RED), TASK-033 (GREEN); default real no detalhe TASK-036/037 |
| CA-P5-4 (contrato completo sem ramo sem asserção) | TASK-032 (RED), TASK-033 (GREEN) |
| R26 (adoção nas 3 telas, textos preservados) | TASK-034/035, TASK-036/037, TASK-038/039 |
| CA-P5-5 (CA-P3-13…16 verdes com a adoção) | TASK-034 (RED), TASK-035 (GREEN), reexecução na TASK-041 |
| R27 / D23 (`useExercises` com `errorOrigin`) | TASK-038 (RED), TASK-039 (GREEN) |
| R28 / CA-P5-6 / D25 (exclusão fecha em falha) | TASK-038 (RED), TASK-039 (GREEN) |
| R29 / D26 (casa em `lib/shared` + apelido) | TASK-030 (RED), TASK-031 (GREEN) |
| CA-P5-7 (prova de herança) | zeros por arquivo em TASK-035/037/039; busca global na TASK-041 |
| CA-P5-8 / R31 (norma no AGENTS.md) | fora do plano — Mnemósine, fase 7 (handoff) |
| CA-P5-9 (suite verde, coverage ≥ 80) | TASK-041 |
| R30 / D24 (Pluto fora; retrofit no backlog) | fora do plano — Mnemósine, fase 7 (handoff); verificação "AsyncState fora do Pluto" na TASK-041 |
| S6(a) (exclusão rotulada como carga) | TASK-038, TASK-039 |
| S6(b) (exclusão atrás do backdrop) | TASK-038, TASK-039 |
| S7 (testes, cenários, report) | TASK-040 (cenários), TASK-041 (suite + report + regressão) |

## Pares RED/GREEN e agrupamento de commits

| Par | RED (Minos) | GREEN (Hefesto) | Commit |
|---|---|---|---|
| Casa da união | TASK-030 | TASK-031 | um commit para o par |
| Componente | TASK-032 | TASK-033 | um commit para o par |
| Programas (lista + página) | TASK-034 | TASK-035 | um commit para o par |
| Detalhe | TASK-036 | TASK-037 | um commit para o par |
| Biblioteca (hook + lista + página) | TASK-038 | TASK-039 | um commit para o par |
| Cenários / gate | TASK-040 / TASK-041 | — | commits próprios (precedente v4) |

Cada par é commitado **junto**: separado, o RED deixa a baseline vermelha (mesma regra dos pares do Patch v4).

## Critérios de Substituição do Patch v5 (regra Atena)

- **TASK-031:** busca por `'carga' | 'operacao'` em `lib/milon/types.ts` retorna 0 (definição literal da união saiu do arquivo — mora em `lib/shared/error-origin.ts`).
- **TASK-033:** busca por `lib/milon` em `components/ui/AsyncState.tsx` retorna 0.
- **TASK-035:** busca por `Tentar novamente` em `components/milon/ProgramList.tsx` retorna 0; busca por `?? "carga"` em `app/milon/programs/page.tsx` retorna 0.
- **TASK-037:** busca por `Tentar novamente` em `app/milon/programs/[id]/page.tsx` retorna 0.
- **TASK-039:** busca por `Tentar novamente` em `components/milon/ExerciseList.tsx` retorna 0; busca por `Mantém a confirmação aberta` em `app/milon/exercises/page.tsx` retorna 0.
- **TASK-041 (CA-P5-7):** busca pela cadeia `Tentar novamente` em `app/` e `components/` retorna ocorrência **somente** em `components/ui/AsyncState.tsx`; busca por `AsyncState` em `app/pluto/` e `components/pluto/` retorna 0 (R30/D24).

## Handoffs pós-approve-review (fase 7 — Mnemósine; fora do diff de código)

1. **Norma (D27, R31 / CA-P5-8):** escrever na seção **"Onde ponho X?"** do `AGENTS.md` a norma — estados de tela de lista (carregando, erro, vazio, no-results) vão no componente centralizado `components/ui/AsyncState.tsx`; mensagens com origem usam a união de origens de `lib/shared`; retry é derivado de `errorOrigin` (`carga`/ausente com retry; `operacao`/`bloqueio` sem).
2. **Retrofit do Pluto (D24, R30):** registrar em `.agents/modules/pluto/backlog.md` o item de retrofit dos banners `transactions` e `months` para o componente centralizado, com a nota de que o `errorMsg` misto precisa de classificação de origem antes da migração.

Ambos são entregáveis desta feature anotados na documentação — **não geram teste, task de código nem gate**; são handoff de rastreio (spec S9).