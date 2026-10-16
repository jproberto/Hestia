# Spec: Avançar para o próximo treino ao finalizar

## 1. Problema Real

No Treino do Dia, ao finalizar um treino e confirmar, a página permanece no mesmo treino com as marcações desfeitas, em vez de exibir o próximo treino da rotação definida na feature 7b. A pessoa precisa recarregar manualmente ou sair e voltar para ver o treino seguinte, o que quebra o fluxo de quem está na academia com o celular na mão e espera que o próximo da sequência apareça sozinho após o selamento.

O valor desta feature é fechar o gesto do Finalizar com a seleção automática já existente. O selamento continua igual ao da feature 07, sem mudança de dados. O que muda é a exibição após o sucesso. O Cancelar segue com o comportamento atual de permanecer no mesmo treino, sem avanço.

Fontes: pedido humano de 2026-10-16 como verdade de escopo, linha 7b-1 do backlog do módulo Milon, specs das features 07 Encerrar treino, 07b Rotação do Treino do Dia e 07c Troca com execução ativa, mais leitura real da página do Treino do Dia, da seção de detalhe compartilhada e dos dois hooks de seleção e de execução ativa.

## 2. Usuários e Cenários

Usuários: o casal, com login individual cada um, mesmo modelo das features 01 a 07c. Cada um abre o próprio treino ao chegar na academia. Não há permissão restrita. O dono do programa define a origem do Treino do Dia, mesma regra da 04. Uso no celular, mesma exigência de tela pequena das features 03 a 07c.

Cenário 1: finalizar o treino completo ou parcial e ver o próximo. A pessoa marca séries, aciona Finalizar no rodapé, confirma quando houver confirmação, e a página passa a exibir o treino seguinte da rotação 7b, sem marcações penduradas do treino anterior.

Cenário 2: cancelar a execução e continuar no mesmo treino. A pessoa aciona Cancelar no topo, confirma, e a página permanece no mesmo treino, agora sem execução aberta e sem marcações, pronta para recomeçar do zero.

Cenário 3: abrir o módulo sem programa ativo ou sem treinos. Vale o vazio herdado da 04 e da 7b, sem erro e sem avanço, com a mesma mensagem de sem treino ativo e orientação.

Jornada passo a passo: a pessoa executa séries no Treino do Dia, com indicação visual de em execução enquanto houver aberta. Ao acionar Finalizar, segue o fluxo de confirmação já existente da 07, parcial pergunta, completo sela direto, vazio de borda conduz ao cancelamento. Confirmado o selamento com sucesso, a página recarrega a seleção e exibe o próximo treino segundo a regra vigente da 7b, aberta vence quando houver, sem aberta vale o vizinho seguinte ao último selado com volta ao primeiro. Ao acionar Cancelar, segue o fluxo de confirmação da 07, e após a exclusão com sucesso a página permanece no mesmo treino, com seleção preservada. A pessoa permanece no Treino do Dia em ambos os casos, sem navegação para fora do módulo.

Estados de tela: seguem o padrão centralizado do módulo com o componente central de estado assíncrono. Carregando exibe texto de carregamento. Erro de carga exibe nova tentativa. Erro de operação e bloqueio de domínio exibem mensagem sem nova tentativa. Modais de confirmação nunca fecham no erro e preservam o digitado. Títulos de conteúdo seguem o token tipográfico do módulo e a cor do Milon. Foco ao concluir: após Finalizar, o foco vai para o cabeçalho do próximo treino exibido. Após Cancelar, o foco permanece no cabeçalho do mesmo treino. Sem programa ativo, programa ativo sem treinos ou treino sem exercícios, vale a mensagem de sem treino ativo com orientação da 04, sem erro.

## 3. Regras de Negócio

### Efeito do Finalizar com avanço

