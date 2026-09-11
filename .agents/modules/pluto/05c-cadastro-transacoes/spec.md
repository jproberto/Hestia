# Especificação Técnica — Patch 05c: Modelo de Contas e Cartões (financial_accounts), Modal Exclusivo e Botão no Rodapé do Extrato

**Status:** Em Especificação  
**Item do Backlog:** Feature 5 — Cadastro de transações (Patch 05c)  
**Data:** 2026-07-28  
**Autor:** Agente SDD / Antigravity  

---

## 1. Visão Geral e Objetivos

Este refinamento estende a modelagem conceitual e a interface de lançamentos do projeto Héstia para suportar o conceito de **Agregador de Transações** (`financial_accounts`), englobando especificamente **Contas Correntes** e **Cartões de Crédito**, além de aperfeiçoar o fluxo e a posição dos botões de ação na tela `/pluto/transactions`.

### Principais Definições:
1. **Regra de Governança de Commits:** NENHUM commit (specs, planos ou código) será executado sem a autorização prévia e explícita do parceiro humano.
2. **Modelo de Dados do Agregador de Transações (`public.financial_accounts`):** Substitui a entidade genérica de contas pelo conceito de `financial_accounts`, introduzindo o tipo restrito a `conta` ou `cartao`.
3. **Modal Dedicado de Cadastro de Conta / Cartão:** Formulário focado contendo exclusivamente os campos de Nome e Tipo (`conta` ou `cartao`).
4. **Posicionamento do Botão "+ Nova Transação":** Posicionado exclusivamente na última linha / rodapé do extrato de cada conta ou cartão.

---

## 2. Especificação do Modelo Conceitual de Dados

### Entidade `financial_accounts` (Agregador de Contas e Cartões)
- **Identificador Único (`id`):** Chave primária UUID.
- **Nome (`name`):** Nome descritivo da conta ou cartão (ex: *"Itaú Corrente"*, *"Nubank Cartão"*).
- **Tipo (`type`):** Tipo restrito da fonte de recursos, aceitando exclusivamente um dos valores:
  - `conta` (para Contas Correntes, Bancárias e Carteira)
  - `cartao` (para Cartões de Crédito)
- **Data de Criação (`created_at`):** Data/hora do registro.
- **Criado por (`created_by`):** E-mail do usuário autenticado responsável pelo cadastro.

### Relacionamento com `transactions`
- A tabela de transações passa a referenciar o identificador único da entidade `financial_accounts` (`financial_account_id`).

---

## 3. Requisitos de Interface e UX (`/pluto/transactions`)

### 3.1. Seção "Contas e Cartões"
- **Título da Seção:** `"Contas e Cartões"`.
- **Botão Principal:** `+ Nova Conta / Cartão` no cabeçalho da seção.
- **Layout:** Grid de 2 colunas responsivas (`grid grid-cols-1 md:grid-cols-2 gap-6`).

### 3.2. Modal Dedicado "Nova Conta / Cartão"
- Disparado pelo botão `+ Nova Conta / Cartão`.
- **Campos:**
  1. `Nome`: Campo de texto para digitação do nome (obrigatório).
  2. `Tipo`: Dropdown de seleção exclusiva com duas opções:
     - `Conta` (Mapeado internamente para o tipo `conta`)
     - `Cartão` (Mapeado internamente para o tipo `cartao`)
- **Comportamento:** Cadastra a nova conta/cartão no sistema. Ao salvar, ela passa a ser exibida imediatamente no grid de *Contas e Cartões*, mesmo que ainda não tenha lançamentos registrados no mês.

### 3.3. Rodapé do Extrato de cada Conta / Cartão
- Cada cartão de conta exibe:
  - **Cabeçalho:** Nome da Conta/Cartão, Badge do Tipo (`Conta` ou `Cartão`) e o Saldo do Mês.
  - **Tabela de Lançamentos:** `Data` (`DD/MM/YYYY`), `Descrição` (com badge "Reembolso" se aplicável), `Categoria` e `Valor`.
  - **Última Linha / Rodapé:** Botão **`+ Nova Transação`** que abre o modal de lançamento de transação com a conta/cartão pré-fixada.

---

## 4. Critérios de Aceite

- [ ] A spec está em texto 100% natural, sem blocos de código DDL/SQL ou linguagens de programação.
- [ ] A regra de commit exige aprovação explícita e prévia do usuário em todas as skills.
- [ ] O conceito `financial_accounts` é especificado para suportar tipos de fonte `conta` e `cartao`.
- [ ] O botão `+ Nova Conta / Cartão` abre um modal exclusivo contendo apenas Nome e Tipo (Conta ou Cartão).
- [ ] Novas contas e cartões são listados no grid de 2 colunas mesmo sem transações no mês.
- [ ] O botão `+ Nova Transação` está posicionado na última linha / rodapé da tabela de cada conta.
- [ ] 100% dos testes automatizados passam com sucesso.
