# Plano de Implementação — Patch 05c: Modelo financial_accounts, Modal de Conta/Cartão e Rodapé de Transações

**Especificação de Origem:** [.agents/specs/05c-cadastro-transacoes-spec.md](file:///p:/workspace/IA/hestia/.agents/specs/05c-cadastro-transacoes-spec.md)  
**Status:** Aguardando Aprovação  

---

## 1. Escopo e Estrutura de Arquivos

### Arquivos a Criar e Modificar
- **[NEW]** `utils/migrations/migration-feature-5c-financial-accounts.sql`: Script DDL SQL para criação da tabela `public.financial_accounts` com suporte aos tipos `'conta'` e `'cartao'`, política RLS e auditoria em `schema_migrations`.
- **[MODIFY]** `lib/db/accounts.ts`: Atualizar módulo de banco para gerenciar a entidade `financial_accounts` com criação/busca por Nome e Tipo (`conta` | `cartao`).
- **[MODIFY]** `app/finance/transactions/page.tsx`:
  1. Implementar o modal dedicado "Nova Conta / Cartão" (com apenas Nome e seleção de Tipo `Conta` ou `Cartão`).
  2. Ajustar a listagem de contas no grid para exibir todas as contas cadastradas (mesmo sem lançamentos no mês).
  3. Mover o botão `+ Nova Transação` exclusivamente para o rodapé / última linha do cartão de cada conta.
- **[MODIFY]** `__tests__/lib/db/accounts.test.ts`: Atualizar os testes unitários da camada de dados de contas.
- **[MODIFY]** `__tests__/app/finance/transactions-page.test.tsx`: Atualizar a suíte de testes de UI refletindo a criação de conta no modal dedicado e o novo posicionamento do botão de transação no rodapé.

---

## 2. Tarefas de Implementação

### Tarefa 1: Script DDL de Migração SQL (`migration-feature-5c-financial-accounts.sql`)
- **Descrição:** Criar a tabela `public.financial_accounts` com restrição aos tipos `'conta'` e `'cartao'`, adicionar a foreign key em `public.transactions`, configurar RLS e registrar na auditoria `schema_migrations`.
- **Validação / Testes:** Executar verificação sintática e aplicar migração no Supabase local/remoto.
- **Commit:** Commit via `node .agents/scripts/sdd.js commit` após autorização.

### Tarefa 2: Atualização da Abstração de Banco (`lib/db/accounts.ts`) e Testes Unitários
- **Descrição:** Atualizar a interface `Account` para incluir o campo `type: 'conta' | 'cartao'` e adequar as funções de busca/criação `getAccounts` e `getOrCreateAccount`.
- **Validação / Testes:** Rodar os testes unitários `npm run test __tests__/lib/db/accounts.test.ts`.
- **Commit:** Commit via `node .agents/scripts/sdd.js commit` após autorização.

### Tarefa 3: Modal Dedicado de Conta/Cartão e Botão no Rodapé do Extrato em `page.tsx`
- **Descrição:** Adicionar o modal dedicado para cadastro de Conta/Cartão, garantir que contas sem lançamentos sejam exibidas no grid de 2 colunas, e posicionar o botão `+ Nova Transação` no rodapé da tabela de cada conta.
- **Validação / Testes:** Rodar testes de UI `npm run test __tests__/app/finance/transactions-page.test.tsx`.
- **Commit:** Commit via `node .agents/scripts/sdd.js commit` após autorização.

### Tarefa 4: Validação Estática e Suíte Completa de Testes
- **Descrição:** Executar `npm run test`, `npx eslint .` e `npx tsc --noEmit` para garantir 100% de aprovação e zero regressões em todo o repositório.
- **Validação / Testes:** Suíte de testes 100% verde.
- **Commit:** Commit via `node .agents/scripts/sdd.js commit` após autorização.

---

## 3. Auto-Revisão e Validação do Plano

- [x] O plano adere estritamente à especificação aprovada `05c-cadastro-transacoes-spec.md`.
- [x] Não possui blocos de código de implementação.
- [x] Tarefas decompostas e com passos claros de testes e commits mediante aprovação prévia.
