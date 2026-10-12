# Spec: Encerrar treino com confirmação

## 1. Problema Real

O módulo Mílon ainda não tem uso real em academia. As decisões desta feature são de desenho, não de dor observada, conforme confirmação humana.

Na academia, a pessoa marca séries feitas uma a uma no Treino do Dia e em algum momento precisa dizer que aquele treino acabou. Hoje a execução abre na primeira marcação e só pode ser desfeita ao desmarcar a última série, que pergunta se deseja cancelar a execução desse treino. Falta o gesto oposto: selar o que foi feito para valer como treino realizado, mesmo quando parcial, de modo que sirva de base para métricas futuras de duração e volume.

O valor desta feature é separar dois destinos que hoje se confundem. Cancelar descarta um treino começado errado, sem valor de histórico, e apaga os registros daquela execução. Finalizar sela o executado, mesmo incompleto, e a falta vira dado, não bloqueio. Ambos exigem aviso com confirmação obrigatória. A palavra do botão é Finalizar e equivale a Encerrar do item 7 do backlog do módulo.

Fontes: decisão humana Q1 a Q4 registrada no contexto da feature, item 7 do backlog do módulo Mílon, specs das features 04 Treino do Dia v1 e 05 Execução série a série.

## 2. Usuários e Cenários

Usuários: o casal, com login individual cada um, mesmo modelo das features 01 a 05. Cada um abre o próprio treino ao chegar na academia. Não há permissão restrita. O dono do programa define a origem do Treino do Dia, mesma regra da feature 04. Uso no celular, com mão suada, mesma exigência de tela pequena das features 03 a 05.

Cenário 1: finalizar o treino completo, com todas as séries marcadas, sem burocracia extra além do necessário. Cenário 2: finalizar o treino parcial, com séries faltando, assumindo a falta como dado para métricas futuras. Cenário 3: cancelar uma execução começada errada, descartando tudo sem deixar histórico. Cenário 4: tentar finalizar sem nenhuma série feita e ser conduzido ao cancelamento em vez do selamento.

Jornada passo a passo: a pessoa executa séries no Treino do Dia, com o nome do treino exibindo indicação visual de em execução enquanto houver execução aberta. O botão Cancelar fica no topo da página do Treino do Dia. O botão Finalizar fica no final da página, abaixo do último Adicionar Exercício. Ao acionar Finalizar ou Cancelar, a pessoa vê a pergunta correspondente ao seu caso, confirma ou desiste, e permanece no Treino do Dia. Após o selamento, a página exibe o próximo treino segundo a regra vigente do Treino do Dia, cuja inteligência de rotação será revisitada após esta feature conforme a spec 04 seção 4. A execução selada fica arquivada e imutável, sem edição.

Estados de tela: seguem o padrão centralizado do módulo com o componente central de estado assíncrono. Carregando exibe texto de carregamento. Erro de carga exibe nova tentativa. Erro de operação e bloqueio de domínio exibem mensagem sem nova tentativa. Modais de confirmação nunca fecham no erro e preservam o digitado. Títulos de conteúdo seguem o token tipográfico do módulo e a cor do Mílon. Foco ao concluir: a pessoa permanece no Treino do Dia, sem navegação para fora do módulo.

## 3. Regras de Negócio

### Terminologia

O botão de selamento chama-se Finalizar. Finalizar equivale a Encerrar do item 7 do backlog. Esta spec usa Finalizar para o botão e selar, selamento e encerrado como sinônimos do mesmo ato.

### Posições fixas

Cancelar execução fica no topo da página do Treino do Dia. Finalizar treino fica no final da página, abaixo do último Adicionar Exercício. Nenhum dos dois aparece na manutenção em Programas. Nenhum dos dois aparece quando não há execução aberta.

### Os quatro casos de confirmação

