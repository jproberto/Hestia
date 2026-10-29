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

### REG-21: Ordem de treinos = ordem própria com reordenação (atualizado Mílon #7b)
**Dado** vários treinos
**Então** listados na ordem própria do programa (posição; criação define a inicial)
**E** arrastar pelo handle no detalhe do programa reordena e persiste

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

### REG-32: Unidade de carga — por exercício no treino (entry), primeira digitação (0012 correta)
**Dado** entry sem unidade
**Quando** digita primeiro peso → escolhe kg/libra
**Então** persiste na entry; a unidade legada da biblioteca é só lida e ignorada no treino

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

### REG-47: Abrir o Mílon cai no treino da rotação (atualizado Mílon #7b)
**Dado** o dono logado com programa ativo contendo treinos
**Quando** a pessoa abre o Mílon (raiz, refresh ou cartão do dashboard)
**Então** termina no Treino do Dia vendo o treino seguinte ao último selado na ordem atual (volta ao primeiro após o último); sem histórico, o primeiro; com execução aberta, o treino da aberta

### REG-48: Manutenção via Treino do Dia reflete na ficha
**Dado** o Treino do Dia com o treino selecionado  
**Quando** a pessoa edita carga/repetições/descanso ou adiciona exercício  
**Então** o resultado é idêntico ao da página de manutenção do mesmo treino

---

## Feature #5 — Execução série a série

### REG-49: Marcar série no Treino do Dia
**Dado** o Treino do Dia com treino e séries
**Quando** a pessoa dá toque curto no card de uma série
**Então** a série fica marcada na hora, sem confirmação, com fundo na cor do módulo

### REG-50: Executar série com paridade da manutenção (0012 correta: campo único pelo modo da entry)
**Dado** o Treino do Dia com treino e séries
**Quando** a pessoa marca/desmarca pelo card (mesma cara da manutenção: rótulo pelo modo da entry, unidade da entry e conversão) e edita pelo toque longo (campo único rotulado pelo modo da entry, unidade ao lado de Carga como texto, replicando sempre para a série e as seguintes)
**Então** quantidade, descanso, editar, excluir e reordenar seguem disponíveis como na manutenção, e o início zera somente com confirmação
**E** modo e unidade são ajustados nos seletores do exercício no treino (entry), nunca na biblioteca

### REG-51: Badge, bloqueio, aviso e cancelamento da execução (mini-plano: aviso visível)
**Dado** o Treino do Dia com treino e séries
**Quando** a pessoa marca a primeira série
**Então** o início registra, o display segue o template ao vivo com marcadores, o nome mostra "Em execução" e a manutenção do treino bloqueia com aviso visível de que não pode ser editado pois está em execução
**E** ao desmarcar tudo, confirmar "Todas as séries foram desmarcada. Deseja cancelar a execução desse treino?" desbloqueia e limpa o início

### REG-52: Valor único nas séries (migração 0013) — coluna `value` substitui `reps`/`duration_seconds`
**Dado** série planejada ou realizada
**Então** uma só coluna `value` (inteiro ou nulo); significado vem do modo da entry; troca de modo não muda o número

### REG-53: Unidade abreviada no banco (migração 0014) — `kg`/`lb` sem transformação
**Dado** banco com `load_unit` em `exercises` e `workout_entries`
**Então** restrição `CHECK (load_unit IN ('kg','lb'))` nas duas tabelas; dados legados `libra` convertidos para `lb`; interface exibe valor direto sem função de abreviação; conversão secundária com fator exato 0.45359237

### REG-54: Ícones Editar/Excluir no card da entry (padrão biblioteca)
**Dado** card da entry em manutenção
**Então** botões são ícones `Pencil`/`Trash2` (h-3.5 w-3.5, lucide-react) com mesmas classes, rótulos acessíveis, títulos e área de toque da biblioteca; handlers inalterados

### REG-55: Texto de cancelamento da execução atualizado
**Dado** variante `limpar-execucao` do `WorkoutConfirmModal`
**Então** exibe exatamente "Todas as séries foram desmarcada. Deseja cancelar a execução desse treino?"

