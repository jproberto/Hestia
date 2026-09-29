# Spec: Programas (Mílon #2 — conjunto A/B/C por dono) — v2

## 1. Problema Real

O casal troca de ficha de treino a cada alguns meses. Sem um agrupador, a troca significa editar a ficha antiga por cima da nova: o que era "A, B, C" virou outra coisa e o passado some. Também não fica claro qual ficha está valendo agora — cada um precisa abrir fácil o próprio treino ao chegar na academia, sem dúvida "hoje é qual?".

Esta feature cria o **Programa** como container de agrupamento: um conjunto de treinos vigente, com dono e status. O valor central é o ciclo de vida — em vez de editar por cima, o usuário ativa o Programa novo e o anterior fica inativo com histórico preservado; mais para frente ele pode reativar um Programa antigo. É o que permite trocar de ficha sem perder o passado, e é o pré-requisito da feature 3 (treinos e séries dentro de um Programa) e da feature 4 (treino do dia usa o Programa ativo).

Fonte: item 2 do backlog do módulo Mílon e discovery de produto conduzido em 7 perguntas (2026-09-28), com decisões D1–D8 registradas nesta spec.

## 2. Usuários e Cenários

Usuários: o casal, com login individual cada um, mesmo modelo da Héstia. **Qualquer um dos dois pode ver, criar, editar, transicionar e excluir Programas da família** — não há permissão restrita (decisão de discovery). O campo "dono" não é permissão: é a base da **prioridade de exibição no dia a dia** (ver Regras).

Cenários cobertos nesta feature, todos na tela própria de Programas:

- Criar um Programa: a pessoa cria um Programa novo, que já nasce com título pré-preenchido por uma sugestão sorteada e status **rascunho**.
- Montar e ativar: a partir daí ela monta os treinos (conteúdo vem da feature 3) e, quando já houver pelo menos um treino com exercícios, **ativa** o Programa — se já existia um ativo do mesmo dono, esse anterior fica **inativo** automaticamente.
- Reativar: meses depois, a pessoa volta num Programa antigo (inativo) e o **reativa** — ele volta a ser o ativo e o vigente anterior fica inativo.
- Editar: a pessoa corrige o título (ou o conteúdo, quando a feature 3 existir) de um Programa em rascunho ou ativo. Programa inativo é somente leitura.
- Excluir um rascunho: a pessoa desiste de um Programa que nunca foi ativado e o **exclui**, após confirmação.
- Consultar com filtros: a pessoa abre a tela e vê a lista da família inteira, com **select de Dono** e **checks de Status**; por padrão já vem o próprio dono selecionado e todos os status marcados, ordenado do mais novo para o mais antigo.

Fora desta feature: o conteúdo dos treinos (exercícios, séries, ordem A/B/C dentro do Programa) — pertence à feature 3; a descoberta automática do próximo treino — pertence à feature 4.

## 3. Regras de Negócio (positivas + edge cases)

### Programa e campos

- Um Programa tem: **título** (texto livre), **dono** (um dos 2 usuários) e **status** (um de três: rascunho, ativo, inativo).
- O título é **livre** e o formulário de criação já vem com texto de **sugestão pré-preenchido**, que a pessoa pode manter ou substituir por qualquer coisa.
- **Não é permitido salvar Programa com título vazio**, na criação e também na edição: o salvamento é bloqueado com mensagem visível e o que foi digitado é preservado. A pessoa corrige e tenta de novo.
- A sugestão nasce de uma **combinação sorteada em runtime** sobre **templates com slots e pools de palavras** que foram **gerados uma única vez por inteligência artificial e validados pelo humano** antes de entrar no produto (decisão D7). Sem chamada externa em tempo de uso, sem serviço de IA rodando no momento da criação — o sorteio acontece offline, no próprio aparelho, e uma nova abertura do formulário pode sortear outra sugestão. A validação humana do material gerado faz parte da regra: só entra o material revisado.
- O tom do material é de **humor de academia/maromba**, coerente com o espírito do módulo.

### Status e transições

- Três status: **rascunho** (é onde todo Programa nasce), **ativo**, **inativo**.
- Transições existentes no MVP, e só estas:
  - `rascunho → ativo` — ativação, ação explícita do usuário, sujeita à guarda de ativação abaixo.
  - `inativo → ativo` — reativação, ação explícita do usuário.
  - Efeito colateral de toda ativação ou reativação: **o Programa ativo anterior do mesmo dono fica inativo automaticamente**.
