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

### Passo 2: Definir e Consultar as Regras de Transição

As transições válidas estão definidas internamente.

- de `sdd-01-brainstorm`: `write_file` (spec), `invoke:sdd-02-plan`
- de `sdd-02-plan`: `write_file` (plano), `invoke:sdd-03-implement`
- de `sdd-03-implement`: `invoke:sdd-04-review`
- de `sdd-04-review`: `invoke:sdd-tool-commit`, `invoke:sdd-writer-skills`

### Passo 3: Validar e Agir

- **Se a transição for VÁLIDA:** A skill termina silenciosamente, permitindo que a ação prossiga.
- **Se a transição for INVÁLIDA:**
    1.  **Bloqueio:** A skill para a execução.
    2.  **Relatório:** Gera uma mensagem de erro clara: "VIOLAÇÃO DE PROCESSO: A skill 'X' não pode ser seguida por 'Y'. Ação correta: 'Z'."

## Quando Parar e Pedir Ajuda

- Se os argumentos `current_skill` ou `intended_action` não forem fornecidos.
- Se a regra para a `current_skill` não for encontrada.
