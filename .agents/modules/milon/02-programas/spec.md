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

---

## Patch v3 — Navegação em abas do Mílon (2026-09-29)

> **Formato:** seção nova demarcada, anexada à spec v2 aprovada sem editar nem apagar nada das seções 1–7 acima — que permanecem integralmente válidas. Este patch soma a v3 da mesma spec.
>
> **Origem (pedido humano, 2026-09-29):** "Ao entrar em localhost:3000/milon, caímos direto na biblioteca de exercícios, sem opção de navegação para a tela de programas. Deveríamos ter abas, como em Pluto." A tela de Programas já existe (`app/milon/programs/page.tsx`, feature entregue e homologada); o que falta é a navegação entre as telas do módulo. Este patch também concretiza, sem alterá-lo, o que a seção 3 da spec v2 diz — "tela própria de Programas acessível pelo módulo de academia" — especificando **como** ela é acessível.

### P1. Escopo do patch — o que muda e o que não muda

**Muda (somente rotas e apresentação):**

1. Rotas do Mílon: a biblioteca ganha rota explícita e a raiz do módulo vira ponto neutro com redirect (D9).
2. Barra de navegação do Mílon deixa de ser vazia e passa a exibir duas abas (D10), com aba padrão definida (D11).
3. Passa a existir marca de "aba ativa" no layout de módulo compartilhado, derivada da URL — com efeito aceito no Pluto (D12).
4. Textos descritivos dos cards do dashboard (Mílon e Pluto) passam às redações exatas fornecidas pelo humano (D13).
5. Norma de navegação registrada para novos módulos (D14).

**Não muda:**

- **Toda a regra de negócio da spec v2** (ciclo de vida rascunho→ativo⇄inativo, unicidade do ativo por dono, guarda de ativação, filtros de dono/status, ordenação, confirmações, exclusão de rascunho, sugestões sorteadas, somente-leitura de inativos) permanece **integralmente válida e intocada**.
- `app/milon/programs/page.tsx` e toda a experiência da tela de Programas: inalteradas; rota `/milon/programs`: inalterada.
- Dados e banco: **nenhuma migração** — o patch é de rotas/UI; nenhum hook, repository ou tipo em `lib/milon/*` muda.
- Mascote do módulo: `lib/hestia/mascots.ts` resolve por prefixo (`/milon` casa `/milon/exercises` e `/milon/programs`) — verificado, sem impacto.
- Pluto: **não é reestruturado** — rotas, ordem e rótulos de suas abas existentes permanecem; só recebe o destaque de aba ativa já aceito (D12).
- Dashboard: hrefs dos cards permanecem (`/milon` e `/pluto/budget`) — só muda o parágrafo descritivo.

### P2. Decisões do patch (discovery com o humano, D9–D14)

- **D9 — Rotas (caminho B — escolhido):** biblioteca migra para rota explícita `/milon/exercises`; `/milon/programs` permanece; `/milon` (raiz) redireciona para a aba padrão. Alternativas do discovery: **(A)** manter a biblioteca servida em `/milon` (descartada: amarra a raiz do módulo a uma tela e não dá rota própria por aba); **(C)** fazer da raiz já o Programas sem rota explícita para a biblioteca (descartada como caminho único; o destino "raiz → Programas" foi adotado depois, em D11). B foi escolhida por dar rota explícita a cada aba e transformar a raiz em ponto neutro reversível.
- **D10 — Abas do MVP (caminho A — escolhido):** exatamente duas abas, "Exercícios" → `/milon/exercises` e "Programas" → `/milon/programs`; `pageTitle` "Biblioteca de exercícios" permanece na tela. Alternativas descartadas: rótulo "Biblioteca" (repete a palavra com o título da tela e é menos específico) e aba-placeholder de tela futura (anti-YAGNI — recusada).
- **D11 — Aba padrão (caminho B — escolhido):** `/milon` redireciona para **`/milon/programs`** — Programas é a cara do módulo no atalho do dashboard. Alternativa descartada: usar a biblioteca como padrão (manteria o destino antigo, mas deixaria o atalho do dashboard apontando para uma tela de cadastro de apoio). Efeito conhecido e aceito: quem entra pelo card do dashboard passa a cair em Programas, não na biblioteca.
- **D12 — Aba ativa (caminho A — escolhido):** a marca de aba ativa é implementada **uma única vez no layout de módulo compartilhado**, derivada da URL. **Impacto transversal aceito explicitamente pelo humano: as abas do Pluto passam a destacar a atual.** Alternativas descartadas: **(B)** não destacar (padrão incompleto — em duas abas de estilo igual o usuário não vê onde está) e **(C)** destacar só no Mílon (criaria bifurcação permanente por módulo no componente compartilhado — descartada).
- **D13 — Textos do dashboard (caminho iii — redação fornecida pelo humano, a ser usada exatamente):** card do Mílon = **"Módulo de Acompanhamento de Treinos e Evolução"**; card do Pluto = **"Módulo Orçamentário e Financeiro"**. Substituem, respectivamente, "Acesse a biblioteca de exercícios da academia." (hoje em `app/dashboard/page.tsx`, linha do card Mílon) e "Acesse o controle de orçamento anual, categorias de receitas e despesas previstas." (linha do card Pluto) — textos mapeados por leitura direta do arquivo.
- **D14 — Norma transversal para novos módulos:** o padrão adotado aqui **deve ser seguido por todos os módulos novos**: rotas explícitas por aba; raiz do módulo = ponto neutro com redirect para a aba padrão; barra de abas no layout de módulo com aba ativa visível. A norma **não retroage ao Pluto** (nada de reordenar, renomear ou mover rotas existentes do Pluto — o único efeito nele é o destaque de D12, já aceito).

