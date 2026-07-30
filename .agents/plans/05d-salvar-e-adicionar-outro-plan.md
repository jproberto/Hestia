# Plano de Implementação — Patch 05d: Botão "Salvar e Adicionar Outro" no Cadastro de Transações

## Visão Geral

Este plano descreve as etapas técnicas para implementar a funcionalidade de gravação em lote no modal de transação (`/finance/transactions`), permitindo ao usuário clicar em "Salvar e Adicionar Outro" para persisir a transação atual, atualizar a lista em segundo plano e manter o modal aberto com os campos de `Descrição`, `Valor`, `Categoria` e `Reembolso` limpos, preservando a `Conta`, `Data` e `Tipo`, e direcionando o foco automaticamente para o campo `Descrição`.

---

## Estrutura de Arquivos

- **Visualização / Interface:**
  - [app/finance/transactions/page.tsx](file:///p:/workspace/IA/hestia/app/finance/transactions/page.tsx) — Adicionar estado de feedback visual, referência do input de descrição (`descInputRef`), manipulador de envio em lote e renderização do botão "Salvar e Adicionar Outro".
- **Testes Automatizados:**
  - [__tests__/app/finance/transactions-page.test.tsx](file:///p:/workspace/IA/hestia/__tests__/app/finance/transactions-page.test.tsx) — Teste de UI cobrindo a presença do botão "Salvar e Adicionar Outro" no modal.

---

## Tarefas de Implementação

### Tarefa 1: Lógica do Formulário e Reset de Campos em `page.tsx`
- **Descrição:** Criar a referência React `descInputRef`, o estado `successMsg`, a função de suporte para reset parcial (`resetFormForAnotherTransaction`) mantendo `accountInput`, `accountTypeInput`, `date` e `type`, e a função de submissão `handleSaveTransactionAndAddAnother`.
- **Passos:**
  1. Adicionar `const descInputRef = useRef<HTMLInputElement>(null);`.
  2. Adicionar estado `const [successMsg, setSuccessMsg] = useState<string | null>(null);`.
  3. Criar a lógica que após a chamada de `createTransaction`:
     - Dispara `fetchData()`.
     - Exibe "Transação salva com sucesso!" no estado `successMsg`.
     - Limpa `description`, `amount`, `categoryInput` e `isRefund`.
     - Dispara `descInputRef.current?.focus()`.
- **Verificação:** Compilação TypeScript sem erros.

---

### Tarefa 2: Renderização do Botão e Feedback no Modal em `page.tsx`
- **Descrição:** Adicionar o botão "Salvar e Adicionar Outro" no rodapé do modal e exibir a mensagem de confirmação no topo do formulário.
- **Passos:**
  1. No rodapé do modal `isTxModalOpen`, incluir o botão secundário `<Button type="button" variant="secondary" onClick={handleSaveTransactionAndAddAnother} disabled={savingTx}>Salvar e Adicionar Outro</Button>`.
  2. Exibir o alerta visual de sucesso quando `successMsg` estiver preenchido.
  3. Vincular `ref={descInputRef}` ao `<Input id="tx-description" ... />`.
- **Verificação:** Visualização da interface e testes estáticos.

---

### Tarefa 3: Atualização da Suíte de Testes de UI em `transactions-page.test.tsx`
- **Descrição:** Adicionar asserção em `__tests__/app/finance/transactions-page.test.tsx` validando que ao abrir o modal de transação o botão "Salvar e Adicionar Outro" está presente e acessível.
- **Passos:**
  1. Atualizar o teste do modal de transação verificando `expect(screen.getByRole("button", { name: /Salvar e Adicionar Outro/i })).toBeInTheDocument();`.
- **Verificação:** Executar os testes automatizados do Vitest.

---

### Tarefa 4: Validação de Qualidade e Guardian
- **Descrição:** Executar o script do Guardian e os validadores estáticos do projeto.
- **Comandos:**
  - `npm run test`
  - `npx eslint .`
  - `npx tsc --noEmit`
- **Saída Esperada:** 100% dos testes e verificações estáticas verdes.

---

## Handoff e Próximos Passos

Após a aprovação deste plano de implementação pelo parceiro humano, o agente iniciará o Guardian via `node .agents/scripts/sdd.js start 05d-salvar-e-adicionar-outro-plan` e executará o ciclo de tarefas em `sdd-03-implement`.
