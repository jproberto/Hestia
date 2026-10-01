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

---

## Patch v4 — Achados da homologação (B/C) (2026-09-30)

> **Formato:** seção nova demarcada, anexada à spec sem editar nem apagar nada das seções 1–7 nem do Patch v3 — ambos permanecem integralmente válidos. Este patch soma a v4 da mesma spec.
>
> **Origem:** três achados da homologação manual encerrada após o Patch v3, com as decisões **já tomadas pelo humano** (caminhos B e C) — este amendment grava as decisões; não há hipótese aberta nem discovery novo. A numeração segue a sequência existente: D15+, R13+, CA-P3-13+.

### Q1. Escopo do patch — o que muda e o que não muda

**Muda:**

1. Comunicação de erro na tela de Programas: passa a haver distinção entre **erro de carga**, **erro de operação** e **bloqueio de domínio** (D15) — o modal de confirmação fecha nos dois últimos e o botão "Tentar novamente" fica exclusivo da carga.
2. Nova rota de **detalhe do programa** `/milon/programs/[id]`, com cabeçalho do programa e sem conteúdo de treinos (D16).
3. Navegação pós-salvar: **criação vai ao detalhe; edição permanece na lista** (D17).
4. Nota de handoff: cenários de teste não executáveis agora são repassados às features que os liberam (seção Q7).

**Não muda:**

- **Toda a regra da spec v2 e do Patch v3 permanece intocada:** ciclo de vida rascunho→ativo⇄inativo, unicidade do ativo por dono, guarda de ativação, edição por status, confirmações, exclusão de rascunho, filtros, ordenação, sugestões sorteadas, D9–D14 e as duas abas.
- **Modal de confirmação:** mesmo componente, mesmos rótulos, títulos e estados de processamento — só muda **quando ele fecha** (D15).
- **Formulário de criação/edição:** inalterado (validação de título vazio, sugestão sorteada, mensagem no modal).
- **Rotas existentes:** `/milon/programs` e `/milon/exercises` inalteradas; nenhuma aba nova (D10 do Patch v3 mantém exatamente duas).
- **Erro de carga:** mantido exatamente como homologado — banner com "Tentar novamente".
- **Banco e migração:** **nenhum** — a página de detalhe lê o modelo de dados já existente (id, título, dono, status, data de criação).

### Q2. Decisões do patch (D15–D17)

- **D15 — Mensagem de erro: três origens, modal fecha, "Tentar novamente" só na carga (caminho B — decisão exclusiva do humano):** quando a operação confirmada (ativar, reativar, excluir) termina **bloqueada por regra de domínio** (guarda de ativação; regra "somente rascunho pode excluir") **ou falha como erro de operação** (ex.: rede), o **modal de confirmação fecha** e a mensagem aparece em **banner no corpo da página, sem botão "Tentar novamente"**. O botão "Tentar novamente" fica **exclusivo do erro de carga** (falha do fetch da lista), que continua com banner + retry. **Motivo do achado (cenário 5 da homologação):** hoje a mensagem de bloqueio/operação cai em `components/milon/ProgramList.tsx` atrás do backdrop fixo de nível `z-50` de `components/milon/ProgramConfirmModal.tsx`, porque o modal permanece aberto por design do catch (`app/milon/programs/page.tsx`, comentário "Mantém a confirmação aberta") — a pessoa não lê a mensagem. **Base em disco:** `lib/milon/hooks/usePrograms.ts` registra bloqueio e falha de operação no mesmo estado de mensagem da lista (linhas 205–208 na ativação/reativação; 241–247 na exclusão, `setErrorMsg` + `throw`) e `components/milon/ProgramList.tsx` (linhas 93–97) renderiza a mensagem com "Tentar novamente" para **toda** origem — carga, operação e bloqueio indistintamente.
- **D16 — Página de detalhe do programa (caminho C, escopo mínimo — decisão exclusiva do humano):** nova rota `/milon/programs/[id]` correspondente à página de **detalhe do programa**, composta **apenas pelo cabeçalho do programa — título, dono e status** — derivados do modelo de dados existente (os mesmos campos que a lista já exibe). **Sem placeholder de treinos e sem seção de treinos:** os Treinos chegam na feature 3 e passarão a morar nessa página; nesta feature a tela é só o cabeçalho. A página segue o layout do módulo Mílon, **sem aba nova** (D10 do Patch v3 segue valendo).
- **D17 — Navegação pós-salvar: criação vai ao detalhe, edição permanece na lista (YAGNI justificado):** ao **salvar um programa novo**, a pessoa é navegada para `/milon/programs/<id>` do programa recém-criado. Ao **salvar uma edição**, ela **permanece na lista** `/milon/programs`. **Justificativa:** nesta feature a página de detalhe só tem cabeçalho (D16) — a edição é operação pontual sobre o container e a lista já reflete o dado atualizado; redirecionar a edição para o detalhe acrescentaria um passo de navegação sem entregar informação nova. Com a feature 3 fazendo a edição tocar conteúdo dentro do programa, a navegação pós-edição pode ser revisitada — declarado como evolução futura, **não** como pendência desta feature.

### Q3. Requisitos do patch (R13–R21)

**Origem da mensagem (D15)**

- **R13:** a tela de Programas distingue a **origem** de cada mensagem em três classes: **carga** (falha ao buscar a lista), **operação** (falha de ativação, reativação ou exclusão em execução) e **bloqueio de domínio** (guarda de ativação ou regra "somente rascunho pode excluir"). Toda mensagem aparece como banner no corpo da página, na mesma área de erro já usada na tela.
- **R14 (carga):** erro de carga → banner com o botão "Tentar novamente", cujo acionamento recarrega a lista — comportamento já homologado, mantido sem mudança.
- **R15 (bloqueio de domínio):** quando a pessoa confirma ativação, reativação ou exclusão e a regra de domínio bloqueia a operação, o **modal de confirmação fecha** e a mensagem do bloqueio aparece em banner **sem botão "Tentar novamente"**; status e lista permanecem como estavam. Para tentar de novo, a pessoa repete a ação pela via normal (botão na lista), quando o bloqueio deixar de existir.
- **R16 (erro de operação):** falha de execução (ex.: rede) em ativação, reativação ou exclusão segue o mesmo tratamento do bloqueio: **modal fecha**, banner **sem botão de retry**, estado anterior preservado — nenhum status muda.
- **R17 (visibilidade):** nenhuma mensagem de bloqueio ou de operação fica atrás do modal: como o modal fecha (D15), o banner no corpo da página é lido sem sobreposição — é o reparo direto do cenário 5 da homologação.

**Página de detalhe (D16/D17)**

