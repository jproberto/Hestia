# Execução série a série — Replano UI com paridade total (Mílon #5, 2º retorno)
> Para Zeus: delegar via hefesto/minos task por task

**Objetivo:** Refazer somente a UI da execução série a série para ter paridade total com a manutenção, sem tocar em persistência, hook ou contratos de dados.
**Arquitetura:** O ramo de execução do SeriesCard passa a renderizar a mesma face da manutenção (mesmos rótulos, formatos, conversão secundária e toggles) dentro do invólucro clicável de marcação; o SeriesEditModal passa a oferecer as mesmas opções da manutenção (alternar repetição/tempo, kg/lb); o chrome de manutenção do ExerciseEntryCard volta a ficar visível em execução; cliques em controles interativos não propagam para o alternar.
**Tech Stack:** Next.js App Router, React client components, componentes ui Button/Input/Label, Vitest + Testing Library, sem migração nova.

## Restrições Globais
- Feedback humano exato que motiva este replano (verdade, sem interpretação): "Você alterou o formato do card da série. Está mostrando só números. Não dá pra saber se é repetição, se é tempo, qual a unidade da carga. O modal de alteração também não tem as opções de trocar repetição/tempo nem kg/lb. Deveria ter exatamente a mesma cara da outra tela. Também não tem opção de alterar a quantidade de séries do exercício. Não vejo opção de excluir exercício, nem reordenar... Refaça tudo."
- Persistência pronta e commitada é MANTIDA e intocada: migração 0011, executions repository, useWorkoutExecution, confirmação ao zerar, regra de salvar replica sempre para a origem mais as seguintes incluindo marcadas. Nenhuma task deste plano cria migração, toca banco, altera repository, fake, barrel de db, hook ou tipo de execução.
- Marcação mantida: card clicável (toque curto alterna na hora sem confirmação, toque longo de quinhentos milissegundos abre o modal), série marcada tem fundo na cor do módulo, zero checkbox e zero botão de marcar.
- Proibido criar use-cases, schemas, mappers.ts, services ou factories createXService; proibido importar @supabase fora de lib/shared; validação runtime vive nos forms e modais com as funções de lib/milon/workout-utils; títulos de conteúdo usam o token font-display; estados assíncronos usam components/ui/AsyncState sem reimplementar; modais nunca fecham no erro.
- Sem código de implementação neste plano, só objetivos, contratos textuais, comandos e testes.

## 1. Arquitetura

O diagnóstico, lido no código real, localiza três divergências de UI e uma regra de coexistência de gestos. Primeiro, o ramo de execução de components/milon/SeriesCard.tsx exibe linha única compacta de valores, enquanto a manutenção no mesmo arquivo exibe rótulos explícitos, conversão secundária de carga e toggles; o replano manda o ramo de execução renderizar a mesma face da manutenção (mesmos rótulos, mesmos formatos, mesma conversão secundária, mesmos toggles) reaproveitando os mesmos trechos do arquivo em vez de duplicar marcação, e apenas envolve essa face no invólucro clicável que carrega o fundo da cor do módulo quando marcada. Segundo, components/milon/SeriesEditModal.tsx hoje exibe dois campos simultâneos sem alternância e carga com rótulo textual sem botões de unidade; o replano manda o modal expor campo único repetição/tempo com o mesmo botão de alternância da manutenção e carga com os mesmos botões kg/lb da manutenção, com o salvamento mantendo a regra vigente de replicar sempre para a origem mais as seguintes. Terceiro, components/milon/ExerciseEntryCard.tsx oculta todo o chrome de manutenção em execução por causa da condição que combina negação de execução; o replano remove esse ocultamento para que quantidade de séries, descanso, editar, excluir e handle de reordenar voltem a ficar disponíveis no Treino do Dia, mantendo o pacote de execução apenas como comportamento dos cards de série. Quarto, todos os controles interativos dentro do card clicável interrompem a propagação do clique para que operar toggle, campo ou botão nunca dispare o alternar; o alternar acontece somente no fundo do card, no teclado e no temporizador de toque longo já existente.

