# Spec: Biblioteca de Exercícios (Mílon #1 — escopo B, revisão v2 pós-feedback)

## 1. Problema Real

Hoje o casal troca de ficha de treino a cada alguns meses e cada ficha nova obriga a redigitar do zero os nomes dos exercícios, os músculos trabalhados e os links de vídeo de referência. Esse retrabalho gera erros de digitação, nomes diferentes para o mesmo exercício e perda dos links já encontrados antes.

Esta feature cria uma biblioteca única e compartilhada do casal onde cada exercício é cadastrado uma única vez e reaproveitado nas fichas futuras. O valor está no reaproveitamento: digitar uma vez, usar em todos os treinos seguintes, sem tela pesada de gestão, e achar rápido o que já existe através de consulta simples com filtro por músculo, busca por texto e carregamento em lotes.

Fonte: decisão de escopo B registrada em context.json da feature (2026-09-12), item 1 do backlog do módulo Mílon e feedback humano v1 pós-spec (2026-09-12) sobre consulta, salvamento em lote e separação entre modal da biblioteca e seleção do treino.

## 2. Usuários e Cenários

Usuários: o casal, com login individual cada um, sem permissão restrita. Qualquer um dos dois pode ver, criar, editar e excluir qualquer exercício da biblioteca. Cada exercício não tem dono — a biblioteca é uma só, compartilhada.

Cenários cobertos nesta feature, todos na tela própria da biblioteca:

- Consultar a lista: ao chegar na tela, a pessoa vê os exercícios já cadastrados em lista simples ordenada, com filtro por músculo, campo de busca por texto e carregamento em lotes com ação de mostrar mais.
- Buscar por texto: a pessoa digita parte do nome e, a partir do terceiro caractere, a lista atualiza a cada caractere mostrando só as ocorrências correspondentes.
- Criar: a pessoa abre o cadastro, informa músculo, nome e link de vídeo opcional, e salva. Pode salvar um e voltar para a lista, ou salvar e emendar o próximo sem fechar o cadastro.
- Editar: a pessoa, a partir de um item da lista de consulta, abre o mesmo modal já preenchido, corrige nome, músculo ou link e salva.
- Excluir: a pessoa remove um exercício que não faz mais sentido, após confirmação.
- Filtrar por músculo: a pessoa escolhe um músculo e vê só os exercícios daquele músculo, combinável com a busca por texto.

O uso dentro da montagem do treino (escolher um exercício existente na hora de montar a ficha) não pertence a esta feature — pertence à feature número 3, que construirá seu próprio seletor sobre os dados desta biblioteca.

## 3. Regras de Negócio (positivas + edge cases)

### Exercício e campos

- Cada exercício tem três informações: Nome (texto curto), Músculo (texto curto que agrupa, como peito ou perna) e Link de vídeo (endereço de referência, sempre opcional).
- Nome e músculo são obrigatórios. Link de vídeo nunca é obrigatório, nem na criação nem na edição.
- A biblioteca é única e compartilhada: o que um cônjuge cadastra aparece para o outro, sem cópia por usuário.

### Tela própria da biblioteca

- Existe uma tela própria da biblioteca, acessível pelo módulo de academia, com lista simples de exercícios, filtro por músculo, campo de busca por texto e carregamento em lotes.
- A lista mostra cada exercício com seu nome, seu músculo e um acesso ao vídeo quando houver link cadastrado. Exercícios sem link aparecem normalmente, só sem o acesso ao vídeo.
- Biblioteca vazia não é erro: mostra mensagem amigável de que ainda não há exercícios e orienta a criar o primeiro.
- Carregamento mostra indicador simples de que a lista está sendo buscada. Falha de busca mostra mensagem simples de erro com possibilidade de tentar de novo.

### Consulta: filtro por músculo, busca por texto e lotes