- **R18 (rota de detalhe):** `/milon/programs/[id]` serve a página de detalhe do programa indicado pelo endereço, exibindo **apenas o cabeçalho — título, dono e status** — derivado do modelo de dados existente, dentro do layout do módulo Mílon (duas abas do Patch v3, nenhuma aba nova). A página **não** contém seção, título, mensagem ou placeholder de treinos.
- **R19 (id desconhecido):** um endereço que não corresponde a nenhum programa não pode exibir programa errado nem tela em branco sem explicação — segue o padrão de erro/estado vazio já usado no módulo.
- **R20 (navegação pós-criação):** ao salvar um programa novo, o destino é `/milon/programs/<id>` do programa recém-criado, com o cabeçalho dele; a lista não é o destino desse caminho. O fluxo de criação já recebe o programa salvo de volta (`save` devolve o Program criado) — a base para navegar existe sem mudança de contrato.
- **R21 (navegação pós-edição):** ao salvar a edição de um programa existente, a pessoa permanece em `/milon/programs`, com a lista refletindo o dado atualizado — **sem** navegação para o detalhe (D17).

### Q4. Critérios de aceite novos (testáveis) — CA-P3-13 … CA-P3-21

- **CA-P3-13 (bloqueio de domínio):** Dado que a pessoa confirma a ativação de um Programa sem conteúdo mínimo (guarda vigente nesta feature), quando o bloqueio é apurado, então o modal de confirmação **fecha**, a mensagem do bloqueio aparece em banner no corpo da página e **esse banner não tem botão "Tentar novamente"**; o status do Programa não muda.
- **CA-P3-14 (erro de operação):** Simulada falha de operação (ex.: rede) na confirmação de ativar, reativar ou excluir, então o modal fecha, a mensagem aparece em banner **sem** "Tentar novamente" e a lista mantém o status anterior.
- **CA-P3-15 (erro de carga):** Simulada falha do fetch da lista, então o banner de erro exibe "Tentar novamente" e o acionamento recarrega a lista — retry presente **somente** nesta origem de erro.
- **CA-P3-16 (visibilidade):** Após qualquer confirmação que termina em bloqueio ou falha de operação, **não permanece modal de confirmação aberto** sobre a tela e a mensagem está legível no corpo da página — o cenário 5 da homologação (mensagem atrás do backdrop) fica resolvido.
- **CA-P3-17 (rota de detalhe):** Dado que a pessoa acessa `/milon/programs/<id>` de um programa existente (navegação pós-criação, digitação no navegador ou refresh), então a página exibe título, dono e status daquele programa e **não** exibe qualquer seção ou texto de treinos.
- **CA-P3-18 (navegação pós-criação):** Dado que a pessoa cria um programa novo e salva, então ela termina em `/milon/programs/<id>` do programa criado, vendo o cabeçalho dele.
- **CA-P3-19 (navegação pós-edição):** Dada a edição salva de um programa existente, então a pessoa permanece em `/milon/programs` com a lista atualizada — sem passar pela página de detalhe.
- **CA-P3-20 (sem placeholder):** A página de detalhe não exibe placeholder de treinos: nenhuma mensagem do tipo "Treinos em breve", nenhuma seção de treinos, nenhuma lista vazia de treinos — a tela contém só o cabeçalho do programa.
- **CA-P3-21 (portão do processo):** Suíte completa verde (nenhum teste existente quebra) com coverage ≥ 80% mantido; `test-report.json` regenerado antes da review (gate do processo).

### Q5. Fora de escopo do patch (YAGNI)

- **Placeholder ou seção de treinos na página de detalhe** — feature 3; recusado explicitamente pelo humano ("Treinos em breve" não entra).
- **Entrada na página de detalhe por clique/linha da lista de Programas** — não decidida neste amendment; as entradas especificadas são a navegação pós-criação (R20) e o acesso direto por endereço (R18).
- **Editar, ativar, reativar ou excluir a partir da página de detalhe** — fora; as ações continuam na lista.
- **Navegação pós-edição para o detalhe** — recusada em D17 com justificativa; revisitar só se a feature 3 mudar o que a edição toca.
- **Nova aba ou rota de navegação** — fora (D10 do Patch v3: exatamente duas abas).
- **Botão "Tentar novamente" em erro de operação ou bloqueio de domínio** — recusado em D15.
- **Migração ou mudança de dados** — nenhuma; o patch não toca em banco.
- **Qualquer mudança de regra da spec v2 ou do Patch v3** — intocada por definição.

### Q6. Compatibilidade com a spec v2 e com o Patch v3

- A frase da v2 "Falha em qualquer ação mostra mensagem de erro visível, preserva o estado anterior e **permite tentar de novo**" ganha especificação em D15/R15/R16: a tentativa de novo é **repetir a ação pela via normal da lista**; o botão "Tentar novamente" no banner é exclusivo do erro de carga. Continua valendo que nada muda silenciosamente — status intacto e mensagem visível.
- A frase da v2 "**nenhuma ação fecha tela** ou muda status silenciosamente no erro" não é contrariada: quem fecha é o **modal de confirmação** (D15); a pessoa permanece na mesma tela de Programas, com a mensagem lida no corpo da página.
- O CA da v2 "Simulada falha em ativação, reativação ou exclusão, então a mensagem de erro fica visível, o status da lista não muda e nenhuma tela fecha silenciosamente" continua verificado — este patch **acrescenta** o fechamento do modal e a ausência do retry, sem remover nada.
- O Patch v3 permanece integral: nenhuma rota muda, nenhuma aba nova, D9–D14 intactos.

### Q7. Nota de handoff — cenários repassados às features que os liberam (achado 3)

Requisito de **processo**, não de produto: cenários de teste desta spec que **não podem ser executados agora** porque dependem de conteúdo de treino (feature 3) são **repassados à feature que os libera**, em vez de ficarem adormecidos ou virarem pendência desta feature. Exemplos já identificados na homologação:

- ativação **liberada** pela guarda com `hasWorkoutWithExercise` verdadeiro (o Programa tem ≥1 treino com ≥1 exercício) — correspondente à seção de guarda de ativação da spec v2;
- reativação liberada pelo mesmo critério de conteúdo mínimo;
- o efeito colateral (o ativo anterior do mesmo dono fica inativo) exercitado sobre programa com conteúdo real.

**Onde fica o registro:** `.agents/modules/milon/backlog.md` (backlog do módulo Mílon), anotado na fase de documentação pelo **Mnemósine**, apontando a feature 3 como dona desses cenários. Esta nota **não é critério de aceite** da feature 2 — não gera teste, task nem gate; é handoff de rastreio para não perder os cenários.

### Q8. Impactos esperados (arquivos e testes, por leitura em disco)

**Produto/arquivos:**

- `components/milon/ProgramList.tsx` — o banner deixa de ser único: passa a exibir retry **só** para erro de carga (hoje rose + "Tentar novamente" para toda mensagem, linhas 93–97).
- `lib/milon/hooks/usePrograms.ts` — bloqueio de domínio e falha de operação deixam de alimentar indistintamente a mesma mensagem da lista (hoje `setErrorMsg` + `throw`, linhas 205–208 e 241–247); a origem precisa chegar até a tela para R13.
- `app/milon/programs/page.tsx` — hoje mantém o modal aberto no erro (comentário "Mantém a confirmação aberta"); com D15 o modal fecha em bloqueio e falha, com a mensagem permanecendo visível. O mesmo arquivo recebe a navegação pós-criação (R20) mantendo a edição na lista (R21).
- Rota nova `app/milon/programs/[id]/page.tsx` — página de detalhe com cabeçalho (D16/R18); sem seção de treinos.
- `components/milon/ProgramConfirmModal.tsx` — inalterado (D15 muda quem o fecha, não o componente).