- Após o selamento com sucesso por qualquer caminho da 07, parcial confirmado, completo direto ou última marcada confirmada, a página do Treino do Dia recarrega a seleção e exibe o próximo treino da rotação 7b.
- O próximo é calculado pela mesma regra vigente da 7b, sem regra nova de ordem. Sem aberta, vale o vizinho seguinte ao último selado na ordem atual dos treinos do programa ativo do dono, com volta ao primeiro após o último. Com aberta válida na origem, a aberta vence, mas este caso não é esperado após Finalizar porque o selamento encerra a aberta corrente.
- O selamento em si não muda. Momento de término registrado, execução selada arquivada e imutável, sem reabrir nem editar, mesma regra da 07. Somente a exibição após o sucesso avança.
- As marcações do treino anterior não permanecem. O treino seguinte abre limpo, com o próprio estado de execução dele, que no caso normal é sem aberta até a primeira marcação.
- A troca manual após o avanço continua permitida para consulta entre treinos do programa ativo, mesma regra da 7b, sem reescrever histórico nem travar a próxima seleção automática.

### Efeito do Cancelar sem avanço

- Após o cancelamento com sucesso, a página permanece no mesmo treino onde o Cancelar foi acionado.
- A execução aberta é excluída com cascata das realizadas, template desbloqueado, momento de início limpo, nenhuma série segue marcada, mesma regra da 07.
- Nenhum avanço de rotação acontece no Cancelar. A seleção preserva o treino corrente. A próxima seleção automática futura segue pela 7b a partir do último selado anterior, sem contar a tentativa cancelada.
- O caminho de borda da 07 com execução aberta e zero marcadas, que conduz ao cancelamento em vez do selamento, segue a mesma regra do Cancelar, permanece no mesmo treino.

### Execução ainda aberta em outro treino

- Fora de escopo por impossibilidade em produção. Pela invariante R1 da 7c, existe no máximo uma execução aberta por dono em nível global, garantida por índice único parcial por autor e por guarda visual sem modal.
- Se em ambiente de teste ou corrida for observada aberta em treino distinto do exibido, nenhum comportamento novo é definido aqui. Vale a guarda visual da 7c, treino sem aberta vira somente leitura com aviso nomeado, leitura e troca livres. Nenhum selamento cruzado é criado nesta feature.
- Ativar, arquivar e remover exercício com aberta seguem bloqueados com os textos exatos da 7c, sem mudança.

### Validações e semântica herdadas

- Sem validação nova de valores. Valem as regras herdadas de treinos, séries planejadas, execução série a série, selamento da 07, rotação da 7b e guarda da 7c.
- Vazio e ausência de programa ativo, de treinos ou de histórico. Zero não se aplica a esta seleção. Nome de treino segue obrigatório e único no programa com comparação normalizada, mesma regra da 03 e 04.
- O Treino do Dia exibe o modelo ao vivo com marcadores de feito por série vindos da execução. Enquanto houver aberta, o modelo daquele treino fica bloqueado para edição na manutenção com aviso visível, mesma regra da 05 e 07.
- Edição simultânea pelos dois usuários segue o comportamento existente, sem trava. A última gravação prevalece.

## 4. Fora de Escopo (YAGNI)

Dentro desta versão, somente o avanço automático da exibição após Finalizar com sucesso e a permanência no mesmo treino após Cancelar com sucesso, sobre a rotação vigente da 7b e a guarda vigente da 7c.

Fora, item por item: mudança no selamento ou no cancelamento em dados, reabrir execução após selar, editar execução após selar, lista de histórico de treinos realizados, resumo por treino com duração e volume, acerto de horário e cálculo de duração, timer de descanso automático, notificação de fim de descanso, nova regra de rotação ou de ordem, reordenação de treinos, duplicar treino ou exercício, mover treino entre programas, substituição de exercício na hora, séries de aquecimento ou extra, escala de esforço, repetições até a falha, observações rápidas por exercício, permissões restritas, áreas privadas, integração com aplicativos externos, importação ou exportação de fichas, nova regra de ciclo de vida de programa, mudança na guarda de ativação, sincronização em tempo real entre dispositivos, expiração automática de aberta, relatório de execuções órfãs, tratamento novo para aberta em outro treino além da guarda da 7c.

