---
name: sdd-03-implement
description: Use quando houver um plano SDD escrito (gerado por sdd-02-plan) para executar inline, tarefa por tarefa, com revisão crítica inicial, verificação de baseline, TDD quando aplicável, verificações obrigatórias, atualização de progresso e parada imediata em bloqueios. Não usar para começar implementação sem spec/plan aprovado.
---

# Executando Planos SDD

## Visão Geral

Carregue o plano, revise criticamente, execute todas as tarefas na ordem, e reporte quando concluído.

**Anuncie no início:** "Estou usando a skill sdd-03-implement para implementar este plano."

**Onde encontrar o plano:** planos gerados por `sdd-02-plan` ficam em `.agents/plans/YYYY-MM-DD-<topico>-plan.md`. Se o parceiro humano não indicar qual arquivo usar, procure o mais recente nesse diretório e peça confirmação antes de continuar.

## O Processo

### Passo 1: Verificar Conformidade do Processo (Novo)

Antes de qualquer outra ação, invoque a `sdd-tool-guardian` para garantir que esta skill está sendo chamada no momento correto do fluxo.

### Passo 2: Preparar o Ambiente

Antes de revisar o plano ou tocar em código:

1. **Verifique a baseline.** Execute os testes do projeto conforme `references/testing.md`. Confirme que a suíte já passa *antes* de você começar. Se algo já estiver quebrado, pare e avise o parceiro humano — não é seu trabalho corrigir problemas pré-existentes dentro desta skill, e você precisa dessa baseline para saber depois se uma falha foi causada pela sua implementação.
2. **Confirme a branch.** Se você não estiver em uma branch com o nome no estilo `feature/<nome-descritivo>`, peça confirmação antes de continuar. Caso o parceiro humano confirme a branch, continue o trabalho normalmente. Caso contrário, crie e mude para uma branch nova antes de continuar (`git checkout -b feature/<nome-descritivo>`). Isso é automático — não precisa de confirmação do parceiro humano para criar a branch em si, mas **nunca implemente diretamente na main ou develop sem consentimento explícito**.

### Passo 3: Carregar e Revisar o Plano

1. Leia o arquivo do plano **completo**, do início ao fim, antes de tocar em qualquer código.
2. Revise criticamente. Procure especificamente por:
   - **Análise de Riscos:** O plano considera os riscos de ferramentas externas e tem planos de contingência?
   - **Lacunas de execução** — dependências não resolvidas, arquivos referenciados que não existem, passos que assumem algo que ainda não foi criado.
   - **Ambiguidade** — instruções que podem ser interpretadas de mais de um jeito.
   - **Inconsistência entre tarefas** — nomes de funções, assinaturas ou tipos definidos numa tarefa e usados de forma diferente em outra (ex: `getUser()` na tarefa 2 vs `fetchUser()` na tarefa 5).
   - **Requisitos do spec sem tarefa correspondente** — se o spec original pede algo que nenhuma tarefa do plano cobre, isso é uma lacuna crítica, não um detalhe a ignorar.
3. **Se houver preocupações:** apresente-as ao parceiro humano antes de começar. Não prossiga tentando adivinhar a intenção.
4. **Se não houver preocupações:** crie um TODO para cada item do plano e prossiga.

### Passo 4: Executar Tarefas

Para cada tarefa, na ordem em que aparece no plano:

1. Marque como `in_progress` no TODO e inicie o desenvolvimento local.
2. Siga cada passo exatamente como escrito (o plano tem passos curtos e diretos — não improvise além do que está pedido).
3. **Gerenciamento de Processos em Background:** Ao iniciar servidores locais (ex: `npm run dev`) ou utilitários em segundo plano para testes:
   - Use sempre tempos limite de espera síncrona curtos (`WaitMsBeforeAsync` máximo de 3000ms) para não prender o terminal.
   - Finalize (mate) os processos de segundo plano imediatamente após concluir a verificação da tarefa para evitar inatividade do terminal e processos zumbis.
   - Comunique verbalmente cada mudança de estado.