### P3. Requisitos de navegação (patch)

**Rotas**

- **R1:** a biblioteca de exercícios passa a ser servida em `/milon/exercises`, com o mesmo conteúdo, `pageTitle` "Biblioteca de exercícios" e o mesmo comportamento homologado na spec v2 — muda apenas a URL.
- **R2:** `/milon/programs` continua exatamente como está.
- **R3:** acessar `/milon` (digitação no navegador, refresh ou card do dashboard) **redireciona para `/milon/programs`** — a pessoa termina na tela de Programas; a biblioteca não é exibida nesse caminho.
- **R4:** nenhum link interno aponta para a rota antiga da biblioteca além do card do dashboard, e esse card mantém o destino `/milon`, que funciona via redirect (verificado por busca: só `app/dashboard/page.tsx` linka `/milon`).

**Abas**

- **R5:** as telas `/milon/exercises` e `/milon/programs` exibem a barra de navegação do módulo com **exatamente dois itens**: "Exercícios" apontando para `/milon/exercises` e "Programas" apontando para `/milon/programs` — nenhum item adicional, nenhum placeholder.
- **R6:** a aba não substitui o cabeçalho da página: o `pageTitle` "Biblioteca de exercícios" permanece na tela da biblioteca, e "Programas" permanece na tela de Programas.
- **R7:** cada aba é link navegável: clicar troca de tela permanecendo dentro do módulo (mascote e título do módulo continuam visíveis nas duas telas).

**Aba ativa**

- **R8:** em toda tela com barra de navegação de módulo, **exatamente uma** aba aparece marcada como ativa — visualmente distinta das demais e identificável por tecnologia assistiva como a página atual.
- **R9:** a marca deriva da URL: ao chegar em qualquer URL do módulo por digitação, refresh ou deep link (sem clique anterior), a aba correta já aparece ativa; ao navegar por clique, a marca acompanha.
- **R10:** o comportamento é único para todos os módulos (sem regra por módulo): **as abas do Pluto também passam a exibir a marca de aba ativa** — impacto transversal aceito em D12.

**Dashboard**

- **R11:** o card do Mílon exibe exatamente "Módulo de Acompanhamento de Treinos e Evolução" e o card do Pluto exibe exatamente "Módulo Orçamentário e Financeiro" (D13); títulos, hrefs e demais elementos do dashboard permanecem.
- **R12 (norma D14):** o padrão de navegação para **novos módulos** é: rotas explícitas por aba, raiz do módulo com redirect para a aba padrão e barra de abas com aba ativa visível, no layout de módulo já usado pelo Pluto.

### P4. Critérios de aceite novos (testáveis)