Caso 1, Cancelar com execução aberta: ao acionar Cancelar, a pergunta exibida é Tem certeza que deseja cancelar essa execução? Todas as informações serão excluídas. Confirmar exclui os registros daquela execução, desbloqueia o template e limpa o momento de início. Desistir mantém a execução aberta, o template continua bloqueado e o início segue registrado.

Caso 2, Finalizar parcial com pelo menos uma série feita e pelo menos uma série não executada: ao acionar Finalizar, a pergunta exibida é Ainda existem séries não executadas. Tem certeza que deseja finalizar o treino? Confirmar sela a execução com o momento de término registrado, mesmo incompleta. Desistir mantém a execução aberta sem nada selado.

Caso 3, Finalizar completo com todas as séries marcadas: ao acionar Finalizar, não há confirmação, o selamento acontece direto com o momento de término registrado.

Caso 4, marcar a última série pendente pelo card: no momento em que todas as séries ficam marcadas por esse toque, a pergunta exibida é Você executou todas as séries, deseja finalizar o treino? Confirmar sela com o momento de término registrado. Desistir mantém a execução aberta com todas as séries marcadas.

### Vazio com zero séries feitas

Com zero séries feitas, Finalizar não sela. O acionamento é bloqueado com a mensagem O treino não pode ser finalizado pois nenhuma série foi feita. Em vez disso, deseja cancelar e excluir a execução desse treino? A mensagem conduz ao cancelamento com exclusão da execução, sem criar registro selado vazio.

### Efeito do selamento

Selar registra o momento de término da execução. A execução selada é arquivada e imutável: não reabre, não edita, não exclui série feita, não altera valores. O template do treino volta a ficar livre para edição na manutenção, pois execução selada não bloqueia, mesma lógica já aplicada a execução inexistente. A pessoa permanece no Treino do Dia e a página passa a exibir o próximo treino segundo a regra vigente de seleção, sem criar navegação nova nesta feature.

### Efeito do cancelamento

Cancelar exclui a execução aberta e, por cascata, as séries realizadas daquela execução. Não resta histórico daquela tentativa. O template é desbloqueado e o momento de início é limpo. Nenhuma série segue marcada.

### Validações e integridade herdadas

Sem validação nova de valores. Valem as regras herdadas das features de treinos, séries planejadas e execução série a série. Existe no máximo uma execução aberta por treino. A primeira marcação de qualquer série registra o momento de início. O Treino do Dia exibe o template ao vivo com marcadores de feito por série. Enquanto houver execução aberta, o template daquele treino fica bloqueado para edição na manutenção com aviso visível de que o treino não pode ser editado pois está em execução. O nome do treino no Treino do Dia exibe indicação visual de em execução enquanto aberta. Desmarcar a última série marcada por engano segue a regra da feature 05 com a pergunta Todas as séries foram desmarcada. Deseja cancelar a execução desse treino?, sem mudança nesta feature.

### Semântica de vazio contra zero

Vazio é ausência de marcação. Zero séries feitas bloqueia Finalizar conforme a mensagem do vazio. Uma ou mais séries feitas libera Finalizar parcial ou completo conforme os casos. Zero digitado em carga ou valor continua sendo zero exibido como zero, e campo vazio continua traço, mesma regra das features 03 e 04, sem mudança.

## 4. Fora de Escopo (YAGNI)

Dentro desta versão, somente encerrar parcial com confirmação mais cancelar com confirmação, nas posições e textos confirmados pelo humano.

Fora, item por item, por confirmação humana: reabrir execução após selar, editar execução após selar, lista de histórico de treinos realizados, resumo por treino com duração e volume, timer de descanso automático, notificação de fim de descanso, rotação automática do próximo treino por histórico, duplicar treino ou exercício, reordenar treinos, mover treino entre programas, substituição de exercício na hora, séries de aquecimento ou extra, escala de esforço, reps até a falha, observações rápidas por exercício, permissões restritas, áreas privadas, integração com aplicativos externos, importação ou exportação de fichas, nova regra de ciclo de vida de programa, mudança na guarda de ativação.

