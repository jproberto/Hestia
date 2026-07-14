# Plano de Implementação: Skill `sdd-tool-guardian`

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

Use checkbox (`- [ ]`) para acompanhamento. Marque com o emoji ✅ quando a tarefa estiver concluída.

**Objetivo:** Criar e integrar a skill `sdd-tool-guardian` para garantir a adesão ao processo SDD.

**Arquitetura:** A nova skill será um `sdd-tool` que será invocado no início das skills sequenciais existentes.

**Tech Stack:** N/A (trata-se de uma alteração de processo).

## Análise de Riscos de Ferramentas

- **Risco 1:** O agente não pode criar diretórios. A criação do diretório `sdd-tool-guardian` exigirá um comando `mkdir` a ser executado pelo parceiro humano.
- **Mitigação:** O plano incluirá um passo explícito para o parceiro humano executar o comando `mkdir`.

---

### Tarefa 1: Criar a Skill `sdd-tool-guardian`

**Arquivos:**
- Criar: `.agents/skills/sdd-tool-guardian/SKILL.md`

**Interfaces:**
- Produz: A nova skill `sdd-tool-guardian`.

- [ ] **Passo 1: Criar o diretório da skill**
  O agente não pode criar diretórios. O parceiro humano precisa executar este comando.

  **Run (Human):**
  ```sh
  mkdir .agents/skills/sdd-tool-guardian
  ```

- [ ] **Passo 2: Escrever o conteúdo da `SKILL.md`**
  O conteúdo será baseado na especificação aprovada.

  **Ação:** Escrever o seguinte conteúdo no arquivo `.agents/skills/sdd-tool-guardian/SKILL.md`:
  ```markdown
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
      3.  **Log:** Invoca `sdd-tool-tracking` para registrar um `ERROR` no log de execução da tarefa atual.

  ## Quando Parar e Pedir Ajuda

  - Se os argumentos `current_skill` ou `intended_action` não forem fornecidos.
  - Se a regra para a `current_skill` não for encontrada.
  ```

- [ ] **Passo 3: Verificar a criação do arquivo**
  **Run:**
  ```sh
  ls .agents/skills/sdd-tool-guardian/SKILL.md
  ```
  **Expected:** `.agents/skills/sdd-tool-guardian/SKILL.md`

---

### Tarefa 2: Integrar o Guardião às Skills Existentes

**Arquivos:**
- Modificar: `sdd-01-brainstorm/SKILL.md`, `sdd-02-plan/SKILL.md`, `sdd-03-implement/SKILL.md`, `sdd-04-review/SKILL.md`.

**Interfaces:**
- Consome: A existência da skill `sdd-tool-guardian`.
- Produz: Um fluxo de trabalho SDD mais robusto e auto-verificável.

- [ ] **Passo 1: Modificar `sdd-01-brainstorm`**
  **Ação:** Adicionar a chamada ao guardião como o primeiro passo do processo na skill `sdd-01-brainstorm`.

- [ ] **Passo 2: Modificar `sdd-02-plan`**
  **Ação:** Adicionar a chamada ao guardião como o primeiro passo do processo na skill `sdd-02-plan`.

- [ ] **Passo 3: Modificar `sdd-03-implement`**
  **Ação:** Adicionar a chamada ao guardião como o primeiro passo do processo na skill `sdd-03-implement`.

- [ ] **Passo 4: Modificar `sdd-04-review`**
  **Ação:** Adicionar a chamada ao guardião como o primeiro passo do processo na skill `sdd-04-review`.

---