## 2. Componentes (Create/Modify/Test/Docs)

### Create

Nenhum arquivo novo de produção. Nenhum teste novo em arquivo novo: os testes de paridade entram nos arquivos de teste já existentes listados abaixo.

### Modify

- components/milon/SeriesCard.tsx, camada components presentacional, motivo: o ramo de execução passa a renderizar a mesma face da manutenção (rótulo Repetições ou Tempo em segundos conforme o modo, rótulo Carga com unidade visível, conversão secundária de carga, botão de alternar repetição/tempo com os mesmos rótulos acessíveis da manutenção, botões kg/lb com a mesma semântica do toggle da manutenção) reaproveitando os trechos do próprio arquivo, envolvida no invólucro clicável com fundo da cor do módulo quando marcada; todo controle interativo interno interrompe a propagação do clique; toque curto, toque longo de quinhentos milissegundos com supressão do clique seguinte, alternativa por teclado e alvos de ao menos quarenta e quatro pixels são preservados. Teste em __tests__/components/milon/SeriesCard.test.tsx. Story em components/milon/SeriesCard.stories.tsx ganha o estado de execução com a face de paridade.
- components/milon/SeriesEditModal.tsx, camada components presentacional por props, motivo: o modal passa a ter campo único de repetição/tempo com o mesmo botão de alternância da manutenção, campo de carga com conversão secundária e os mesmos botões kg/lb da manutenção ligados a um callback de escolha de unidade, mantendo Salvar e Cancelar, validação herdada com mensagem visível e nunca fechando no erro; o salvamento continua replicando sempre para a origem mais as seguintes por decisão da seção e do hook, sem indicador de cópia. Ganha a prop de escolha de unidade e mantém as props de série em edição, unidade, salvamento, erro, fechar e salvar. Teste em __tests__/components/milon/SeriesEditModal.test.tsx. Story em components/milon/SeriesEditModal.stories.tsx cobre o modal com as opções de paridade.
- components/milon/ExerciseEntryCard.tsx, camada components presentacional por props, motivo: remover o ocultamento do chrome de manutenção em execução para que quantidade de séries, descanso, editar, excluir e handle de reordenar voltem a operar no Treino do Dia, ainda desligados somente por programa inativo; o identificador showMaintenance deixa de existir e a visibilidade passa a depender somente de programa inativo; o pacote de execução segue repassado aos SeriesCards sem interpretação. Teste em __tests__/components/milon/ExerciseEntryCard.test.tsx.
- components/milon/WorkoutDetailSection.tsx, camada components de composição, motivo: ligar o callback de escolha de unidade do modal ao caminho de persistência de unidade já existente na seção e manter o salvamento do editor sobre a operação do hook que replica sempre, sem mudar fluxos de adicionar, remover, reordenar, quantidade, descanso ou confirmações existentes. Teste em __tests__/components/milon/WorkoutDetailSection.test.tsx.
- components/milon/WorkoutEntriesList.tsx, sem mudança de comportamento prevista: busca, filtro, reordenar por handle, paginação e botão de adicionar já operam somente sob programa inativo e o pacote de execução já é repassado sem interpretação; entra apenas como cobertura de regressão na task final.

### Test

Espelhos em __tests__ conforme a lista Modify, todos em arquivos de teste já existentes: __tests__/components/milon/SeriesCard.test.tsx, __tests__/components/milon/SeriesEditModal.test.tsx, __tests__/components/milon/ExerciseEntryCard.test.tsx, __tests__/components/milon/WorkoutDetailSection.test.tsx, mais a página do Treino do Dia em __tests__/app/milon/today/page.test.tsx como regressão. Nenhum teste de persistência, hook ou manutenção muda de expectativa.

### Docs

Nenhum nesta feature. Documentação de produto e changelog pertencem à Mnemósine pós-homologação.

### Intocados (proibido alterar neste replano)