Histórico e resumo pertencem à feature 09. Timer pertence à feature 06. Ajuste responsivo pertence à feature 08. Rotação por histórico permanece adiada para pós 07 conforme a spec 04 seção 4.

## 5. Critérios de Aceite

| # | Critério | Verificação |
|---|---|---|
| 1 | Dado Treino do Dia com execução aberta, o botão Cancelar aparece no topo e o botão Finalizar aparece no final abaixo do último Adicionar Exercício, e nenhum dos dois aparece na manutenção em Programas nem sem execução aberta | Manual e automatizado |
| 2 | Dado acionamento de Cancelar com execução aberta, quando exibe a pergunta, então o texto é exatamente Tem certeza que deseja cancelar essa execução? Todas as informações serão excluídas. | Manual e automatizado |
| 3 | Dada a pergunta de Cancelar, quando confirmo, então os registros daquela execução são excluídos, o template é desbloqueado, o momento de início fica limpo e nenhuma série segue marcada. Quando desisto, então a execução segue aberta, o template continua bloqueado e o início segue registrado | Manual e automatizado |
| 4 | Dado Treino do Dia com pelo menos uma série feita e pelo menos uma não executada, quando aciono Finalizar, então a pergunta exibida é exatamente Ainda existem séries não executadas. Tem certeza que deseja finalizar o treino? | Manual e automatizado |
| 5 | Dada a pergunta de Finalizar parcial, quando confirmo, então a execução é selada com momento de término registrado e fica imutável. Quando desisto, então a execução segue aberta sem nada selado | Manual e automatizado |
| 6 | Dado Treino do Dia com todas as séries marcadas, quando aciono Finalizar, então o selamento acontece direto sem confirmação, com momento de término registrado | Manual e automatizado |
| 7 | Dado que marco a última série pendente pelo card e todas ficam marcadas, então a pergunta exibida é exatamente Você executou todas as séries, deseja finalizar o treino? Confirmar sela com término registrado, desistir mantém aberta com todas marcadas | Manual e automatizado |
| 8 | Dado Treino do Dia com zero séries feitas, quando aciono Finalizar, então nada é selado e a mensagem exibida é exatamente O treino não pode ser finalizado pois nenhuma série foi feita. Em vez disso, deseja cancelar e excluir a execução desse treino? | Manual e automatizado |
| 9 | Dada execução selada, então ela não reabre, não edita e não exclui feito, o template volta a ficar livre na manutenção sem aviso de bloqueio, e a pessoa permanece no Treino do Dia com o próximo treino exibido segundo a regra vigente de seleção | Manual e automatizado |
| 10 | Dada execução selada, quando consulto somente execução aberta do treino, então o retorno é vazio, pois selada tem término preenchido e não conta como aberta | Automatizado |
| 11 | Dada falha de carga nas ações de selar ou cancelar, a pessoa vê mensagem com nova tentativa. Dada falha de operação ou bloqueio, a mensagem aparece sem nova tentativa e o modal não fecha no erro | Manual e automatizado |
| 12 | Suite completa verde, sem quebra de testes existentes, cobertura mantida em pelo menos oitenta por cento, relatório de testes regenerado antes da revisão | Automatizado |

## 6. Riscos e Dependências

Depende do Treino do Dia v1 da feature 04 com primeira aba e seleção por programa ativo do dono mais primeiro treino por criação, e da execução série a série da feature 05 com início registrado na primeira marcação, template ao vivo, bloqueio do template na manutenção e cancelamento ao desmarcar a última série. Sem essas duas, não há o que selar nem cancelar.

O momento de término ainda nunca é escrito. Está reservado a esta feature desde a feature 05, com coluna de término existente e nula enquanto aberta. A definição de como registrar o término e de como tratar migração incremental com número sequencial reservado é assunto do plano da Atena. Nenhuma migração já aplicada é editada ou renomeada.