Histórico e resumo pertencem a feature 09. Timer pertence a feature 06. Ajuste responsivo pertence a feature 08.

## 5. Critérios de Aceite

| número | Critério | Verificação |
|---|---|---|
| 1 | Dado Treino do Dia com execução aberta no treino corrente, quando confirmo o Finalizar com sucesso, então a página passa a exibir o próximo treino da rotação 7b, vizinho seguinte ao último selado na ordem atual, com volta ao primeiro após o último | Manual e automatizado |
| 2 | Dado programa ativo com treinos na ordem e último selado sendo o recém finalizado, quando o avanço acontece, então o exibido é o vizinho seguinte, e quando o selado era o último da ordem, então o exibido é o primeiro da ordem | Manual e automatizado |
| 3 | Dada execução parcial selada pelo Finalizar, o avanço segue a mesma regra da completa, sem diferença entre parcial e completa | Manual e automatizado |
| 4 | Dado acionamento de Cancelar com execução aberta, quando confirmo com sucesso, então a página permanece no mesmo treino, sem execução aberta e sem séries marcadas | Manual e automatizado |
| 5 | Dado o caminho de borda com execução aberta e zero marcadas, quando confirmo a condução ao cancelamento, então nada é selado e a página permanece no mesmo treino | Manual e automatizado |
| 6 | Dado Treino do Dia sem programa ativo ou programa ativo sem treinos, quando abro a aba, então vejo o vazio herdado da 04 e 7b com orientação, sem erro e sem avanço | Manual e automatizado |
| 7 | Dada falha de carga na nova seleção após Finalizar, a pessoa vê mensagem com nova tentativa pelo estado assíncrono central, e o acionamento recarrega. Dada falha de operação ou bloqueio, a mensagem aparece sem nova tentativa e a tela é preservada | Manual e automatizado |
| 8 | Dada falha no selamento ou no cancelamento antes do sucesso, nada avança e nada preserva seleção nova. O modal não fecha no erro, o digitado e as marcações são preservados, mesma regra da 07 | Manual e automatizado |
| 9 | Suíte completa verde, sem quebra de testes existentes, cobertura mantida em pelo menos oitenta por cento, relatório de testes regenerado antes da revisão | Automatizado |

## 6. Riscos e Dependências

Depende do Treino do Dia da 04 com programa ativo do dono e troca restrita, da execução série a série da 05 com início registrado e modelo ao vivo, do selamento e cancelamento da 07 com momento de término e parcial assumido, da rotação da 7b com prioridade da aberta e próximo pelo último selado com ordem própria, e da guarda da 7c com no máximo uma aberta por dono global e fonte única de execução ativa. Sem essas cinco bases, não há o que avançar nem onde permanecer.

A seleção vigente já resolve aberta do programa e último selado e expõe recarga para nova tentativa. Esta feature reutiliza essa recarga após o selamento, sem criar ordem nova. Qualquer divergência entre Treino do Dia e manutenção após selar, cancelar ou reordenar deve ser tratada como defeito desta feature.

O momento de término é gravado hoje com relógio do cliente, com decisão de revisitar na 09. A rotação ordena pelo término gravado como ele está. Normalização futura para relógio do banco pode reordenar empates próximos, sem mudança nesta feature.

A trava vigente pós 7c é de no máximo uma aberta por dono global. Dois donos podem ter abertas próprias em treinos distintos sem desvio cruzado, pela separação por dono. Concorrência entre dispositivos segue sem sincronização em tempo real, com última gravação prevalecendo, mesma limitação conhecida da 7c.

Nenhuma migração nova é esperada, pois só se lê e escreve o que já existe. A reserva de número sequencial e a definição de necessidade de script novo são assunto do plano da Atena. Nenhuma migração já aplicada é editada ou renomeada.

Cenários de teste bloqueados por dependência futura seguem a regra do backlog do módulo. O que não for executável nesta feature por depender de histórico visível, timer ou responsivo é repassado a feature que o libera.

## 7. Alternativas Consideradas

