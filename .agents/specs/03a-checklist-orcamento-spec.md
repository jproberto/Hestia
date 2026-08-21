# Especificação Funcional — Patch 03a: Cruzamento Checklist x Orçamento por Categoria

## 1. Visão Geral e Problema Real

Ao incluir ou alterar itens no **Checklist de Contas a Pagar / Receber**, o sistema atualmente não valida se os valores previstos cabem dentro do orçamento planejado para aquela categoria no mês em questão.

Por exemplo: o orçamento da categoria "Contas" é de R$ 500, mas o usuário inclui conta de luz (R$ 200), água (R$ 200) e gás (R$ 200), totalizando R$ 600 de compromissos previstos — sem que nenhum alerta ou bloqueio seja acionado.

Este patch especifica a lógica de cruzamento entre o checklist e o orçamento por categoria, diferenciando o comportamento para **itens globais recorrentes** (bloqueio guiado) e **itens pontuais do mês** (aviso informativo não-bloqueante).

> **Nota de Escopo:** Esta mesma lógica de bloqueio guiado será reutilizada futuramente na funcionalidade de Cadastro de Compras Parceladas.

---

## 2. Linguagem Ubíqua e Contexto

- **Item Global:** Item do checklist com `month_id = null` e `is_active = true`. Representa um compromisso financeiro recorrente, que será copiado para todos os meses futuros que forem abertos.
- **Item Pontual:** Item do checklist com `month_id` preenchido, vinculado exclusivamente a um mês específico.
- **Orçamento Vigente:** Valor planejado para uma categoria no mês em questão, calculado a partir da **Vigência Acumulada (Herança)** dos ajustes de orçamento — o valor do ajuste mais recente com `start_month <= mês_atual`.
- **Ajuste do Mês Atual:** Registro de `budget_adjustments` com `start_month` igual ao mês corrente do calendário real (ou `mockMonth` em desenvolvimento). Representa uma revisão orçamentária aberta para edição.
- **Soma Prevista do Checklist por Categoria:** Somatório dos campos `amount` de todos os itens globais ativos (`month_id IS NULL AND is_active = true`) de uma dada categoria que possuam `amount` preenchido.

---

## 3. Regras de Negócio

### 3.1 Gatilho de Verificação

A verificação de cruzamento com o orçamento é executada nos seguintes eventos para **itens globais**:

- Criação de um novo item global com `amount` preenchido.
- Edição de um item global existente que altere o `amount` e/ou a `category_id`.

> A verificação **não é executada** em exclusões de itens globais (não há estouro ao remover).
> A verificação **não é executada** para itens pontuais do mês (ver Regra 3.3).

### 3.2 Cálculo de Estouro (Itens Globais)

Após a operação (criação ou edição), o sistema calcula:

- **Soma Prevista no Checklist:** Total dos `amount` de todos os itens globais ativos da categoria, incluindo o item que está sendo criado/editado.
- **Orçamento Vigente da Categoria:** Valor do item da categoria no ajuste de orçamento vigente para o mês atual.

Se **Soma Prevista > Orçamento Vigente**: configura-se uma situação de **Estouro de Orçamento** e o fluxo bloqueante descrito na Seção 4 é iniciado.

Se **Soma Prevista <= Orçamento Vigente**: a operação é gravada normalmente, sem interrupção.

### 3.3 Itens Pontuais do Mês (Comportamento Não-Bloqueante)

Para itens criados ou editados com escopo **"Apenas neste mês"**, o sistema **não bloqueia** a operação. Em vez disso:

- Após gravar o item, o sistema recalcula a soma total de `amount` dos itens pontuais da categoria naquele mês específico.
- Se o total (pontuais + globais instanciados do mês) exceder o orçamento vigente, exibe um **aviso informativo visual** no card do checklist na tela de lançamentos:
  > ⚠️ *"Atenção: O total previsto para '[Categoria]' neste mês (R$ X) excede o orçamento planejado (R$ Y)."*
- O aviso é exibido de forma persistente no card enquanto a situação de estouro existir, e desaparece automaticamente quando o estouro for resolvido.

---

## 4. Fluxo de Bloqueio Guiado (Itens Globais com Estouro)

### Passo 1 — Modal de Bloqueio

O sistema interrompe a gravação do item global e exibe um modal com:

- **Mensagem de Bloqueio:** *"Não é possível [incluir / alterar] este item pois o total previsto da categoria **[Nome da Categoria]** no checklist (R$ X) ultrapassa o orçamento planejado para o mês (R$ Y)."*
- **Ação Primária:** Botão **"Ajustar Orçamento"** — inicia o fluxo de criação/atualização do ajuste.
- **Ação Secundária:** Botão **"Cancelar"** — cancela a operação inteira do checklist (o item não é salvo).

