# Especificação Técnica — Patch 05b: Refinamento de Cores, Grid de 2 Colunas e Lançamentos por Conta

**Status:** Em Especificação  
**Item do Backlog:** Feature 5 — Cadastro de transações (Patch 05b)  
**Data:** 2026-07-28  
**Autor:** Agente SDD / Antigravity  

---

## 1. Visão Geral e Ajustes Solicitados

Este patch aprimora a ergonomia visual, o contraste de cores e o fluxo de cadastro da tela `/pluto/transactions`, implementando:
1. **Melhoria do Contraste Visual:** Ajuste nos cabeçalhos de Receitas e Despesas para garantirem contraste forte e legibilidade, removendo a expressão `(Orçado vs Real)`.
2. **Grid de 2 Colunas para Contas/Cartões:** Exibição dos blocos de extrato de contas em layout de 2 colunas responsivas (`grid grid-cols-1 md:grid-cols-2`).
3. **Ação Contextual por Conta:** Cada Conta/Cartão terá o seu próprio botão **"+ Nova Transação"**. Ao clicar, o modal abre com a conta pré-fixada e desabilitada para alteração (sem necessidade de digitar/selecionar a conta).
4. **Criação Contextual de Nova Conta/Cartão:** Adição de um botão **"+ Nova Conta / Cartão"** na barra superior de contas, permitindo abrir o modal para o primeiro lançamento de uma nova conta.

---

## 2. Requisitos de Interface e UX

### 2.1. Ajustes Visuais nos Cabeçalhos Superiores
- **Título de Receitas:** `"📈 Receitas"` com fundo verde suave (`bg-emerald-50`) e texto em cor de contraste forte (`text-emerald-950 dark:text-emerald-100`).
- **Título de Despesas:** `"📉 Despesas"` com fundo vermelho suave (`bg-rose-50`) e texto em cor de contraste forte (`text-rose-950 dark:text-rose-100`).
- Removida a string `(Orçado vs Real)` dos títulos.

---

### 2.2. Grid de Contas / Cartões (2 Colunas)
- Os cartões/tabelas de contas são dispostos no container usando grid de 2 colunas:
  `grid grid-cols-1 md:grid-cols-2 gap-6`.
- Cada cartão de conta possui:
  - Cabeçalho com o nome da Conta/Cartão, Ícone, Saldo do Mês e o botão contextual **"+ Nova Transação"**.
  - Tabela com `Data`, `Descrição` (+ badge "Reembolso"), `Categoria` e `Valor`.

---

### 2.3. Fluxo de Lançamento por Conta e Nova Conta
- **Ao clicar em "+ Nova Transação" dentro do bloco de uma conta existente:**
  - O modal abre com o campo **Conta** preenchido com o nome daquela conta e desabilitado (fixo).
- **Ao clicar em "+ Nova Conta / Cartão" (no topo da seção de contas):**
  - O modal abre com o campo **Conta** habilitado e limpo, permitindo que o usuário digite o nome da nova conta a ser criada.

---

## 3. Critérios de Aceite

- [ ] Contraste visual forte e legível nos cabeçalhos de Receitas e Despesas (sem a expressão `(Orçado vs Real)`).
- [ ] Bloco de movimentações por Conta/Cartão exibido em grid responsivo de 2 colunas.
- [ ] Cada cartão de conta possui um botão próprio de "+ Nova Transação" que fixa a conta no modal.
- [ ] Existe o botão de "+ Nova Conta / Cartão" para adicionar novos cartões/contas.
- [ ] 100% dos testes automatizados passam com sucesso.
