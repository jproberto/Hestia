# Spec: Treino do dia v1 paridade com manutenção

## 1. Problema Real

No dia a dia, para chegar ao próprio treino a pessoa precisa atravessar Programas, detalhar o programa e detalhar o treino até a página de manutenção, que concentra todos os controles, opções e validações. Esse caminho faz sentido para montar a ficha em casa, mas pesa no uso na academia, com celular na mão e pouco tempo entre deslocamento e início do treino.

O valor desta versão fatiada é encurtar esse caminho agora, sem esperar a rotação por histórico nem a execução diária completa. A nova aba Treino do Dia entrega página igual a de manutenção, mostrando o treino do programa ativo do dono e permitindo edição total com as mesmas regras. Nas próximas features essa mesma página recebe controles, opções e validações de execução diária.

Fonte: necessidade literal final do humano, diretriz do Zeus para esta feature fatiada, backlog do módulo Mílon Bloco 2 item 4, specs das features 2 e 3.

## 2. Usuários e Cenários

Usuários: o casal, com login individual cada um, mesmo modelo das features 1, 2 e 3. Qualquer um dos dois pode ver, criar, editar e excluir qualquer conteúdo. Não há permissão restrita. O campo dono não é permissão, e a base da prioridade de exibição no dia a dia.

Cenários cobertos nesta v1, todos na nova aba Treino do Dia:

- Abrir o módulo e cair direto no treino: a pessoa abre o Mílon e termina no Treino do Dia, vendo o primeiro treino do programa ativo do próprio login, por ordem de criação, tratado como dia 1.
- Consultar o planejado antes de ir a academia: abrir o Treino do Dia, conferir exercícios, séries, repetições, carga e descanso.
- Ajustar o planejado na mesma página: corrigir carga, repetições, descanso, ordem de exercícios, adicionar e excluir, com as mesmas ações da página de manutenção.
- Trocar o treino exibido dentro do programa ativo: alternar entre os treinos do programa ativo do dono logado, sem sair da aba.
- Chegar sem nada para mostrar: sem programa ativo, com programa ativo sem treinos, ou com treino sem exercícios, a pessoa vê mensagem de sem treino ativo com orientação, sem mensagem de erro.

Navegação: o módulo passa a ter três abas, nesta ordem da esquerda para a direita: Treino do Dia, Programas, Exercícios. A primeira aba é Treino do Dia. A raiz do Mílon redireciona para o Treino do Dia. A entrada pelo cartão do dashboard termina no Treino do Dia por meio desse redirecionamento.

Dispositivo e contexto: celular na academia e em casa, mesma exigência de tela pequena da feature 3, com alvos de toque acessíveis, listas roláveis e ações sempre visíveis.

Estados encontrados: carregando, erro de carga com nova tentativa, vazio de sem treino ativo com orientação, programa inativo em somente leitura, validação bloqueada com mensagem visível e formulário permanecendo aberto com o que foi digitado.

Foco ao concluir: após salvar, a pessoa permanece na página do Treino do Dia, com a lista refletindo o dado atualizado, mesmo comportamento da página de manutenção. Após criação de programa, a navegação pós-salvar da feature 2 permanece válida e não é alterada por esta feature.

## 3. Regras de Negócio

### Navegação e seleção do treino exibido

- A nova aba chama-se Treino do Dia e é a primeira aba do módulo, seguida de Programas e Exercícios.
- Acessar a raiz do Mílon por digitação, refresh ou cartão do dashboard redireciona para o Treino do Dia.
- O conteúdo exibido parte sempre do programa ativo do dono logado. Havendo mais de um programa na família, o programa do outro dono não é usado como origem nesta aba.
- O treino inicial exibido é o primeiro treino do programa ativo por ordem de criação, tratado como dia 1.
- A troca de treino exibido fica restrita aos treinos do programa ativo do dono logado. Não há troca para treinos de outro programa nem de outro dono nesta aba.
- Programa inativo segue somente leitura, mesma regra da feature 2. Em programa inativo não há adicionar, editar, reordenar nem excluir pelo Treino do Dia.
- Rascunho e ativo são editáveis, mesma regra das features 2 e 3.

### Paridade total com a manutenção

