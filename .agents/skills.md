# Catálogo de Skills do Projeto

Este arquivo serve como o registro central de todas as skills disponíveis para os agentes no fluxo SDD. Manter este catálogo atualizado é crucial para a descoberta e o uso correto das ferramentas.

## Fluxo Principal (Sequencial)

Estas skills formam o pipeline principal de desenvolvimento, executadas em ordem.

| Skill | Responsabilidade Central | Saídas Principais | Quando Usar |
|---|---|---|---|
| `sdd-01-brainstorm` | Refinar a solicitação a partir do backlog, explorar requisitos e definir o escopo. | Um artefato de especificação (`.agents/specs/...-spec.md`) e status do backlog atualizado. | No início do fluxo, selecionando o próximo item do backlog para especificar. |
| `sdd-02-plan` | Quebrar a especificação em um plano de implementação detalhado e acionável. | Um artefato de plano (`.agents/plans/...-plan.md`) com tarefas discretas. | Após a `spec` ser aprovada, para criar o roteiro de implementação. |
| `sdd-03-implement` | Executar as tarefas de um plano de implementação, uma a uma. | Código-fonte modificado, testes, e outros artefatos técnicos. | Quando um plano de implementação está pronto para ser executado. |
| `sdd-04-review` | Revisar o código contra a spec/plano e marcar a funcionalidade no backlog como Concluída. | Relatório de revisão e atualização de status no `.agents/backlog.md`. | Após a conclusão da implementação, antes de integrar as mudanças. |

## Skills de Manutenção de Artefatos (Writers)

Estas skills são responsáveis por criar e manter artefatos específicos do projeto que não são parte do fluxo de código principal.

| Skill | Responsabilidade Central | Saídas Principais | Quando Usar |
|---|---|---|---|
| `sdd-writer-agents` | Manter a documentação dos agentes (`AGENTS.md`). | O arquivo `AGENTS.md` atualizado. | Sob demanda, quando a documentação de um agente precisa ser criada ou atualizada. |
| `sdd-writer-skills` | Manter as definições de skills (`SKILL.md`) e este catálogo (`skills.md`). | Arquivos `SKILL.md` e `skills.md` atualizados. | Sob demanda, para criar, refatorar ou documentar uma skill. |
| `sdd-writer-changelog` | Manter o changelog do projeto (`CHANGELOG.md`) e guias do `README.md`. | Arquivos `CHANGELOG.md` e `README.md` atualizados. | Sempre após fechar uma feature ou correção relevante, para documentar publicamente as alterações e novos guias. |

## Skills de Ferramenta (Tools)

Estas são skills utilitárias que podem ser chamadas sob demanda em várias etapas do fluxo para realizar ações pontuais.

| Skill | Responsabilidade Central | Saídas Principais | Quando Usar |
|---|---|---|---|
| `sdd-tool-commit` | Realizar o commit das mudanças de código seguindo as convenções do projeto. | Um novo commit na branch atual. | Após a aprovação da revisão de código, ou quando for necessário salvar o progresso. |
| `sdd-tool-debug` | Ajudar na investigação e diagnóstico de erros ou comportamentos inesperados. | Análise da causa raiz, logs, e sugestões de correção. | Quando um teste falha ou um bug é encontrado durante a implementação ou teste. |
| `sdd-tool-guardian` | Garantir a adesão ao processo SDD validando transições entre as skills executadas. | Validação silenciosa ou interrupção de fluxo caso haja transição inválida. | No início de outras skills do fluxo para verificação automatizada. |
| `sdd-tool-tracking` | Manter um log de execução detalhado para um plano de tarefas. | Um arquivo de log (`.agents/logs/...-execution.log`). | Durante a execução de um plano, para registrar o início, o progresso de cada tarefa, e quaisquer impedimentos. |
