# Spec: Execução série a série

## 1. Problema Real

Na academia, com o celular na mão, a pessoa precisa marcar o que já fez. Ela também precisa corrigir carga, repetições e descanso sem sair do treino.

Hoje o Treino do Dia só exibe. Falta executar.

## 2. Usuários e Cenários

Usuários: o casal. Cada um abre o próprio treino ao chegar na academia. Uso no celular, com mão suada.

Cenário 1: marcar cada série feita, uma a uma, durante o treino. Cenário 2: corrigir os valores de uma série no meio do treino e repetir nas seguintes.

Cenário 3: desmarcar uma série marcada por engano, sem burocracia. Cenário 4: desmarcar tudo e limpar a execução atual.

## 3. Regras de Negócio

A tela do Treino do Dia já existe e continua igual. Editar, adicionar e remover exercícios já existe e não muda nesta feature.

Cada série aparece como um card que é o próprio marcador. Não há caixinha de marcação nem botão de editar separados. A série fica bloqueada para edição direta no card. Exibe com exatamente a mesma cara da manutenção, com rótulos de repetição ou tempo e com a unidade da carga visível.

Todo o card da série é área clicável. Toque curto no card alterna na hora entre marcada e desmarcada. Sem confirmação. Toque longo no card abre o modal de edição daquela série.

Série marcada tem fundo na cor do módulo. É o feedback visual de feita.

O modal traz as mesmas opções da manutenção, com troca entre repetição e tempo e com escolha da unidade da carga entre quilos e libras, e salva as informações da série. O modal não tem opção de copiar. Ao salvar, os mesmos valores valem para aquela série e para todas as séries seguintes do mesmo exercício, inclusive as já marcadas.

Salvar fecha o modal. A série volta a exibir com a mesma cara da manutenção.

Série editada mantém o estado. Se estava marcada, segue marcada. Se estava desmarcada, segue desmarcada.

Editar uma série atualiza o planejado. O novo valor vira a meta permanente. É a base da evolução futura.

A primeira marcação de qualquer série registra o momento de início da execução. Desmarcar a última série marcada desmarca na hora e pede confirmação com a pergunta: nenhuma série marcada, deseja limpar essa execução. A pergunta decide só sobre o início. Confirmar limpa o momento de início e nenhuma série fica marcada. Cancelar mantém a série desmarcada, com o início preservado e nenhuma série marcada.

Sem validação nova. Valem as regras herdadas da feature de treinos e séries planejadas. Treino vazio não tem comportamento novo. Esta feature presume treino com exercícios cadastrados.

## 4. Fora de Escopo (YAGNI)

Timer de descanso automático. É a feature 6. Encerrar treino com confirmação. É a feature 7. Histórico e resumo. É a feature 9. Ajuste responsivo de telas pequenas. É a feature 8.

Mexer em editar, adicionar ou remover exercícios. Validação nova de valores. Comportamento novo para treino vazio.

A variante C de desenho e interação. Não entra como requisito.

## 5. Critérios de Aceite (testáveis)

Dado o treino exibido, quando dou toque curto no card da série desmarcada, então ela fica marcada na hora, sem confirmação, com fundo na cor do módulo, sem caixinha de marcação nem botão de editar. Dado uma série marcada, quando dou toque curto no card dela e ainda resta outra marcada, então ela desmarca na hora, sem confirmação.

Dado o card da série com a mesma cara da manutenção, quando dou toque longo nele, então abre o modal de edição daquela série com as mesmas opções da manutenção, com troca entre repetição e tempo e escolha entre quilos e libras. Dado o modal aberto, quando salvo, então aquela série e todas as séries seguintes do mesmo exercício ficam com os mesmos valores, inclusive as já marcadas, e a série volta a exibir com a mesma cara da manutenção.

Dado uma série marcada, quando edito e salvo, então ela segue marcada. Dado nenhuma série marcada, quando marco a primeira, então o momento de início da execução fica registrado.

Dado só uma série marcada no treino, quando desmarco a última, então ela desmarca na hora e aparece a pergunta: nenhuma série marcada, deseja limpar essa execução. Dado a pergunta de limpar exibida, quando confirmo, então o momento de início fica limpo e nenhuma série fica marcada. Dado a pergunta de limpar exibida, quando cancelo, então a série segue desmarcada, o início segue registrado e nenhuma série fica marcada.

## 6. Riscos e Dependências

Depende do Treino do Dia pronto e das regras de treinos e séries planejadas. O momento de início e o momento de fim ainda não existem no banco. Verificado no código atual: nada guardado em lib nem em utils. Existem só como dado futuro na spec de treinos e no backlog.

A modelagem fica com o plano. Pode ser coluna nova ou tabela nova. Sem isso, o início não persiste.

Risco baixo de sobrescrever série já marcada ao copiar para todas. Risco aceito. Mantém a meta coerente.

## 7. Alternativas Consideradas

Alternativa 1: só toque curto, sem edição no fluxo. Mais simples. Rejeitada porque obrigaria sair do treino para corrigir carga.

Alternativa 2 (escolhida): toque curto no card marca e desmarca, toque longo no card abre modal com as mesmas opções da manutenção e sem opção de copiar, com replicação sempre para a série e as seguintes. Rápida com mão suada. Não sai do treino. Modal concentra edição e salvamento num só gesto. Nota: a caixinha de copiar existiu no discovery e foi removida por decisão humana, que tornou a replicação incondicional.

Alternativa descartada (C): variação extra de desenho e interação. Rejeitada por YAGNI. Não entra como requisito.

Sobre a cópia: escolhida a variante que copia para todas as seguintes, mesmo as já marcadas. Mais simples de entender. Mantém a meta igual até o fim. O custo é sobrescrever valor de série já feita, o que foi aceito.
