# Spec: Automating GitHub Pull Requests and CI

## 1. Problema
Atualmente, as validações de integridade do código (Linter, Typecheck) são feitas localmente via script `sdd.js`. Não há validações automáticas centralizadas no GitHub ao enviar branches `feature/*`, o que pode acarretar em código quebrado sendo integrado na branch `develop`. Além disso, a abertura de Pull Requests (PRs) de `feature/*` para `develop` é um processo manual repetitivo.

## 2. Decisão Tomada (Abordagem Proposta)
Implementar uma GitHub Action nativa utilizando a CLI oficial do GitHub (`gh`) que realize a validação de integridade em cada push nas branches `feature/*` e automatize a abertura de Pull Requests para `develop`.

### Componentes:
- **`.github/workflows/ci.yml`**: Novo arquivo YAML definindo as regras do workflow do GitHub Actions.
- **`package.json`**: Adição de um script `"test"` dummy (`"echo \"Sem testes configurados ainda\""`) para evitar falhas no pipeline até que testes de unidade reais sejam escritos no projeto.

### Comportamento Esperado da Action:
- Executada no push de branches `feature/*` e em pull requests para `develop` ou `main`.
- Roda os comandos:
  1. `npm run lint` (Linter)
  2. `npx tsc --noEmit` (TypeScript Typecheck)
  3. `npm run build` (Next.js Build)
  4. `npm test` (Testes)
- No sucesso das validações, caso o gatilho seja push em `feature/*`:
  - Utiliza `gh pr list` para verificar se existe um PR aberto da branch atual com destino a `develop`.
  - Se não houver, abre o PR via `gh pr create --base develop --head <branch_name>`.
  - Se já existir, a action termina com sucesso sem duplicar o PR.

## 3. Alternativas Rejeitadas
- **Abordagem B (Actions de terceiros como `peter-evans/create-pull-request`):** Rejeitada por introduzir dependências externas desnecessárias no projeto e ter comportamento complexo de automação de commits que não é o nosso foco (apenas queremos abrir o PR para a branch existente).

## 4. Restrições e Segurança
- O `GITHUB_TOKEN` fornecido no workflow do GitHub Actions deve possuir permissão explícita de `pull-requests: write` e `contents: read`.
- Não deve realizar alterações ou commits na branch dentro do pipeline do GitHub.

## 5. Riscos
- **Falha de permissão no repositório:** Caso as configurações do repositório no GitHub restrinjam a criação de Pull Requests por bots/workflows de Actions. Esse risco é mitigado pela concessão de permissões explícitas de `pull-requests: write` no YAML do workflow.
- **Interrupção em novos testes:** Quando novos testes forem adicionados ao projeto, o script `npm test` precisará ser atualizado no `package.json` para rodar o test runner correspondente (ex. Vitest, Jest).

## 6. Critérios de Aceite
1. O pipeline de CI deve rodar com sucesso em pushes nas branches `feature/*`.
2. O pipeline de CI deve rodar em PRs apontando para `develop` ou `main`.
3. Se um push ocorrer em `feature/qualquer-coisa` e as validações passarem:
   - Se não houver PR aberto para `develop`, um PR deve ser criado no GitHub automaticamente com o título formatado e corpo explicativo.
   - Se já houver um PR aberto para `develop`, o pipeline deve rodar as validações normalmente, mas ignorar a criação do PR de forma limpa.
4. O build, linter, testes e typecheck não devem quebrar no pipeline.
