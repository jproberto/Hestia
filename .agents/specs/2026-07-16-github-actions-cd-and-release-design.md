# Spec: GitHub Actions CD and Release Automation (Subproject 2)

## 1. Problema
Atualmente, após a conclusão e merge de uma funcionalidade em `develop`, a promoção do código para `main` (produção) exige a abertura manual de um Pull Request. Além disso, o versionamento do projeto e a criação de tags/releases no GitHub ao realizar o merge em `main` são processos manuais, o que acarreta na falta de rastreabilidade das versões publicadas do Héstia.

## 2. Decisão Tomada (Abordagem Proposta)
Estender o workflow do GitHub Actions para automatizar a promoção do código de `develop` para `main` e gerenciar a criação de tags e releases a partir do versionamento definido no `package.json`.

### Componentes:
- **`.github/workflows/ci.yml`**: Atualização do arquivo YAML para adicionar jobs adicionais de automação sob os gatilhos das branches `develop` e `main`.

### Comportamento Esperado:
1. **Ao ocorrer um `push` na branch `develop` (merge de features):**
   - Roda as validações de CI (Linter, TypeScript, Build, Testes).
   - Se passar, verifica se existe um PR aberto da branch `develop` direcionado para `main`.
   - Caso não exista, abre o PR automaticamente utilizando a CLI do GitHub (`gh pr create --base main --head develop`).
   - Caso já exista, o workflow encerra com sucesso sem duplicar o PR.

2. **Ao ocorrer um `push` na branch `main` (merge da release):**
   - Roda as validações de CI.
   - Se passar, lê a versão atual do projeto a partir do arquivo `package.json` (campo `"version"`).
   - Verifica se a tag correspondente (ex: `v0.1.0`) já existe no GitHub.
   - Caso não exista:
     - Cria a tag git localmente e faz o push para o repositório.
     - Cria uma nova Release oficial no GitHub vinculada a essa tag, utilizando o gerador automático de notas do GitHub CLI (`gh release create v<versão> --generate-notes`).
   - Caso a tag já exista, o workflow exibe um aviso e encerra sem falhar (evitando quebrar a esteira de CI caso ocorra um re-push acidental na main).

## 3. Alternativas Rejeitadas
- **Git Flow com branches `release/*` intermediárias:** Rejeitado por adicionar burocracia excessiva e passos de merges reversos desnecessários para o escopo e tamanho do time de desenvolvimento do Héstia, preferindo manter `develop` como Staging fixo e `main` como Produção fixa (GitHub Flow simplificado).

## 4. Restrições e Segurança
- O `GITHUB_TOKEN` do workflow de Actions precisa de permissão de escrita para conteúdos (`contents: write`) para que possa criar e empurrar tags e gerar as releases, além de `pull-requests: write`.
- Não deve expor nenhuma chave ou token pessoal (PAT) no repositório, utilizando exclusivamente o `secrets.GITHUB_TOKEN`.

## 5. Riscos
- **Conflito de Tags:** Se a versão no `package.json` não for atualizada no PR de release antes do merge em `main`, o pipeline tentará criar uma tag que já existe. Isso é mitigado na implementação adicionando uma verificação que ignora a criação caso a tag já esteja registrada no repositório.

## 6. Critérios de Aceite
1. O push na branch `develop` deve rodar as validações de CI com sucesso.
2. O push na branch `develop` deve abrir automaticamente um PR de `develop` para `main` (se não houver um aberto).
3. O merge do PR de `develop` para `main` (push na `main`) deve rodar as validações de CI.
4. O push na branch `main` deve gerar automaticamente uma Tag Git correspondente à versão no `package.json` (ex: `v0.1.0`) e criar uma Release no GitHub com notas geradas automaticamente, caso a tag não exista.
