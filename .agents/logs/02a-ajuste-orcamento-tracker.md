# Diário de Execução: Ajuste de Orçamento (Feature 2a - Correção/Patch)

## Checklist de Progresso
<!-- TABLE_START -->
| ID | Tarefa | Status |
|---|---|---|
| 1 | Refatoração da Camada de Serviços (lib/db/budget.ts) e Testes Unitários | - [x] Concluída |
| 2 | Refatoração da UI (app/finance/budget/page.tsx) e Regras de Editabilidade | - [x] Concluída |
| 3 | Testes de UI Automatizados e Incremento de Versão (Patch) | - [x] Concluída |
| 4 | Refatoração Física das Tabelas do Supabase no Código Next.js | - [ ] Pendente |
<!-- TABLE_END -->

## Diário de Bordo e Decisões Técnicas
<!-- EVENTS -->
- **[2026-07-17 19:48:00] (DECISÃO)**: Adicionado o escopo de refatoração física das tabelas do Supabase. Gerado o script de migração `migration-feature-2a-nomenclatura.sql` para renomeação de tabelas e chaves de `revisions` para `adjustments`. Plano e diário atualizados com a nova Tarefa 4.
- **[2026-07-17 18:39:00] (INFO)**: Tarefa 3 concluída. Reescritos os testes de UI em `budget-page.test.tsx` para focar nas regras de vigência e interações de Ajustes. Incrementada a versão do projeto para `0.3.1` (Patch). Suíte de testes local e validação estática passando perfeitamente.
- **[2026-07-17 18:35:00] (INFO)**: Tarefa 2 concluída. Refatorada a interface gráfica para expor a navegação baseada em Ajustes cadastrados e o botão "Criar Novo Ajuste" quando somente-leitura. Implementada a regra de bloqueio se start_month !== openMonth. Corrigido incidente de hoisting no hook de estado `revision` pego pelo ESLint.
- **[2026-07-17 18:26:00] (INFO)**: Tarefa 1 concluída. Criados os helpers `getBudgetAdjustments` e `createBudgetAdjustment` e atualizada a assinatura de `adjustBudgetItem`. Refatoração estruturada de nomenclatura para "adjustments" aplicada nas variáveis locais de serviços para respeitar a linguagem ubíqua sem quebrar a persistência física. Testes de unidade do Vitest atualizados e passando (5/5).
- **[2026-07-17 18:03:00] (INFO)**: Plano de implementação estruturado e checklist sincronizada. Pronto para iniciar execução.
- **[2026-07-17 17:57:00] (INFO)**: Início da especificação do Patch 2a na branch `feature/ajuste-orcamento`. Nova especificação gerada em `.agents/specs/02a-ajuste-orcamento-spec.md`.
- **[2026-07-17 17:57:30] (DECISÃO)**: Adotada a linguagem ubíqua baseada em "Orçamentos" e "Ajustes". Permitida a refatoração opcional da nomenclatura das tabelas físicas do banco do Supabase (`budget_revisions` para `budget_adjustments`) e chaves.
- **[2026-07-17 17:57:45] (UX/UI)**: Removidas as badges de status Aberto/Fechado. A editabilidade será implícita com base no botão proeminente "Criar Novo Ajuste" e a interatividade das células.
- **[2026-07-17 18:21:27] (INFO)**: Tarefa 1 iniciada.
- **[2026-07-17 18:22:56] (INFO)**: Tarefa 1 concluída com sucesso.
- **[2026-07-17 18:33:11] (INFO)**: Tarefa 2 iniciada.
- **[2026-07-17 18:35:10] (INFO)**: Tarefa 2 concluída com sucesso.
- **[2026-07-17 18:37:35] (INFO)**: Tarefa 3 iniciada.
- **[2026-07-17 18:39:04] (INFO)**: Tarefa 3 concluída com sucesso.
