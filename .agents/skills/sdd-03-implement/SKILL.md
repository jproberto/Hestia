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

### Passo 1: Preparar o Ambiente

Antes de revisar o plano ou tocar em código:

1. **Verifique a baseline.** Execute os testes do projeto conforme `references/testing.md`. Confirme que a suíte já passa *antes* de você começar. Se algo já estiver quebrado, pare e avise o parceiro humano — não é seu trabalho corrigir problemas pré-existentes dentro desta skill, e você precisa dessa baseline para saber depois se uma falha foi causada pela sua implementação.
2. **Confirme a branch.** Se você não estiver em uma branch com o nome no estilo `feature/<nome-descritivo>`, peça confirmação antes de continuar. Caso o parceiro humano, confirme a branch, continue o trabalho normalmente. Caso contrário, crie e mude para uma branch nova antes de continuar (`git checkout -b feature/<nome-descritivo>`). Isso é automático — não precisa de confirmação do parceiro humano para criar a branch em si, mas **nunca implemente diretamente na main ou develop sem consentimento explícito**.

### Passo 2: Carregar e Revisar o Plano

1. Leia o arquivo do plano **completo**, do início ao fim, antes de tocar em qualquer código.
2. Revise criticamente. Procure especificamente por:
   - **Lacunas de execução** — dependências não resolvidas, arquivos referenciados que não existem, passos que assumem algo que ainda não foi criado.
   - **Ambiguidade** — instruções que podem ser interpretadas de mais de um jeito.
   - **Inconsistência entre tarefas** — nomes de funções, assinaturas ou tipos definidos numa tarefa e usados de forma diferente em outra (ex: `getUser()` na tarefa 2 vs `fetchUser()` na tarefa 5).
   - **Requisitos do spec sem tarefa correspondente** — se o spec original pede algo que nenhuma tarefa do plano cobre, isso é uma lacuna crítica, não um detalhe a ignorar.
3. **Se houver preocupações:** apresente-as ao parceiro humano antes de começar. Não prossiga tentando adivinhar a intenção.
4. **Se não houver preocupações:** crie um TODO para cada item do plano e prossiga.

### Passo 3: Executar Tarefas

Para cada tarefa, na ordem em que aparece no plano:

1. Marque como `in_progress`.
2. Siga cada passo exatamente como escrito (o plano tem passos curtos e diretos — não improvise além do que está pedido).
3. Quando a tarefa envolver lógica testável (funções, regras de negócio, transformações de dados — não se aplica a config, estilo visual ou glue code trivial), siga o ciclo TDD:
   - **Red**: escreva o teste primeiro e rode-o. Confirme que ele falha, e que falha pelo motivo esperado (não por erro de sintaxe ou setup).
   - **Green**: implemente o mínimo necessário para o teste passar. Não adicione funcionalidade que o teste não está cobrindo.
   - **Refactor**: com o teste passando, limpe a implementação se necessário (nomes, duplicação, clareza) e rode o teste de novo para confirmar que continua passando.
4. Execute as verificações especificadas na tarefa (testes, lint, build, etc.). Não avance para a próxima tarefa sem elas passarem.
5. Marque como `completed`.

Não pule verificações para "economizar tempo" — uma tarefa marcada como concluída sem verificação passada é uma tarefa não concluída.

### Passo 4: Concluir

Depois que todas as tarefas estiverem concluídas e verificadas:

1. Rode a suíte de testes completa do projeto (conforme `references/testing.md`) — não apenas os testes da última tarefa.
2. Confirme que nenhum TODO ficou pendente ou esquecido.
3. Resuma para o parceiro humano: o que foi feito, o que foi verificado, e qualquer desvio em relação ao plano original (mesmo pequeno).

## Quando Parar e Pedir Ajuda

**PARE a execução imediatamente quando:**
- Encontrar um bloqueador (dependência ausente, teste falhando sem causa óbvia, instrução pouco clara).
- O plano tiver lacunas críticas que impeçam o início ou a continuação.
- Você não entender uma instrução, mesmo após reler.
- A verificação falhar repetidamente — mesmo erro após 2-3 tentativas de correção.

**Peça esclarecimentos em vez de tentar adivinhar.** Adivinhar e seguir em frente custa mais tempo do que parar e perguntar.

## Quando Retornar aos Passos Anteriores

**Volte para o Passo 2 (Revisão do Plano) quando:**
- O parceiro atualizar o plano com base no seu feedback.
- A abordagem fundamental precisar ser repensada (não apenas um ajuste pontual numa tarefa).

**Não force a barra diante de bloqueadores** — pare e pergunte. Continuar "só mais um pouco" para tentar resolver sozinho geralmente piora o retrabalho depois.

## Lembre-se

- Verifique a baseline (testes passando) antes de começar — sem isso você não sabe se uma falha depois é sua ou pré-existente.
- Revise o plano criticamente primeiro — procure lacunas, ambiguidades e inconsistências, não só leia por cima.
- Siga os passos do plano exatamente.
- Não pule verificações, nem mesmo as que parecem redundantes.
- Rode a suíte completa antes de declarar o trabalho concluído, não só os testes da tarefa atual.
- Faça referência a outras skills quando o plano solicitar.
- Pare quando estiver bloqueado, não adivinhe.
- Nunca inicie a implementação na branch main ou develop sem o consentimento explícito do usuário.

## Integração

**Skills do fluxo SDD:**
- **sdd-01-brainstorm** — refina a ideia e gera a especificação/design.
- **sdd-02-plan** — produz o plano de tarefas a partir da especificação, salvo em `.agents/plans/YYYY-MM-DD-<topico>-plan.md`.
- **sdd-03-implement** (esta skill) — executa o plano tarefa por tarefa.
- **sdd-04-review** — revisa o trabalho depois que todas as tarefas estão concluídas. (A ser definida: uma etapa de fechamento após o review — commit, changelog — ainda não tem skill própria.)
- **sdd-tool-debug** — utilitário sob demanda, não sequencial. Chame quando um bloqueio não for óbvio (teste falhando sem causa clara, comportamento inesperado), em vez de tentar resolver por tentativa e erro dentro desta skill.
