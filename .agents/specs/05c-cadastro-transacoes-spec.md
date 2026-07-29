# Especificação Técnica — Patch 05c: Modal Exclusivo de Conta/Cartão e Botão na Última Linha do Extrato

**Status:** Em Especificação  
**Item do Backlog:** Feature 5 — Cadastro de transações (Patch 05c)  
**Data:** 2026-07-28  
**Autor:** Agente SDD / Antigravity  

---

## 1. Visão Geral e Ajustes Solicitados

Este refinamento aprimora os fluxos de cadastro e a ergonomia de visualização dos extratos na página `/finance/transactions`:
1. **Modal Exclusivo "Nova Conta / Cartão":** O botão `+ Nova Conta / Cartão` abre um modal simples e direto contendo apenas:
   - Nome da Conta/Cartão (ex: *"Itaú Corrente"*, *"Cartão Nubank"*).
   - Tipo de Conta (Seleção: *"Conta Corrente"*, *"Cartão de Crédito"*, *"Carteira / Dinheiro"*, *"Poupança / Reserva"*).
   - Ao salvar, a nova conta é criada no banco (`public.accounts`) e passa a aparecer imediatamente no grid de "Contas e Cartões".
2. **Posição do Botão "+ Nova Transação":** O botão `+ Nova Transação` é removido do cabeçalho de cada cartão de conta e colocado no rodapé / última linha do grid daquela conta específica.

---

## 2. Requisitos de Interface e UX

### 2.1. Modal Exclusivo de Cadastro de Conta / Cartão
- **Disparo:** Acionado ao clicar no botão `+ Nova Conta / Cartão` no cabeçalho da seção *Contas e Cartões*.
- **Campos do Formulário:**
  1. `Nome`: Campo de texto para o nome da conta (obrigatório).
  2. `Tipo`: Dropdown de escolha entre:
     - `Conta Corrente`
     - `Cartão de Crédito`
     - `Carteira / Dinheiro`
     - `Poupança / Reserva`
- **Ação:** Salva a conta na tabela `public.accounts` e atualiza a interface sem exigir um lançamento imediato.

---

### 2.2. Posicionamento do Botão no Rodapé do Extrato de cada Conta
- **Visual:** O cabeçalho de cada cartão de conta exibe apenas o ícone, o Nome da Conta e o Saldo do Mês.
- **Rodapé / Última Linha:** Ao final da tabela de transações daquela conta, exibe uma linha de rodapé com o botão em destaque:  
  **`+ Nova Transação`** (ou `+ Adicionar Lançamento nesta Conta`).
- **Comportamento:** Ao clicar, abre o modal de lançamento de transação com o campo **Conta / Cartão** pré-fixado para aquela conta.

---

## 3. Critérios de Aceite

- [ ] O botão `+ Nova Conta / Cartão` abre um modal dedicado com apenas Nome e Tipo de Conta.
- [ ] A conta criada pelo modal é salva no Supabase e listada na tela mesmo sem lançamentos.
- [ ] O cabeçalho dos cartões de conta não possui o botão de nova transação.
- [ ] A última linha / rodapé da tabela de cada conta possui o botão `+ Nova Transação` para aquela conta.
- [ ] 100% dos testes automatizados passam sem erros.
