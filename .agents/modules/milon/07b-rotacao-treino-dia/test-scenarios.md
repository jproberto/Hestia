# Cenários de homologação — 07b Rotação do Treino do Dia por histórico

> Derivados exclusivamente de `spec.md` §5 (critérios de aceite), `tasks.json:acceptanceCriteria` e contratos do `plan.md` §3.
> Cobrem os 14 critérios numerados da spec (1, 2, 3, 4, 5, 6, 7, 8, 13, 14, 9, 10, 11, 12).
> Cada cenário tem versão automatizada (arquivo de teste indicado) e passo manual para homologação humana.
> Foco em comportamento observável; sem detalhes voláteis de UI.

---

### Cenário 1: Próximo após último selado (critério 1)
**Dado** programa ativo com treinos A, B e C em ordem e último selado B
**Quando** a pessoa abre o Treino do Dia
**Então** vê o treino C (vizinho seguinte na ordem atual)
- Automatizado: `__tests__/lib/milon/workout-rotation.test.ts` (D1: B em [A,B,C] → C) + `useTodayWorkout-rotation.test.ts` (exibe C sem aberta) + `contract-07b-rotation.test.ts` (selada mais recente por finished_at)
- Manual: selar B no Treino do Dia → voltar à aba → C exibido

### Cenário 2: Volta ao primeiro após o último (critério 2)
**Dado** último selado C sendo o último da ordem
**Quando** a pessoa abre o Treino do Dia
**Então** vê o treino A (giro contínuo)
- Automatizado: `workout-rotation.test.ts` (C derradeiro → A) + `useTodayWorkout-rotation.test.ts` (volta ao primeiro)
- Manual: selar C → voltar à aba → A exibido

### Cenário 3: Parcial selada conta igual à completa (critério 3)
**Dado** execução parcial selada como último selado (término gravado, séries incompletas)
**Quando** a pessoa abre o Treino do Dia
**Então** o próximo segue a mesma regra da completa, sem diferença
- Automatizado: `workout-rotation.test.ts` (a regra pura opera só sobre o id do último selado) + `contract-07b-rotation.test.ts` (toda selada tem finished_at preenchido)
- Manual: finalizar parcial confirmando a pergunta → voltar à aba → vizinho seguinte exibido

### Cenário 4: Programa ativo sem histórico abre o primeiro (critério 4)
**Dado** programa ativo sem nenhuma execução selada
**Quando** a pessoa abre o Treino do Dia
**Então** vê o primeiro treino da ordem atual, sem erro
- Automatizado: `workout-rotation.test.ts` (nulo → primeiro) + `useTodayWorkout-rotation.test.ts` (consulta aberta e selada, exibe o primeiro)
- Manual: programa ativo novo sem execuções → abrir Treino do Dia → primeiro da ordem exibido

### Cenário 5: Ficha nova não herda histórico (critério 5)
**Dado** programa novo ativado após troca/arquivamento de ficha (ficha antiga com histórico)
**Quando** a pessoa abre o Treino do Dia
**Então** vê o primeiro treino do novo programa
- Automatizado: `workout-rotation.test.ts` (ficha nova → primeiro) + `contract-07b-rotation.test.ts` (ignora programa alheio) + `useTodayWorkout-rotation.test.ts` (consulta aberta/selada do novo programa)
- Manual: ativar programa novo → abrir Treino do Dia → primeiro do novo programa, sem reflexo da ficha antiga

### Cenário 6: Reordenação persiste e vale na próxima abertura (critério 6)
**Dado** detalhe do programa com treinos em ordem
**Quando** a pessoa arrasta os treinos (mesmo gesto dos exercícios) e reabre o Treino do Dia
**Então** a nova ordem persiste e a próxima seleção a respeita
- Automatizado: `WorkoutListReorder.test.tsx` (alças + entrega de orderedIds) + `useProgramWorkouts-reorder.test.ts` (persiste via standalone e recarrega) + `contract-07b-rotation.test.ts` (positions 1..n; rejeita conjunto divergente)
- Manual: no detalhe do programa, arrastar C para o topo → sair e voltar ao Treino do Dia → seleção calculada sobre a ordem nova

### Cenário 7: Programa inativo sem reordenação (critério 7)
**Dado** programa inativo
**Quando** a pessoa abre o detalhe do programa
**Então** a reordenação não é oferecida (somente leitura) e a ordem permanece inalterada
- Automatizado: `WorkoutListReorder.test.tsx` (readOnly oculta todas as alças) + `useProgramWorkouts-reorder.test.ts` (ausência de oferta vive na página/interface)
- Manual: abrir programa inativo → nenhuma alça de arrastar visível; ordem intacta

