# Spec: Execução série a série

## 1. Problema Real

Na academia, com o celular na mão, a pessoa precisa marcar o que já fez. Ela também precisa corrigir carga, repetições e descanso sem sair do treino.

Hoje o Treino do Dia só exibe. Falta executar.

## 2. Usuários e Cenários

Usuários: o casal. Cada um abre o próprio treino ao chegar na academia. Uso no celular, com mão suada.

Cenário 1: marcar cada série feita, uma a uma, durante o treino. Cenário 2: corrigir os valores de uma série no meio do treino e repetir nas seguintes.

Cenário 3: desmarcar uma série marcada por engano, sem burocracia. Cenário 4: desmarcar todas as séries e confirmar o cancelamento da execução.

## 3. Regras de Negócio

A tela do Treino do Dia já existe e continua igual. Editar, adicionar e remover exercícios já existe e não muda nesta feature.

Cada série aparece como um card que é o próprio marcador. Não há caixinha de marcação nem botão de editar separados. A série fica bloqueada para edição direta no card. Exibe com exatamente a mesma cara da manutenção, com rótulos de repetição ou tempo e com a unidade da carga visível. A unidade da carga (kg/lb) e o modo (repetição ou tempo) pertencem ao exercício, não à série — card e modal os herdam do exercício.

Todo o card da série é área clicável. Toque curto no card alterna na hora entre marcada e desmarcada. Sem confirmação. Toque longo no card abre o modal de edição daquela série.

Série marcada tem fundo na cor do módulo. É o feedback visual de feita.

O modal traz as mesmas opções da manutenção, com troca entre repetição e tempo, e salva as informações da série. A unidade da carga (quilos ou libras) e o modo (repetição ou tempo) são propriedades do exercício e aparecem no modal como herdadas, sem edição aqui. O modal não tem opção de copiar. Ao salvar, os mesmos valores valem para aquela série e para todas as séries seguintes do mesmo exercício, inclusive as já marcadas.

Salvar fecha o modal. A série volta a exibir com a mesma cara da manutenção.

Série editada mantém o estado. Se estava marcada, segue marcada. Se estava desmarcada, segue desmarcada.

Editar uma série atualiza o planejado. O novo valor vira a meta permanente. É a base da evolução futura.

A primeira marcação de qualquer série registra o momento de início da execução. O Treino do Dia exibe o template ao vivo com marcadores de feito por série — o que se vê é sempre o valor atual do template, com indicação do que já foi feito. Enquanto houver execução aberta (não cancelada, não encerrada), o template daquele treino específico fica bloqueado para edição na manutenção, de modo que só o Treino do Dia escreve durante a execução. O nome do treino no Treino do Dia exibe indicação visual de "em execução" enquanto a execução estiver aberta. Desmarcar a última série marcada desmarca na hora e pede confirmação com a pergunta: "Todas as séries foram desmarcada. Deseja cancelar a execução desse treino?" Confirmar cancela a execução: o template é desbloqueado e o momento de início é limpo. Cancelar mantém a execução aberta: o template continua bloqueado e o início é preservado.

Sem validação nova. Valem as regras herdadas da feature de treinos e séries planejadas. Treino vazio não tem comportamento novo. Esta feature presume treino com exercícios cadastrados.

## 4. Fora de Escopo (YAGNI)

Timer de descanso automático. É a feature 6. Encerrar treino com confirmação. É a feature 7. Cancelar treino (backlog junto com encerrar, #7). Foto do treino e registro histórico dos valores reais treinados no dia. Fica para o encerrar (#7), quando haverá valores reais treinados naquele dia. Histórico e resumo. É a feature 9. Ajuste responsivo de telas pequenas. É a feature 8.

Mexer em editar, adicionar ou remover exercícios. Validação nova de valores. Comportamento novo para treino vazio.

A variante C de desenho e interação. Não entra como requisito.

## 5. Critérios de Aceite (testáveis)

Dado o treino exibido, quando dou toque curto no card da série desmarcada, então ela fica marcada na hora, sem confirmação, com fundo na cor do módulo, sem caixinha de marcação nem botão de editar. Dado uma série marcada, quando dou toque curto no card dela e ainda resta outra marcada, então ela desmarca na hora, sem confirmação.

Dado o card da série com a mesma cara da manutenção, quando dou toque longo nele, então abre o modal de edição daquela série com as mesmas opções da manutenção, com troca entre repetição e tempo. A unidade da carga (kg/lb) e o modo (repetição ou tempo) aparecem como herdados do exercício, sem edição no modal. Dado o modal aberto, quando salvo, então aquela série e todas as séries seguintes do mesmo exercício ficam com os mesmos valores, inclusive as já marcadas, e a série volta a exibir com a mesma cara da manutenção.

Dado uma série marcada, quando edito e salvo, então ela segue marcada. Dado nenhuma série marcada, quando marco a primeira, então o momento de início da execução fica registrado. Dado o Treino do Dia com execução iniciada, então o que se exibe é o template ao vivo com marcadores de feito por série. Dado o Treino do Dia com execução aberta, então o nome do treino exibe indicação visual de "em execução". Dado o template de um treino com execução aberta, quando acesso a manutenção, então o treino fica bloqueado para edição.

Dado só uma série marcada no treino, quando desmarco a última, então ela desmarca na hora e aparece a pergunta: "Todas as séries foram desmarcada. Deseja cancelar a execução desse treino?" Dado a pergunta de cancelamento exibida, quando confirmo, então a execução é cancelada, o template é desbloqueado, o momento de início fica limpo e nenhuma série fica marcada. Dado a pergunta de cancelamento exibida, quando cancelo, então a execução segue aberta, o template continua bloqueado, o início segue registrado e nenhuma série fica marcada.

## 6. Riscos e Dependências

Depende do Treino do Dia pronto e das regras de treinos e séries planejadas. O momento de início e o momento de fim ainda não existem no banco. Verificado no código atual: nada guardado em lib nem em utils. Existem só como dado futuro na spec de treinos e no backlog.

A modelagem fica com o plano. Pode ser coluna nova ou tabela nova. Sem isso, o início não persiste.

Risco baixo de sobrescrever série já marcada ao replicar para todas. Risco aceito. Mantém a meta coerente.

## 7. Alternativas Consideradas

Alternativa 1: só toque curto, sem edição no fluxo. Mais simples. Rejeitada porque obrigaria sair do treino para corrigir carga.

Alternativa 2 (escolhida): toque curto no card marca e desmarca, toque longo no card abre modal com as mesmas opções da manutenção e sem opção de copiar, com replicação sempre para a série e as seguintes. Rápida com mão suada. Não sai do treino. Modal concentra edição e salvamento num só gesto. Nota: a caixinha de copiar existiu no discovery e foi removida por decisão humana, que tornou a replicação incondicional.

Alternativa descartada (C): variação extra de desenho e interação. Rejeitada por YAGNI. Não entra como requisito.

Sobre a replicação: escolhida a variante que replica para todas as seguintes, mesmo as já marcadas. Mais simples de entender. Mantém a meta igual até o fim. O custo é sobrescrever valor de série já feita, o que foi aceito.
