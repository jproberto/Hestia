# Cenários de Homologação — Mílon #1 Biblioteca de Exercícios

Derivados exclusivamente de `spec.md` §5 (critérios de aceite) + contratos de `plan.md`.
Foco em comportamento observável; sem detalhes voláteis de UI.
Cobrem caminho feliz, restritivos e edge cases. Todos os 22 critérios de aceite aparecem em ao menos um cenário.

### Cenário 1: Biblioteca vazia orienta a criar o primeiro
**Dado** que ainda não há nenhum exercício cadastrado
**Quando** a pessoa abre a tela da biblioteca
**Então** vê mensagem amigável de lista vazia com orientação para criar o primeiro exercício, sem nenhuma mensagem de erro

### Cenário 2: Filtro por músculo restringe e limpar restaura
**Dado** exercícios de dois músculos distintos cadastrados
**Quando** a pessoa escolhe um músculo no filtro
**Então** vê apenas os exercícios daquele músculo; ao limpar o filtro, volta a ver todos

### Cenário 3: Busca curta é ignorada
**Dado** o campo de busca vazio
**Quando** a pessoa digita um ou dois caracteres
**Então** a lista permanece igual à sem busca, sem filtrar

### Cenário 4: Busca filtra a partir do terceiro caractere e refina
**Dado** exercícios com nomes que compartilham um trecho
**Quando** a pessoa digita o terceiro caractere desse trecho e depois o quarto
**Então** a lista atualiza no terceiro caractere mostrando só as ocorrências e atualiza de novo no quarto refinando o resultado

### Cenário 5: Filtro e busca combinam por E
**Dado** exercícios que cruzam músculo e texto (mesmo trecho de nome em dois músculos)
**Quando** a pessoa ativa o filtro de um músculo mais a busca pelo trecho
**Então** vê somente os itens que atendem aos dois; ao limpar um dos dois, o resultado amplia de acordo

### Cenário 6: Lotes de vinte com mostrar-mais ordenado
**Dado** uma biblioteca com mais de vinte itens no resultado atual
**Quando** a pessoa abre a tela
**Então** vê os vinte primeiros em ordem alfabética por músculo e nome mais a ação de mostrar-mais indicando os restantes; ao acionar, os vinte seguintes aparecem mantendo os anteriores; quando não restar nada, a ação desaparece

### Cenário 7: Trocar filtro ou busca reinicia os lotes
**Dado** que a pessoa revelou lotes extras com mostrar-mais
**Quando** altera o filtro por músculo ou a busca por texto
**Então** a exibição reinicia no primeiro lote do novo resultado

### Cenário 8: Filtro sem ocorrências tem mensagem própria
**Dado** um resultado filtrado sem ocorrências
**Quando** os filtros não encontram nada
**Então** aparece mensagem amigável de nada encontrado, distinta da mensagem de biblioteca vazia, orientando a ajustar os filtros ou criar o exercício

### Cenário 9: Músculo novo passa a existir como opção do filtro
**Dado** o modal aberto para criar
**Quando** a pessoa digita um músculo novo inexistente e salva com nome novo
**Então** o exercício aparece na lista com aquele músculo e o músculo passa a existir como opção do filtro

### Cenário 10: Nome não sugere nem preenche nada
**Dado** o modal aberto
**Quando** a pessoa digita no campo nome o início de um nome já existente
**Então** nenhuma sugestão ou seleção de existente aparece e nenhum link é preenchido automaticamente

### Cenário 11: Duplicata com variação de caixa, acento, especial ou espaço é bloqueada
**Dado** um exercício existente com nome e músculo
**Quando** a pessoa tenta criar outro com o mesmo nome e músculo variando apenas maiúsculas, acentos, caracteres especiais ou espaços extras
**Então** o salvamento é bloqueado com mensagem informando que o exercício já existe naquele músculo e orientando a localizar o item na lista

### Cenário 12: Mesmo nome em músculos diferentes coexiste
**Dado** dois exercícios com o mesmo nome em músculos diferentes
**Quando** a pessoa consulta a lista
**Então** ambos existem, cada um sob seu músculo, sem bloqueio

### Cenário 13: Salvar sem link grava, fecha e atualiza
**Dado** o modal com nome e músculo preenchidos e link vazio
**Quando** a pessoa aciona Salvar
**Então** o exercício é gravado sem link, o modal fecha e a lista mostra o item novo

### Cenário 14: Salvar-e-outro mantém o modal para o próximo
**Dado** o modal com dados válidos
**Quando** a pessoa aciona Salvar e incluir outro
**Então** o exercício é gravado, a lista ao fundo é atualizada, o modal permanece aberto com nome e link limpos, músculo mantido, foco no primeiro campo e lembrete breve de sucesso visível

### Cenário 15: Editar abre preenchido e reflete o link novo
**Dado** um exercício existente na lista
**Quando** a pessoa aciona editar
**Então** o modal abre já preenchido com os dados atuais; ao salvar com link novo, a lista passa a refletir o link novo

### Cenário 16: Editar para nome+músculo de outro é bloqueado
**Dado** um exercício existente
**Quando** a pessoa tenta editar seu nome para nome mais músculo iguais aos de outro exercício existente (considerando a normalização)
**Então** o salvamento é bloqueado com mensagem clara

### Cenário 17: Falha ao salvar preserva o modal e o digitado
**Dada** a falha de gravação
**Quando** a pessoa tenta salvar
**Então** o modal permanece aberto, exibe mensagem de erro visível e mantém o conteúdo digitado

### Cenário 18: Excluir pede confirmação; cancelar preserva
**Dado** um exercício na lista
**Quando** a pessoa pede excluir e confirma
**Então** o exercício some da lista; quando cancela a confirmação, nada muda

### Cenário 19: Biblioteca é compartilhada entre os cônjuges (manual)
**Dado** que um cônjuge cadastrou um exercício
**Quando** o outro abre a biblioteca com seu próprio login
**Então** vê o mesmo exercício, podendo editar ou excluir

### Cenário 20: Carregamento e falha de busca têm estados próprios
**Dado** a tela da biblioteca
**Quando** a lista está sendo buscada e quando a busca falha
**Então** a pessoa vê indicador de carregamento durante a busca e, na falha, mensagem simples de erro com opção de tentar de novo

### Cenário 21: Exercício sem link aparece sem acesso a vídeo
**Dado** um exercício sem link
**Quando** a pessoa abre a lista
**Então** o exercício aparece normalmente, sem acesso a vídeo e sem erro
