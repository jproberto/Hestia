# Cenários de homologação — 07b-1 Avançar para o próximo treino ao finalizar

> Derivados exclusivamente de `spec.md` (§5 critérios 1–9, §2 estados de tela e foco, §3 efeitos do Finalizar/Cancelar) + contratos do `plan.md` §3. Sem cenários de Atena (não gerada por ela, sem viés).
> Cobrem os critérios 1 a 9 da spec §5: critérios 1 a 8 com ≥1 cenário automatizado, mais o cenário manual correspondente quando não exercitável em jsdom; critério 9 é 100% automatizado.
> Marcadores: **[Automatizado]** (arquivo + caso real em disco) ou **[Manual]** (homologação humana — dispositivo/navegador real, teclado ou leitor de tela).
> Textos das features anteriores (07/7b/7c) citados entre aspas exatas quando relevantes — sem paráfrase nova (nenhum texto foi criado nesta feature).
> Gerado em 2026-10-16 pós-suite verde: 1636 testes / 127 arquivos / 0 falhas, coverage 84.74% lines e 83.63% branch, Storybook exit 0 (ver `test-report.json`).

**Pré-requisito comum (cenários manuais):** programa ativo do dono com ao menos dois treinos com séries (ex.: **Treino A**, **Treino B**, **Treino C**), logado como dono, na aba Treino do Dia (`/milon/today`).

---

## Critério 1 — Finalizar com sucesso exibe o próximo da rotação

### Cenário 1: Finalizar completo direto avança a exibição (critério 1) [Automatizado]
**Dado** Treino do Dia com execução aberta no treino corrente e todas as séries marcadas
**Quando** a pessoa aciona `Finalizar` (selamento direto pelo botão do rodapé)
**Então** a seção emite o desfecho `sealed` exatamente uma vez e a página invalida a fonte única antes de recarregar a seleção, exibindo o próximo treino e incrementando o sinal de foco do cabeçalho
**Automatizado:** `__tests__/components/milon/WorkoutDetailSection.test.tsx` → "Finalizar completo direto (requestFinish no caso completo) emite onExecutionSettled com desfecho 'sealed'"; `__tests__/app/milon/today/page-7b1-advance.test.tsx` → "desfecho sealed: invalida a fonte única AGUARDA e então recarrega a seleção, e incrementa o focusHeaderSignal"

### Cenário 2: Avanço real no dispositivo (critério 1) [Manual]
**Dado** celular na academia com programa ativo de três treinos e o Treino B exibido com execução aberta
**Quando** a pessoa finaliza (completo direto ou confirmado) com sucesso
**Então** a tela passa a exibir o Treino C da ordem vigente, sem recarregar o navegador, sem marcações herdadas do treino anterior e sem navegar para fora do Treino do Dia; o foco vai ao cabeçalho do treino exibido

---

## Critério 2 — Vizinho seguinte e volta ao primeiro

### Cenário 3: Último selado no meio da ordem → vizinho seguinte (critério 2) [Automatizado]
**Dado** programa com treinos A, B, C em ordem e última selada a B, sem execução aberta
**Quando** a seleção é (re)calculada
**Então** o exibido é o vizinho seguinte, C
**Automatizado:** `__tests__/lib/milon/hooks/useTodayWorkout-rotation.test.ts` → "Dado último selado B sem aberta, o Treino do Dia exibe C (vizinho seguinte)"

### Cenário 4: Último selado é o derradeiro → volta ao primeiro (critério 2) [Automatizado]
**Dado** programa com treinos A, B, C em ordem e última selada a C, sem execução aberta
**Quando** a seleção é (re)calculada
**Então** o exibido é o primeiro da ordem, A, fechando o giro
**Automatizado:** `__tests__/lib/milon/hooks/useTodayWorkout-rotation.test.ts` → "Dado último selado C (derradeiro) sem aberta, o Treino do Dia volta ao primeiro (A)"

### Cenário 5: Giro real ao finalizar o último da ordem (critério 2) [Manual]
**Dado** programa ativo cujo exibido é o último treino da ordem, sem outras abertas
**Quando** a pessoa finaliza esse treino com sucesso
**Então** a tela exibe o primeiro treino da ordem (giro contínuo, sem erro e sem tela vazia)

---

## Critério 3 — Parcial vale como completa

