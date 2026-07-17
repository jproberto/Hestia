# Diário de Execução: 02-ajuste-orcamento

## Checklist de Progresso
<!-- TABLE_START -->
| ID | Tarefa | Status |
|---|---|---|
| 1 | Desenvolver e Testar a Lógica do Serviço de Ajustes no Banco de Dados | - [x] Concluída |
| 2 | Atualizar a Interface do Orçamento e Incremento de Versão | - [x] Concluída |
<!-- TABLE_END -->

## Diário de Bordo e Decisões Técnicas
<!-- EVENTS -->
- **[2026-07-17 11:28:20] (INFO)**: Início da execução do plano '02-ajuste-orcamento'
- **[2026-07-17 11:28:25] (INFO)**: Tarefa 1 iniciada.
- **[2026-07-17 11:31:34] (INFO)**: Conclusão do Serviço `adjustBudgetItem` em `lib/db/budget.ts`. Decidimos que a persistência criará a revisão orçamentária para o mês correspondente (`start_month = month`) sob demanda caso ela não exista, mantendo a herança das revisões de meses anteriores e o isolamento de histórico.
- **[2026-07-17 11:33:34] (INFO)**: Tarefa 2 iniciada.
- **[2026-07-17 15:35:10] (REFATORAÇÃO)**: Refatorada a leitura do parâmetro `mockMonth` na UI (`app/finance/budget/page.tsx`). Removido o hack global `window.location.search` para utilizar o hook `useSearchParams` do Next.js, mantendo a compatibilidade com a compilação do Next.js.
- **[2026-07-17 15:40:22] (INCIDENTE)**: A suíte de testes de UI do Vitest falhou em simular a renderização de reatividade assíncrona após eventos de dropdown no JSDOM devido ao timeout de microtasks e instabilidade do `MutationObserver` no JSDOM.
- **[2026-07-17 15:47:20] (DECISÃO/TESTE)**: Substituído o uso de `screen.findByText("Alimentação")` por `waitFor(() => { expect(screen.getByText("Alimentação")).toBeInTheDocument(); })` no arquivo de testes de UI para forçar verificações resilientes a cada ciclo de render do JSDOM, resolvendo o timeout de testes de UI.
- **[2026-07-17 16:29:10] (INCIDENTE)**: Nos testes funcionais manuais, o navegador disparava um refresh total (recarregamento) da página ao pressionar `Enter` na célula de edição de valores, cancelando a requisição assíncrona HTTP em andamento do Supabase e revertendo o valor exibido na tela.
- **[2026-07-17 16:29:20] (RESOLUÇÃO)**: Corrigido o evento de colisão do Enter e do Blur no input inline adicionando `e.preventDefault()` e `e.stopPropagation()` no manipulador de tecla `onKeyDown` do input, evitando qualquer recarregamento da página e garantindo a persistência imediata do dado.
- **[2026-07-17 16:30:10] (DESIGN/UI)**: Implementadas etiquetas (badges) de status "Aberto" (verde) e "Fechado" (vermelho) ao lado do título da listagem de orçamentos, oferecendo um sinalizador visual altamente premium e eliminando os parágrafos de texto antigos.
- **[2026-07-17 16:51:30] (PROCESSO/SDD)**: Criada a nova etapa sequencial de QA `sdd-05-manual-test` para centralizar roteiros de homologação manual, e integrada a skill `sdd-writer-changelog` no fluxo da revisão estática (`sdd-04-review`).
- **[2026-07-17 16:54:30] (QA/Smoke Tests)**: Re-desenhada a política de documentação de testes para reservar o arquivo global `references/manual_tests.md` estritamente a Smoke Tests rápidos, mantendo os roteiros de homologação de novas features encapsulados no próprio Plano de Implementação da feature correspondente.
- **[2026-07-17 16:34:02] (INFO)**: Tarefa 2 concluída com sucesso.
