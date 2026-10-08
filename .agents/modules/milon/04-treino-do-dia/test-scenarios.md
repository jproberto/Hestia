# Cenários de Teste — Mílon #4: Treino do Dia v1 (paridade com manutenção)

> Base exclusiva: `spec.md` §5 (14 critérios de aceite) + `tasks.json` acceptanceCriteria (TASK-001..004) + contratos do `plan.md` §3.
> Formato: **Dado / Quando / Então** (Gherkin-style). Foco em critérios high-level, sem detalhes voláteis de UI.
> Automação correspondente: `__tests__/lib/milon/hooks/useTodayWorkout.test.ts` (9),
> `__tests__/components/milon/WorkoutDetailSection.test.tsx` (9),
> `__tests__/components/milon/TodayWorkoutSwitcher.test.tsx` (6),
> `__tests__/app/milon/today/page.test.tsx`, `__tests__/app/milon/page.test.tsx` (7),
> `__tests__/components/milon/MilonLayout.test.tsx` (8),
> `__tests__/app/milon/programs/[id]/workouts/[workoutId]/page.test.tsx` (8, wrapper).
> Suite: 105 arquivos, 1168 testes, 0 falhas. Coverage: 84.35% lines/statements, 83.52% branch.

---

## 1. Navegação — raiz, abas e aba ativa (spec §5 critérios 1–3)

### Cenário 1: Raiz do Mílon termina no Treino do Dia
**Dado** a raiz do Mílon acessada por digitação, refresh ou cartão do dashboard
**Quando** a pessoa abre `/milon`
**Então** termina na página do Treino do Dia (`/milon/today`)
**E** a biblioteca e os Programas não aparecem nesse caminho direto

### Cenário 2: Barra com exatamente três abas ordenadas
**Dadas** as telas do Mílon
**Quando** a pessoa vê a barra de navegação
**Então** ela exibe exatamente três itens, nesta ordem: Treino do Dia, Programas, Exercícios
**E** cada item navega para o próprio destino (`/milon/today`, `/milon/programs`, `/milon/exercises`), mantendo mascote e título do módulo visíveis

### Cenário 3: Marca de aba ativa acompanha o destino
**Dado** o Treino do Dia aberto (inclusive por acesso direto via endereço, sem clique anterior)
**Então** a aba Treino do Dia aparece marcada como ativa e as demais não
**E** em Programas e Exercícios a marca acompanha o destino atual, sempre exatamente uma aba ativa

---

## 2. Seleção do treino exibido (spec §5 critérios 4–5)

### Cenário 4: Abertura mostra o primeiro treino do programa ativo (dia 1)
**Dado** o dono logado com programa ativo contendo treinos
**Quando** a pessoa abre o Treino do Dia
**Então** vê o primeiro treino desse programa por ordem de criação, com exercícios e séries como na manutenção
**E** havendo mais de um programa na família, o programa do outro dono nunca é usado como origem

### Cenário 5: Troca de treino restrita ao programa ativo
**Dada** a troca de treino no Treino do Dia
**Quando** a pessoa alterna o treino exibido
**Então** alterna somente entre treinos do programa ativo do próprio login
**E** treinos de outro programa não aparecem como opção
**E** o seletor só aparece com 2+ treinos

---

## 3. Paridade total com a manutenção (spec §5 critério 6)

### Cenário 6: Edição no Treino do Dia é idêntica à manutenção
**Dada** edição de carga, repetições, descanso, ordem de exercícios, adição e exclusão no Treino do Dia
**Quando** a pessoa executa cada ação
**Então** o resultado é idêntico ao da página de manutenção do mesmo treino, incluindo mensagens, confirmações, bloqueios e permanência de formulário aberto no erro
**E** após salvar, a pessoa permanece na página do Treino do Dia, com a lista refletindo o dado atualizado

---

## 4. Vazios orientadores (spec §5 critérios 7–8)

### Cenário 7: Sem programa ativo — vazio orientador sem erro
**Dado** o dono logado sem programa ativo
**Quando** a pessoa abre o Treino do Dia
**Então** a página exibe mensagem de sem treino ativo com orientação para ativar ou criar programa, sem erro

### Cenário 8: Programa ativo sem treinos — vazio orientador sem erro
**Dado** programa ativo sem treinos
**Quando** a pessoa abre o Treino do Dia
**Então** a página exibe mensagem de sem treino ativo com orientação para adicionar o primeiro treino, sem erro

### Cenário 9: Treino sem exercícios — vazio com ação de adicionar
**Dado** o treino exibido sem exercícios
**Quando** a pessoa abre o Treino do Dia
**Então** a página mostra estado vazio com ação de adicionar exercício, permitindo escolha da biblioteca ou cadastro rápido na hora

---

## 5. Somente leitura, unicidade e derivados (spec §5 critérios 9–12)

### Cenário 10: Programa inativo não oferece escrita
**Dado** programa inativo
**Quando** a pessoa abre o Treino do Dia
**Então** a página não oferece adicionar, editar, reordenar nem excluir (somente leitura, mesma regra da feature 2)

### Cenário 11: Exercício duplicado no mesmo treino é bloqueado (D14)
**Dado** exercício já presente no treino exibido
**Quando** a pessoa tenta adicionar o mesmo exercício
**Então** a tentativa é bloqueada com mensagem visível e a tela permanece aberta
**E** em outro treino do mesmo programa a adição é aceita

