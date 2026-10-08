# Regressão — Módulo Mílon

> Cenários de regressão promovidos a partir das features entregues. Executados a cada nova feature para garantir que nada quebrou.

---

## Feature #1 — Biblioteca de exercícios (baseline)

### REG-01: Listar exercícios
**Dado** a biblioteca com exercícios cadastrados  
**Quando** a pessoa abre a aba Exercícios  
**Então** a lista exibe todos os exercícios ativos ordenados por músculo e nome

### REG-02: Criar exercício
**Dado** o formulário de novo exercício  
**Quando** a pessoa preenche nome, músculo e link de vídeo válidos e salva  
**Então** o exercício é criado e aparece na lista

### REG-03: Anti-duplicata de nome
**Dado** um exercício "Supino reto" já cadastrado  
**Quando** a pessoa tenta criar outro com o mesmo nome (caixa diferente ou espaços extras)  
**Então** o salvamento é bloqueado com mensagem visível

### REG-04: Editar exercício
**Dado** um exercício existente  
**Quando** a pessoa edita nome, músculo ou link e salva  
**Então** a alteração é persistida e refletida na lista

### REG-05: Excluir exercício sem uso — direto
**Dado** um exercício não usado em nenhum treino  
**Quando** a pessoa o exclui  
**Então** a exclusão acontece sem confirmação