- O filtro por músculo mostra apenas os exercícios do músculo escolhido. Existe uma opção de limpar o filtro para voltar a ver tudo. Novos músculos passam a existir como opção do filtro assim que o primeiro exercício com aquele músculo é gravado.
- O campo de busca por texto é livre e filtra pelo nome do exercício. Com zero, um ou dois caracteres, a busca é ignorada e a lista se comporta como se o campo estivesse vazio. A partir do terceiro caractere, a cada caractere digitado ou apagado (enquanto permanecer com três ou mais), a lista é atualizada para mostrar somente os exercícios cujo nome contém o trecho digitado.
- A comparação da busca por texto usa a mesma equivalência da regra anti-duplicata: minúsculas, sem acentos (onde a equivale a á, à e ã, e assim por diante para as demais letras), sem caracteres especiais e sem diferença de espaços extras no início, no fim ou duplicados no meio.
- Filtro por músculo e busca por texto combinam por E lógico: quando ambos estão ativos, a lista mostra somente os exercícios que atendem aos dois ao mesmo tempo.
- A consulta usa lotes progressivos com ação de mostrar mais, sem páginas numeradas e sem botões de avançar ou voltar nesta versão. O lote inicial exibe até vinte itens. Quando houver mais itens além do lote exibido, aparece uma ação de mostrar mais indicando quantos restam; cada acionamento acrescenta o próximo lote de até vinte itens mantendo os já exibidos. Quando não houver mais itens, a ação desaparece.
- Qualquer alteração no filtro por músculo ou na busca por texto reinicia a exibição para o primeiro lote: itens extras previamente revelados recolhem e a contagem de restantes é recalculada sobre o novo resultado.
- Resultado filtrado sem ocorrências não é erro: mostra mensagem amigável de que nada foi encontrado para aquela combinação, distinta da mensagem de biblioteca totalmente vazia, e orienta a ajustar os filtros ou criar o exercício.
- A ordenação alfabética por músculo e depois por nome vale para todos os estados da consulta: lista cheia, filtrada por músculo, buscada por texto, combinada e em todos os lotes.

### Modal único de criar e editar, sem seleção de existente

- Criação e edição usam o mesmo modal, com os mesmos campos e validações. O modal serve somente para criar um exercício novo ou editar os dados de um exercício já escolhido na lista. O modal não lista, não sugere e não seleciona exercícios existentes.
- A edição é sempre chamada a partir da lista de consulta: cada item da lista oferece acesso para editar, que abre o modal já preenchido com os dados atuais daquele exercício.
- O campo Músculo é uma lista digitável e continua assim: a pessoa pode digitar para procurar entre os músculos já usados ou digitar um músculo novo que ainda não existe. Escolher um existente agrupa naquele músculo; digitar um novo passa a existir ao salvar.
- O campo Nome é livre, sem lista de sugestões, sem preenchimento automático e sem seleção de existente. A proteção contra nomes repetidos acontece somente pelo bloqueio anti-duplicata no momento de salvar, descrito abaixo.
- O campo Link de vídeo aceita endereço vazio. Quando preenchido, é guardado como informado, sem exigência de formato específico além de ser um endereço válido quando presente.
- Cancelar fecha o modal sem salvar nada e sem alterar a lista.
- Falha ao salvar mantém o modal aberto, mostra mensagem de erro visível dentro do modal e preserva o que foi digitado. O modal nunca fecha silenciosamente no erro.

### Botões de salvamento

- O modal tem dois botões de confirmação, seguindo o comportamento já homologado da feature Pluto 05d de Salvar e Adicionar Outro:
  - Salvar: grava o exercício, fecha o modal e volta para a lista já atualizada com o item novo ou editado.
  - Salvar e incluir outro: grava o exercício, atualiza a lista em segundo plano, mostra lembrete breve de sucesso dentro do modal e mantém o modal aberto e limpo para o próximo cadastro, com o foco voltado ao primeiro campo para digitação contínua.
- Ao usar Salvar e incluir outro, o músculo escolhido é mantido para agilizar cadastros em sequência do mesmo grupo muscular; nome e link são limpos. Uma mensagem breve confirma cada gravação sem fechar o modal.
- Durante a gravação, os botões ficam em estado desabilitado para evitar cliques duplos; após a conclusão, voltam ao normal.

### Anti-duplicata por nome mais músculo

- Não podem existir dois exercícios com o mesmo nome no mesmo músculo, considerando equivalências: comparação em minúsculas, sem acentos (onde a equivale a á, à e ã, e assim por diante para as demais letras), sem caracteres especiais e sem espaços extras no início, no fim ou duplicados no meio.
- Ao tentar salvar um nome que já existe naquele músculo por essa comparação, o salvamento é bloqueado com mensagem clara informando que o exercício já existe naquele músculo e orientando a localizar o item na lista para conferência ou edição. A pessoa não consegue gravar o duplicado; precisa corrigir o nome ou o músculo.
- O mesmo nome em músculos diferentes é permitido (são exercícios distintos).
- Na edição, a regra vale contra todos os outros exercícios: pode manter o próprio nome, mas não pode assumir nome mais músculo iguais aos de outro exercício existente.