utils/migrations/migration-0011-milon-execucao.sql, lib/milon/repositories/executions.ts, lib/milon/repositories/fakes/fakeWorkoutExecutionRepository.ts, lib/milon/repositories/workouts.ts, lib/milon/repositories/interfaces.ts, lib/milon/repositories/fakes/fakeWorkoutRepository.ts, lib/milon/db/executions.ts, lib/milon/db/workouts.ts, lib/milon/hooks/useWorkoutExecution.ts, lib/milon/types.ts, lib/milon/workout-utils.ts, app/milon/today/page.tsx, app/milon/programs/[id]/workouts/[workoutId]/page.tsx. A task final verifica ausência desses caminhos no diff.

### Tarefa de substituição

A condição de ocultamento do chrome em components/milon/ExerciseEntryCard.tsx é removida: a task carrega o critério de que a busca por showMaintenance retorna 0 em código vivo. Os identificadores dos dois campos simultâneos do modal antigo são removidos com o campo único: a task do modal carrega o critério de que a busca por series-edit-reps retorna 0 em código vivo.

## 3. Contratos (interfaces, tipos e textos — descrição textual, sem código de implementação)

- Face de paridade do card: em execução o card exibe o rótulo sequencial da série, o rótulo Repetições ou o rótulo Tempo em segundos conforme o modo vigente com o mesmo botão de alternância da manutenção e os mesmos rótulos acessíveis de alternância, o valor reservado com o marcador de vazio da manutenção quando ausente, o rótulo Carga com a unidade visível, a conversão secundária de carga da manutenção quando houver unidade e carga, e os botões kg e lb com a mesma semântica de fonte de verdade do toggle da manutenção; zero checkbox e zero botão de marcar.
- Invólucro de marcação: o fundo do card é a área clicável com papel de botão, estado pressionado refletindo marcada ou desmarcada, fundo na cor do módulo somente quando marcada, altura mínima de toque para mão suada, teclado com Enter e Espaço equivalendo ao toque curto, toque longo de quinhentos milissegundos abrindo o editor com supressão do clique seguinte, movimento cancelando o temporizador, programa inativo totalmente não interativo.
- Regra de clique: qualquer controle interativo dentro do card (botões de alternância e de unidade, campos de entrada, botão de aplicar) interrompe a propagação dos eventos de ponteiro e de clique para que operar um controle nunca alterne a marcação; somente o fundo do card alterna.
- Modal de paridade: props com a série em edição, a unidade de carga do exercício, o estado de salvamento, a mensagem de erro local, o callback de fechar, o callback de escolha de unidade e o callback de salvar recebendo somente os campos; campo único de repetição/tempo com alternância sob o identificador series-edit-valor (os identificadores series-edit-reps e series-edit-tempo deixam de existir), campo de carga sob o identificador vigente series-edit-carga com conversão secundária e botões kg/lb, botões Salvar e Cancelar, título com o token font-display; validação herdada das funções de workout-utils com mensagem visível; nunca fecha no erro de validação nem no erro de persistência, preservando o digitado.
- Escolha de unidade no modal: segue a mesma semântica do toggle da manutenção, com atualização visual imediata e persistência pelo caminho já existente na seção, revertendo em caso de falha com mensagem visível; a carga segue intacta e vazio segue diferente de zero.
- Chrome restaurado no Treino do Dia: quantidade de séries com confirmação ao reduzir com série preenchida, descanso, editar exercício, excluir exercício com a confirmação existente, handle de reordenar com arrastar e soltar, adicionar exercício, busca e filtro — todos disponíveis em execução e desligados somente por programa inativo, com as mesmas mensagens e confirmações da manutenção.
- Salvamento do editor: comportamento único vigente e inalterado — atualiza a origem no template e replica os valores para as séries de posição maior na mesma entrada, incluindo as já marcadas, sem tocar em feito, execução ou retratos; a série editada mantém marcada se estava marcada e desmarcada se estava desmarcada.

## 4. Data Flow

