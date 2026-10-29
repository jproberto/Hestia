# Cenários de homologação — 06 Timer de descanso auto + PWA push

> Derivados exclusivamente de `spec.md` (§5 critérios 1–12, §3 regras de negócio, §Decisões resolvidas) + contratos do `plan.md` §3. Sem cenários de Atena (não gerada por ela, sem viés).
> **Somente cenários manuais** (decisão 2026-10-16): a cobertura automatizada vive na suíte e no `test-report.json`; este arquivo é o roteiro do portão manual de homologação.
> Textos das features citados entre aspas exatas quando relevantes — sem paráfrase nova.
> Gerado em 2026-10-18, re-executado pós-correção dos blockers B1/B2 (commit 8eec148): 1826 testes / 140 arquivos / 0 falhas, coverage 85.16% lines e 84.08% branch, Storybook exit 0 (ver `test-report.json`).
> **Emenda 2026-10-23 (fix-01-server):** seção "Emenda 2026-10-23 — cenários manuais" acrescentada ao final (cenários E1–E6b) para re-homologar o timing do push com as Alavancas 1–3 (elapsed ancorado ao clique, 202 + background, cancel-all por dono); estado da suíte da emenda no `test-report.json` (1854 testes / 140 arquivos / 0 falhas, coverage 85.33% lines e 84.14% branch).
> **Emenda 2 — supressão com aba ativa + graça 800 ms (2026-10-29):** seção "Emenda 2 — 2026-10-29 — cenários manuais" (cenários A1–A7) acrescentada ao final — com a aba visível no zero nenhuma notificação do sistema é criada; com a aba oculta o push chega após zero + graça + FCM; re-homologação dos cenários E1–E6b com a regra nova. Estado da suíte no `test-report.json` (1871 testes / 140 arquivos / 0 falhas, coverage 85.35% lines e 84.20% branch).

**Pré-requisitos comuns (homologação em produção/staging com os dois donos):**
- Ambos os donos logados em iPhone instalado ("Adicionar à Tela Inicial", display standalone) com permissão de notificação concedida; chaves VAPID configuradas no ambiente (sem elas o agendamento responde 503 e só a camada visual funciona).
- Programa ativo do dono com ao menos dois treinos (ex.: **Treino A**, **Treino B**) contendo exercícios com `restSeconds` preenchido (ex.: 90s) e pelo menos um exercício com descanso nulo ou zero.
- Abrir o Treino do Dia (`/milon/today`) pelo ícone instalado, não pela aba do Safari (iOS sem instalação não entrega web push).

---

## Critério 1 — Marcação inicia timer e agenda o push

