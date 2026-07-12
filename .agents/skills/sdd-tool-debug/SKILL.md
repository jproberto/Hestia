---
name: sdd-tool-debug
description: Use quando um bloqueio não for óbvio — teste falhando sem causa clara, comportamento inesperado, erro que não se repete de forma óbvia — em vez de tentar corrigir por tentativa e erro. Investiga sistematicamente até confirmar a causa raiz com evidência, só então aplica a correção mínima e devolve o controle. Utilitário sob demanda, não sequencial. Não usar para implementar features novas (isso é sdd-03-implement) nem para revisar trabalho concluído (isso é sdd-04-review), e nunca aplicar uma correção antes de confirmar a causa raiz.
---

# Investigando Bugs

## Visão Geral

Um bloqueio que não tem causa óbvia não se resolve tentando correções até uma "colar". Reproduza o problema, isole a variável, formule uma hipótese, teste a hipótese com evidência, só então corrija. Cada etapa existe para impedir que uma correção acidental esconda a causa real, que volta mais tarde.

**Anuncie no início:** "Estou usando a skill sdd-tool-debug para investigar este problema."

**Pré-requisito:** você foi chamado a partir de outra skill ou pelo parceiro humano com um sintoma concreto (teste falhando, erro, comportamento inesperado). Se o sintoma ainda não está claro, peça o comando exato e a saída exata antes de começar — investigar em cima de uma descrição vaga custa mais tempo do que pedir precisão primeiro.

## O Processo

### Passo 1: Reproduzir de Forma Confiável

1. Rode o comando exato que expõe o problema (teste, script, request) e capture a saída completa — não resuma, cole o erro/stack trace real.
2. Confirme que o problema se repete de forma consistente. Se for intermitente, rode várias vezes e registre a taxa de falha — isso já é uma pista (condição de corrida, dependência de ordem, estado compartilhado).
3. Se não conseguir reproduzir de forma alguma depois de tentativas razoáveis, pare (ver "Quando Parar e Pedir Ajuda") em vez de investigar um sintoma que você não consegue observar.

### Passo 2: Isolar a Variável

1. Reduza o caso ao menor exemplo que ainda reproduz o problema — remova código, dados ou passos que não são necessários para o sintoma aparecer.
2. Verifique o que mudou recentemente perto da área afetada: `git log --oneline -10 -- <arquivo>` e `git diff` desde o último estado conhecido como bom, se houver um.
3. Confirme as suposições básicas antes de ir mais fundo: a versão/branch é a esperada, as dependências estão instaladas na versão certa, a configuração/env está correta. Bugs "impossíveis" frequentemente são suposição errada, não lógica errada.

### Passo 3: Formular Hipóteses

1. Liste as causas prováveis, da mais simples e provável para a mais complexa e improvável. Não pule direto para a explicação mais interessante.
2. Para cada hipótese, defina antes de testar: que evidência confirmaria e que evidência descartaria.
3. Priorize a hipótese mais barata de testar entre as mais prováveis, não necessariamente a primeira da lista.

### Passo 4: Testar a Hipótese Mais Provável

1. Faça a menor mudança possível para observar a evidência — instrumentação temporária (log, print, breakpoint), não uma correção definitiva.
2. Rode de novo e compare com o que a hipótese previa.
3. Hipótese confirmada → vá para o Passo 5.
4. Hipótese refutada → volte ao Passo 3 com a próxima hipótese, incorporando o que essa tentativa ensinou. Depois de 3 hipóteses refutadas sem uma causa clara emergindo, pare (ver "Quando Parar e Pedir Ajuda") em vez de continuar por tentativa e erro.

### Passo 5: Confirmar a Causa Raiz

1. Antes de corrigir, articule a causa raiz numa frase que explique o sintoma observado do início ao fim — se você não consegue explicar por que o sintoma acontece, ainda não confirmou a causa, só uma correlação.
2. Remova toda instrumentação temporária do Passo 4 que não faz parte da correção final.

### Passo 6: Aplicar a Correção Mínima

1. Corrija a causa raiz, não o sintoma — não adicione um caso especial que esconde o problema sem resolvê-lo.
2. Escreva (ou peça para adicionar, se estiver no meio de um plano) um teste que falha sem a correção e passa com ela, para que essa causa não volte silenciosamente.
3. Rode a suíte de testes completa do projeto, não só o teste relacionado ao bug — uma correção pode ter efeito colateral em outro lugar.
4. Confirme que nenhum log, print ou breakpoint de depuração ficou no código.

### Passo 7: Reportar e Devolver o Controle

Resuma para quem te chamou (skill ou parceiro humano):

- O sintoma original.
- A causa raiz confirmada, com a evidência que a confirmou.
- A correção aplicada e o teste que a cobre.
- Se a causa raiz revelou um problema maior que o bug pontual (ex: padrão repetido em outros lugares do código), sinalize — não corrija além do escopo do bloqueio original sem confirmar com o parceiro humano.

Esta skill termina aqui. Se você foi chamado a partir de `sdd-03-implement` ou `sdd-04-review`, o controle volta para lá.

## Quando Parar e Pedir Ajuda

- Não foi possível reproduzir o problema de forma confiável depois de tentativas razoáveis.
- Três hipóteses testadas e refutadas sem uma causa clara emergindo.
- A causa raiz aponta para uma decisão de arquitetura ou produto (não uma correção técnica local) — corrigir exigiria mudar um comportamento que outra parte do sistema depende, ou reverter uma escolha deliberada.
- A causa está numa dependência externa ou serviço fora do controle do projeto.
- A correção mínima do Passo 6 exigiria tocar em código fora do escopo do bloqueio original.

Nesses casos, pare e relate o que já foi descartado e o que ainda é hipótese, em vez de continuar tentando às cegas ou aplicar uma correção que você não confirmou.

## Lembre-se

- Nunca aplique uma correção antes de confirmar a causa raiz com evidência — corrigir por tentativa e erro esconde o problema em vez de resolvê-lo.
- Reproduza antes de investigar; investigue antes de corrigir.
- Prefira a hipótese mais simples e provável antes da mais interessante.
- Corrija a causa, não o sintoma.
- Sempre adicione um teste que trava a causa raiz, para o bug não voltar silenciosamente.
- Remova toda instrumentação temporária (logs, prints, breakpoints) antes de reportar como concluído.
- Não corrija além do escopo do bloqueio original sem confirmar com o parceiro humano, mesmo que a investigação revele outros problemas.