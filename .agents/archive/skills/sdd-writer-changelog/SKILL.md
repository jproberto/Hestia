---
name: sdd-writer-changelog
description: Use sempre que uma feature relevante, correção complexa ou refatoração for concluída (tipicamente ao final de sdd-04-review), para manter atualizados os arquivos de documentação pública CHANGELOG.md e README.md. Cobre a criação/atualização do registro de alterações e expansão de guias do README.
---

# Mantendo Changelog e README

## Visão Geral

Manter a documentação pública atualizada é um pilar de qualidade. Esta skill serve para documentar de forma clara e estruturada para desenvolvedores humanos o que mudou no projeto a cada release, seguindo as convenções de versionamento semântico (SemVer) e as diretrizes de Keep a Changelog.

**Anuncie no início:** "Estou usando a skill sdd-writer-changelog para atualizar a documentação pública."

## O Processo

### Passo 1: Analisar a Feature e Mudanças
1. Obtenha a versão atual e a nova versão do projeto a partir do `package.json`.
2. Analise o spec da feature (`.agents/specs/...-spec.md` para transversais ou `.agents/<modulo>/specs/...-spec.md` para módulos registrados) e os planos/logs de execução correspondentes.
3. Colete a lista de modificações funcionais, melhorias técnicas, novas variáveis de ambiente e correções.

### Passo 2: Atualizar o CHANGELOG.md
1. Se o arquivo `CHANGELOG.md` não existir na raiz do projeto, crie-o com a seguinte estrutura inicial padrão:
   ```markdown
   # Changelog

   Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

   O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
   e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).
   ```
2. Adicione uma nova seção de release abaixo do cabeçalho principal, no formato:
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD
   ```
   *Substitua `X.Y.Z` pela nova versão do package.json e `YYYY-MM-DD` pela data local atual.*
3. Agrupe as mudanças sob os seguintes cabeçalhos padronizados (omita as seções que não tiverem dados):
   *   `### Adicionado` - para novas funcionalidades.
   *   `### Alterado` - para alterações em funcionalidades existentes.
   *   `### Corrigido` - para quaisquer correções de bugs.
   *   `### Removido` - para recursos que foram retirados.
   *   `### Segurança` - em caso de melhorias ou correções de vulnerabilidades.
4. Mantenha os itens curtos, objectives e escritos em Português.

### Passo 3: Atualizar o README.md
Avalie se as alterações na feature afetam:
1. **Instruções de Inicialização**: Foram adicionados novos comandos de build ou testes (`npm run ...`)?
2. **Configuração de Ambiente**: Foram adicionadas novas chaves ao `.env.local`?
3. **Novas Seções**: O README se beneficiaria de um breve guia de uso da nova área do sistema (ex: Orçamentos, Contas a Pagar)?
4. Aplique as modificações no `README.md` de forma limpa, mantendo o tom objetivo para desenvolvedores.

### Passo 4: Autorrevisão e Commit
Antes de finalizar:
1. Verifique se todos os links internos de arquivos no markdown estão corretos.
2. Certifique-se de que a data da release é a correta.
3. Rode `npm run test` e validadores locais para atestar que nenhuma quebra ocorreu no build.
4. Prepare e crie o commit correspondente da documentação.

## Quando Parar e Pedir Ajuda
- Se houver dúvida se o incremento de versão correto é MINOR ou PATCH.
- Se a feature alterar regras de infraestrutura complexas (ex: mudança de banco de dados, chaves de autenticação do Supabase) que exijam uma seção dedicada de instruções de migração no README.

## Lembre-se
- Escreva sempre em Português.
- O formato do changelog é baseado no *Keep a Changelog*.
- Não crie seções vazias de mudanças (se nada foi removido, não adicione a seção `### Removido`).
- Mantenha a documentação focada no valor prático para o desenvolvedor ou usuário humano.
