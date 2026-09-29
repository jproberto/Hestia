# Cenários de Homologação — Mílon #2: Programas

Portão manual da feature (`SPEC_APPROVED` → `APPROVED`). Derivado exclusivamente de
`spec.md` §5 (Critérios de Aceite — 22 itens) + `tasks.json` (acceptanceCriteria) +
`plan.md` (contratos). Cenário por critério, na mesma ordem da spec.

- **Execução:** subir o app (`npm run dev`), logar e abrir `/milon/programs`.
- **Referência de teste:** cada cenário aponta o teste automatizado que o exercita
  (suíte `npm test`, 647 testes, 0 falhas).
- **Status:** os testes automatizados estão verdes; a coluna "Homologado" fica para
  o humano marcar ao executar (gate `approve-review`).

| # | Critério (spec §5) | Automatizado em | Homologado |
|---|---|---|---|
| 1 | Tela vazia → mensagem amigável, sem erro | ver Cenário 1 | ☐ |
| 2 | Sugestão pré-preenchida e re-sorteável | ver Cenário 2 | ☐ |
| 3 | Título vazio na criação → bloqueio + digitado preservado | ver Cenário 3 | ☐ |
| 4 | Título vazio na edição → mesmo bloqueio | ver Cenário 4 | ☐ |
| 5 | Guarda de ativação bloqueia com mensagem; libera com conteúdo | ver Cenário 5 | ☐ |
| 6 | Ativação: anterior do mesmo dono fica inativo (nunca 2 ativos) | ver Cenário 6 | ☐ |
| 7 | Reativação: inativo vira ativo e o anterior fica inativo | ver Cenário 7 | ☐ |
| 8 | Inativo é somente leitura (só reativar) | ver Cenário 8 | ☐ |
| 9 | Rascunho e ativo são editáveis (com bloqueio de título vazio) | ver Cenário 9 | ☐ |
| 10 | Qualquer um transiciona o Programa do outro | ver Cenário 10 | ☐ |
| 11 | Confirmação padrão (título+dono), cancelar não muda nada | ver Cenário 11 | ☐ |
| 12 | Ativo/inativo não oferecem ação de excluir | ver Cenário 12 | ☐ |
| 13 | Excluir rascunho: confirmar some da lista, cancelar preserva | ver Cenário 14 | ☐ |
| 14 | Nenhuma tela tem caminho de exclusão de ativo/inativo | ver Cenário 12 | ☐ |
| 15 | Padrão de abertura: dono próprio, todos os status, mais novo→antigo | ver Cenário 15 | ☐ |
| 16 | Limpar dono vê a família; desmarcar status some os itens | ver Cenário 16 | ☐ |
| 17 | Mais recentes primeiro; reativar não move para o topo | ver Cenário 17 | ☐ |
| 18 | Item identifica título/dono/status + ações permitidas | ver Cenário 18 | ☐ |
| 19 | Falha de carregamento → erro com "tentar de novo" | ver Cenário 19 | ☐ |
| 20 | Falha em ativar/reativar/excluir → erro visível, nada muda | ver Cenário 20 | ☐ |
| 21 | Material de sugestões validado por humano antes de entrar | ver Cenário 21 | ☐ |
| 22 | Outro casal vê e pode mexer no mesmo Programa | ver Cenário 10 + 22 | ☐ |

---

### Cenário 1: Tela vazia orienta a criar o primeiro (critério 1)

**Dado** que não existe nenhum Programa cadastrado
**Quando** a pessoa abre a tela de Programas
**Então** vê mensagem amigável orientando a criar o primeiro Programa, **sem** mensagem de erro nem orientação de filtros

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "estado de fetch: sem programas orienta a criar o primeiro, sem erro"; `__tests__/components/milon/ProgramList.test.tsx` → "empty orienta a criar o primeiro programa, sem erro nem orientação de filtros".

### Cenário 2: Sugestão pré-preenchida no formulário de criação (critério 2)

