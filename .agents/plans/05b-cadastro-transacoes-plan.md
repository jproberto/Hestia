# Plano de Implementação — Patch 05b: Refinamento de Cores, Grid 2 Colunas e Lançamentos por Conta

**Especificação de Origem:** [.agents/specs/05b-cadastro-transacoes-spec.md](file:///p:/workspace/IA/hestia/.agents/specs/05b-cadastro-transacoes-spec.md)  
**Status:** Aguardando Aprovação  

---

## 1. Escopo e Estrutura de Arquivos

### Modificações de Arquivos
- **[MODIFY]** `app/finance/transactions/page.tsx`:
  1. Atualizar paleta de cores e remover `(Orçado vs Real)` nos cabeçalhos de Receitas e Despesas.
  2. Ajustar layout da seção de contas para grid de 2 colunas (`grid grid-cols-1 md:grid-cols-2 gap-6`) sob a denominação **"Contas e Cartões"**.
  3. Adicionar botão **"+ Nova Transação"** em cada cartão de conta (abrindo modal com a conta pré-fixada) e botão **"+ Nova Conta / Cartão"** na barra da seção.
- **[MODIFY]** `__tests__/app/finance/transactions-page.test.tsx`: Atualizar suíte de testes de UI refletindo a abertura do modal por conta pré-fixada e botão de nova conta/cartão.

---

## 2. Tarefas de Implementação

### Tarefa 1: Ajuste nos Cabeçalhos e Cores das Tabelas Orçado vs Real
- **Descrição:** Atualizar as classes Tailwind dos cabeçalhos da área superior para garantir contraste alto (ex: `text-emerald-950` e `text-rose-950`) e remover a expressão `(Orçado vs Real)`.
- **Validação / Testes:** Executar os testes de UI `npm run test __tests__/app/finance/transactions-page.test.tsx`.
- **Commit:** Commit via `node .agents/scripts/sdd.js commit`.

### Tarefa 2: Grid 2 Colunas de "Contas e Cartões" e Botões Contextuais por Conta
- **Descrição:** Ajustar o grid de contas para 2 colunas responsivas, atualizar o título da seção para "Contas e Cartões", adicionar o botão "+ Nova Conta / Cartão" e incluir em cada conta o botão de "+ Nova Transação" que fixa o valor da conta no modal.
- **Validação / Testes:** Executar `npm run test __tests__/app/finance/transactions-page.test.tsx`.
- **Commit:** Commit via `node .agents/scripts/sdd.js commit`.

### Tarefa 3: Validação Completa da Aplicação e Testes Automatizados
- **Descrição:** Rodar a suíte completa de testes, linter e build do compilador TypeScript (`npm run test`, `npx eslint .`, `npx tsc --noEmit`).
- **Validação / Testes:** Validação estática e dinâmica 100% ok.
- **Commit:** Commit via `node .agents/scripts/sdd.js commit`.

---

## 3. Auto-Revisão e Validação do Plano

- [x] O plano adere estritamente à especificação aprovada `05b-cadastro-transacoes-spec.md`.
- [x] Não possui trechos ou blocos de código de implementação.
- [x] Tarefas decompostas e com passos claros de testes e commits.
