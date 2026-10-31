# Cenários de Teste — Mílon #7 Encerrar treino com confirmação

> Gerado em 2026-10-13 pós-suite verde (1519 testes, 0 falhas, coverage 85.12% lines / 84.1% branch).
> Revisado em 2026-10-13 pós-homologação humana: Cenário 8 reescrito para a realidade (botão oculto com zero marcadas); antigo Cenário 10 removido (não replicável manualmente).
> Fonte da verdade: `spec.md` §2/§3/§5 (critérios 1–12) + `plan.md` §3/§4 + `tasks.json` TASK-001..006. Sem leitura de cenários de Atena (Atena não gera cenários — evita viés).
> Cobertura: critérios 1–9, 11–12 em cenários manuais + automatizados; critério 10 só automatizado (contrato `contract-workout-executions.test.ts` + cadeia `db/executions.test.ts` — sem cenário manual por decisão de homologação 2026-10-13, não replicável manualmente). Automatizado = travado em `__tests__`; Manual = homologação humana no Treino do Dia.

---

### Cenário 1: Posições dos botões — Cancelar no topo, Finalizar no rodapé (critério 1)
**Dado** o Treino do Dia com execução aberta
**Quando** a pessoa visualiza a página
**Então** o botão Cancelar aparece no topo e o botão Finalizar aparece no final, abaixo do último Adicionar Exercício
**E** nenhum dos dois aparece na manutenção em Programas nem quando não há execução aberta (automatizado: `WorkoutDetailSection.test.tsx` + `today/page.test.tsx`; manual: abrir Treino do Dia com/sem execução e abrir manutenção)

### Cenário 2: Texto exato da pergunta de Cancelar (critério 2)
**Dado** execução aberta no Treino do Dia
**Quando** a pessoa aciona Cancelar
**Então** a pergunta exibida é exatamente "Tem certeza que deseja cancelar essa execução? Todas as informações serão excluídas." (automatizado: `WorkoutConfirmModal.test.tsx` variante `cancelar-execucao` + `workout-utils.test.ts` constante; manual: ler o corpo do modal)

### Cenário 3: Confirmar Cancelar exclui e desbloqueia; desistir mantém tudo (critério 3)
**Dado** a pergunta de Cancelar aberta
**Quando** a pessoa confirma
**Então** os registros daquela execução são excluídos, o template é desbloqueado, o momento de início fica limpo e nenhuma série segue marcada
**Quando** a pessoa desiste
**Então** a execução segue aberta, o template continua bloqueado e o início segue registrado (automatizado: hook `confirmCancelExecution`/`cancelCancelExecution` + contract `clearExecution`; manual: confirmar e checar badge apagado + manutenção livre; desistir e checar badge + bloqueio intactos)

### Cenário 4: Texto exato da pergunta de Finalizar parcial (critério 4)
**Dado** o Treino do Dia com pelo menos uma série feita e pelo menos uma não executada
**Quando** a pessoa aciona Finalizar
**Então** a pergunta exibida é exatamente "Ainda existem séries não executadas. Tem certeza que deseja finalizar o treino?" (automatizado: decisor `parcial` + variante `finalizar-parcial`; manual: marcar 1 de N e acionar Finalizar)

### Cenário 5: Confirmar parcial sela com término e imutável; desistir mantém aberta (critério 5)
**Dado** a pergunta de Finalizar parcial aberta
**Quando** a pessoa confirma
**Então** a execução é selada com momento de término registrado e fica imutável
**Quando** a pessoa desiste
**Então** a execução segue aberta sem nada selado (automatizado: `confirmFinish` + contract `finishExecution`; manual: confirmar e checar botões/badge sumidos; desistir e checar execução ainda aberta)

### Cenário 6: Finalizar completo sela direto sem confirmação (critério 6)
**Dado** o Treino do Dia com todas as séries marcadas
**Quando** a pessoa aciona Finalizar
**Então** o selamento acontece direto sem confirmação, com momento de término registrado (automatizado: `requestFinish` caso `completo` sela direto; manual: marcar todas e acionar Finalizar — sem modal, execução some)

