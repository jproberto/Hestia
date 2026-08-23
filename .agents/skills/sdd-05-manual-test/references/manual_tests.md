# Cenários de Testes Funcionais Manuais (Regressão)

Estes cenários servem para validar manualmente o comportamento de edições e a regra do mês aberto na interface gráfica do Héstia.

---

## 1. Ajuste de Orçamento e Mês Aberto (`mockMonth`)
**Objetivo:** Validar que o parâmetro `?mockMonth=M` bloqueia edições em meses anteriores e permite em meses vigentes/futuros.

1. **Ação:** Acesse a página com o query param do mês de Maio:
   [http://localhost:3000/pluto/budget?mockMonth=5](http://localhost:3000/pluto/budget?mockMonth=5)
2. **Ação:** No dropdown de seleção de Mês (no cabeçalho), mude para **"Abril"** (mês 4, anterior ao mockMonth 5).
   *   **Resultado Esperado:**
       *   A etiqueta visual **"Fechado"** (vermelha) deve aparecer ao lado de "Previsões Cadastradas".
       *   O botão *"Adicionar Previsão"* no topo da tabela deve sumir.
       *   Ao passar o mouse sobre o valor planejado (ex: R$ 1000.00) na tabela, o cursor deve permanecer o padrão (sem sublinhado pontilhado) e o clique não deve abrir o campo de edição.
3. **Ação:** No dropdown de seleção de Mês, mude para **"Maio"** (mês 5, igual ao mockMonth 5).
   *   **Resultado Esperado:**
       *   A etiqueta visual muda para **"Aberto"** (verde).
       *   O botão *"Adicionar Previsão"* reaparece.
       *   Ao passar o mouse sobre o valor planejado na tabela, o cursor vira um ponteiro (com sublinhado pontilhado), permitindo a edição.
4. **Ação:** No dropdown de seleção de Mês, mude para **"Junho"** (mês 6, posterior ao mockMonth 5).
   *   **Resultado Esperado:** O mês permanece aberto para edições (comportamento idêntico ao passo anterior).

---

## 2. Edição Inline nas Células
**Objetivo:** Validar que alterações salvam automaticamente ao clicar fora (`onBlur`) ou ao pressionar `Enter`.

1. **Ação:** Com a URL configurada em `?mockMonth=5` e o mês de **Maio** selecionado.
2. **Ação:** Clique diretamente sobre o valor planejado de qualquer despesa (ex: `R$ 1000.00`).
   *   **Resultado Esperado:** A célula de valor se transforma em um input numérico com o valor focado.
3. **Ação:** Digite um novo valor (ex: `1200`) e clique em qualquer área externa da tela (`onBlur`).
   *   **Resultado Esperado:**
       *   A célula exibe opacidade temporária enquanto salva os dados no banco de dados.
       *   A célula retorna ao formato de exibição mostrando o valor atualizado `R$ 1200.00`.
       *   O resumo de "Despesas Previstas" e "Saldo Planejado" no topo da tela recalcula automaticamente para refletir o novo valor.
4. **Ação:** Clique novamente no valor da despesa, altere para outro valor (ex: `1500`) e pressione a tecla `Enter`.
   *   **Resultado Esperado:** O input fecha sem provocar recarregamento da página (a página não pisca/atualiza do zero) e exibe o novo valor atualizado.

---

## 3. Zerar e Ocultar Categoria
**Objetivo:** Validar que definir o orçamento de uma categoria como 0 a partir de um mês a remove da listagem daquele mês em diante.

1. **Ação:** Clique sobre o valor de qualquer categoria no mês de **Maio** (mês aberto).
2. **Ação:** Digite `0` e pressione `Enter` ou clique fora.
   *   **Resultado Esperado:**
       *   A categoria desaparece por completo da listagem da tabela do mês de Maio.
       *   O valor de despesas no topo da tela é recalculado.
3. **Ação:** No dropdown de seleção de Mês, mude para **"Junho"** (mês futuro).
   *   **Resultado Esperado:** A categoria zerada também não aparece em Junho.
4. **Ação:** No dropdown de seleção de Mês, mude para **"Abril"** (mês passado).
   *   **Resultado Esperado:** A categoria continua visível com o valor original em Abril (preservando o histórico passado).

---

## 4. Gestão de Meses e Períodos
**Objetivo:** Validar que o usuário consegue abrir e encerrar um mês operacional na tela `/pluto/months`.

1. **Ação:** Acesse a tela de gestão de meses em [http://localhost:3000/pluto/months](http://localhost:3000/pluto/months).
2. **Ação:** No grid de cards, clique em **"Abrir Mês"** para qualquer mês no status "Não Iniciado".
   *   **Resultado Esperado:** O status do mês muda para **"Aberto"** (cor verde) e o botão muda para **"Encerrar Mês"**.
3. **Ação:** No card do mês aberto, clique em **"Encerrar Mês"**.
   *   **Resultado Esperado:** O status do mês muda para **"Encerrado"** (cor vermelha/escura) e o botão muda para **"Reabrir Mês"**.

---

## 5. Cadastro de Transações (`/pluto/transactions`)
**Objetivo:** Validar o registro de receitas, despesas, estornos e criação inline de contas e categorias.

1. **Ação:** Acesse a tela de lançamentos em [http://localhost:3000/pluto/transactions](http://localhost:3000/pluto/transactions).
2. **Ação:** Clique em **"+ Nova Transação"**.
3. **Ação:** Preencha Descrição (ex: "Supermercado"), Valor (ex: "150.00"), Tipo ("Despesa"), Conta (ex: "Itaú") e Categoria (ex: "Alimentação"). Clique em **"Salvar Transação"**.
   * **Resultado Esperado:** Se o mês selecionado no topo estiver 'Aberto', o lançamento aparece na tabela e o card "Total Saídas" é recalculado.
4. **Ação:** Para registrar um estorno/reembolso, clique em **"+ Nova Transação"**, informe Tipo "Despesa", marque **"É um estorno/reembolso?"** e salve.
   * **Resultado Esperado:** O lançamento ganha a tag visual "Estorno" e abate o valor do card "Total Saídas".

---

## 6. Edição e Exclusão de Lançamentos (`/pluto/transactions`)
**Objetivo:** Validar a alteração e remoção pontual de um lançamento em mês aberto.

1. **Ação:** Acesse [http://localhost:3000/pluto/transactions](http://localhost:3000/pluto/transactions) em um mês com status **Aberto**.
2. **Ação:** Na linha de qualquer lançamento da tabela de extrato da conta, clique no ícone de **Lápis (Editar)**.
   * **Resultado Esperado:** O modal abre com os dados atuais da transação. Altere o valor ou a descrição e clique em **Salvar**. A lista reflete a edição imediatamente.
3. **Ação:** Na linha de um lançamento, clique no ícone de **Lixeira (Excluir)**.
   * **Resultado Esperado:** O modal de confirmação dialog abre exibindo a descrição e valor. Clique em **Confirmar Exclusão**. O lançamento é removido e o saldo da conta é recalculado.

---

## 7. Orçamento de Checklist - Estouro de Orçamento

**Objetivo:** Validar a detecção e exibição de estouro de orçamento para itens do checklist (itens globais e itens pontuais).

1. **Ação:** Acesse a página de transações em [http://localhost:3000/pluto/transactions](http://localhost:3000/pluto/transactions) com um mês **aberto**.
2. **Ação:** No checklist card, tente adicionar um item global quando o total já excede o orçamento da categoria.
   * **Resultado Esperado:** Modal de "Estouro de Orçamento Detectado" aparece, bloqueando a gravação e oferecendo passo a passo para ajuste de orçamento.
3. **Ação:** Visualizar checklist com itens pontuais que excedem o orçamento da categoria.
   * **Resultado Esperado:** Banner informativo (ambar/rose) aparece mostrando quando o total previsto excede o orçamento planejado da categoria.
4. **Ação:** Editar um item global e mudar seu `category_id` para outra categoria.
   * **Resultado Esperado:** 
     - Se a nova categoria já tem itens excedendo o orçamento → modal de overflow aparece
     - Se a nova categoria tem limite maior → gravação normal prossegue sem bloqueio
     - Apenas mudar category_id (sem alterar amount) → verificação usa o amount existente contra a nova categoria

---

## 8. Saldo do Mês (`/pluto/transactions`)

**Objetivo:** Validar que o banner de saldo do mês reflete a diferença entre os totais dos cards Receitas e Despesas.

1. **Ação:** Acesse [http://localhost:3000/pluto/transactions](http://localhost:3000/pluto/transactions) em um mês **Aberto**.
   * **Resultado Esperado:** Banner "💰 Saldo do Mês" exibido entre o checklist e os cards, com valor igual a Receitas − Despesas: verde se ≥ 0, vermelho se < 0.
2. **Ação:** Lance uma despesa que torne o total negativo.
    * **Resultado Esperado:** O banner muda para vermelho e exibe o valor negativo imediatamente após a atualização da lista.

---

## 9. Módulo Pluto (Guarda-Chuva / Regressão Rápida)

**Objetivo:** Validação rápida pós-deploy de que o módulo financeiro (Pluto) está acessível, navega internamente e isola-se do prefixo antigo.

1. **Ação:** Login → `/dashboard` → inspecionar card **"Pluto 💰"** → clicar.
   * **Resultado:** Leva a `/pluto/budget` e carrega orçamento anual.
2. **Ação:** Navegar pelas abas superiores: "Orçamento Anual" → "Meses e Períodos" → "Lançamentos".
   * **Resultado:** Navega entre `/pluto/budget`, `/pluto/months`, `/pluto/transactions`; aba ativa destacada.
3. **Ação:** Acesso direto a `/finance/budget` (prefixo antigo).
   * **Resultado:** **404** (sem redirect).
4. **Ação:** `node .agents/scripts/sdd.js start 01-orcamento` (CLI multi-módulo).
   * **Resultado:** Exit 0, plano encontrado em `.agents/pluto/plans/`, spec em `.agents/pluto/specs/`, status "Concluído" do backlog do Pluto.
