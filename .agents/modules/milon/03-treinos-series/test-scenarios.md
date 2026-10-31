# Cenários de Teste — Mílon #3: Treinos e séries planejadas

> Base: spec §5 (Critérios de Aceite) + cenários pós-ativação repassados da feature #2 (guarda liberada com conteúdo mínimo).
> Formato: **Dado / Quando / Então** (Gherkin-style).

---

## 1. Criar Programa e Treinos

### CA-01: Programa sem treinos — estado vazio
**Dado** um Programa sem treinos  
**Quando** a pessoa abre o detalhe do Programa  
**Então** a lista de treinos mostra estado vazio com orientação e ação de adicionar treino, sem mensagem de erro

### CA-02: Sugestão de nome — primeiro treino
**Dado** um Programa sem nenhum treino  
**Quando** a pessoa abre o formulário de novo treino  
**Então** o campo já vem preenchido com "Treino A"

### CA-03: Sugestão de nome — segundo e terceiro treino
**Dado** um Programa com um treino "Treino A"  
**Quando** a pessoa adiciona um segundo treino  
**Então** a sugestão é "Treino B"  
**E** ao adicionar um terceiro, a sugestão é "Treino C"

### CA-04: Sugestão de nome — além de Z (AA, AB…)
**Dado** um Programa com os 26 treinos "Treino A" a "Treino Z"  
**Quando** a pessoa adiciona mais um treino  
**Então** a sugestão é "Treino AA"  
**E** com "Treino AA" também existente, a sugestão seguinte é "Treino AB"

### CA-05: Sugestão de nome — primeira posição livre
**Dado** um Programa com os treinos "Treino A" e "Push"  
**Quando** a pessoa adiciona outro treino  
**Então** a sugestão é "Treino B" (primeira posição livre)  
**E** a sugestão pode ser substituída por qualquer texto

### CA-06: Nome do treino obrigatório
**Dado** o formulário de treino com o nome apagado (ou só com espaços)  
**Quando** a pessoa tenta salvar  
**Então** o salvamento é bloqueado com mensagem visível "Informe o nome do treino."  
**E** o formulário permanece aberto e nada é criado

### CA-07: Nome do treino único no Programa (normalizado)
**Dado** um Programa que já tem um treino chamado "Push"  
**Quando** a pessoa cria (ou renomeia) outro treino com o nome "push" (mesma caixa ou com espaços extras)  
**Então** o salvamento é bloqueado com mensagem visível "Já existe um treino com esse nome neste programa."  
**E** o formulário permanece aberto  
**E** em outro Programa, o mesmo nome é aceito

### CA-08: Ordem dos treinos — ordem de criação
**Dado** um Programa com vários treinos  
**Quando** a pessoa visualiza a lista  
**Então** a lista exibe sempre a ordem de criação, sem nenhuma ação de reordenar treinos

### CA-09: Excluir treino sem exercícios — direto
**Dado** um treino sem exercícios  
**Quando** a pessoa o exclui  
**Então** a exclusão acontece sem confirmação

### CA-10: Excluir Programa sem treinos — confirmação da #2
**Dado** um Programa sem treinos  
**Quando** a pessoa tenta excluí-lo na tela de Programas  
**Então** a exclusão segue a confirmação existente da #2 e nada mais é afetado

### CA-11: Subtítulo do treino — sem exercícios
**Dado** um treino sem exercícios  
**Então** o subtítulo aparece vazio

### CA-12: Estados de tela — AsyncState centralizado
**Dado** o detalhe do Programa e do treino  
**Então** os estados de carregamento, erro, vazio e não-encontrado usam o componente centralizado AsyncState  
**E** erro de carga exibe "Tentar novamente"  
**E** erro de operação/bloqueio não exibe retry

### CA-13: Navegação do módulo — duas abas
**Dada** a navegação do módulo  
**Então** ela permanece com as duas abas existentes (Exercícios e Programas) — nenhuma aba nova foi criada

### CA-14: Navegação pós-criar treino — redireciona para detalhamento
**Dado** um Programa em status "rascunho" ou "ativo"  
**Quando** a pessoa cria um novo treino  
**Então** é redirecionada automaticamente para a página de detalhamento do treino criado (/milon/programs/[id]/workouts/[workoutId])