### Cenário 7: Última pendente marcada pelo card pergunta se deseja finalizar (critério 7)
**Dado** o Treino do Dia com uma série pendente restante
**Quando** a pessoa marca essa última série pelo card e todas ficam marcadas
**Então** a pergunta exibida é exatamente "Você executou todas as séries, deseja finalizar o treino?"
**E** confirmar sela com término registrado; desistir mantém aberta com todas marcadas (automatizado: gatilho do Caso 4 no toggle + variante `finalizar-completa`; manual: marcar a última pelo card e observar a pergunta)

### Cenário 8: Vazio com zero feitas — Finalizar oculto; variante vazio só no caminho de borda (critério 8)
**Dado** o Treino do Dia com zero séries feitas e sem execução aberta (caso normal: nada marcado ainda)
**Quando** a pessoa visualiza a página
**Então** o botão Finalizar nem é exibido — melhor que o bloqueio previsto na spec, pois sem execução aberta não há ação possível de selamento (`WorkoutDetailSection` só renderiza o `footer` com `execExecution !== null`, e a execução só abre ao marcar a primeira série)
**E** a variante `finalizar-vazio` ("O treino não pode ser finalizado pois nenhuma série foi feita. Em vez disso, deseja cancelar e excluir a execução desse treino?") segue alcançável só pelo caminho de borda: marcar 1 → desmarcar a última pelo card → desistir da pergunta de limpeza (execução aberta com zero marcadas) → acionar Finalizar → abre a pergunta de vazio via `requestFinish` (decisor `vazio`), e confirmar executa a exclusão sem criar registro selado vazio (cobertura automatizada: decisor `vazio` em `workout-utils.test.ts` + `requestFinish` vazio em `useWorkoutExecution.test.ts` + variante `finalizar-vazio` em `WorkoutConfirmModal.test.tsx`; manual de borda opcional pelo caminho acima)

### Cenário 9: Pós-selo — imutável, template livre, permanece no Treino do Dia com próximo treino (critério 9)
**Dada** uma execução selada
**Então** ela não reabre, não edita e não exclui feito; o template volta a ficar livre na manutenção sem aviso de bloqueio; a pessoa permanece no Treino do Dia com o próximo treino exibido segundo a regra vigente de seleção (programa ativo do dono + primeiro por criação; sem rotação por histórico nesta feature) (automatizado: contract filtra selada + matriz de bloqueio verde; manual: selar e checar manutenção editável + mesma URL `/milon/today`)

### Cenário 10: Erros — carga com retry, operação/bloqueio sem retry, modal nunca fecha no erro (critério 11)
**Dada** falha de carga nas ações de selar ou cancelar
**Então** a pessoa vê mensagem com nova tentativa (AsyncState/banner com "Tentar novamente")
**Dada** falha de operação ou bloqueio
**Então** a mensagem aparece sem nova tentativa e o modal não fecha no erro, preservando marcações (automatizado: hook com `errorOrigin` carga/operacao + modais com processing; manual: simular falha e checar modal aberto + mensagem visível)

### Cenário 11: Suite verde sem quebra + coverage + Storybook (critério 12, automatizado)
**Dado** o repositório após TASK-005
**Quando** executo `npm test`, `npm test -- --coverage` e `npm run build-storybook`
**Então** 0 falhas em 1519 testes (116 arquivos), lines 85.12% e branch 84.1% (≥80%) e Storybook com exit 0, com `test-report.json` regenerado antes da revisão (evidência: este relatório + saída dos comandos; re-executado em 2026-10-13 pós-ajustes homologação cenários 8/10)

---

## Edge cases (spec § Edge Case)

### Cenário 12: Sem execução aberta — botões ausentes
**Dado** treino sem execução aberta
**Quando** a pessoa abre o Treino do Dia
**Então** Cancelar e Finalizar não aparecem e nada há para selar ou excluir

### Cenário 13: Treino sem exercícios — Finalizar oculto (vale o vazio do Cenário 8)
**Dado** treino sem exercícios (sem séries para marcar)
**Quando** a pessoa abre o Treino do Dia
**Então** o botão Finalizar também não aparece (sem execução aberta, mesma regra do Cenário 8); o caso vazio segue travado em teste automatizado do decisor; adicionar exercício segue a regra da manutenção

