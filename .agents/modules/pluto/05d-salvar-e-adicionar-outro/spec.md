# Especificação Funcional — Patch 05d: Botão "Salvar e Adicionar Outro" no Cadastro de Transações

## Visão Geral

Este documento especifica o aprimoramento de UX no modal de cadastro de transações da página financeira (`/pluto/transactions`). O objetivo é otimizar o fluxo de entrada em lote para usuários que realizam múltiplos lançamentos em sequência (como preenchimento de faturas de cartão de crédito ou extratos bancários), evitando a necessidade de reabrir o modal a cada novo item.

---

## Requisitos de Negócio e UX

### 1. Novo Botão no Modal de Transação
- O modal de lançamento de transações passa a exibir três ações principais no rodapé:
  1. **Cancelar:** Fecha o modal descartando qualquer alteração pendente.
  2. **Salvar:** Persiste a transação atual no banco de dados, recarrega o extrato e fecha o modal.
  3. **Salvar e Adicionar Outro:** Persiste a transação atual no banco de dados, atualiza a lista de lançamentos em segundo plano e **mantém o modal aberto e limpo** para o próximo lançamento.

---

### 2. Comportamento de Reset e Preservação de Campos
Ao acionar a ação **"Salvar e Adicionar Outro"**:
- **Campos Limpos (Resetados):**
  - **Descrição:** Limpa a string digitada, voltando para o campo vazio.
  - **Valor (R$):** Limpa o valor digitado.
  - **Categoria:** Limpa a categoria selecionada (permanece vazia para forçar nova escolha).
  - **Reembolso (Checkbox):** Reseta para desmarcado (`falso`).
- **Campos Preservados (Para Agilidade de Lançamentos em Sequência):**
  - **Conta / Cartão:** Permanece fixado com a conta/cartão em que o modal foi iniciado.
  - **Data:** Permanece mantida com a última data selecionada pelo usuário (facilitando múltiplos lançamentos na mesma data do extrato/fatura).
  - **Tipo (Despesa / Receita):** Permanece mantido com a última opção selecionada.
- **Foco Automático:**
  - Após a gravação bem-sucedida e reset dos campos, o foco do cursor deve retornar automaticamente para o campo **Descrição**, permitindo a digitação contínua pelo teclado.

---

### 3. Feedback Visual de Sucesso e Estado de Carregamento
- Durante a gravação do item, os botões de ação exibem estado de carregamento desabilitado para prevenir cliques duplos acidentais.
- Ao concluir a gravação de cada item em lote:
  - Uma mensagem amigável ou indicador discreto de sucesso (ex: "Transação salva com sucesso!") é exibido brevemente no topo do modal.
  - O extrato e os totais orçamentários ao fundo da tela são atualizados de forma fluida.

---

## Critérios de Aceite

1. O botão "Salvar e Adicionar Outro" deve estar visível e funcional no modal de transação.
2. Ao clicar em "Salvar e Adicionar Outro", a transação é gravada no banco de dados e aparece imediatamente na listagem da conta.
3. O modal permanece aberto após a gravação.
4. Os campos Descrição, Valor, Categoria e Reembolso voltam ao estado vazio/padrão.
5. Os campos Conta, Data e Tipo conservam seus valores para permitir rápida digitação contínua.
6. Clicar em "Salvar" grava a transação e fecha o modal normalmente.
7. Clicar em "Cancelar" fecha o modal sem gravar alterações.