### Exclusão

- Excluir pede confirmação explícita antes de apagar, informando qual exercício será removido.
- Nesta feature ainda não existem treinos cadastrados (treinos chegam na feature número 3), então a exclusão é simples: confirmou, apaga da lista.
- Fica registrado que a feature número 3, ao ligar exercícios aos treinos, precisará preservar o histórico: exercício usado em treino não poderá sumir do histórico mesmo se excluído da biblioteca. Essa proteção pertence à feature número 3, não a esta.

### Compartilhamento e ordenação

- Toda a lista é visível para os dois usuários, sem filtro por dono e sem área privada.
- A lista é apresentada em ordem alfabética por músculo e depois por nome, para facilitar a localização, em todos os estados de filtro, busca e lotes.

### Contrato de dados para a feature número 3

- Esta feature entrega o cadastro, a consulta (lista, filtro por músculo, busca por texto, lotes, ordenação) e a regra anti-duplicata como base de dados reutilizável. A feature número 3 construirá seu próprio seletor de exercício existente para a tela de montagem do treino, chamando esses dados.
- Não há reuso do modal com seleção: o modal desta feature não ganha modo de seleção agora nem depois; a seleção de existente é responsabilidade exclusiva da feature número 3.

## 4. Fora de Escopo (YAGNI)

- Ponto de entrada dentro da montagem do treino e seletor de exercício existente na hora de montar a ficha. Fica para a feature número 3, que declarará dependência do contrato de dados desta feature e construirá seu próprio seletor.
- Qualquer seleção, sugestão ou preenchimento automático de exercício existente dentro do modal da biblioteca.
- Páginas numeradas e navegação de avançar ou voltar na consulta; vale somente o lote inicial com mostrar mais.
- Busca por texto com um ou dois caracteres; abaixo de três caracteres o campo é ignorado por decisão.
- Filtros avançados além de músculo mais texto (por exemplo, por letra inicial, por presença de vídeo ou múltiplos músculos).
- Link de vídeo obrigatório em qualquer situação.
- Tela pesada de gestão (importação de fichas, edição em massa, categorias avançadas, estatísticas da biblioteca).
- Carga, repetições, séries, descanso, RPE, RIR, séries de aquecimento ou séries extras.
- Observações por exercício.
- Permissões restritas por usuário, áreas privadas ou qualquer controle de quem pode ver ou editar o quê.
- Padronização transversal de estilos, rótulos e comportamento do salvamento em lote como entrega desta feature; nesta feature vale somente o comportamento concreto dos dois botões, e a padronização segue como proposta na seção de riscos e dependências.

## 5. Critérios de Aceite (high-level, testáveis)

