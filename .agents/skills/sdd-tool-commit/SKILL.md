---
name: sdd-tool-commit
description: Use para criar commits git depois que uma tarefa, plano ou review estiver concluído e verificado. Cobre revisão do diff, checagem de baseline, definição de granularidade (um commit vs vários commits atômicos por tarefa), escrita da mensagem seguindo a convenção observada no projeto, e commit em si — nunca push sem confirmação explícita. Utilitário sob demanda, não sequencial — chame depois que os testes estiverem passando e não houver mais pendências, tipicamente ao final de sdd-03-implement ou depois de sdd-04-review. Não usar para decidir o que implementar, nem para resolver conflitos de merge complexos.
---

# Fechando o Trabalho com Commits

## Visão Geral

Transforme mudanças já verificadas em commits git bem formados: revise o diff, confirme que não há nada quebrado ou fora de escopo, escreva mensagens que sigam a convenção real do projeto, e registre o trabalho — sem nunca enviar (`push`) sem autorização explícita do parceiro humano.

**Anuncie no início:** "Estou usando a skill sdd-tool-commit para registrar este trabalho."

**Pré-requisito:** as mudanças que serão commitadas já devem estar verificadas (testes passando, tarefas marcadas como concluídas). Esta skill não implementa nem corrige nada — se encontrar algo quebrado, pare e volte para a etapa de implementação.

## O Processo

### Passo 1: Levantar o Estado Atual

1. Rode `git status` e `git diff` (staged e unstaged) para ver exatamente o que mudou.
2. Rode `git log --oneline -20` para observar a convenção de mensagens já usada neste projeto (Conventional Commits, imperativo simples, prefixo de ticket, etc.). Siga o que já existe — não introduza uma convenção nova por conta própria.
3. Confirme que a branch atual não é `main` ou `develop`. Se for, pare e avise o parceiro humano — não commite diretamente nas branches principais sem consentimento explícito.
4. Se houver mudanças no diff que não fazem parte do escopo do que foi implementado (arquivos tocados por acidente, artefatos de build, arquivos de configuração local), sinalize e confirme com o parceiro humano antes de incluir ou excluir do commit.

### Passo 2: Confirmar a Baseline

1. Rode a suíte de testes do projeto (conforme `references/testing.md`, se essa skill existir) e confirme que passa.
2. Se algo estiver falhando, **pare**. Não é papel desta skill corrigir — volte para `sdd-03-implement` ou avise o parceiro humano.
3. Confirme que não há TODOs pendentes relacionados a este trabalho.

### Passo 3: Definir a Granularidade

1. Se houver um plano (`sdd-02-plan`) disponível com tarefas bem delimitadas, prefira **um commit por tarefa concluída** — cada commit deve deixar o projeto num estado consistente (compila, testes passam).
2. Se as mudanças forem pequenas, muito interligadas, ou não houver plano formal, um único commit coeso é aceitável.
3. Nunca misture, num mesmo commit, mudanças de propósitos claramente diferentes (ex: uma correção de bug junto com uma feature nova) — separe, mesmo que isso não estivesse explícito no plano.

### Passo 4: Escrever as Mensagens

1. Siga a convenção observada no Passo 1. Na ausência de qualquer padrão claro no histórico, use por padrão: linha de resumo no imperativo, até ~72 caracteres, corpo opcional explicando o porquê (não só o quê) quando a mudança não for óbvia.
2. A mensagem deve refletir o que a mudança faz, não parafrasear o nome da tarefa do plano.
3. Nunca inclua no commit informação sensível (segredos, chaves, dados de cliente) — se notar algo assim no diff, pare e avise antes de commitar.

### Passo 5: Commitar

1. Stage apenas os arquivos definidos no Passo 1/3 (`git add <arquivos>` explícito — evite `git add .` às cegas quando houver arquivos fora de escopo no diff).
2. Rode `git commit` com a mensagem definida.
3. Repita para cada commit planejado, na ordem lógica (dependências antes de quem depende delas).
4. **Nunca rode `git push`** a menos que o parceiro humano peça explicitamente nesta conversa.

### Passo 6: Reportar

Resuma para o parceiro humano: quantos commits foram criados, o hash e resumo de cada um, e qualquer arquivo que ficou de fora do commit (e por quê).

## Quando Parar e Pedir Ajuda

- Testes falhando ou baseline não confirmada.
- Diff contém mudanças fora do escopo do trabalho verificado, sem explicação clara.
- Diff contém possível segredo, chave ou dado sensível.
- Branch atual é `main`/`develop`.
- Histórico do projeto não tem convenção de mensagem discernível e o parceiro humano não indicou uma preferência — pergunte antes de assumir um padrão.
- Conflito de merge ou estado de rebase em andamento — isso está fora do escopo desta skill.

## Lembre-se

- Nunca commite código quebrado ou não verificado — a verificação é pré-requisito, não parte desta skill.
- Siga a convenção de mensagem que já existe no projeto; não invente uma nova.
- Prefira commits atômicos alinhados às tarefas do plano, quando houver plano.
- Nunca misture propósitos diferentes num mesmo commit.
- Nunca dê `push` sem pedido explícito do parceiro humano na conversa.
- Nunca commite segredos ou dados sensíveis — pare e avise se notar algo assim.