### Cenário 6: Finalizar parcial confirma e avança igual à completa (critério 3) [Automatizado]
**Dado** execução aberta com parte das séries marcadas (ex.: 1 de 3)
**Quando** a pessoa aciona `Finalizar` e confirma a pergunta de parcial
**Então** o selamento conclui (`finishExecution` com término), a seção emite `sealed` e a página executa a mesma dupla recarga do caminho completo — sem diferença de comportamento entre parcial e completa
**Automatizado:** `__tests__/components/milon/WorkoutDetailSection.test.tsx` → "confirmar o Finalizar parcial emite onExecutionSettled com desfecho 'sealed'" (comparado ao caso completo direto do Cenário 1); `__tests__/lib/milon/hooks/useWorkoutExecution.test.ts` → "confirmFinish parcial sela com término, recarrega e fecha (critério 5); desistir mantém aberta"; `__tests__/app/milon/today/page-7b1-advance.test.tsx` → "desfecho sealed: … AGUARDA e então recarrega a seleção"

### Cenário 7: Parcial no dispositivo avança como completa (critério 3) [Manual]
**Dado** treino com 3 séries das quais apenas 1 foi marcada
**Quando** a pessoa aciona `Finalizar`, confirma a pergunta de parcial e conclui com sucesso
**Então** a exibição passa ao próximo treino da rotação, idêntico ao resultado do caminho completo

---

## Critério 4 — Cancelar permanece no mesmo treino

### Cenário 8: Cancelar confirmado não avança (critério 4) [Automatizado]
**Dado** Treino do Dia com execução aberta no treino corrente
**Quando** a pessoa aciona `Cancelar` no topo e confirma a exclusão
**Então** a seção emite o desfecho `cancelled`, a página invalida somente a fonte única, preserva o `workoutId` selecionado (nenhuma recarga de seleção) e incrementa o sinal de foco
**Automatizado:** `__tests__/components/milon/WorkoutDetailSection.test.tsx` → "confirmar o Cancelar emite onExecutionSettled com desfecho 'cancelled'"; `__tests__/app/milon/today/page-7b1-advance.test.tsx` → "desfecho cancelled: SOMENTE a fonte única é invalidada, com foco incrementado e workoutId preservado"

### Cenário 9: Cancelar no dispositivo mantém o treino limpo (critério 4) [Manual]
**Dado** treino em execução (badge `"Em execução"` visível) com séries marcadas
**Quando** a pessoa aciona `Cancelar` e confirma
**Então** a página permanece no mesmo treino, agora sem execução aberta (badge apagado, `started_at` limpo, cascata das realizadas) e sem nenhuma série marcada, pronta para recomeçar do zero

---

## Critério 5 — Vazio de borda conduz ao cancelamento, sem selo

### Cenário 10: Execução aberta com zero marcadas → cancelamento, nada selado (critério 5) [Automatizado]
**Dado** execução aberta com zero séries marcadas
**Quando** a pessoa aciona `Finalizar` e confirma a condução ao cancelamento
**Então** a seção emite `cancelled` (e nunca `sealed`), nenhum término é gravado, a execução é excluída e a página não recarrega a seleção — permanecendo no mesmo treino
**Automatizado:** `__tests__/components/milon/WorkoutDetailSection.test.tsx` → "confirmar o Finalizar vazio conduzido ao cancelamento emite 'cancelled' e NÃO 'sealed' (spec §5 critério 5)"; `__tests__/lib/milon/hooks/useWorkoutExecution.test.ts` → "vazio (0 de 3): requestFinish abre finalizar-vazio sem selar (critério 8)"; `__tests__/app/milon/today/page-7b1-advance.test.tsx` → "desfecho cancelled: … workoutId preservado"

### Cenário 11: Vazio de borda no dispositivo (critério 5) [Manual]
**Dado** treino aberto por engano (execução iniciada) com nenhuma série marcada
**Quando** a pessoa aciona `Finalizar`, vê a mensagem que conduz ao cancelamento e confirma
**Então** nada é selado (sem histórico novo), a tela permanece no mesmo treino e o estado volta a ser "sem execução, zero marcadas"

---

## Critério 6 — Vazio herdado da 04/7b

### Cenário 12: Sem programa ativo e programa sem treinos (critério 6) [Automatizado]
**Dado** dono sem programa ativo; em outro passe, programa ativo sem treinos
**Quando** a pessoa abre a aba Treino do Dia
**Então** aparece o vazio orientador herdado ("sem treino ativo" com a orientação correspondente), sem erro, sem `Tentar novamente` e sem tentativa de avanço
**Automatizado:** `__tests__/app/milon/today/page-7b1-advance.test.tsx` → "sem programa ativo: vazio orientador sem erro, sem avanço e sem retry algum" + "programa ativo sem treinos: vazio orientador adicionar primeiro, sem erro e sem avanço"; `__tests__/app/milon/today/page.test.tsx` → "sem programa ativo: 'sem treino ativo' com orientação ativar/criar, sem erro e sem retry" + "programa ativo sem treinos: 'sem treino ativo' orientando adicionar o primeiro treino"

