# Diário de Execução: Ajuste de Orçamento (Feature 2a - Correção/Patch)

## Checklist de Progresso
<!-- TABLE_START -->
| ID | Tarefa | Status |
|---|---|---|
| 1 | Refatoração da Camada de Serviços (lib/db/budget.ts) e Testes Unitários | - [x] Concluída |
| 2 | Refatoração da UI (app/finance/budget/page.tsx) e Regras de Editabilidade | - [ ] Pendente |
| 3 | Testes de UI Automatizados e Incremento de Versão (Patch) | - [ ] Pendente |
<!-- TABLE_END -->

## Diário de Bordo e Decisões Técnicas
<!-- EVENTS -->
- **[2026-07-17 18:26:00] (INFO)**: Tarefa 1 concluída. Criados os helpers `getBudgetAdjustments` e `createBudgetAdjustment` e atualizada a assinatura de `adjustBudgetItem`. Refatoração estruturada de nomenclatura para "adjustments" aplicada nas variáveis locais de serviços para respeitar a linguagem ubíqua sem quebrar a persistência física. Testes de unidade do Vitest atualizados e passando (5/5).
- **[2026-07-17 18:03:00] (INFO)**: Plano de implementação estruturado e checklist sincronizada. Pronto para iniciar execução.
- **[2026-07-17 17:57:00] (INFO)**: Início da especificação do Patch 2a na branch `feature/ajuste-orcamento`. Nova especificação gerada em `.agents/specs/02a-ajuste-orcamento-spec.md`.
- **[2026-07-17 17:57:30] (DECISÃO)**: Adotada a linguagem ubíqua baseada em "Orçamentos" e "Ajustes". Permitida a refatoração opcional da nomenclatura das tabelas físicas do banco do Supabase (`budget_revisions` para `budget_adjustments`) e chaves.
- **[2026-07-17 17:57:45] (UX/UI)**: Removidas as badges de status Aberto/Fechado. A editabilidade será implícita com base no botão proeminente "Criar Novo Ajuste" e a interatividade das células.
- **[2026-07-17 18:21:27] (INFO)**: Tarefa 1 iniciada.
- **[2026-07-17 18:22:56] (INFO)**: Tarefa 1 concluída com sucesso.
