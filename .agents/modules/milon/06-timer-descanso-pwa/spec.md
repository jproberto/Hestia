# Spec: Timer de descanso auto + PWA push

> **Contém a Emenda 2026-10-23 — correção de temporização do push** (3 alavancas aprovadas pelo humano: relógio de referência no clique com campo `elapsed`, resposta 202 imediata com espera em background, cancel-all por dono no INSERT). Em caso de conflito com o texto anterior, vale a emenda — ver seção própria.

## 1. Problema Real

Na execução série a série (Mílon #5), cada exercício no treino já tem um descanso planejado em segundos (`restSeconds` na entrada do exercício). Ao marcar uma série como feita, a pessoa descansa — mas o sistema não faz nada com esse número: não inicia contagem, não avisa o fim. O descanso planejado é só um rótulo na tela.

O pedido humano em 2026-10-16, fonte de escopo desta feature, é objetivo: ao marcar uma série como feita, o sistema começa o timer com o tempo de descanso daquele exercício; quando o timer atinge esse tempo, o usuário é avisado de alguma forma de que o descanso acabou. "Só isso."

O backlog do módulo (item 6, Bloco 2) fixa que o aviso precisa funcionar mesmo com a tela apagada ou o app em segundo plano, e que o MVP desta feature inclui o PWA mínimo para isso. O app hoje não é PWA: não há manifest, não há service worker, não há biblioteca de PWA no projeto. O PWA mínimo é escopo real desta feature, não opcional.

Decisão humana de 2026-10-16, após consulta à Atena sobre as consequências de plataforma: "Usamos iphone. O ideal seria o aviso chegar com tela apagada, em outra página do hestia ou até em outro aplicativo." Essa resposta escolhe o Caminho 2 da consulta — **push de servidor (Web Push com VAPID) com o PWA mínimo como pré-requisito obrigatório** — e revoga o escopo anterior de "nenhuma migração, nenhum backend" desta spec. O custo (migração 0017 para assinaturas e agendamento, primeiro endpoint de rota do app, biblioteca de push do servidor, chaves VAPID e cancelamento de push agendado) foi mostrado ao humano junto com a opção antes da escolha e está aceito.

## 2. Usuários e Cenários

Usuários: o casal, com login individual cada um, mesmo modelo das features 01 a 07c. Cada um abre o próprio treino ao chegar na academia. Não há permissão restrita. Uso no celular — os dois donos usam **iPhone** (fato da decisão de 2026-10-16), com o Treino do Dia (`/milon/today`) como aba principal do módulo. Android é coberto pela mesma entrega de push, sem prioridade de homologação.

Cenário 1: marcar série e contar o descanso. A pessoa toca no card da série desmarcada, ela fica marcada na hora, e o timer de descanso daquele exercício inicia automaticamente com o valor de `restSeconds` da entrada; junto, o fim do descanso é agendado no servidor.

Cenário 2: fim do descanso com aviso em qualquer contexto. O tempo planejado se esgota e o usuário é avisado de que o descanso acabou: com a aba visível, um aviso visual no Treino do Dia; com a tela apagada, em outra página do Héstia ou até em outro aplicativo em primeiro plano, um push de servidor entregue como notificação no iPhone (e em Android) — sempre e somente para a pessoa que iniciou o timer, o dono do treino.

Cenário 3: série seguinte. A pessoa marca a próxima série quando quiser, sem esperar o aviso se preferir; a marcação em si não muda em relação à #5.

Cenário 4: descanso ausente ou zerado. Exercício com `restSeconds` nulo ou zero não oferece contagem com aviso — a marcação da série segue exatamente como hoje, sem timer e sem agendamento de push.

Cenário 5: instalação do app no iPhone. Para o push funcionar, a pessoa precisa ter o Héstia em "Adicionar à Tela Inicial" e concedido a permissão de notificação por gesto; o fluxo da feature instrui essa instalação e esse gesto, sem bloquear a marcação se ela não acontecer.

Jornada passo a passo: a pessoa abre o Treino do Dia, tem o treino com execução aberta ou inicia pela primeira marcação (regras da #5 e #7c intactas). Ao conceder permissão (uma vez por dispositivo), a assinatura de push do dispositivo fica registrada. Ao tocar no card de uma série desmarcada, o `toggleSeries` marca a série e, se a entrada daquele exercício tiver `restSeconds` maior que zero, o timer inicia no cliente e o fim do descanso é agendado no servidor para o instante T mais `restSeconds`. A contagem regressiva corre no cliente para a camada visual. Ao chegar a zero, as duas camadas disparam: aviso visual na interface (aba visível) e push de servidor (tela apagada, outra página ou outro app). A pessoa retoma a próxima série. O timer de cliente não altera execução, marcações, selamento nem rotação; o único dado persistente novo é assinatura e agendamento de push (migração 0017).

Estados de tela: o timer é estado de cliente, sem novo estado assíncrono de carga remota. O aviso visual segue a linguagem de feedback do módulo (cor do Mílon, tokens de conteúdo). Erros de operação de marcação continuam no banner de operação da #5, sem relação nova com o timer. O aviso de fim de descanso não é banner de erro nem de sucesso do hook — é componente de feedback próprio da feature. Falha ao agendar ou enviar push nunca bloqueia nem falha a marcação: a camada visual é a garantia de feedback com a aba visível; a camada de push é melhor esforço sujeita à plataforma.

## 3. Regras de Negócio

### Início automático do timer

- O gatilho é a marcação bem-sucedida de série como feita no Treino do Dia, pelo caminho já existente de alternância da #5 (`toggleSeries` no fluxo de execução). Só a marcação inicia; a desmarcação não inicia timer.
- O valor de duração é sempre o `restSeconds` da entrada do exercício (entry) da série marcada — o mesmo descanso único por exercício já planejado na #3 e editável na manutenção e no Treino do Dia. Não existe descanso por série no modelo atual e esta feature não cria.
- Só inicia quando `restSeconds` for um número maior que zero. Nulo ou zero: nenhuma contagem, nenhum agendamento, nenhum aviso; marcação comporta-se exatamente como hoje.
- O timer de contagem é de cliente: regressiva em memória da sessão aberta, para a camada visual. Junto à marcação, o **fim do descanso é agendado no servidor** (contrato textual: o cliente solicita ao endpoint o agendamento de um push para o instante T mais a duração da entry, para a assinatura do dispositivo do dono que iniciou o timer — o dono do treino, o mesmo que está com a execução e que registrou a marcação). **Emenda 2026-10-23:** T é ancorado ao **clique do usuário** que iniciou o timer — o cliente envia o campo opcional `elapsed` (ms entre o clique e o disparo do POST de agendamento) e o servidor calcula o instante de disparo como `agora_servidor + max(0, durationSeconds − elapsed/1000)`; `elapsed` ausente mantém o comportamento retrocompatível (`agora + duração`) — ver seção da emenda. O push só é enviado para esse dono, nunca para outra pessoa.
- Nenhuma escrita em `workout_executions`, `workout_execution_series` ou template por conta do timer nem do agendamento. As tabelas tocadas são só as da migração 0017 (assinaturas de push e agendamentos), sem alteração das existentes.

### Aviso no fim do descanso — duas camadas

- **Camada 1, sempre que a aba estiver visível:** aviso visual no Treino do Dia indicando que o descanso do exercício terminou. Não abre modal, não navega, não muda foco de forma destrutiva, não marca nem desmarca série sozinho. A pessoa pode ignorar e continuar; marcar a próxima série a qualquer momento é sempre permitido.
- **Camada 2, com tela apagada, em outra página do Héstia ou em outro aplicativo:** push de servidor (Web Push com VAPID) entregue no instante do fim do descanso, exibido como notificação pelo sistema no iPhone do usuário (e em Android), **exclusivamente para o dono que iniciou o timer/execução** — o casal pode consultar o treino um do outro, mas o parceiro espectador nunca recebe esse push. O envio é sempre do servidor: os serviços de push removeram CORS e o cliente não pode enviar push sozinho.
- O service worker do app **exibe obrigatoriamente a notificação ao receber o push** — no iOS, push recebido sem exibição faz o Safari revogar a permissão de notificação do app. Esse tratamento é requisito do handler de push, não opcional.
- O conteúdo da notificação nomeia o contexto mínimo: que o descanso do exercício terminou. Mesma semântica da camada 1.
- Duas camadas podem ocorrer na mesma finalização do descanso (push com aba visível também chega); não há conflito — o usuário descarta ambos.

### Infraestrutura PWA + push (pré-requisito obrigatório)

- O MVP inclui o PWA mínimo para o push funcionar: manifest do app (ícone, nome, cores do Héstia), service worker com tratamento de push (exibição obrigatória da notificação), registro do service worker e canal de push. No iPhone, o web push só é entregue para web app instalado por "Adicionar à Tela Inicial" (display standalone) e a permissão só pode ser solicitada por gesto — o fluxo da feature **instrui a instalação no iPhone e o gesto de permissão como passo obrigatório para o push funcionar** (resolvida no approve-spec de 2026-10-16: a instrução de instalação é parte do escopo; não há prompt agressivo forçado).
- Sem instalação no iPhone não existe sequer a API de notificação, e sem permissão não há push: nesses casos a camada 2 fica indisponível e a degradação é a camada 1 (aviso visual com a aba visível) — a marcação nunca é impedida por isso.
- O registro por gesto e a instrução de instalação acontecem uma vez por dispositivo; a assinatura de push fica registrada na migração 0017 e é específica de cada dispositivo de cada dono.

### Endpoint de agendamento e cancelamento de push

- A feature cria o **primeiro endpoint de rota (route handler) do app**, responsável por agendar e enviar o push no fim do descanso: a chamada do cliente agrega o agendamento para T mais `restSeconds`, com sleep no próprio endpoint cobrindo descansos dentro da janela de execução da função da Vercel (limite real de 300 segundos). **Emenda 2026-10-23: o sono dentro do request foi substituído** — a rota responde `202` imediatamente após o INSERT (status `agendado`) e a espera + re-leitura + envio rodam em background via `after()` do Next.js (estável na versão ^16.2.10 do projeto); o limite de janela da função permanece. Para descansos maiores que 300 segundos vale a regra resolvida no approve-spec: o push é entregue assim que a janela da função permitir (o mais perto possível do fim planejado), com a camada visual cobrindo o atraso — **mantida sem alteração (decisão 7)**.
- Todo evento de "encerramento silencioso" do timer descrito abaixo ganha **obrigação de cancelar o push agendado no servidor**, além de parar a contagem de cliente: sem isso, um push órfão chegaria após finalizar ou cancelar. **Emenda 2026-10-23:** o `cancel` passa a ser processado **de imediato** no servidor (sem fila atrás de POSTs de agendamento pendurados — consequência da resposta 202 imediata); além disso, o INSERT de um novo agendamento cancela (status `cancelado`) **todo** agendamento anterior no estado `agendado` do **mesmo dono** (`created_by`) — cancel-all por dono, cobrindo reload, aba dupla e cancel perdido. A troca de treino para consulta **não** é encerramento silencioso — não cancela o push.
- O agendamento é do dono que iniciou o timer: o destinatário registrado no agendamento é a assinatura daquele dono, e o endpoint nunca envia o push do descanso para outro usuário.
- Substituir o timer por nova marcação também cancela o agendamento anterior e cria o novo — **Emenda 2026-10-23: invariante por dono no servidor, no máximo um agendamento ativo por `created_by`**, imposta no INSERT via cancel-all (substitui "um agendamento ativo por sessão de cliente").
- Falha no agendamento, no cancelamento ou no envio alimenta o tratamento de erro já existente (marcação nunca falha por conta disso) e é observável pelo desenvolvedor; o usuário não vira refém de infraestrutura de push.

### Timer e fluxos de execução existentes

- Marcar outra série com timer rodando: o timer vigente é substituído pelo da nova série marcada (reinicia com o `restSeconds` da entry recém-marcada) e o push agendado anterior é cancelado no servidor. Só um timer e um agendamento ativos por vez — **Emenda 2026-10-23: no servidor, no máximo um agendamento `agendado` por dono (invariante imposta no INSERT via cancel-all por `created_by`)**.
- Desmarcar série com timer rodando: o timer e o push seguem — o descanso em curso é independente da desmarcação pontual. Se a desmarcação for a última marcada e abrir a pergunta de cancelamento da #5, o timer é encerrado e o push agendado é cancelado ao confirmar o cancelamento; ao apenas fechar a pergunta sem confirmar, timer e push seguem.
- Editar o descanso (`restSeconds`) da entrada com timer rodando: o timer em curso e o push agendado mantêm a duração com a qual foram iniciados (valor capturado no início). A edição vale para marcações futuras. Não há reinício retroativo nem reagendamento do que está em andamento.
- Finalizar ou cancelar o treino com timer rodando: o timer é encerrado silenciosamente e o push agendado é cancelado (sem aviso de fim de descanso após o selamento ou o cancelamento).
- Trocar de treino no Treino do Dia com timer rodando (consulta livre da 7b/7c): **o timer e o push permanecem ativos** — a troca pode ser só uma conferida enquanto a pessoa descansa (emenda do approve-spec de 2026-10-16). Ao voltar ao treino de origem, a contagem visual continua de onde parou. Se o descanso zerar enquanto a pessoa estiver em outro treino, o push avisa normalmente (é o caso de uso "outra página"). Timer e push só terminam nos eventos de encerramento silencioso: finalizar, cancelar, confirmar o cancelamento da última série desmarcada — ou a substituição por nova marcação.
- Confirmar o cancelamento da última série desmarcada (pergunta da #5) conta como encerramento silencioso: timer encerrado e push cancelado.
- Manter o celular com a tela apagada ou o app em segundo plano durante a contagem é o caso de uso central do push, não um edge case de lab — no iOS, o JavaScript e os timers do cliente são suspensos nesse estado, e é exatamente por isso que o aviso de segundo plano é push de servidor e não notificação local agendada pelo próprio cliente.

### O que não muda

- A marcação, o selamento da #7, a rotação da #7b/#7b-1 e a guarda da #7c seguem intactos; a migração 0017 não toca `workout_executions`, `workout_execution_series`, índices de execução nem template.
- Sem validação nova de domínio. Sem novo campo obrigatório de treino/série. Sem novo modal de confirmação de marcação.
- O descanso continua editável no fluxo da #3/#5 (manutenção e Treino do Dia), com a semântica de que a edição não reescreve timer nem agendamento em andamento.

## 4. Fora de Escopo (YAGNI)

Dentro desta versão, somente: início automático do timer na marcação, contagem com o `restSeconds` da entry, aviso nas duas camadas (visual em tela + push de servidor), PWA mínimo (manifest, service worker com handler de push, instrução de instalação no iPhone e permissão por gesto), endpoint de agendamento/cancelamento de push, e a migração 0017 de assinaturas e agendamentos.

Fora, item por item: descanso por série (só por entry, como já é); múltiplos timers simultâneos em exercícios distintos; timer visível como cronômetro flutuante persistente em todas as telas do módulo além do Treino do Dia em execução; **push de servidor para eventos além do fim do descanso — nesta versão o push nasce limitado ao fim do descanso, e estender a outros eventos (novo treino, lembrete de academia, cobrança do Pluto etc.) é que fica fora**; agendamento de treino; histórico de descansos; ajuste fino de som, vibração ou ícone de notificação por perfil; permissões novas além da de notificação; offline completo do Treino do Dia sem rede; sincronização de timer entre dispositivos do mesmo dono; reintegração perfeita do cliente com o relógio do servidor (fuso, drift e sono prolongado do celular tratados de forma ideal); push de servidor para outros módulos; RPE/RIR, séries de aquecimento, observações rápidas (fora do backlog do módulo); qualquer alteração de `workout_executions`, `workout_execution_series` ou de índices de execução.

## 5. Critérios de Aceite

| número | Critério | Verificação |
|---|---|---|
| 1 | Dado o Treino do Dia com execução, quando marco uma série como feita em exercício com `restSeconds` maior que zero, então o timer inicia automaticamente com esse valor e o fim do descanso é agendado no servidor, sem gesto adicional, com o instante de disparo do push ancorado ao clique do usuário que iniciou o timer (campo `elapsed`), mirando o mesmo instante físico do zero do contador visual — viés máximo de ±1–2s (limite físico do FCM/APNs); `elapsed` ausente cai no comportamento retrocompatível (agora + duração) | Manual e automatizado (Emenda 2026-10-23) |
| 2 | Dado o push agendado para o fim do descanso, quando o tempo se esgota, então a notificação é entregue somente no dispositivo do dono que iniciou o timer, com a tela apagada, em outra página do Héstia ou em outro aplicativo em primeiro plano, no iPhone e em Android; nunca para o parceiro espectador | Manual (dispositivo real, iPhone do casal) |
| 3 | Dado exercício com `restSeconds` nulo ou zero, quando marco uma série, então nenhum timer é iniciado, nenhum push é agendado e nenhum aviso de fim de descanso ocorre; a marcação é idêntica à da #5 | Automatizado |
| 4 | Dado timer e push agendados, quando marco outra série (em outro exercício ou no mesmo), então o timer vigente é substituído pelo da nova série com o `restSeconds` da entry recém-marcada, todo agendamento pendente anterior do MESMO dono é cancelado no servidor (invariante: no máximo um agendamento ativo por dono — cancel-all por `created_by` no INSERT) e o novo é criado | Automatizado (Emenda 2026-10-23) |
| 5 | Dado timer e push agendados, quando edito o `restSeconds` da entry, então o timer em curso e o agendamento mantêm a duração com a qual foram iniciados e a edição vale para as próximas marcações | Automatizado |
| 6 | Dado timer rodando, quando finalizo ou cancelo o treino com sucesso, então o timer é encerrado, o push agendado é cancelado no servidor e nenhum aviso de fim de descanso é disparado depois disso | Automatizado |
| 7 | Dado timer rodando no treino exibido, quando troco para outro treino no Treino do Dia apenas para consultar, então timer e push permanecem ativos; ao voltar ao treino de origem a contagem visual continua de onde parou, e se o descanso zerar enquanto estou em outro treino o push é entregue normalmente | Manual e automatizado |
| 8 | Dado um push agendado, quando finalizar ou cancelar acontecem com sucesso, então nenhum push de fim de descanso é entregue após esse cancelamento — o cancelamento é processado de imediato no servidor (sem fila atrás de agendamentos pendentes); o cancel-all por dono ao criar novo agendamento é um cancelamento por dono, coerente com RLS; a troca de treino para consulta não cancela o agendamento | Manual (dispositivo real) e automatizado (contrato de cancelamento e cancel-all — Emenda 2026-10-23) |
| 9 | Dado o aviso de fim de descanso, quando ele aparece (visual ou notificação), então o usuário pode descartá-lo e marcar a próxima série normalmente, sem bloqueio nem navegação forçada | Manual |
| 10 | Dado o app sem instalação no iPhone, sem permissão de notificação ou sem service worker registrado, quando o timer termina com a aba em primeiro plano, então o aviso visual em tela ainda ocorre; a marcação nunca é impedida por falta de instalação ou permissão | Manual |
| 11 | Dado o fluxo de marcação, desmarcação, finalizar, cancelar e rotação existentes, quando comparo com o comportamento anterior à feature, então nada mudou além do timer, do agendamento e dos avisos | Manual e automatizado (regressão) |
| 12 | Suíte completa verde, sem quebra de testes existentes, cobertura mantida em pelo menos oitenta por cento, relatório de testes regenerado antes da revisão | Automatizado |
| 13 | Dado o clique que inicia o timer, quando o POST de agendamento é disparado, então o push mira o mesmo instante físico do zero do contador (clique + duração), com viés máximo de ±1–2s (limite FCM/APNs); `elapsed` ausente mantém o comportamento retrocompatível (agora + duração) | Automatizado (contrato do cálculo do instante de disparo) e manual (homologação com dispositivo real — Emenda 2026-10-23) |
| 14 | Dado o POST de agendamento, quando o servidor responde, então a resposta é imediata (202) com o corpo expondo o estado `agendado` — a resposta não significa "enviado"; `sent_at` só é preenchido após o envio real em background; o `cancel` é processável de imediato, sem fila atrás de POSTs pendurados | Automatizado (contrato da rota — Emenda 2026-10-23) |

## 6. Riscos e Dependências

Depende da execução série a série da #5 (marcação por `toggleSeries`, `restSeconds` na entry), do Treino do Dia da #4/#7b, do selamento da #7 e da guarda da #7c. Sem a marcação real de série e sem o campo de descanso por entry, não há gatilho nem duração.

O risco principal é de plataforma e de infraestrutura, não de domínio. Fatos de plataforma verificados em fonte pela Atena e assumidos como verdade nesta spec: no iOS 16.4+, web push só é entregue para web app instalado ("Adicionar à Tela Inicial", display standalone), com permissão apenas por gesto e sem notificação em aba do Safari (F1); em mobile é obrigatório exibir a notificação via registro do service worker, pois o constructor de notificação da página falha, e o Safari revoga a permissão se um push chegar sem exibir (F2); o iOS suspende JavaScript e timers com o app em background ou tela apagada, o que faria notificação local agendada no cliente disparar só no retorno (F3) — razão do push de servidor; os serviços de push removeram CORS, então o envio é sempre servidor (F8); o agendamento de notificação local pela web (Notification Triggers) foi descontinuado (F9); notificação local via service worker existe no iOS mas só em app instalado, e sem instalação não há sequer API de notificação (F10/F12).

A Vercel Hobby limita cron a uma execução por dia e a função a 300 segundos de execução; descansos de até cerca de 5 minutos são cobertos por espera dentro do endpoint, e descansos maiores que 300 segundos são o limite real da abordagem — comportamento resolvido no approve-spec de 2026-10-16: o push é entregue assim que a janela da função permitir (o mais perto possível do fim planejado) e a camada visual cobre o atraso. Supabase Edge Functions (150s no Free, 400s no Paid) foi considerada como hospedagem alternativa e descartada por janela menor sem ganho (F7).

Criar o PWA, o service worker e o endpoint toca `app/layout.tsx`, `public/` (ícone/manifest), o registro de service worker e o primeiro route handler do app — superfície transversal do app Héstia, não só do Mílon; aceito como parte do MVP pela decisão de 2026-10-16. Conflito potencial com features futuras de offline ou push de outros módulos (Pluto) é real, mas o push desta versão nasce limitado ao fim do descanso.

A feature consome a migração **0017** (`utils/migrations/migration-0017-<slug>.sql`) para persistir assinaturas de push e agendamentos — a premissa é de que seja a única migração nova, sem alteração de tabelas existentes; a reserva do número e a definição exata do script são do plano da Atena (nenhuma migração já aplicada é editada ou renomeada). Chaves VAPID e segredo de push vivem em variáveis de ambiente, nunca no repositório.

Concorrência entre os dois donos segue sem mudança de domínio: cada um tem seu próprio Treino do Dia, seu próprio timer de cliente e a própria assinatura de push por dispositivo; agendamentos são do dono que iniciou a marcação, sem estado compartilhado entre os dois. **O push do fim do descanso é enviado somente ao dono do treino — quem iniciou o timer/execução —; o casal pode consultar o treino um do outro (leitura livre da 7b/7c), mas o parceiro espectador nunca recebe o push do descanso do outro** (emenda do approve-spec de 2026-10-16). Dispositivos distintos do mesmo dono com a mesma execução aberta seguem sem sincronização em tempo real, mesma limitação conhecida da 7c — a assinatura é por dispositivo, então cada aparelho do mesmo dono pode ter seu próprio registro.

A validação em dispositivo real (iPhone do casal) é obrigatória na homologação para o critério 2 e 8, não substituível por suíte automatizada.

## 7. Alternativas Consideradas

### Mecanismo do aviso de fim do descanso

Alternativa A: aviso visual em tela + notificação local do sistema agendada pelo próprio cliente via service worker. Considerada e descartada como caminho único porque a notificação local agendada pelo cliente não sobrevive à suspensão de JavaScript do iOS com tela apagada (F3) e o agendamento local de notificação pela web foi descontinuado (F9); além disso, no iOS só funciona em app instalado (F10/F12). **Permanece como camada 1 complementar** (aviso visual com a aba visível), mantida em toda a spec.

Alternativa B: som ou vibração do dispositivo disparados por cronômetro de página. Descartada: não é confiável com tela apagada com timers de página suspensa (F3) e contraria o ponto PWA do backlog.

Alternativa C — **escolhida pelo humano em 2026-10-16**: push de servidor (Web Push com VAPID) com o PWA mínimo como pré-requisito, entregando o aviso com tela apagada, em outra página do Héstia ou em outro aplicativo, no iPhone do casal. A favor: único caminho que atende o "ideal" declarado pelo humano, dado que o cliente não pode nem agendar notificação local confiável (F3/F9) nem enviar push sozinho (F8). Contra aceito com o custo mostrado: endpoint no servidor (primeiro route handler do app), biblioteca de push do servidor, chaves VAPID, migração 0017 de assinaturas/agendamentos, cancelamento obrigatório em todo encerramento silencioso e limite de 300s da função da Vercel (F6).

Hospedagem do envio: endpoint na Vercel (route handler do app, com espera interna até o instante do fim do descanso dentro da janela de 300s) — escolhida por ser a infraestrutura já existente do app. Supabase Edge Functions descartada (F7: 150s Free / 400s Paid, janela menor ou equivalente sem ganho).

### Estado do timer

Alternativa 1 (mantida): timer de contagem em memória do cliente, sem persistir a contagem entre recargas de página ou fechamento do app. O push agendado no servidor é independente da persistência do cliente: como resolvido no approve-spec de 2026-10-16, **o push dispara mesmo assim ao fechar ou recarregar o app**. A troca de treino para consulta na mesma sessão também não encerra o timer (emenda do approve-spec) — a contagem continua e é retomada ao voltar ao treino de origem. A favor: o mais simples, alinhado com "só isso", sem novo dado de timer. Contra: a pessoa que fechar e reabrir o app no meio do descanso não vê a contagem restante restaurada (o push, sim, chega).

Alternativa 2: persistir o fim do timer em armazenamento local do dispositivo para restaurar a contagem ao reabrir. Descartada nesta versão: acrescenta estado a ser invalidado a cada finalizar e cancelar, e não é necessária para o push (que é agendado no servidor e dispara mesmo com o app fechado — decisão resolvida no approve-spec).

## Emenda 2026-10-23 — correção de temporização do push

**Status:** emenda aprovada pelo humano em 2026-10-23 (delegação a Hera, sem decisão própria). Substitui, em caso de conflito, os pontos de contrato listados nesta seção; todo o resto da spec permanece válido, inclusive as decisões de 2026-10-16.

### Contexto (defeito real de homologação)

Homologação em localhost/Windows com o casal em iPhone encontrou defeito intermitente: a notificação chega **antes** do contador visual zerar (em outras janelas/outras abas) e **muito depois** do contador zerar. Investigação (duas rodadas de exploração) confirmou causas estruturais:

1. **Dois relógios independentes:** o contador visual é um `setInterval` no cliente; o instante de disparo do servidor é calculado depois de ~4 roundtrips (auth + busca + upsert) — o push nasce com viés estrutural de atraso de 0,3–3s.
2. **Agendamentos órfãos:** reload sem cancelar (o id do agendamento só na memória da aba; cancel fire-and-forget com `.catch` vazio; corrida cancel-vs-INSERT) → pushes extras contra o contador novo.
3. **POST de agendamento mantém a resposta aberta até o disparo** (sono de até 280s dentro do request) → enfileiramento de pool HTTP/1.1 em dev e cancel atrasado.
4. **Limite físico de plataforma:** FCM/APNs entrega com latência variável ~0,5–3s — exatidão absoluta não é garantível. Janela aceitável acordada com o humano: **±1–2s do zero do contador**.

O humano **rejeitou** o híbrido (camada client de notificação complementar ao push) e **rejeitou** o modelo 100% cliente. **Server-side é o único caminho de entrega** — requisito original intocado: aviso com tela apagada no iPhone, que exige push de servidor.

### Alavanca 1 — relógio de referência = clique do usuário (substitui "duração relativa ao servidor")

- O cliente envia ao agendamento um campo opcional `elapsed` (ms entre o clique que iniciou o timer e o disparo do POST de agendamento), medido com o relógio do próprio cliente — imune a clock-skew entre cliente e servidor, pois **só a diferença é usada**.
- O servidor calcula o instante de disparo como: `agora_servidor + max(0, durationSeconds − elapsed/1000)`.
- O contador visual continua com `fim = t0 + duração` no cliente — os dois miram o mesmo instante físico (zero do clique + duração).
- **Retrocompat obrigatória:** `elapsed` ausente (PWA já instalada em produção sem atualizar) → comportamento atual (`agora + duração`).

### Alavanca 2 — desacoplar a resposta do sono (substitui "sleep no próprio endpoint")

- A rota de agendamento responde **`202` imediatamente após o INSERT** (status `agendado`); a espera + re-leitura + envio rodam em **background** via `after()` do Next.js (estável na versão ^16.2.10 do projeto).
- `cancel` passa a ser processável **na hora** (sem fila atrás de POSTs pendurados).
- O cancelamento continua matando o envio pela **re-leitura de status antes do envio** (invariante já existente, mantida).
- A resposta `202` **não significa mais "enviado"**: o corpo expõe o estado `agendado`; o envio final acontece em background; `sent_at` continua sendo a marca de envio real.

### Alavanca 3 — cancel-all por dono no INSERT (substitui "um agendamento ativo por sessão de cliente")

- Ao criar um novo agendamento, o servidor cancela (status `cancelado`) **todo** agendamento anterior no estado `agendado` do **mesmo dono** (`created_by`).
- Invariante: **no máximo 1 agendamento ativo por dono**, imposta no servidor. Mata órfãos de reload, aba dupla e cancel perdido.
- Sem migração nova: os campos necessários (`created_by`, `status`, `fire_at`, `sent_at`) já existem na migração 0017.
- O cancel-all **é** um cancelamento por dono — coerente com o cancel-by-owner-and-status e com o RLS por email já vigente.

### Semântica de `cancel` (reforço da emenda)

- Processamento **imediato** no servidor (sem fila atrás de agendamentos pendurados — consequência da Alavanca 2).
- O cancelamento de encerramento silencioso (finalizar, cancelar treino, confirmar cancelamento da última série desmarcada) segue obrigatório no cliente; o cancel-all no INSERT cobre o caso de o cliente não conseguir cancelar (reload, aba fechada, corrida).
- Cancel durante o background permanece inalterado: a re-leitura de status antes do envio mata o push.

### Edge cases da emenda (cobertos como contrato)

| Cenário | Comportamento esperado |
|---|---|
| `elapsed` negativo ou não-numérico | Tratar como 0 (comportamento idêntico ao campo ausente: `agora + duração`). |
| `elapsed ≥ durationSeconds` | `fire_at = agora` — envio imediato; comportamento aceitável (o usuário demorou mais que o descanso para o POST sair). |
| `elapsed` muito grande por aba suspensa entre clique e POST | Idem ao caso anterior: `fire_at = agora`, envio imediato. |
| Dois POSTs de agendamento concorrentes do mesmo dono (duas abas) | O segundo INSERT cancela o primeiro (invariante por dono no servidor); só o segundo sobrevive como `agendado`. |
| Resposta `202` do agendamento | Não significa "enviado"; o corpo expõe o estado `agendado`; `sent_at` só é preenchido após o envio real em background. |
| Cancel durante o background (entre resposta e envio) | Inalterado: a re-leitura de status antes do envio mata o push. |
| Reload/aba fechada sem cancel (agendamento órfão) | Cancelado pelo cancel-all na próxima marcação do mesmo dono; se não houver nova marcação, o agendamento vigente segue e dispara (decisão 6 de 2026-10-16 mantida). |

### Decisões rejeitadas (auditoria — registrado como tal, não é hipótese aberta)

| Decisão | Resultado |
|---|---|
| Camada client de notificação (híbrido: aviso local do cliente + push de servidor) | **Rejeitada** pelo humano em 2026-10-23. |
| Modelo 100% cliente (sem push de servidor) | **Rejeitada** pelo humano em 2026-10-23 — perderia o aviso com tela apagada (requisito original do iPhone). |
| Contador visual por timestamp absoluto (em vez de `t0 + duração`) | **Fora desta emenda**; candidato a backlog — o drift de throttling em aba oculta é conhecido e documentado, não corrigido aqui. |

### O que NÃO muda com esta emenda (reafirmado)

- Decisão 7 (2026-10-16): descanso acima da janela da função envia no fim da janela, com `min(restante, 280s)` — mantida sem alteração.
- TTL 300s do agendamento/envio — mantido.
- Texto da notificação — mantido.
- Requisito de que falha de agendamento/envio **nunca bloqueia a marcação** — mantido.
- Resposta `503` sem chaves VAPID — mantida.
- Resposta `403` para endpoint alheio — mantida.
- RLS e dono por email — mantidos; cancel-all é cancelamento por dono, coerente com o RLS.
- Cancel-by-owner-and-status — mantido.
- Destinatário exclusivo: dono que iniciou o timer/execução; casal, leitura livre; parceiro espectador nunca recebe — mantido.
- PWA mínimo, exibição obrigatória da notificação pelo service worker, instrução de instalação no iPhone — mantidos.
- Migração única 0017 (sem nova migração para esta emenda) — mantido.
- Descanso nulo/zero sem timer e sem push; edição de `restSeconds` não reescreve timer em curso; troca de treino para consulta não encerra timer — mantidos.

### Critérios de aceite afetados pela emenda (substituição textual)

| Critério anterior (resumo) | Novo critério (vale daqui em diante) |
|---|---|
| Push agendado como "duração relativa ao instante da marcação no servidor" (edge case de relógio) | Push relativo ao **clique do usuário** (campo `elapsed`), com viés máximo de **±1–2s do zero do contador** (limite físico do FCM/APNs); clock-skew entre cliente e servidor não importa (só a diferença é usada). |
| "Um agendamento ativo por sessão de cliente" / "o agendamento anterior é cancelado e o novo é criado" | **Invariante por dono no servidor:** no máximo um agendamento `agendado` por `created_by`; todo INSERT novo cancela (status `cancelado`) os anteriores do mesmo dono (cancel-all). |
| Cancelamento de push agendado em encerramento silencioso | Cancelamento **processado de imediato** no servidor (sem fila atrás de POSTs pendurados), somado ao **cancel-all por dono** no INSERT de novo agendamento; a re-leitura de status antes do envio continua matando o push (inclusive durante o background). |
| POST de agendamento com resposta aberta até o disparo (sono no request) | Resposta **`202` imediata** após o INSERT com estado `agendado`; espera + re-leitura + envio em background via `after()`; `sent_at` = marca do envio real. |

As linhas correspondentes da tabela de critérios (seção 5) e da tabela de edge cases da spec já refletem estas substituições.

### Decisões resolvidas (humano, 2026-10-23 — emenda de temporização)

| # | Decisão | Resolução do humano |
|---|---|---|
| A1 | Relógio de referência do push | **Clique do usuário**: cliente envia `elapsed` (ms); servidor calcula o instante de disparo como `agora + max(0, duração − elapsed)`; retrocompat com `elapsed` ausente (comportamento atual) |
| A2 | Resposta do POST de agendamento | **`202` imediata** após INSERT (estado `agendado`); espera/envio em background via `after()` do Next; `cancel` processável na hora; `sent_at` = envio real |
| A3 | Unicidade de agendamento | **Cancel-all por dono no INSERT**: no máximo 1 `agendado` por `created_by`, invariante no servidor; sem migração nova (campos da 0017) |
| A4 | Híbrido (camada client de notificação) | **Rejeitado** |
| A5 | 100% cliente (sem push de servidor) | **Rejeitado** (perderia tela apagada) |
| A6 | Contador visual por timestamp absoluto | **Fora desta emenda** — candidato a backlog (drift de throttling em aba oculta conhecido, não corrigido aqui) |

**Nenhuma decisão pendente permanece aberta nesta emenda.**

## Modelo de Domínio

Entidades existentes, sem alteração nesta feature:

Entrada de exercício (entry) pertence a um treino e a um exercício da biblioteca, com posição, descanso único em segundos (`restSeconds`, nulo permitido), modo e unidade. Série planejada pertence a uma entrada, com posição, valor único e carga. Série realizada pertence a uma execução, uma entrada e uma série planejada — é o que a marcação cria/alterna, gatilho do timer. Execução é a instância do treino no dia, com início, término opcional e autor — não guarda timer nem push.

Entidades novas, persistidas pela migração 0017 (descrição conceitual, sem definição de schema nesta spec — a modelagem exata é da Atena no plano):

Assinatura de push: registro por dispositivo de um dono, criado quando o usuário concede permissão no app instalado; guarda o material de inscrição de notificação do navegador naquele aparelho. Cada dono pode ter uma ou mais assinaturas (um por dispositivo); nunca é compartilhada entre os dois donos.

Agendamento de push de descanso: registro do fim do descanso pendente, associado a uma assinatura de um dono e originado por uma marcação de série; tem o instante de disparo (marcação mais a duração da entry) e um estado de ativo ou cancelado/entregue. O destinatário do push é exclusivamente o dono que iniciou o timer/execução — o dono do treino, o mesmo da marcação; o agendamento nunca se destina ao parceiro espectador. **Emenda 2026-10-23: no máximo um agendamento ativo por dono (invariante no servidor via cancel-all no INSERT — `created_by`)**, cancelado em todo encerramento silencioso (finalizar, cancelar, confirmar cancelamento da última série — nunca na troca de treino para consulta); o texto anterior "por sessão de cliente, substituído em nova marcação" é substituído por esta invariante. O instante de disparo é ancorado ao clique do usuário via `elapsed` (ver emenda); `sent_at` continua a marca do envio real, preenchida só em background.

Timer de descanso: estado transitório de cliente (contagem visual), não é entidade persistida; duração capturada do `restSeconds` da entry no momento do início.

PWA e push: capacidade de plataforma do app Héstia (manifest + service worker + permissão de notificação + endpoint de push), usada pelo Mílon para o aviso em segundo plano.

Diagrama textual:

Programa um para muitos Treino.
Treino um para muitos Entrada de exercício.
Entrada de exercício um para muitos Série planejada, com descanso único na entrada.
Treino um para muitos Execução, no máximo uma aberta por dono (trava 7c).
Execução um para muitos Série realizada; marcar série é o gatilho do timer e do agendamento.
Dono um para muitos Assinatura de push, uma por dispositivo, criada por gesto de permissão.
Assinatura de push um para muitos Agendamento de descanso; **Emenda 2026-10-23: agendamento no estado `agendado` cancelado via cancel-all por dono em novo INSERT do mesmo `created_by`** e cancelado em encerramento silencioso (finalizar, cancelar, confirmar cancelamento da última; não na troca de treino para consulta).
Agendamento de descanso tem destinatário único: o dono que iniciou o timer/execução; nunca enviado ao parceiro espectador.
Timer de descanso: um por sessão de cliente, duração vinda da entrada, sem linha em banco; segue ativo durante troca de treino para consulta; o agendamento de push é o reflexo persistente do fim no servidor.

## Premissas Técnicas Validadas

| Premissa | Validada com Humano? | Evidência em disco |
|---|---|---|
| O campo de descanso real é `restSeconds` (linha `rest_seconds`) na entrada do exercício, `number` anulável, único por entry, herdado por todas as séries da entry | Sim (implícito no pedido: "tempo definido para o descanso daquele exercício"; confirmado leitura `lib/milon/types.ts`, `WorkoutEntry`/`WorkoutEntryRow`) | Leitura de `lib/milon/types.ts` e uso em `ExerciseEntryCard`/`WorkoutDetailSection` (`setRest`, `handleRestCommit`) |
| O gatilho de marcação é o `toggleSeries` do fluxo de execução da #5, hospedado no `ExecutionHost` da `WorkoutDetailSection` | Sim (pedido: "ao marcar uma série como feita"; confirmado leitura `lib/milon/hooks/useWorkoutExecution.ts` e `components/milon/WorkoutDetailSection.tsx`) | Leitura do hook e da seção |
| O app hoje não é PWA (sem manifest, service worker ou biblioteca de PWA) e o MVP da feature inclui criar o PWA mínimo | Sim (backlog item 6; reafirmado na decisão de 2026-10-16) | Grep por manifest/service worker/next-pwa/serwist sem ocorrência; `app/layout.tsx` e `next.config.ts` sem configuração PWA |
| O escopo inclui backend e migração: endpoint de push (primeiro route handler do app) + migração 0017 para assinaturas e agendamentos; a premissa anterior de "nenhuma migração, nenhum backend" está revogada | Sim — decisão 2026-10-16, custo mostrado e aceito na escolha do Caminho 2 (push de servidor) | Resposta humana "Usamos iphone. O ideal seria o aviso chegar com tela apagada, em outra página do hestia ou até em outro aplicativo" + consulta à Atena exibida antes da escolha |
| iOS 16.4+ só entrega web push para web app instalado (Adicionar à Tela Inicial, display standalone); permissão só por gesto; em aba do Safari iOS não existe notificação | Sim — fatos da Atena consultada em 2026-10-16, verificados em fonte (F1) | Consulta à Atena (fatos F1/F10/F12) |
| Em mobile a notificação precisa ser exibida pelo service worker (o construtor de notificação da página falha) e push recebido sem exibir faz o Safari revogar a permissão | Sim — fatos da Atena em 2026-10-16 (F2) | Consulta à Atena (F2) |
| O iOS suspende JavaScript e timers com app em background/tela apagada, então notificação local agendada pelo cliente dispara atrasada — razão do push de servidor | Sim — fatos da Atena em 2026-10-16 (F3) | Consulta à Atena (F3) |
| Vercel Hobby: cron 1×/dia, função no máximo 300s; descansos até ~5 min cobertos por espera no endpoint; descansos >300s são limite real — comportamento resolvido: push entregue assim que a janela da função permitir, camada visual cobre o atraso | Sim — fatos da Atena em 2026-10-16 (F6) + decisão resolvida no approve-spec de 2026-10-16 | Consulta à Atena (F6); emenda do approve-spec |
| O push do fim do descanso é enviado apenas para o dono do treino — quem iniciou o timer/execução (a mesma pessoa da marcação) —; nunca para o parceiro espectador | Sim — 2026-10-16, emenda do approve-spec | Registro humano: "O push só deve ser enviado para quem iniciou o timer, ou seja, o dono do treino." |
| Serviços de push removeram CORS — o cliente não pode enviar push sozinho; envio é sempre servidor | Sim — fatos da Atena em 2026-10-16 (F8) | Consulta à Atena (F8) |
| Agendamento de notificação local pela web (Notification Triggers) está descontinuado — não existe agendamento local de notificação pela web | Sim — fatos da Atena em 2026-10-16 (F9) | Consulta à Atena (F9) |
| Supabase Edge Functions (150s Free / 400s Paid) é alternativa de hospedagem descartável, sem ganho sobre a Vercel | Sim — fatos da Atena em 2026-10-16 (F7) | Consulta à Atena (F7) |
| Próximo inteiro de migração livre é 0017; a Atena reserva o número e define o script no plan — a spec registra só a premissa, sem definição de schema | Sim — decisão 2026-10-16 junto com o Caminho 2 | Consulta à Atena; sequência de migrações 0011–0016 já consumida (AGENTS.md e backlog do módulo) |
| O casal continua com login individual, uso no celular, Vercel + Supabase, sem permissão restrita; os dois donos usam iPhone | Sim (contexto do módulo no backlog + fato do iPhone na decisão de 2026-10-16) | `.agents/modules/milon/backlog.md`; resposta humana de 2026-10-16 |
| O aviso de fim de descanso não é banner de erro/sucesso do hook nem modal de confirmação; falha de push nunca bloqueia a marcação | Sim (feedback próprio, sem bloquear marcação — alinhado ao "só isso" do pedido e ao padrão AsyncState/banner do módulo) | Padrão de UI do módulo nas specs 04/05/07 |

## Cenários de Edge Case

| Cenário | Comportamento esperado |
|---|---|
| `restSeconds` nulo na entry | Nenhum timer, nenhum agendamento, nenhum aviso de fim; marcação idêntica à #5 |
| `restSeconds` zero na entry | Idem ao nulo: sem contagem com aviso |
| Marcar série em exercício com descanso enquanto timer e push de outro exercício estão ativos | Timer é substituído; agendamento anterior cancelado, novo criado |
| Desmarcar série sem ser a última marcada, com timer e push ativos | Timer e push seguem, sem cancelamento pela desmarcação |
| Desmarcar a última série marcada, abrir a pergunta de cancelamento da #5 e confirmar | Timer encerrado e push cancelado junto com o cancelamento da execução |
| Desmarcar a última série, abrir a pergunta e apenas fechar sem confirmar | Timer e push permanecem ativos |
| Editar `restSeconds` da entry com timer e push em andamento | Timer e agendamento mantêm a duração original; próxima marcação usa o novo valor |
| Finalizar o treino (qualquer caso da #7) com timer rodando | Timer encerrado e push cancelado; nenhum aviso residual de fim de descanso |
| Cancelar a execução (qualquer caminho) com timer rodando | Timer encerrado e push cancelado; nenhum aviso residual |
| Trocar de treino no seletor do Treino do Dia apenas para consultar, com timer rodando | Timer e push permanecem ativos; ao voltar ao treino de origem a contagem visual continua de onde parou; se zerar em outro treino, o push avisa normalmente (emenda do approve-spec de 2026-10-16) |
| O parceiro consulta no Treino do Dia o treino do outro (leitura livre) com descanso rodando | O push do fim do descanso nunca é enviado ao parceiro espectador — somente ao dono que iniciou o timer/execução |
| Push agendado e encerramento silencioso com falha no cancelamento no servidor | O push pode chegar — defeito do agendamento, não do domínio; marcação nunca falha; o contrato de cancelamento deve ser coberto por teste |
| Tela apagada, em outra página do Héstia ou em outro app, com instalação no iPhone e permissão concedida | Push do servidor entregue e notificação exibida no fim do descanso |
| iPhone sem "Adicionar à Tela Inicial" | Sem web push e sem API de notificação (F1/F12); degradação para aviso visual com a aba visível; marcação nunca bloqueada |
| Permissão de notificação negada ou revogada | Sem push (camada 2 indisponível); camada visual segue; marcação nunca bloqueada |
| Push recebido pelo service worker sem exibir | Proibido — o handler exibe obrigatoriamente a notificação (F2, risco de revogação da permissão no Safari) |
| Descanso maior que 300 segundos | Push entregue assim que a janela da função permitir (o mais perto possível do fim planejado); a camada visual cobre o atraso (decisão resolvida no approve-spec de 2026-10-16) |
| Recarregar a página ou fechar o app no meio do descanso com push agendado | O push dispara mesmo assim (decisão resolvida no approve-spec de 2026-10-16); a contagem visual não é restaurada ao reabrir (Alternativa 1) |
| Falha no agendamento ou envio do push | Nenhuma falha na marcação; camada visual é a garantia com aba visível; erro tratado no tratamento padrão de operação |
| Dois donos treinando ao mesmo tempo | Timers de cliente independentes e assinaturas/agendamentos próprios, um por dono e por dispositivo |
| Dois dispositivos do mesmo dono | Cada dispositivo com a própria assinatura; o agendamento segue a assinatura do dispositivo da marcação |
| Fuso, clock-skew entre cliente e servidor, sono prolongado do celular, `elapsed` inválido ou exagerado | Relógio de referência é o **clique do usuário**: o `elapsed` é medido no cliente e só a diferença é usada — imune a clock-skew entre cliente e servidor (Emenda 2026-10-23); `elapsed` negativo ou não-numérico trata como 0 (idem ao campo ausente: agora + duração); `elapsed ≥ duração` (ou aba suspensa entre clique e POST) → envio imediato (`fire_at = agora`); viés aceitável do push é ±1–2s do zero do contador (limite físico FCM/APNs); perfeição de relógio continua YAGNI |
| Falha ao registrar service worker, solicitar permissão ou instalar | Aviso visual em tela ainda ocorre com a aba visível; fluxo de marcação nunca falha por isso |

## Decisões resolvidas (humano, 2026-10-16)

Todas as decisões de micro-UX/escopo da spec foram resolvidas pelo humano no approve-spec de 2026-10-16, com emendas e confirmações. **Nenhuma decisão pendente permanece aberta nesta spec.**

| # | Decisão | Resolução do humano |
|---|---|---|
| 1 | Forma do aviso em tela (com aba visível) | **Só visual em card/banner** no Treino do Dia — sem som, sem vibração |
| 2 | Marcar outra série com timer rodando | Reiniciar o timer com o descanso da nova série e trocar o agendamento de push (um agendamento ativo por vez) |
| 3 | Editar descanso com timer rodando | **A duração em curso (timer e push) permanece**; a edição vale só para as próximas marcações |
| 4 | `restSeconds` nulo ou zero | **Sem timer e sem push**; marcação idêntica à da #5 |
| 5 | Troca de treino, finalizar e cancelar com timer rodando | Finalizar e cancelar: encerrar timer e cancelar push. **Troca de treino para consulta: NÃO encerra o timer nem cancela o push** (emenda do approve-spec — texto do humano: "Trocar treino não deve encerrar o timer, o usuário pode estar só conferindo alguma coisa enquanto descansa.") |
| 6 | Fechar ou recarregar o app no meio do descanso com push agendado | **O push do servidor dispara mesmo assim**; a contagem visual não é restaurada ao reabrir |
| 7 | Descanso maior que 300 segundos (limite da função da Vercel, F6) | **Entregar o push assim que a janela da função permitir** (o mais perto possível do fim planejado); a camada visual cobre o atraso |

Emenda adicional registrada (já aplicada nas seções acima): **o push do fim do descanso é enviado apenas para o dono do treino — quem iniciou o timer/execução** —, nunca para o parceiro espectador que esteja consultando o treino.

Resolvidas anteriormente nesta revisão (mantidas): notificação do sistema com tela apagada obrigatória via push de servidor (antiga pendência 2) e instrução de "Adicionar à Tela Inicial" no iPhone como passo do fluxo, obrigatório para push (antiga pendência 8).

Registro de aprovação: o humano autorizou prosseguir sem aguardar nova leitura — "Ajuste isso na spec, passe para o planejamento de Atena, mas não precisa aguardar minha aprovação. Pode seguir diretamente para a implementação depois".

### Decisões resolvidas (humano, 2026-10-23 — emenda de temporização do push)

Após homologação real que encontrou notificação intermitente fora do zero do contador, o humano aprovou as 3 alavancas da Emenda 2026-10-23 (relógio de referência no clique com `elapsed`, resposta 202 imediata com espera em background, cancel-all por dono no INSERT) e rejeitou o híbrido (camada client de notificação) e o 100% cliente — server-side permanece o único caminho de entrega. Contador visual por timestamp absoluto ficou fora desta emenda, como candidato a backlog. **Nenhuma decisão pendente aberta** — tabela completa na seção "Emenda 2026-10-23".

## 8. Alternativas Consideradas — síntese para Atena

Decisão humana de 2026-10-16 fecha o mecanismo: **Alternativa C — push de servidor (Web Push com VAPID) + PWA mínimo como pré-requisito**, com a Alternativa A mantida como camada 1 (aviso visual em tela com a aba visível, só card/banner) e a Alternativa B descartada. O estado do timer segue a **Alternativa 1** (contagem em cliente, inclusive durante troca de treino para consulta; o push agendado no servidor é o aviso de segundo plano e dispara mesmo com o app fechado). Hospedagem do envio: route handler na Vercel, com Supabase Edge Functions descartada. Migração única esperada: 0017. Destinatário do push: somente o dono que iniciou o timer. **Todas as 7 decisões de micro-UX/escopo foram resolvidas pelo humano no approve-spec de 2026-10-16 (ver seção "Decisões resolvidas") — nenhuma decisão pendente aberta.** O humano autorizou o prosseguimento direto para o planejamento da Atena e, após ele, para a implementação, sem nova aprovação de spec.

**Emenda 2026-10-23** ajusta o contrato de temporização sem mudar o mecanismo: `elapsed` ancorado ao clique do usuário (viés ±1–2s, limite FCM), resposta `202` imediata com espera/envio em background, cancel-all por dono no INSERT (invariante de no máximo 1 `agendado` por `created_by`), cancel processável de imediato; híbrido e 100% cliente rejeitados — ver seção da emenda para o contrato completo, edge cases e decisões A1–A6.