**Testes:**

- `__tests__/components/milon/ProgramList.test.tsx` — cenários do banner passam a separar carga (com retry) de operação/bloqueio (sem retry).
- `__tests__/lib/milon/hooks/usePrograms.test.ts` — origem da mensagem (carga × operação × bloqueio) e fechamento da confirmação.
- `__tests__/app/milon/programs/page.test.tsx` — modal fecha em bloqueio/falha com banner legível (CA-P3-13/14/16) e navegação pós-criação vs permanência na lista na edição (CA-P3-18/19).
- Teste novo da rota de detalhe (caminho espelhado em `__tests__/app/milon/programs/`) — CA-P3-17 e CA-P3-20.
- `.agents/modules/milon/02-programas/test-scenarios.md` — ganha os cenários do Patch v4.
- `.agents/modules/milon/02-programas/test-report.json` — regenerado por Minos: a rota nova e o teste novo alteram contagens e cobertura.

### Q9. Riscos e Dependências (patch)

- **Comportamento homologado muda de propósito:** o modal hoje permanece aberto no erro por decisão de implementação; D15 inverte isso — fica declarado para o Argos avaliar o diff como mudança aprovada, não regressão.
- **Mensagem sem retry pode parecer "travada":** mitigado por R15/R17 — a ação se repete pela via normal da lista e a mensagem permanece visível; se na homologação a pessoa pedir retry também na operação, é decisão nova, não ambiguidade desta spec.
- **Página de detalhe com endereço inválido:** R19 amarra ao padrão existente do módulo; nenhum dado de outro programa pode aparecer.
- **Handoff dos cenários (Q7):** se o registro no `backlog.md` do módulo não for feito na documentação, os cenários da feature 3 se perdem — é a única pendência de processo declarada aqui.
- **Dependências:** nenhuma dependência nova de banco ou de outra feature; a feature 3 continua sendo quem entrega o conteúdo de treino e quem poderá motivar revisitar a navegação pós-edição (D17).

---

## Patch v5 — Estados de tela centralizados (AsyncState) (2026-09-30)

> **Formato:** seção nova demarcada, anexada à spec sem editar nem apagar nada das seções 1–7, do Patch v3 (prefixos P) nem do Patch v4 (prefixos Q) — todos permanecem integralmente válidos. Este patch soma a v5 da mesma spec. Os prefixos de seção seguem a sequência P (v3) → Q (v4) → **S** (v5): a letra R é reservada aos requisitos (R1–R21 já usados), por isso foi pulada.
>
> **Origem:** discovery completo do Patch v5 conduzido pela Hera em sessão anterior (três alternativas de escopo apresentadas) e **decisão humana de 2026-09-30 — ALTERNATIVA 1: Mílon agora, Pluto em backlog**. A numeração continua a sequência existente: decisões **D18+**, requisitos **R22+**, critérios de aceite **CA-P5-x**. Nenhum ponto aberto: toda hipótese do discovery foi confirmada ou refutada pelo humano antes da redação desta seção.

### S1. Escopo do patch — o que muda e o que não muda

**Muda:**

1. Componente centralizado novo `components/ui/AsyncState.tsx` (com stories e teste) cobrindo os **4 estados de tela de lista** — carregando, erro, vazio e no-results — com **precedência fixa** entre eles (D18, D19).
2. O **erro passa a renderizar ACIMA do conteúdo, com a lista permanecendo visível** — correção do defeito do Cenário 5 da homologação (D19).
3. O botão "Tentar novamente" passa a ser **derivado de `errorOrigin` dentro do componente**: só `carga`; origem **ausente ⇒ `carga`**; `operacao` e `bloqueio` **sem retry** — R13 e R14 do Patch v4 herdados, sem mudança de regra (D20).
4. Adoção do componente no Mílon em **três telas**: `ProgramList`, `ExerciseList` e `app/milon/programs/[id]/page.tsx` (D21).
5. `useExercises` ganha `errorOrigin` — busca ⇒ `carga`, exclusão ⇒ `operacao` (D23).
6. `DeleteExerciseConfirm` **fecha em falha** de exclusão (D25) — mudança de comportamento homologado, com precedente no D15.
7. A união de origens ganha **casa única compartilhada em `lib/shared`** (D26) e `ProgramErrorOrigin` vira apelido.
8. Entregável de documentação: **norma no "Onde ponho X?" do AGENTS.md**, escrita pela Mnemósine na fase 7 (D27, com handoff).
9. **Pluto fica de fora agora** (decisão humana): o retrofit dos banners `transactions` e `months` vira item em `.agents/modules/pluto/backlog.md` (D24, handoff para a fase 7).

**Não muda:**

- **Toda a regra da spec v2, do Patch v3 e do Patch v4 permanece intocada:** ciclo de vida rascunho→ativo⇄inativo, unicidade do ativo por dono, guarda de ativação, filtros, ordenação, confirmações, sugestões sorteadas; rotas e as duas abas; R1–R21; CA-P3-1 a CA-P3-21.
- **As três origens de erro (R13–R16):** carga com retry, bloqueio e operação sem retry — a regra é a mesma; o que muda é **quem a aplica** (o componente, em vez de cada tela — D20).
- **Textos e mensagens:** rótulos de carregamento, mensagens de erro, estado vazio e estado de no-results mantêm exatamente os textos de hoje; muda a composição (banner acima), não o conteúdo.
- **Modais do Mílon:** `ProgramConfirmModal` inalterado — o D15 continua valendo na tela de Programas; `DeleteExerciseConfirm` mantém estrutura, rótulos e estados de processamento, mudando **apenas** o fechamento em falha (D25).
- **Pluto:** nenhum arquivo alterado (D24).
- **Banco e migração:** **nenhuma** — o patch é de UI e composição; nenhum repository, tipo de domínio de dados, tabela ou coluna muda.

### S2. Decisões do patch (D18–D27)

