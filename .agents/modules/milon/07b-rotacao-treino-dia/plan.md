# Rotação do Treino do Dia por Histórico + Ordem Própria Implementation Plan
> Para Zeus: delegar via hefesto/minos task por task

**Objetivo:** O Treino do Dia passa a exibir o treino seguinte ao último selado do programa ativo (com volta ao primeiro) e os treinos ganham ordem própria reordenável por arrastar no detalhe do programa.
**Arquitetura:** Nova coluna de posição em workouts via migração 0015 com backfill pela ordem de criação; seleção por histórico e prioridade de aberta concentrada em useTodayWorkout com regra pura de próximo em workout-utils; reordenação espelha o padrão Pointer Events de WorkoutEntriesList.
**Tech Stack:** Next.js + React 18, Supabase via IDatabaseClient em lib/shared, Vitest, AsyncState centralizado, zero dependências novas de drag-and-drop.

## Restrições Globais

- Spec aprovada em .agents/modules/milon/07b-rotacao-treino-dia/spec.md com decisões D1 a D10; nada fora dela; item 7c (troca com ativa perguntando finalizar/excluir/cancelar) está fora.
- Migrações auditadas: nunca editar nem renomear migração aplicada; inteiro livre reservado 0015; registro em public.schema_migrations com script_name idêntico ao nome do arquivo.
- Proibido criar use-cases, schemas, mappers.ts, services ou factories createXService; proibido importar @supabase/* fora de lib/shared.
- UI consome dados somente via barrels lib/milon/db/* mais hooks em lib/milon/hooks/*; tipos somente em lib/milon/types.ts.
- Estados assíncronos de tela somente via components/ui/AsyncState centralizado; títulos de conteúdo com token font-display.
- Sem código de implementação neste plano: contratos abaixo são textuais (nomes, assinaturas e comportamentos exatos).
- Cobertura mínima de oitenta por cento; suite completa verde sem quebra de testes existentes.

## 1. Arquitetura

A tabela public.workouts ganha a coluna position (migração 0015, anulável na escrita do DDL com backfill que preenche todas as linhas existentes pela ordem de criação dentro de cada programa, índice por programa mais posição). A leitura de treinos passa a ordenar por posição com nulos por último, depois por created_at e id, de modo que linhas legadas sem posição preservam a ordem de criação. A criação de treino atribui posição igual ao maior valor vigente mais um (ou um quando não há treinos). A reordenação valida conjunto idêntico e regrava posições de um até o total na ordem recebida, mesmo protocolo já usado por reorderEntries de exercícios.

A seleção do Treino do Dia em useTodayWorkout mantém a cadeia e-mail, programa ativo do dono, treinos, e troca a escolha fixa do primeiro item por uma resolução em três níveis: havendo execução aberta no programa ativo do dono, seleciona o treino dessa aberta; sem aberta, busca a execução selada mais recente do programa e seleciona o vizinho seguinte na ordem vigente com volta ao primeiro; sem histórico, seleciona o primeiro. A regra de vizinho seguinte é função pura em workout-utils para teste direto. A indicação visual de em execução já existe em WorkoutDetailSection e é reaproveitada sem prop nova, pois a seção carrega a aberta do treino selecionado por conta própria.

O bloqueio de exclusão de treino com execução associada passa a ser verificado no repositório com mensagem amigável própria antes do backstop RESTRICT do banco, e o hook classifica essa mensagem como origem bloqueio. A reordenação de treinos vive no detalhe do programa (página de programa mais WorkoutList mais useProgramWorkouts), oculta em programa inativo pelo readOnly vigente.

## 2. Componentes (Create/Modify/Test/Docs)

Create (arquivos novos):

- utils/migrations/migration-0015-milon-workout-position.sql — camada migração; adiciona position a workouts, backfill pela criação, índice por programa mais posição, auditoria em schema_migrations; testada via teste de migração mais contracts.
- Nenhum outro arquivo novo de produção é necessário; toda a feature cabe em extensões dos arquivos abaixo.

Modify (existentes mais motivo):

- lib/milon/types.ts — camada tipos; WorkoutRow ganha campo position anulável (número ou nulo, nulo representa linha anterior à migração 0015); Workout de domínio ganha campo position anulável (número ou nulo, sem reinterpretação na leitura).
- lib/milon/workout-utils.ts — camada regra pura; nova constante de mensagem MSG_TREINO_COM_EXECUCOES e nova função pura de próximo; sem I/O.
- lib/milon/repositories/workouts.ts — camada repositório; ordenação por posição, posição na criação, nova operação reorderWorkouts, guarda de exclusão com execução associada; mais standalones correspondentes.
- lib/milon/repositories/executions.ts — camada repositório; novas consultas de última selada por programa e de aberta por programa; mais standalones correspondentes.
- lib/milon/repositories/interfaces.ts — camada contratos; extensão de IWorkoutRepository com reorderWorkouts e de IWorkoutExecutionRepository com as duas consultas novas.
- lib/milon/repositories/fakes/fakeWorkoutRepository.ts — camada fakes de teste; espelha ordenação, criação com posição, reorderWorkouts e guarda de exclusão.
- lib/milon/repositories/fakes/fakeWorkoutExecutionRepository.ts — camada fakes de teste; espelha as duas consultas novas com os mesmos desempates do real.
- lib/milon/hooks/useTodayWorkout.ts — camada hook; substitui a seleção do primeiro item pela resolução aberta, histórico com volta ao primeiro, primeiro sem histórico; mantém selectWorkout manual restrita à lista, retry e origens de erro.
- lib/milon/hooks/useProgramWorkouts.ts — camada hook; nova operação reorder que persiste via standalone, recarrega a lista, mapeia falha para origem operacao e preserva o mapeamento de bloqueio nas exclusões estendido à mensagem nova.
- components/milon/WorkoutList.tsx — camada componente presentacional; nova prop opcional onReorder com alças de arrastar pelo padrão Pointer Events de WorkoutEntriesList, ocultas quando readOnly; sem fetch interno.
- app/milon/programs/[id]/page.tsx — camada página; conecta onReorder ao hook quando o programa não é inativo; sem mudança nas regras de modal.

Sem modificação:

- app/milon/today/page.tsx — o contrato do hook é preservado (mesmos campos de retorno), de modo que a página não precisa de alteração; a insígnia de em execução aparece via WorkoutDetailSection existente.
- components/milon/WorkoutDetailSection.tsx — sem alteração; slots e selamento da 07 intactos.
- lib/milon/db/workouts.ts e lib/milon/db/executions.ts — barrels que reexportam tudo; nenhuma edição necessária.
- lib/shared/database.ts — nenhuma extensão da interface é necessária; filtros de selado e aberta resolvem-se com eq mais order mais is existentes, com filtragem em memória onde a interface não expressa negação de nulo.

Test (espelhos em __tests__, escritos por Minos, nunca por Hefesto):

- __tests__/lib/milon/workout-rotation.test.ts — regra pura de próximo e mensagem nova.
- __tests__/lib/milon/repositories/contract-07b-rotation.test.ts — contracts fakes-only dos repositórios (posição, reorder, guarda de exclusão, última selada, aberta por programa).
- __tests__/lib/milon/migration-0015.test.ts — aplicação idempotente da migração 0015 e auditoria com nome idêntico.
- __tests__/lib/milon/hooks/useTodayWorkout-rotation.test.ts — resolução por aberta, por histórico com volta, sem histórico, ficha nova, troca manual, erro de carga com retry.
- __tests__/lib/milon/hooks/useProgramWorkouts-reorder.test.ts — operação reorder com sucesso, erro e programa inativo fora do hook.
- __tests__/components/milon/WorkoutListReorder.test.tsx — alças de arrastar, entrega de orderedIds, ausência em readOnly.
- __tests__/lib/milon/db/workouts.test.ts e executions.test.ts — extensões de cobertura via barrels já existentes, a critério de Minos.

Docs:

- Nenhum documento novo; Mnemósine atualiza AGENTS.md, CHANGELOG.md e README.md em fase própria após homologação.

## 3. Contratos (interfaces, tipos, assinaturas e props — descrição textual)

Tipos em lib/milon/types.ts:

- WorkoutRow passa a expor position do tipo número ou nulo; nulo significa linha gravada antes da migração 0015 e ordena por último.
- Workout de domínio passa a expor position do tipo número ou nulo com o mesmo significado; o mapeador do repositório transporta o valor sem inventar número.
- Nenhum tipo de execução muda; WorkoutExecution e WorkoutExecutionRow seguem com finishedAt nulo para aberta e preenchido para selada.

Regra pura em lib/milon/workout-utils.ts:

- Nova constante MSG_TREINO_COM_EXECUCOES com o texto exato: Este treino possui execuções registradas. O histórico é preservado e o treino não pode ser excluído.
- Nova função pura pickNextWorkoutAfterLastSealed que recebe a lista ordenada de identificadores de treino e o identificador do último selado (ou nulo) e devolve: o primeiro identificador quando o último é nulo ou não pertence mais à lista; o vizinho seguinte quando pertence; o primeiro da lista quando o último é o derradeiro (volta ao primeiro); nulo quando a lista é vazia.

Repositório lib/milon/repositories/workouts.ts:

- listWorkoutsByProgram ordena por position ascendente com nulos por último, depois created_at ascendente, depois id ascendente; o mapeador transporta position.
- createWorkout atribui position igual ao maior valor não-nulo vigente mais um, ou um quando não há treinos no programa; mantém validações vigentes de nome.
- reorderWorkouts com parâmetros db, programId e orderedWorkoutIds valida que o conjunto recebido é idêntico ao conjunto dos treinos do programa e, em caso de divergência, lança o erro exato: A ordem informada não corresponde aos treinos do programa. Em caso de igualdade, regrava position de um até o total na ordem recebida.
- deleteWorkout mantém a guarda vigente de treino com exercícios e adiciona, antes da remoção, a verificação de execuções associadas ao treino (abertas ou seladas); havendo qualquer uma, lança MSG_TREINO_COM_EXECUCOES; a trava RESTRICT do banco permanece como backstop.
- Novos standalones: reorderWorkoutsStandalone com parâmetros programId e orderedWorkoutIds.

Repositório lib/milon/repositories/executions.ts:

- findLastSealedExecutionByProgram com parâmetros db e programId devolve a execução selada mais recente do programa, definida como finished_at não-nulo, ordenada por finished_at descendente, com desempate por created_at descendente e depois id descendente; devolve nulo quando não há selada. A filtragem de não-nulo é feita em memória sobre a consulta por programa ordenada, pois a interface do cliente não expressa negação de nulo.
- findOpenExecutionByProgram com parâmetros db e programId devolve a execução aberta do programa (finished_at nulo) mais recente por started_at descendente com desempate por id descendente; devolve nulo quando não há aberta. Havendo mais de uma aberta no programa (possível até o invariante por dono do item 7c, fora desta feature), a escolha da mais recente é comportamento aceito e documentado.
- Novos standalones: findLastSealedExecutionByProgramStandalone e findOpenExecutionByProgramStandalone.

Contratos em lib/milon/repositories/interfaces.ts:

- IWorkoutRepository ganha reorderWorkouts com parâmetros programId e orderedWorkoutIds devolvendo promessa vazia.
- IWorkoutExecutionRepository ganha findLastSealedExecutionByProgram com parâmetro programId devolvendo execução ou nulo, e findOpenExecutionByProgram com parâmetro programId devolvendo execução ou nulo.

Fakes:

- FakeWorkoutRepository ordena por position com nulos por último e desempates iguais aos do real; createWorkout atribui posição pela mesma regra; reorderWorkouts valida conjunto idêntico com a mesma mensagem; deleteWorkout lança MSG_TREINO_COM_EXERCICIOS quando há entradas e MSG_TREINO_COM_EXECUCOES quando há execuções semeadas (o seed ganha coleção opcional de execuções por treino para esse fim).
- FakeWorkoutExecutionRepository semeia execuções e implementa as duas consultas com os mesmos critérios e desempates do real.

Assinatura de hook useTodayWorkout (retorno preservado):

- Retorno inalterado: program, workouts, selectedWorkoutId, selectWorkout, loading, errorMsg, errorOrigin, successNotice nulo, retry.
- Resolução da seleção após carregar programa e treinos: primeiro consulta a aberta do programa via findOpenExecutionByProgramStandalone; se existir e o treino dela estiver na lista carregada, seleciona esse treino; senão, consulta a última selada via findLastSealedExecutionByProgramStandalone e aplica pickNextWorkoutAfterLastSealed sobre os identificadores na ordem recebida; sem selada, seleciona o primeiro; lista vazia mantém nulo sem erro.
- selectWorkout segue síncrona e restrita aos identificadores da lista atual; identificador fora da lista é ignorado sem erro e sem travar a próxima resolução automática.
- Falha em qualquer etapa da cadeia gera errorMsg não-nulo com errorOrigin carga e retry que repete e-mail, programa ativo, treinos, aberta e selada.

Assinatura de hook useProgramWorkouts (acréscimo):

- Nova operação reorder com parâmetro de identificadores ordenados que persiste via reorderWorkoutsStandalone, recarrega lista e subtítulos, exibe aviso de sucesso vigente e, em falha, registra errorMsg com origem operacao sem fechar a lista.
- remove estende o mapeamento vigente: mensagens iguais a MSG_TREINO_COM_EXERCICIOS ou a MSG_TREINO_COM_EXECUCOES geram origem bloqueio; demais falhas geram origem operacao.

Props de WorkoutList (acréscimo):

- Nova prop opcional onReorder que recebe a lista ordenada de identificadores ao soltar o arrasto; ausente, a lista comporta-se exatamente como hoje.
- Alças de arrastar marcadas com atributo data-drag-handle e gesto por Pointer Events nativos com reposicionamento otimista no DOM, fantasma com opacidade reduzida e indicador de posição de soltura, reutilizando o protocolo de WorkoutEntriesList; alças ocultas quando readOnly é verdadeiro.

Página de programa:

- Conecta onReorder de WorkoutList à operação reorder do hook somente quando o programa não é inativo; em programa inativo nada é oferecido e a ordem permanece inalterada.

## 4. Data Flow

Abertura do Treino do Dia sem aberta: página monta useTodayWorkout, que resolve e-mail, programa ativo do dono, treinos ordenados por posição, aberta do programa (ausente) e última selada do programa; aplica a função pura de próximo sobre a ordem vigente e entrega selectedWorkoutId; a seção de detalhe carrega o treino e exibe o template com execução iniciável; selar grava finished_at e a próxima abertura avança um na ordem vigente.

Abertura com aberta: a mesma cadeia encontra a aberta do programa e seleciona o treino dela acima de qualquer selado; a seção de detalhe carrega a aberta existente e exibe a insígnia de em execução com os slots de Cancelar e Finalizar da 07; reordenar nesse meio tempo não desvia a aberta e vale para a próxima resolução por selado.

Reordenação no detalhe do programa: gesto de arrastar em WorkoutList entrega orderedIds à página, que chama reorder do hook, que persiste via reorderWorkoutsStandalone e recarrega a lista; a próxima abertura do Treino do Dia lê a ordem nova do repositório.

Exclusão com execução: tentativa de excluir treino com execução associada falha no repositório com MSG_TREINO_COM_EXECUCOES, o hook classifica como bloqueio, a lista exibe mensagem sem nova tentativa e nada é removido nem reordenado.

Criação de treino: create atribui a próxima posição ao fim da ordem vigente, de modo que ficha nova e treinos novos entram no giro sem histórico herdado de outro programa.

## 5. Decisões Técnicas

- DDLT1: position anulável com backfill total em vez de coluna obrigatória direta, para que a migração seja aplicável sobre base com treinos existentes sem violar restrição; após o backfill todas as linhas possuem valor e novas linhas nascem numeradas pelo repositório.
- DDLT2: nenhuma trava nova de unicidade sobre position; a ordem é convenção de leitura mais escrita total pelo reorder, e edição simultânea segue sem trava com última gravação prevalecendo, conforme a spec.
- DSELT1: última selada definida por finished_at descendente com desempate por created_at e id, sem inventar dado novo, conforme a spec que delega o desempate ao plano.
- DABT1: múltiplas abertas no mesmo programa resolvem para a mais recente por started_at; o invariante de no máximo uma ativa por dono pertence ao item 7c e não é criado aqui.
- DORD1: nulos de position ordenam por último com desempate por criação, o que equivale à ordem inicial igual à criação exigida pela spec para migrações legadas.
- DSELT2: parcial selada não exige distinção porque toda selada possui finished_at preenchido; a regra pura opera somente sobre o identificador do treino da última selada.
- DDEL1: guarda amigável no repositório antes do RESTRICT para produzir mensagem de bloqueio compreensível; o banco permanece como backstop para corridas.
- DUI1: reutilização do protocolo Pointer Events de WorkoutEntriesList sem dependência nova, com alças ocultas em readOnly, atendendo D2 e D7 sem novo componente de lista.
- DUI2: nenhuma prop nova de indicação de execução no Treino do Dia; a insígnia vigente da seção cobre D10 sem acoplamento novo entre hook e seção.
- DTEST1: contracts de repositório seguem fakes-only conforme decisão 57; nenhum teste acessa Supabase real.

## 6. Riscos e Mitigações

- Risco: empate de finished_at entre dois selamentos quase simultâneos dos dois donos em treinos distintos. Mitigação: desempate determinístico por created_at e id; comportamento aceito pela spec.
- Risco: mais de uma aberta no mesmo programa até o item 7c. Mitigação: escolha determinística da mais recente com documentação explícita; sem nova trava nesta feature.
- Risco: reordenação concorrente ao selamento mudar o próximo exibido. Mitigação: comportamento aceito pela spec; a resolução sempre lê a ordem vigente do repositório.
- Risco: migração 0015 aplicada em ambiente com treinos existentes. Mitigação: backfill por programa pela ordem de criação cobre todas as linhas; teste de migração valida idempotência e auditoria.
- Risco: regressão da seleção vigente em cenários sem histórico. Mitigação: caminho sem selada preserva o primeiro da ordem e é coberto por teste de hook dedicado.
- Risco: regressão de exclusões vigentes. Mitigação: guards existentes preservados e contracts cobrem treino com exercícios, treino com execução e programa com treinos.

## Mapeamento Schema → Código

| Tabela | Coluna | Migração | Repositório | Hook | Componente |
|---|---|---|---|---|---|
| workouts | position (nova, número ou nulo) | 0015 migration-0015-milon-workout-position.sql | repositories/workouts.ts (lista ordenada, criação numerada, reorderWorkouts, guarda de exclusão) | useProgramWorkouts (reorder), useTodayWorkout (lê ordem vigente) | WorkoutList (arrastar), página de programa (conexão) |
| workouts | id, program_id, name, created_at, created_by (vigentes) | 0009 | repositories/workouts.ts | useProgramWorkouts, useTodayWorkout | WorkoutList, TodayWorkoutSwitcher |
| workout_executions | finished_at, started_at, created_at, id, workout_id, program_id (vigentes) | 0011 | repositories/executions.ts (findLastSealedExecutionByProgram, findOpenExecutionByProgram) | useTodayWorkout (resolução aberta mais histórico) | WorkoutDetailSection (insígnia vigente, sem alteração) |
| workout_executions | workout_id com RESTRICT (vigente, backstop) | 0011 | repositories/workouts.ts (guarda amigável prévia) | useProgramWorkouts (origem bloqueio) | WorkoutList (mensagem via AsyncState) |
| workout_entries, workout_series | position (vigentes, referência de gesto) | 0009 | repositories/workouts.ts reorderEntries (referência, sem alteração) | useWorkoutDetail (sem alteração) | WorkoutEntriesList (referência de arrasto) |

## Migrações

Migração 0015, arquivo utils/migrations/migration-0015-milon-workout-position.sql, reservada por este plano como próximo inteiro livre após 0014:

- DDL em texto: alteração da tabela public.workouts com adição da coluna position do tipo inteiro anulável; criação de índice sobre programa mais posição para a leitura ordenada; nenhuma alteração em políticas de acesso, que seguem as vigentes da tabela.
- Backfill em texto: atualização que preenche position com a classificação sequencial a partir de um dentro de cada programa, ordenando as linhas existentes por created_at ascendente e id ascendente; cobre todas as linhas, inclusive programas com um único treino.
- Rollback em texto: remoção do índice criado e remoção da coluna position; aplicável somente em ambiente onde a migração 0015 ainda não foi promovida; nunca editar nem renomear arquivo aplicado.
- Auditoria: inserção em public.schema_migrations com spec_id milon-07b, spec_name Rotação do Treino do Dia por histórico e script_name idêntico ao nome do arquivo migration-0015-milon-workout-position.sql, com conflito ignorado pelo nome do script; bloco de auto-criação idempotente da tabela de auditoria seguindo o padrão das migrações 0009 a 0014.

## Código Legado/Removível

| Item | Critério de Busca Zerada | Arquivos Afetados |
|---|---|---|
| Seleção fixa do primeiro treino por criação em useTodayWorkout (montagem e retry escolhendo list[0].id) | Busca por list[0].id dentro de lib/milon/hooks/useTodayWorkout.ts retorna 0 ocorrências em código vivo | lib/milon/hooks/useTodayWorkout.ts |
| Ordenação primária de treinos somente por criação sem posição | Sem critério de remoção total, pois created_at e id permanecem como desempates documentados; a verificação é comportamental via contracts de ordenação por posição | lib/milon/repositories/workouts.ts, lib/milon/repositories/fakes/fakeWorkoutRepository.ts |

## Tasks

- TASK-001 (minos): contracts RED da camada de dados e da regra pura; files: __tests__/lib/milon/workout-rotation.test.ts, __tests__/lib/milon/repositories/contract-07b-rotation.test.ts; consumes: contratos do plano §3; produces: contratos RED documentados; dependencies: nenhuma.
- TASK-002 (hefesto): migração 0015 mais tipos mais regra pura mais repositórios mais fakes em GREEN; files: utils/migrations/migration-0015-milon-workout-position.sql, lib/milon/types.ts, lib/milon/workout-utils.ts, lib/milon/repositories/workouts.ts, lib/milon/repositories/executions.ts, lib/milon/repositories/interfaces.ts, lib/milon/repositories/fakes/fakeWorkoutRepository.ts, lib/milon/repositories/fakes/fakeWorkoutExecutionRepository.ts, __tests__/lib/milon/migration-0015.test.ts; consumes: contratos RED da TASK-001; produces: camada de dados com posição, rotação consultável e auditoria 0015; dependencies: TASK-001.
- TASK-003 (minos): testes RED dos hooks; files: __tests__/lib/milon/hooks/useTodayWorkout-rotation.test.ts, __tests__/lib/milon/hooks/useProgramWorkouts-reorder.test.ts; consumes: camada de dados da TASK-002; produces: contratos RED dos hooks; dependencies: TASK-002.
- TASK-004 (hefesto): hooks em GREEN com substituição da seleção; files: lib/milon/hooks/useTodayWorkout.ts, lib/milon/hooks/useProgramWorkouts.ts; consumes: contratos RED da TASK-003; produces: seleção por aberta mais histórico e operação reorder; dependencies: TASK-003.
- TASK-005 (minos): testes RED da interface de reordenação; files: __tests__/components/milon/WorkoutListReorder.test.tsx; consumes: hooks da TASK-004; produces: contratos RED da interface; dependencies: TASK-004.
- TASK-006 (hefesto): interface em GREEN mais suite completa; files: components/milon/WorkoutList.tsx, app/milon/programs/[id]/page.tsx; consumes: contratos RED da TASK-005; produces: reordenação por arrastar no detalhe do programa e suite verde; dependencies: TASK-005.