### Passo 2 — Verificação de Ajuste do Mês Atual

Ao clicar em **"Ajustar Orçamento"**, o sistema verifica se já existe um `budget_adjustment` com `start_month = mês_corrente`:

- **Caso NÃO exista:** O sistema cria automaticamente o registro de Ajuste do Mês Atual (sem necessidade de interação do usuário), com o e-mail do usuário logado, e então avança para o Passo 3.
- **Caso JÁ exista:** O sistema aproveita o ajuste existente e avança diretamente para o Passo 3.

### Passo 3 — Definição do Novo Valor da Categoria

O modal atualiza seu conteúdo mostrando:

- **Informação:** *"Ajuste de [Mês Atual]: defina o novo orçamento para [Nome da Categoria]."*
- **Campo de Valor:** Campo numérico pré-preenchido com o **valor de sugestão calculado** (mínimo necessário para acomodar o checklist, ou seja, a Soma Prevista do Checklist da categoria). O usuário pode editar para um valor maior.
- **Ação Primária:** Botão **"Salvar Ajuste e Incluir Item"**.
- **Ação Secundária:** Botão **"Cancelar"** — cancela a operação inteira (não salva o ajuste nem o item).

### Passo 4 — Gravação e Direcionamento Final

Ao clicar em **"Salvar Ajuste e Incluir Item"**, o sistema:

1. Grava o novo valor da categoria no Ajuste do Mês Atual.
2. Grava o item do checklist global com sucesso.
3. Exibe uma confirmação de sucesso e oferece ao usuário duas opções de navegação:
   - **"Ir para a página de Orçamento"** — navega para `/finance/budget` com o Ajuste do Mês Atual selecionado, permitindo revisar outros valores.
   - **"Continuar no Checklist"** — fecha o modal e permanece na tela de lançamentos.

---

## 5. Interface do Usuário (UI/UX)

- O modal de bloqueio segue o padrão visual dos demais modais do sistema (variáveis CSS do tema: `bg-card`, `text-card-foreground`, `border`, etc.), sem cores estáticas inline.
- O fluxo é composto de **etapas dentro do mesmo modal** (stepper implícito), sem navegações entre páginas até o momento do direcionamento final.
- O aviso informativo (não-bloqueante) de itens pontuais é renderizado como um banner/alerta dentro do card do checklist, usando classes do tema (ex: `text-amber-700 dark:text-amber-400`), sem cores estáticas.
- O campo de valor no Passo 3 deve exibir o valor sugerido selecionado/focado para facilitar a edição imediata.

---

## 6. Critérios de Aceite

1. Ao incluir um item global com `amount` que cause estouro de orçamento em uma categoria, o sistema bloqueia a gravação e exibe o modal descrito no Fluxo de Bloqueio Guiado (Seção 4).
2. Ao editar um item global alterando `amount` ou `category_id` com resultado de estouro, o mesmo modal é exibido.
3. Ao cancelar o modal de bloqueio em qualquer etapa, a operação inteira é desfeita e o item do checklist não é salvo.
4. Se não existir Ajuste do Mês Atual, o sistema cria o registro automaticamente ao aceitar o ajuste.
5. Se o Ajuste do Mês Atual já existir, o sistema reutiliza o registro existente sem criar um duplicado.
6. O campo de novo valor é pré-preenchido com o valor de sugestão calculado, mas editável para um valor maior.
7. Após salvar, o item do checklist é gravado e o sistema exibe o aviso de sucesso com opções de navegação ("Ir para Orçamento" vs "Continuar no Checklist").
8. Para itens pontuais do mês, o sistema grava o item normalmente e exibe apenas o aviso informativo visual no card quando há estouro.
9. O aviso informativo (item pontual) é recalculado e exibido/ocultado automaticamente sempre que a situação de estouro mudar.
10. Todos os testes unitários e de componente passam sem regressões.

---

## 7. Artefatos e Dependências

- **Spec Base:** [03-checklist-contas-spec.md](file:///p:/workspace/IA/hestia/.agents/specs/03-checklist-contas-spec.md)
- **Spec de Orçamento:** [02a-ajuste-orcamento-spec.md](file:///p:/workspace/IA/hestia/.agents/specs/02a-ajuste-orcamento-spec.md)
- **Tabelas Afetadas:** `public.checklist_items`, `public.budget_adjustments`, `public.budget_items`
- **Páginas Afetadas:** `app/finance/transactions/page.tsx`, `components/finance/ChecklistCard.tsx`
- **Funções de Banco Afetadas:** `lib/db/checklist.ts`, `lib/db/budget.ts`