1. A pessoa abre o Treino do Dia e a seção carrega o template pela cadeia existente com a flag de execução ligada; o hook de execução carrega a execução aberta e as realizadas, sem nenhuma mudança neste replano.
2. Cada card de série exibe a face de paridade com os valores planejados atuais e o fundo aceso somente quando houver realizada correspondente.
3. Toque curto no fundo do card alterna a marcação na hora pela operação existente do hook; operar qualquer controle interno nunca alterna.
4. Toque longo no card abre o modal de paridade com os valores atuais; alternar repetição/tempo troca o campo único; trocar kg/lb atualiza a unidade pelo caminho existente.
5. Salvar valida localmente com mensagem visível e modal aberto no erro; persistindo, replica sempre para a origem mais as seguintes, fecha o modal e mantém o estado de marcação.
6. Alterar quantidade, descanso, editar, excluir e reordenar no Treino do Dia operam exatamente como na manutenção, pelas operações existentes do detalhe; erro alimenta o banner sem retry indevido.
7. A página de manutenção não recebe a flag e segue byte a byte com o comportamento homologado.

## 5. Decisões Técnicas (trade-offs, registradas em context.json.decisions via Zeus)

- D13 Face compartilhada no próprio SeriesCard em vez de componente novo: os trechos de rótulo, formato, conversão secundária e toggles já existem no arquivo e são a definição vigente da cara da manutenção; reaproveitá-los elimina divergência futura por construção. Alternativa descartada: novo componente de card de execução com marcação duplicada.
- D14 Chrome sempre visível em execução em vez de modo só-marcação: o feedback humano exige quantidade, excluir e reordenar no Treino do Dia; o pacote de execução passa a governar somente o comportamento dos cards de série, nunca a visibilidade do chrome. Alternativa descartada: manter o ocultamento e reabrir o escopo com o humano.
- D15 Modal espelhando as opções da manutenção em vez de dois campos simultâneos: campo único com alternância e botões de unidade são a cara exigida; a replicação segue incondicional por decisão vigente, sem indicador de cópia. Alternativa descartada: manter os dois campos e adicionar toggles ao lado.
- D16 Interrupção de propagação nos controles em vez de áreas clicáveis separadas: o card inteiro segue sendo o marcador para mão suada e cada controle se auto-isola do alternar. Alternativa descartada: botão de marcar separado, vetado pela spec vigente.
- D17 Sem botão de aplicar a todas dentro do card em execução: o salvamento do modal já replica sempre para a origem mais as seguintes por regra vigente, de modo que o botão seria redundante no fluxo de execução; a manutenção mantém o dela intacto. Alternativa registrada para o approve-plan: se o humano preferir o botão visível também em execução, ele apenas confirma a mesma replicação. Ver unknowns.
- D18 Unidade do modal persiste na hora como na manutenção em vez de só no salvar: mesma semântica do toggle da manutenção, com reversão visível em falha. Alternativa registrada para o approve-plan: aplicar a unidade somente junto ao salvar. Ver unknowns.

## 6. Riscos e Mitigações

- Risco: regressão na manutenção ao tocar nos cards compartilhados. Mitigação: reaproveitamento dos trechos vigentes sem mudar o caminho sem pacote de execução; testes existentes de SeriesCard, ExerciseEntryCard, WorkoutEntriesList, WorkoutDetailSection e páginas seguem verdes sem mudar expectativas; suite completa e cobertura de pelo menos oitenta por cento na task final.
- Risco: toque longo conflitar com rolagem ou com o arrastar do handle. Mitigação: temporizador cancelado por movimento, arrastar inicia somente pelo handle fora dos cards de série, botão e teclado como caminhos sem gesto; homologação manual cobre o gesto em aparelho real.
- Risco: clique em controle disparar o alternar. Mitigação: interrupção de propagação em todo controle interno coberta por teste dedicado de clique em cada controle sem mudança de marcação.
- Risco: alteração acidental em persistência ou hook. Mitigação: lista de intocados com verificação objetiva de ausência desses caminhos no diff em todas as tasks de implementação.
- Risco: dois donos marcando o mesmo treino ao mesmo tempo. Mitigação: inalterada, herdada do plano vigente (unicidade e idempotência já commitadas).
