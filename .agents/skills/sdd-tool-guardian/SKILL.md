---
name: sdd-tool-guardian
description: SKILL INTERNA. Garante a adesão ao processo SDD validando a transição entre skills. É invocada no início de outras skills.
---

# SDD Process Guardian

## Visão Geral

Esta é uma skill de meta-processo que atua como um "lint" para o comportamento do agente. Sua única função é validar que a próxima ação pretendida pelo agente é uma transição permitida dentro do fluxo SDD.

## O Processo

### Passo 1: Receber o Estado Atual e a Intenção

A skill é invocada com dois argumentos:
- `current_skill`: O nome da skill que a está invocando.
- `intended_action`: A próxima ação que o agente planeja executar.

### Passo 2: Executar Validação Física no CLI

O agente DEVE obrigatoriamente executar o validador físico via CLI:

```bash
node .agents/scripts/sdd.js guardian <current_skill> <intended_action>
```

### Passo 3: Validar e Agir

- **Se o comando retornar sucesso (exit code 0):** A transição foi aprovada e o trabalho pode prosseguir.
- **Se o comando retornar falha (exit code 1):** O script abortará a execução fisicamente, exibindo a violação de processo e bloqueando a transição. O agente DEVE parar imediatamente.

## Quando Parar e Pedir Ajuda

- Se os argumentos `current_skill` ou `intended_action` não forem fornecidos.
- Se a regra para a `current_skill` não for encontrada.
