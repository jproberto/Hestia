# Spec: Rotação do Treino do Dia por histórico

## 1. Problema Real

Hoje o Treino do Dia abre sempre o primeiro treino do programa ativo por ordem de criação. Isso foi a versão um consciente da feature 04, que adiou a rotação por histórico para depois da feature 07.

Na academia, com celular na mão, a pessoa precisa saber sem pensar qual ficha fazer hoje. Sem rotação, ela precisa lembrar de cabeça qual foi a última feita, o que gera erro de sequência e volume desigual entre treinos A, B e C.

O valor desta feature é fechar o coração do bloco dois do backlog do Mílon: o Treino do Dia descobre o último treino selado do programa ativo e exibe o seguinte da ordem, com volta ao primeiro após o último. Junto vem a ordem própria dos treinos dentro do programa, com reordenação manual pelo mesmo gesto de arrastar dos exercícios.

Fontes: backlog do módulo Mílon Bloco 2 item 7b, spec da 04 seção 4 com adiamento, spec da 07 seção de jornada pós-selamento e pedido humano de 2026-10-12 para não esquecer, mais decisões humanas D1 a D10 deste discovery.

## 2. Usuários e Cenários

Usuários: o casal, com login individual cada um, mesmo modelo das features 01 a 07. Cada um abre o próprio treino ao chegar na academia. Não há permissão restrita. O dono do programa define a origem do Treino do Dia, mesma regra da 04. Uso no celular, mesma exigência de tela pequena das features 03 a 05.

Cenário 1: abrir o Mílon e cair no próximo da rotação. A pessoa abre o módulo, termina no Treino do Dia e vê o treino seguinte ao último selado do programa ativo do próprio login, na ordem atual dos treinos.

Cenário 2: primeira vez ou ficha nova. Sem histórico no programa ativo, ou com programa novo ativado após troca de ficha, a pessoa vê o primeiro treino da ordem atual.

Cenário 3: reordenar a ficha em casa. No detalhe do programa, na aba Programas, a pessoa arrasta os treinos para a ordem semanal desejada, com o mesmo ícone de arrastar e os mesmos retornos visuais da reordenação de exercícios.

Cenário 4: trocar na hora para consultar. Após abrir o próximo automático, a pessoa pode trocar manualmente para outro treino do mesmo programa ativo sem sair da aba, mesma capacidade da 04, sem travar a seleção automática futura. A troca serve para consulta. Marcar série em outro treino com aberta em curso pertence ao item 7c, não a esta feature.

Cenário 5: voltar com treino em curso. Havendo execução aberta no programa ativo do dono logado, a pessoa abre o módulo e volta direto ao treino dessa execução, acima de qualquer rotação por selado.

Jornada passo a passo: a pessoa executa e sela um treino no Treino do Dia conforme a 07. Ao voltar ao Treino do Dia sem aberta, a página resolve o programa ativo do dono logado, busca o último selamento desse programa, localiza esse treino na ordem atual e exibe o vizinho seguinte, com volta ao primeiro após o último. Havendo aberta no programa ativo do dono, a página exibe o treino dessa aberta, com indicação de em execução, mesmo que a rotação por selado apontasse outro. A pessoa permanece no Treino do Dia, sem navegação para fora do módulo. A reordenação acontece fora do fluxo diário, no detalhe do programa, e reflete na próxima abertura do Treino do Dia.

Estados de tela: seguem o padrão centralizado do módulo com o componente central de estado assíncrono. Carregando exibe texto de carregamento. Erro de carga exibe nova tentativa. Erro de operação e bloqueio de domínio exibem mensagem sem nova tentativa. Modais de formulário nunca fecham no erro e preservam o digitado. Títulos de conteúdo seguem o token tipográfico do módulo e a cor do Mílon. Foco ao concluir: a pessoa permanece no Treino do Dia com a lista refletindo o dado atualizado, mesmo comportamento da 04. Sem programa ativo, programa ativo sem treinos ou treino sem exercícios, vale a mensagem de sem treino ativo com orientação da 04, sem erro.

## 3. Regras de Negócio

### Prioridade da execução aberta