- **D18 — Componente centralizado único (caminho A — escolhido):** os 4 estados vivem num único componente presentacional em `components/ui/AsyncState.tsx`, com stories e teste, e as telas que já exibem esses estados passam a compor esse componente. **Alternativas descartadas nesta decisão (detalhe em S10):** hook + convenção; estender o `ModuleLayout`; criar "só um FeedbackBanner".
- **D19 — Precedência fixa e erro acima do conteúdo:** a precedência entre os 4 estados é fixa e segue a ordem já existente no código — **carregando → erro → vazio → no-results** — com a regra nova de composição: (a) `carregando` ocupa a região sozinho, sem nenhum outro estado junto; (b) `erro` **nunca substitui o conteúdo**: é exibido como banner **acima** da região e a lista carregada permanece visível — correção direta do Cenário 5, hoje resolvido por um ternário que troca a lista pela mensagem; (c) `vazio` significa que a base não tem registros para os filtros atuais e `no-results` que existem registros, mas filtros ou busca não deixam nenhum visível — `vazio` prevalece sobre `no-results`; (d) havendo erro **sem conteúdo carregado** (falha de carga), a precedência do erro sobre `vazio` e `no-results` faz valer **só o banner** — a tela não chega a dizer "nenhum item" quando o que houve foi falha.
- **D20 — Retry derivado de `errorOrigin` dentro do componente:** o componente decide o "Tentar novamente" pela origem da mensagem: `carga` ⇒ com retry; origem **ausente ou não informada ⇒ tratada como `carga`** (com retry); `operacao` e `bloqueio` ⇒ **sem retry**. É a herança literal de R13 e R14 (Patch v4): muda o **dono** da decisão (de cada tela para o componente), não a regra. Hoje a normalização de origem ausente para `carga` acontece na página de Programas antes de repassar ao `ProgramList`, e o `ProgramList` só exibe o botão com origem explícita `carga`; dentro do componente o padrão passa a ser interno, mantendo o comportamento observado nas telas.
- **D21 — Adoção no Mílon nas três telas que hoje exibem esses estados:** `components/milon/ProgramList.tsx`, `components/milon/ExerciseList.tsx` e `app/milon/programs/[id]/page.tsx` passam a compor o componente centralizado. Verificado por busca: são as **únicas** ocorrências de "Tentar novamente" em `app/` e `components/` hoje — a adoção nelas é o que viabiliza a prova de herança (CA-P5-7).
- **D22 — "Fechar ✕" no banner de erro: descartado (YAGNI):** não existe necessidade real de dispensar a mensagem manualmente — o banner desaparece sozinho quando o estado muda (retry, nova carga, sucesso) e um botão de fechar deixaria a mensagem sem rastro. Registro de descarte deliberado, não pendência.
- **D23 — `useExercises` ganha `errorOrigin`:** a busca (carga inicial e recarga) alimenta a origem **`carga`**; a **exclusão** alimenta **`operacao`**. Hoje o hook grava a falha de exclusão no mesmo estado de erro da busca (achado latente (a) de S6), o que produz retry indevido na lista.
- **D24 — Pluto fora agora; retrofit vira item de backlog (decisão humana de 2026-09-30, Alternativa 1):** nenhum arquivo do Pluto entra nesta patch. O **retrofit dos banners** `app/pluto/transactions/page.tsx` e `app/pluto/months/page.tsx` para o componente centralizado é registrado como **item em `.agents/modules/pluto/backlog.md`**, anotado pela **Mnemósine na fase 7** — entregável futuro desta norma, fora do diff desta feature. **Justificativa registrada:** o `errorMsg` e o `errorMessage` do Pluto são **mistos, sem origem rotulada** — cada banner é alimentado por vários fluxos indistintamente; migrar exigiria **inventar decisões de classificação** (carga × operação × bloqueio) em código homologado, sem discovery fechado. Esse trabalho pertence ao retrofit, não a esta patch.
- **D25 — `DeleteExerciseConfirm` fecha em falha de exclusão (mudança de comportamento homologado, precedente D15):** quando a exclusão confirmada falha, o **modal de confirmação fecha** e a mensagem aparece em **banner no corpo da página, sem "Tentar novamente"** (origem `operacao`) — mesmo tratamento do D15 na tela de Programas. Hoje `app/milon/exercises/page.tsx` mantém a confirmação aberta no erro (comentário "Mantém a confirmação aberta") e a mensagem cai atrás do backdrop fixo de nível `z-50` do modal (achado latente (b) de S6).
- **D26 — União de origens com casa única compartilhada em `lib/shared`:** a união de origens (`carga`, `operacao`, `bloqueio`) passa a morar em `lib/shared`, casa única acessível a qualquer módulo e ao componente transversal de `components/ui` — `AsyncState` **não pode importar tipo de dentro de um módulo**. `ProgramErrorOrigin`, hoje exportado por `lib/milon/types.ts`, permanece ali como **apelido** do tipo compartilhado: nenhum importador existente quebra e o retrofit futuro do Pluto usa a mesma casa, sem decisão nova quando o backlog for atacado.
- **D27 — Norma transversal no AGENTS.md (entregável de documentação, handoff da fase 7):** a norma "estados de tela de lista (carregando, erro, vazio, no-results) vão no componente centralizado; mensagens com origem usam a união de origens de `lib/shared`; retry é derivado de `errorOrigin`" é escrita por **Mnemósine** na seção **"Onde ponho X?"** do `AGENTS.md`, na fase de documentação — não é conteúdo de código desta patch.

### S3. Requisitos do patch (R22–R31)

**Componente centralizado (D18–D20)**

- **R22:** existe `components/ui/AsyncState.tsx` — componente presentacional único que cobre os **4 estados** (carregando, erro, vazio, no-results) e é a forma padrão de compor esses estados em telas de lista; acompanha **stories** (arquivo ao lado do componente, padrão do projeto) e **teste automatizado**.
- **R23 (precedência fixa):** o componente aplica a precedência **carregando → erro → vazio → no-results** conforme D19: `carregando` ocupa a região sozinho; `vazio` prevalece sobre `no-results`; erro sem conteúdo carregado exibe só o banner, sem mensagem de vazio nem de no-results.
- **R24 (erro acima do conteúdo):** havendo erro, o banner é renderizado **acima** da região de conteúdo e a **lista carregada permanece visível e legível** — o componente nunca substitui a lista por uma mensagem de erro (reparo direto do Cenário 5).
- **R25 (retry por origem):** o "Tentar novamente" é decidido **dentro do componente** pelo `errorOrigin`: `carga` ⇒ exibe o botão e aciona o retry recebido; origem **ausente ⇒ tratada como `carga`**; `operacao` e `bloqueio` ⇒ **sem botão**. R13 e R14 do Patch v4 herdados, sem mudança de regra.

**Adoção no Mílon (D21, D23, D25)**

- **R26:** `ProgramList`, `ExerciseList` e `app/milon/programs/[id]/page.tsx` compõem o componente centralizado para os 4 estados, mantendo **os mesmos textos** de carregamento, erro, vazio e no-results de hoje; a lógica de qual estado exibir e de quando há retry deixa de ser escrita nesses três arquivos.
- **R27 (`useExercises` com origem):** o retorno de `useExercises` passa a expor `errorOrigin`, alimentado por **busca ⇒ `carga`** e **exclusão ⇒ `operacao`**; a lista de exercícios repassa a origem ao componente — mesmo formato de contrato que `usePrograms` já expõe.
- **R28 (exclusão fecha em falha):** falha de exclusão confirmada na biblioteca ⇒ o **modal de confirmação fecha** e a mensagem aparece em **banner no corpo da página, sem "Tentar novamente"** (origem `operacao`); lista e registro permanecem como estavam. Mudança de comportamento declarada (D25, precedente D15).
- **R29 (casa compartilhada):** a união de origens passa a morar em `lib/shared` e a ser exportada pelo barrel do diretório; `ProgramErrorOrigin` continua exportado por `lib/milon/types.ts` como **apelido**, sem quebra de nenhum importador existente; `AsyncState` não importa nada de `lib/milon`.

