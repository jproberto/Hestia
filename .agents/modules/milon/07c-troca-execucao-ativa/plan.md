# 07c-troca-execucao-ativa Implementation Plan
> Para Zeus: delegar via hefesto/minos task por task

**Objetivo:** Impedir qualquer escrita num treino sem execução ativa enquanto o dono tiver uma execução aberta em outro treino, com trava no banco por dono e bloqueio visual com tooltip exato, e impedir a remoção de exercício enquanto o dono tiver execução aberta.

**Arquitetura:** Alternativa B (Hook Centralizada): um índice único parcial por dono substitui o índice por treino, um hook novo chamado useActiveExecution vira fonte única da execução aberta, e os pontos de escrita e de ativação/arquivamento consultam essa fonte antes de agir. A remoção de exercício é bloqueada no hook de detalhe com o texto exato de remover. Sem trigger no banco e sem modal de decisão.

**Tech Stack:** Next.js + React 18, Supabase via IDatabaseClient da camada lib/shared, Vitest com Testing Library e jsdom, migrações SQL incrementais auditadas em public.schema_migrations.

## Restrições Globais

- Invariante R1: máximo 1 execução aberta por dono, global, independente de programa.
- Mensagens exatas congeladas: tooltip de escrita com nome do treino ativo obtido da lista carregada; texto de arquivar; texto de ativar; texto de remover exercícios; texto de defesa contra corrida. Nenhum texto pode ser parafraseado.
- Leitura sempre livre (R3): troca de treino no switcher nunca é bloqueada.
- Sem modal de decisão (R5): só guarda visual mais índice parcial por dono.
- YAGNI fechado: sem push, sem auto-expiração, sem sync real-time, sem relatório de órfãs, sem API admin, sem migração de dados históricos, sem alteração em workout_executions além do índice.
- Padrão do módulo: promise-chain com flag cancelled, AsyncState centralizado para estados assíncronos de tela, UI importa só de barrels lib/milon/db, proibido criar services ou barrel lib/milon/index.ts, proibido importar supabase fora de lib/shared.
- Cobertura global mínima de 80 por cento preservada; erro de operação alimenta banner com origem operacao e relança; bloqueio de integridade usa origem bloqueio; modal nunca fecha no erro.

## 1. Arquitetura

A execução aberta passa a ser identificada por dono, não por treino. O banco garante com um índice único parcial sobre a coluna de autoria filtrando só execuções abertas. O repositório de execuções ganha a leitura por dono e o início de execução passa a recusar abertura quando já existe aberta de outro treino do mesmo dono. Um hook novo centraliza a execução aberta do usuário logado e a página do Treino do Dia deriva dela dois sinais: treino ativo e escrita bloqueada. A seção de detalhe suspende o pacote de execução e o editor quando bloqueada, mantendo leitura total. A ativação de programa é bloqueada no hook de programas e o arquivamento direto é bloqueado no repositório de programas, ambos com origem bloqueio. A remoção de exercício é bloqueada no hook de detalhe do treino, antes de qualquer exclusão, com origem bloqueio. A seleção e a rotação do Treino do Dia não mudam: continuam priorizando a aberta do programa ativo e a rotação por último selado.

Correções de leitura da spec feitas por Atena a partir do código real, que valem como verdade para todas as tasks. Primeiro: a tabela workout_executions não tem coluna de dono chamada owner_id nem coluna de exclusão lógica; o dono é a coluna de texto created_by (e-mail) e cancelar é exclusão física via clearExecution. Segundo: o índice atual filtra só execução aberta por data de encerramento nula, sem segundo predicado. Terceiro: programa não tem coluna de arquivamento; arquivar é transitar status para inativo. Quarto: os nomes reais de leitura são findOpenExecutionByWorkout, findOpenExecutionByProgram e findLastSealedExecutionByProgram; não existe findActiveByOwner nem findActiveByWorkout.

## 2. Componentes (Create/Modify/Test/Docs)

Criação nova, camada lib/milon/hooks, caminho de import permitido via barrels lib/milon/db para standalones, estratégia de teste com mocks de barrel e promessas resolvidas:

- Criar lib/milon/hooks/useActiveExecution.ts com a única responsabilidade de expor a execução aberta do dono logado: busca e-mail da sessão, lê a aberta por dono via barrel de execuções, publica execução, id do treino ativo, carregamento, mensagem e origem de erro e retry, no padrão promise-chain com flag cancelled.

Modificações, cada uma com camada, motivo e estratégia de teste:

- Modificar lib/milon/repositories/executions.ts (camada repositories, importa só IDatabaseClient de lib/shared e tipos da fonte única): adicionar leitura da aberta por dono ordenando por início decrescente com desempate por id; adicionar pré-cheque no início de execução que recusa com erro estável quando existe aberta de outro treino; remapear o tratamento de violação de unicidade para reler por dono e recusar em vez de devolver execução alheia, preservando idempotência quando a aberta é do mesmo treino. Teste via contrato fakes-only mais fake espelhado.
- Modificar lib/milon/repositories/interfaces.ts (contratos): declarar a operação de leitura da aberta por dono na interface de execuções. Teste via compilação e contrato.
- Modificar lib/milon/repositories/fakes/fakeWorkoutExecutionRepository.ts (fakes de contrato): espelhar a leitura por dono e a recusa de abertura com o mesmo texto do real. Teste via contrato.
- Modificar lib/milon/repositories/programs.ts (camada repositories): guardar a transição explícita para status inativo lendo direto a tabela de execuções pelo mesmo IDatabaseClient, sem importar o módulo de execuções, lançando o texto exato de arquivar. Teste com stub de cliente seguindo o padrão dos testes de barrel existentes.
- Modificar lib/milon/program-utils.ts (regras puras): duas guardas puras que recebem se há execução aberta e devolvem o texto exato ou nulo, uma para ativar e uma para arquivar. Teste unitário direto.
- Modificar lib/milon/hooks/useWorkoutExecution.ts (camada hooks): pré-cheque por dono em alternar série e em salvar série, com erro de origem bloqueio e relançamento, sem tocar na máquina de finalizar e cancelar. Teste de hook com barrels mockados.
- Modificar lib/milon/hooks/useWorkoutDetail.ts (camada hooks): pré-cheque por dono em removeEntry usando o e-mail da sessão antes de qualquer exclusão; com execução aberta do dono, grava a mensagem exata de remover exercícios com origem bloqueio e relança sem chamar removeEntryStandalone; sem aberta, segue o fluxo atual de excluir e recarregar. Estender o mapeamento de origem para que a mensagem exata de remover resulte em bloqueio. Teste de hook com barrels mockados.
- Modificar lib/milon/hooks/usePrograms.ts (camada hooks): pré-cheque em runActivation usando o dono do programa alvo, com origem bloqueio e relançamento, preservando a guarda de conteúdo existente. Teste de hook com barrels mockados.
- Modificar components/milon/WorkoutDetailSection.tsx (camada components, presentacional com composição): três novas props opcionais para treino ativo, escrita bloqueada e texto do tooltip; quando bloqueada, suspende pacote de execução e abertura do editor, mantém leitura, badge e slots de finalizar e cancelar só na aberta própria, e exibe barra de aviso com o texto do tooltip. Teste de componente.
- Modificar components/milon/WorkoutEntriesList.tsx (components): repasse opcional do texto do tooltip aos cards. Teste de componente.
- Modificar components/milon/SeriesCard.tsx e components/milon/ExerciseEntryCard.tsx (components): ramo somente-leitura passa a expor o tooltip como título acessível com marcador de desabilitado quando o texto está presente. Teste de componente.
- Modificar components/milon/TodayWorkoutSwitcher.tsx (components): prop opcional com id do treino ativo marcando a opção correspondente com sufixo textual de em execução. Teste de componente.
- Modificar app/milon/today/page.tsx (camada app, só composição): compor o hook novo, derivar bloqueado como aberta existente em treino diferente do selecionado, resolver o nome do treino ativo exclusivamente pela lista carregada do hook de seleção, e repassar props à seção e ao switcher. Teste de página com factories de mock com defaults.
- Não modificar lib/milon/hooks/useTodayWorkout.ts: a seleção já prioriza a aberta do programa e a troca manual segue livre por R3; o bloqueio vive na escrita, não na seleção.
- Não modificar lib/milon/types.ts: nenhum tipo novo é necessário; tudo usa os domínios existentes de execução e treino.

