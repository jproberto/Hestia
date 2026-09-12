# Biblioteca de Exercícios (Mílon #1) Implementation Plan
> Para Zeus: delegar via hefesto/minos task por task, na ordem do DAG (TASK-001 → TASK-010)

**Objetivo:** Construir a biblioteca compartilhada de exercícios (nome + músculo + link opcional) com consulta filtrada em lotes, modal único criar/editar com Salvar/Salvar+outro e exclusão simples com confirmação.
**Arquitetura:** UI em `app/milon/page.tsx` consome `hooks/useExercises` que consome barrels `db/exercises` sobre `repositories/exercises` via `IDatabaseClient`; regras puras de normalização/filtro/ordenação vivem em `lib/milon/utils.ts`; validação de formulário vive dentro do próprio modal.
**Tech Stack:** Next.js + React 18, Supabase via `IDatabaseClient` (`lib/shared`), Vitest + Testing Library, Storybook.

## Restrições Globais
- Biblioteca única compartilhada do casal: sem dono, sem filtro por dono, sem área privada. Coluna `created_by` existe só como auditoria, nunca como filtro.
- Lote de 20 itens (`EXERCISE_PAGE_SIZE = 20`); busca por texto ignorada abaixo de 3 caracteres (`EXERCISE_SEARCH_MIN_LENGTH = 3`); combinação filtro músculo + busca por E lógico; ordenação sempre músculo → nome.
- Proibido criar `use-cases/`, `schemas/` (Zod), `mappers.ts`, `services/` ou factories `createXService`. Proibido importar `@supabase/*` fora de `lib/shared/`. Proibido importar o barrel `lib/milon/index.ts` — a UI importa só via caminhos diretos `lib/milon/db/*`, `lib/milon/hooks/*`, `lib/milon/types.ts`.
- Contratos de repositório testados fakes-only (decisão 57): nenhum teste de contrato bate no banco real.
- Títulos de conteúdo (`h1/h2/h3` em cards, seções e modais) usam o token central `font-display`.
- Migração incremental nova em `utils/migrations/`, nunca editar migração já aplicada; registrar execução em `schema_migrations`.

## 1. Arquitetura
A feature segue o Mapa de Camadas pós-41/47/52 do AGENTS.md. A página `app/milon/page.tsx` é enxuta (composição + modais) dentro de `MilonLayout`. Todo fetch/estado/operações vive em `lib/milon/hooks/useExercises.ts` no padrão promise-chain + flag `cancelled`, consumindo standalones do barrel `lib/milon/db/exercises.ts`, que re-exporta `lib/milon/repositories/exercises.ts`. O repository recebe `IDatabaseClient`, ordena por músculo e nome no banco e aplica a regra anti-duplicata como regra de persistência (pré-checagem com a normalização pura antes de inserir/atualizar). A normalização, o filtro por músculo, a busca por texto e a ordenação em memória vivem como funções puras em `lib/milon/utils.ts`, reutilizadas pelo hook e documentadas como contrato de dados para a feature #3. Os três componentes (`ExerciseList`, `ExerciseModal`, `DeleteExerciseConfirm`) são presentacionais via props; o modal valida nome/músculo obrigatórios e link opcional no próprio form. Cada componente novo ganha arquivo `.stories.tsx` ao lado. Placeholders do scaffold (`example`, `MilonExample`, `useExamples`, `exampleUtil`) são removidos nas tasks que os substituem.

