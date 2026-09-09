# Spec: Skill `sdd-tool-guardian`

## 1. Visão Geral

Esta especificação descreve uma nova skill de meta-processo chamada `sdd-tool-guardian`. O objetivo desta skill é garantir a adesão estrita ao fluxo de trabalho SDD (Spec-Driven Development), atuando como um "lint" para o comportamento do agente.

## 2. Problema a ser Resolvido

O agente de IA (modelo de linguagem) possui um viés inerente a "resumir" e "reformatar", o que pode levar a alterações indesejadas em arquivos. Além disso, a complexidade do fluxo SDD pode levar a esquecimentos ou desvios do processo correto (ex: pular a etapa de revisão). A confiança no agente depende de sua capacidade de seguir o processo de forma previsível e disciplinada.

## 3. Design da Solução

### 3.1. Categoria da Skill

- **Nome:** `sdd-tool-guardian`
- **Categoria:** `sdd-tool-*`. É uma ferramenta de utilidade sob demanda, focada em verificação de processo.

### 3.2. Mecanismo de Ativação

- A verificação será integrada ao processo existente.
- As principais skills sequenciais (`sdd-01-brainstorm`, `sdd-02-plan`, `sdd-03-implement`, `sdd-04-review`) serão modificadas para que seu **primeiro passo obrigatório** seja invocar a `sdd-tool-guardian`.

### 3.3. Comportamento Principal

A `sdd-tool-guardian` receberá dois argumentos:
1.  `current_skill`: O nome da skill que a está invocando.
2.  `intended_action`: A próxima ação que o agente planeja executar (ex: `write_file`, `invoke:sdd-04-review`).

O processo da skill será:

1.  **Definir as Regras de Transição:** A skill terá um mapa interno definindo as transições válidas no fluxo SDD.
    - `sdd-01-brainstorm` -> `write_file` (para a spec) | `invoke:sdd-02-plan`
    - `sdd-02-plan` -> `write_file` (para o plano) | `invoke:sdd-03-implement`
    - `sdd-03-implement` -> `invoke:sdd-04-review`
    - `sdd-04-review` -> `invoke:sdd-tool-commit` | `invoke:sdd-writer-skills` (para melhoria)

2.  **Validar a Transição:** A skill verificará se a `intended_action` é uma transição válida a partir da `current_skill`, de acordo com as regras.

3.  **Gerar Resultado:**
    - **Se a transição for VÁLIDA:** A skill termina silenciosamente, permitindo que a ação prossiga.
    - **Se a transição for INVÁLIDA (Violação de Processo):**
        a. **Bloqueio Rígido:** A skill irá parar a execução e impedir a ação incorreta.
        b. **Relatório de Violação:** Gerará uma mensagem de erro clara para o usuário, informando a skill atual, a ação tentada e qual seria a ação correta.

## 4. Exemplo de Uso

1.  O agente está na skill `sdd-03-implement` e decide, incorretamente, fazer um commit.
2.  O agente anuncia: "Pretendo executar `git commit`."
3.  A primeira linha da `sdd-03-implement` o força a invocar `sdd-tool-guardian(current_skill='sdd-03-implement', intended_action='invoke:sdd-tool-commit')`.
4.  O guardião verifica suas regras e vê que a transição é inválida.
5.  O guardião bloqueia a ação e exibe: "VIOLAÇÃO DE PROCESSO: A skill 'sdd-03-implement' não pode ser seguida por 'sdd-tool-commit'. A próxima skill correta é 'sdd-04-review'."

## 5. Próximos Passos

- Escrever o plano de implementação (`sdd-02-plan`) para:
    1.  Criar a `sdd-tool-guardian/SKILL.md` usando a `sdd-writer-skills`.
    2.  Modificar as skills existentes (`sdd-01` a `sdd-04`) para adicionar a chamada ao guardião como primeiro passo.