### CA-15: Botão voltar do treino para o Programa
**Dado** a página de detalhamento de um treino  
**Quando** a pessoa clica no botão "Voltar ao programa" no cabeçalho  
**Então** navega para a página de detalhamento do Programa (/milon/programs/[id])

---

## 2. Adicionar Exercícios aos Treinos

### CA-16: Treino sem exercícios — estado vazio
**Dado** um treino sem exercícios  
**Quando** a pessoa abre o detalhe do treino  
**Então** aparece estado vazio com ação de adicionar exercício

### CA-17: Adicionar exercício — escolher existente ou cadastrar novo
**Dado** um treino sem exercícios  
**Quando** a pessoa adiciona um exercício  
**Então** pode escolher um exercício existente da biblioteca ou cadastrar um novo na hora (que entra na biblioteca compartilhada)

### CA-18: Lista de exercícios — busca, filtro por músculo e scroll
**Dado** o modal de adicionar exercício aberto com muitos exercícios na biblioteca  
**Quando** a pessoa digita no campo de busca  
**Então** a lista é filtrada por nome em tempo real  
**E** quando seleciona um grupo muscular no filtro  
**Então** a lista mostra apenas exercícios desse grupo  
**E** a lista suporta scroll virtual/paginação para listas longas  
**E** o botão "Cadastrar novo" permanece sempre visível (sticky no topo)

### CA-19: Unicidade de exercício no Treino (D14) — bloqueado no mesmo treino
**Dado** um exercício já presente em um treino  
**Quando** a pessoa tenta adicioná-lo novamente no **mesmo treino**  
**Então** a adição é bloqueada com mensagem visível "Este exercício já está neste treino. Escolha outro exercício."  
**E** o modal permanece aberto  
**E** nada é criado  
**E** em um treino **diferente** do mesmo Programa, o mesmo exercício é adicionado normalmente  
**E** em um Programa diferente, o mesmo exercício é adicionado normalmente

### CA-20: Editar exercício — reflete em todos os Programas
**Dado** um exercício usado em treinos de mais de um Programa  
**Quando** a pessoa edita nome, músculo ou link em um deles  
**Então** a alteração é refletida nos demais Programas

### CA-21: Excluir exercício sem séries — direto
**Dado** um exercício sem séries  
**Quando** a pessoa o exclui  
**Então** a exclusão acontece sem confirmação

### CA-22: Reordenação de exercícios — drag & drop com ghost card e animação
**Dado** o detalhe de um treino com vários exercícios  
**Quando** a pessoa arrasta um exercício pelo handle  
**Então** um ghost card com opacidade reduzida acompanha o cursor  
**E** um placeholder visual indica a posição de drop  
**E** os demais cards animam suavemente para preencher o espaço  
**E** ao soltar, a nova ordem persiste ao recarregar a página  
**E** funciona tanto em mobile (touch) quanto desktop

---

## 3. Adicionar Séries aos Exercícios

### CA-23: Quantidade de séries inválida — bloqueada
**Dado** o campo de quantidade de séries vazio, zero ou não numérico  
**Quando** a pessoa tenta criar as séries  
**Então** nada é criado e aparece mensagem visível "Informe a quantidade de séries (número inteiro maior ou igual a 1)."

### CA-24: Quantidade de séries válida — cria cards
**Dado** o campo de quantidade preenchido com "5"  
**Quando** a pessoa confirma  
**Então** surgem exatamente 5 cards com repetições, tempo, carga e descanso vazios

### CA-25: Reduzir quantidade com séries preenchidas — confirmação
**Dado** um exercício com 5 séries onde as 3 primeiras estão preenchidas  
**Quando** a pessoa reduz a quantidade para 3  
**Então** aparece confirmação (há dados em risco)  
**E** confirmado, as séries excedentes são removidas  
**E** cancelado, nada muda

### CA-26: Reduzir quantidade sem preenchimento — direto
**Dado** um exercício com séries recém-criadas sem preenchimento  
**Quando** a pessoa reduz a quantidade  
**Então** não há confirmação e as séries são removidas direto

