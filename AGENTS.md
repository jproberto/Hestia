# AGENTS.md

<!-- Última atualização: 2024-07-12 -->

## Visão Geral do Projeto
Héstia é uma ferramenta pessoal para controle de finanças e de lista de tarefas para uma família.

## Estrutura
- `.agents/`: Contém a definição de todo o fluxo SDD.
    - `skills/`: Onde cada skill individual é definida em seu próprio diretório, contendo um `SKILL.md` com sua documentação.
    - `specs/`: Armazena as especificações geradas pela skill `sdd-01-brainstorm`.
    - `plans/`: Armazena os planos de implementação gerados pela skill `sdd-02-plan`.
    - `logs/` : Armazena os logs de execução gerados pela skill `sdd-tool-tracking`.
- `AGENTS.md`: Este arquivo.
- `README.md`: Documentação geral para humanos.