### Cenário 13: Vazio no dispositivo (critério 6) [Manual]
**Dado** conta sem programa ativo (ou programa recém-ativado sem treinos)
**Quando** a pessoa abre o Mílon na aba Treino do Dia
**Então** a tela exibe a mesma mensagem de sem treino ativo com orientação das features 04/7b, sem erro e sem qualquer transição de seleção

---

## Critério 7 — Falha de carga com nova tentativa; operação/bloqueio sem

### Cenário 14: Falha na recarga da nova seleção pós-Finalizar (critério 7) [Automatizado]
**Dado** desfecho `sealed` já emitido e a recarga da seleção rejeitando com origem `carga`
**Quando** a página tenta buscar a nova seleção
**Então** o `AsyncState` central exibe a mensagem com `"Tentar novamente"` e nenhum treino parcial é exibido; acionar a tentativa repete a cadeia e resolve a seleção
**Automatizado:** `__tests__/app/milon/today/page-7b1-advance.test.tsx` → "falha da recarga de seleção após sealed: AsyncState exibe origem carga com nova tentativa e nenhum treino parcial"; `__tests__/app/milon/today/page.test.tsx` → "falha de carga: mensagem com Tentar novamente que recarrega (clique pós-fetch)"

### Cenário 15: Falha de operação e bloqueio de domínio (critério 7) [Automatizado]
**Dado** erro com origem `operacao` ou `bloqueio` na seleção/ação
**Quando** a mensagem é renderizada
**Então** aparece sem `"Tentar novamente"` (retry derivado só de `carga`), preservando a tela atual
**Automatizado:** `__tests__/app/milon/today/page.test.tsx` → "falha de operação: mensagem sem Tentar novamente" + "bloqueio de domínio: mensagem sem Tentar novamente"

---

## Critério 8 — Falha no selar/cancelar preserva tudo e não emite desfecho

### Cenário 16: Falha ao confirmar Finalizar ou Cancelar (critério 8) [Automatizado]
**Dado** modal de confirmação aberto (parcial, completa, vazio ou cancelar) com a operação rejeitando
**Quando** a pessoa confirma
**Então** nenhum desfecho é emitido (nenhuma recarga de seleção nem de fonte única acontece na página), o modal permanece aberto com o digitado e as marcações preservados e o erro aparece com origem `operacao`, sem nova tentativa
**Automatizado:** `__tests__/components/milon/WorkoutDetailSection.test.tsx` → "falha ao confirmar o Finalizar NÃO emite onExecutionSettled (nenhum desfecho; modal preservado)" + "falha ao confirmar o Cancelar NÃO emite onExecutionSettled (nenhum desfecho; modal preservado)"; `__tests__/app/milon/today/page-7b1-advance.test.tsx` → "sem desfecho (falha da operação): nenhum retry de seleção nem de fonte única, sem foco e sem avanço"; `__tests__/lib/milon/hooks/useWorkoutExecution.test.ts` → "falha ao selar alimenta operacao, relança e NÃO fecha o modal (critério 11)"

### Cenário 17: Queda de rede ao confirmar (critério 8) [Manual]
**Dado** conexão interrompida no momento de confirmar o Finalizar ou o Cancelar
**Quando** a pessoa confirma
**Então** nada avança e nada é preservado como seleção nova: o modal continua aberto com as marcações e o digitado intactos, a mensagem de erro aparece sem nova tentativa e a pessoa resolve (retry manual do aparelho ou nova tentativa quando a rede volta)

---

## Critério 9 — Suíte verde, cobertura e relatório

### Cenário 18: Gates da suíte (critério 9) [Automatizado]
**Dado** o repositório na feature 7b-1
**Quando** os comandos de verificação rodam
**Então** `npm test` termina com 1636 testes / 127 arquivos / 0 falhas (sem quebra das features 01 a 07c), `npm test -- --coverage` termina com 84.74% lines e 83.63% branch (ambos ≥ 80%), `npx tsc --noEmit` e `npm run lint` terminam em exit 0, `npm run build-storybook` termina em exit 0 e este `test-report.json` está regenerado com `failed = 0`
**Automatizado:** comandos e números registrados em `test-report.json` (`gates.suiteZeroFailures`, `gates.coverageLinesGte80`, `gates.coverageBranchesGte80`, `gates.tscExit0`, `gates.lintExit0`, `gates.storybookExit0`, `gates.todoZero`)

---

## Foco pós-ação (spec §2 — manual por teclado/leitor de tela)