- Dada a biblioteca vazia, quando a pessoa abre a tela, então vê mensagem amigável de lista vazia com orientação para criar o primeiro exercício, sem nenhuma mensagem de erro.
- Dados exercícios de dois músculos distintos cadastrados, quando a pessoa escolhe um músculo no filtro, então vê apenas os exercícios daquele músculo; ao limpar o filtro, volta a ver todos.
- Dado o campo de busca vazio e depois com um ou dois caracteres, quando a pessoa digita, então a lista permanece igual à sem busca, sem filtrar.
- Dados exercícios com nomes que compartilham um trecho, quando a pessoa digita o terceiro caractere desse trecho, então a lista atualiza para mostrar somente as ocorrências correspondentes; ao digitar o quarto caractere, a lista atualiza de novo refinando o resultado.
- Dados exercícios que cruzam músculo e texto (por exemplo, mesmo trecho de nome em dois músculos), quando a pessoa ativa o filtro de um músculo mais a busca pelo trecho, então vê somente os itens que atendem aos dois; ao limpar um dos dois, o resultado amplia de acordo.
- Dada uma biblioteca com mais de vinte itens no resultado atual, quando a pessoa abre a tela, então vê os vinte primeiros em ordem alfabética por músculo e nome mais a ação de mostrar mais indicando os restantes; ao acionar mostrar mais, os vinte seguintes aparecem mantendo os anteriores; quando não restar nada, a ação desaparece.
- Dado que a pessoa revelou lotes extras com mostrar mais, quando altera o filtro por músculo ou a busca por texto, então a exibição reinicia no primeiro lote do novo resultado.
- Dado um resultado filtrado sem ocorrências, quando os filtros não encontram nada, então aparece mensagem amigável de nada encontrado, distinta da mensagem de biblioteca vazia.
- Dado o modal aberto para criar, quando a pessoa digita um músculo novo inexistente e salva com nome novo, então o exercício aparece na lista com aquele músculo e o músculo passa a existir como opção do filtro.
- Dado o modal aberto, quando a pessoa digita no campo nome o início de um nome já existente, então nenhuma sugestão ou seleção de existente aparece e nenhum link é preenchido automaticamente.
- Dado um exercício existente com nome e músculo, quando a pessoa tenta criar outro com o mesmo nome e músculo variando apenas maiúsculas, acentos, caracteres especiais ou espaços extras, então o salvamento é bloqueado com mensagem informando que o exercício já existe naquele músculo e orientando a localizar o item na lista.
- Dados dois exercícios com o mesmo nome em músculos diferentes, quando a pessoa consulta a lista, então ambos existem, cada um sob seu músculo, sem bloqueio.
- Dado o modal com nome e músculo preenchidos e link vazio, quando a pessoa aciona Salvar, então o exercício é gravado sem link, o modal fecha e a lista mostra o item novo.
- Dado o modal com dados válidos, quando a pessoa aciona Salvar e incluir outro, então o exercício é gravado, a lista ao fundo é atualizada, o modal permanece aberto com nome e link limpos, músculo mantido, foco no primeiro campo e lembrete breve de sucesso visível.
- Dado um exercício existente na lista, quando a pessoa aciona editar, então o modal abre já preenchido com os dados atuais; ao salvar com link novo, a lista passa a refletir o link novo.
- Dado um exercício existente, quando a pessoa tenta editar seu nome para nome mais músculo iguais aos de outro exercício existente (considerando a normalização), então o salvamento é bloqueado com mensagem clara.
- Dada a falha de gravação, quando a pessoa tenta salvar, então o modal permanece aberto, exibe mensagem de erro visível e mantém o conteúdo digitado.
- Dado um exercício na lista, quando a pessoa pede excluir e confirma, então o exercício some da lista; quando cancela a confirmação, então nada muda.
- Dado que um cônjuge cadastrou um exercício, quando o outro abre a biblioteca com seu próprio login, então vê o mesmo exercício, podendo editar ou excluir.
- Durante o carregamento da lista, a pessoa vê indicador de carregamento; simulada a falha de busca, vê mensagem simples de erro com opção de tentar de novo.
- Dado um exercício sem link, quando a pessoa abre a lista, então o exercício aparece normalmente, sem acesso a vídeo e sem erro.

## 6. Riscos e Dependências

- A feature número 3 (treinos e séries planejadas) depende do contrato de dados desta feature: listagem, filtro por músculo, busca por texto e regra anti-duplicata. A feature número 3 construirá seu próprio seletor de existente; mudanças nos dados ou na regra anti-duplicata precisam manter compatibilidade com esse consumo futuro. O modal desta feature não é o componente de seleção e não será adaptado para isso.
- A proteção de histórico (exercício usado em treino não some do passado) é risco conhecido e deliberadamente adiado: será tratado na feature número 3, que é onde os treinos passam a existir. Até lá, a exclusão simples é suficiente.
- Persistência exige migração incremental nova no banco de dados do projeto, sem alterar migrações já aplicadas, seguindo o padrão de migrações auditadas do projeto. A tabela de exercícios é nova e não mexe em dados financeiros existentes.
- Risco de divergência de nomes do mesmo exercício entre os dois usuários é mitigado pela regra anti-duplicata com normalização e pela mensagem que orienta a localizar o existente na lista, sem auto-seleção no modal.
- Avaliação de padrão transversal de salvamento em lote: o comportamento de Salvar e incluir outro agora aparece em dois lugares (Pluto 05d nas transações e Mílon 01 na biblioteca) e tende a se repetir na montagem de treinos da feature número 3. Vale uniformizar rótulos, estilos, campos mantidos ou limpos, foco e mensagem de sucesso como padrão transversal do produto. Proposta de texto de entrada no backlog de Héstia, ainda não criada, para decisão futura: entrada com título Padrão transversal Salvar e incluir outro e descrição que uniformiza em todas as telas de cadastro em lote os rótulos dos botões, a ordem e o estilo das ações, quais campos são mantidos e quais são limpos, o retorno de foco ao primeiro campo e o lembrete breve de sucesso, tendo como referência o comportamento homologado da Pluto 05d e o comportamento concreto desta feature Mílon 01. Justificativa: evita três variações visuais e comportamentais do mesmo gesto, reduz custo de planejamento das próximas features em lote e preserva o comportamento concreto desta feature independentemente da futura padronização.