**Entregáveis de processo (D24, D27)**

- **R30 (handoff Pluto):** nenhum arquivo do Pluto é alterado; o retrofit dos banners `transactions` e `months` é registrado como item em `.agents/modules/pluto/backlog.md` pela Mnemósine na fase 7 — entregável futuro desta norma, fora do diff desta feature.
- **R31 (norma AGENTS.md):** a norma de D27 é escrita por Mnemósine na seção "Onde ponho X?" do `AGENTS.md` na fase 7 — entregável de documentação desta feature, com handoff declarado.

### S4. Critérios de aceite novos (testáveis) — CA-P5-1 a CA-P5-9

- **CA-P5-1 (Cenário 5 corrigido):** Dado que a pessoa executa uma ação que termina em bloqueio de domínio ou falha de operação na tela de Programas, então o banner de erro aparece **acima** do conteúdo e a **lista de programas permanece visível** e legível — o defeito do Cenário 5 da homologação (banner substituindo a lista) fica corrigido.
- **CA-P5-2 (precedência dos 4 estados):** Testada a precedência fixa nos 4 estados: com `carregando` verdadeiro, só o carregamento aparece; havendo erro, o banner fica acima e o conteúdo permanece (lista visível quando há itens; **sem** mensagem de vazio nem de no-results quando não há conteúdo carregado); sem erro e sem registros, `vazio`; sem erro, com registros escondidos por filtros ou busca, `no-results`.
- **CA-P5-3 (retry só em carga ou origem ausente):** mensagem de erro com origem `carga` **ou sem origem informada** ⇒ exibe "Tentar novamente" e o acionamento dispara o retry recebido; mensagem com origem `operacao` ou `bloqueio` ⇒ **sem** o botão.
- **CA-P5-4 (contrato completo coberto):** o teste do componente cobre o contrato completo — os 4 estados, as quatro entradas de origem (`carga`, `operacao`, `bloqueio`, ausente), a presença e a ausência do retry e a lista permanecendo visível sob erro; nenhum ramo do contrato fica sem asserção.
- **CA-P5-5 (adoção preserva a homologação):** os critérios **CA-P3-13, CA-P3-14, CA-P3-15 e CA-P3-16** continuam verdes com a adoção: bloqueio fecha o modal e mostra banner sem retry; falha de operação idem; falha de carga com retry que recarrega a lista; nenhuma mensagem permanece atrás do modal.
- **CA-P5-6 (biblioteca — exclusão):** Dado que a pessoa confirma a exclusão de um exercício e ela falha, então o **modal de confirmação fecha**, a mensagem aparece em banner **acima** da lista **sem** "Tentar novamente" (origem `operacao`) e a lista mantém o exercício.
- **CA-P5-7 (prova de herança):** a busca pela cadeia `Tentar novamente` em `app/` e `components/` retorna ocorrência **somente** em `components/ui/AsyncState.tsx` — **zero** ocorrências em `ProgramList`, `ExerciseList`, `app/milon/programs/[id]/page.tsx` e em qualquer outra tela.
- **CA-P5-8 (norma no AGENTS.md):** após a fase 7, a seção "Onde ponho X?" do `AGENTS.md` contém a norma de estados centralizados de D27 — verificável por leitura e busca do texto normativo no arquivo.
- **CA-P5-9 (portão do processo):** suíte completa verde (nenhum teste existente quebra), coverage ≥ 80% mantido e `test-report.json` regenerado antes da review (gate do processo).

### S5. Fora de escopo do patch (YAGNI)

- **Modais (erro e sucesso internos)** — os modais de formulário e confirmação continuam com o seu próprio erro interno ("nunca fecha no erro", padrão homologado); o componente centralizado não entra em modal.
- **Erro de login** — fluxo de autenticação intocado.
- **Estados com CTA ou enlace** (por exemplo `BudgetEmptyState` e equivalentes que direcionam para outra tela) — o componente cobre os 4 estados sem enlace; estados com ação linkada ficam de fora.
- **Fallback do Suspense do orçamento** — fora; é fallback de rota, não estado de lista.
- **Loading interno do `AccountCardGrid`** — fora; é loading local de um card, não estado de página.
- **Vazio do checklist** — fora; segue o padrão próprio do checklist.
- **Dashboard** — fora.
- **Pluto (retrofit dos banners `transactions` e `months`)** — fora agora; vira item em `.agents/modules/pluto/backlog.md` (D24, handoff da fase 7).
- **Banco e migração** — nenhuma; o patch não toca em dados.
- **"Fechar ✕" no banner de erro** — descartado em D22 (YAGNI).
- **Qualquer tela ou componente do Mílon além das três de D21** — a adoção é explícita e limitada a elas.
- **Qualquer mudança de regra da spec v2, do Patch v3 ou do Patch v4** — intocada por definição.

### S6. Achados latentes declarados

- **(a) `useExercises` rotulava exclusão como carga, com retry indevido:** a falha de exclusão alimentava o mesmo estado de erro da busca (ramo de `remove` em `lib/milon/hooks/useExercises.ts`) e `ExerciseList` renderizava "Tentar novamente" para ela — recarregar a lista não resolve falha de exclusão e a origem real (`operacao`) ficava escondida. **Corrigido por D23 e R27.**
- **(b) Falha de exclusão da Biblioteca ficava atrás do backdrop do modal** — o mesmo bug do Cenário 5 em outra tela: `handleDeleteConfirm` mantém a confirmação aberta no erro (`app/milon/exercises/page.tsx`, comentário "Mantém a confirmação aberta") e `DeleteExerciseConfirm` é um backdrop fixo de nível `z-50`, enquanto o hook manda a mensagem para a lista atrás dele. **Corrigido por D25 e R28.**

### S7. Alvos por arquivo (produto e testes, por leitura em disco)

**Produto:**

