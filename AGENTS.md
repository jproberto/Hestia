# AGENTS.md

<!-- Última atualização: 2026-07-17 -->

## Visão Geral do Projeto
Héstia é uma ferramenta pessoal para controle de finanças e de lista de tarefas para uma família.

## Estrutura
- `.agents/`: Contém a definição de todo o fluxo SDD.
    - `backlog.md`: Painel central de controle financeiro e status das funcionalidades.
    - `skills/`: Onde cada skill individual é definida em seu próprio diretório, contendo um `SKILL.md` com sua documentação.
    - `specs/`: Armazena as especificações geradas pela skill `sdd-01-brainstorm`.
    - `plans/`: Armazena os planos de implementação gerados pela skill `sdd-02-plan`.
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
4. **Commit Seguro, Padronizado e Aprovado pelo Usuário:** NENHUM commit (seja de specs, planos, código ou documentação) pode ser executado sem a APROVAÇÃO EXPLÍCITA PRÉVIA do parceiro humano. Salve/altere os arquivos localmente, apresente ao usuário e execute o commit via `node .agents/scripts/sdd.js commit "<mensagem>"` APENAS após o usuário aprovar expressamente a entrega correspondente. O commit garante:
   - Bloqueio preventivo de segurança contra staging acidental de arquivos de configuração locais (ex: `.env.local` contendo credenciais reais).
   - Validação e compatibilidade de idioma (força mensagens de commit em Português quando compatível com o histórico recente).
5. **Revisão e Homologação Manual (sdd-04 e sdd-05)**: Antes de considerar o trabalho fechado, o agente deve rodar `node .agents/scripts/sdd.js request-review` para certificar que todas as tarefas foram fechadas. Em seguida, transiciona para a etapa de revisão de código (`sdd-04-review`). Após aprovação técnica, transiciona obrigatoriamente para a homologação visual e validação de negócio com a skill `sdd-05-manual-test`. Após homologação e aprovação do usuário, atualiza o status da feature correspondente no `.agents/backlog.md` para `Concluído` e pergunta sobre a execução do `git push` ao usuário.
6. **Separação Rígida de Etapas e Turnos (Não Pule Etapas)**: A fase de Brainstorming (`sdd-01-brainstorm`) e de Planejamento (`sdd-02-plan`) são etapas independentes com portões de aprovação humana obrigatórios. É expressamente proibido criar a especificação e o plano de tarefas em uma única iteração de mensagens. O agente deve parar, apresentar o artefato correspondente e aguardar a aprovação explícita do usuário antes de prosseguir para a próxima skill.
7. **Alterações de Banco de Dados (Migrações)**: Toda alteração de dados ou schema físico do Supabase deve ser empacotada em arquivos SQL sob `utils/migrations/` e registrar a execução de forma auditável na tabela `public.schema_migrations`. Por padrão do projeto, o executor (`executed_by`) é sempre `'joaopsroberto@gmail.com'`. Agentes não devem implementar queries ou códigos Next.js sem antes garantir a existência do script DDL correspondente neste formato.
8. **Discovery Competente de Produto (`sdd-01-brainstorm`):** Agentes são expressamente PROIBIDOS de atuar como meros anotadores passivos. Na fase de brainstorming, o agente deve atuar como Product Lead especialista, guiando o parceiro humano em 4 etapas de discovery (intenção/problema real, jornada de UX, casos de borda e fronteiras do MVP) antes de redigir a especificação funcional.
9. **Proibição Absoluta de Gambiarras e Retentativas Cegas (Zero Workarounds):** Agentes jamais devem mascarar erros de compilação/linter, silenciar exceções ou tentar resolver falhas por tentativa e erro repetido. Diante de qualquer erro de teste ou tipo não trivial, é OBRIGATÓRIO invocar a skill `sdd-tool-debug` para diagnosticar a causa raiz com evidência antes de modificar o código.

## Comandos do SDD CLI

Execute os comandos a partir do diretório raiz:

```bash
# Inicializar validação do plano (Guardian)
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