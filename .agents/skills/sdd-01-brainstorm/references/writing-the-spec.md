# Escrevendo a Spec

A lista de itens no Passo 6 (problema, decisão tomada, alternativas rejeitadas, comportamento esperado, restrições, riscos, critérios de aceite) diz **o quê** incluir. A estrutura continua livre — não transforme essa lista em um template fixo de seções. Este arquivo existe só para ajudar a reconhecer quando um item está vago demais para ser útil.

O teste central para qualquer frase da spec: **alguém que não participou da conversa conseguiria, só lendo essa frase, saber se a implementação atendeu ou não?** Se a resposta depende de interpretação, a frase precisa ser mais específica.

## Problema

- Vago: "O usuário tem dificuldade de encontrar o que precisa."
- Específico: "Usuários não conseguem filtrar pedidos por status; hoje precisam abrir cada pedido individualmente para saber se foi entregue."

O vago descreve um sintoma genérico. O específico diz o que a pessoa não consegue fazer hoje, de um jeito que já sugere o que "resolvido" significa.

## Decisão Tomada / Alternativas Rejeitadas

- Vago: "Optamos pela abordagem mais simples."
- Específico: "Optamos por polling a cada 30s em vez de WebSocket, porque o volume de atualizações é baixo (poucas por hora) e não justifica manter conexão persistente."

O vago não permite que alguém questione ou revisite a decisão depois — não há critério registrado. O específico registra o motivo, então dá para saber se a decisão ainda faz sentido quando o contexto mudar (ex: se o volume de atualizações crescer).

## Comportamento Esperado

- Vago: "O sistema deve notificar o usuário quando algo importante acontecer."
- Específico: "Ao receber um pedido com valor acima de R$ 500, enviar notificação push em até 1 minuto. Pedidos abaixo desse valor não geram notificação."

O vago deixa "importante" para interpretação de quem implementa. O específico é uma regra que dá para implementar sem perguntar de volta.

## Restrições

- Vago: "Deve ser seguro."
- Específico: "Senhas nunca aparecem em log. Tokens de sessão expiram em 24h. Endpoints de escrita exigem autenticação."

"Seguro" sozinho não orienta nenhuma decisão de implementação. A versão específica vira checklist verificável.

## Riscos

- Vago: "Pode dar problema de performance."
- Específico: "Se o volume de registros passar de ~50 mil, a busca atual (sem índice) pode ultrapassar 2s. Não é bloqueante para o escopo atual, mas vale revisitar se o volume crescer."

O vago não diz quando o risco se materializa nem o que fazer a respeito. O específico dá um gatilho (volume) e uma ação (revisitar).

## Critérios de Aceite

Este é o item onde vago dói mais, porque é o que o `sdd-04-review` vai usar para julgar se o trabalho está pronto.

- Vago: "A busca deve ser rápida."
- Específico: "Resultados aparecem em até 300ms para até 10 mil registros."

- Vago: "O sistema deve funcionar corretamente."
- Específico: "Dado um carrinho com 3 itens, ao remover 1 item o total é recalculado e exibido sem recarregar a página."

Um critério de aceite bom é binário: passou ou não passou, sem espaço para debate. Se dois agentes lendo o mesmo critério pudessem chegar a conclusões diferentes sobre se ele foi atendido, o critério ainda está vago.

## Revisão Rápida

Ao revisar a spec (Passo 7), para cada frase que descreve comportamento, restrição ou critério de aceite, pergunte: "isso é testável do jeito que está escrito, ou depende de julgamento?" Se depende de julgamento, reescreva antes de seguir.