- Havendo execução aberta no programa ativo do dono logado, o Treino do Dia exibe o treino dessa execução, acima da rotação por último selado. Decisão humana D10 com precedência sobre D1 quando há aberta.
- A rotação por último selado só vale sem aberta. Sem aberta, vale D1 com volta ao primeiro. Com aberta, a aberta vence.
- A aberta pertence sempre ao programa ativo do dono. Aberta do outro dono nunca desvia a aba, mesma separação por dono da 04.
- A troca manual com aberta continua permitida para consulta entre treinos do programa ativo. Marcar série em outro treino com aberta em curso não é desta feature e pertence ao item 7c, que perguntará finalizar, excluir ou cancelar a operação.
- Reordenar o treino com aberta não tira a pessoa da aberta. A nova posição vale para a próxima seleção por selado após selar ou cancelar.

### Definição de próximo

- O próximo é o treino seguinte ao último selado do programa ativo do dono logado, na ordem atual dos treinos desse programa.
- Último selado significa a execução selada mais recente desse programa, pelo momento de término gravado no selamento da 07.
- Após o último da ordem, o próximo é o primeiro da ordem. Giro contínuo.
- Execução parcial selada conta igual à completa. Treino finalizado não difere completa de parcial, por decisão humana.
- Somente execuções seladas contam. Execução aberta e execução cancelada por exclusão não contam.
- Somente o programa ativo do dono logado é origem. Programa do outro dono nunca é usado nesta aba, mesma regra da 04.

### Ordem própria e reordenação

- Treino tem ordem própria dentro do programa. Não é necessariamente a ordem de criação. A criação define a ordem inicial, a reordenação manual define a ordem vigente.
- A reordenação manual entra nesta feature, por decisão humana, mesmo que a 04 dissesse sem reordenação manual. Esta spec atualiza essa regra para treinos.
- A reordenação acontece no detalhe do programa, na aba Programas, com o mesmo mecanismo dos exercícios: ícone visível para arrastar, mesma pista visual de onde segurar, mesma resposta de arrasto e mesma confirmação de persistência.
- Programa inativo segue somente leitura, mesma regra das features 02 a 04. Em programa inativo não há reordenar, adicionar, editar nem excluir pelo Treino do Dia nem pelo detalhe.
- Rascunho e ativo são reordenáveis.
- A troca manual de treino no Treino do Dia continua permitida para consulta após a abertura automática e fica restrita aos treinos do programa ativo do dono, sem criar ordem nova. Ela não reescreve o histórico nem trava a próxima seleção automática. Com aberta, marcar série em outro treino pertence ao item 7c.

### Sem histórico e ficha nova

- Programa ativo sem nenhuma execução selada abre o primeiro treino da ordem atual.
- Programa novo ativado após troca ou arquivamento de ficha abre o primeiro treino do novo programa, mesmo que a ficha antiga tenha histórico. Histórico de outro programa nunca atravessa.
- Programa ativo sem treinos e dono sem programa ativo mantêm o vazio da 04, sem erro.

### Exclusões e bloqueios

- Excluir treino que tenha exercícios continua bloqueado com mensagem visível, mesma regra da 03. Nada é removido nesse caso.
- Excluir treino com execução associada segue bloqueado com aviso preservando o histórico, por decisão humana. Com a trava do banco, o caso de último selado de treino excluído com histórico não acontece por este caminho.
- Exclusão de treino só acontece sem exercícios e sem execuções, sem impacto na rotação além da ordem atual menor.
- Excluir programa com treinos segue bloqueado, mesma regra da 02 e 03.
- Cancelar execução segue a 07 com exclusão da aberta e cascata das realizadas, sem deixar histórico da tentativa.
- Execução selada segue arquivada e imutável conforme a 07: não reabre, não edita, não exclui feito.

### Validações e semântica

- Sem validação nova de valores. Valem as regras herdadas de treinos, séries planejadas e execução.
- Vazio é ausência de histórico ou de treinos. Zero não se aplica a esta seleção.
- Nome de treino segue obrigatório e único dentro do programa com comparação normalizada, mesma regra da 03 e 04.
- Edição simultânea pelos dois usuários segue o comportamento existente, sem trava. A última gravação prevalece.