Testes espelho por camada, todos sob __tests__ espelhando o caminho:

- Contrato novo de repositório para a leitura por dono e a recusa de abertura.
- Testes de hooks para o hook novo, os pré-cheques de escrita, o pré-cheque de remoção R8 e o pré-cheque de ativação.
- Testes unitários das guardas puras e teste de conteúdo da migração 0016 seguindo o padrão do teste da 0015.
- Testes de componente para seção bloqueada, cards com tooltip, switcher com marcador, e teste de página do Treino do Dia.

Documentação: nenhum documento novo além de plan e tasks desta feature; Mnemósine atualiza os docs gerais após homologação.

## 3. Contratos

Contratos em linguagem natural, sem código de implementação. Nomes entre aspas são exatos e devem ser usados literalmente.

Repositório de execuções: nova operação de leitura que recebe o e-mail do dono e devolve a execução aberta mais recente desse dono ou nulo quando não há; aberta significa data de encerramento nula; ordenação por início decrescente com desempate por id decrescente. Operação de início passa a primeiro consultar a aberta por dono usando o e-mail informado; se existir aberta em treino diferente, lança erro com o texto de corrida congelado; se a aberta for do mesmo treino, devolve a existente sem trocar o início; se não houver, insere e em violação de unicidade relê por dono, devolvendo a do mesmo treino ou lançando o texto de corrida. Standalone nova com o mesmo nome mais sufixo Standalone recebendo só o e-mail.

Repositório de programas: operação de atualização passa a, quando a entrada pede status inativo, primeiro ler o dono atual do programa e procurar aberta desse dono na tabela de execuções; havendo aberta, lança o texto exato de arquivar sem escrever nada.

Regras puras: duas funções puras em program-utils, uma para ativação e uma para arquivamento, que recebem um booleano indicando se há execução aberta e devolvem o texto exato correspondente ou nulo quando não há.

Hook novo useActiveExecution: retorno com seis campos: execução ativa (domínio existente ou nulo), id do treino ativo (texto ou nulo), carregando (booleano), mensagem de erro (texto ou nulo), origem do erro (carga para falha de leitura) e retry (função que refaz a carga). Sem e-mail: execução nula sem erro. Falha de leitura: origem carga.

Hooks existentes: alternar série e salvar série passam a consultar a aberta por dono com o e-mail da sessão antes de qualquer escrita; com aberta em treino diferente, gravam a mensagem amigável de bloqueio com origem bloqueio e relançam; sem aberta ou com aberta no próprio treino, seguem o fluxo atual. Ativação de programa passa a consultar a aberta por dono do programa alvo antes da guarda de conteúdo; com aberta, grava o texto exato de ativar com origem bloqueio e relança.

Hook de detalhe: removeEntry passa a consultar a aberta por dono com o e-mail da sessão antes de qualquer exclusão; com execução aberta do dono, grava a mensagem exata de remover exercícios com origem bloqueio e relança sem chamar a exclusão; sem aberta, segue o fluxo atual de excluir, recarregar e confirmar. O mapeamento de origem do hook passa a classificar a mensagem exata de remover como bloqueio. Único ponto de chamada da exclusão na UI, portanto cobertura total sem mudança de assinatura no repositório.

Componentes: a seção de detalhe recebe treino ativo (texto ou nulo, padrão nulo), escrita bloqueada (booleano, padrão falso) e texto do tooltip (texto ou nulo, padrão nulo). Com escrita bloqueada verdadeira neste treino, o pacote de execução é indefinido, o editor nunca abre, a lista renderiza em modo leitura com título acessível igual ao tooltip, e uma barra de aviso exibe o tooltip em texto visível. A lista de entries repassa o tooltip; os cards aplicam título e marcador de desabilitado no ramo somente-leitura. O switcher recebe treino ativo opcional e sufixa a opção correspondente com o marcador textual de em execução.

