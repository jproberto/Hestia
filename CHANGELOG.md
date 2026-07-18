# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-07-17

### Adicionado
- Criada a tabela de controle de migrações SQL `public.schema_migrations` no Supabase com suporte a RLS e registro retroativo automatizado.
- Criada a nova skill `sdd-tool-db-migration` para gerenciar migrações de banco no diretório `utils/migrations/`.
- Adicionada a badge visual "Histórico (Substituído)" na interface de orçamento para melhor feedback do usuário ao visualizar ajustes antigos e inativos.

### Modificado
- Refatoração completa da nomenclatura de banco físico de `budget_revisions` para `budget_adjustments` e de `revision_id` para `adjustment_id` na tabela `budget_items`, para aderir fielmente à linguagem ubíqua ("Ajustes").
- Ajustado o botão "Criar Novo Ajuste" para seguir o padrão visual de estilo do projeto.
- Movidas todas as migrações SQL do repositório para a pasta oficial `utils/migrations/`.

### Corrigido
- Corrigido bug de ordenação em `getBudgets` que mascarava a atualização de valores inline exibindo dados de Janeiro mesmo após salvar o Ajuste de Agosto. Resolvido com ordenação decrescente explícita no JavaScript.
- Resolvida concorrência de salvamento duplo inline (Enter + Blur) disparando a ação unicamente pelo `onBlur` via `blur()` do input.
- Removido o estado de loading de tela cheia em atualizações em lote (silent refresh no `loadData`) para evitar piscadas visuais ao salvar itens.
- Removida a trava de ambiente (`NODE_ENV`) para o parâmetro `mockMonth`, permitindo testes em qualquer perfil de build local.

## [0.3.0] - 2026-07-17

### Adicionado
- Nova funcionalidade de **Ajuste de orçamento ao longo do ano** (Feature 2).
- Navegação e visualização mensal de metas financeiras através de um seletor de Mês (dropdown compacto) ao lado do seletor de Ano.
- Edição inline direta nas células de valores orçados na tabela, com salvamento automático nos eventos de `onBlur` ou ao pressionar `Enter` com prevenção de recarregamentos indesejados.
- Regra de "Mês Aberto": bloqueio de edições em meses anteriores ao mês ativo (tornando as previsões somente-leitura) e liberação nos meses vigentes/futuros.
- Suporte à testabilidade do mês ativo em desenvolvimento e testes utilizando o query parameter `?mockMonth=M` (lido via hook `useSearchParams` do Next.js).
- Ocultação na tabela de categorias que tenham valor previsto igual a 0 a partir do mês em questão.
- Nova skill `sdd-writer-changelog` para automatizar a manutenção de CHANGELOG e README.
- Regra rígida Anti-Tentativa-e-Erro nas skills de depuração e execução de tarefas.