4. Quando a tarefa envolver lógica testável (funções, regras de negócio, transformações de dados — não se aplica a config, estilo visual ou glue code trivial), siga o ciclo TDD:
   - **Red**: escreva o teste primeiro e rode-o. Confirme que ele falha, e que falha pelo motivo esperado (não por erro de sintaxe ou setup).
   - **Green**: implemente o mínimo necessário para o teste passar. Não adicione funcionalidade que o teste não está cobrindo.
   - **Refactor**: com o teste passando, limpe a implementação se necessário (nomes, duplicação, clareza) e rode o teste de novo para confirmar que continua passando.
5. Execute localmente os validadores para garantir que não há erros de qualidade antes do fechamento (`npm run test`, `npx eslint .`, `npx tsc --noEmit`). Não avance sem que tudo passe localmente.
6. Marque a tarefa como concluída (`completed` no TODO e no CLI via `task-complete`).
7. Apresente o resultado da tarefa concluída ao parceiro humano e execute o commit via CLI (`node .agents/scripts/sdd.js commit "<mensagem-em-portugues>"`) EXCLUSIVAMENTE após a aprovação explícita em um turno posterior. ⚠️ **Parada Obrigatória de Turno:** É EXPRESSAMENTE PROIBIDO commitar automaticamente na mesma resposta em que a tarefa é concluída sem aguardar o sinal verde do usuário no chat.

Não pule verificações para "economizar tempo" — uma tarefa marcada como concluída sem verificação passada é uma tarefa não concluída.

### Passo 5: Concluir

Depois que todas as tarefas estiverem concluídas e verificadas:

1. Rode a suíte de testes completa do projeto (conforme `references/testing.md`) — não apenas os testes da última tarefa.
2. Confirme que nenhum TODO ficou pendente ou esquecido.
3. Resuma para o parceiro humano: o que foi feito, o que foi verificado, e qualquer desvio em relação ao plano original (mesmo pequeno).
5. **Invoque obrigatoriamente a skill `sdd-04-review`** para realizar a revisão final do código antes de prosseguir com merges ou encerramentos.

## Quando Parar e Pedir Ajuda

**PARE a execução imediatamente quando:**
- Encontrar um bloqueador (dependência ausente, teste falhando sem causa óbvia, instrução pouco clara).
- Um passo do plano exigir a execução de um comando de shell (ex: `npm install`, `npx ...`) e a ferramenta para isso não estiver disponível.
- O plano tiver lacunas críticas que impeçam o início ou a continuação.
- Você não entender uma instrução, mesmo após reler.
- A verificação falhar repetidamente — mesmo erro após 2-3 tentativas de correção. **PARE IMEDIATAMENTE** e apresente ao parceiro humano um relatório contendo: (1) O erro detalhado, (2) As hipóteses formuladas, (3) As tentativas já feitas, e (4) Os caminhos alternativos identificados de exploração.

**Peça esclarecimentos em vez de tentar adivinhar.** Adivinhar e seguir em frente custa mais tempo do que parar e perguntar.

## Quando Retornar aos Passos Anteriores

**Volte para o Passo 3 (Revisão do Plano) quando:**
- O parceiro atualizar o plano com base no seu feedback.
- A abordagem fundamental precisar ser repensada (não apenas um ajuste pontual numa tarefa).

**Não force a barra diante de bloqueadores** — pare e pergunte. Continuar "só mais um pouco" para tentar resolver sozinho geralmente piora o retrabalho depois.

## Lembre-se

- Verifique a baseline (testes passando) antes de começar — sem isso você não sabe se uma falha depois é sua ou pré-existente.
- Revise o plano criticamente primeiro — procure lacunas, ambiguidades e inconsistências, não só leia por cima.
- Siga os passos do plano exatamente.
- Se um passo exigir um comando de shell que você não pode executar, prepare o comando exato, anuncie o bloqueio e peça ao parceiro humano para executá-lo.
- Não pule verificações, nem mesmo as que parecem redundantes.
- Rode a suíte completa antes de declarar o trabalho concluído, não só os testes da tarefa atual.
- Faça referência a outras skills quando o plano solicitar.
- Pare quando estiver bloqueado, não adivinhe.
- Nunca inicie a implementação na branch `main` ou `develop` sem o consentimento explícito do usuário.