### CA-27: Aumentar quantidade — acrescenta ao final
**Dado** um exercício com 3 séries  
**Quando** a pessoa altera a quantidade para 5  
**Então** 2 novas séries vazias são acrescentadas ao final, sem tocar nas existentes

### CA-28: Descanso — campo único no exercício
**Dado** um exercício com séries  
**Quando** a pessoa edita o descanso no nível do exercício  
**Então** todas as séries daquele exercício passam a refletir o novo valor (campo único)

### CA-29: Aplicar a todas — copia valores da origem
**Dado** a primeira série preenchida com repetições e carga  
**Quando** a pessoa aciona "aplicar a todas"  
**Então** as demais séries do exercício passam a ter os mesmos valores  
**E** alterada a origem e acionado de novo, os valores anteriores são sobrescritos

### CA-30: Unidade de carga — primeira digitação
**Dado** um exercício sem unidade de carga  
**Quando** a pessoa digita um peso pela primeira vez  
**Então** ela escolhe entre kg e libra  
**E** concluída a escolha, os pesos seguintes daquele exercício não perguntam a unidade de novo

### CA-31: Unidade de carga — valor convertido exibido
**Dado** um peso exibido com unidade secundária  
**Então** o valor convertido aparece ao lado, menor e em cinza mais claro

### CA-32: Carga vazia vs zero
**Dado** um campo de carga vazio  
**Então** a exibição mostra traço (não zero)  
**Dado** o valor 0 digitado  
**Então** a exibição mostra 0

### CA-33: Card de séries compacto — grid 4 colunas, campo único reps/tempo, toggle unidade
**Dado** um exercício com múltiplas séries  
**Quando** a pessoa visualiza as séries  
**Então** os cards são exibidos em grid responsivo (1 col mobile, 2 tablet, 4 desktop)  
**E** cada card tem um campo único "Repetições/Tempo" com toggle para alternar  
**E** abaixo do campo carga há toggle de unidade kg/lb (pré-selecionado kg)  
**E** os cards são visualmente menores, aproveitando a largura disponível

---

## 4. Ativar Programa (guarda de ativação)

### CA-34: Ativação liberada com conteúdo mínimo
**Dado** um Programa com pelo menos um treino com pelo menos um exercício  
**Quando** a pessoa tenta ativá-lo (ou reativá-lo)  
**Então** a ativação é liberada

### CA-35: Ativação bloqueada sem conteúdo mínimo
**Dado** um Programa sem treino com exercício  
**Quando** a pessoa tenta ativá-lo  
**Então** a ativação continua bloqueada com a mensagem existente "Adicione pelo menos um treino com exercícios para ativar" com origem `bloqueio`