- **CA-P3-01:** Dado que a pessoa acessa `/milon` (URL digitada ou card do dashboard), então ela termina na tela de Programas em `/milon/programs`; a biblioteca não aparece nesse caminho.
- **CA-P3-02:** Dado que a pessoa acessa `/milon/exercises`, então vê a biblioteca com título "Biblioteca de exercícios" e as mesmas funcionalidades homologadas da spec v2 (lista, filtro de músculo, busca, ordenação, mostrar mais, criar/editar/excluir com modais), mudando só a URL.
- **CA-P3-03:** Dado que a pessoa acessa `/milon/programs`, então a tela responde exatamente como descrito na spec v2 — nenhuma mudança observável.
- **CA-P3-04:** Nas telas `/milon/exercises` e `/milon/programs`, a barra exibe exatamente dois links: "Exercícios" com destino `/milon/exercises` e "Programas" com destino `/milon/programs`.
- **CA-P3-05:** Em `/milon/exercises`, "Exercícios" aparece marcada como ativa e "Programas" não; em `/milon/programs`, o inverso — sempre exatamente uma aba ativa.
- **CA-P3-06:** Acessada qualquer URL do módulo diretamente (digitação ou refresh), a aba ativa já corresponde à URL, sem depender de clique anterior.
- **CA-P3-07:** Em qualquer tela do Pluto (orçamento, meses, lançamentos), a aba correspondente à URL aparece marcada como ativa, pela mesma regra do Mílon (impacto transversal aceito).
- **CA-P3-08:** No dashboard, o card Mílon exibe exatamente "Módulo de Acompanhamento de Treinos e Evolução" e o card Pluto exibe exatamente "Módulo Orçamentário e Financeiro".
- **CA-P3-09:** No dashboard, o link do card Mílon continua com destino `/milon` e leva a Programas via redirect; o link do card Pluto continua com destino `/pluto/budget`.
- **CA-P3-10:** A busca pelos textos antigos — "Acesse a biblioteca de exercícios da academia." e "Acesse o controle de orçamento anual, categorias de receitas e despesas previstas." — retorna zero ocorrências em código de produção.
- **CA-P3-11:** Ao alternar entre as duas abas, a pessoa permanece no layout do módulo (mascote e título do Mílon visíveis nas duas telas) e o botão de voltar do navegador não a tira do módulo em uma troca simples de aba.
- **CA-P3-12:** Suíte completa verde (nenhum teste existente quebra) com coverage ≥ 80% mantido; `test-report.json` regenerado antes da review (gate do processo).

### P5. Fora de escopo do patch (YAGNI)

- **Home do Mílon / "Treino do dia" / terceira aba** — feature 4; aba-placeholder de tela futura foi explicitamente recusada.
- **Reestruturação do Pluto** (mover rotas, reordenar, renomear abas, mudar destinos) — fora; só o destaque de aba ativa entra (D12).
- **Aba ou rota de treinos/séries** — feature 3.
- **Ordem visual entre as duas abas do Mílon** — não é requisito desta patch: nenhum critério de aceite depende dela (decisão deliberada, não pendência).
- **Barra de navegação no dashboard, breadcrumbs, menu suspenso, atalho "voltar ao módulo" além do já existente** — fora.
- **Retroagir a norma D14 ao Pluto** (alterar rotas/rótulos/ordem existentes do módulo financeiro) — fora.
- **Alterar qualquer regra de negócio da spec v2** (ciclo de vida, filtros, confirmações, exclusão, guarda de ativação, sugestões) — intocadas por definição.
- **Migração ou mudança de dados** — nenhuma; o patch não toca em banco.
- **Redirecionamentos extras além de `/milon`** — não existe outra rota antiga: as únicas rotas do módulo são `/milon` e `/milon/programs` (verificado).

### P6. Impactos declarados (arquivos e testes, por leitura em disco)

**Produto/arquivos:**

