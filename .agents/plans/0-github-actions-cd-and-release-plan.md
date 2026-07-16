# GitHub Actions CD & Release Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

Use checkbox (`- [ ]`) para acompanhamento. Marque com o emoji ✅ quando a tarefa estiver concluída.

**Objetivo:** Configurar promoção automática de `develop` para `main` e criação automática de Tags e Releases do GitHub na branch `main`.

**Arquitetura:** Atualização do arquivo YAML `.github/workflows/ci.yml` para conceder permissões de escrita de conteúdo (`contents: write`), adicionar os passos de abertura de PR de `develop` para `main` e criação de Tag/Release ao integrar na `main` baseando-se na versão do `package.json`.

**Tech Stack:** GitHub Actions, GitHub CLI (`gh`), Git, Bash, jq.

## Restrições Globais

- Permissões do token do GitHub Actions configuradas para `pull-requests: write` e `contents: write`.
- Utilizar exclusivamente a ferramenta de versionamento semântico manual no `package.json` para definir novas versões.
- Execução segura do CLI local `sdd.js` para gerenciar tarefas e commits.

---

### Tarefa 1: Atualizar o Workflow do GitHub Actions para CD e Releases

**Arquivos:**
- Modificar: [.github/workflows/ci.yml](file:///p:/workspace/IA/hestia/.github/workflows/ci.yml)

**Interfaces:**
- Consome: Campo `"version"` do arquivo `package.json`.
- Produz: PR automático de develop para main no push da develop; Tag Git e GitHub Release na main no push da main.

- [ ] **Passo 1: Modificar o arquivo `.github/workflows/ci.yml`**
  Alterar as permissões e estender as etapas do workflow no arquivo [.github/workflows/ci.yml](file:///p:/workspace/IA/hestia/.github/workflows/ci.yml) para incluir a nova lógica de CD e Releases:
  ```yaml
  name: CI & Auto Pull Request

  on:
    push:
      branches:
        - 'feature/*'
        - develop
        - main
    pull_request:
      branches:
        - develop
        - main

  permissions:
    pull-requests: write
    contents: write  # Alterado de 'read' para 'write' para permitir push de tags e criação de releases

  jobs:
    validate-and-pr:
      runs-on: ubuntu-latest

      steps:
        - name: Checkout Code
          uses: actions/checkout@v4
          with:
            fetch-depth: 0 # Garante histórico completo para o git tag e ls-remote

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: 'npm'

        - name: Install Dependencies
          run: npm ci

        - name: Run Linter
          run: npm run lint

        - name: Run TypeScript Typecheck
          run: npx tsc --noEmit

        - name: Run Build
          run: npm run build

        - name: Run Tests
          run: npm test

        # Abre o Pull Request se as validações passarem e for um push em branch feature/*
        - name: Auto Create Feature Pull Request
          if: github.event_name == 'push' && startsWith(github.ref, 'refs/heads/feature/')
          env:
            GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          run: |
            BRANCH_NAME="${{ github.ref_name }}"
            echo "Verificando se já existe PR aberto para $BRANCH_NAME..."
            PR_EXISTS=$(gh pr list --head "$BRANCH_NAME" --base develop --state open --json number --jq '.[0].number')
            
            if [ -z "$PR_EXISTS" ]; then
              echo "Nenhum PR aberto encontrado. Criando Pull Request para develop..."
              gh pr create \
                --base develop \
                --head "$BRANCH_NAME" \
                --title "PR Auto: $BRANCH_NAME" \
                --body "Este Pull Request foi criado automaticamente pelo pipeline de CI após a aprovação de todas as validações de linter, tipos, build e testes."
            else
              echo "PR #$PR_EXISTS já está aberto para a branch $BRANCH_NAME."
            fi

        # Abre/Atualiza o PR de develop para main no push da develop
        - name: Auto Create Promotion Pull Request
          if: github.event_name == 'push' && github.ref_name == 'develop'
          env:
            GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          run: |
            echo "Verificando se já existe PR aberto de develop para main..."
            PR_EXISTS=$(gh pr list --head develop --base main --state open --json number --jq '.[0].number')
            
            if [ -z "$PR_EXISTS" ]; then
              echo "Criando Pull Request de promoção (develop -> main)..."
              gh pr create \
                --base main \
                --head develop \
                --title "Release: develop -> main" \
                --body "Este Pull Request foi criado automaticamente pelo pipeline de CI para promover as alterações de develop para a main (Produção)."
            else
              echo "PR #$PR_EXISTS de develop para main já está aberto."
            fi

        # Cria a Tag Git e a GitHub Release no push da main (merge de release)
        - name: Create Tag and GitHub Release
          if: github.event_name == 'push' && github.ref_name == 'main'
          env:
            GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          run: |
            VERSION=$(jq -r '.version' package.json)
            TAG="v$VERSION"
            echo "Versão identificada no package.json: $VERSION"
            
            echo "Verificando se a tag $TAG já existe no repositório..."
            TAG_EXISTS=$(git ls-remote --tags origin refs/tags/$TAG)
            
            if [ -z "$TAG_EXISTS" ]; then
              echo "A tag $TAG não existe. Configurando Git..."
              git config user.name "github-actions[bot]"
              git config user.email "github-actions[bot]@users.noreply.github.com"
              
              echo "Criando tag local $TAG..."
              git tag "$TAG"
              
              echo "Empurrando tag $TAG para a origin..."
              git push origin "$TAG"
              
              echo "Criando Release no GitHub..."
              gh release create "$TAG" --generate-notes
            else
              echo "A tag $TAG já existe no repositório. Nenhuma nova release será gerada."
            fi
  ```
- [ ] **Passo 2: Validar a sintaxe do YAML**
  Revisar visualmente a indentação e os blocos de lógica do arquivo modificado.
- [ ] **Passo 3: Commit Seguro**
  Run: `git add .github/workflows/ci.yml`
  Run: `node .agents/scripts/sdd.js commit "feat: adiciona automacao de CD e Releases no github actions"`