Página do Treino do Dia: bloqueado é verdadeiro quando há execução ativa e o id dela difere do selecionado; tooltip usa o nome do treino ativo obtido exclusivamente da lista carregada do hook de seleção.

Textos congelados: tooltip de escrita no mesmo programa usa o padrão com o nome real, por exemplo com Treino A fica igual ao texto da spec AC1; arquivar usa o texto da spec AC5; ativar usa o texto da spec AC9; remover exercícios usa o texto da spec AC10; defesa contra corrida usa o texto próprio desta seção.

## 4. Data Flow

Fluxo de escrita bloqueada: usuário troca no switcher para treino sem execução, a página fornece bloqueado verdadeiro com o tooltip nomeado, a seção suspende o pacote de execução, o toque na série não alterna, o toque longo não abre o editor, e nenhuma chamada de escrita parte para o banco. Leitura de exercícios, séries e histórico segue intacta.

Fluxo de liberação: usuário volta ao treino ativo e finaliza ou cancela pela máquina existente; a execução deixa de ser aberta; o hook novo publica nulo; a página recalcula bloqueado falso; o outro treino aceita escrita imediatamente sem recarregar a página.

Fluxo de ativação bloqueada: usuário confirma ativação, o hook consulta a aberta pelo dono do programa alvo, encontra aberta em qualquer programa, grava o texto exato com origem bloqueio e relança; o modal segue o padrão de nunca fechar no erro e a lista exibe o banner sem retry.

Fluxo de arquivamento bloqueado: qualquer transição explícita para inativo passa pela guarda do repositório, que encontra a aberta do dono e lança o texto exato antes de escrever; o hook superfícializa como bloqueio.

Fluxo de remoção bloqueada R8: usuário tenta excluir entry em qualquer treino enquanto o dono tem execução aberta; o hook de detalhe consulta a aberta por dono, encontra aberta, grava o texto exato de remover com origem bloqueio e relança; nenhuma exclusão parte para o banco; o modal segue o padrão de nunca fechar no erro.

Fluxo de corrida entre dispositivos: dois toques simultâneos em treinos distintos tentam inserir; o índice único por dono deixa só um passar; o perdedor recebe violação de unicidade remapeada para o texto de corrida com origem de operação no hook.

## 5. Decisões Técnicas

Decisão central: Alternativa B, Hook Centralizada. Justificativa em quatro pontos. Primeiro, um índice único elimina a duplicidade da Alternativa A, que manteria duas travas sobrepostas com semânticas distintas e duas lógicas de consulta para manter. Segundo, o índice por dono é estritamente mais correto que o por treino para o invariante R1: o índice atual por treino impede inclusive dois donos distintos de abrirem o mesmo treino ao mesmo tempo, o que a spec permite, enquanto o índice por dono permite e ainda impede o que a spec proíbe. Terceiro, contra a Alternativa C, trigger no banco acopla regra de produto no banco, é difícil de testar no padrão fakes-only do módulo e contraria o YAGNI, já que a trava de corrida já é garantida pelo índice único e o restante é guarda de UX. Quarto, custo contido: uma migração incremental e refatoração de dois consumidores, sem mudar seleção, rotação, finalização nem cancelamento.

Decisões derivadas. Dono igual a created_by como texto de e-mail, consistente com todo o módulo, sem normalização nova. Cancelamento segue exclusão física, por isso o predicado parcial usa só data de encerramento nula. Arquivar igual a status inativo, sem coluna nova. Guarda de arquivamento no repositório como ponto único de estrangulamento de todas as transições para inativo, lendo a tabela de execuções direto pelo cliente para não criar importação cruzada entre repositórios. Guarda de ativação no hook para UX com origem bloqueio, antes da guarda de conteúdo existente. Guarda de remoção R8 no hook de detalhe, por ser o único ponto de chamada da exclusão na UI, sem mudança de assinatura no repositório, com origem bloqueio e relançamento, seguindo o mesmo padrão dos pré-cheques de escrita e ativação. Hook novo como fonte única consumida só pela página, sem alterar o hook de seleção. Tooltip usa o nome obtido exclusivamente da lista carregada, pois R7 mais programa-ativo garantem presença.