### Cenário 1: Marcar série com descanso inicia a contagem e o agendamento
**Dado** o Treino do Dia com execução (aberta ou iniciada pela própria marcação) e uma série desmarcada em exercício com `restSeconds` 90
**Quando** a pessoa toca no card da série
**Então** a série fica marcada na hora (marcação da #5 intacta) e, sem gesto adicional, o painel de descanso aparece com rótulo `Descanso — <exercício>` contando regressivamente a partir de `01:30`; ao fim da contagem o aviso `Descanso de <exercício> terminou.` aparece e o push do servidor é entregue (ver critério 2)

### Cenário 2: Duas camadas no mesmo fim de descanso
**Dado** o mesmo cenário anterior com o iPhone em primeiro plano no Treino do Dia
**Quando** a contagem do cliente chega a zero no mesmo intervalo em que o push do servidor é entregue
**Então** o alerta visual em tela e a notificação do sistema podem ocorrer juntos, sem conflito; a pessoa descarta ambos (o alerta com `Fechar`, a notificação com o gesto normal do iOS)

---

## Critério 2 — Push exclusivo do dono, com tela apagada / outra página / outro app

> **HOMOLOGAÇÃO OBRIGATÓRIA EM IPHONE REAL DO CASAL — não substituível por suíte.** Cada passo abaixo é executado nos aparelhos do casal, com o outro dono observando o próprio iPhone.

### Cenário 3: Push com a tela apagada chega só no iPhone do dono [iPhone real]
**Dado** dono A com o Treino do Dia aberto e permissão concedida; dono B em outro lugar com o próprio iPhone ligado e notificações do Héstia ativas; A marca uma série com descanso de 90s e em seguida apaga a tela do iPhone
**Quando** os 90 segundos se esgotam
**Então** a notificação `Descanso terminado` / `Descanso de <exercício> terminou.` é entregue e exibida no iPhone do dono A; o iPhone do dono B **não** recebe notificação alguma

### Cenário 4: Push em outra página do Héstia [iPhone real]
**Dado** dono A com o app do Héstia instalado em segundo plano aberto em outra página (ex.: Programas ou o dashboard — não no Treino do Dia)
**Quando** o descanso de A zera e ela toca na notificação
**Então** a notificação chega ao iPhone de A e o clique leva o app até o Treino do Dia (`/milon/today`): se uma janela do app já estava em outra rota, ela é focada **e navegada** até o Treino do Dia; se nenhuma janela estava aberta, o app abre direto no Treino do Dia

### Cenário 5: Push com outro aplicativo em primeiro plano [iPhone real]
**Dado** dono A com o Héstia em segundo plano e outro aplicativo (ex.: mensagens, música) em primeiro plano, tela ligada
**Quando** o descanso de A zera
**Então** a notificação é exibida pelo sistema sobre o outro aplicativo, com o mesmo título e corpo; nenhum som/vibração extra é disparado pelo app (decisão 1 — só visual/push)

### Cenário 6: Parceiro espectador nunca recebe [iPhone real]
**Dado** dono B consultando no próprio iPhone o treino do dono A (leitura livre da 7b/7c) enquanto o descanso de A está rodando
**Quando** o descanso de A zera
**Então** só o iPhone de A recebe a notificação; o iPhone de B permanece sem notificação alguma

---

## Critério 3 — `restSeconds` nulo ou zero: marcação idêntica à #5

### Cenário 7: Exercício sem descanso não dispara timer nem push
**Dado** exercício do treino com `restSeconds` nulo (ou zero) e uma série desmarcada
**Quando** a pessoa marca a série
**Então** a série é marcada exatamente como na #5 (mesmo feedback visual de antes), **sem** painel de contagem, **sem** agendamento e **sem** aviso de fim de descanso depois

---

## Critério 4 — Nova marcação substitui timer e agendamento

### Cenário 8: Marcar outra série com timer rodando reinicia com o novo descanso
**Dado** timer rodando com 60s restantes (exercício X) e uma outra série desmarcada (exercício Y, descanso 45s)
**Quando** a pessoa marca a série de Y
**Então** o painel passa a contar o descanso de Y a partir de `00:45` (substituição imediata); só há um aviso de fim por descanso — ao zerar o de Y, chega um único push; o descanso antigo de X não gera aviso residual

---

## Critério 5 — Editar descanso não reescreve o timer em curso

### Cenário 9: Edição de `restSeconds` com contagem rodando
**Dado** timer rodando com 45s restantes, iniciado com 90s
**Quando** a pessoa edita o `restSeconds` daquela entry para 120s (pelo toque no campo de descanso)
**Então** a contagem em curso e o agendamento de push seguem com a duração original (zeram aos 90s do início); a próxima marcação daquele exercício inicia com os novos 120s

---

## Critério 6 — Finalizar/Cancelar encerram timer e cancelam o push

### Cenário 10: Finalizar com timer rodando não deixa push órfão
**Dado** timer rodando com 120s restantes
**Quando** a pessoa finaliza o treino (qualquer caso da #7: completo direto, parcial ou completa confirmados) com sucesso
**Então** o painel de descanso desaparece imediatamente e, ao fim dos 120s, **nenhuma** notificação de fim de descanso é entregue; a rotação da 7b-1 avança normalmente

### Cenário 11: Cancelar a execução com timer rodando
**Dado** timer rodando com 120s restantes
**Quando** a pessoa aciona `Cancelar` e confirma
**Então** o painel some, a execução é excluída como antes e nenhum push de fim de descanso chega depois; o foco segue no cabeçalho do mesmo treino (7b-1 intacto)

### Cenário 12: Confirmar o cancelamento da última série desmarcada
**Dado** timer rodando e a pessoa desmarca a última série restante da execução (pergunta da #5 abre)
**Quando** ela confirma `Todas as séries foram desmarcada. Deseja cancelar a execução desse treino?`
**Então** a execução é cancelada, o painel de descanso some e nenhum push chega ao fim do descanso anterior

---

## Critério 7 — Troca de treino para consulta NÃO encerra timer nem push

### Cenário 13: Consultar outro treino com descanso rodando [iPhone real]
**Dado** timer rodando no Treino A com 90s restantes
**Quando** a pessoa troca pelo seletor para o Treino B apenas para conferir algo, sem marcar nada
**Então** o painel de descanso some da tela (outro treino exibido), **mas** a contagem segue em memória; ao voltar ao Treino A o painel reaparece contando de onde parou; se o descanso zerar enquanto ela estiver no Treino B (ou com o app em segundo plano), o push do servidor chega normalmente — a troca **não** cancela o agendamento

---

## Critério 8 — Cancelamento efetivo (sem push órfão) e troca de treino não cancela

> **HOMOLOGAÇÃO OBRIGATÓRIA EM IPHONE REAL DO CASAL — não substituível por suíte.** O contrato de cancelamento é coberto na suíte; aqui se homologa o efeito real no aparelho (push não entregue após cancelar).

### Cenário 14: Finalizar bem-sucedido mata o push agendado [iPhone real]
**Dado** descanso de 90s rodando e a pessoa próxima do iPhone
**Quando** ela finaliza o treino com sucesso aos ~30s do descanso
**Então** nenhum push de fim de descanso é entregue aos ~90s (nem em tela apagada); o iPhone permanece silencioso para aquele descanso

### Cenário 15: Cancelar a execução mata o push agendado [iPhone real]
**Dado** descanso de 90s rodando
**Quando** ela cancela a execução com sucesso aos ~30s do descanso
**Então** nenhum push é entregue aos ~90s — nenhuma notificação órfã após o cancelamento

### Cenário 16: Troca de treino NÃO mata o push (diferença em relação ao cancelamento) [iPhone real]
**Dado** descanso de 90s rodando no Treino A
**Quando** ela troca para o Treino B aos ~30s e deixa o iPhone com a tela apagada
**Então** aos ~90s o push **é** entregue (a troca para consulta não cancela o agendamento) — contraste direto com os cenários 14/15

### Cenário 17: Nova marcação substitui o agendamento antigo (sem push duplicado) [iPhone real]
**Dado** descanso de 120s rodando (agendado) e outra série com descanso de 60s
**Quando** ela marca a segunda série aos ~10s do primeiro descanso
**Então** o agendamento antigo é cancelado: aos ~120s do início **nenhum** push do primeiro descanso chega; um único push do segundo descanso chega aos ~60s após a nova marcação

---

## Critério 9 — Descartar o aviso e seguir treinando

### Cenário 18: Fechar o alerta visual e continuar
**Dado** o alerta `Descanso de <exercício> terminou.` visível no Treino do Dia
**Quando** a pessoa toca em `Fechar`
**Então** o alerta some (sem modal, sem navegação, sem roubo de foco) e ela pode marcar a próxima série normalmente; com a notificação do push chegando na mesma hora, o descarte da notificação pelo gesto do iOS também é livre e não afeta a marcação

---

## Critério 10 — Sem instalação/permissão: degradação para a camada visual

### Cenário 19: iPhone sem "Adicionar à Tela Inicial" (aba do Safari)
**Dado** o Héstia aberto na aba normal do Safari do iPhone (não instalado)
**Quando** a pessoa abre o Treino do Dia e marca uma série com descanso
**Então** a marcação funciona e o painel de contagem aparece (camada 1); o aviso de instrução `No iPhone, adicione o Héstia à Tela Inicial para receber avisos com a tela apagada.` aparece no hint quando aplicável; nenhum push é entregue e **nada** da marcação é impedido

### Cenário 20: Permissão de notificação negada ou pedida por gesto
**Dado** app instalado com permissão ainda `default` (o hint `Ative os avisos para receber o fim do descanso com a tela apagada.` com botão `Ativar avisos de descanso` está visível)
**Quando** a pessoa toca no botão e responde "Não permitir" no prompt do iOS
**Então** o hint some (degradação silenciosa), a marcação e a contagem visual seguem normais, e nenhum push é entregue; se ela conceder no gesto, o push passa a valer para as próximas marcações (uma vez por dispositivo)

---

## Critério 11 — Nada além do timer mudou nos fluxos existentes

### Cenário 21: Regressão dos fluxos das features 01–07c com a feature ativa
**Dado** o Mílon com a feature de descanso disponível
**Quando** a pessoa percorre os fluxos habituais: marcar/desmarcar série (incluindo a pergunta da última, #5), editar descanso, as quatro confirmações do Finalizar/Cancelar (#7), vazio de borda, rotação ao finalizar (7b/7b-1), guarda por dono na troca (7c) e manutenção de treinos/programas
**Então** textos de confirmação, badges, modais, foco pós-ação e liberação de escrita permanecem idênticos aos anteriores à feature; a única diferença nova é o painel/hint/push de descanso descritos nos outros cenários; os testes automatizados de regressão correspondentes estão verdes nesta entrega (ver `test-report.json` e `regression.md`)

---

## Critério 12 — Suíte completa verde, cobertura e relatório

### Cenário 22: Gates da entrega
**Dado** o repositório na feature 06-timer-descanso-pwa
**Quando** os comandos de verificação rodam
**Então** `npm test` termina com 1826 testes / 140 arquivos / 0 falhas (sem quebra das features 01 a 07b-1), `npm test -- --coverage` termina com 85.16% lines e 84.08% branch (ambos ≥ 80%), `npm run lint` (0 errors), `npm run build` e `npm run build-storybook` terminam em exit 0 e o `test-report.json` desta feature está regenerado com `failed = 0`

---

## Casos de borda complementares (spec §Edge cases)

### Cenário 23: Fechar ou recarregar o app no meio do descanso
**Dado** descanso de 90s rodando com push agendado no servidor
**Quando** a pessoa fecha o app ou recarrega a página aos ~40s
**Então** o push do servidor é entregue aos ~90s assim mesmo (decisão 6); a contagem visual **não** é restaurada ao reabrir (Alternativa 1 — sem localStorage)

### Cenário 24: Descanso maior que a janela da função (~300s)
**Dado** exercício com descanso de 600s
**Quando** a pessoa marca a série e o agendamento é criado
**Então** o push é entregue assim que a janela da função permitir (o mais perto possível do fim planejado — até 280s de espera no servidor, decisão 7); a camada visual cobre o atraso enquanto a aba estiver visível

### Cenário 25: Falha de infraestrutura nunca bloqueia a marcação
**Dado** ambiente sem chaves VAPID (ou com rede do servidor indisponível no momento do agendamento)
**Quando** a pessoa marca uma série com descanso
**Então** a marcação conclui normalmente e a contagem visual roda (camada 1 é a garantia); sem VAPID o agendamento responde 503 e nenhum push é entregue, sem erro visível que trave o treino

---

## Emenda 2026-10-23 — cenários manuais

> **Emenda fix-01-server (Alavancas 1–3):** o instante de disparo do push passa a ser ancorado ao clique que iniciou o timer (campo `elapsed`), a resposta de agendamento é imediata (202) com o envio em background no servidor, e todo novo agendamento cancela os anteriores do mesmo dono (cancel-all por `created_by`). Estes cenários re-homologam o **timing** — os critérios 2/8/9/10/11 e os cenários 1–25 acima permanecem válidos como roteiro das demais camadas. Pré-requisitos comuns idênticos aos do topo (iPhone instalado, VAPID, programa com exercícios de descanso preenchido).
> Janela de timing aceita com o humano: **±1–2 segundos do zero do contador** (limite físico FCM/APNs).

### Cenário E1: Push chega na janela do zero do contador (aba em primeiro plano)
**Dado** o iPhone do dono com o Treino do Dia aberto em primeiro plano e permissão de notificação concedida; a pessoa está olhando o painel de descanso (exercício com `restSeconds` 90)
**Quando** ela marca a série e observa a contagem até o fim
**Então** a notificação `Descanso terminado` / `Descanso de <exercício> terminou.` é entregue no mesmo instante do zero do contador visual, com desvio máximo de ±1–2 segundos; o aviso visual em tela e a notificação podem ocorrer juntos, sem conflito

### Cenário E2: Marcar nova série com reload no meio — push antigo nunca chega
**Dado** descanso de 90s rodando com agendamento criado no servidor (ex.: 30s decorridos)
**Quando** a pessoa recarrega a página (a contagem visual se perde — sem restauração por decisão) e, já de volta ao Treino do Dia, marca outra série com descanso de 60s
**Então** o agendamento antigo é cancelado no servidor pelo novo registro (cancel-all por dono): o push do descanso antigo **nunca** é entregue aos ~90s do primeiro clique; um único push, do novo descanso, é entregue ~60s após a nova marcação

### Cenário E3: Duas abas simultâneas — só o último agendamento dispara
**Dado** o mesmo dono com o Treino do Dia aberto em duas abas (ou dois dispositivos do mesmo dono) e nenhuma contagem em curso
**Quando** ela marca uma série com descanso em uma aba e, em seguida, marca outra série com descanso (na outra aba ou na mesma) antes do fim do primeiro
**Então** no servidor permanece no máximo um agendamento ativo por dono: somente o do último clique dispara; nenhum push do primeiro clique é entregue, mesmo que nenhuma das abas tenha cancelado explicitamente

### Cenário E4: Latência de rede alta entre clique e agendamento — push ainda no lugar certo
**Dado** o iPhone do dono com conexão lenta (rede 3G/4G degradada ou Wi-Fi fraco) no momento da marcação, de modo que o POST de agendamento demore alguns segundos após o clique
**Quando** a pessoa marca uma série com descanso de 90s e mantém o app aberto
**Então** a contagem visual inicia no clique (90s) e a notificação chega alinhada ao zero visual (±1–2s) — o atraso de rede é compensado pelo tempo já decorrido desde o clique (`elapsed`); o push não atrasa em segundos na entrega por causa da latência do agendamento

### Cenário E5: Descanso maior que a janela do servidor (~280s) — decisão 7 intacta
**Dado** exercício com descanso de 600s e o iPhone do dono com a tela apagada após a marcação
**Quando** o agendamento é criado e o tempo passa além da janela de espera da função de servidor
**Então** o push é entregue o mais perto possível do fim planejado, assim que a janela do servidor permite (limite físico da função, decisão 7); não há push no instante exato de 600s se o fim planejado estiver fora da janela, e nenhuma notificação duplicada chega depois

### Cenário E6: Entrega com tela apagada / outra página / outro app — re-homologação do iPhone [iPhone real]
> A emenda muda **quando** o push é agendado e disparado no servidor; a **entrega** no iPhone precisa ser re-homologada de ponta a ponta com o novo agendamento.

**Dado** os mesmos aparatos e preparação dos cenários 3 a 6 (dono A e dono B, ambos com iPhone instalado e notificações ativas)
**Quando** a pessoa re-executa, com o build da emenda: o cenário 3 (tela apagada — notificação só no iPhone de A), o cenário 4 (outra página do Héstia — clique leva ao Treino do Dia, focando e navegando a janela existente ou abrindo direto), o cenário 5 (outro aplicativo em primeiro plano — notificação exibida pelo sistema com mesmo título e corpo) e o cenário 6 (parceiro espectador nunca recebe)
**Então** todos os quatro comportamentos de entrega permanecem idênticos aos homologados em 2026-10-18, agora com o disparo ancorado ao clique — e, em cada um deles com a tela apagada, a notificação chega na janela ±1–2s do zero do contador (critério 13 emendado)

### Cenário E6b: Cancelamento efetivo sem push órfão — re-homologação do iPhone [iPhone real]
**Dado** descanso de 90s rodando com agendamento criado (dono A no iPhone)
**Quando** ela finaliza (cenário 14) ou cancela a execução (cenário 15) aos ~30s do descanso, e em nova rodada troca para consulta aos ~30s deixando a tela apagada (cenário 16) e substitui com nova marcação (cenário 17)
**Então** o contrato de cancelamento segue idêntico: nenhum push após finalizar/cancelar; o push **é** entregue após a troca para consulta; um único push do novo descanso após a substituição — processável de imediato no servidor (o cancelamento não espera agendamento pendurado algum)

---

## Emenda 2 — 2026-10-29 — cenários manuais

> **Emenda 2 da spec (supressão com aba ativa + janela de graça de 800 ms):** com a aba do treino **visível** no zero do contador, o agendamento é cancelado no servidor no tick de zero e **nenhuma notificação do sistema é criada** — só existe a camada visual; com a aba **oculta** no zero, o servidor espera a janela de graça de 800 ms após o instante de disparo antes de reler o status e enviar (entrega em zero + graça + FCM, tipicamente +1–2s, pior caso ~+2,5s — critério 13 ajustado). Os cenários acima (1–25, E1–E6b) permanecem válidos onde não conflitarem; onde conflitarem, valem estes (notavelmente o cenário E1 e o "duas camadas" do cenário 2: com aba visível no zero **não** há mais notificação do sistema). Pré-requisitos comuns idênticos aos do topo (iPhone instalado, VAPID, programa com exercícios de descanso preenchido). A causa raiz do represamento de plataforma segue em backlog — a emenda é neutra ao mecanismo.

### Cenário A1: Aba visível no zero — nenhuma notificação do sistema, alerta visual permanece
**Dado** o iPhone ou desktop do dono com o Treino do Dia em primeiro plano e a aba visível no instante em que a contagem do descanso (ex.: 30s) chega a zero
**Quando** a contagem zera com a aba permanecendo visível
**Então** nenhuma notificação do sistema aparece — nem no instante do zero, nem represada depois ao trocar de aba/app e voltar ao Héstia (trocar de aba após o zero e retornar não revela notificação alguma); o alerta visual `Descanso de <exercício> terminou.` permanece em tela até a pessoa tocar `Fechar`

### Cenário A2: Aba oculta no zero (outra aba em foco) — notificação chega após a graça de 800 ms
**Dado** o dono com o Treino do Dia em uma aba e **outra aba em foco** no mesmo navegador (ou o Héstia em segundo plano) no instante do zero — ex.: descanso de 90s
**Quando** a contagem do cliente zera com a aba oculta
**Então** a notificação `Descanso terminado` / `Descanso de <exercício> terminou.` é entregue em zero + janela de graça (800 ms) + latência FCM, tipicamente +1–2 segundos após o zero (pior caso aceito ~+2,5s); reexecutar com este build os cenários 2, 3, 4 e 5 originais (duas camadas com aba oculta, tela apagada, outra página do Héstia e outro aplicativo) confirmando a entrega

### Cenário A3: iPhone com tela APAGADA no zero — notificação chega (requisito original preservado) [iPhone real]
**Dado** o dono A com o Héstia instalado e o descanso de 90s rodando; a pessoa apaga a tela do iPhone após a marcação (sem chegar ao zero)
**Quando** os 90 segundos se esgotam com a tela apagada
**Então** a notificação é entregue e exibida (sem JS do cliente no zero → sem cancel → o servidor espera a graça e envia); reexecutar as seções 3 a 6 originais (tela apagada só no iPhone de A; outra página do Héstia; outro aplicativo em primeiro plano; parceiro espectador nunca recebe) com o build da Emenda 2 — todos os quatro comportamentos de entrega permanecem idênticos

### Cenário A4: iPhone/desktop com tela LIGADA e app VISÍVEL no zero — só camada visual
**Dado** o dono com o Treino do Dia aberto, tela ligada, aba do Héstia visível no instante do zero
**Quando** a contagem zera
**Então** nenhuma notificação do sistema é criada; o alerta visual cobre o fim do descanso (a pessoa o descarta com `Fechar` e segue treinando); o aparelho permanece silencioso para aquele descanso mesmo que a pessoa troque de aba minutos depois

### Cenário A5: Cancel falhado ou corrida perdida no zero (rede ruim) — notificação pode aparecer (aceito)
**Dado** descanso rodando e a conexão do aparelho degradada ou caindo exatamente no momento do zero, com a aba visível
**Quando** a contagem zera e o cancelamento disparado pelo cliente não chega ao servidor a tempo (rede pobre ou indisponível)
**Então** o alerta visual aparece normalmente em tela e **pode** ocorrer de a notificação do sistema também chegar (aceito como contrato — mesma classe da falha de cancelamento já tolerada); nenhuma falha de aplicação é visível e a marcação/contagem seguinte segue normalmente

### Cenário A6: Reload ou fechar ANTES do zero — notificação dispara no horário (decisão 6 preservada)
**Dado** descanso de 90s rodando com agendamento criado no servidor (ex.: 30s decorridos)
**Quando** a pessoa recarrega a página ou fecha o app **antes** do zero (sem que o tick de zero rode)
**Então** nenhum cancel é disparado (sem tick, sem decisão): o push vigente dispara no horário previsto — chega após zero + graça (800 ms) + FCM, servindo de aviso do descanso que a pessoa perdeu de vista; a contagem visual não é restaurada ao reabrir (Alternativa 1, intacta)

### Cenário A7: Re-homologação completa da Emenda 1 (E1–E6b) com a regra nova do cancel no zero visível [iPhone real]
**Dado** os mesmos aparatos e preparação da seção "Emenda 2026-10-23 — cenários manuais" (dono A e dono B, iPhone instalado, VAPID, descansos preenchidos)
**Quando** a pessoa re-executa com este build os cenários E1 (push na janela do zero), E2 (reload no meio — push antigo nunca chega), E3 (duas abas — só o último agendamento dispara), E4 (rede lenta — elapsed compensa), E5 (descanso > janela do servidor — decisão 7), E6 (entrega tela apagada/outra página/outra aplicativo/parceiro) e E6b (cancelamento efetivo sem órfão)
**Então** todos seguem válidos sob a regra nova — com o ajuste do critério 15: no E1, se a aba estava **visível** no zero, agora **não** há notificação do sistema (só o alerta visual); o push na janela do zero do E1 só se observa com a aba **oculta** no zero (entrega em zero + graça + FCM, ±1–2s); E2–E6b permanecem sem mudança observável (todos partem de aba oculta/tela apagada ou de cancelamentos prévios ao zero)
