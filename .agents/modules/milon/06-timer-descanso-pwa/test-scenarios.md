# Cenários de homologação — 06 Timer de descanso auto + PWA push

> Derivados exclusivamente de `spec.md` (§5 critérios 1–12, §3 regras de negócio, §Decisões resolvidas) + contratos do `plan.md` §3. Sem cenários de Atena (não gerada por ela, sem viés).
> **Somente cenários manuais** (decisão 2026-10-16): a cobertura automatizada vive na suíte e no `test-report.json`; este arquivo é o roteiro do portão manual de homologação.
> Textos das features citados entre aspas exatas quando relevantes — sem paráfrase nova.
> Gerado em 2026-10-18 pós-suite verde: 1820 testes / 140 arquivos / 0 falhas, coverage 85.28% lines e 84.13% branch, Storybook exit 0 (ver `test-report.json`).

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
**Dado** dono A com o Treino do Dia em segundo plano dentro do app instalado (ex.: na página de Programas ou no dashboard do Héstia)
**Quando** o descanso de A zera
**Então** a notificação chega ao iPhone de A e, ao tocá-la, o app abre/foca no Treino do Dia (`/milon/today`)

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
**Então** `npm test` termina com 1820 testes / 140 arquivos / 0 falhas (sem quebra das features 01 a 07b-1), `npm test -- --coverage` termina com 85.28% lines e 84.13% branch (ambos ≥ 80%), `npm run lint` e `npm run build-storybook` terminam em exit 0 e o `test-report.json` desta feature está regenerado com `failed = 0`

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