**Dado** que a pessoa abre o formulário de criação
**Quando** o formulário é exibido
**Então** o campo de título já vem preenchido com uma sugestão sorteada da combinação templates + pools, sem slots residuais `{adj}`/`{substantivo}`/`{complemento}`, e a pessoa pode substituí-la por qualquer texto; ao fechar e abrir de novo, o sorteio pode resultar em outra sugestão

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "criar: abre ProgramModal com suggestion de sortearSugestao e grava via hook"; `__tests__/components/milon/ProgramModal.test.tsx` → "criação pré-preenche o título com a sugestão"; `__tests__/lib/milon/program-utils.test.ts` → "retorna string preenchida, não vazia e sem slots residuais" + "cada sorteio deriva de um template com slots preenchidos pelo pool correspondente".

### Cenário 3: Título apagado na criação é bloqueado (critério 3)

**Dado** o formulário de criação com a sugestão pré-preenchida
**Quando** a pessoa apaga tudo e tenta salvar
**Então** o salvamento é bloqueado com mensagem de título vazio, o formulário permanece aberto e o que foi digitado é preservado

Automatizado: `__tests__/components/milon/ProgramModal.test.tsx` → "título vazio bloqueia o submit com erro visível (validarTitulo) e não fecha o modal" + "título só com espaços em branco também é bloqueado com erro visível"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → "título vazio é bloqueado antes de qualquer chamada ao repository".

### Cenário 4: Título esvaziado na edição é bloqueado (critério 4)

**Dado** um Programa existente em rascunho
**Quando** a pessoa edita o título para vazio (ou só espaços) e tenta salvar
**Então** o salvamento é bloqueado com a mesma mensagem, os dados permanecem e o modal não fecha

Automatizado: `__tests__/components/milon/ProgramModal.test.tsx` → "título vazio bloqueia o submit com erro visível (validarTitulo) e não fecha o modal" (caso edição) + `__tests__/lib/milon/program-utils.test.ts` → "título vazio retorna mensagem de erro" / "título só com espaços retorna mensagem de erro".

### Cenário 5: Guarda de ativação nasce bloqueada com mensagem (critério 5)

**Dado** um Programa em rascunho sem conteúdo (a feature 3 ainda não entregou treinos)
**Quando** a pessoa tenta ativá-lo
**Então** a ação aparece bloqueada com mensagem explicando que é preciso de pelo menos um treino com exercícios, e a ativação **não** acontece (o repository não é chamado)

**Dado** que a existência desse conteúdo é simulada (flag `hasWorkoutWithExercise = true`, futuro da feature 3)
**Quando** a pessoa confirma a ativação
**Então** a mesma guarda libera a ativação e o Programa passa a ativo

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "activate bloqueia com a mensagem exata e não chama o repository" + "reactivate bloqueia com a mensagem exata e não chama o repository" + "guarda também bloqueia quando o pedido vem pelo fluxo de confirmação" + "activate chama repository, desativa o anterior do mesmo dono e preserva o ativo de outro dono"; `__tests__/lib/milon/program-utils.test.ts` → "sem conteúdo (false) retorna mensagem de erro" / "com conteúdo (true) retorna null".

### Cenário 6: Ativação troca o Programa vigente do dono (critério 6)

**Dado** um Programa em rascunho do dono A e outro Programa já ativo do mesmo dono A (mais um ativo do dono B)
**Quando** a pessoa confirma a ativação do rascunho de A
**Então** ele passa a ativo, o anterior ativo de A fica inativo automaticamente, o ativo de B permanece ativo e nunca há dois ativos do mesmo dono ao mesmo tempo

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "activate chama repository, desativa o anterior do mesmo dono e preserva o ativo de outro dono"; `__tests__/lib/milon/repositories/contract-programs.test.ts` → "update para 'ativo' desativa o anterior ativo do mesmo dono (outro dono e não-ativos intactos)"; `__tests__/lib/milon/repositories/programs-client.test.ts` → "createProgram 'ativo' desativa o anterior do mesmo dono (outro dono intacto)" + "updateProgram para 'ativo' desativa o anterior do mesmo dono antes de gravar"; `__tests__/lib/milon/program-utils.test.ts` → "desativa apenas o programa ativo do mesmo dono; demais ficam intactos".