### Cenário 8: Troca manual para consulta, sem travar o automático (critério 8)
**Dado** abertura automática do próximo sem aberta
**Quando** a pessoa troca manualmente para outro treino do mesmo programa ativo
**Então** a troca vale para consulta, treinos de outro programa não aparecem, e a próxima seleção automática não é travada; marcar série em outro treino com aberta em curso pertence ao item 7c (nada sela nem abre nesta versão)
- Automatizado: `useTodayWorkout-rotation.test.ts` (troca restrita à lista; id fora ignorado)
- Manual: com próximo automático exibido, trocar para outro treino do programa → consulta ok → reabrir a aba → seleção automática inalterada

### Cenário 9: Aberta vence a rotação (critério 13 / D10)
**Dado** execução aberta no programa ativo do dono
**Quando** a pessoa abre o Treino do Dia
**Então** volta ao treino dessa aberta, acima da rotação por selado, com indicação de em execução
- Automatizado: `useTodayWorkout-rotation.test.ts` (aberta acima do selado; aberta fora da lista cai para rotação) + `contract-07b-rotation.test.ts` (aberta por programa; ignora aberta de outro programa)
- Manual: marcar uma série (abre execução) → sair e voltar ao Treino do Dia → mesmo treino com "Em execução", mesmo que a rotação apontasse outro

### Cenário 10: Reordenar com aberta não desvia (critério 14)
**Dado** execução aberta num treino que foi reordenado de posição
**Quando** a pessoa abre o Treino do Dia
**Então** segue na aberta atual; a nova posição vale só para a próxima seleção por selado
- Automatizado: combinação do teste de precedência da aberta (`useTodayWorkout-rotation.test.ts`) + persistência de reorder (`useProgramWorkouts-reorder.test.ts`, `contract-07b-rotation.test.ts`)
- Manual: com execução aberta, reordenar o treino no detalhe do programa → voltar ao Treino do Dia → mesma aberta; selar → próxima abertura usa a ordem nova

### Cenário 11: Excluir treino com exercícios bloqueado (critério 9)
**Dado** treino com exercícios
**Quando** a pessoa tenta excluí-lo
**Então** bloqueio com mensagem visível e nada é removido (ordem inalterada)
- Automatizado: contrato legado `contract-workouts.test.ts` (guarda vigente) + `useProgramWorkouts-reorder.test.ts` (MSG_TREINO_COM_EXERCICIOS → origem bloqueio, regressão)
- Manual: tentar excluir treino com exercícios → mensagem visível → treino permanece

### Cenário 12: Excluir treino com execução bloqueado (critério 10)
**Dado** treino com execução associada (aberta ou selada)
**Quando** a pessoa tenta excluí-lo
**Então** bloqueio com aviso e histórico preservado; ordem inalterada
- Automatizado: `contract-07b-rotation.test.ts` (MSG_TREINO_COM_EXECUCOES com selada e com aberta; sem exercícios nem execuções remove) + `useProgramWorkouts-reorder.test.ts` (origem bloqueio sem recarregar)
- Manual: tentar excluir treino já executado → aviso de histórico preservado → treino e histórico intactos

### Cenário 13: Falhas de carga vs operação/bloqueio (critério 11)
**Dado** falha de carga na seleção do próximo
**Quando** a falha acontece
**Então** mensagem com nova tentativa, e o acionamento recarrega; em falha de operação ou bloqueio, mensagem sem nova tentativa e tela preservada
- Automatizado: `useTodayWorkout-rotation.test.ts` (falha na aberta → origem carga; retry repete a cadeia) + `useProgramWorkouts-reorder.test.ts` (falha de reorder → origem operacao; remoções → bloqueio)
- Manual: simular falha de rede na abertura → "Tentar novamente" recarrega; tentar excluir treino com histórico → aviso sem retry

### Cenário 14: Suite verde + cobertura ≥80% (critério 12)
**Dado** a branch da feature com as 6 tasks completas
**Quando** roda `npm test` e `npm test -- --coverage`
**Então** 1573 testes passam, 0 falhas, coverage global 84.5% lines / 83.72% branch, relatório regenerado antes da revisão
- Evidência: `.agents/modules/milon/07b-rotacao-treino-dia/test-report.json` (números reais das execuções desta sessão)
- Manual: não se aplica (portão automatizado)