- `components/ui/AsyncState.tsx` — **novo**: 4 estados, precedência fixa, banner de erro acima do conteúdo e retry derivado de `errorOrigin` (D18–D20).
- `components/ui/AsyncState.stories.tsx` — **novo**, arquivo ao lado do componente (padrão do projeto), cobrindo os 4 estados e as origens.
- `components/milon/ProgramList.tsx` — substitui a cadeia `carregando`/`erro`/`vazio`/`no-results` (hoje nas linhas 86–116) pela composição do componente; deixa de decidir o retry sozinho (hoje nas linhas 93–97) e repassa `errorOrigin`.
- `components/milon/ExerciseList.tsx` — mesma substituição na cadeia a partir da linha 95; hoje não recebe origem nenhuma e passa a receber de `useExercises`.
- `app/milon/programs/[id]/page.tsx` — mesma substituição na cadeia de carregamento, erro e não-encontrado a partir da linha 21; o estado "não encontrado" continua distinto de falha de carga.
- `app/milon/programs/page.tsx` — a normalização atual de origem ausente para `carga` (hoje linha 198) passa a ser interna ao componente; a página continua repassando a origem do hook.
- `lib/milon/hooks/useExercises.ts` — ganha `errorOrigin` no retorno: busca ⇒ `carga`, exclusão ⇒ `operacao` (D23).
- `app/milon/exercises/page.tsx` — `handleDeleteConfirm` deixa de manter a confirmação aberta no erro e passa a fechá-la (D25).
- `lib/milon/types.ts` — `ProgramErrorOrigin` (hoje linha 38) vira **apelido** do tipo de `lib/shared` (D26).
- `lib/shared/` — a união de origens ganha casa nova (arquivo do diretório e export no barrel `index.ts`) (D26).
- `components/milon/ProgramList.stories.tsx` e `components/milon/ExerciseList.stories.tsx` — ajuste do contrato de props para o componente centralizado (hoje o stories do `ProgramList` já exercita as três origens).

**Testes:**

- `__tests__/components/ui/AsyncState.test.tsx` — **novo**: precedência, banner acima com lista visível, retry por origem e contrato completo (CA-P5-2, CA-P5-3, CA-P5-4).
- `__tests__/components/milon/ProgramList.test.tsx` — adaptado à composição nova, preservando as asserções de origem existentes (CA-P5-1, CA-P5-5).
- `__tests__/components/milon/ExerciseList.test.tsx` — adaptado: estados e origem vinda do hook.
- `__tests__/app/milon/programs/[id]/page.test.tsx` — adaptado: falha de carga com retry preservado.
- `__tests__/app/milon/programs/page.test.tsx` — mantém e reexecuta CA-P3-13, CA-P3-14, CA-P3-15 e CA-P3-16 (CA-P5-5).
- `__tests__/app/milon/exercises/page.test.tsx` — exclusão falha fecha a confirmação e banner sem retry (CA-P5-6).
- `__tests__/lib/milon/hooks/useExercises.test.ts` — `errorOrigin` de busca e de exclusão (D23).
- `__tests__/lib/milon/types.test.ts` — assegura que o apelido `ProgramErrorOrigin` segue exportado de `lib/milon/types.ts` (D26).
- `.agents/modules/milon/02-programas/test-scenarios.md` — ganha os cenários do Patch v5 e **reexecuta o Cenário 5**, hoje registrado como "executado com defeito — correção em análise no Patch v5".
- `.agents/modules/milon/02-programas/test-report.json` — regenerado por Minos: componente e testes novos alteram contagens e cobertura.

**Documentação (fase 7, Mnemósine — handoff, fora do diff de código):**

- `AGENTS.md` — norma no "Onde ponho X?" (D27, R31).
- `.agents/modules/pluto/backlog.md` — item de retrofit dos banners `transactions` e `months` (D24, R30).

### S8. Riscos e Dependências (patch)

- **Comportamento homologado muda (declarado):** o erro deixa de substituir a lista (Cenário 5) e a exclusão da biblioteca passa a fechar a confirmação em falha — duas mudanças de comportamento aprovadas (D19, D25), para o Argos avaliar o diff como mudança aprovada e não como regressão.
- **Componente transversal novo:** `components/ui/AsyncState.tsx` fica disponível para qualquer tela — risco de adoção acidental fora do escopo; mitigado por D21 (adoção explícita em três telas), pela prova de herança (CA-P5-7) e pela norma de D27.
- **Regressão visual nos estados:** mensagens de carregamento, erro, vazio e no-results devem sair idênticas às de hoje — risco de reescrever texto durante a extração; travado por CA-P5-5.
- **Prova de herança sensível a texto:** qualquer tela nova que escreva "Tentar novamente" fora do componente quebra CA-P5-7 — é proposital: a norma de D27 proíbe exatamente isso.
- **Handoffs da fase 7 (D24 e D27):** se a Mnemósine não registrar a norma no AGENTS.md nem o item no backlog do Pluto, ambos se perdem — única pendência de processo declarada aqui.
- **Dependências:** herda diretamente do Patch v4 (R13–R21, D15–D17); nenhuma dependência de banco ou de outra feature; as features 1 e 2 permanecem entregues e intactas.

### S9. Handoffs de processo (fase 7 — Mnemósine)

1. **Norma (D27, R31):** escrever na seção "Onde ponho X?" do `AGENTS.md` a norma de estados centralizados — componente de estados para os 4 estados, união de origens em `lib/shared`, retry derivado de `errorOrigin`.
2. **Retrofit do Pluto (D24, R30):** registrar em `.agents/modules/pluto/backlog.md` o item de retrofit dos banners `transactions` e `months` para o componente centralizado, com a nota de que o `errorMsg` misto precisa de classificação de origem antes da migração.

Ambos são entregáveis de documentação desta feature, anotados na fase de documentação; **não geram teste, task de código nem gate** — são handoff de rastreio.

### S10. Alternativas descartadas (com trade-offs)

- **Hook + convenção (sem componente):** um hook de estados mais uma convenção de uso, mantendo a composição escrita em cada tela. **Descartada:** a convenção não garante precedência e retry idênticos nas três telas de hoje nem nas próximas; a cadeia continuaria duplicada; e a prova de herança (CA-P5-7) não teria alvo único para buscar.
- **Estender o `ModuleLayout`:** fazer o layout de módulo renderizar os estados. **Descartado:** o layout é cabeçalho e abas compartilhados por todas as telas do módulo, inclusive as que não têm lista (como o detalhe com "não encontrado"); acoplar estados de conteúdo a ele criaria efeito colateral transversal permanente — o mesmo tipo de custo do D12, sem benefício equivalente.
- **Só um FeedbackBanner:** criar apenas o componente de banner de erro. **Descartado:** resolveria só a camada de erro e deixaria carregando, vazio e no-results duplicados nas três telas; não fecha o defeito de precedência do Cenário 5 nem entrega a herança.
- **Alternativa 2 de escopo (Pluto junto agora):** Mílon mais retrofit dos banners `transactions` e `months` na mesma patch. **Descartada pela decisão humana de 2026-09-30 (Alternativa 1):** o `errorMsg` do Pluto é misto, sem origem rotulada — migrar exigiria inventar decisões de classificação em código homologado; adiar separa o risco e mantém a patch com escopo de produto único.
- **Alternativa 3 de escopo (Pluto antes do Mílon):** começar pelo retrofit do Pluto e deixar a adoção do Mílon para depois. **Descartada pela mesma decisão:** o defeito do Cenário 5 vive no Mílon e é o que trava a homologação da feature — adiar manteria o defeito vivo enquanto se refatora um módulo sem defeito declarado.