### Cenário 7: Reativação devolve a vigência ao Programa antigo (critério 7)

**Dado** dois Programas do mesmo dono — um ativo e um inativo — com conteúdo mínimo
**Quando** a pessoa reativa o inativo
**Então** ele fica ativo e o Programa que estava ativo fica inativo

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "reactivate chama repository, desativa o anterior do mesmo dono e preserva o ativo de outro dono" + "confirm executa a reativação pendente quando a guarda libera"; `__tests__/lib/milon/repositories/contract-programs.test.ts` → "ativar um programa antigo não altera a ordenação por data de criação".

### Cenário 8: Programa inativo é somente leitura (critério 8)

**Dado** um Programa inativo na lista
**Quando** a pessoa olha as ações disponíveis dele
**Então** não há como alterar título nem conteúdo — a única ação disponível é **Reativar**

Automatizado: `__tests__/components/milon/ProgramList.test.tsx` → "inativo é somente leitura: única ação é reativar (sem editar nem excluir)"; `__tests__/app/milon/programs/page.test.tsx` → "reativar: inativo é somente leitura e abre ProgramConfirmModal com ação/título/dono".

### Cenário 9: Rascunho e ativo são editáveis (critério 9)

**Dado** Programas em rascunho e ativo
**Quando** a pessoa edita o título de cada um
**Então** a edição é permitida nos dois, e em ambos o salvamento com título vazio é bloqueado pela mesma mensagem

Automatizado: `__tests__/components/milon/ProgramList.test.tsx` → "rascunho oferece editar, ativar e excluir" + "ativo oferece somente editar (sem excluir, ativar ou reativar)"; `__tests__/app/milon/programs/page.test.tsx` → "editar: abre ProgramModal com os dados do item e salva com o id"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → "edita pelo id: normaliza o título, manda só o id+título e recarrega".

### Cenário 10: Qualquer um do casal mexe no Programa do outro (critério 10)

**Dado** um Programa pertencente à pessoa B (dono = B) e a pessoa A logada
**Quando** A transiciona (ativa/reativa/exclui) esse Programa
**Então** a transição é permitida — "dono" não restringe nada

Automatizado: `__tests__/lib/milon/repositories/contract-programs.test.ts` → contrato `IProgramRepository` (nenhum teste filtra por sessão; dono é campo de dados, não de permissão) + `__tests__/components/milon/ProgramList.test.tsx` → "lista mista mostra exatamente as ações permitidas por cada status" (ações não variam por sessão). Ver também Cenário 22.

### Cenário 11: Confirmação explícita antes de ativar/reativar/excluir (critério 11)

**Dado** um Programa em rascunho
**Quando** a pessoa pede ativação, reativação ou exclusão
**Então** um modal de confirmação no padrão do projeto aparece informando **título** e **dono**; ao **cancelar**, nada muda (nenhuma chamada ao repository); ao **confirmar**, a ação é executada

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "ativar: rascunho abre ProgramConfirmModal com ação/título/dono e só executa na confirmação" + "excluir: só o rascunho tem a ação e abre ProgramConfirmModal com ação/título/dono" + "cancelar a confirmação vinda do hook não executa nada e fecha o modal"; `__tests__/components/milon/ProgramConfirmModal.test.tsx` → describes "rótulo do botão de confirmar por action", "estado processing", "callbacks onConfirm/onCancel", "programa alvo informado"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → "requestConfirm guarda ação+programa sem executar; cancelConfirm descarta".

### Cenário 12: Ativo e inativo nunca oferecem "Excluir" (critérios 12 e 14)

**Dado** Programas em status ativo e inativo na lista
**Quando** a pessoa procura a ação de excluir
**Então** ela não existe — nenhum botão de excluir para esses itens, em nenhuma tela