Alternativas rejeitadas. Alternativa A rejeitada por lógica duplicada e por proibir abertura simultânea do mesmo treino por donos distintos, contrariando R1. Alternativa C rejeitada por acoplamento no banco, testabilidade inferior e custo de versionamento sem ganho funcional sobre índice mais guardas.

## 6. Riscos e Mitigações

Corrida entre dispositivos: aceita como limitação conhecida da spec; mitigada pelo índice único que converte a corrida em erro tratado com texto estável; sem sync real-time por YAGNI.

Execuções abertas legadas violando o invariante: mais de uma aberta por dono na base impediria a criação do índice único; mitigada por pré-cheque manual documentado na task de migração e resolução pela UI existente de finalizar ou cancelar, sem backfill automático por YAGNI.

E-mail como chave textual: comparação exata consistente com o restante do módulo; sem normalização nova para não divergir do comportamento vigente.

Guarda de arquivamento sem botão na UI atual: a transição para inativo hoje só ocorre como efeito colateral de ativação, já coberta pela guarda de ativação; a guarda no repositório protege o ponto de estrangulamento para chamadas presentes e futuras, testada com stub de cliente.

Nome do treino ativo: R7 mais programa-ativo garantem que a aberta está no programa ativo, portanto presente na lista carregada usada pelo tooltip; sem caminho alternativo.

## Mapeamento Schema → Código

| Tabela | Coluna | Migração | Repositório | Hook | Componente |
|---|---|---|---|---|---|
| workout_executions | created_by com finished_at nulo | 0016 cria índice único parcial por dono e remove o índice por treino | lib/milon/repositories/executions.ts com leitura por dono e início com pré-cheque | lib/milon/hooks/useActiveExecution.ts como fonte única; lib/milon/hooks/useWorkoutExecution.ts com pré-cheque de escrita | app/milon/today/page.tsx compõe bloqueado e tooltip; components/milon/WorkoutDetailSection.tsx suspende execução; SeriesCard e ExerciseEntryCard exibem tooltip |
| workout_executions | id e workout_id para vínculo da aberta | 0011 existente inalterada | mesmo repositório de execuções | mesmo hook novo | components/milon/TodayWorkoutSwitcher.tsx marca a opção ativa |
| programs | status para inativo | sem migração, coluna existente | lib/milon/repositories/programs.ts com guarda de arquivamento na atualização | lib/milon/hooks/usePrograms.ts com pré-cheque de ativação | app/milon/programs/page.tsx sem mudança, consome erro via hook |
| programs | owner para dono da guarda | sem migração | mesmo repositório de programas | mesmo hook de programas | mesma página de programas |
| workouts | id e name para nome do tooltip | sem migração | leitura existente de treinos por programa | página resolve nome pela lista do hook de seleção | mesmo switcher e seção |
| workout_entries | id para exclusão bloqueada R8 | sem migração | sem mudança no repositório de treinos | lib/milon/hooks/useWorkoutDetail.ts com pré-cheque de remoção por dono | components/milon/WorkoutDetailSection.tsx consome erro via hook sem mudança visual nova |

## Contratos Completos

Tipos: sem mudança na fonte única; execução, treino e programa usam os domínios existentes; aberta continua significando data de encerramento nula.

Interfaces de repositório: a interface de execuções ganha a operação de leitura da aberta por dono recebendo o e-mail e devolvendo a execução ou nulo; as demais operações mantêm assinatura, incluindo removeEntry sem mudança.

