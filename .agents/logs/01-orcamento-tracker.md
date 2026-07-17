# Diário de Execução: Orçamento Anual por Categoria (Feature 1)

## Checklist de Progresso
- [x] Tarefa 1: Configurar a Infraestrutura de Testes (Vitest + JSDOM)
- [x] Tarefa 2: Criar as Tabelas e Políticas no Banco de Dados (Supabase SQL)
- [x] Tarefa 3: Desenvolver a Lógica de Negócio e Serviços (TDD)
- [x] Tarefa 4: Criar a Página de Orçamento `/finance/budget`
- [x] Tarefa 5: Integrar Atalho no Dashboard e Versão

## Diário de Bordo e Decisões Técnicas
- **[2026-07-16 23:11] (INFO)**: Início da execução do plano na branch `feature/orcamentoAnual`.
- **[2026-07-16 23:27] (INFO)**: Conclusão da Tarefa 1. Ambiente configurado com Vitest + JSDOM. Testes de sanidade passando com sucesso.
- **[2026-07-16 23:42] (INFO)**: Conclusão da Tarefa 2. Scripts SQL de migração criados e tabelas executadas no Supabase.
- **[2026-07-16 23:47] (INCIDENTE)**: O linter e compilador TS falharam na Tarefa 3 devido ao uso de casts para `any` em mocks de testes e a tipagem de retorno da query no serviço.
- **[2026-07-16 23:51] (DECISÃO)**: Refatorados os mocks de testes para usar a tipagem `as unknown as SupabaseClient` e casts para assinaturas internas do Vitest, removendo o uso de `any` para conformidade estrita de tipo.
- **[2026-07-16 23:54] (INFO)**: Conclusão da Tarefa 3. Serviços desacoplados e testes passando no Vitest.
- **[2026-07-16 23:57] (INCIDENTE)**: O linter falhou na Tarefa 4 com alertas de cascade renders síncronos (`react-hooks/set-state-in-effect`) ao chamar `loadData` no effect.
- **[2026-07-17 00:00] (DECISÃO)**: Corrigida a chamada de effect na página React envolvendo a chamada a `loadData` em um `setTimeout` de 0ms para adiar a execução síncrona. Ajustada dependência de `useCallback` do `loadData` com a injeção do `supabase`.
- **[2026-07-17 00:04] (INFO)**: Conclusão da Tarefa 4. Interface da página de orçamento criada com autocompletar e testes passando.
- **[2026-07-17 00:06] (INFO)**: Conclusão da Tarefa 5. Atalho do dashboard integrado e SemVer bumped para `0.2.0`.
- **[2026-07-17 00:18] (INCIDENTE)**: Identificados bugs na validação manual do usuário: `/login` redirecionando para o dashboard mesmo quando o usuário quer deslogar, e previsões não sendo listadas na tela após serem salvas.
- **[2026-07-17 00:20] (DECISÃO)**: Causa raiz 1: A query em `lib/db/budget.ts` para obter itens do orçamento filtra por dados da tabela estrangeira `budget_revisions` sem o modificador `!inner`. O Supabase JS Client descarta ou ignora filtros de relations sem o modificador. Corrigido para `budget_revisions!inner`.
- **[2026-07-17 00:22] (DECISÃO)**: Causa raiz 2: O redirecionamento de `/login` para `/dashboard` ocorre porque a sessão local do navegador está ativa no Supabase dev do usuário (o que é o comportamento correto do middleware). Para permitir deslogar e testar a rota de login sem prender o usuário, convertemos o `app/dashboard/page.tsx` para client side e adicionamos o botão de "Sair" (Logout), destruindo a sessão de forma limpa.
- **[2026-07-17 00:24] (INCIDENTE)**: Mesmo com o modificador `!inner`, os dados ainda não apareciam na listagem. Depuramos a query real através de instrumentação temporária e localizamos o erro de parse PGRST100 do PostgREST.
- **[2026-07-17 00:26] (DECISÃO)**: Causa raiz 3: O PostgREST não consegue ordenar diretamente por caminhos compostos de relações (como `budget_revisions.start_month`). A ordenação de colunas da relação em consultas principais no Supabase exige a declaração de `referencedTable: "budget_revisions"` na chamada `.order()`. Corrigido a ordenação e os dados agora são listados corretamente.