Automatizado: `__tests__/components/milon/ProgramList.test.tsx` → "ativo oferece somente editar (sem excluir, ativar ou reativar)" + "inativo é somente leitura: única ação é reativar (sem editar nem excluir)" + "lista mista mostra exatamente as ações permitidas por cada status"; `__tests__/app/milon/programs/page.test.tsx` → "excluir: só o rascunho tem a ação" (assert de 1 único botão Excluir).

### Cenário 13: Ciclo de vida fechado — só as transições do MVP (apoio ao critério 6/7)

**Dado** um Programa em qualquer status
**Quando** a pessoa consulta as transições possíveis
**Então** `rascunho → ativo`, `inativo → ativo` (reativação) e exclusão apenas em rascunho existem; **não** existem `rascunho → inativo` nem `ativo → rascunho`

Automatizado: `__tests__/lib/milon/program-utils.test.ts` → describe "transicoesPermitidas (spec §3 - ciclo de vida fechado)" (3 casos: rascunho, ativo, inativo).

### Cenário 14: Exclusão de rascunho com confirmação (critério 13)

**Dado** um rascunho com confirmação pendente de exclusão
**Quando** a pessoa confirma
**Então** o Programa some da lista

**Dado** a mesma confirmação pendente
**Quando** a pessoa cancela
**Então** o Programa permanece intacto

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "excluir: só o rascunho tem a ação e abre ProgramConfirmModal com ação/título/dono"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → "confirm executa a exclusão pendente e limpa confirmAction" + "remove de rascunho chama repository e some da lista" + "requestConfirm guarda ação+programa sem executar; cancelConfirm descarta"; `__tests__/lib/milon/repositories/programs-client.test.ts` → "deleteProgram remove o registro e propaga erro do banco".

### Cenário 15: Padrão de abertura da tela (critério 15)

**Dado** que a pessoa abre a tela de Programas com seu login
**Quando** a lista carrega
**Então** o select de Dono vem no próprio usuário logado, os três checks de Status vêm todos marcados e a lista está ordenada do Programa mais novo para o mais antigo por data de criação

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "padrão ao montar: dono = getUserEmail() e todos os status marcados" + "abre em loading, exibe a lista na ordem do repositório e sai do loading sem erro"; `__tests__/components/milon/ProgramList.test.tsx` → "select de dono mostra as ownerOptions, a opção de limpar e reflete selectedOwner" + "renderiza os três checks de status marcados"; `__tests__/lib/milon/repositories/contract-programs.test.ts` → "listAll ordena por created_at desc (mais novo primeiro)".

### Cenário 16: Filtros refinam e ampliam a lista (critério 16)

**Dado** Programas de ambos os donos e nos três status
**Quando** a pessoa limpa o filtro de Dono
**Então** vê a família inteira

**Dado** o mesmo cenário
**Quando** a pessoa desmarca um status
**Então** os Programas daquele status somem da lista (e remarcando voltam; desmarcar tudo não é erro)

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "filtro de dono por igualdade: limpar vê a família inteira e trocar vê o outro dono" + "checks de status por inclusão: desmarcar some, marcar devolve e vazio não é erro"; `__tests__/app/milon/programs/page.test.tsx` → "filtros: select de dono e checks de status refletem no hook".

### Cenário 17: Ordenação por data de criação é estável (critério 17)

**Dado** vários Programas do mesmo dono com status misturados
**Quando** a pessoa consulta com o padrão
**Então** os mais recentes aparecem primeiro mesmo misturando status

**Dado** um Programa antigo inativo reativado
**Quando** a lista recarrega
**Então** ele **não** salta para o topo — a posição continua a da sua data de criação

Automatizado: `__tests__/lib/milon/repositories/contract-programs.test.ts` → "listAll ordena por created_at desc (mais novo primeiro)" + "ativar um programa antigo não altera a ordenação por data de criação"; `__tests__/lib/milon/repositories/programs-client.test.ts` → "listPrograms ordena por created_at desc e converte row → domínio".

### Cenário 18: Identificação do item sem abrir o Programa (critério 18)