---

## Patch v6 — Link no título do item da lista (2026-10-01)

> **Formato:** seção nova demarcada, anexada à spec sem editar nem apagar nada das seções 1–7, do Patch v3 (P), do Patch v4 (Q) nem do Patch v5 (S) — todos permanecem integralmente válidos. Este patch soma a v6 da mesma spec. Os prefixos de seção seguem a sequência P (v3) → Q (v4) → S (v5) → **T** (v6; a letra R continua reservada aos requisitos). A numeração de conteúdo segue a existente: decisões **D28+**, requisitos **R32+**, critérios de aceite **CA-P6-x**.
>
> **Origem:** discovery anterior conduzido pela Hera com o humano, cujas **5 decisões (a–e) estão todas fechadas**, somado à **decisão humana de 2026-10-01 — ALTERNATIVA C** para a afordância do link (mudança de cor no hover, padrão dashboard, sem sublinhado); guardian autorizou SPEC_DRAFT. **Nenhum ponto aberto:** toda hipótese do discovery foi confirmada ou refutada pelo humano antes da redação desta seção.

### T1. Escopo do patch — o que muda e o que não muda

**Muda (somente a apresentação do título de um item da lista):**

1. O **título de cada item do `ProgramList`** passa a ser **link** para a página de detalhe do programa — `/milon/programs/<id>` — renderizado com o **`Link` do Next.js** (D28).
2. A **afordância do link** é **mudança de cor no hover**, no padrão do dashboard: o marrom `#B7602B` do título passa a um tom mais claro/escuro do marrom quando o mouse chega, **sem sublinhado** — nem no hover, nem em repouso — e com **foco visível** por teclado (D30, alternativa C).
3. O **`h3` permanece heading**, com o link **dentro** dele (D29).
4. As **ações** (Editar/Ativar/Reativar/Excluir) ficam **intactas como botões à direita**, fora do link (D31). As demais entradas na página de detalhe continuam as já especificadas: navegação pós-criação (R20) e acesso direto por endereço (R18).

**Não muda:**

- **Toda a regra da spec v2, do Patch v3, do Patch v4 e do Patch v5 permanece intocada:** ciclo de vida rascunho→ativo⇄inativo, unicidade do ativo por dono, guarda de ativação, filtros, ordenação, confirmações, exclusão de rascunho, sugestões sorteadas, as duas abas, as três origens de erro e o componente centralizado de estados.
- **Página de detalhe** `app/milon/programs/[id]/page.tsx` (D16/R18): inalterada — este patch apenas passa a **linkar** para ela a partir da lista, encerrando o ponto que o Patch v4 deixou explicitamente em aberto ("entrada na página de detalhe por clique/linha da lista — não decidida neste amendment", Q5).
- **Hooks, modais, tipos, repositórios e banco:** nenhum arquivo desses muda; a lista continua recebendo itens filtrados via props.
- **`ExerciseList` e a biblioteca, Pluto, dashboard e as demais telas do Mílon:** inalterados.
- Dono, selo de status, filtros e os quatro estados de lista: inalterados — muda só o título.

### T2. Decisões do patch (D28–D32 — discovery a–e, todos fechados)

- **D28 (a) — Link no título apontando para o detalhe:** o título de cada item da lista vira link para `/milon/programs/<id>` — o id do próprio programa — usando o **`Link` do Next.js**. É o caminho de entrada na página de detalhe a partir da lista; a página de destino já existe desde o Patch v4 e **nenhuma rota nova** nasce aqui.
- **D29 (b) — Estrutura: `h3` permanece heading com o link dentro:** o elemento do título segue sendo heading de nível 3 com o link por dentro — **não** se envolve o `h3` inteiro em um link, **não** se transforma a linha (nem o bloco de título/dono/selo) em link. Mantém a hierarquia de headings (h2 da seção, h3 por item) e o nome do heading continua sendo o texto do programa.
- **D30 (c) — AFORDÂNCIA: decisão humana de 2026-10-01 — ALTERNATIVA C (mudança de cor no hover, sem sublinhado, padrão dashboard):** em repouso o título permanece `#B7602B`; **no hover a cor muda** para um tom mais claro/escuro do marrom, com transição de cor, **sem sublinhado em qualquer estado**, e o link exibe **foco visível** quando alcançado por teclado. É o mesmo princípio do título do card do dashboard, que muda de cor no hover. **Alternativas descartadas:** **A** (sublinhado no hover e/ou no foco) e **B** (sublinhado permanente) — trade-offs em T8.
- **D31 (d) — Ações intactas, fora do link:** o link cobre **apenas o texto do título**; os botões de ação (Editar/Ativar/Reativar/Excluir) permanecem à direita, com os mesmos rótulos, mesmas condições por status e mesmos callbacks, **fora** do link — acionar uma ação **nunca navega**. Dono e selo de status continuam texto simples, não clicáveis, e a linha inteira **não** vira link.
- **D32 (e) — Acessibilidade (role, nome e foco):** o título segue sendo heading com nome igual ao texto do programa; o link dentro dele é identificado como link com **o mesmo nome** (nome acessível igual ao título) e é alcançável por teclado com **foco visível** — a tecnologia assistiva anuncia o título como heading e o link como link, sem perda de semântica.

### T3. Requisitos do patch (R32–R37)

**Link e navegação (D28)**

- **R32:** o título de cada item da lista é um link com **href exato** `/milon/programs/<id>` — o `<id>` do programa daquele item — renderizado com o `Link` do Next.js; um link por item, cada um apontando para o próprio programa.
- **R33:** clicar no título leva a pessoa à página de detalhe `/milon/programs/<id>` daquele programa, que responde com o cabeçalho dele (rota e comportamento já entregues no Patch v4, R18) — o caminho vale para programa em rascunho, ativo ou inativo.

**Estrutura (D29)**

- **R34:** o título permanece heading `h3` com o link **dentro** dele; a hierarquia de headings não muda (h2 na seção da lista, h3 por item) e o texto visível do título é o mesmo de hoje.

**Afordância (D30)**

- **R35:** fora do hover, o título permanece `#B7602B` **sem sublinhado**; **no hover**, a cor muda para um tom diferente do marrom (mais claro ou mais escuro, na direção do padrão do dashboard), com transição de cor e **sem sublinhado**; no foco por teclado, o link exibe **foco visível** (contorno ou anel) e **não** ganha sublinhado. **Nenhum estado do título usa sublinhado** — o tom exato de hover é escolha de implementação no plano, o requisito fixado aqui é a mudança de cor.

**Ações (D31)**

- **R36:** as ações por status permanecem intactas — mesmos botões, mesmos rótulos, mesma posição à direita e mesmos callbacks — e ficam **fora** do link: acionar uma ação não navega; dono e selo de status continuam texto simples e não clicáveis; a linha não é clicável por inteiro.

**Acessibilidade (D32)**