A regra do próximo treino após o selamento usa a seleção vigente do Treino do Dia. A inteligência de rotação por histórico está adiada para pós 07 pela spec 04 e não é criada aqui. Qualquer divergência entre Treino do Dia e manutenção após selar ou cancelar deve ser tratada como defeito desta feature.

Edição simultânea pelos dois usuários segue o comportamento existente das telas, sem trava definida. A última gravação prevalece.

Cenários de teste bloqueados por dependência futura seguem a regra do backlog do módulo: o que não for executável nesta feature por depender de histórico, timer ou responsivo é repassado à feature que o libera e registrado no cenário de teste correspondente, sem virar pendência oculta.

## 7. Alternativas Consideradas

Alternativa 1, selamento silencioso sem confirmação em todos os casos: o botão selaria direto com ou sem pendência. Rejeitada porque contradiz a decisão humana de aviso mais confirmação obrigatória e apagaria a distinção entre parcial assumido e completo, além de permitir selo acidental com falta.

Alternativa 2, caminho escolhido, confirmação por caso com parcial permitido: Cancelar sempre confirma com aviso de exclusão, parcial confirma com aviso de pendência, completo sela direto, última marcada pergunta se deseja finalizar, vazio bloqueia e conduz ao cancelamento. Mantém a falta como dado para métricas futuras, preserva o gesto rápido do completo e impede selo vazio. Custo aceito: quatro textos distintos para manter, cobertos por testes de texto exato.

Alternativa 3, selamento com edição do faltante na hora: a confirmação parcial listaria cada série pendente e permitiria marcar ou dar baixa ali mesmo. Rejeitada por YAGNI nesta versão: aumenta o modal, mistura selar com executar e adia a entrega. A lista do que falta aparece como aviso de existência de pendência, sem detalhar série a série.

## Modelo de Domínio

Entidades e relações em linguagem natural, sem código.

Programa agrupa treinos vigentes de um dono, visível para os dois usuários. Treino pertence a um programa e tem ordem por criação. Entrada de exercício pertence a um treino e a um exercício da biblioteca, com posição, descanso único, modo e unidade de carga. Série planejada pertence a uma entrada, com posição, valor único e carga. Execução é a instância do treino feito no dia, pertence a um treino e a um programa, com momento de início, momento de término opcional e autor. Série realizada pertence a uma execução, a uma entrada e a uma série planejada, com posição, retrato de valor e carga, e autor.

Diagrama textual:

Programa 1 para N Treino, por dono, com status rascunho, ativo ou inativo.
Treino 1 para N Entrada de exercício, em ordem por posição.
Exercício da biblioteca 1 para N Entrada de exercício, com nome, grupo muscular e vídeo.
Entrada de exercício 1 para N Série planejada, em ordem por posição.
Treino 1 para N Execução, com no máximo uma aberta por treino, aberta é término vazio, selada é término preenchido, cancelada é excluída.
Execução 1 para N Série realizada, uma por série planejada dentro da execução, excluída em cascata ao cancelar.
Série planejada 1 para N Série realizada ao longo de execuções distintas, cada retrato guarda valor e carga do momento.

## Premissas Técnicas Validadas