## 4. Fora de Escopo (YAGNI)

Dentro desta versão, somente prioridade da aberta mais rotação automática pelo último selado mais ordem própria com reordenação manual no detalhe do programa, nos textos e posições confirmados.

Fora, item por item, por confirmação humana: marcar série em outro treino com aberta em curso com pergunta de finalizar, excluir ou cancelar, que é o item 7c do backlog, lista visível de treinos já feitos com datas, correção de horário de início e fim e cálculo de duração, sugestão automática de trocar de ficha sozinha, botão de desativar um treino isolado, timer de descanso automático, notificação de fim de descanso, resumo por treino com duração e volume, reabrir ou editar execução após selar, duplicar treino ou exercício, mover treino entre programas, substituição de exercício na hora, séries de aquecimento ou extra, escala de esforço, reps até a falha, observações rápidas por exercício, permissões restritas, áreas privadas, integração com aplicativos externos, importação ou exportação de fichas, nova regra de ciclo de vida de programa, mudança na guarda de ativação.

Lista de feitos e acerto de horário com duração pertencem à feature 09. Timer pertence à 06. Ajuste responsivo pertence à 08.

## 5. Critérios de Aceite

| # | Critério | Verificação |
|---|---|---|
| 1 | Dado programa ativo com treinos A, B e C em ordem e último selado B, ao abrir o Treino do Dia a pessoa vê C | Manual e automatizado |
| 2 | Dado último selado C sendo o último da ordem, ao abrir o Treino do Dia a pessoa vê A, com volta ao primeiro | Manual e automatizado |
| 3 | Dada execução parcial selada como último selado, o próximo segue a mesma regra da completa, sem diferença | Manual e automatizado |
| 4 | Dado programa ativo sem histórico, ao abrir o Treino do Dia a pessoa vê o primeiro da ordem atual | Manual e automatizado |
| 5 | Dada ficha nova com programa novo ativo, ao abrir o Treino do Dia a pessoa vê o primeiro do novo programa, sem herdar histórico da ficha antiga | Manual e automatizado |
| 6 | Dada reordenação de treinos no detalhe do programa por arrastar com o mesmo gesto dos exercícios, a nova ordem persiste e a próxima abertura do Treino do Dia a respeita | Manual e automatizado |
| 7 | Dado programa inativo, a reordenação não é oferecida, mesma regra de somente leitura | Manual e automatizado |
| 8 | Dada abertura automática do próximo sem aberta, a troca manual para outro treino do mesmo programa ativo continua possível para consulta e treinos de outro programa não aparecem. Marcar série em outro treino com aberta em curso não sela nem abre nada nesta versão e pertence ao item 7c | Manual e automatizado |
| 13 | Dada execução aberta no programa ativo do dono, ao abrir o Treino do Dia a pessoa volta ao treino dessa aberta, acima da rotação por selado, com indicação de em execução | Manual e automatizado |
| 14 | Dada execução aberta no treino reordenado de posição, a pessoa segue na aberta atual e a nova posição vale para a próxima seleção por selado | Manual e automatizado |
| 9 | Dada tentativa de excluir treino com exercícios, o bloqueio com mensagem visível acontece e nada é removido | Manual e automatizado |
| 10 | Dada tentativa de excluir treino com execução associada, o bloqueio com aviso acontece e o histórico é preservado | Manual e automatizado |
| 11 | Dada falha de carga na seleção do próximo, a pessoa vê mensagem com nova tentativa e o acionamento recarrega. Dada falha de operação ou bloqueio, a mensagem aparece sem nova tentativa | Manual e automatizado |
| 12 | Suite completa verde, sem quebra de testes existentes, cobertura mantida em pelo menos oitenta por cento, relatório de testes regenerado antes da revisão | Automatizado |

## 6. Riscos e Dependências

Depende do Treino do Dia da 04 com programa ativo do dono e troca restrita, da execução série a série da 05 com início registrado e bloqueio do template na manutenção, e do selamento da 07 com momento de término e parcial assumido. Sem essas três, não há último selado nem próximo.