## 7. Alternativas Consideradas (com trade-offs e escolha)

- Alternativa A — cadastro completo e isolado: construir já uma gestão robusta de exercícios com validações avançadas, formatos de link rígidos e recursos de organização. Benefício seria cobertura ampla desde o início; custo seria tempo alto, tela pesada contrariando o backlog (que pede cadastro rápido sem tela pesada) e risco de construir o que o casal nunca usará. Rejeitada por violar o princípio de menor versão útil.
- Alternativa B — biblioteca mínima com contrato de dados reutilizável (escolhida): tela própria simples com lista mais filtro por músculo, busca por texto com gatilho no terceiro caractere, lotes com mostrar mais de vinte em vinte, modal único de criar e editar sem seleção de existente (músculo digitável mantido, nome livre com bloqueio anti-duplicata), duplo botão de salvamento no comportamento Pluto 05d, anti-duplicata com normalização e exclusão simples com confirmação; reuso pela feature número 3 via contrato de dados e seletor próprio, não via modal com seleção. Benefício é resolver o retrabalho agora com o menor custo, achar rápido sem tela pesada e já deixar a base pronta para a montagem do treino; custo é adiar proteção de histórico e padronização transversal, o que é aceitável porque ainda não há treinos e o comportamento concreto desta feature fica preservado. Escolhida por decisão registrada em context.json em 2026-09-12 e ajustada pelo feedback humano v1.
- Alternativa C — reordenar ou fundir com treinos: pular a biblioteca isolada e construir exercícios somente dentro da montagem do treino, ou fundir as features 1 e 3 em uma só. Benefício seria menos telas; custo seria acoplar duas entregas distintas, impedir o casal de organizar a base antes das fichas e dificultar homologação em partes pequenas. Rejeitada porque mistura escopos independentes e adia o reaproveitamento que é o valor central desta feature.
- Alternativa de consulta D1 — páginas numeradas com avançar e voltar: daria salto direto a qualquer página e contagem exata. Custo seria complexidade de navegação e de homologação em celular na academia para uma base pequena de dois usuários, além de exigir estados de página que complicam a combinação com filtros. Rejeitada nesta versão em favor de mostrar mais.
- Alternativa de consulta D2 — mostrar mais progressivo de vinte em vinte (escolhida): lote inicial de vinte com ação indicando restantes e acréscimo do próximo lote a cada acionamento, com reinício ao filtrar. Benefício é simplicidade mobile, um único gesto, combinação natural com filtros e critérios de aceite testáveis sem definir interface de paginação; custo é não permitir salto direto a páginas distantes, irrelevante para o volume esperado da biblioteca do casal. Tamanho de vinte escolhido como decisão de especificação por equilibrar lista legível no celular com poucas revelações; a implementação preserva esse comportamento observável.
- Alternativa de busca E1 — filtrar desde o primeiro caractere: responderia mais cedo, mas com um ou dois caracteres quase tudo coincide e a lista oscilaria a cada toque, com pouco valor e mais renderizações. Rejeitada em favor do gatilho no terceiro caractere com combinação em E com o filtro de músculo.
- Alternativa de modal F1 — modal com sugestão, seleção e preenchimento de link (versão anterior desta especificação): ajudaria a reaproveitar o link, mas misturava criar com selecionar, contradizia o backlog (que coloca a seleção na montagem do treino) e criava um modal com dois papéis que a feature número 3 herdaria. Rejeitada pelo feedback humano v1 em favor do modal só de criar e editar com nome livre e bloqueio anti-duplicata.
- Alternativa de modal F2 — modal só de criar e editar mais seletor próprio da feature número 3 (escolhida): modal desta feature sem lista nem seleção; seleção de existente pertence à tela de treino, que chamará os dados e a regra daqui. Benefício é escopo único, sem contradição, e contrato claro entre as features; custo é construir o seletor na feature número 3, já previsto no backlog.
- Alternativa transversal G1 — padronizar agora estilos e rótulos do salvamento em lote nesta feature: uniformizaria de imediato, mas travaria esta entrega a uma decisão transversal sem as telas futuras mapeadas. Rejeitada como entrega; mantida como proposta de entrada no backlog de Héstia com texto e justificativa na seção de riscos e dependências.