- `app/milon/page.tsx` — deixa de compor a tela da biblioteca; a rota raiz passa a ser o ponto de redirecionamento para `/milon/programs`.
- Rota nova `/milon/exercises` — recebe a composição da biblioteca (mesmos componentes, hook e `pageTitle` de hoje).
- `components/milon/MilonLayout.tsx` — a lista de navegação, hoje vazia com comentário-placeholder, passa a declarar as duas abas (D10).
- `components/layout/ModuleLayout.tsx` (compartilhado por Pluto e Mílon) — passa a marcar a aba ativa derivada da URL; **impacto transversal aceito (D12): as abas do Pluto passam a destacar a atual**; um único comportamento, sem regra por módulo.
- `components/layout/PlutoLayout.tsx` e páginas `app/pluto/budget|months|transactions/page.tsx` — sem mudança de rota nem de estrutura; recebem apenas o destaque via componente compartilhado.
- `app/dashboard/page.tsx` — parágrafos dos dois cards substituídos pelas redações exatas de D13; hrefs inalterados.
- `lib/hestia/mascots.ts` — sem impacto (match por prefixo, verificado).
- `lib/milon/*` (hooks, repositories, tipos, utils) e banco — sem impacto: nenhum desses arquivos muda.

**Testes:**

- `__tests__/app/milon/page.test.tsx` — hoje importa a página de `@/app/milon/page` e cobre ~15 cenários da biblioteca; com a mudança de rota, os cenários passam a acompanhar a página em `/milon/exercises` (arquivo espelho no caminho novo) e **entra teste novo** cobrindo o redirect `/milon` → `/milon/programs`.
- `__tests__/app/dashboard/page.test.tsx` — as asserções existentes permanecem válidas (o href `/milon` não muda; os nomes "Mílon" e "Pluto" dos links vêm dos títulos, que não mudam); **muda o nome** do teste "renders Milon card linking to the exercise library", que deixa de descrever o destino real (agora Programas); **entram asserções** que travam os dois novos textos dos cards (CA-P3-08).
- `__tests__/app/milon/programs/page.test.tsx` — rota inalterada; verificado que o arquivo não faz asserções de links de rota, então a chegada da barra de abas não colide com cenários existentes.
- `__tests__/components/milon/MilonLayout.test.tsx` — asserções atuais (título, subtítulo, conteúdo) permanecem válidas; a barra de abas passa a ser coberta pelos testes das telas.
- `__tests__/app/pluto/*` — verificado por busca: nenhuma asserção existe sobre estado ativo da navegação (nenhuma ocorrência de marcação de navegação ou de ordem de abas); o destaque entra sem cobertura prévia a quebrar e ganha cobertura nova.
- `.agents/modules/milon/02-programas/test-scenarios.md` — ganha cenários de navegação (redirect da raiz, duas abas, aba ativa, textos do dashboard).
- `.agents/modules/milon/02-programas/test-report.json` — regenerado por Minos: rota nova e arquivo de teste espelhado novo alteram contagens e cobertura.

### P7. Riscos e Dependências (patch)

- **Destino antigo mudou (aceito):** links ou bookmarks para `/milon` caem em Programas, não na biblioteca — consequência direta de D11/D9; o único link interno afetado é o card do dashboard (verificado por busca).
- **Tela homologada do Pluto muda visualmente:** aceito explicitamente pelo humano (D12); fica declarado para Argos avaliar o diff como mudança aprovada.
- **Dependências:** feature 1 (biblioteca, concluída) e feature 2 (Programas, implementada) — patch não cria dependência nova de banco nem de outra feature.
- **Documentação da norma (D14):** registrar o padrão de navegação para novos módulos na documentação transversal é handoff para a fase de documentação (Mnemósine) — não é conteúdo de código deste patch.
- **Evolução futura:** a feature 4 pode querer outra home do Mílon; com D9 isso é uma troca do alvo do redirect, sem nova estrutura de rotas.

### P8. Por que este formato e estes caminhos (trade-offs resumidos)

- **Seção nova demarcada em vez de edição inline:** preserva o histórico aprovado da v2 sob a regra da spec v1 rejeitada (nada aprovado é apagado); a v3 inteira é revisável como bloco único.
- **B (rotas explícitas) venceu A e C:** dá rota própria por aba e torna a raiz neutra/reversível, ao custo de mover uma tela já homologada — custo mapeado em P6.
- **A (duas abas reais, sem placeholder)** venceu rótulo "Biblioteca" (redundância com o título) e aba-placeholder (armação morta).
- **D11 Programas como padrão** venceu manter a biblioteca como destino: o atalho do dashboard passa a mostrar o módulo novo; a troca é um alvo de redirect, reversível barato.
- **D12 destaque no componente compartilhado** venceu "sem destaque" (aba ativa invisível) e "só Mílon" (bifurcação permanente por módulo), aceitando o custo visual no Pluto.