A seleção vigente escolhe o primeiro por criação e ignora aberta. Esta feature substitui a escolha inicial pela prioridade da aberta e, sem aberta, pela escolha por histórico com ordem própria, mantendo a troca manual restrita. Qualquer divergência entre Treino do Dia e manutenção após selar, cancelar ou reordenar deve ser tratada como defeito desta feature.

A trava vigente é de no máximo uma aberta por treino. A invariante de no máximo uma ativa por dono pertence ao item 7c e não é criada aqui. Dois donos podem ter abertas próprias em treinos distintos sem se desviar.

O momento de término é gravado hoje com relógio do cliente, com decisão de revisitar na 09. A rotação ordena pelo término gravado como ele está. Normalização para relógio do banco, se decidida na 09, pode reordenar empates de selamentos próximos. Empates de término idêntico seguem ordem de criação da execução como desempate, a definir no plano sem inventar dado novo.

A ordem própria exige persistência nova da posição dos treinos. A reserva de número sequencial de migração e a definição de necessidade de script novo são assunto do plano da Atena. Nenhuma migração já aplicada é editada ou renomeada.

Edição simultânea pelos dois usuários segue sem trava, com última gravação prevalecendo. Reordenação concorrente à execução selada pode mudar o próximo exibido na abertura seguinte, o que é comportamento aceito.

Cenários de teste bloqueados por dependência futura seguem a regra do backlog do módulo: o que não for executável nesta feature por depender de histórico visível, timer ou responsivo é repassado à feature que o libera.

## 7. Alternativas Consideradas

Alternativa 1, caminho escolhido, próximo pelo último selado com ordem própria e reordenação junto: entrega o giro completo pedido desde a 04 e a ordem manual pedida no discovery, com o mesmo gesto dos exercícios. Mantém previsibilidade e fidelidade ao feito. Custo aceito: persistência nova de posição e telas de arrastar para treinos, além da seleção por histórico.

Alternativa 2, rotação sem reordenação com ordem por criação: entregaria só o próximo pelo último selado sobre a ordem de criação vigente, deixando a ordem manual para item separado. Descartada porque o humano decidiu que a ordem de criação não representa a semana real e mandou a reordenação para dentro da 7b.

Alternativa 3, caso do treino excluído com histórico: A abre o vizinho seguinte na posição do excluído, simples e mantém o giro. B abre sempre o primeiro da ordem atual, mais previsível e mais fácil de explicar. C busca o último selado ainda existente e avança um, mais fiel e mais complexo. Com a decisão de bloquear excluir treino com execução, este caso não acontece por este caminho e nenhuma escolha foi necessária nesta versão. Se a regra de exclusão mudar no futuro, reabrir com estas três opções.

## Modelo de Domínio

Entidades em linguagem natural, sem código.

Programa agrupa treinos vigentes de um dono, visível para os dois usuários, com estado rascunho, ativo ou inativo. Treino pertence a um programa, com nome único no programa e posição própria na ordem do programa. Entrada de exercício pertence a um treino e a um exercício da biblioteca, com posição, descanso único, modo e unidade de carga. Série planejada pertence a uma entrada, com posição, valor único e carga. Execução é a instância do treino feito no dia, pertence a um treino e a um programa, com momento de início, momento de término opcional e autor. Série realizada pertence a uma execução, a uma entrada e a uma série planejada, com posição, retrato de valor e carga, e autor.

Diagrama textual:

Programa um para muitos Treino, por dono, com estado rascunho, ativo ou inativo.
Treino um para muitos Entrada de exercício, em ordem por posição própria do treino no programa e posição da entrada no treino.
Exercício da biblioteca um para muitos Entrada de exercício, com nome, grupo muscular e vídeo.
Entrada de exercício um para muitos Série planejada, em ordem por posição.
Treino um para muitos Execução, com no máximo uma aberta por treino na trava vigente, aberta é término vazio, selada é término preenchido, cancelada é excluída.
Execução um para muitos Série realizada, uma por série planejada dentro da execução, excluída em cascata ao cancelar.
Série planejada um para muitos Série realizada ao longo de execuções distintas, cada retrato guarda valor e carga do momento.
Ordem do programa é a sequência das posições dos treinos. Último selado é a execução selada mais recente do programa ativo pelo momento de término. Próximo sem aberta é o vizinho seguinte ao último selado nessa sequência, com volta ao primeiro. Com aberta no programa ativo do dono, o exibido é o treino da aberta.