Alternativa 1, caminho sugerido no pedido, recarga cheia da página após Finalizar. A página recarrega por inteiro e a função que calcula o próximo treino é ativada na abertura, exibindo o seguinte da rotação. A favor, simplicidade máxima, reaproveita o caminho de abertura já testado, sem estado transitório. Contra, pisca a tela, perde posição de rolagem e refaz cargas que já estavam em memória. Esforço baixo, risco baixo, experiência com interrupção visível.

Alternativa 2, nova seleção pelos ganchos sem recarga cheia. Após o selamento com sucesso, a página invalida a fonte única de execução ativa e aciona a recarga da seleção do Treino do Dia, que recalcula o próximo e troca o identificador selecionado. Segue o padrão já usado na 7c para liberar escrita sem recarga, estendido ao avanço. A favor, sem pisco cheio, preserva casca da página e reaproveita recarga existente. Contra, exige compor duas recargas na ordem certa e tratar erro de cada uma. Esforço médio, risco médio, experiência mais fluida.

Alternativa 3, troca direta do identificador sem recalcular. Após o selamento, a página calcula o vizinho seguinte na lista já carregada e troca o selecionado localmente. A favor, resposta imediata, sem ida a dados. Contra, duplica a regra de próximo fora da fonte vigente, diverge da 7b em casos de reordenação concorrente ou lista desatualizada, exige sincronizar a fonte de execução ativa em separado. Esforço médio, risco alto de divergência, experiência rápida porém frágil.

Escolha proposta para a Atena decidir no plano: alternativa 2 como preferida, por manter fonte única da 7b e da 7c sem duplicar regra e sem pisco cheio, com a alternativa 1 como queda natural se a composição de recargas se mostrar instável. A alternativa 3 fica rejeitada por duplicar a regra de próximo.

## Modelo de Domínio

Entidades em linguagem natural, sem código.

Programa agrupa treinos vigentes de um dono, visível para os dois usuários, com estado rascunho, ativo ou inativo. Treino pertence a um programa, com nome único no programa e posição própria na ordem do programa. Entrada de exercício pertence a um treino e a um exercício da biblioteca, com posição, descanso único, modo e unidade de carga. Série planejada pertence a uma entrada, com posição, valor único e carga. Execução é a instância do treino feito no dia, pertence a um treino e a um programa, com momento de início, momento de término opcional e autor. Série realizada pertence a uma execução, a uma entrada e a uma série planejada, com posição, retrato de valor e carga, e autor.

Diagrama textual:

Programa um para muitos Treino, por dono, com estado rascunho, ativo ou inativo.
Treino um para muitos Entrada de exercício, em ordem por posição própria do treino no programa e posição da entrada no treino.
Exercício da biblioteca um para muitos Entrada de exercício, com nome, grupo muscular e vídeo.
Entrada de exercício um para muitos Série planejada, em ordem por posição.
Treino um para muitos Execução, com no máximo uma aberta por dono global na trava vigente, aberta e término vazio, selada e término preenchido, cancelada e excluída.
Execução um para muitos Série realizada, uma por série planejada dentro da execução, excluída em cascata ao cancelar.
Série planejada um para muitos Série realizada ao longo de execuções distintas, cada retrato guarda valor e carga do momento.
Ordem do programa é a sequência das posições dos treinos. Último selado é a execução selada mais recente do programa ativo pelo momento de término. Próximo sem aberta é o vizinho seguinte ao último selado nessa sequência, com volta ao primeiro. Após Finalizar com sucesso, o exibido passa a ser esse próximo. Após Cancelar com sucesso, o exibido permanece o mesmo treino.

## Premissas Técnicas Validadas