### Cenário 14: Confirmar selamento duas vezes seguidas — sem selo duplicado
**Dado** execução já selada
**Quando** a pessoa confirma o selamento de novo
**Então** não cria selo duplicado; vira mensagem de operação sem nova tentativa (automatizado: duplo `finishExecution` + flag `processing` bloqueia duplo clique)

### Cenário 15: Cancelar duas vezes seguidas — nada exclui
**Dado** nenhuma execução aberta (já cancelada)
**Quando** a pessoa tenta cancelar de novo
**Então** nada é excluído e a tela segue íntegra

### Cenário 16: Falha de rede ao selar ou cancelar — modal preserva
**Dado** modal de Finalizar ou Cancelar aberto
**Quando** a rede falha na gravação
**Então** mensagem visível de operação sem nova tentativa no banner, modal não fecha, marcações preservadas

### Cenário 17: Falha de carga ao abrir o Treino do Dia — sem botão até carregar
**Dado** falha ao carregar o Treino do Dia
**Então** mensagem com nova tentativa pelo estado assíncrono central, sem botão de selar até carregar

### Cenário 18: Dois usuários no mesmo treino — última gravação prevalece
**Dado** dois usuários no mesmo treino ao mesmo tempo
**Então** sem trava, vale a última gravação; no máximo uma aberta por treino pelo índice parcial e segunda abertura retorna a existente

### Cenário 19: Template na manutenção durante execução aberta — bloqueado
**Dado** execução aberta
**Quando** a pessoa abre a manutenção do mesmo treino
**Então** edição bloqueada com aviso visível de que o treino não pode ser editado pois está em execução; somente o Treino do Dia escreve

### Cenário 20: Treino de programa inativo — somente leitura
**Dado** treino de programa inativo
**Então** somente leitura, sem Cancelar nem Finalizar (mesma regra das features 02–04)

### Cenário 21: Desmarcar última marcada por engano — regra da feature 05 intacta
**Dado** execução aberta com uma série marcada
**Quando** a pessoa desmarca essa última por engano
**Então** vale a pergunta "Todas as séries foram desmarcada. Deseja cancelar a execução desse treino?", sem mudança nesta feature

### Cenário 22: Rollback de selamento com erro após gravar término — sem reabrir
**Dado** erro após gravar o término
**Então** sem reabrir nem editar; erro vira mensagem de operação e o estado recarregado reflete o banco

---

## Cenários repassados a dependências futuras (sem pendência oculta)

| ID | Dependência | Cenário repassado |
|---|---|---|
| FUT-01 | Feature 09 (histórico/resumo) | Lista de treinos realizados, resumo por treino com duração e volume — não executável aqui; selada apenas arquiva com término para métricas futuras |
| FUT-02 | Feature 06 (timer) | Timer de descanso automático e notificação de fim — não executável aqui |
| FUT-03 | Feature 08 (responsivo) | Ajuste responsivo dedicado — não executável aqui; uso em tela pequena segue exigência das features 03–05 |
| FUT-04 | Item 7b (rotação por histórico) | Próximo treino por histórico — não executável aqui; pós-selamento exibe o próximo pela regra vigente (programa ativo do dono + primeiro por criação) |
| FUT-05 | YAGNI confirmado | Reabrir/editar após selar, duplicar/mover/reordenar treinos, substituição na hora, aquecimento/extra, esforço, falha, observações, permissões, integrações, import/export — fora de escopo, sem cenário aqui |

---

## Travas das features 04/05 verificadas (sem regressão)

- Badge "Em execução" acende com aberta e apaga pós-selo/cancelamento (REG-51).
- Bloqueio do template na manutenção com aviso visível durante aberta; livre pós-selo (REG-51, BLOCK-01/02).
- Replicação, unidade herdada da entry e valor único por modo da entry intactos (REG-50/52/53).
- Seleção do Treino do Dia inalterada: programa ativo do dono + primeiro por criação (REG-47).