- **R37:** o heading do item mantém nome acessível igual ao título do programa e contém um link com **o mesmo nome**; o link é identificado como link (role) e é alcançável por navegação de teclado, com foco visível.

### T4. Critérios de aceite novos (testáveis) — CA-P6-1 a CA-P6-6

- **CA-P6-1 (título é link com href exato):** Dado um programa na lista, então o título daquele item é um link com href exatamente `/milon/programs/<id>` do próprio programa — asserido por item, sem id de outro programa, sem barra final, sem query e sem destino diferente.
- **CA-P6-2 (navegação ao detalhe):** Dado que a pessoa clica no título de um item, então ela termina na página de detalhe `/milon/programs/<id>` daquele programa, vendo o cabeçalho dele — o caminho vale para rascunho, ativo e inativo; na suíte automatizada o caminho é asserido pelo href exato (CA-P6-1) e a passagem real é exercida no cenário de homologação em `test-scenarios.md`.
- **CA-P6-3 (ações por status intactas):** Dada a lista com os três status, então as ações são exatamente as de hoje — rascunho: Editar, Ativar e Excluir; ativo: Editar; inativo: Reativar — na condição e com o callback de sempre, **fora** do link: acionar uma ação dispara o callback e **não** navega para o detalhe.
- **CA-P6-4 (afordância: cor no hover + foco visível, sem sublinhado):** Dado o título em repouso, então ele está em `#B7602B` sem sublinhado; no hover, a cor muda (outro tom do marrom, com transição) e **continua sem sublinhado**; focado por teclado, o link exibe foco visível sem sublinhado — a verificação no DOM encontra estado de hover com cor diferente de `#B7602B` e **zero** marcação de sublinhado no título.
- **CA-P6-5 (role/nome/foco acessíveis):** o título continua identificado como heading `h3` com nome igual ao texto do programa, e o elemento interno é identificado como link com nome igual a esse mesmo texto, alcançável por teclado com foco visível.
- **CA-P6-6 (portão do processo):** suíte completa verde (nenhum teste existente quebra), coverage ≥ 80% mantido e `test-report.json` regenerado por Minos antes da review (gate do processo).

### T5. Fora de escopo do patch (YAGNI)

- **Página de detalhe** (`app/milon/programs/[id]/page.tsx`) — inalterada; já entregue no Patch v4 (D16). Este patch só cria o link que aponta para ela.
- **Hooks** (`lib/milon/hooks/*`, notadamente `usePrograms` e `useProgramDetail`) — nenhum muda.
- **Modais** (formulário de criação/edição, `ProgramConfirmModal`, `DeleteExerciseConfirm`) — inalterados.
- **Banco, dados e migração** — nenhum; o patch não toca em dados nem cria script de migração.
- **`ExerciseList` e a biblioteca de exercícios** — fora; o link não entra na lista de exercícios.
- **Pluto** — nenhum arquivo alterado.
- **Sublinhado no link (alternativas A e B)** — recusados pela decisão humana D30.
- **Linha inteira clicável, ações dentro do link ou bloco de título/dono/selo como link** — fora (D31); o link cobre só o texto do título.
- **Rota, href ou destino novos** — fora; o destino é a rota já existente `/milon/programs/<id>`.
- **Outras telas do Mílon** (detalhe, criação, edição, exercícios) — fora.
- **Qualquer mudança de regra da spec v2 ou dos Patches v3, v4 e v5** — intocada por definição.

### T6. Alvos por arquivo (produto e testes)

**Produto:**

- `components/milon/ProgramList.tsx` — o título de cada item (o `h3` de hoje, linhas 108–110) passa a conter o link com `href` montado como `/milon/programs/` + id do programa, via `Link` do Next.js, e ganha as classes de hover/foco do D30; dono, selo, filtros, estados e botões de ação permanecem sem mudança.

**Testes:**

- `__tests__/components/milon/ProgramList.test.tsx` — estendido: título é link com href exato por item (CA-P6-1), ações intactas e fora do link (CA-P6-3), afordância/foco sem sublinhado (CA-P6-4) e semântica de heading + link (CA-P6-5); asserções existentes permanecem válidas.
- `.agents/modules/milon/02-programas/test-scenarios.md` — cenário novo (próximo número da sequência, após o Cenário 51), no formato Dado/Quando/Então, cobrindo CA-P6-1 a CA-P6-5.
- `.agents/modules/milon/02-programas/test-report.json` — regenerado por Minos: a extensão de teste altera contagens e cobertura (CA-P6-6).

**Demais arquivos:** nenhum outro arquivo de produto ou de teste muda.

### T7. Riscos e Dependências (patch)

- **Tela homologada muda visualmente:** o título ganha comportamento de link (cor no hover + foco visível) — mudança **aprovada pelo humano** (D30, 2026-10-01), para o Argos avaliar o diff como mudança aprovada e não como regressão.
- **Corte de texto do título (`truncate`):** o link dentro do `h3` não pode quebrar o corte em uma linha nem mudar alinhamento da linha — risco de regressão de layout; coberto pelas asserções de texto existentes do teste do `ProgramList` e verificável na homologação visual.
- **Clique em ação navegando por engano:** mitigado por D31 — as ações ficam fora do link e a linha não é clicável por inteiro (CA-P6-3 trava o comportamento).
- **href sensível a detalhes de endereço:** travado por CA-P6-1 — href exato, por item, sem barra final, query ou destino diferente.
- **Renderização do `Link` em teste de componente:** o componente `Link` já é exercitado em testes do projeto — os cards do dashboard são `Link` com href asserido em `__tests__/app/dashboard/page.test.tsx` — e o teste estendido do `ProgramList` segue esse mesmo caminho, sem exigir mock novo de rota.
- **Dependências:** página de detalhe existente (Patch v4, D16/R18) — pré-requisito já entregue; nenhuma dependência nova de banco, de hook ou de outra feature.

### T8. Alternativas descartadas (D30 — afordância do link)

- **A — sublinhado no hover e/ou no foco:** marcaria o link da forma clássica de texto interativo, inclusive para quem navega por teclado. **Descartada:** quebra o padrão do dashboard (hover = mudança de cor), introduz um segundo idioma visual para o mesmo tipo de alvo dentro do mesmo produto e o sublinhado em título de heading compete com o corte da própria linha.
- **B — sublinhado permanente:** o título ficaria sempre sublinhado, sinal de link visível sem precisar do hover. **Descartada:** a lista é composta por vários títulos do mesmo tipo, todos na mesma cor e fonte — sublinhado permanente em todos polui a leitura da linha, destaca demais um elemento que já é o mais forte nela (marrom `#B7602B`, `font-display`) e não segue o padrão do dashboard.
- **C — escolhida (decisão humana de 2026-10-01):** mudança de cor no hover, sem sublinhado, com foco visível — mesmo princípio dos cards do dashboard; sinal de interação aparece quando o mouse chega, o repouso da lista fica intacto e o custo de manutenção é nulo (uma classe de hover, sem variação por módulo).