### Cenário 12: Subtítulo derivado atualiza sozinho
**Dado** treino com exercícios de grupos distintos
**Então** o subtítulo exibe a junção sem repetição e na ordem dos grupos nos exercícios, no padrão com vírgula e adição antes do último item
**Quando** a pessoa remove o único exercício de um grupo
**Então** o subtítulo atualiza automaticamente
**E** treino sem exercícios fica sem subtítulo

### Cenário 13: Carga vazia mostra traço, zero mostra zero
**Dado** campo de carga vazio
**Então** a exibição mostra traço
**Dado** valor zero digitado
**Então** a exibição mostra zero

---

## 6. Erros com e sem nova tentativa (spec §5 critério 13)

### Cenário 14: Falha de carga tem nova tentativa que recarrega
**Dada** falha de carga no Treino do Dia
**Quando** a pessoa vê a mensagem
**Então** ela vem com nova tentativa
**E** o acionamento recarrega com sucesso

### Cenário 15: Falha de operação ou bloqueio aparece sem nova tentativa
**Dada** falha de operação ou bloqueio de domínio
**Quando** a pessoa vê a mensagem
**Então** ela aparece sem nova tentativa
**E** modais de formulário nunca fecham no erro, com mensagem visível e dado preservado

---

## 7. Verificação de suite (spec §5 critério 14)

### Cenário 16: Suite verde sem regressão e cobertura ≥ 80%
**Dada** a suite completa executada (`npm run test` + `--coverage`)
**Então** 0 falhas, sem quebra de testes existentes fora das atualizações aprovadas (MilonLayout 3 abas, redirect `/milon/today`)
**E** cobertura mantida em pelo menos 80% (atual: 84.35% lines/statements, 83.52% branch)
**E** build do Storybook OK e `tsc --noEmit` limpo

---

## 8. Cenários repassados às features que os liberam (spec §6)

> Regra do backlog do módulo: o que não for executável nesta v1 por depender das features 5, 6 ou 7 é repassado
> à feature que o libera e registrado aqui, sem virar pendência oculta. Nesta v1 os slots de extensão
> (`headerActions`/`entryFooter`/`footer`) passam nulos — a página prova o mecanismo sem antecipar UI de execução.

### Cenário R-5 (REPASSADO à feature #5 — execução diária): Marcação de série como feita
**Dado** o Treino do Dia com o treino selecionado
**Quando** a feature #5 preencher o slot por exercício com o controle de feito
**Então** este cenário será executável e entra no `test-scenarios.md` da #5
**Status nesta v1:** não executável — slot `entryFooter` nulo por decisão (plan.md D4)

### Cenário R-6 (REPASSADO à feature #6 — descanso): Timer de descanso automático
**Dado** o Treino do Dia com o treino selecionado
**Quando** a feature #6 preencher o slot com timer/notificação de fim de descanso
**Então** este cenário será executável e entra no `test-scenarios.md` da #6
**Status nesta v1:** não executável — fora de escopo explícito (spec §4)

### Cenário R-7 (REPASSADO à feature #7 — encerramento): Encerramento do treino com confirmação
**Dado** o Treino do Dia com o treino selecionado
**Quando** a feature #7 preencher o slot com encerramento/registro de término (inclusive parcial)
**Então** este cenário será executável e entra no `test-scenarios.md` da #7
**Status nesta v1:** não executável — fora de escopo explícito (spec §4)

---

## Rastreabilidade

| Cenário | Spec §5 | Automação |
|---------|---------|-----------|
| 1 | critério 1 (redirect raiz) | `__tests__/app/milon/page.test.tsx` |
| 2 | critério 2 (3 abas ordenadas) | `__tests__/components/milon/MilonLayout.test.tsx` + bloco navegação em `today/page.test.tsx` |
| 3 | critério 3 (aba ativa) | bloco navegação em `today/page.test.tsx` |
| 4 | critério 4 (primeiro por criação) | `useTodayWorkout.test.ts` + bloco seleção em `today/page.test.tsx` |
| 5 | critério 5 (troca restrita) | `useTodayWorkout.test.ts` + `TodayWorkoutSwitcher.test.tsx` + bloco seleção em `today/page.test.tsx` |
| 6 | critério 6 (paridade edição) | wiring em `today/page.test.tsx` + comportamento em `WorkoutDetailSection.test.tsx` + wrapper em `workouts/[workoutId]/page.test.tsx` |
| 7–8 | critério 7 (vazios sem programa/sem treinos) | bloco vazios em `today/page.test.tsx` |
| 9 | critério 8 (treino sem exercícios) | bloco vazios em `today/page.test.tsx` (seção herdada) |
| 10 | critério 9 (inativo sem ações) | bloco inativo em `today/page.test.tsx` + `WorkoutDetailSection.test.tsx` (readOnly) |
| 11 | critério 10 (unicidade D14) | `WorkoutDetailSection.test.tsx` (bloqueio modal aberto) + wiring em `today/page.test.tsx` |
| 12 | critério 11 (subtítulo derivado) | seção herdada (wiring em `today/page.test.tsx`) |
| 13 | critério 12 (vazio ≠ zero) | seção herdada (wiring em `today/page.test.tsx`) |
| 14–15 | critério 13 (carga com retry / operação-bloqueio sem) | bloco erros em `today/page.test.tsx` + `useTodayWorkout.test.ts` |
| 16 | critério 14 (suite + cobertura) | TASK-004 — `test-report.json` |
| R-5/R-6/R-7 | spec §6 (dependências futuras) | repassados às features #5/#6/#7 |