### CA-P2-01: Ativar Programa rascunho com treino e exercício
**Dado** um Programa em status "rascunho" com pelo menos um treino contendo pelo menos um exercício  
**Quando** a pessoa clica em "Ativar"  
**Então** o Programa muda para status "ativo"  
**E** o Programa ativo anterior do mesmo dono (se houver) é desativado automaticamente (efeito colateral da #2)

### CA-P2-02: Reativar Programa inativo com treino e exercício
**Dado** um Programa em status "inativo" com pelo menos um treino contendo pelo menos um exercício  
**Quando** a pessoa clica em "Reativar"  
**Então** o Programa muda para status "ativo"  
**E** o Programa ativo anterior do mesmo dono (se houver) é desativado automaticamente

### CA-P2-03: Tentar ativar Programa rascunho sem treino com exercício
**Dado** um Programa em status "rascunho" sem nenhum treino com exercício  
**Quando** a pessoa clica em "Ativar"  
**Então** a ativação é bloqueada com mensagem "Adicione pelo menos um treino com exercícios para ativar"  
**E** o status permanece "rascunho"

### CA-P2-04: Tentar reativar Programa inativo sem treino com exercício
**Dado** um Programa em status "inativo" sem nenhum treino com exercício  
**Quando** a pessoa clica em "Reativar"  
**Então** a ativação é bloqueada com mensagem "Adicione pelo menos um treino com exercícios para ativar"  
**E** o status permanece "inativo"

### CA-P2-05: Excluir Programa ativo — não permitido (regra da #2)
**Dado** um Programa em status "ativo"  
**Quando** a pessoa tenta excluí-lo  
**Então** a exclusão é bloqueada (regra da #2: só rascunho pode ser excluído)

### CA-P2-06: Excluir Programa inativo com treinos — bloqueado pela #3
**Dado** um Programa em status "inativo" com treinos  
**Quando** a pessoa tenta excluí-lo  
**Então** a exclusão é bloqueada com mensagem "Este programa possui treinos. Esvazie-o antes de excluir." (regra da #3)

### CA-P2-07: Excluir Programa inativo sem treinos — permitido
**Dado** um Programa em status "inativo" sem treinos  
**Quando** a pessoa tenta excluí-lo  
**Então** a exclusão segue a confirmação existente da #2

### CA-P2-08: Flag `hasWorkoutWithExercise` — valor real na ação
**Dado** um Programa com treino e exercício  
**Quando** a pessoa tenta ativar  
**Então** a guarda consulta `hasWorkoutWithExercise` no momento da ação (não usa flag fixa)  
**E** o valor `true` libera a ativação

### CA-P2-09: Flag `hasWorkoutWithExercise` — falso bloqueia
**Dado** um Programa sem treino com exercício  
**Quando** a pessoa tenta ativar  
**Então** a guarda consulta `hasWorkoutWithExercise` no momento da ação  
**E** o valor `false` bloqueia a ativação com a mensagem padrão

### CA-P2-10: Falha na consulta do guarda — erro operacional
**Dado** uma falha na consulta de `hasWorkoutWithExercise`  
**Quando** a pessoa tenta ativar  
**Então** o erro é tratado como origem `operacao`  
**E** a ativação não prossegue  
**E** a mensagem de erro é exibida sem retry

---

## 5. Operações com dependências (exclusões, subtítulos, estado inativo)

> Estes cenários dependem de treinos, exercícios e/ou séries já existirem — por isso vêm **após** o fluxo de montagem e ativação.

### CA-36: Programa inativo — somente leitura
**Dado** um Programa com status "inativo"  
**Quando** a pessoa abre o detalhe  
**Então** não existe adicionar, renomear, reordenar nem excluir treinos  
**E** em rascunho e ativo, essas ações estão disponíveis

### CA-37: Excluir treino com exercícios — bloqueado
**Dado** um treino que tem ao menos um exercício associado  
**Quando** a pessoa tenta excluí-lo do detalhe do Programa  
**Então** a exclusão é bloqueada com mensagem visível "Este treino possui exercícios. Remova-os antes de excluir o treino."  
**E** nada é removido

### CA-38: Excluir Programa com treinos — bloqueado (tela de Programas)
**Dado** um Programa com pelo menos um treino  
**Quando** a pessoa tenta excluí-lo na tela de Programas  
**Então** a exclusão é bloqueada com mensagem visível "Este programa possui treinos. Esvazie-o antes de excluir."  
**E** Programa, treinos, exercícios e séries permanecem intactos

### CA-39: Subtítulo do treino — músculos únicos na ordem
**Dado** um treino com exercícios de Peito, Tríceps e Ombros  
**Então** o subtítulo exibe "Peito, Tríceps e Ombros"  
**Dado** que remove o único exercício de Tríceps  
**Então** o subtítulo é atualizado automaticamente para "Peito e Ombros"

### CA-40: Subtítulo do treino — músculo repetido aparece uma vez
**Dado** um treino cujos exercícios repetem o mesmo músculo (ex.: dois exercícios de Peito)  
**Então** o subtítulo menciona o grupo uma única vez

### CA-41: Excluir exercício com séries — confirmação
**Dado** um exercício com séries associadas (preenchidas ou não)  
**Quando** a pessoa o exclui  
**Então** uma confirmação lista o que será perdido  
**E** cancelar mantém tudo

---

## 6. Regras transversais

### CA-42: Modais nunca fecham no erro
**Dado** qualquer modal de formulário (treino, exercício, confirmação)  
**Quando** ocorre erro de validação ou gravação  
**Então** o modal permanece aberto com mensagem visível  
**E** o que foi digitado é preservado

### CA-43: Sucesso — lembrete breve
**Dado** qualquer operação de criação/edição/exclusão bem-sucedida  
**Então** o sucesso é comunicado pelo lembrete breve padrão do módulo (3s)

### CA-44: Títulos com token tipográfico
**Dado** qualquer título de conteúdo (h1/h2/h3 em cards/seções/modais)  
**Então** usa o token `font-display` e a cor do Mílon `#B7602B`

### CA-45: Usabilidade no celular
**Dado** qualquer fluxo da feature  
**Então** alvos de toque acessíveis no arrasto e nos botões  
**E** campos e botões usáveis em tela pequena

### CA-46: Suíte completa verde + coverage ≥ 80%
**Dado** a suíte de testes completa  
**Quando** executada  
**Então** todos os 1116 testes passam (failed = 0)  
**E** coverage ≥ 80% (lines: 85%)  
**E** `test-report.json` regenerado com `summary.failed = 0` e `summary.coverage ≥ 80`

---

## 7. Cenários de fluxo completo de montagem (novos)

> Cenários end-to-end que cobrem o fluxo completo: criar treino → adicionar exercício → adicionar séries → ativar programa.

### CA-FULL-01: Fluxo completo — criar treino, adicionar exercício, adicionar séries, ativar programa
**Dado** um Programa em status "rascunho" sem treinos  
**Quando** a pessoa cria o treino "Treino A"  
**E** adiciona o exercício "Supino Reto" (músculo: Peito) ao treino  
**E** define 3 séries para o exercício  
**E** preenche repetições, carga e descanso nas 3 séries  
**E** clica em "Ativar" no Programa  
**Então** o Programa muda para status "ativo"  
**E** o treino, exercício e séries persistem corretamente  
**E** o subtítulo do treino exibe "Peito"

### CA-FULL-02: Fluxo completo — múltiplos treinos e exercícios antes de ativar
**Dado** um Programa em status "rascunho"  
**Quando** a pessoa cria "Treino A" e adiciona "Supino Reto" (Peito) com 3 séries  
**E** cria "Treino B" e adiciona "Agachamento Livre" (Pernas) com 4 séries  
**E** cria "Treino C" e adiciona "Barra Fixa" (Costas) com 3 séries  
**E** clica em "Ativar"  
**Então** o Programa ativa com os 3 treinos e seus exercícios/séries  
**E** a ordem dos treinos é A, B, C (ordem de criação)

### CA-FULL-03: Fluxo completo — tentar ativar sem séries (apenas exercício)
**Dado** um Programa em status "rascunho" com "Treino A" contendo "Supino Reto" (sem séries)  
**Quando** a pessoa clica em "Ativar"  
**Então** a ativação é liberada (guarda exige apenas treino + exercício, não séries)  
**E** o Programa muda para "ativo"

### CA-FULL-04: Fluxo completo — editar treino/exercício/séries após ativação
**Dado** um Programa "ativo" com "Treino A" → "Supino Reto" → 3 séries preenchidas  
**Quando** a pessoa edita o nome do treino para "Peito e Tríceps"  
**E** adiciona "Tríceps Corda" (Tríceps) com 3 séries  
**E** altera as séries do "Supino Reto" para 4 séries  
**Então** as alterações persistem  
**E** o subtítulo do treino atualiza para "Peito e Tríceps"

### CA-FULL-05: Fluxo completo — reativar programa inativo com conteúdo
**Dado** um Programa "inativo" com "Treino A" → "Supino Reto" → 3 séries  
**Quando** a pessoa clica em "Reativar"  
**Então** o Programa muda para "ativo"  
**E** todo o conteúdo (treinos, exercícios, séries) permanece intacto

---

## Rastreabilidade

| Cenário | Spec §5 | Origem |
|---------|---------|--------|
| CA-01 a CA-15 | 116-143 | Spec §5 |
| CA-16 a CA-22 | 125-128 | Spec §5 |
| CA-23 a CA-33 | 129-136 | Spec §5 |
| CA-34 a CA-35 | 141 | Spec §5 |
| CA-P2-01 a CA-P2-10 | — | Feature #2 (handoff) |
| CA-36 a CA-41 | 116-143 | Spec §5 (movidos para seção 5 — dependências) |
| CA-42 a CA-46 | 142-144 | Spec §5 + normas do módulo |
| CA-FULL-01 a CA-FULL-05 | — | Novos — fluxo completo de montagem |