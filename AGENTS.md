# AGENTS.md

<!-- Última atualização: 2026-07-16 -->

## Visão Geral do Projeto
Héstia é uma ferramenta pessoal para controle de finanças e de lista de tarefas para uma família.

## Estrutura
- `.agents/`: Contém a definição de todo o fluxo SDD.
    - `backlog.md`: Painel central de controle financeiro e status das funcionalidades.
    - `skills/`: Onde cada skill individual é definida em seu próprio diretório, contendo um `SKILL.md` com sua documentação.
    - `specs/`: Armazena as especificações geradas pela skill `sdd-01-brainstorm`.
    - `plans/`: Armazena os planos de implementação gerados pela skill `sdd-02-plan`.
    - `logs/` : Armazena os logs de execução gerados pela skill `sdd-tool-tracking`.
    - `scripts/`: Scripts utilitários para automação de processos.
- `AGENTS.md`: Este arquivo.
- `README.md`: Documentação geral para humanos.

## Contrato de Execução Estrito (Garantia do Fluxo SDD)

Todo agente de IA que atuar neste projeto é obrigado a respeitar as seguintes diretrizes:

1. **Uso do Backlog Central:** Qualquer ciclo de desenvolvimento de feature deve se iniciar consultando o `.agents/backlog.md` e atualizando o status do item correspondente para `Em Especificação` (e linkando a spec gerada).
2. **Uso Obrigatório do CLI de Automação:** Todo o tracking de execução do plano, validações de linter/build, guardian e segurança de commits devem ser executados através do utilitário `.agents/scripts/sdd.js`. O comando `start` valida fisicamente se a branch atual é de feature (impede cometer alterações em `main` ou `develop`), se a especificação correspondente existe fisicamente e se o status no backlog está como `Especificado`, abortando o processo em caso de irregularidades.
3. **Ciclo de Vida de Tarefas (Ordem Estrita de Conclusão):**
   - Ao iniciar uma tarefa, execute: `node .agents/scripts/sdd.js task-start <id>`
   - Para concluir uma tarefa, siga obrigatoriamente esta ordem de passos:
     1. Execute localmente os validadores para garantir que não há erros: `npm run test`, `npx eslint .` e `npx tsc --noEmit`.
     2. Marque a tarefa como concluída no CLI: `node .agents/scripts/sdd.js task-complete <id>` (a conclusão será bloqueada no script caso haja erros).
     3. Adicione os arquivos ao Git stage (`git add <arquivos>`).
     4. Faça o commit seguro (conforme item 4 abaixo).
   - Ao encontrar um bloqueador, execute: `node .agents/scripts/sdd.js task-block <id> "<motivo>"`
4. **Commit Seguro e Padronizado:** Todo commit de código deve ser feito exclusivamente via `node .agents/scripts/sdd.js commit "<mensagem>"` (sempre após a execução bem-sucedida do `task-complete <id>`) para garantir:
   - Bloqueio preventivo de segurança contra staging acidental de arquivos de configuração locais (ex: `.env.local` contendo credenciais reais).
   - Validação e compatibilidade de idioma (força mensagens de commit em Português quando compatível com o histórico recente).
5. **Redirecionamento para Review e Atualização do Backlog:** Antes de considerar o trabalho fechado, o agente deve rodar `node .agents/scripts/sdd.js request-review` para certificar que todas as tarefas foram fechadas, transicionar para a etapa de revisão (`sdd-04-review`), perguntar sobre a execução do `git push` ao usuário, e ao final atualizar o status da feature correspondente no `.agents/backlog.md` para `Concluído`.
6. **Separação Rígida de Etapas e Turnos (Não Pule Etapas)**: A fase de Brainstorming (`sdd-01-brainstorm`) e de Planejamento (`sdd-02-plan`) são etapas independentes com portões de aprovação humana obrigatórios. É expressamente proibido criar a especificação e o plano de tarefas em uma única iteração de mensagens. O agente deve parar, apresentar o artefato correspondente e aguardar a aprovação explícita do usuário antes de prosseguir para a próxima skill.

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