### REG-56: Substituições validadas (busca zerada em código vivo)
- `onChooseUnit` / `chooseEditorUnit` => 0 ocorrências
- alternância de modo (`alternar para`) => 0 ocorrências em SeriesEditModal/SeriesCard
- `reps` / `durationSeconds` / `duration_seconds` => 0 ocorrências em lib/milon/** e components/milon/** (exceto testes de migração 0009/0011/0012)
- `libra` => 0 ocorrências em lib/milon/** e components/milon/** (exceto testes de migração 0009/0012/0014 e comentários de conversão)
- `abreviarUnidadeCarga` => 0 ocorrências em todo o repo
- `>Editar<` / `>Excluir<` (botões de texto) => 0 ocorrências em ExerciseEntryCard.tsx
- `confirmLoadUnit` / `setExerciseLoadUnitStandalone` no caminho do treino => 0 ocorrências
- arquivo antigo `migration-0012-milon-exercise-mode.sql` => ausente

---

## Feature #7 — Encerrar treino com confirmação

### REG-57: Finalizar treino completo direto + parcial com confirmação
**Dado** o Treino do Dia com execução aberta
**Quando** a pessoa finaliza com todas as séries marcadas (sela direto) ou confirma a pergunta de parcial/vazio
**Então** a execução some da aberta, o badge apaga e a manutenção volta a ficar livre, sem navegar para fora

### REG-60: Quatro casos de confirmação da #7 — textos exatos inalterados (promovido 7b-1)
**Dado** o Treino do Dia com execução aberta (parcial, completa e vazio de marcadas; mais o Cancelar)
**Quando** a pessoa aciona `Finalizar` parcial e confirma, `Finalizar` completo direto, `Finalizar` completando a última pendente e confirma, ou `Cancelar` e confirma
**Então** cada caso exibe o texto exato congelado da #7, os três caminhos de `Finalizar` selam com término e o `Cancelar` exclui a aberta com cascata — nenhum texto novo da #7b-1 participa

### REG-61: Vazio de borda — aberta com zero marcadas conduz ao cancelamento (promovido 7b-1)
**Dado** execução aberta com nenhuma série marcada
**Quando** a pessoa aciona `Finalizar` e confirma a condução ao cancelamento
**Então** nada é selado (sem término gravado, sem histórico novo), a execução é excluída e a tela permanece no mesmo treino

### REG-62: Imutabilidade pós-selo — selada não volta a ser aberta (promovido 7b-1)
**Dado** treino recém-finalizado (execução selada com término)
**Quando** a pessoa reabre o Treino do Dia ou tenta selar de novo
**Então** a selada não conta como aberta (busca de aberta volta vazia, badge apagado), o duplo selamento vira erro de operação sem selo duplicado e o treino seguinte monta limpo, sem marcações herdadas

---

## Feature #7b — Rotação do Treino do Dia por histórico

### REG-58: Rotação avança após selar
**Dado** o Treino do Dia exibindo o próximo da rotação
**Quando** a pessoa sela o treino e volta à aba
**Então** o treino seguinte da ordem aparece (com volta ao primeiro)

### REG-63: Prioridade da execução aberta vence a rotação (promovido 7b-1)
**Dado** execução aberta em um treino do programa ativo, com histórico de selados no programa
**Quando** a pessoa abre ou recalcula o Treino do Dia
**Então** o treino da aberta é exibido, vencendo o próximo pelo último selado

### REG-64: Giro com volta ao primeiro (promovido 7b-1)
**Dado** programa com treinos em ordem própria e o último selado sendo o derradeiro (sem aberta)
**Quando** a seleção é recalculada (abertura, nova tentativa ou avanço pós-selo)
**Então** o exibido é o primeiro da ordem; com o último selado no meio da ordem, o vizinho seguinte

### REG-65: Troca manual entre treinos do programa ativo (promovido 7b-1)
**Dado** o Treino do Dia com dois ou mais treinos no programa ativo
**Quando** a pessoa troca de treino pelo seletor para consulta
**Então** a troca acontece livre entre treinos do programa ativo, sem reescrever histórico e sem travar a próxima seleção automática

---

## Feature #07c — Troca com execução ativa (2026-10-15 — suite 1618/1618, cov 84.59% lines / 83.49% branch)

### REG-59: Escrita bloqueada no outro treino com tooltip, libera após Finalizar/Cancelar (liberação de escrita após settle — repassado/verificado na 7b-1)
**Dado** execução aberta no Treino A (badge "Em execução") com Treino B no mesmo programa ativo
**Quando** a pessoa troca para o Treino B e tenta marcar/editar série
**Então** a escrita é bloqueada com tooltip "Finalize o Treino A para marcar séries aqui"
**E** após Finalizar ou Cancelar no Treino A, o Treino B aceita escrita sem reload

### REG-66: Guarda por dono — no máximo uma aberta por dono global, sem desvio cruzado (promovido 7b-1)
**Dado** um dono com execução aberta em um treino (e o outro dono com a própria aberta em treino distinto)
**Quando** se tenta abrir uma segunda execução do mesmo dono em outro treino
**Então** a segunda abertura é recusada (índice único parcial por autor — R1) e cada dono enxerga apenas a própria aberta, avançando na própria rotação

---

## Feature #7b-1 — Avançar para o próximo treino ao finalizar (2026-10-16 — suite 1636/1636, cov 84.74% lines / 83.63% branch)

### REG-67: Smoke — Finalizar exibe o próximo; Cancelar permanece no mesmo treino
**Dado** o Treino do Dia com execução aberta no treino corrente (programa com dois ou mais treinos)
**Quando** a pessoa confirma o `Finalizar` (e, em nova execução, confirma o `Cancelar`)
**Então** após o Finalizar a tela passa a exibir o próximo da rotação sem reload do navegador e sem marcações herdadas; após o Cancelar a tela permanece no mesmo treino, sem execução aberta e sem séries marcadas

---

## Feature #06 — Timer de descanso auto + PWA push (2026-10-18 — suite 1826/1826 pós-fix B1/B2, cov 85.16% lines / 84.08% branch)

> Integração por composição: a feature adiciona painel/hint/push sobre a marcação da #5, o desfecho da 7b-1 e a guarda da 7c, sem alterar as máquinas existentes. `toggleSeries` devolve `marked`/`unmarked` (adição em runtime); a seção ganha `onSeriesMarked`/`onExecutionCleared`; a página liga os eventos ao `useRestTimer`. Os testes de regressão das features 05, 07, 7b, 7b-1 e 7c estão verdes nesta entrega (suite completa; spot checks no `test-report.json`).

### REG-68: Smoke — Marcar série inicia o descanso; Finalizar/Cancelar encerram sem aviso residual
**Dado** o Treino do Dia com exercício de descanso preenchido e série desmarcada
**Quando** a pessoa marca a série e, com a contagem rodando, finaliza (ou cancela) o treino com sucesso
**Então** o painel de descanso inicia automaticamente com o `restSeconds` da entry e, após o Finalizar/Cancelar, o painel some e nenhum aviso de fim de descanso chega depois (push cancelado no servidor)

### Cenários que a homologação deve re-checar (integração composição — verdes na suite, re-cheque manual recomendado)

- **#5 — toggle/marcação/pergunta da última série (agora com retorno `marked`/`unmarked`):** REG-49 (marcar série), REG-51 (badge/bloqueio/aviso e cancelamento ao desmarcar tudo com a pergunta exata), REG-55 (texto de cancelamento) — a pergunta da última desmarcada continua sem desfecho 7b-1 e ganhou o canal próprio `onExecutionCleared` (encerra timer e push); ao fechar a pergunta sem confirmar, timer e push seguem.
- **#7 — quatro confirmações:** REG-57 (completo direto + parcial) e REG-60 (quatro textos exatos) — inalterados; finalizar qualquer caso emite o desfecho 7b-1 que a página usa para cancelar o timer como primeiro efeito; REG-61 (vazio conduzido ao cancelamento) emite `cancelled` e também cancela timer/push.
- **7b/7b-1 — rotação, desfecho `sealed`/`cancelled` e foco:** REG-58/REG-63/REG-64 (rotação) e REG-67 (smoke avanço/permanência com foco) — `onExecutionSettled` intacto; a página só acrescenta `restTimer.cancel()` antes das recargas já existentes; a troca de treino para consulta (REG-65) NÃO cancela timer nem push (emenda da spec).
- **7c — guarda por dono e liberação de escrita:** REG-59 (escrita bloqueada com tooltip e liberação após settle) e REG-66 (uma aberta por dono) — pré-cheque 7c intacto; o parceiro espectador que consulta o treino do outro nunca dispara o gatilho e nunca recebe o push do descanso (homologação em iPhone real nos cenários de dispositivo do `test-scenarios.md`).

---

## Feature #06 — Emenda 2026-10-23 (fix-01-server — timing do push; suite 1854/1854, cov 85.33% lines / 84.14% branch)

> A emenda (Alavancas 1–3: `elapsed` ancorado ao clique, resposta 202 + envio em background, cancel-all por dono no INSERT) é aditiva à #06: só toca o cliente de push, o hook do timer, o repositório de push e a rota. Integração com as demais features permanece por composição, sem mudança de camadas. Os testes de regressão das features 01–07b-1 estão verdes nesta entrega (suite completa; spot checks no `test-report.json`).

### REG-69: Agendamento único por dono no servidor (cancel-all no INSERT)
**Dado** o dono com qualquer agendamento de push ainda ativo no servidor (inclusive os órfãos de reload, de aba dupla ou de cancelamento perdido)
**Quando** uma nova marcação de série com descanso agenda o push
**Então** no máximo um agendamento permanece ativo por dono: o novo agendamento é o único `agendado`, os anteriores do mesmo dono são cancelados no servidor e nenhum push deles chega ao fim do descanso antigo — o parceiro e os agendamentos de outro dono não são afetados

### REG-70: `elapsed` no corpo do agendamento e compatibilidade do cliente antigo
**Dado** uma marcação de série com descanso (clique que inicia o timer)
**Quando** o agendamento é enviado ao servidor
**Então** o tempo decorrido desde o clique viaja no corpo (`elapsed`, inteiro ≥ 0) e o push mira o zero do contador visual (viés ±1–2s); um cliente antigo que envie o corpo **sem** o campo continua funcionando (fallback para o comportamento antigo: duração contada a partir do servidor, sem erro), e o cancelamento explícito nunca carrega o campo

### REG-71: Resposta de agendamento imediata e cancelamento sem fila
**Dado** o agendamento de um push em andamento (o servidor já respondeu e o envio espera em background)
**Quando** a pessoa finaliza, cancela a execução ou substitui o descanso com nova marcação
**Então** o cancelamento é processado de imediato no servidor (sem esperar agendamento algum pendurado) e nenhum push órfão é entregue — a troca de treino para consulta continua não cancelando (REG-68 e cenário 16 intactos)

### Cenários que a homologação deve re-checar (emenda — verdes na suite, re-cheque manual em iPhone real obrigatório para o timing)

- **Janela ±1–2s do zero do contador:** cenário E1 do `test-scenarios.md` (push com aba em primeiro plano alinhado ao zero visual).
- **Cancel-all e órfãos:** cenários E2 (reload no meio) e E3 (duas abas) — nenhum push do agendamento antigo.
- **Latência de rede:** cenário E4 — `elapsed` compensa o atraso do POST; push no lugar certo.
- **Decisão 7 (janela do servidor):** cenário E5 — descanso >280s segue o comportamento acordado, sem duplicata.
- **Entrega iPhone:** cenário E6 (re-execução dos cenários 3–6 com o novo agendamento) e E6b (cancelamento efetivo sem órfão, contraste com troca para consulta).

---

## Feature #06 — Emenda 2 (2026-10-29 — supressão da notificação com aba ativa + graça 800 ms; suite 1871/1871, cov 85.35% lines / 84.20% branch)

> A Emenda 2 (DA21–DA24: cancel no zero por visibilidade no cliente, janela de graça `JANELA_GRACA_ENVIO_MS = 800` no servidor, decisão exclusiva do tick de zero) é aditiva à #06: só toca `useRestTimer.ts` (branch do tick de zero) e `route.ts` (constante + um `dormir` entre espera e re-leitura). Todas as demais camadas permanecem intocadas — os testes de regressão das features 01–07b-1 e da Emenda 1 estão verdes nesta entrega (suite completa; spot checks no `test-report.json`).

### REG-72: Sem notificação criada com aba visível no zero (supressão mantendo o alerta)
**Dado** o Treino do Dia com descanso rodando e a aba do treino **visível** no instante do zero
**Quando** a contagem chega a zero
**Então** nenhum push do fim de descanso é entregue (nem no instante, nem represado ao trocar de aba depois): o agendamento é cancelado no servidor no tick de zero e **nenhuma notificação do sistema é criada**; o alerta visual `Descanso de <exercício> terminou.` permanece em tela até `Fechar` — a semântica é "cancela mantendo o alerta", diferente do `cancel()` de finalizar/cancelar que zera a UI

### REG-73: Re-leitura do servidor só após `fire_at` + graça de 800 ms
**Dado** um agendamento `agendado` cujo instante de disparo (`fire_at`) chegou, com a aba oculta no zero (nenhum cancel)
**Quando** o background do servidor completa a espera
**Então** o servidor espera **mais** a janela de graça de 800 ms antes de reler o status e enviar — com a aba oculta a notificação chega em zero + graça + FCM (tipicamente +1–2s, pior ~+2,5s); se o status relído pós-graça não for mais `agendado` (cancel chegado), termina sem enviar e sem graça adicional; descansos maiores que 280s seguem cap + graça (decisão 7 intacta)

### Cenários que a homologação deve re-checar (Emenda 2 — verdes na suite, re-cheque manual em iPhone real obrigatório para a visibilidade no zero)

- **Aba visível no zero:** cenário A1 do `test-scenarios.md` — nenhuma notificação, alerta visual permanece; trocar de aba depois não revela notificação represada.
- **Aba oculta no zero:** cenário A2 — entrega em zero + graça + FCM (reexecução dos cenários 2/3/4/5 originais com este build).
- **iPhone com tela apagada:** cenário A3 — requisito original preservado (sem tick → sem cancel → servidor envia; reexecução das seções 3–6 originais).
- **Tela ligada e app visível:** cenário A4 — só camada visual, aparelho silencioso.
- **Cancel falhado/corrida perdida:** cenário A5 — notificação extra rara **aceita**; sem falha visível.
- **Reload/fechar antes do zero:** cenário A6 — decisão 6 preservada: o push dispara no horário (zero + graça + FCM).
- **Re-homologação da Emenda 1:** cenário A7 — E1–E6b re-executados com a regra nova (E1 visível no zero → sem notificação; E1 oculto → janela ±1–2s).

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

### REG-46: Card de séries compacto — grid 4 col, valor único pelo modo da entry, toggle unidade na entry
**Dado** exercício com séries
**Então** grid responsivo (1/2/4 col), campo único com rótulo pelo modo da entry, toggle kg/lb abaixo da carga persistindo na entry

**Critério de passagem:** testes passados, 0 falhas, coverage ≥ 80% (atual: 1871 testes, 85.35% lines, 84.20% branch — 06-timer-descanso-pwa com a Emenda 2 re-executada em 2026-10-29; referência Emenda 1 em 2026-10-23: 1854 testes, 85.33% lines, 84.14% branch; referência 06-base em 2026-10-18 pós-fix B1/B2: 1831 testes, 85.31% lines, 84.10% branch; referência 7b-1 em 2026-10-16: 1636 testes, 84.74% lines, 83.63% branch).