- **Não existe** a transição `rascunho → inativo` nem `ativo → rascunho` (decisão D3, refutada no feedback da spec v1). O ciclo de vida é fechado: nasce rascunho → ativo ⇄ inativo; o rascunho que não quiser mais vira **exclusão** (regra abaixo).
- **Unicidade do ativo por dono:** no máximo um Programa ativo por dono; a regra do efeito colateral garante isso.
- **Quem transiciona:** qualquer um dos 2 usuários, em qualquer Programa da família. "Dono" não restringe nada.

### Guarda de ativação

- **Ativar exige conteúdo:** só é possível ativar (e reativar) um Programa que tenha **pelo menos um treino com pelo menos um exercício**.
- Como o conteúdo de treino só existirá a partir da feature 3, nesta feature o resultado observável é: **a ação de ativar nasce bloqueada com mensagem clara** explicando o que falta ("adicione pelo menos um treino com exercícios para ativar" ou texto equivalente) — a pessoa vê a ação, entende o requisito e não consegue provocar a ativação.
- Com a feature 3 entregando conteúdo, a mesma guarda passa a deixar a ativação liberada quando o Programa tiver ≥1 treino com ≥1 exercício, e mantém o bloqueio com a mesma mensagem quando não tiver.
- Reativação (`inativo → ativo`) passa pela mesma guarda: um Programa inativo só reativa se o conteúdo mínimo existir.

### Edição por status

- **Rascunho e ativo são editáveis** (título, e conteúdo quando a feature 3 existir). O status "ativo" não impede edição — edição não é exclusiva do rascunho.
- **Inativo é somente leitura** (histórico preservado); a única ação possível sobre um inativo é **reativá-lo**, que é transição de status, não edição de conteúdo.
- Edição de título obedece à regra de título não-vazio, em qualquer status editável.

### Confirmação em ações de consequência