### Cenário 18b: Foco no cabeçalho do próximo após Finalizar [Manual — teclado/leitor de tela]
**Dado** Finalizar concluído com sucesso (foco programático exercitado em jsdom, mas navegação real não)
**Quando** a seção do próximo treino monta com o sinal de foco não-nulo
**Então** o foco cai no elemento rotulado `"Cabeçalho do treino"` (`tabindex="-1"`), anunciado pelo leitor de tela com o nome do novo treino; com `Tab`/`Shift+Tab` o cabeçalho **não** entra na ordem de tabulação (foco só programático, sem roubo de navegação)
**Automatizado (parcial):** `__tests__/components/milon/WorkoutDetailSection.test.tsx` → "focusHeaderSignal não-nulo foca o cabeçalho ao montar e a cada novo valor do sinal (ramo de execução)" + "…no ramo de manutenção também (duas ramificações)" + "trava: focusHeaderSignal nulo (default) não move o foco programático do cabeçalho" — teclado/leitor de tela real permanece manual

### Cenário 18c: Foco no mesmo cabeçalho após Cancelar [Manual — teclado/leitor de tela]
**Dado** Cancelar concluído com sucesso no treino corrente
**Quando** a página incrementa o sinal de foco sem trocar o treino
**Então** o foco vai/segue no cabeçalho `"Cabeçalho do treino"` do mesmo treino, sem troca de treino e sem movimento de foco em trocas manuais de treino pelo seletor
**Automatizado (parcial):** mesmo bloco do Cenário 18b (mudança do sinal com seção montada) — anúncio real em leitor de tela permanece manual

---

## Travas das features anteriores verificadas por composição (07/7b/7c)

- **07 — quatro casos de confirmação:** textos exatos preservados em `__tests__/components/milon/WorkoutDetailSection.test.tsx` ("parcial: finishConfirmOpen com caso parcial exibe o texto exato", "cancelar: cancelConfirmOpen exibe o texto exato de exclusão", "Caso 4: finishConfirmOpen com caso completa exibe a pergunta de todas-executadas", "vazio: finishConfirmOpen com caso vazio exibe a mensagem que conduz ao cancelamento") e em `__tests__/lib/milon/hooks/useWorkoutExecution.test.ts` (parcial/vazio/completo/Caso 4).
- **07 — imutabilidade pós-selo:** `__tests__/lib/milon/repositories/contract-workout-executions.test.ts` → "busca de aberta volta vazia após selar (critério 10: selada não conta como aberta)" + "duplo selamento não cria selo duplicado e vira erro de operação" + "selar execução inexistente lança erro sem criar linha".
- **7b — prioridade da aberta, giro e troca manual:** `__tests__/lib/milon/hooks/useTodayWorkout-rotation.test.ts` (6 blocos: prioridade da aberta, rotação com volta, sem histórico, ficha nova, troca manual, erro de carga) + `__tests__/lib/milon/repositories/contract-07b-rotation.test.ts`.
- **7c — liberação de escrita após settle e guarda por dono:** `__tests__/app/milon/today/page-ac6.test.tsx` → "Finalizar em A → trocar para B libera escrita SEM reload" + "Cancelar em A → trocar para B libera escrita SEM reload" (sem regressão com a assinatura nova de desfecho); `__tests__/lib/milon/repositories/contract-07c-active-owner.test.ts` + "treinos diferentes com mesmo dono recusam a segunda abertura (R1)" em `contract-workout-executions.test.ts`; guarda visual em `__tests__/app/milon/today/page.test.tsx` (bloqueio por execução ativa) e `WorkoutDetailSection.test.tsx` (escrita bloqueada 07c).
- **Retrocompatibilidade DA3:** `__tests__/app/milon/today/page-7b1-advance.test.tsx` → "chamada sem argumento (retrocompat 7c, DA3): não-selamento invalida SOMENTE a fonte única e preserva o treino".

## Limitações declaradas (fora da suite, repassadas conforme o backlog)

- **Giro em dispositivo real (critérios 1/2/3 manuais):** a ordem de recargas é assertada em jsdom por ordem de chamadas; o resultado visual final (treino seguinte na tela, sem reload do navegador) exige dispositivo.
- **Teclado/leitor de tela (Cenários 18b/18c):** o foco programático é assertado via `document.activeElement` em jsdom; anúncio por leitor de tela e comportamento real de `Tab` não são exercitáveis na suite.
- **Falha de rede real (Cenário 17):** a preservação no erro é assertada com rejeição simulada; a queda real de rede é manual.
- **Concorrência entre dois donos/dispositivos:** limitação conhecida da 7c (sem sync em tempo real) — sem cenário determinístico manual; coberta pelos contratos por dono.