| Premissa | Validada com humano | Evidência em disco |
|---|---|---|
| Existe tabela de execuções com momento de início obrigatório e momento de término opcional, onde término vazio significa aberta | Sim | Migração 0011 cria tabela de execuções com início padrão agora e término sem obrigação, mais índice único parcial de no máximo uma aberta por treino |
| Existe tabela de séries realizadas ligada à execução, entrada e série, com unicidade por execução mais série e exclusão em cascata | Sim | Migração 0011 cria tabela de realizadas com restrição única por execução e série e referência com exclusão em cascata para execução, entrada e série |
| O término nunca é escrito pela feature 05 e está reservado à feature 07 | Sim | Comentário no acesso a dados da execução afirma que o fim nunca é escrito na feature atual e fica reservado à feature 07 |
| A busca de aberta filtra somente término vazio | Sim | Acesso a dados da execução busca por treino com filtro de término vazio e retorno único opcional |
| O Treino do Dia usa seção de detalhe compartilhada com execução ligada e botões de topo e rodapé reservados | Sim | Página do Treino do Dia compõe seção de detalhe com execução ligada, e a seção aceita ações de topo, rodapé por entrada e rodapé geral hoje nulos, reservados às features 05, 06 e 07 |
| A seleção atual do Treino do Dia é programa ativo do dono mais primeiro treino por criação, com troca restrita ao programa ativo | Sim | Hook de seleção do Treino do Dia resolve email, busca programa ativo do dono, lista treinos e escolhe o primeiro da lista, com troca só entre treinos carregados |
| Execução aberta bloqueia o template na manutenção com aviso visível e selada libera | Sim | Seção de detalhe recebe trava de execução que desabilita o chrome de manutenção e exibe aviso de que o treino não pode ser editado pois está em execução, mais matriz de testes que afirma que selada com término preenchido retorna vazio e libera edição |
| Cancelar exclui a execução e as realizadas somem por cascata | Sim | Acesso a dados expõe exclusão de execução por identificador, e a migração define cascata das realizadas |
| Textos de confirmação existentes não conflitam com os quatro textos novos | Sim | Modal de confirmação do treino possui hoje somente variantes de remover exercício, reduzir séries e limpar execução com texto de última desmarcada, sem variante de finalizar |

## Cenários de Edge Case

| Cenário | Comportamento esperado |
|---|---|
| Treino sem execução aberta e botões acionados | Cancelar e Finalizar não aparecem. Nada a selar nem a excluir |
| Zero séries feitas e Finalizar acionado | Bloqueio com mensagem de vazio que conduz ao cancelamento. Nenhum registro selado vazio é criado |
| Parcial com uma feita e resto pendente | Pergunta de parcial. Confirmar sela com término registrado. Desistir mantém aberta |
| Completo com todas marcadas | Selamento direto sem confirmação. Registro com término preenchido |
| Última pendente marcada pelo card | Pergunta de todas executadas. Confirmar sela. Desistir mantém aberta com todas marcadas |
| Desmarcar última marcada por engano | Segue regra da feature 05 com pergunta de cancelar execução por limpeza, sem mudança |
| Confirmar selamento duas vezes seguidas | Segunda tentativa encontra execução já selada e não cria selo duplicado. Mensagem de operação sem nova tentativa |
| Cancelar duas vezes seguidas | Segunda tentativa encontra nada aberto e nada exclui. Tela segue íntegra |
| Falha de rede ao selar ou cancelar | Mensagem visível de operação sem nova tentativa no banner, modal não fecha, digitado e marcações preservados |
| Falha de carga ao abrir o Treino do Dia | Mensagem com nova tentativa pelo estado assíncrono central, sem botão de selar até carregar |
| Dois usuários no mesmo treino ao mesmo tempo | Sem trava. Vale a última gravação. No máximo uma aberta por treino pelo índice parcial. Segunda abertura retorna a existente |
| Template editado na manutenção durante execução aberta | Bloqueado com aviso visível e controles desabilitados. Somente o Treino do Dia escreve |
| Treino de programa inativo | Somente leitura. Sem Cancelar nem Finalizar, mesma regra das features 02 a 04 |
| Treino sem exercícios | Sem séries para marcar. Finalizar cai no bloqueio de vazio. Adicionar exercício segue regra da manutenção |
| Migração legada sem término preenchido | Execuções antigas abertas seguem abertas. Seladas futuras preenchem término. Nenhuma migração aplicada é reescrita |
| Rollback de selamento com erro após gravar término | Sem reabrir nem editar. Erro vira mensagem de operação. Estado recarregado reflete o banco |