Signatures de hooks: o hook novo devolve execução ativa, id do treino ativo, carregando, mensagem de erro, origem do erro e retry; alternar série e salvar série mantêm assinatura e ganham comportamento de bloqueio com origem bloqueio; removeEntry mantém assinatura e ganha pré-cheque R8 com origem bloqueio; ativação mantém assinatura e ganha pré-cheque com origem bloqueio.

Props de componentes: seção com treino ativo, escrita bloqueada e texto do tooltip, todos opcionais com padrões nulo, falso e nulo; lista com tooltip opcional; cards com tooltip opcional aplicado no ramo somente-leitura; switcher com treino ativo opcional; página sem props novas.

## Migrações

Migração 0016 com arquivo em utils/migrations chamado migration-0016-milon-execucao-por-dono.sql, número reservado por este plano por ser o inteiro seguinte ao 0015 da 07b. Conteúdo em linguagem natural: primeiro remove o índice único parcial por treino criado na 0011; depois cria índice único parcial sobre a coluna de autoria filtrando só linhas com data de encerramento nula; depois registra auditoria em public.schema_migrations com identificador da feature, nome da feature e nome do script idêntico ao nome do arquivo, ignorando conflito pelo nome do script; inclui o bootstrap idempotente da tabela de auditoria seguindo o padrão das migrações anteriores. Backfill: nenhum, pois não há coluna nova; pré-condição manual documentada de que nenhum dono pode ter mais de uma aberta, verificável por agregação por autoria filtrando abertas, com resolução pela UI de finalizar ou cancelar. Rollback em texto: remover o índice por dono e recriar o índice por treino, aplicável somente onde a 0016 ainda não foi promovida, nunca editando arquivo aplicado. Auditoria: valor de script_name idêntico ao nome do arquivo.

## Código Legado/Removível

| Item | Critério de Busca Zerada | Arquivos Afetados |
|---|---|---|
| Índice único parcial por treino da 0011 | busca pelo nome do índice antigo retorna 0 ocorrências em código vivo fora de utils/migrations | utils/migrations apenas como histórico; nenhum arquivo de lib, components ou app deve citar o nome |
| Nomes fantasmas da spec sem existência no código (coluna owner_id, coluna deleted_at em execuções, coluna archived_at em programas, operações findActiveByOwner e findActiveByWorkout) | busca por cada nome retorna 0 ocorrências introduzidas pela feature; proibido criar esses nomes | nenhum arquivo deve ser criado com esses nomes; plano usa created_by, exclusão física, status inativo e findOpenExecutionByOwner |

## Tasks

Sete tasks em DAG acíclico, detalhe executável em tasks.json ao lado deste plano: primeira de contrato RED do Minos, segunda de persistência do Hefesto com a migração 0016, terceira de RED de hooks do Minos incluindo R8, quarta de hooks do Hefesto incluindo R8, quinta de RED de componentes e página do Minos em paralelo lógico após a persistência, sexta de componentes e página do Hefesto, sétima de suíte completa e gates do Minos. R8/AC10/EC7 rastreados nas tasks de hooks. Toda task de substituição carrega o critério de busca zerada do índice antigo.

## Self-Review

Cobertura da spec: R1 via índice e leitura por dono; R2 via suspensão do pacote e pré-cheques; R3 via seleção intocada; R4 via badge existente mais marcador do switcher e barra de aviso; R5 sem modal; R6 via guarda no repositório; R7 via pré-cheque no hook; R8 via pré-cheque de remoção no hook de detalhe; AC1 a AC10 e EC1 a EC7 mapeados nas tasks sem cenário de homologação definido no plano. Placeholders: proibidos e verificados na task final. Consistência: nomes exatos repetidos entre contrato, hook, componente e testes. Ordem: contrato antes de persistência, RED antes de implementação, persistência antes de hooks e componentes, tudo antes da suíte final. Verificação: cada task termina com comando exato e resultado esperado.

Entrega Atena concluída. PARA AQUI: aguardar approve-plan humano explícito com PLAN_APPROVED antes de qualquer CODING. Zeus não deve promover para TASKS_READY nem delegar implementação sem essa aprovação.