- Antes de **ativar**, **reativar** e **excluir**, o sistema pede **confirmação explícita** — a pessoa confirma ou cancela; cancelar não muda nada.
- O padrão visual e de comportamento é o **modal de confirmação já existente no projeto**, referenciado sem invenção: `components/pluto/DeleteConfirmModal.tsx` e `components/milon/DeleteExerciseConfirm.tsx` (Mílon #1) — mesmo formato de diálogo, botão de confirmar com rótulo apropriado à ação e estado ocupado durante o processamento (no estilo "Excluindo…"/"Confirmando…"), sem abrir caminho de duplo clique.
- A confirmação informa qual Programa será afetado (título e dono), para a pessoa saber o que está confirmando.
- Falha em qualquer ação mostra mensagem de erro visível, preserva o estado anterior e permite tentar de novo; nenhuma ação fecha tela ou muda status silenciosamente no erro.
- Sucesso da ação é comunicado pelo mesmo padrão de lembrete breve já usado no módulo, e a lista reflete o resultado novo.

### Exclusão de rascunho

- **Somente Programa em rascunho pode ser excluído** (decisões D3 + D8). Exclusão é ação nova do MVP.
- **Programa ativo e Programa inativo nunca são exclusíveis** — não há botão de excluir para eles em nenhuma tela. Para "se livrar" de um ativo a pessoa não tem essa via (o ativo só sai de ativo virando inativo por ativação de outro); o inativo é preservação de histórico e permanece até a decisão futura de tratá-lo de outra forma.
- A exclusão passa pela confirmação explícita acima e remove o Programa da lista.
- Com a feature 3 existindo, o que acontece com o conteúdo (treinos) de um rascunho excluído é responsabilidade da feature 3 — esta feature faz a exclusão do container.

### Tela própria de Programas com filtros

- Existe tela própria de Programas acessível pelo módulo de academia, com **lista única da família** (não há área privada nem seção separada por usuário).
- A tela tem dois filtros explícitos: **select de Dono** e **checks de Status**.
- **Padrão ao abrir:** dono = **o próprio usuário logado**; status = **todos marcados** (rascunho, ativo e inativo aparecem).
- **Ordenação padrão:** do **Programa mais novo para o mais antigo** (por data de criação), independentemente de status — não é ordenação por status. Reativar um Programa não altera sua posição por data de criação.
- Trocar dono ou desmarcar status refina/amplia a lista conforme a escolha; limpar o filtro de dono volta a ver a família inteira.
- Cada item da lista identifica **título, dono e status**, de modo que a pessoa saiba o que é cada linha sem abrir o Programa, e oferece as ações permitidas pelo status (editar, ativar/reativar, excluir só em rascunho).
- Lista vazia (para os filtros atuais) não é erro: mensagem amigável orientando a criar o primeiro Programa ou ajustar os filtros.
- Carregamento e falha seguem o padrão do módulo (indicador simples; erro com tentar de novo), como já homologado na feature 1.

### Dono como prioridade de exibição

- O dono existe para **decidir a exibição prioritária no dia a dia**. Nesta feature o efeito concreto é o padrão do filtro de Dono = próprio usuário ao abrir a tela.
- A prioridade de exibição **fora desta tela** é assunto da feature 4 (fora de escopo aqui, decidido no seu próprio discovery).

### O que esta feature entrega para as próximas

- O container "Programa" com título, dono e status, com o ciclo de vida acima, é a base que a feature 3 usará para pendurar treinos e a feature 4 usará para achar o Programa ativo do usuário.
- A guarda de ativação já nasce nesta feature como regra; com a feature 3 entregando conteúdo, ela passa a ser plenamente exercitada.

## 4. Fora de Escopo (YAGNI)

- Transições `rascunho → inativo` e `ativo → rascunho` — **refutadas no feedback da spec v1**; no lugar, exclusão de rascunho.
- **Exclusão de Programa ativo ou inativo** — nunca, no MVP.
- Permissões restritas por usuário: Programa tem dono, mas é visível, editável e transicionável pelos dois — decisão explícita do backlog e do discovery.
- **Exibição prioritária do dono fora da tela de Programas** (notadamente na tela "Treino do dia") — adiada formalmente para o discovery da feature 4.
- Conteúdo dos treinos (exercícios, séries, ordem A/B/C dentro do Programa) — feature 3.
- "Treino do dia", rotação e descoberta do próximo treino — feature 4.
- RPE/RIR, séries de aquecimento/extra, observações rápidas por exercício — fora do backlog por decisão explícita, nem V2/V3.
- Integração/importação de apps externos ou de fichas de terceiros.
- Geração de sugestões por IA em tempo de uso ou serviço externo durante o sorteio — o material é gerado uma vez por IA, validado pelo humano e embarcado; o sorteio é local e offline.
- Dashboard, métricas e histórico de treinos executados — features 4, 7 e 8.
- Qualquer tela de gestão avançada de Programas (renomeação em massa, reordenação manual de Programas, arquivos externos).

## 5. Critérios de Aceite (high-level, testáveis)

- Dada a tela de Programas vazia, quando a pessoa abre, então vê mensagem amigável de lista vazia com orientação para criar o primeiro Programa, sem mensagem de erro.
- Quando a pessoa abre o formulário de criação, então o campo de título já vem preenchido com uma sugestão sorteada da combinação templates + pools; ao fechar e abrir de novo, pode sortear outra sugestão.
- Dado o formulário de criação com a sugestão pré-preenchida, quando a pessoa apaga tudo e tenta salvar, então o salvamento é bloqueado com mensagem de título vazio e o formulário permanece aberto com o que foi digitado.
- Dado um Programa existente, quando a pessoa edita o título para vazio e tenta salvar, então o salvamento é bloqueado com a mesma mensagem, mantendo os dados.
- Dado um Programa em rascunho sem conteúdo, quando a pessoa tenta ativá-lo, então a ação aparece bloqueada com mensagem explicando que é preciso pelo menos um treino com exercícios; simulada a existência desse conteúdo (feature 3), a mesma guarda libera a ativação.
- Dado um Programa em rascunho, quando a pessoa confirma a ativação, então ele passa a ativo e, se havia outro Programa ativo do mesmo dono, esse anterior fica inativo automaticamente — nunca há dois ativos do mesmo dono ao mesmo tempo.
- Dados dois Programas do mesmo dono (um ativo e um inativo) com conteúdo mínimo, quando a pessoa reativa o inativo, então ele fica ativo e o anterior ativo fica inativo.
- Dado um Programa inativo, quando a pessoa abre para editar, então não há como alterar título nem conteúdo; a única ação disponível é reativar.
- Dados Programas em rascunho e ativo, quando a pessoa edita o título de cada um, então a edição é permitida nos dois, sempre com bloqueio de título vazio.
- Dado que a pessoa A transiciona um Programa da pessoa B, então a transição é permitida — qualquer um transiciona qualquer Programa.
- Dado um Programa em rascunho, quando a pessoa pede ativação, reativação ou exclusão, então um modal de confirmação no padrão do projeto aparece informando título e dono; ao cancelar, nada muda; ao confirmar, a ação é executada.
- Dado um Programa ativo ou inativo, quando a pessoa vê o item na lista, então **não existe** ação de excluir disponível para ele.
- Dado um rascunho com confirmação pendente, quando a pessoa confirma a exclusão, então o Programa some da lista; quando cancela, permanece intacto.
- Dado um Programa ativo ou inativo que não pode ser excluído, quando a pessoa procura a ação, então ela não existe em nenhuma tela — não há caminho de exclusão.
- Quando a pessoa abre a tela, então o select de Dono vem no próprio usuário e os checks de Status vêm todos marcados, e a lista está ordenada do mais novo para o mais antigo por data de criação.
- Dados Programas de ambos os donos e nos três status, quando a pessoa limpa o filtro de Dono, então vê a família inteira; ao desmarcar um status, os Programas daquele status somem da lista.
- Dados vários Programas do mesmo dono, quando a pessoa consulta com o padrão, então os mais recentes aparecem primeiro, mesmo misturando status; a reativação de um antigo não o move para o topo.
- Dado um Programa na lista, quando a pessoa vê o item, então identifica título, dono e status sem abrir o Programa e vê apenas as ações permitidas pelo status.
- Simulada falha de carregamento, então a pessoa vê mensagem simples de erro com opção de tentar de novo, no padrão do módulo.
- Simulada falha em ativação, reativação ou exclusão, então a mensagem de erro fica visível, o status da lista não muda e nenhuma tela fecha silenciosamente.
- Dado que o material de sugestões (templates e pools) foi gerado por IA, quando ele entra no produto, então passa pela validação humana antes — só material revisado compõe a pool de sorteio.
- Dado que a pessoa criou um Programa, quando o outro casal abre a tela com o próprio login, então vê o mesmo Programa, podendo editá-lo, ativá-lo ou excluí-lo se for rascunho.

## 6. Riscos e Dependências

- **Dependência da feature 1** (biblioteca de exercícios, Concluído): base de dados de exercícios que a feature 3 usará ao montar treinos dentro do Programa. Esta feature não mexe na biblioteca.
- **Dependência da feature 3** (treinos + séries): precisa do container "Programa" com status para pendurar os treinos; a ordem A/B/C vive dentro do Programa e será construída lá. A guarda de ativação (≥1 treino com ≥1 exercício) só será plenamente exercitada quando a feature 3 entregar conteúdo; até lá o comportamento observável é o bloqueio com mensagem. Mudanças de ciclo de vida desta spec (novas transições, exclusão de ativo/inativo) afetariam a feature 3 — qualquer mudança após aprovação exige revisão.
- **Dependência da feature 4** (treino do dia): consumirá o **Programa ativo do usuário** como ponto de partida da rotação; a unicidade do ativo por dono aqui é pré-requisito direto. A semântica de "exibição prioritária" do dono fora desta tela será decidida no discovery da 4.
- **Migração incremental nova** no banco do projeto Héstia, seguindo o padrão de migrações auditadas (arquivo novo, sem alterar migrações já aplicadas). Tabelas novas, sem tocar em dados do Pluto ou da biblioteca.
- **Garantia de unicidade do ativo por dono** sob transções quase simultâneas dos dois usuários: a regra está decidida (máximo um ativo por dono), mas o mecanismo de implementação que a garante em condições de corrida **será definido no plano** (Atena/Hefesto) — não é conteúdo desta spec.
- **Material da pool de sugestões:** templates e pools gerados por IA e validados pelo humano; se o tom sair estranho na homologação, o ajuste é trocar o material embarcado, não a arquitetura de sorteio.
- **Risco de nomenclatura:** "rascunho" foi escolhido para o terceiro status depois do humano apontar que "em edição" não descrevia o estado (edição vale também em ativo). Se na implementação o rótulo parecer confuso na tela, é ajuste de rótulo, não de regra.
- **Risco de escopo:** a tentação de "só mais uma telinha" (reordenação de treinos, renomeação em massa, gestão de inativos) deve ser recusada até a feature 3; esta feature é container + status + filtros + exclusão de rascunho.
- **Padrão de confirmação:** a decisão é reusar o modal existente (Pluto/Mílon 1); se a Atena identificar divergência de rótulos entre os dois modais existentes, unificar é assunto de plano, mantendo o comportamento especificado aqui.

## 7. Alternativas Consideradas (com trade-offs e escolha)

- **A — modelo de ativação (Pergunta 1):** (a) exatamente 1 ativo por dono com arquivamento automático ao criar novo; (b) alternância manual de ativo por botão; (c) "ativo" derivado do mais recente, sem estado explícito. **Escolhida a (a) como base**, ajustada pela resposta humana para um modelo de **3 status (rascunho, ativo, inativo)** com ativação explícita e efeito colateral no anterior — combina a regra dura de unicidade com a criação em etapas.
- **B — ciclo de vida (Pergunta 2):** reativar Programa antigo sim ou não. **Sim** — reativar é permitido mantendo um ativo por pessoa; a alternativa de inativos serem write-once teria forçado "voltar pra ficha antiga" a ser sempre um Programa novo, desperdiçando o próprio valor de preservar histórico.
- **C — nome do 3º status (Pergunta 3):** "rascunho" (escolhido) vs "não ativado" (literal mas negativo/awkward na UI) vs 2 status + flag "nunca ativado" (modela a vigência, mas é mais estado para o usuário). **Escolhido "rascunho"** por vocabulário já conhecido e separação clara entre maturidade (rascunho) e vigência (ativo/inativo).
- **D — quem transiciona (Pergunta 4):** (a) só o dono; (b) qualquer um dos dois; (c) dono transiciona o próprio, o outro sob condição. **Escolhida (b):** casal é um time, zero atrito; "dono" fica como prioridade de exibição, não como permissão — coerente com o backlog que já descarta permissão restrita.
- **E — tela de exibição (Pergunta 5):** (a) lista única da família com selos; (b) seção "do parceiro" separada; (c) só o próprio por padrão com toggle "ver todos". **Nenhuma das três literalmente:** o humano propôs **filtros explícitos (select Dono + checks de Status)** com padrão dono próprio + todos os status + ordenação mais novo→mais antigo — mais simples que (b) e mais transparente que (c), mantendo a lista única de (a).
- **F — identificação do Programa (Pergunta 6):** (a) título livre obrigatório; (b) título livre com sugestão padrão editável; (c) sem título, derivado de dono+data. **Escolhida (b)** com o agravante humano de sugestão **aleatória de tom maromba**; (c) descartada por ficar genérica na lista filtrada e impossível de distinguir dois Programas do mesmo dono.
- **G — ciclos adicionais de ciclo de vida (feedback da spec v1):** manter `rascunho → inativo` (cancelar) ou `ativo → rascunho`. **Refutadas pelo humano:** nenhuma dessas transições existe; em seu lugar, **exclusão de rascunho** entrou como ação nova, e exclusão de ativo/inativo ficou explicitamente proibida.
- **H — pool de sugestões de título (Pergunta 7):** (A) gerador combinatório puro com pools/templates escritos manualmente — variedade enorme e offline, mas exige trabalho manual de curadoria que o humano recusou; (B) lista fixa de frases prontas gerada uma vez por IA e commitada — tom afiado e esforço one-shot, mas variedade finita e frases soltas; (C) **escolhida:** IA gera uma vez os **templates e as pools de palavras**, o **humano valida**, e a **combinação/sorteio acontece em runtime** — variedade quase infinita, tom calibrado na geração, offline, manutenção zero e nenhum trabalho manual contínuo do usuário; a validação humana do material é parte da regra.
- **I — confirmação nas ações (feedback da spec v1):** sem confirmação (ágil, mas arriscado para ativação/exclusão) vs confirmação em tudo (atrapalha o fluxo). **Escolhida a via do meio ditada pelo humano:** confirmação explícita em **ativar, reativar e excluir**, no modal de confirmação já existente no projeto, sem invenção de padrão novo.
- **J — guarda de ativação (feedback da spec v1):** ativação livre desde a criação vs guarda por conteúdo. **Escolhida a guarda:** ativar exige ≥1 treino com ≥1 exercício; nesta feature a manifestação é a ação de ativar nascendo bloqueada com mensagem, porque o conteúdo vem da feature 3.
