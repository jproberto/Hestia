# Spec: Treinos e séries planejadas (Mílon #3)

## 1. Problema Real

Montar ficha de treino hoje é manual: papel, planilha ou cabeça. A dor real é o esforço inicial de estruturar uma ficha nova do zero — escolher os exercícios, pô-los em ordem e definir, para cada um, quantas séries fazer, com quantas repetições, qual carga e quanto descanso. Esse trabalho acontece uma vez a cada 2-3 meses, leva em torno de 30 a 45 minutos por ficha completa e é feito no celular, em casa. Manutenção do que já existe é secundária.

Quando a ficha muda, o casal não edita por cima: arquiva o Programa atual (já suportado pela feature #2) e cria um Programa novo com treinos novos. O que falta é o conteúdo: dentro de um Programa, os treinos; dentro de um treino, os exercícios em ordem; dentro de cada exercício, as séries planejadas.

O valor desta feature é transformar a ficha em dado durável, editável e reutilizável — e ser a base para o "treino do dia" (feature #4) e para a execução série a série (features #5, #6 e #7).

Fonte: item 3 do backlog do módulo Mílon e discovery conduzido pela Hera (perguntas 1 a 3.7 mais a resposta final de 2026-10-01), decisões D1 a D15 registradas nesta spec. Ajustes solicitados pelo humano em 2026-10-01, após a primeira redação, incorporados: unicidade de exercício no Programa, unicidade de nome de treino, sugestão de nome seguindo além de Z, regime de exclusão com bloqueio e o novo subtítulo do treino (D6, D11, D14 e D15). Nenhum ponto aberto: toda hipótese do discovery foi confirmada ou refutada pelo humano antes da redação.

## 2. Usuários e Cenários

**Usuários:** o casal, com login individual cada um, mesmo modelo das features #1 e #2. Qualquer um dos dois pode ver, criar, editar e excluir qualquer conteúdo — não há permissão restrita (regra herdada do módulo).

**Cenários cobertos:**

- **Montar ficha nova no celular, em casa:** a pessoa abre o detalhe do Programa, adiciona treinos e, em cada treino, monta os exercícios e as séries. Ficha completa em torno de 30-45 minutos.
- **Consultar e ajustar o planejado antes de ir à academia:** abrir o treino, corrigir uma carga, trocar a ordem dos exercícios.
- **Ajustar durante a execução:** o planejado pode ser editado a qualquer momento — não existe "modo de edição" e nada trava por causa da execução (princípio D12).
- **Trocar de ficha a cada 2-3 meses:** arquivar o Programa atual e montar outro novo do zero (ciclo já entregue pela #2).

**Estados encontrados:** carregando; erro de carga com nova tentativa; Programa sem treinos (lista vazia com orientação para adicionar o primeiro); treino sem exercícios; exercício recém-adicionado com séries criadas e campos vazios; Programa inativo (conteúdo somente leitura, regra da #2).

**Navegação:** o detalhe do Programa lista os treinos e oferece a opção de adicionar treino; tocar num treino abre o detalhe do treino, que lista os exercícios e oferece adicionar, editar e excluir (Decisão D1). A navegação do módulo permanece com as duas abas existentes — Exercícios e Programas — nenhuma aba nova.

## 3. Regras de Negócio

### Estrutura e entidades

- **Treino** pertence a um Programa; tem nome (texto obrigatório, único dentro do Programa — D11), um **subtítulo** derivado dos grupos musculares dos seus exercícios (D15) e uma coleção de entradas de exercício em ordem. Não existe propriedade de execução nesta feature (`iniciado_em`/`encerrado_em` são das features #5 e #7).
- **Entrada de exercício no treino** é a referência a um exercício da biblioteca (#1) posicionada no treino, com sua própria ordem e suas séries. **Unicidade por Programa (D14):** o mesmo exercício da biblioteca pode aparecer no máximo uma vez dentro de um Programa — nem duas vezes no mesmo treino, nem em dois treinos diferentes do mesmo Programa (a redação anterior "cada entrada é independente, nenhuma regra de unicidade" é superada). Em Programas diferentes o mesmo exercício pode aparecer normalmente (a biblioteca continua compartilhada).
- **Série** pertence a uma entrada de exercício; tem repetições ou tempo, carga, e ordem de criação. A ordem das séries é a de criação (numeradas); séries não são reordenáveis nesta versão.
- **Descanso** mora na entrada de exercício dentro do treino: é um **campo único que vale para todas as séries** daquele exercício (Decisão D4).
- **Unidade de carga** mora no exercício da biblioteca compartilhada (#1): a biblioteca ganha o campo "unidade de carga" de cada exercício (Decisão D10).
- A **biblioteca de exercícios** continua sendo única e compartilhada do casal — o que essa feature consome e edita é o mesmo registro para os dois (regra da #1).

### Detalhe do Programa — lista de treinos

- O detalhe do Programa passa a exibir a lista dos seus treinos (hoje a página mostra apenas cabeçalho: título, dono e status — esta feature encerra essa restrição com conteúdo real; nenhum texto de "em breve").
- A lista oferece **adicionar treino**; cada item oferece **renomear** e **excluir** e exibe, sob o nome, o **subtítulo** do treino quando houver (D15).
- **Ordem dos treinos:** é a de criação dentro do Programa. Não existe reordenação manual de treinos (D13) e não existe mover treino entre Programas.
- **Nome do treino é obrigatório** (Decisão D11): não pode ficar vazio nem conter apenas espaços — o salvamento é bloqueado com mensagem visível e o formulário permanece aberto com o que foi digitado.
- **Nome do treino é único dentro do Programa** (Decisão D11): a comparação é normalizada (caixa e espaços extras não contam) — criar ou renomear um treino com nome já usado no mesmo Programa é bloqueado com mensagem visível e o formulário permanece aberto com o que foi digitado. Nomes iguais em Programas diferentes são permitidos.
- **Sugestão automática de nome:** na criação, o campo já vem preenchido com "Treino A", "Treino B", "Treino C" etc. — a sugestão usa a **primeira posição da sequência de rótulos A, B, …, Z, AA, AB, … (ordem alfabética, a sequência não para em Z) cujo nome "Treino <rótulo>" ainda não existe no Programa** (comparação normalizada: caixa e espaços extras não contam); se nenhuma posição da sequência estiver livre (cenário improvável), o campo abre vazio. Com os 26 treinos "Treino A" a "Treino Z" existentes, a sugestão é "Treino AA". A sugestão é apenas um preenchimento editável: a pessoa pode manter ou substituir por qualquer nome (sem colidir com a unicidade acima). Na edição de um treino existente não há nova sugestão — vale o nome atual.
- A **exclusão de um Programa só é permitida quando ele não tem treinos** (Decisão D6): havendo qualquer treino associado, a exclusão é **bloqueada** com mensagem visível e nada é removido — para excluir o Programa, esvazie-o antes treino a treino. Programa sem treinos mantém a confirmação de exclusão já existente na #2, **sem menção a conteúdo** (a delegação da spec da #2 para a #3 de "informar que o conteúdo também será excluído" é superada: Programa com treino não pode mais ser excluído).
- **Excluir treino (Decisão D6):** só é possível quando o treino **não tem exercícios** — treino com qualquer exercício associado tem a exclusão **bloqueada** com mensagem visível (remova antes os exercícios); treino sem exercícios é excluído direto, sem confirmação.

### Detalhe do treino — lista de exercícios

- O detalhe do treino lista as entradas de exercício na ordem definida e oferece **adicionar, editar e excluir** (Decisão D1).
- **Adicionar exercício:** a pessoa seleciona um exercício existente na biblioteca ou cadastra um novo na hora (nome, músculo e link de vídeo — mesmas regras da #1, inclusive anti-duplicata; o cadastro entra na biblioteca compartilhada). O modal/seletor é o mesmo já entregue pela #1. **Restrição de unicidade no Programa (D14):** se o exercício já estiver em qualquer treino do mesmo Programa, a adição é **bloqueada** com mensagem visível e o modal permanece aberto; em outro Programa, a adição é normal.
- **Subtítulo do treino (D15):** string derivada que junta os grupos musculares dos exercícios do treino, **sem repetição** e **na ordem em que os grupos aparecem nos exercícios**, no padrão "Peito, Tríceps e Ombros" (vírgula entre os itens, "e" antes do último; um único grupo sai sozinho). É mantido automaticamente: muda ao adicionar ou remover um exercício e passa a refletir o valor novo quando o músculo de um exercício do treino é editado na biblioteca. Treino sem exercícios fica sem subtítulo (vazio). Não é editável manualmente nesta versão.
- **Editar exercício:** edita o registro da biblioteca (nome, músculo, link) — a alteração vale para todos os treinos que usem aquele exercício, em qualquer Programa. Não existe "trocar o exercício preservando as séries" nesta versão (D13); para substituir, exclui e adiciona.
- **Excluir exercício:** pode ser excluído **mesmo com séries associadas**, mediante confirmação (D6) — a confirmação lista o que será perdido. Exercício **sem séries** é excluído direto, sem confirmação.
- **Reordenação de exercícios:** por arrastar e soltar (drag & drop), com um **handle/ícone indicando onde segurar** (Decisão D8) — essencial no celular, onde a montagem acontece. A nova ordem persiste.
- **Sem limite de quantidade:** não há regra de negócio nem aviso de teto para número de séries, de exercícios ou de treinos — a única restrição é a capacidade natural do campo (Decisão D9). Nenhum teto, nenhum contador de limite.

### Séries do exercício

- **Quantidade de séries é digitada na hora e é obrigatória** (Decisão D3, resposta final b1): campo obrigatório — deve ser um número inteiro maior ou igual a 1; vazio, zero ou não numérico não cria séries e mostra mensagem visível. A quantidade pode ser alterada depois: **aumentar** acrescenta novas séries vazias ao final; **reduzir** descarta as séries excedentes (as últimas); **zerar** remove todas as séries.
- Preencher a quantidade gera **um card por série**.
- **Todos os demais campos nascem vazios** (Decisão D3): repetições, tempo, carga e descanso começam sem valor — nenhum padrão é preenchido automaticamente. Um exercício pode existir no treino ainda sem séries (nenhuma trava obriga a quantidade no ato de adicionar o exercício).
- Cada card de série contém: **repetições ou tempo** (isometria — o tempo é medido em segundos, mesmo padrão do descanso) e **carga**. Repetições e tempo são campos independentes: o que for digitado fica guardado; a precedência entre eles para métricas futuras (#8, #9, #15) não é assunto desta feature.
- **Carga:** aceita vazio ou número. **Vazio não é zero** (Decisão D7): vazio = sem informação, exibido como traço; zero é um valor legítimo digitado e é exibido como zero. Valores negativos não são aceitos (mensagem visível).
- **Unidade de carga (Decisão D10):** nasce vazia; é escolhida pela pessoa na **primeira vez que ela digita um peso** daquele exercício (opção entre kg e libra); a partir daí a escolha permanece no exercício e não é perguntada de novo. A exibição mostra o valor na unidade principal e, ao lado, o valor convertido na unidade secundária, **menor e em cinza mais claro**.
- **Descanso (Decisão D4):** campo único no nível da entrada do exercício, também nascendo vazio; editá-lo vale imediatamente para todas as séries daquele exercício (medido em segundos).
- **Atalho "aplicar a todas" (Decisões D2 e D5):** disponível em cada série; ao ser acionado, leva para as demais séries do mesmo exercício os valores da série de origem — repetições (ou tempo) e carga individualmente, e o descanso no nível do exercício (campo único, igual para todas). É **re-executável**: acionar de novo, a partir de outra série, **sobrescreve** o que foi copiado antes.

### Exclusões e confirmações (Decisão D6, alterada pelo humano em 2026-10-01)

- **Bloqueio quando há estrutura associada — a exclusão não acontece:**
  - excluir um **Programa que tenha treinos associados** é bloqueado com mensagem visível e nada é removido (esvazie os treinos antes);
  - excluir um **treino que tenha exercícios associados** é bloqueado com mensagem visível e nada é removido (remova antes todos os exercícios do treino).
- **Confirmação quando há o que perder:**
  - excluir um **exercício com séries associadas** (mesmo que as séries estejam sem preenchimento) — a confirmação lista o que será perdido; confirmado, exercício e séries vão junto; cancelado, nada muda;
  - reduzir a quantidade de séries de um exercício que já tem séries preenchidas.
- **Sem confirmação (ação direta):** excluir treino sem exercícios; excluir exercício sem séries; reduzir a quantidade em séries recém-criadas sem preenchimento; excluir Programa sem treinos (segue a confirmação de exclusão já existente na #2).
- Cancelar a confirmação não muda nada. Falha de gravação mostra mensagem visível, preserva o estado anterior e não fecha o formulário. Bloqueio de exclusão é comunicado por mensagem visível sem fechar a tela de onde partiu a ação.

### Status do Programa e regras herdadas da #2

- **Rascunho e ativo são editáveis** (inclui o conteúdo de treinos); **inativo é somente leitura** — em Programa inativo não há adicionar, editar, reordenar nem excluir (regra da #2).
- **Guarda de ativação:** só é possível ativar/reativar um Programa com pelo menos um treino com pelo menos um exercício. Com esta feature entregando conteúdo, a página de Programas passa a informar a existência real desse conteúdo (a flag `hasWorkoutWithExercise` deixa de ser fixamente falsa) — a ativação que hoje nasce bloqueada passa a se liberar quando o Programa tiver conteúdo mínimo, mantendo o bloqueio e a mesma mensagem quando não tiver.
- Não há trava de concorrência definida: edições simultâneas dos dois usuários seguem o mesmo comportamento já existente nas telas da #1 e da #2.

### Estados de tela e padrões visuais

- Carregamento, erro, vazio e não-encontrado são compostos pelo **componente centralizado de estados do projeto (AsyncState)** — reimplementar é proibido pela norma do módulo.
- **Origem das mensagens:** erro de carga (busca) exibe "Tentar novamente"; erro de operação e bloqueio de domínio não exibem retry (norma D27/R31). Os estados vazio de cada tela oferecem ação de adicionar (treino ou exercício).
- Modais de formulário nunca fecham no erro; validações aparecem como mensagem visível. Confirmações seguem o padrão visual dos modais de confirmação já existentes no módulo.
- Sucesso de operação é comunicado pelo lembrete breve padrão do módulo. Títulos de conteúdo seguem o token tipográfico do módulo (`font-display`) e a cor do Mílon.
- A montagem acontece no celular: todos os fluxos precisam ser usáveis em tela pequena (alvo de arrastar e soltar, campos e botões acessíveis ao toque).

## 4. Fora de Escopo (YAGNI)

- **Execução do treino:** marcar série como feita, timer de descanso, `iniciado_em`, encerrar treino — features #5, #6 e #7.
- **"Treino do dia"**, rotação e descoberta do próximo treino — feature #4.
- **Histórico e métricas:** volume, duração, evolução, 1RM, dashboard — features #8, #9, #13 e #15. Esta feature apenas entrega o contrato que elas consomem (unidade por exercício; vazio ≠ 0 com série ignorada e total sinalizado como parcial).
- **Duplicar treino ou exercício** e **reordenar treinos dentro do Programa** — pacote de exclusões do discovery, alternativa A escolhida: v1 só o planejado (Decisão D13). Também: mover treino entre Programas.
- **Exclusão em cascata de Programa** (apagar treinos, exercícios e séries junto com o Programa) — recusada pelo humano; Programa com treinos não pode ser excluído (D6) e o aviso "o conteúdo também será excluído" delegado à #3 pela spec da #2 **não é implementado**.
- **Subtítulo editável manualmente** (campo que a pessoa digita/ajusta) — não pedido; o subtítulo é derivado e mantido automaticamente (D15).
- **Reordenação de séries** — a ordem é a de criação.
- **Limite de quantidade com aviso ou teto** (limite de sanidade 1-99 ou teto generoso com aviso, ex.: 20/30/12) — recusado; sem regra além da capacidade do campo (D9).
- **Unidade global única, unidade por perfil de usuário ou unidade por ficha** — recusados; a unidade é por exercício (D10).
- **Modo de edição dedicado** (botão "editar", campos bloqueados até ativar) — não existe: tudo é sempre editável (princípio D12).
- **Substituição de exercício preservando as séries já preenchidas** — vira a feature #12 (V2); aqui substituir é excluir e adicionar.
- **Séries de aquecimento/extra, RPE/RIR, observações rápidas por exercício** — fora do backlog por decisão explícita do dono, nem V2/V3.
- **Integração com apps externos, importação de fichas, exportação** — não previsto.
- **Permissões restritas, áreas privadas** — não existem no módulo.
- **Placeholder de treinos** ("Treinos em breve") — já recusado na #2; esta feature entrega conteúdo real.

## 5. Critérios de Aceite (high-level, testáveis)

- Dado um Programa sem treinos, quando a pessoa abre o detalhe, então a lista de treinos mostra estado vazio com orientação e ação de adicionar treino, sem mensagem de erro.
- Dado um Programa sem nenhum treino, quando a pessoa abre o formulário de novo treino, então o campo já vem preenchido com "Treino A"; acrescentando um segundo e um terceiro treino, as sugestões são "Treino B" e "Treino C".
- Dado um Programa com os 26 treinos "Treino A" a "Treino Z", quando a pessoa adiciona mais um treino, então a sugestão é "Treino AA" — a sequência não para em Z; com "Treino AA" também existente, a sugestão seguinte é "Treino AB".
- Dado um Programa com os treinos "Treino A" e "Push", quando a pessoa adiciona outro treino, então a sugestão é "Treino B" (primeira posição livre); a sugestão pode ser substituída por qualquer texto.
- Dado o formulário de treino com o nome apagado (ou só com espaços), quando a pessoa tenta salvar, então o salvamento é bloqueado com mensagem visível, o formulário permanece aberto e nada é criado.
- Dado um Programa que já tem um treino chamado "Push", quando a pessoa cria (ou renomeia) outro treino com o nome "push" (mesma caixa ou com espaços extras), então o salvamento é bloqueado com mensagem visível e o formulário permanece aberto; em outro Programa, o mesmo nome é aceito.
- Dado um Programa em inativo, quando a pessoa abre o detalhe, então não existe adicionar, renomear, reordenar nem excluir treinos; em rascunho e ativo, essas ações estão disponíveis.
- Dado um Programa com vários treinos, então a lista do detalhe exibe sempre a ordem de criação, sem nenhuma ação de reordenar treinos (D13).
- Dado o detalhe de um treino, quando a pessoa reordena os exercícios pelo handle de arrastar e soltar, então a nova ordem é refletida imediatamente e persiste ao recarregar a página.
- Dado um treino sem exercícios, quando a pessoa abre, então aparece estado vazio com ação de adicionar exercício; ao adicionar, pode escolher um exercício existente da biblioteca ou cadastrar um novo na hora (que entra na biblioteca compartilhada).
- Dado um exercício já presente em qualquer treino do mesmo Programa, quando a pessoa tenta adicioná-lo em outro treino daquele Programa, então a adição é bloqueada com mensagem visível, o modal permanece aberto e nada é criado; em um Programa diferente, o mesmo exercício é adicionado normalmente.
- Dado um exercício usado em treinos de mais de um Programa, quando a pessoa edita nome, músculo ou link em um deles, então a alteração é refletida nos demais Programas.
- Dado um exercício com séries associadas (preenchidas ou não), quando a pessoa o exclui, então uma confirmação lista o que será perdido; cancelar mantém tudo. Dado um exercício sem séries, a exclusão acontece sem confirmação.
- Dado o campo de quantidade de séries vazio, zero ou não numérico, quando a pessoa tenta criar as séries, então nada é criado e aparece mensagem visível; com quantidade 5, então surgem exatamente 5 cards com repetições, tempo, carga e descanso vazios.
- Dado um exercício com 5 séries onde as 3 primeiras estão preenchidas, quando a pessoa reduz a quantidade para 3, então aparece confirmação (há dados em risco); confirmado, as séries excedentes são removidas; cancelado, nada muda. Reduzindo séries sem preenchimento, não há confirmação.
- Dado o campo de quantidade alterado para um valor maior, então novas séries vazias são acrescentadas ao final, sem tocar nas existentes.
- Dado um exercício com séries, quando a pessoa edita o descanso no nível do exercício, então todas as séries daquele exercício passam a refletir o novo valor (campo único).
- Dada a primeira série preenchida com repetições e carga, quando a pessoa aciona "aplicar a todas", então as demais séries do exercício passam a ter os mesmos valores; alterada a origem e acionado de novo, os valores anteriores são sobrescritos.
- Dado um exercício sem unidade de carga, quando a pessoa digita um peso pela primeira vez, então ela escolhe entre kg e libra; concluída a escolha, os pesos seguintes daquele exercício não perguntam a unidade de novo.
- Dado um peso exibido com unidade secundária, então o valor convertido aparece ao lado, menor e em cinza mais claro.
- Dado um campo de carga vazio, então a exibição mostra traço (não zero); dado o valor 0 digitado, então a exibição mostra 0.
- Dado um treino que tem ao menos um exercício associado, quando a pessoa tenta excluí-lo do detalhe do Programa, então a exclusão é bloqueada com mensagem visível e nada é removido; dado um treino sem exercícios, a exclusão acontece sem confirmação.
- Dado um Programa com pelo menos um treino, quando a pessoa tenta excluí-lo na tela de Programas (#2), então a exclusão é bloqueada com mensagem visível e Programa, treinos, exercícios e séries permanecem intactos; dado um Programa sem treinos, a exclusão segue a confirmação existente da #2 e nada mais é afetado.
- Dado um treino com exercícios de Peito, Tríceps e Ombros, então o subtítulo exibe "Peito, Tríceps e Ombros"; ao remover o único exercício de Tríceps, o subtítulo é atualizado automaticamente para "Peito e Ombros" sem nenhuma ação da pessoa.
- Dado um treino cujos exercícios repetem o mesmo músculo (ex.: dois exercícios de Peito), então o subtítulo menciona o grupo uma única vez; dado um treino sem exercícios, então o subtítulo aparece vazio.
- Dado um Programa com pelo menos um treino com pelo menos um exercício, quando a pessoa tenta ativá-lo (ou reativá-lo), então a ativação é liberada; dado um Programa sem esse conteúdo mínimo, então a ativação continua bloqueada com a mensagem existente.
- Dado o detalhe do Programa e do treino, então os estados de carregamento, erro, vazio e não-encontrado usam o componente centralizado; erro de carga exibe "Tentar novamente" e erro de operação/bloqueio não exibe.
- Dada a navegação do módulo, então ela permanece com as duas abas existentes (Exercícios e Programas) — nenhuma aba nova foi criada.
- Suíte completa verde (nenhum teste existente quebra), coverage mantido em pelo menos 80% e `test-report.json` regenerado antes da review (gate do processo).

## 6. Riscos e Dependências

- **Migração DDL nova:** a feature cria as tabelas de conteúdo (treinos, entradas de exercício e séries) e o campo de unidade no exercício. O número sequencial é reservado no `plan.md` pela Atena (regra 7 do AGENTS.md); o script é criado por Hefesto e aplicado com auditoria em `public.schema_migrations`.
- **Comportamento homologado da #2 muda (declarado, não regressão):** a página de detalhe do Programa deixa de exibir apenas o cabeçalho e passa a exibir a lista de treinos; a exclusão de Programa com treinos passa a ser **bloqueada** (hoje um Programa rascunho vazio pode ser excluído com confirmação — esse caminho continua igual). O Argos deve avaliar isso como mudança aprovada pela spec, não como regressão.
- **Guarda de ativação depende da integração:** a liberação só acontece se a tela de Programas passar a informar a existência de conteúdo mínimo (flag `hasWorkoutWithExercise`); se a flag continuar fixa em falsa, a ativação continua bloqueada mesmo com conteúdo existente.
- **Exclusão de Programa agora exige esvaziar:** a remoção em cascata (apagar treinos/exercícios/séries junto) foi recusada; Programa só sai quando não tem treinos. A confirmação existente da #2 permanece intacta e **não** ganha aviso de conteúdo (a delegação da spec da #2 para a #3 de informar a perda de conteúdo é superada por esta decisão — registrado para o Argos não cobrar esse texto).
- **Subtítulo é dado derivado:** o texto precisa ser recalculado em toda mutação da lista de exercícios do treino (adição, remoção) e quando o músculo de um exercício usado no treino é editado na biblioteca; se alguma operação não atualizar, o subtítulo passa a divergir dos exercícios reais.
- **Unicidade de exercício no Programa não tem dado legado a sanear:** treinos só passam a existir com esta feature — nenhum Programa existente (#2) tem conteúdo duplicado a limpar. A validação vale apenas para adições novas.
- **Unidade por exercício na biblioteca compartilhada:** a escolha feita por um dos dois vale para o outro (mesmo comportamento do nome e do músculo); trocar a unidade de um exercício altera a leitura da carga em todos os treinos que o usam.
- **Contrato para as métricas futuras:** vazio ≠ 0 e unidade por exercício são os insumos das features #8, #9 e #15 — se esta feature normalizasse vazio para 0 ou misturasse unidades por ficha, aquelas métricas ficariam distorcidas.
- **Cenários repassados da #2 (regra do backlog):** os cenários pós-ativação que dependem de conteúdo de treino e que ficaram bloqueados na #2 entram no escopo de teste desta feature e devem constar do `test-scenarios.md` aqui (handoff de rastreio, registrado no backlog do módulo pela Mnemósine na fase 7).
- **Edição simultânea:** sem trava definida; última gravação prevalece, mesmo comportamento das telas existentes.
- **Dependências:** features #1 (biblioteca — modal, seletor e contrato de exercícios) e #2 (Programas — container, status e guarda) já entregues; nenhuma outra feature de produto é pré-requisito.

## 7. Alternativas Consideradas (com trade-offs e escolha)

**D1 — Jornada de montagem (Etapa 2):**
- *Assistente guiado (A):* pergunta por pergunta monta a ficha. **Descartado:** rápido para a primeira ficha, mas esconde a estrutura, não serve bem para revisitar e editar depois.
- *Uma tela por treino isolado (C):* tudo do treino em uma tela só. **Descartado:** no celular, ficha com muitos exercícios vira rolagem infinita e a visão do Programa inteiro se perde.
- *Detalhamento aninhado (B) — ESCOLHIDA:* Programa → lista de treinos + adicionar; treino → lista de exercícios + adicionar/editar/excluir. **Vantagem:** navegação previsível, cabe no celular e entrega a estrutura que a feature #4 vai reutilizar.

**D2/D5 — Estrutura das séries (Etapa 3, perguntas 1 e 3.3):**
- *Bloco uniforme (reps/carga/descanso iguais para todas as séries):* mais rápido de digitar. **Descartado:** não cobre a variação real (última série costuma ser diferente).
- *Tudo por série, sem atalho:* fiel, mas lento no celular. **Descartado.**
- *Séries individuais + atalho "aplicar a todas" re-executável e descanso compartilhado no exercício (C) — ESCOLHIDA:* fidelidade do dado com velocidade; o atalho pode ser acionado de novo e sobrescreve; o descanso fica em campo único para não repetir a mesma informação em cada série.

**D3 — Validação ao montar séries (Etapa 3, pergunta 3.2, refinação na resposta final b1):**
- *Defaults automáticos em tudo:* preenche rápido, mas inventa dado (descanso padrão que ninguém quer, carga "0" que não é 0). **Descartado.**
- *Tudo obrigatório:* confiável, mas trava a montagem no celular (a ficha tem 30-45 min e cada bloqueio multiplica). **Descartado.**
- *Só o que é estrutural é obrigatório — ESCOLHIDA:* nome do exercício e **quantidade de séries digitada na hora** são obrigatórios; repetições, tempo, carga e descanso **nascem vazios** e são preenchidos quando a pessoa quiser. Combinado com D7, dado vazio é honesto (sem informação) em vez de dado inventado.

**D4 — Onde vive o descanso (Etapa 3, pergunta 3.3):**
- *Por série:* cada série com seu descanso. **Descartado:** redundância (na prática é o mesmo valor) e mais digitação.
- *Compartilhado + atalho só one-shot (A):* cópia única, não reexecutável. **Descartado:** força a refazer o processo se a origem mudar.
- *Compartilhado no nível do exercício + atalho re-executável (C) — ESCOLHIDA.*

**D6 — Exclusões e confirmações (Etapa 3, pergunta 3.4, alterada pelo humano em 2026-10-01):**
- *Sempre confirmar (C):* seguro, mas treina o usuário a clicar "confirmar" no automático. **Descartado.**
- *Nunca confirmar (B):* rápido, mas perda silenciosa de trabalho. **Descartado.**
- *Confirmar só quando há o que perder (A) — ESCOLHIDA e depois ajustada:* a redação original previa confirmar exclusão de Programa com conteúdo e de treino com dados. **Alteração do humano:** essas duas passam a ser **bloqueadas** — não se exclui Programa com treinos associados nem treino com exercícios associados (a perda seria grande demais para um "confirmar e apagar"; para excluir, esvazie antes). **Manteve-se** a confirmação para exclusão de exercício com séries associadas e para reduzir série já preenchida; estrutura sem séries/exercícios exclui direto. **Alternativas descartadas na alteração:** cascata com aviso (a antiga redação delegada da #2) e confirmação simples — ambas permitem apagar estrutura inteira num toque.

**D7 — Carga vazia vs 0 (Etapa 3, pergunta 3.5):**
- *Vazio normaliza para 0 (B):* fecha os cálculos, mas inventa dado e distorce volume/evolução. **Descartado.**
- *Exibe vazio mas calcula como 0 (C):* híbrido que mente no número final. **Descartado.**
- *Vazio ≠ 0 (A) — ESCOLHIDA:* vazio = sem informação (traço, métrica ignora a série e sinaliza total parcial); 0 é valor legítimo digitado.

**D8 — Reordenação de exercícios (Etapa 3, pergunta 3.6):**
- *Drag & drop com handle visível (B) — ESCOLHIDA:* direto no celular e deixa claro onde segurar. Setas ou edição numerada perderam por exigir mais toques e espaço vertical.

**D9 — Limites de N (Etapa 3, pergunta 3.7a):**
- *Sanidade 1-99 (A)* e *teto generoso com aviso — ex.: 20/30/12 (B):* **Descartados:** introduzem regra de negócio e aviso de teto para algo que nunca vai chegar perto do limite na prática real do casal.
- *Sem limite além da capacidade natural do campo (resposta customizada do humano) — ESCOLHIDA.*

**D10 — Unidade de carga (Etapa 3, pergunta 3.7b + resposta final a2; morada formalizada abaixo):**
- *Global única (A)* e *por perfil de usuário (B)* e *por ficha (C):* **Recusadas pelo humano** — "por exercício".
- *Momento da escolha (resposta final a2):* a unidade **nasce vazia** e é escolhida **na primeira vez que a pessoa digita um peso**, sem configuração prévia.
- *Onde a unidade mora — formalização registrada nesta spec:* resolvida como **atributo do exercício na biblioteca compartilhada**, derivada da própria decisão 3.7 ("por exercício, não global, não por ficha" — por ficha foi recusado, e "por exercício" tem como referente o exercício registrado na biblioteca, que existe desde a #1). **Alternativa descartada: guardar na entrada do treino** — faria o mesmo exercício nascer unidades diferentes em fichas diferentes (ex.: kg num treino, lb em outro), reperguntar a escolha a cada uso e divergir nas métricas de evolução #9/#15. Trade-off aceito: a escolha é do casal (biblioteca é compartilhada), coerente com nome e músculo já serem compartilhados.

**D11 — Nome do treino (resposta final c; ajustada pelo humano em 2026-10-01):**
- *Campo livre sem sugestão:* a pessoa pensa o nome toda vez. **Descartado.**
- *Obrigatório com sugestão automática em letras — "Treino A", "Treino B", "Treino C" (c) — ESCOLHIDA:* reduz digitação no celular e mantém a leitura A/B/C da ficha. Formalização: a sugestão usa a **primeira posição livre** da sequência de rótulos (evita sugerir rótulo já visível num treino renomeado e continua funcionando após exclusões); alternativa "letra por posição" foi descartada porque, após excluir um treino do meio, poderia sugerir uma letra idêntica a um treino existente.
- *Ajuste 1 — a sequência não para em Z (pedido do humano):* após "Treino Z" a sugestão continua com "Treino AA", "Treino AB" … em ordem alfabética; a posição livre é a primeira de A a Z e, só depois de esgotadas as letras simples, das duplas.
- *Ajuste 2 — nome único no Programa (pedido do humano):* criar ou renomear um treino com nome já usado no mesmo Programa é **bloqueado** com mensagem visível (comparação normalizada: caixa e espaços extras não contam). **Superada:** a redação anterior "nomes de treinos não precisam ser únicos dentro do Programa (nenhuma regra de unicidade foi definida)". Nomes iguais em Programas diferentes continuam permitidos.

**D12 — Modo de edição (Etapa 3, observação do humano):** registrado como princípio: não existe modo de edição — adicionar, editar e excluir estão sempre disponíveis. Alternativa "botão Editar que habilita os campos" **não foi considerada** porque o humano a refutou de antemão.

**D13 — Pacote de exclusões / YAGNI (Etapa 4):**
- *A — v1 só o planejado — ESCOLHIDA (YAGNI):* duplicar treino/exercício e reordenar treinos não foram pedidos em nenhum cenário do discovery; a menor versão que resolve a dor (montar a ficha nova do zero) não precisa deles.
- *B — v1 + duplicar treino/exercício:* ganha atalho raro (fichas são criadas a cada 2-3 meses, não clonadas); custa mais teste e UI. **Descartado.**
- *C — v1 + reordenação de treinos:* a ordem A/B/C é de criação e muda pouco; drag de treinos compete com o drag de exercícios no mesmo gesto no celular. **Descartado.**

**D14 — Unicidade de exercício no Programa (pedido do humano em 2026-10-01):**
- *Sem regra de unicidade (redação anterior da spec):* o mesmo exercício poderia entrar duas vezes no mesmo treino e em vários treinos do Programa. **Superada pelo humano.**
- *Unicidade no Programa — ESCOLHIDA:* o mesmo exercício da biblioteca aparece no máximo **uma vez dentro de um Programa** (nem duas vezes no mesmo treino, nem em dois treinos do mesmo Programa). A tentativa de adição é bloqueada com mensagem visível, com o modal aberto. Em Programas diferentes o mesmo exercício pode estar — a ficha de cada Programa é independente. Unicidade é por identidade do registro da biblioteca (a anti-duplicata de nome já é da #1).
- *Unicidade global (em qualquer lugar da biblioteca):* **não é o pedido** — o mesmo exercício deve poder ser usado por mais de um Programa (cada 2-3 meses nasce uma ficha nova).

**D15 — Subtítulo do treino (pedido do humano em 2026-10-01):**
- *O que é:* campo de texto do treino que junta os grupos musculares dos seus exercícios, no padrão "Peito, Tríceps e Ombros" (vírgula entre os itens, "e" antes do último; grupo repetido aparece uma vez; ordem = ordem dos grupos nos exercícios do treino).
- *Manutenção:* automática — atualiza ao adicionar ou remover um exercício e reflete o valor novo quando o músculo de um exercício do treino é editado na biblioteca; treino sem exercícios fica vazio.
- *Exibição:* na lista de treinos do detalhe do Programa, sob o nome do treino.
- *Alternativa não pedida:* campo editável que a pessoa ajusta à mão — **fora desta versão**; se a edição manual for desejada, é ajuste de escopo para a revisão.

**Formalizações de detalhe (consequências das decisões registradas — registradas aqui para transparência):** tempo de série em segundos (mesmo padrão do descanso); quantidade de séries inteira ≥ 1; carga não aceita negativos; ordem de treinos = ordem de criação; o mesmo exercício não pode aparecer duas vezes no mesmo Programa (D14) — pode aparecer em Programas diferentes; nome de treino é único por Programa com comparação normalizada (D11); a sugestão de nome segue A … Z, AA, AB … (D11); zerar a quantidade remove todas as séries com a mesma regra de confirmação; reordenação de séries não existe (ordem = criação); Programa só é excluído sem treinos e treino só é excluído sem exercícios (D6). Nenhuma dessas formalizações altera uma decisão do discovery.