- A página do Treino do Dia exibe os mesmos dados da página de detalhe de treino da feature 3: exercícios em ordem, séries por exercício com repetições ou tempo, carga com unidade, descanso único por exercício, subtítulo derivado dos grupos musculares.
- Todas as ações de manutenção estão disponíveis com comportamento igual: adicionar exercício por seleção da biblioteca ou cadastro rápido na hora, editar exercício da biblioteca, excluir exercício, reordenar exercícios por arrastar com identificador visível de onde segurar, definir quantidade de séries, editar repetições, tempo, carga e descanso, aplicar valores a todas as séries com reexecução que sobrescreve.
- Validações de manutenção valem sem mudança: nome de treino obrigatório e único dentro do programa com comparação normalizada, sugestão de nome Treino A, Treino B e sequência além de Z, quantidade de séries obrigatória inteira maior ou igual a 1, demais campos nascendo vazios, vazio diferente de zero com exibição em traço, zero exibido como zero, negativos de carga não aceitos, unidade de carga por exercício escolhida na primeira digitação de peso entre as duas opções e mantida em seguida com valor convertido exibido menor e em cinza mais claro, descanso único por exercício valendo para todas as séries, subtítulo derivado automático sem edição manual, ordem de treinos por criação sem reordenação manual, ordem de séries por criação sem reordenação.
- Estados de tela seguem o padrão centralizado do módulo, mesma norma da feature 3. Erro de carga exibe nova tentativa. Erro de operação e bloqueio de domínio não exibem nova tentativa. Modais de formulário nunca fecham no erro. Sucesso segue o lembrete breve padrão do módulo. Títulos de conteúdo seguem o token tipográfico do módulo e a cor do Mílon.
- Sem limite de quantidade além da capacidade natural do campo, mesma decisão da feature 3. Nenhum teto, nenhum contador de limite, nenhum aviso de teto.
- Unicidade de exercício por treino, mesma decisão da feature 3. O mesmo exercício da biblioteca aparece no máximo uma vez dentro do mesmo treino. Em treinos diferentes do mesmo programa e em programas diferentes a adição é normal. Tentativa no mesmo treino é bloqueada com mensagem visível e manutenção da tela aberta.
- Guarda de ativação de programa permanece como definida nas features 2 e 3 e não é alterada por esta feature.

### Exclusões e confirmações herdadas da feature 3

- Bloqueio sem remoção: excluir programa que tenha treinos é bloqueado com mensagem visível. Excluir treino que tenha exercícios é bloqueado com mensagem visível. Nada é removido nesses casos.
- Confirmação quando há o que perder: excluir exercício com séries associadas, mesmo sem preenchimento, pede confirmação listando o que será perdido. Reduzir quantidade de séries com séries preenchidas pede confirmação. Cancelar não muda nada.
- Ação direta sem confirmação: excluir treino sem exercícios, excluir exercício sem séries, reduzir quantidade em séries recém-criadas sem preenchimento, excluir programa sem treinos seguindo a confirmação existente da feature 2.
- Falha de gravação mostra mensagem visível, preserva o estado anterior e não fecha o formulário. Bloqueio é comunicado por mensagem visível sem fechar a tela de onde partiu a ação.

### Vazios

- Sem programa ativo do dono logado, a página exibe mensagem de sem treino ativo com orientação para ativar ou criar programa, sem erro.
- Com programa ativo sem treinos, a página exibe mensagem de sem treino ativo com orientação para adicionar o primeiro treino, sem erro.
- Com treino sem exercícios, a página exibe estado vazio do treino com ação de adicionar exercício, mesmo padrão da manutenção.

## 4. Fora de Escopo (YAGNI)

- Rotação por histórico do último treino executado para descoberta do próximo. Nesta v1 o treino inicial é sempre o primeiro por ordem de criação.
- Marcação de série como feita, registro de início de execução, edição própria do fluxo de execução. Pertence a feature 5.
- Timer de descanso automático e notificação de fim de descanso. Pertence a feature 6.
- Encerramento de treino com confirmação, registro de término, encerramento parcial. Pertence a feature 7.
- Definição de próximo treino com inteligência de rotação. Será revisitada após a feature 7.
- Duplicar treino ou exercício, reordenar treinos dentro do programa, mover treino entre programas, substituição de exercício preservando séries. Fora, mesma decisão da feature 3.
- Subtítulo editável manualmente, reordenação de séries, limite de quantidade com aviso ou teto, unidade global ou por perfil ou por ficha, modo de edição dedicado. Fora, mesma decisão da feature 3.
- Séries de aquecimento ou extra, escala de esforço, reps até a falha, observações rápidas por exercício. Fora do backlog por decisão explícita do dono.
- Permissões restritas, áreas privadas, integração com aplicativos externos, importação ou exportação de fichas. Fora, mesma regra do módulo.
- Nova regra de ciclo de vida de programa, nova transição de status, mudança na guarda de ativação, mudança na exclusão de programa ativo ou inativo. Fora.

## 5. Critérios de Aceite