## Premissas Técnicas Validadas

| Premissa | Validada com humano | Evidência em disco |
|---|---|---|
| Existe tabela de execuções com início obrigatório e término opcional, onde término vazio significa aberta | Sim | Migração 0011 cria tabela de execuções com início padrão agora e término sem obrigação, mais índice único parcial de no máximo uma aberta por treino |
| Existe tabela de realizadas ligada à execução, entrada e série, com unicidade por execução mais série e exclusão em cascata | Sim | Migração 0011 cria tabela de realizadas com restrição única por execução e série e referência com exclusão em cascata |
| Excluir treino com exercícios é bloqueado no acesso a dados | Sim | Acesso a dados de treinos busca entradas do treino e lança mensagem de treino com exercícios antes de remover |
| Excluir treino com execuções é travado pelo banco | Sim | Migração 0011 declara treino referenciado por execuções com trava de restrição, e acesso a dados não tem caminho de cascata para execuções |
| A seleção atual do Treino do Dia escolhe o primeiro por criação do programa ativo do dono e ignora aberta | Sim | Seleção do Treino do Dia resolve email, busca programa ativo do dono, lista treinos e escolhe o primeiro da lista, com troca só entre carregados |
| A trava vigente é de no máximo uma aberta por treino, não por dono | Sim | Migração 0011 com índice único parcial por treino com término vazio |
| Reordenação de exercícios por arrastar existe como referência de gesto | Sim | Acesso a dados de treinos valida conjunto idêntico de entradas e grava posição de um até total na ordem recebida |
| Selamento grava término e parcial conta como selada | Sim | Acesso a dados de execução atualiza término com filtro de aberta e spec da 07 define parcial selada com término registrado |
| Programa inativo é somente leitura | Sim | Specs da 02 a 04 com guarda de programa inativo sem adicionar, editar, reordenar nem excluir |

## Cenários de Edge Case

| Cenário | Comportamento esperado |
|---|---|
| Programa ativo sem histórico | Abre o primeiro da ordem atual, sem erro |
| Ficha nova com programa novo ativo | Abre o primeiro do novo programa, sem herdar histórico da ficha antiga |
| Último da ordem selado | Próxima abertura exibe o primeiro da ordem, com giro contínuo |
| Parcial selada como último | Conta igual à completa para definir o próximo |
| Execução aberta não selada | Não conta como último para a rotação, mas vence a exibição: com aberta a pessoa volta ao treino da aberta |
| Dois donos com abertas próprias | Cada dono volta à sua aberta, sem desvio cruzado, pela separação por dono |
| Aberta em treino reordenado | A pessoa segue na aberta atual, nova posição vale para a próxima seleção por selado |
| Execução cancelada por exclusão | Não deixa histórico, próximo segue pelo último selado anterior |
| Excluir treino com exercícios | Bloqueado com mensagem visível, nada removido, ordem inalterada |
| Excluir treino com execução associada | Bloqueado com aviso, histórico preservado, ordem inalterada |
| Reordenar em programa inativo | Ação não oferecida, somente leitura, ordem inalterada |
| Troca manual após abertura automática | Permitida entre treinos do programa ativo, sem reescrever histórico nem travar próxima seleção |
| Dois usuários selando quase juntos | Vale o término mais recente gravado, no máximo uma aberta por treino pela trava parcial |
| Falha de carga na seleção | Mensagem com nova tentativa pelo estado assíncrono central, sem exibir próximo até carregar |
| Falha de operação ou bloqueio | Mensagem sem nova tentativa, tela preservada |
| Migração legada sem posição de treino | Posição inicial equivale à criação, reordenação futura reescreve a sequência |
| Rollback de selamento com erro após gravar término | Sem reabrir nem editar, erro vira mensagem de operação, recarga reflete o banco |