| Premissa | Validada com Humano? Sim | Evidência em disco |
|---|---|---|
| Existe página do Treino do Dia que compõe seletor de treinos e seção de detalhe com execução ligada e botões de Cancelar no topo e Finalizar no rodapé | Sim | Leitura da página do Treino do Dia com seletor, seção de detalhe, ações de topo e rodapé e trava de somente leitura por programa inativo |
| A seleção atual resolve programa ativo do dono, lista treinos, prioriza aberta do programa e sem aberta escolhe o próximo pelo último selado com volta ao primeiro, e expõe recarga para nova tentativa | Sim | Leitura do gancho de seleção do Treino do Dia com busca de programa ativo, listagem de treinos, busca de aberta do programa, busca de último selado e função de próximo após selado |
| Existe fonte única de execução aberta por dono global, com recarga própria | Sim | Leitura do gancho de execução ativa por dono com busca de email e leitura de aberta por dono |
| Após Finalizar ou Cancelar com sucesso a seção avisa a página, que invalida a fonte única para liberar escrita sem recarga cheia | Sim | Leitura da página do Treino do Dia com aviso de assentamento ligado a recarga da fonte única e leitura da seção com aviso após selamento e cancelamento |
| O selamento grava o término e o cancelamento exclui a aberta com cascata, sem regra nova de dados nesta feature | Sim | Spec da 07 com efeito do selamento e do cancelamento e acesso a dados de execuções com atualização de término e exclusão por identificador |
| A trava vigente é de no máximo uma aberta por dono global, então aberta em outro treino não acontece em produção | Sim | Pedido humano de 2026-10-16 com R1 por dono global e spec da 7c com índice único parcial por autor e guarda visual sem modal |
| Treino sem execução e programa inativo seguem somente leitura, sem ações de selar | Sim | Leitura da seção de detalhe com trava efetiva de leitura e specs da 02 a 04 com guarda de programa inativo |
| Vazio sem programa ou sem treinos usa mensagem de sem treino ativo com orientação | Sim | Leitura da página do Treino do Dia com vazio por programa nulo ou lista vazia e specs da 04 e 7b com vazio herdado |

## Cenários de Edge Case

| Cenário | Comportamento esperado |
|---|---|
| Programa ativo sem histórico e Finalizar o primeiro | Próximo segue a regra da 7b para lista com um selado recente, sem erro |
| Ficha nova com programa novo ativo | Avanço acontece dentro do novo programa, sem herdar histórico da ficha antiga |
| Último da ordem selado pelo Finalizar | Próxima exibição é o primeiro da ordem, com giro contínuo |
| Parcial selada como último | Conta igual a completa para definir o próximo |
| Execução aberta não selada | Não conta como último para a rotação, mas venceria a exibição se existisse. Após Finalizar não há aberta corrente, então vale o próximo por selado |
| Dois donos com abertas próprias | Cada dono avança na própria rotação, sem desvio cruzado, pela separação por dono |
| Aberta em treino reordenado antes de finalizar | A pessoa finaliza a aberta atual e o próximo vale na nova posição |
| Execução cancelada por exclusão | Não deixa histórico, próximo segue pelo último selado anterior, sem avanço no Cancelar |
| Excluir treino com exercícios ou com execução | Bloqueado com mensagem visível, nada removido, ordem inalterada, mesma regra da 03 e 7b |
| Troca manual após o avanço | Permitida entre treinos do programa ativo, sem reescrever histórico nem travar próxima seleção |
| Dois usuários selando quase juntos | Vale o término mais recente gravado, no máximo uma aberta por dono pela trava parcial |
| Falha de carga na nova seleção após Finalizar | Mensagem com nova tentativa pelo estado assíncrono central, sem exibir próximo até carregar |
| Falha de operação ou bloqueio no selar ou cancelar | Mensagem sem nova tentativa, modal não fecha, digitado e marcações preservados |
| Treino sem exercícios | Sem séries para marcar e sem aberta. Sem Finalizar no caso normal, mesma regra do vazio da 07 |
| Migração legada sem posição de treino | Posição inicial equivale a criação, reordenação futura reescreve a sequência, sem impacto no avanço além da ordem atual |
| Falha de rede após gravar término com erro no retorno | Sem reabrir nem editar. Erro vira mensagem de operação. Nova carga reflete o banco e o próximo por selado |