## 2. Componentes (Create/Modify/Test/Docs)
**Create:**
- `utils/migrations/migration-milon-01-exercises.sql` — DDL da tabela nova + RLS + registro de auditoria (TASK-001).
- `lib/milon/repositories/exercises.ts` — acesso a dados via `IDatabaseClient` + regra anti-duplicata (TASK-003).
- `lib/milon/repositories/fakes/fakeExerciseRepository.ts` — fake em memória implementando a interface, com seed (TASK-003).
- `lib/milon/db/exercises.ts` — barrel `export *` sobre o repository, caminho oficial da UI (TASK-004).
- `lib/milon/hooks/useExercises.ts` — fetch, filtros, lotes, CRUD, loading/erro/retry (TASK-005).
- `components/milon/ExerciseList.tsx` — lista, filtro por músculo, busca, lotes mostrar-mais, estados vazia/loading/erro/sem-resultado (TASK-006).
- `components/milon/ExerciseModal.tsx` — modal único criar/editar com Salvar e Salvar+outro (TASK-007).
- `components/milon/DeleteExerciseConfirm.tsx` — confirmação de exclusão (TASK-008).
- `components/milon/ExerciseList.stories.tsx`, `components/milon/ExerciseModal.stories.tsx`, `components/milon/DeleteExerciseConfirm.stories.tsx` — uma por componente novo (TASK-006/007/008).
**Modify:**
- `lib/milon/types.ts` — fonte única: tipos de linha, domínio e inputs do exercício (TASK-001).
- `lib/milon/utils.ts` — normalização, comparação, filtro, busca e ordenação puras + constantes de consulta (TASK-002).
- `lib/milon/repositories/interfaces.ts` — interface do repositório de exercícios (TASK-003).
- `lib/milon/repositories/index.ts`, `lib/milon/hooks/index.ts`, `lib/milon/index.ts` — trocar re-exports de `example` por `exercises`; o barrel de topo só existe por compatibilidade e nenhum import novo pode usá-lo (TASK-003/004/005).
- `app/milon/page.tsx` — tela da biblioteca: composição + modais + wiring do hook (TASK-009).
**Delete (dentro das tasks indicadas):**
- `lib/milon/repositories/example.ts`, `lib/milon/repositories/fakes/example.ts` (TASK-003).
- `lib/milon/db/example.ts` (TASK-004).
- `lib/milon/hooks/useExamples.ts` (TASK-005).
- `components/milon/MilonExample.tsx`, `components/milon/MilonExample.stories.tsx` (TASK-006).
- Testes espelho dos placeholders (`__tests__/**/MilonExample*`, `contract-example.test.ts`, `utils.test.ts` antigo) são substituídos pelos testes novos de cada task.
**Test (Minos cria; caminhos travados aqui):**
- `__tests__/lib/milon/utils.test.ts` (TASK-002).
- `__tests__/lib/milon/repositories/contract-exercises.test.ts` fakes-only (TASK-003).
- `__tests__/lib/milon/db/exercises.test.ts` (TASK-004).
- `__tests__/lib/milon/hooks/useExercises.test.ts` (TASK-005).
- `__tests__/components/milon/ExerciseList.test.tsx`, `ExerciseModal.test.tsx`, `DeleteExerciseConfirm.test.tsx` (TASK-006/007/008).
- `__tests__/app/milon/page.test.tsx` com factories de mock com defaults + helper `clickConnectedButton` (TASK-009).
- Suite final Minos cobre todos os paths acima + `npm run build-storybook` (TASK-010).
**Docs:** nenhum arquivo de documentação novo; `test-report.json` e `test-scenarios.md` da feature são produzidos por Minos na execução, fora deste plano.

## 3. Contratos (descrições textuais, sem implementação)
- **Tipos (`lib/milon/types.ts`):** tipo de linha do banco com os campos id, nome, músculo, link de vídeo anulável, data de criação e auditoria de criador; tipo de domínio com os mesmos dados em convenção camelCase para link e data; input de criação com nome, músculo e link opcional; input de atualização com os três campos completos (o modal sempre submete nome, músculo e link juntos).
- **Migração (`utils/migrations/migration-milon-01-exercises.sql`):** cria a tabela `public.exercises` com identificador UUID gerado pelo banco, nome e músculo de texto obrigatório, link de vídeo de texto anulável, data de criação com padrão de agora e coluna de auditoria de criador; habilita segurança de linha com política de permissão total para usuários autenticados (mesmo texto das migrações financeiras); cria índices para músculo e nome usados na ordenação; insere registro de auditoria em `schema_migrations` com conflito ignorado pelo nome do script.
- **Utilidades puras (`lib/milon/utils.ts`):** constante de tamanho de lote com valor vinte; constante de mínimo de busca com valor três; função de normalização que converte para minúsculas, remove acentos por decomposição, remove caracteres especiais e aplica trim com colapso de espaços; função de igualdade de exercício que compara dois pares nome+músculo pela forma normalizada; função de busca que ignora consultas com menos de três caracteres e testa contenção da forma normalizada no nome normalizado; comparador que ordena por músculo normalizado e depois por nome normalizado.
- **Interface do repositório (`lib/milon/repositories/interfaces.ts`):** operações de listar tudo ordenado, criar, atualizar por id e remover por id. O módulo `repositories/exercises.ts` expõe essas operações como funções que recebem o cliente de banco mais variantes standalone que criam o próprio client singleton do navegador; o barrel `db/exercises.ts` re-exporta tudo. Criação e atualização bloqueiam duplicado (mesmo nome normalizado no mesmo músculo normalizado, ignorando o próprio id na edição) lançando erro com mensagem fixa orientando a localizar o item na lista para conferência ou edição. Listagem ordena por músculo e depois por nome no próprio banco.
- **Fake (`repositories/fakes/fakeExerciseRepository.ts`):** implementação em memória da interface com método de seed inicial, gerando ids sequenciais de fake e rejeitando duplicados com a mesma regra e mensagem do repository real.
- **Hook (`lib/milon/hooks/useExercises.ts`):** estado de lista completa ordenada, filtro de músculo, texto de busca, quantidade visível em lotes de vinte, indicador de carregamento, mensagem de erro com nova tentativa, aviso breve de sucesso, opções de músculo derivadas da lista, operações de salvar (criar ou atualizar), salvar-e-outro, remover, mostrar-mais, limpar filtros e recarregar. Qualquer troca de filtro ou busca reinicia a contagem visível para o primeiro lote. Filtragem e busca aplicadas em memória com as funções puras, para que a feature #3 reuse o mesmo contrato.
- **ExerciseList (props):** itens visíveis, restantes para mostrar-mais, opções de músculo, filtro e busca atuais, estados de carregamento/erro/vazia/sem-resultado, callbacks de trocar filtro, trocar busca, mostrar-mais, tentar-de-novo, editar e excluir por item. Mensagem de biblioteca vazia distinta da mensagem de filtro sem resultado. Título de seção com token de título.
- **ExerciseModal (props):** aberto/fechado, exercício em edição ou nulo, lista de músculos para a lista digitável, estado de gravação, mensagem de erro e mensagem de sucesso; callbacks de fechar e de salvar recebendo os três campos mais a ação escolhida (salvar ou salvar-e-outro). Comportamento: músculo digitável que aceita existente ou novo; nome livre sem sugestões; link opcional; Salvar fecha e atualiza a lista; Salvar-e-outro mantém aberto com músculo mantido, nome e link limpos, foco no primeiro campo e lembrete de sucesso; falha mantém aberto com erro visível e digitado preservado; botões desabilitados durante a gravação; cancelar fecha sem alterar nada.
- **DeleteExerciseConfirm (props):** aberto/fechado, nome e músculo do alvo, estado de exclusão, callback de confirmar e de cancelar. Exclusão simples sem proteção de histórico.
- **Página (`app/milon/page.tsx`):** compõe `MilonLayout` com título da biblioteca, `ExerciseList` e os dois modais, ligada ao hook; edição abre o modal preenchido a partir do item da lista.

