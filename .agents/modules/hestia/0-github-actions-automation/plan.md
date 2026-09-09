# GitHub Actions Automation Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

Use checkbox (`- [ ]`) para acompanhamento. Marque com o emoji ✅ quando a tarefa estiver concluída.

**Objetivo:** Configurar automação de CI e criação de Pull Requests no GitHub Actions utilizando a CLI nativa do GitHub.

**Arquitetura:** Adição de script de teste dummy no `package.json` e criação do arquivo de workflow YAML `.github/workflows/ci.yml` configurado com Linter, TypeScript, Build, Testes e Script Bash que abre o PR se ele não existir.

**Tech Stack:** GitHub Actions, Node.js, Next.js, ESLint, TypeScript.

## Restrições Globais

- Permissões do token do GitHub Actions restritas a `pull-requests: write` e `contents: read`.
- Não deve commitar alterações de arquivos pela action.
- Execução segura do CLI local `sdd.js` para gerenciar tarefas e commits.

---

### Tarefa 1: Script de Teste no `package.json`

Como o projeto ainda não possui testes de unidade definidos, a execução de `npm test` no pipeline iria falhar caso o script de teste não estivesse no `package.json`.

**Arquivos:**
- Modificar: [package.json](file:///p:/workspace/IA/hestia/package.json)

**Interfaces:**
- Produz: Comando `npm test` retornando sucesso (exit code 0).

- [ ] **Passo 1: Modificar o `package.json`**
  Alterar a seção `"scripts"` do arquivo [package.json](file:///p:/workspace/IA/hestia/package.json) para incluir o comando `"test": "echo \"Sem testes de unidade configurados ainda\""`.
- [ ] **Passo 2: Executar localmente para garantir o sucesso**
  Run: `npm test`
  Expected: Exibe `"Sem testes de unidade configurados ainda"` no terminal e termina com código 0 (sucesso).
- [ ] **Passo 3: Commit Seguro**
  Run: `git add package.json`
  Run: `node .agents/scripts/sdd.js commit "chore: adiciona script de teste dummy no package.json"`

---

### Tarefa 2: Criar e Configurar o Workflow do GitHub Actions

**Arquivos:**
- Criar: `.github/workflows/ci.yml`

**Interfaces:**
- Consome: Script de teste dummy definido na Tarefa 1.
- Produz: Execução de validação automatizada e abertura de PR do GitHub no push.

- [ ] **Passo 1: Criar o arquivo de workflow**
  Criar o arquivo [.github/workflows/ci.yml](file:///p:/workspace/IA/hestia/.github/workflows/ci.yml) com a configuração acordada no design.
- [ ] **Passo 2: Validar o YAML do workflow**
  Validar a sintaxe do YAML e certificar que todos os caminhos estão corretos.
- [ ] **Passo 3: Commit Seguro**
  Run: `git add .github/workflows/ci.yml`
  Run: `node .agents/scripts/sdd.js commit "feat: adiciona workflow de CI e auto pull request no github actions"`
