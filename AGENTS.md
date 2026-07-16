# AGENTS.md

<!-- Última atualização: 2026-07-16 -->

## Visão Geral do Projeto
Héstia é uma ferramenta pessoal para controle de finanças e de lista de tarefas para uma família.

## Estrutura
- `.agents/`: Contém a definição de todo o fluxo SDD.
    - `skills/`: Onde cada skill individual é definida em seu próprio diretório, contendo um `SKILL.md` com sua documentação.
    - `specs/`: Armazena as especificações geradas pela skill `sdd-01-brainstorm`.
    - `plans/`: Armazena os planos de implementação gerados pela skill `sdd-02-plan`.
    - `logs/` : Armazena os logs de execução gerados pela skill `sdd-tool-tracking`.
    - `scripts/`: Scripts utilitários para automação de processos.
- `AGENTS.md`: Este arquivo.
- `README.md`: Documentação geral para humanos.

## Contrato de Execução Estrito (Garantia do Fluxo SDD)

Todo agente de IA que atuar neste projeto é obrigado a respeitar as seguintes diretrizes:

1. **Uso Obrigatório do CLI de Automação:** Todo o tracking de execução do plano, validações de linter/build, guardian e segurança de commits devem ser executados através do utilitário `.agents/scripts/sdd.js`.
2. **Ciclo de Vida de Tarefas:**
   - Ao iniciar uma tarefa, execute: `node .agents/scripts/sdd.js task-start <id>`
   - Ao concluir uma tarefa, execute: `node .agents/scripts/sdd.js task-complete <id>` (a conclusão será bloqueada se houver erros de linter ou compilador).
   - Ao encontrar um bloqueador, execute: `node .agents/scripts/sdd.js task-block <id> "<motivo>"`
3. **Commit Seguro e Padronizado:** Todo commit de código deve ser feito exclusivamente via `node .agents/scripts/sdd.js commit "<mensagem>"` para garantir:
   - Bloqueio preventivo de segurança contra staging acidental de arquivos de configuração locais (ex: `.env.local` contendo credenciais reais).
   - Validação e compatibilidade de idioma (força mensagens de commit em Português quando compatível com o histórico recente).
4. **Redirecionamento para Review:** Antes de considerar o trabalho fechado, o agente deve rodar `node .agents/scripts/sdd.js request-review` para certificar que todas as tarefas foram fechadas e gerar a transição para a etapa de revisão (`sdd-04-review`).

## Comandos do SDD CLI

Execute os comandos a partir do diretório raiz:

```bash
# Inicializar log de tracking (Guardian + Tracking)
node .agents/scripts/sdd.js start <slug-do-plano>

# Ciclo de vida da tarefa
node .agents/scripts/sdd.js task-start <task-id>
node .agents/scripts/sdd.js task-complete <task-id>
node .agents/scripts/sdd.js task-block <task-id> "<motivo>"

# Solicitar revisão e gerar template (Review)
node .agents/scripts/sdd.js request-review

# Commit de código validado (Commit)
node .agents/scripts/sdd.js commit "<mensagem-em-português>"
```