## 4. Data Flow
Abrir a tela dispara o hook, que busca a lista ordenada via standalone do barrel `db/exercises`, marcando carregamento e depois exibindo itens ou os estados de vazia/erro. Digitar busca ou trocar o filtro atualiza o estado do hook, que refiltra em memória com as funções puras e reinicia os lotes em vinte itens; mostrar-mais soma o próximo lote mantendo os exibidos. Criar/editar abre o modal; confirmar chama o hook, que grava via repository (com checagem anti-duplicata), recarrega a lista em segundo plano e, conforme a ação, fecha o modal ou o mantém limpo com músculo mantido e lembrete. Excluir abre a confirmação; confirmar remove via repository e atualiza a lista. Falhas de gravação mantêm o modal aberto com erro; falhas de busca mostram erro com nova tentativa. A feature #3 consumirá depois a listagem, o filtro, a busca e a regra anti-duplicata deste contrato com seletor próprio, sem reusar o modal.

## 5. Decisões Técnicas
- Filtragem e busca em memória no hook (não no banco): o cliente de banco do projeto só expõe igualdade e ordenação simples, e a equivalência de busca exige a mesma normalização da regra anti-duplicata; fazer no hook com funções puras testáveis mantém um único contrato reutilizável pela #3 e evita divergência entre busca e duplicata. Custo: carrega a biblioteca inteira; irrelevante para o volume de dois usuários.
- Unicidade anti-duplicata aplicada na camada de repository (pré-checagem), não como restrição única no banco: a equivalência normalizada não é expressável em restrição simples, e a mensagem de erro orientadora exige lógica de aplicação. A migração mesmo assim indexa músculo e nome para a ordenação.
- `created_by` como auditoria NOT NULL (padrão das tabelas do projeto), sem nunca filtrar por ela: preserva o padrão de auditoria sem violar a biblioteca compartilhada.
- Modal com estado de form interno (não na página): a página fica só composição + modais conforme o mapa de camadas, e o contrato de "nunca fecha no erro + preserva digitado + foco" fica encapsulado e testável no componente.
- Contratos fakes-only: segue a decisão 57 já aplicada no módulo; velocidade e determinismo dos testes de contrato.

## 6. Riscos e Mitigações
- Divergência entre normalização da busca e do bloqueio: mitigada por uma única função de normalização em `utils.ts` usada pelos dois caminhos, com casos de acento, especiais e espaços cobertos nos testes da TASK-002.
- Condição de corrida em cliques duplos de salvar: mitigada por botões desabilitados durante a gravação (contrato do modal, TASK-007).
- Regressão nos placeholders do scaffold: mitigada pela remoção explícita dos arquivos `example` em cada task de substituição, com verificação de ausência por busca de imports.
- Quebra futura pela #3: mitigada pelo contrato de dados estável (listar, filtrar, buscar, regra) sem expor o modal como seletor; proteção de histórico declarada como responsabilidade da #3.
- Migração conflitando com tabelas financeiras: mitigada por tabela nova isolada `public.exercises` sem chaves para o financeiro.

## Cobertura spec → tasks
Cada item da spec seção 3 tem task: campos e tela própria (001/009), consulta com filtro+busca+lotes+ordenação+estados (002/005/006), modal único e botões de salvamento (007, padrão Pluto 05d), anti-duplicata (002/003), exclusão com confirmação (008), compartilhamento e ordenação (001/003/005), contrato para #3 (003/004/005 sem seletor). YAGNI da seção 4 é respeitado: nenhum seletor de treino, nenhuma paginação numerada, nenhum filtro avançado, nenhum campo além de nome/músculo/link.