### REG-06: Excluir exercício com uso — bloqueado (soft delete)
**Dado** um exercício usado em treinos (feature #3)  
**Quando** a pessoa tenta excluí-lo  
**Então** a exclusão é bloqueada (soft delete protege histórico)  
**E** o exercício permanece visível nos treinos onde é usado

### REG-07: Busca por nome
**Dado** a lista de exercícios  
**Quando** a pessoa digita no campo de busca  
**Então** a lista filtra em tempo real por nome

### REG-08: Filtro por músculo
**Dado** a lista de exercícios  
**Quando** a pessoa seleciona um músculo no filtro  
**Então** a lista mostra apenas exercícios daquele músculo

---

## Feature #2 — Programas (baseline)

### REG-09: Listar Programas
**Dado** a tela de Programas  
**Quando** a pessoa abre  
**Então** a lista exibe todos os Programas do casal com título, dono e status

### REG-10: Criar Programa rascunho
**Dado** o formulário de novo Programa  
**Quando** a pessoa preenche título e salva  
**Então** o Programa é criado com status "rascunho"

### REG-11: Ativar Programa rascunho — bloqueado sem conteúdo (antes da #3)
**Dado** um Programa rascunho sem treinos com exercícios  
**Quando** a pessoa tenta ativar  
**Então** a ativação é bloqueada com mensagem "Adicione pelo menos um treino com exercícios para ativar"

### REG-12: Ativar Programa rascunho — liberado com conteúdo (pós #3)
**Dado** um Programa rascunho com pelo menos um treino com exercício  
**Quando** a pessoa clica em "Ativar"  
**Então** o Programa muda para "ativo"  
**E** o Programa ativo anterior do mesmo dono é desativado

### REG-13: Reativar Programa inativo — liberado com conteúdo
**Dado** um Programa inativo com pelo menos um treino com exercício  
**Quando** a pessoa clica em "Reativar"  
**Então** o Programa muda para "ativo"  
**E** o Programa ativo anterior do mesmo dono é desativado

### REG-14: Excluir Programa rascunho sem treinos — permitido
**Dado** um Programa rascunho sem treinos  
**Quando** a pessoa confirma a exclusão  
**Então** o Programa é removido

### REG-15: Excluir Programa com treinos — bloqueado (pós #3)
**Dado** um Programa (qualquer status) com treinos  
**Quando** a pessoa tenta excluir  
**Então** a exclusão é bloqueada com mensagem "Este programa possui treinos. Esvazie-o antes de excluir."

### REG-16: Detalhe do Programa — cabeçalho + lista de treinos (pós #3)
**Dado** um Programa com treinos  
**Quando** a pessoa abre o detalhe  
**Então** exibe cabeçalho (título, dono, status) + lista de treinos com subtítulos

### REG-17: Navegação — três abas (Treino do Dia + Programas + Exercícios) [atualizado Mílon #4]
**Dado** o módulo Mílon  
**Então** a navegação tem exatamente três abas, nesta ordem: Treino do Dia, Programas, Exercícios  
**E** a raiz `/milon` redireciona para `/milon/today`

---

## Feature #3 — Treinos e séries planejadas (esta feature)

### REG-18: Sugestão de nome de treino — sequência A…Z, AA, AB…
**Dado** Programa vazio → sugestão "Treino A"  
**Dado** 26 treinos A-Z → sugestão "Treino AA"  
**Dado** treinos "Treino A" e "Push" → sugestão "Treino B" (primeira livre)

### REG-19: Nome de treino obrigatório e único (normalizado)
**Dado** nome vazio/espaços → bloqueado "Informe o nome do treino."  
**Dado** nome duplicado normalizado → bloqueado "Já existe um treino com esse nome neste programa."

### REG-20: Programa inativo = somente leitura (treinos)
**Dado** Programa inativo  
**Então** sem adicionar/renomear/excluir treinos

### REG-21: Ordem de treinos = ordem de criação (sem reordenação)
**Dado** vários treinos  
**Então** listados na ordem de criação, sem ação de reordenar

### REG-22: Excluir treino com exercícios — bloqueado
**Dado** treino com exercícios  
**Então** bloqueado "Este treino possui exercícios. Remova-os antes de excluir o treino."

### REG-23: Excluir treino sem exercícios — direto
**Dado** treino sem exercícios  
**Então** exclusão direta sem confirmação

### REG-24: Unicidade de exercício no Treino (D14)
**Dado** exercício já em um treino  
**Quando** tenta adicionar novamente no **mesmo treino**  
**Então** bloqueado "Este exercício já está neste treino. Escolha outro exercício."  
**E** em treino diferente do mesmo Programa → permitido  
**E** em outro Programa → permitido

### REG-25: Editar exercício da biblioteca reflete em todos os Programas
**Dado** exercício usado em múltiplos Programas  
**Quando** editado em um  
**Então** alteração vale para todos

### REG-26: Reordenação de exercícios — drag & drop (Pointer Events)
**Dado** treino com exercícios  
**Quando** arrasta pelo handle  
**Então** nova ordem persiste ao recarregar

### REG-27: Quantidade de séries — obrigatória ≥ 1
**Dado** vazio/zero/não numérico → bloqueado "Informe a quantidade de séries (número inteiro maior ou igual a 1)."  
**Dado** 5 → cria 5 cards vazios

### REG-28: Reduzir séries preenchidas — confirmação
**Dado** séries com dados → reduzir → confirmação listando perdas  
**Dado** séries vazias → reduzir → direto

### REG-29: Aumentar séries — acrescenta ao final
**Dado** 3 séries → altera para 5 → 2 novas vazias no final

### REG-30: Descanso — campo único no exercício
**Dado** exercício com séries  
**Quando** edita descanso → todas as séries refletem o novo valor

### REG-31: Aplicar a todas — re-executável e sobrescreve
**Dado** série origem preenchida  
**Quando** aciona "aplicar a todas" → copia reps/tempo/carga  
**Quando** aciona de novo de outra série → sobrescreve

### REG-32: Unidade de carga — por exercício, primeira digitação
**Dado** exercício sem unidade  
**Quando** digita primeiro peso → escolhe kg/libra  
**Então** nunca mais pergunta para aquele exercício

### REG-33: Carga vazia ≠ 0 (traço vs zero)
**Dado** carga vazia → exibe traço  
**Dado** carga 0 → exibe 0

### REG-34: Valor convertido — secundário menor e cinza
**Dado** carga com unidade  
**Então** valor convertido ao lado, menor e cinza mais claro

### REG-35: Subtítulo do treino — músculos únicos na ordem (D15)
**Dado** Peito, Tríceps, Ombros → "Peito, Tríceps e Ombros"  
**Dado** remove Tríceps → "Peito e Ombros"  
**Dado** dois Peito → "Peito" (único)  
**Dado** sem exercícios → vazio

### REG-36: Guarda de ativação — consulta fresca no momento da ação
**Dado** Programa com treino+exercício → ativação liberada  
**Dado** Programa sem treino+exercício → bloqueada com mensagem padrão  
**Dado** falha na consulta → erro origem `operacao`

### REG-37: Estados de tela — AsyncState centralizado
**Dado** qualquer tela da feature  
**Então** loading/erro/vazio/não-encontrado usam AsyncState  
**Então** erro de carga tem "Tentar novamente", operação/bloqueio sem retry

### REG-38: Modais nunca fecham no erro
**Dado** erro em modal  
**Então** modal aberto, mensagem visível, dado preservado

### REG-39: Sucesso — lembrete breve 3s
**Dado** operação bem-sucedida  
**Então** lembrete padrão do módulo por 3 segundos

### REG-40: Títulos — font-display + cor Mílon
**Dado** h1/h2/h3 em cards/seções/modais  
**Então** `font-display` + `#B7602B`

### REG-41: Usabilidade mobile — alvos de toque
**Dado** qualquer fluxo  
**Então** handle de drag, botões, campos acessíveis ao toque

---

## Feature #4 — Treino do Dia v1 (paridade com manutenção)

### REG-47: Abrir o Mílon cai direto no treino do dia
**Dado** o dono logado com programa ativo contendo treinos  
**Quando** a pessoa abre o Mílon (raiz, refresh ou cartão do dashboard)  
**Então** termina no Treino do Dia vendo o primeiro treino do programa ativo por ordem de criação, com exercícios e séries

### REG-48: Manutenção via Treino do Dia reflete na ficha
**Dado** o Treino do Dia com o treino selecionado  
**Quando** a pessoa edita carga/repetições/descanso ou adiciona exercício  
**Então** o resultado é idêntico ao da página de manutenção do mesmo treino

---

## Execução de regressão

```bash
# Suite completa
npm test

# Com coverage
npm test -- --coverage

# Build Storybook (valida componentes)
npm run build-storybook
```

### REG-42: Navegação pós-criar treino — redireciona para detalhamento
**Dado** Programa rascunho/ativo  
**Quando** cria treino  
**Então** redireciona para /milon/programs/[id]/workouts/[workoutId]

### REG-43: Botão voltar do treino para o Programa
**Dado** página de detalhamento do treino  
**Quando** clica "Voltar ao programa"  
**Então** navega para /milon/programs/[id]

### REG-44: Lista de exercícios — busca, filtro, scroll, "Cadastrar novo" sticky
**Dado** modal adicionar exercício com muitos itens  
**Quando** busca/filtra  
**Então** filtra em tempo real, scroll virtual, botão "Cadastrar novo" sempre visível

### REG-45: Drag & drop — ghost card, placeholder, animação suave
**Dado** treino com exercícios  
**Quando** arrasta pelo handle  
**Então** ghost card com opacidade, placeholder de drop, animação suave, mobile+desktop

### REG-46: Card de séries compacto — grid 4 col, reps/tempo único, toggle unidade
**Dado** exercício com séries  
**Então** grid responsivo (1/2/4 col), campo único reps/tempo com toggle, toggle kg/lb abaixo da carga

**Critério de passagem:** 1168 testes passados, 0 falhas, coverage ≥ 80% (atual: 84.35% lines).