- Dada a raiz do Mílon acessada por digitação, refresh ou cartão do dashboard, a pessoa termina na página do Treino do Dia. A biblioteca e os Programas não aparecem nesse caminho direto.
- Dadas as telas do Mílon, a barra exibe exatamente três itens, nesta ordem: Treino do Dia, Programas, Exercícios, cada um navegável para o próprio destino dentro do módulo, mantendo mascote e título do módulo visíveis.
- Na página do Treino do Dia, a aba Treino do Dia aparece marcada como ativa e as demais não. Em Programas e Exercícios, a marca acompanha o destino atual, sempre exatamente uma aba ativa, inclusive em acesso direto por endereço sem clique anterior.
- Dado o dono logado com programa ativo contendo treinos, ao abrir o Treino do Dia a pessoa vê o primeiro treino desse programa por ordem de criação, com exercícios e séries como na manutenção.
- Dada a troca de treino no Treino do Dia, a pessoa alterna somente entre treinos do programa ativo do próprio login. Treinos de outro programa não aparecem como opção.
- Dada edição de carga, repetições, descanso, ordem de exercícios, adição e exclusão no Treino do Dia, o resultado é idêntico ao da página de manutenção do mesmo treino, incluindo mensagens, confirmações, bloqueios e permanência de formulário aberto no erro.
- Dado programa ativo sem treinos, a página exibe mensagem de sem treino ativo com orientação, sem erro. Dado dono logado sem programa ativo, a página exibe mensagem de sem treino ativo com orientação, sem erro.
- Dado treino exibido sem exercícios, a página mostra estado vazio com ação de adicionar exercício, permitindo escolha da biblioteca ou cadastro rápido na hora.
- Dado programa inativo, a página do Treino do Dia não oferece adicionar, editar, reordenar nem excluir.
- Dado exercício já presente no treino exibido, a tentativa de adicionar o mesmo exercício é bloqueada com mensagem visível e manutenção da tela aberta. Em outro treino do mesmo programa a adição é aceita.
- Dado treino com exercícios de grupos distintos, o subtítulo exibe a junção sem repetição e na ordem dos grupos nos exercícios, no padrão com vírgula e adição antes do último item. Ao remover o único exercício de um grupo, o subtítulo atualiza automaticamente. Treino sem exercícios fica sem subtítulo.
- Dado campo de carga vazio, a exibição mostra traço. Dado valor zero digitado, a exibição mostra zero.
- Dada falha de carga, a pessoa vê mensagem com nova tentativa e o acionamento recarrega. Dada falha de operação ou bloqueio de domínio, a mensagem aparece sem nova tentativa.
- Suite completa verde, sem quebra de testes existentes, cobertura mantida em pelo menos oitenta por cento, relatório de testes regenerado antes da revisão.

## 6. Riscos e Dependências

- Requisito de reuso explícito para a Atena: a página nova mantém paridade total com a manutenção nesta v1 e reserva pontos de extensão para as features 5, 6 e 7 sem poluir a manutenção, com mínimo de repetição, máximo de separação, seguindo DRY, separação de responsabilidades e princípios do Mapa de Camadas do projeto. As estratégias para atender a este requisito serão definidas no plano da Atena. Nenhuma estratégia de código é objeto desta spec.
- Dependências entregues: biblioteca da feature 1, programas e navegação das features 2 e patches, treinos e séries da feature 3. Esta v1 consome o modelo existente de programa, treino, entrada de exercício e séries.
- Mudança de destino da raiz: a raiz do Mílon passa a redirecionar para o Treino do Dia, em substituição ao destino anterior em Programas. Links ou favoritos para a raiz passam a cair no Treino do Dia. O cartão do dashboard mantém o destino na raiz e funciona por meio do redirecionamento. Fica declarado para avaliação do diff como mudança aprovada, sem caracterização de regressão.
- Comportamento homologado da manutenção permanece válido: esta feature não altera regras de validação, destrutivas, limites, unicidade, ordenação, unidade por exercício, subtítulo derivado, vazio diferente de zero, nem guarda de ativação. Qualquer divergência observada entre Treino do Dia e manutenção deve ser tratada como defeito desta feature.
- Tratamento de migração de banco segue a regra de migrações auditadas do projeto. A reserva de número sequencial e a definição de necessidade de script novo são assunto do plano da Atena. Nenhuma migração já aplicada é editada ou renomeada.
- Edição simultânea pelos dois usuários segue o comportamento existente das telas, sem trava definida. A última gravação prevalece.
- Cenários de teste bloqueados por dependência futura seguem a regra do backlog do módulo: o que não for executável nesta v1 por depender das features 5, 6 ou 7 é repassado a feature que o libera e registrado no cenário de teste correspondente, sem virar pendência oculta.

## 7. Alternativas Consideradas

- Aguardar a rotação completa para entregar o Treino do Dia de uma vez: entregaria a descoberta automática do próximo pelo histórico junto com a nova aba. Descartada para esta v1 porque adia o atalho diário e acopla a navegação a regras de execução ainda não descobertas. A rotação permanece no backlog como evolução após as features de execução.
- Entregar a v1 fatiada com paridade total e pontos de extensão reservados: caminho escolhido. Antecipa o ganho de chegar direto ao treino do programa ativo, mantém edição total igual a manutenção, e deixa a página pronta para receber marcação de feito, timer e encerramento nas features seguintes sem retrabalho de navegação. Custo aceito: duplicação visual temporária entre Treino do Dia e manutenção até a evolução, tratada como requisito de reuso no plano da Atena.
- Manter o acesso somente pela navegação atual sem aba nova: descartada porque preserva o caminho longo Programas mais detalhe de programa mais detalhe de treino no uso diário na academia, contrariando a necessidade que originou a feature.

As estratégias de organização interna para obter mínimo de repetição com máximo de separação não são objeto desta spec por diretriz do Zeus e serão definidas no plano da Atena.
