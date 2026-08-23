# AGENTS.md

## Visão Geral do Projeto
Héstia é uma ferramenta pessoal para controle de finanças e de lista de tarefas familiar.

## Estrutura do Projeto
- `.agents/`: Diretório do fluxo SDD (artefatos transversais na raiz).
    - `backlog.md`: Painel central — contexto do produto-guarda-chuva, tabela de módulos registrados e itens estruturais.
    - `skills/`: Contém a documentação e instruções de cada skill (`SKILL.md`).
    - `specs/` e `plans/`: Artefatos transversais (itens estruturais e do núcleo Héstia).
    - `<modulo>/`: Documentação de cada módulo registrado (`backlog.md`, `specs/`, `plans/`, `logs/`) — ex.: `.agents/pluto/`.
    - `scripts/`: Scripts de automação do fluxo (`sdd.js`).
- Código comum/transversal (na raiz das camadas): `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/login/`, `app/dashboard/`, `components/ui/`, `lib/utils.ts`, `utils/supabase/`, `utils/migrations/`.
- Módulo Pluto (financeiro): `app/pluto/`, `components/pluto/`, `lib/pluto/` (com `db/`) e testes espelhados em `__tests__/app/pluto/`, `__tests__/components/pluto/`, `__tests__/lib/pluto/`.

## Padrão de Módulos
Código específico de um módulo vive em `<camada>/<modulo>/` nas camadas `app`, `components`, `lib` e `__tests__`; o que é compartilhado permanece na raiz da camada. Documentação de módulo vive em `.agents/<modulo>/` (`backlog.md`, `specs/`, `plans/`, `logs/`); artefatos transversais ficam na raiz de `.agents/`. Para registrar um novo módulo: criar `.agents/<modulo>/backlog.md` e adicionar sua linha na tabela "Módulos Registrados" do backlog central — o `sdd.js` descobre os módulos por esse link. Não há scaffolding automático.

## Mapeamento de Skills e Ciclo de Vida SDD

Todo agente que atuar neste repositório DEVE obrigatoriamente consultar a skill correspondente à fase atual antes de agir:

| Fase | Skill a Consultar | Finalidade |
|---|---|---|
| 1. Discovery & Spec | [`sdd-01-brainstorm`](.agents/skills/sdd-01-brainstorm/SKILL.md) | Conduzir discovery de produto com o usuário e gerar a especificação funcional. |
| 2. Planejamento | [`sdd-02-plan`](.agents/skills/sdd-02-plan/SKILL.md) | Transformar a spec aprovada em um plano de tarefas atômicas e executáveis. |
| 3. Implementação | [`sdd-03-implement`](.agents/skills/sdd-03-implement/SKILL.md) | Executar as tarefas do plano via TDD, validações e linter locais. |
| 4. Revisão Técnica | [`sdd-04-review`](.agents/skills/sdd-04-review/SKILL.md) | Revisar diff, contrato, qualidade de código e testes antes da homologação. |
| 5. Homologação | [`sdd-05-manual-test`](.agents/skills/sdd-05-manual-test/SKILL.md) | Guia de homologação manual visual e validação de negócio com o usuário. |

### Skills Utilitárias (Sob Demanda)
- **Diagnóstico & Debug:** [`sdd-tool-debug`](.agents/skills/sdd-tool-debug/SKILL.md) — Investigar causa raiz de falhas com evidências antes de alterar código.
- **Banco de Dados:** [`sdd-tool-db-migration`](.agents/skills/sdd-tool-db-migration/SKILL.md) — Criar migrações SQL auditadas em `utils/migrations/`.
- **Commits:** [`sdd-tool-commit`](.agents/skills/sdd-tool-commit/SKILL.md) — Criar commits padronizados e seguros após aprovação humana.
- **Validação de Fluxo:** [`sdd-tool-guardian`](.agents/skills/sdd-tool-guardian/SKILL.md) — Validar fisicamente a transição entre skills no CLI.

## Regras Fundamentais de Execução (Garantia do Processo)

1. **Consulta Obrigatória de Skills:** O agente DEVE consultar a skill relevante antes de iniciar qualquer fase do ciclo de vida.
2. **Controle pelo Backlog Central:** Consultar e atualizar o status em `.agents/backlog.md` a cada mudança de estado da feature.
3. **Automação Inflexível via CLI (`sdd.js`):** Executar tarefas, guardian, verificações e commits exclusivamente pelo utilitário `.agents/scripts/sdd.js`.
4. **Proibição de Código Sem Spec/Plano Aprovados:** Nenhuma linha de código deve ser escrita antes da aprovação explícita da Spec (`sdd-01`) e do Plano (`sdd-02`).
5. **Parada Obrigatória de Turno (Stop & Wait):** Após gerar ou alterar qualquer artefato (Spec, Plano ou Código), o agente DEVE encerrar a resposta no chat e aguardar a aprovação explícita do parceiro humano antes de commitar ou prosseguir.
6. **Commits Apenas sob Autorização Explícita:** Nenhum commit pode ser realizado sem autorização prévia e expressa do usuário.
7. **Migrações de Banco Auditadas:** Alterações em schemas do Supabase devem ser empacotadas em `utils/migrations/` com registro na tabela `schema_migrations`.
8. **Investigação sem Gambiarras:** Diante de falhas em testes ou runtime, utilizar obrigatoriamente `sdd-tool-debug` para diagnosticar a causa raiz; é proibido silenciar erros ou fazer tentativas cegas.

## Comandos do SDD CLI

Execute a partir do diretório raiz:

```bash
# Inicializar validação do plano (Guardian)
node .agents/scripts/sdd.js start <slug-do-plano>

# Ciclo de vida da tarefa
node .agents/scripts/sdd.js task-start <task-id>
node .agents/scripts/sdd.js task-complete <task-id>
node .agents/scripts/sdd.js task-block <task-id> "<motivo>"

# Solicitar revisão e gerar template
node .agents/scripts/sdd.js request-review

# Commit de código validado
node .agents/scripts/sdd.js commit "<mensagem-em-português>"
```