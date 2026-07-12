---
name: sdd-tool-tracking
description: Use para registrar o progresso de um plano de execução em um log estruturado. Dispare esta skill para inicializar o log no começo da execução, para atualizar o status de uma tarefa (concluída, bloqueada), ou para registrar um evento importante ou um impedimento detalhado. Essencial para manter a visibilidade do progresso e para depuração post-mortem.
---

# Rastreamento de Execução de Tarefas

## Visão Geral

Esta skill gerencia um log de execução para fornecer um registro detalhado e estruturado do progresso de um plano de tarefas. O log é composto por um cabeçalho com o status geral das tarefas e um corpo com o histórico de eventos em ordem cronológica. O objetivo é que qualquer agente ou humano possa entender rapidamente o estado atual da execução, o que já foi feito, e quais os impedimentos.

**Anuncie no início:** "Estou usando a skill `sdd-tool-tracking` para registrar o progresso da execução."

**Onde encontrar/salvar o log:** O arquivo de log de uma execução específica fica em `.agents/logs/YYYY-MM-DD-<slug-do-plano>-execution.log`. O `slug-do-plano` deve ser o mesmo usado nos artefatos de `spec` e `plan`.

## O Processo

### Passo 1: Determinar o Nome do Arquivo de Log

1.  Identifique o `slug` do plano que está sendo executado. Ele é derivado do tópico da tarefa e tem o formato `YYYY-MM-DD-<topico>`.
2.  O nome do arquivo de log será `.agents/logs/<slug>-execution.log`.
3.  Se o diretório `.agents/logs` não existir, crie-o.

### Passo 2: Inicializar o Log com o Plano de Tarefas

*Este passo só é executado no início de uma nova execução, quando o log ainda não existe.*

1.  Receba a lista de tarefas do plano (geralmente de `sdd-02-plan`).
2.  Crie o arquivo de log com um cabeçalho contendo uma tabela Markdown.
3.  A tabela deve ter as colunas `ID`, `Tarefa` e `Status`.
4.  Preencha a tabela com todas as tarefas do plano, atribuindo um ID sequencial e o status inicial "Pendente".
5.  Adicione uma entrada de evento no corpo do log, abaixo da tabela, marcando o início da execução. Ex: `[YYYY-MM-DD HH:MM:SS] - INFO: Início da execução do plano '<slug-do-plano>'`.

### Passo 3: Atualizar o Status de uma Tarefa

*Use este passo sempre que uma tarefa mudar de estado (ex: ao ser concluída por `sdd-03-implement`)*.

1.  Leia o conteúdo atual do arquivo de log correspondente.
2.  Localize a linha na tabela de status que corresponde à tarefa em questão (pelo ID ou nome).
3.  Reescreva a linha, atualizando a coluna `Status` para o novo valor (`Em Andamento`, `Concluída`, `Bloqueada`).
4.  Adicione uma entrada de evento no corpo do log com timestamp, informando a mudança.
    *   **Exemplo para conclusão:** `[YYYY-MM-DD HH:MM:SS] - INFO: Tarefa 'Implementar a função X' concluída.`
    *   **Exemplo para bloqueio:** `[YYYY-MM-DD HH:MM:SS] - WARN: Tarefa 'Conectar ao banco de dados' bloqueada.`
5.  Salve o arquivo de log com a tabela e o corpo atualizados.

### Passo 4: Registrar um Evento ou Impedimento Detalhado

*Use este passo para registrar informações que não são apenas uma mudança de status, como um erro inesperado, uma decisão de arquitetura tomada durante a implementação, ou a descrição detalhada de um bloqueio.*

1.  Leia o conteúdo atual do arquivo de log.
2.  Adicione uma nova linha ao final do corpo do log.
3.  Formate a linha com `[YYYY-MM-DD HH:MM:SS] - LEVEL: Mensagem.`, onde `LEVEL` pode ser:
    *   `INFO`: Para eventos gerais (ex: "Iniciando a fase de testes.").
    *   `WARN`: Para avisos ou impedimentos que não param a execução completamente.
    *   `ERROR`: Para erros críticos que interromperam o trabalho.
4.  A mensagem deve ser descritiva. Para um impedimento, explique a causa raiz e o impacto.
    *   **Exemplo:** `[YYYY-MM-DD HH:MM:SS] - ERROR: A build falhou devido à dependência 'lib-xyz' não encontrada. A implementação das tarefas subsequentes está parada até que isso seja resolvido.`
5.  Salve o arquivo de log com a nova entrada.

## Quando Parar e Pedir Ajuda

- Se você não conseguir determinar o `slug` do plano para nomear o arquivo de log.
- Se você não conseguir ler ou escrever no arquivo de log por problemas de permissão ou outro erro de I/O.
- Se o plano de tarefas não for fornecido e você for solicitado a inicializar o log (Passo 2).
- Se a estrutura de um arquivo de log existente estiver corrompida ou for irreconhecível.

## Lembre-se

- O nome do arquivo de log **deve** ser consistente com os artefatos `spec` e `plan` da mesma execução.
- O cabeçalho com a tabela de status deve estar **sempre** no topo do arquivo e refletir o estado mais recente.
- O corpo do log é **append-only**. Nunca apague eventos passados.
- Use os níveis de log (`INFO`, `WARN`, `ERROR`) de forma consistente.
- Esta skill não executa tarefas, apenas registra o que outras skills (como `sdd-03-implement`) estão fazendo.