**Dado** um Programa na lista
**Quando** a pessoa vê o item
**Então** identifica título, dono e status sem abrir o Programa e vê somente as ações permitidas pelo status

Automatizado: `__tests__/components/milon/ProgramList.test.tsx` → "lista itens com título, dono e badge de status" + "lista mista mostra exatamente as ações permitidas por cada status" + "título da seção usa o token font-display".

### Cenário 19: Falha de carregamento tem "tentar de novo" (critério 19)

**Dado** que o carregamento da lista falha (rede/banco indisponível)
**Quando** a pessoa vê a tela
**Então** aparece mensagem simples de erro com opção de tentar de novo, e a nova tentativa recupera a lista

Automatizado: `__tests__/app/milon/programs/page.test.tsx` → "erro de carregamento mostra retry que dispara o hook"; `__tests__/lib/milon/hooks/usePrograms.test.ts` → "falha de carregamento vira errorMsg visível e reload (tentar de novo) recupera" + "reload com falha expõe a mensagem e uma nova tentativa recupera"; `__tests__/components/milon/ProgramList.test.tsx` → "error mostra a mensagem e o tentar-novamente dispara onRetry".

### Cenário 20: Falha em ação não muda estado nem fecha telas (critério 20)

**Dado** uma ativação, reativação ou exclusão que falha no repository
**Quando** a pessoa tenta a ação
**Então** a mensagem de erro fica visível, o status na lista não muda, nenhuma tela fecha silenciosamente e a pessoa pode tentar de novo; no modal de criação/edição, o que foi digitado é preservado

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "falha em remove mantém lista e filtros e expõe a mensagem" + "falha em activate preserva os status e expõe a mensagem" + "erro do repository é relançado ao modal sem alimentar o errorMsg da lista" + "recarga pós-exclusão falha: o item sai da lista em memória"; `__tests__/app/milon/programs/page.test.tsx` → "erro de save mantém o modal aberto com a mensagem visível e o digitado preservado" + "erro de save sem formato de Error vira a mensagem padrão no modal"; `__tests__/components/milon/ProgramModal.test.tsx` → "erro de gravação mantém o modal aberto com erro visível e o digitado preservado"; `__tests__/lib/milon/repositories/programs-client.test.ts` → "deleteProgram remove o registro e propaga erro do banco" + "createProgram: erro que não é de unicidade é relançado como está".

### Cenário 21: Material de sugestões validado antes de entrar no produto (critério 21)

**Dado** que templates e pools foram gerados uma única vez por IA
**Quando** o material entra no produto (TASK-003)
**Então** o humano o revisa e aprova antes do uso — só material revisado compõe a pool de sorteio, e ele não é alterado depois sem nova validação

Automatizado (estrutura do material): `__tests__/lib/milon/program-utils.test.ts` → describe "material de sugestões (templates + pools)" (3 casos: array não vazio, pools por categoria, slots válidos). A **aprovação humana** em si é o registro da TASK-003 em `tasks.json` (status `completed`, assignee `humano`) — gate não automatizável.

### Cenário 22: Lista única da família com logins individuais (critério 22)

**Dado** que a pessoa criou um Programa com seu login
**Quando** o outro casal abre a tela com o próprio login
**Então** vê o mesmo Programa e pode editá-lo, ativá-lo ou excluí-lo (se for rascunho)

Automatizado: `__tests__/lib/milon/hooks/usePrograms.test.ts` → "padrão ao montar: dono = getUserEmail() e todos os status marcados" (lista bruta é a família; o filtro é refino) + "filtro de dono por igualdade: limpar vê a família inteira"; `__tests__/lib/milon/repositories/contract-programs.test.ts` → nenhum critério do contrato depende da sessão (`listAll` devolve a família inteira).

---

## Fora do escopo confirmado pela spec (não homologar aqui)

- Conteúdo de treinos dentro do Programa (feature 3), "treino do dia"/rotação (feature 4),
  exclusão de ativo/inativo, transições `rascunho → inativo` e `ativo → rascunho`,
  permissões por usuário, IA em tempo de uso — todos em spec §4 (YAGNI).
